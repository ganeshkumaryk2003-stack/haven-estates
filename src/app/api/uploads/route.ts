import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, MAX_ATTACHMENT_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { buildStorageKey, storage } from "@/lib/storage";
import { isPdf, processImage, sniffImageType } from "@/lib/storage/images";

export const runtime = "nodejs";

type UploadPurpose = "property" | "attachment" | "floorplan";

// Multipart upload endpoint used by the listing form and the messenger.
// Every file is sniffed by magic bytes and images are re-encoded through sharp.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });
  if (session.user.status === "SUSPENDED") return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const limit = checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const purpose = (formData.get("purpose") as UploadPurpose | null) ?? "property";
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!["property", "attachment", "floorplan"].includes(purpose)) return NextResponse.json({ error: "Unknown upload purpose." }, { status: 400 });

  const maxSize = purpose === "attachment" ? MAX_ATTACHMENT_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Files must be smaller than ${Math.round(maxSize / 1024 / 1024)} MB.` }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageType = sniffImageType(buffer);

  try {
    if (imageType && ALLOWED_IMAGE_TYPES.includes(imageType)) {
      const processed = await processImage(buffer, purpose === "attachment" ? 1600 : 2000);
      const folder = purpose === "attachment" ? "attachments" : "properties";
      const stored = await storage.put(buildStorageKey(folder, session.user.id, processed.contentType), processed.buffer, processed.contentType);
      return NextResponse.json({
        url: stored.url,
        storageKey: stored.key,
        contentType: stored.contentType,
        size: stored.size,
        width: processed.width,
        height: processed.height,
        kind: "IMAGE",
        name: file.name.slice(0, 200),
      });
    }

    if ((purpose === "attachment" || purpose === "floorplan") && isPdf(buffer)) {
      const folder = purpose === "attachment" ? "attachments" : "floorplans";
      const stored = await storage.put(buildStorageKey(folder, session.user.id, "application/pdf"), buffer, "application/pdf");
      return NextResponse.json({
        url: stored.url,
        storageKey: stored.key,
        contentType: "application/pdf",
        size: stored.size,
        kind: "DOCUMENT",
        name: file.name.slice(0, 200),
      });
    }
  } catch (error) {
    console.error("[uploads] processing failed", error);
    return NextResponse.json({ error: "We could not process that file. Try a different image." }, { status: 422 });
  }

  return NextResponse.json(
    { error: purpose === "property" ? "Only JPEG, PNG, WebP or AVIF images are allowed." : "Only images and PDF documents are allowed." },
    { status: 415 },
  );
}
