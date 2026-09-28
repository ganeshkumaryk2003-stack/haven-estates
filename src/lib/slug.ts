import { randomBytes } from "node:crypto";

export function slugify(value: string, maxLength = 80) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

// Slugs get a short random suffix so two listings with the same title never collide
// and property IDs are not guessable from the URL.
export function propertySlug(title: string, city: string) {
  const base = slugify(`${title} ${city}`) || "property";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function referenceCode(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
