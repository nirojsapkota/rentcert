import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { PRESIGNED_URL_SECONDS, S3Storage } from "@/server/vault/storage/s3";

const KEY = "documents/user_1/0192f0a4-5b6c-7d8e-9f00-112233445566";

function fakeClient(pages: { keys: string[]; next?: string }[] = []) {
  const sent: unknown[] = [];
  let listCall = 0;
  const client = {
    send: vi.fn(async (command: unknown) => {
      sent.push(command);
      if (command instanceof ListObjectsV2Command) {
        const page = pages[listCall++] ?? { keys: [] };
        return { Contents: page.keys.map((Key) => ({ Key })), IsTruncated: Boolean(page.next), NextContinuationToken: page.next };
      }
      return {};
    }),
  } as unknown as S3Client;
  return { client, sent };
}

describe("S3Storage", () => {
  it("stores objects with server-side encryption", async () => {
    const { client, sent } = fakeClient();
    await new S3Storage(client, "bucket").put(KEY, new Uint8Array([1, 2, 3]), "application/pdf");

    const put = sent[0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({ Bucket: "bucket", Key: KEY, ContentType: "application/pdf", ServerSideEncryption: "AES256", ContentLength: 3 });
  });

  it("redirects downloads to a 60-second presigned URL that forces attachment", async () => {
    const presign = vi.fn(async () => "https://bucket.s3.amazonaws.com/signed");
    const response = await new S3Storage(fakeClient().client, "bucket", presign).download(KEY, "Gas cert.pdf", "application/pdf");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://bucket.s3.amazonaws.com/signed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [, command, options] = presign.mock.calls[0] as unknown as [unknown, GetObjectCommand, { expiresIn: number }];
    expect(options.expiresIn).toBe(PRESIGNED_URL_SECONDS);
    expect(PRESIGNED_URL_SECONDS).toBe(60);
    expect(command.input.ResponseContentDisposition).toMatch(/^attachment; /);
  });

  it("deletes every page of objects under a user prefix", async () => {
    const { client, sent } = fakeClient([{ keys: ["documents/user_1/a", "documents/user_1/b"], next: "t1" }, { keys: ["documents/user_1/c"] }]);
    await new S3Storage(client, "bucket").deletePrefix("documents/user_1/");

    const deletes = sent.filter((command) => command instanceof DeleteObjectsCommand) as DeleteObjectsCommand[];
    expect(deletes.flatMap((command) => command.input.Delete!.Objects!.map((object) => object.Key))).toEqual([
      "documents/user_1/a",
      "documents/user_1/b",
      "documents/user_1/c",
    ]);
  });

  it("refuses keys and prefixes the app did not generate", async () => {
    const storage = new S3Storage(fakeClient().client, "bucket");
    await expect(storage.put("../secrets", new Uint8Array([1]), "application/pdf")).rejects.toThrow("Invalid storage key");
    await expect(storage.deletePrefix("documents/")).rejects.toThrow("Invalid storage prefix");
    await expect(storage.deletePrefix("")).rejects.toThrow("Invalid storage prefix");
  });
});
