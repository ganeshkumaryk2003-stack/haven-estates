import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "@/lib/storage/index";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

// Stores files on the local disk (outside of /public) and serves them via /api/files/<key>.
export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string) {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const absolute = path.resolve(this.rootDir, normalized);
    if (!absolute.startsWith(this.rootDir)) {
      throw new Error("Invalid storage key");
    }
    return absolute;
  }

  urlFor(key: string) {
    return `/api/files/${key}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return { key, url: this.urlFor(key), size: body.byteLength, contentType };
  }

  async delete(key: string) {
    try {
      await unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async read(key: string) {
    try {
      const target = this.resolve(key);
      const body = await readFile(target);
      const contentType = CONTENT_TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
      return { body, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
