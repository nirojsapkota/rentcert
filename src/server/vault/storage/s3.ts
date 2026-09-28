import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentDisposition } from "@/server/vault/file-type";
import { assertValidKey, assertValidPrefix, type DocumentStorage } from "./types";

export const PRESIGNED_URL_SECONDS = 60;

type Presign = typeof getSignedUrl;

// Production driver. The bucket is private; downloads redirect to a short-lived presigned URL
// that forces a download. Never log the URL.
export class S3Storage implements DocumentStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly presign: Presign = getSignedUrl,
  ) {}

  async put(key: string, body: Uint8Array, contentType: string) {
    assertValidKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async download(key: string, filename: string, contentType: string) {
    assertValidKey(key);
    const url = await this.presign(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: attachmentDisposition(filename),
        ResponseContentType: contentType,
      }),
      { expiresIn: PRESIGNED_URL_SECONDS },
    );
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  }

  async read(key: string) {
    assertValidKey(key);
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!object.Body) throw new Error("Empty object body");
    return object.Body.transformToByteArray();
  }

  async copy(fromKey: string, toKey: string) {
    assertValidKey(fromKey);
    assertValidKey(toKey);
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${fromKey}`,
        Key: toKey,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async delete(key: string) {
    assertValidKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async *listAll() {
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: "documents/", ContinuationToken: token }),
      );
      for (const object of page.Contents ?? []) {
        if (object.Key && object.LastModified) yield { key: object.Key, lastModified: object.LastModified };
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }

  async deletePrefix(prefix: string) {
    assertValidPrefix(prefix);
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
      if (keys.length > 0) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }));
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
}
