import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { downloadHeaders } from "@/server/vault/file-type";
import { assertValidKey, assertValidPrefix, type DocumentStorage } from "./types";

// Development and test driver. Files live under STORAGE_LOCAL_PATH (default ./storage).
export class LocalStorage implements DocumentStorage {
  constructor(private readonly root: string) {}

  private pathFor(key: string) {
    return path.join(this.root, ...key.split("/"));
  }

  async put(key: string, body: Uint8Array) {
    assertValidKey(key);
    const file = this.pathFor(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, { flag: "wx" });
  }

  async download(key: string, filename: string, contentType: string) {
    assertValidKey(key);
    const file = this.pathFor(key);
    const { size } = await stat(file);
    const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
    return new Response(body, { headers: { ...downloadHeaders(filename, contentType), "Content-Length": String(size) } });
  }

  async delete(key: string) {
    assertValidKey(key);
    await rm(this.pathFor(key), { force: true });
  }

  async *listAll() {
    const root = this.pathFor("documents");
    const users = await readdir(root).catch(() => [] as string[]);
    for (const user of users) {
      for (const name of await readdir(path.join(root, user)).catch(() => [] as string[])) {
        const { mtime } = await stat(path.join(root, user, name));
        yield { key: `documents/${user}/${name}`, lastModified: mtime };
      }
    }
  }

  async deletePrefix(prefix: string) {
    assertValidPrefix(prefix);
    await rm(this.pathFor(prefix.slice(0, -1)), { recursive: true, force: true });
  }
}
