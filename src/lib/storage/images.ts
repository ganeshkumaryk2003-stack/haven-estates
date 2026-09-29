import "server-only";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
}

// Magic-byte sniffing so a renamed .exe can't be uploaded as an "image".
export function sniffImageType(buffer: Buffer): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  return null;
}

export function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

// Re-encode every upload: strips metadata (EXIF/GPS), normalizes orientation, caps size.
export async function processImage(input: Buffer, maxWidth = 2000): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, contentType: "image/webp", width: info.width, height: info.height };
}
