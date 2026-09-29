import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { ForbiddenError } from "@/lib/errors";
import { LocalStorageDriver } from "@/lib/storage/local";
import { resolveLocalStorageRoot } from "@/lib/storage/local-root";
import { S3StorageDriver } from "@/lib/storage/s3";

export interface StoredFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  /** Public URL for a key. Always derived server-side; client supplied URLs are never stored. */
  urlFor(key: string): string;
  // Used by the /api/files route for the local driver only.
  read?(key: string): Promise<{ body: Buffer; contentType: string } | null>;
}

function createDriver(): StorageDriver {
  if (env.STORAGE_DRIVER === "s3") {
    return new S3StorageDriver({
      bucket: env.S3_BUCKET!,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      publicUrl: env.S3_PUBLIC_URL,
    });
  }
  return new LocalStorageDriver(resolveLocalStorageRoot(env.STORAGE_LOCAL_DIR));
}

const globalForStorage = globalThis as unknown as { storageDriver?: StorageDriver };
export const storage: StorageDriver = globalForStorage.storageDriver ?? createDriver();
if (env.NODE_ENV !== "production") globalForStorage.storageDriver = storage;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

export type StorageFolder = "properties" | "attachments" | "floorplans" | "avatars";

// Keys are always "<folder>/<ownerId>/<uuid>.<ext>". The owner segment is what lets the server
// verify that a key referenced from the browser was uploaded by the same user.
export function buildStorageKey(folder: StorageFolder, ownerId: string, contentType: string) {
  const ext = EXTENSIONS[contentType] ?? "bin";
  const safeOwner = ownerId.replace(/[^a-z0-9_-]/gi, "");
  return `${folder}/${safeOwner}/${randomUUID()}.${ext}`;
}

const STORAGE_KEY_PATTERN = /^(properties|attachments|floorplans|avatars)\/([A-Za-z0-9_-]{1,64})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg|jpeg|png|avif|pdf)$/;

export interface ParsedStorageKey {
  folder: StorageFolder;
  ownerId: string;
  extension: string;
  contentType: string;
  kind: "IMAGE" | "DOCUMENT";
}

export function parseStorageKey(key: string): ParsedStorageKey | null {
  const match = STORAGE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const extension = match[4]!;
  return {
    folder: match[1] as StorageFolder,
    ownerId: match[2]!,
    extension,
    contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
    kind: extension === "pdf" ? "DOCUMENT" : "IMAGE",
  };
}

// Throws unless `key` is a well-formed key in `folder` that was uploaded by `userId`.
// Used whenever the browser hands back a storage key (listing photos, message attachments).
export function assertOwnedStorageKey(key: string, folder: StorageFolder, userId: string): ParsedStorageKey {
  const parsed = parseStorageKey(key);
  if (!parsed || parsed.folder !== folder || parsed.ownerId !== userId) {
    throw new ForbiddenError("One of the uploaded files could not be verified. Please remove it and upload it again.");
  }
  return parsed;
}
