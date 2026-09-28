import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

// Serves files written by the local storage driver. Keys are UUID based and files are
// re-encoded on upload, so these are safe to serve publicly.
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const joined = key.join("/");
  if (!/^[a-z0-9/_-]+\.(webp|jpg|jpeg|png|avif|pdf)$/i.test(joined) || joined.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!storage.read) return new NextResponse("Not found", { status: 404 });

  const file = await storage.read(joined);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(file.contentType === "application/pdf" ? { "Content-Disposition": "inline" } : {}),
    },
  });
}
