import "server-only";
import path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { DocumentStorage } from "./types";

let storage: DocumentStorage | undefined;

export function getStorage(): DocumentStorage {
  if (storage) return storage;
  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver === "s3") {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error("AWS_S3_BUCKET is required when STORAGE_DRIVER=s3");
    // Credentials come from the standard AWS chain (instance or task role in production).
    storage = new S3Storage(new S3Client({ region: process.env.AWS_REGION }), bucket);
  } else if (driver === "local") {
    if (process.env.NODE_ENV === "production") throw new Error("STORAGE_DRIVER=local is not allowed in production");
    // Development-only path; keep it out of build output tracing.
    storage = new LocalStorage(path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_PATH ?? "storage"));
  } else {
    throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  }
  return storage;
}

export type { DocumentStorage } from "./types";
export { documentKey, userPrefix } from "./types";
