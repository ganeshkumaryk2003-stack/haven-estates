import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { assertOwnedStorageKey, buildStorageKey, parseStorageKey } from "@/lib/storage";
import { safeJsonLd } from "@/lib/utils";

const USER = "cmuser000000000000000001";

describe("storage keys", () => {
  it("builds keys that embed the folder, the uploader and a uuid", () => {
    const key = buildStorageKey("properties", USER, "image/webp");
    const parsed = parseStorageKey(key);
    expect(parsed).toMatchObject({ folder: "properties", ownerId: USER, extension: "webp", contentType: "image/webp", kind: "IMAGE" });
    expect(parseStorageKey(buildStorageKey("attachments", USER, "application/pdf"))).toMatchObject({ kind: "DOCUMENT", contentType: "application/pdf" });
  });

  it("rejects malformed or traversal-style keys", () => {
    for (const bad of ["../../etc/passwd", "properties/x/not-a-uuid.webp", "properties/user/00000000-0000-0000-0000-000000000000.exe", "/api/files/properties/u/00000000-0000-0000-0000-000000000000.webp", ""]) {
      expect(parseStorageKey(bad)).toBeNull();
    }
  });

  it("only accepts keys uploaded by the same user into the expected folder", () => {
    const mine = buildStorageKey("properties", USER, "image/jpeg");
    const theirs = buildStorageKey("properties", "someone-else", "image/jpeg");
    const attachment = buildStorageKey("attachments", USER, "image/jpeg");
    expect(() => assertOwnedStorageKey(mine, "properties", USER)).not.toThrow();
    expect(() => assertOwnedStorageKey(theirs, "properties", USER)).toThrow(ForbiddenError);
    expect(() => assertOwnedStorageKey(attachment, "properties", USER)).toThrow(ForbiddenError);
    expect(() => assertOwnedStorageKey("properties/seed/00000000-0000-0000-0000-000000000000.webp", "properties", USER)).toThrow(ForbiddenError);
  });
});

describe("safeJsonLd", () => {
  it("escapes characters that could break out of a script tag while staying valid JSON", () => {
    const payload = { name: 'Nice home</script><script>alert("x")</script>', note: "a & b > c" };
    const serialized = safeJsonLd(payload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual(payload);
  });
});
