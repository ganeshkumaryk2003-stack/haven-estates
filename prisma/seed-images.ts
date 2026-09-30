// Generates development placeholder photos for seeded properties. Each image is an SVG scene
// (gradient sky, a simple building silhouette and a caption) rasterised to WebP with sharp, so
// the seed never depends on remote images that may disappear.
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const PALETTES = [
  ["#0f766e", "#5eead4", "#f0fdfa"],
  ["#1d4ed8", "#93c5fd", "#eff6ff"],
  ["#b45309", "#fcd34d", "#fffbeb"],
  ["#7c3aed", "#c4b5fd", "#f5f3ff"],
  ["#be123c", "#fda4af", "#fff1f2"],
  ["#166534", "#86efac", "#f0fdf4"],
  ["#0e7490", "#67e8f9", "#ecfeff"],
  ["#374151", "#d1d5db", "#f9fafb"],
];

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildingShape(kind: string, seed: number) {
  const x = 160 + (seed % 5) * 40;
  switch (kind) {
    case "APARTMENT":
    case "COMMERCIAL":
      return `<rect x="${x}" y="260" width="420" height="640" rx="14" fill="rgba(255,255,255,0.92)"/>
        ${Array.from({ length: 7 }, (_, row) =>
          Array.from({ length: 4 }, (_, col) => `<rect x="${x + 50 + col * 90}" y="${310 + row * 82}" width="52" height="48" rx="4" fill="rgba(15,23,42,0.35)"/>`).join(""),
        ).join("")}
        <rect x="${x + 700}" y="520" width="300" height="380" rx="14" fill="rgba(255,255,255,0.75)"/>`;
    case "PLOT_INDUSTRIAL":
      // Low shed with a sawtooth roof, roll-up doors, a stack and a perimeter fence line.
      return `<rect x="${x}" y="560" width="900" height="340" rx="10" fill="rgba(255,255,255,0.9)"/>
        ${Array.from({ length: 4 }, (_, index) => `<path d="M${x + index * 225} 560 L${x + index * 225 + 150} 470 L${x + index * 225 + 225} 560 Z" fill="rgba(255,255,255,0.95)"/>`).join("")}
        ${Array.from({ length: 3 }, (_, index) => `<rect x="${x + 80 + index * 280}" y="700" width="180" height="200" rx="6" fill="rgba(15,23,42,0.45)"/>`).join("")}
        <rect x="${x + 960}" y="380" width="60" height="520" rx="6" fill="rgba(255,255,255,0.8)"/>
        <rect x="120" y="880" width="1360" height="8" fill="rgba(255,255,255,0.9)"/>`;
    case "PLOT_RESIDENTIAL":
    case "PLOT_COMMERCIAL":
    case "PLOT_SEMI_COMMERCIAL":
      return `<ellipse cx="800" cy="880" rx="700" ry="160" fill="rgba(255,255,255,0.55)"/>
        <path d="M300 900 Q 500 640 700 900 Z" fill="rgba(22,101,52,0.55)"/>
        <path d="M850 900 Q 1050 600 1250 900 Z" fill="rgba(22,101,52,0.45)"/>
        <rect x="120" y="860" width="1360" height="6" fill="rgba(255,255,255,0.9)"/>`;
    case "TOWNHOUSE":
      return Array.from({ length: 3 }, (_, index) => {
        const bx = 260 + index * 360;
        return `<path d="M${bx} 520 L${bx + 160} 380 L${bx + 320} 520 Z" fill="rgba(255,255,255,0.95)"/>
          <rect x="${bx + 10}" y="520" width="300" height="380" rx="6" fill="rgba(255,255,255,0.88)"/>
          <rect x="${bx + 60}" y="580" width="70" height="90" rx="4" fill="rgba(15,23,42,0.35)"/>
          <rect x="${bx + 190}" y="580" width="70" height="90" rx="4" fill="rgba(15,23,42,0.35)"/>
          <rect x="${bx + 125}" y="760" width="70" height="140" rx="4" fill="rgba(15,23,42,0.5)"/>`;
      }).join("");
    default:
      return `<path d="M340 520 L800 260 L1260 520 Z" fill="rgba(255,255,255,0.95)"/>
        <rect x="400" y="520" width="800" height="380" rx="8" fill="rgba(255,255,255,0.88)"/>
        <rect x="470" y="600" width="140" height="120" rx="6" fill="rgba(15,23,42,0.35)"/>
        <rect x="990" y="600" width="140" height="120" rx="6" fill="rgba(15,23,42,0.35)"/>
        <rect x="720" y="700" width="160" height="200" rx="6" fill="rgba(15,23,42,0.5)"/>
        <rect x="1000" y="300" width="60" height="150" fill="rgba(255,255,255,0.9)"/>`;
  }
}

export function buildPropertySvg(options: { kind: string; caption: string; subcaption: string; seed: number; variant: number }) {
  const palette = PALETTES[options.seed % PALETTES.length]!;
  const [dark, mid, light] = palette;
  const angle = 15 + options.variant * 35;
  const sunX = 200 + options.variant * 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
    <defs>
      <linearGradient id="sky" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="55%" stop-color="${mid}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="1200" fill="url(#sky)"/>
    <circle cx="${sunX}" cy="220" r="90" fill="rgba(255,255,255,0.65)"/>
    <rect x="0" y="900" width="1600" height="300" fill="rgba(15,23,42,0.28)"/>
    ${buildingShape(options.kind, options.seed + options.variant)}
    <rect x="60" y="1000" width="1480" height="140" rx="18" fill="rgba(15,23,42,0.55)"/>
    <text x="100" y="1060" font-family="Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(options.caption)}</text>
    <text x="100" y="1112" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.85)">${escapeXml(options.subcaption)}</text>
  </svg>`;
}

export async function resetSeedImageDir(storageRoot: string) {
  const dir = path.join(storageRoot, "properties", "seed");
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function renderPropertyImage(storageRoot: string, options: Parameters<typeof buildPropertySvg>[0]) {
  const key = `properties/seed/${randomUUID()}.webp`;
  const target = path.join(storageRoot, key);
  const buffer = await sharp(Buffer.from(buildPropertySvg(options))).resize(1600, 1200).webp({ quality: 78 }).toBuffer();
  await writeFile(target, buffer);
  return { key, url: `/api/files/${key}`, width: 1600, height: 1200, size: buffer.byteLength };
}

export async function renderAvatar(storageRoot: string, name: string, seed: number) {
  const palette = PALETTES[seed % PALETTES.length]!;
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="128" fill="${palette[0]}"/><text x="128" y="152" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#fff">${escapeXml(initials)}</text></svg>`;
  const key = `avatars/seed/${randomUUID()}.webp`;
  await mkdir(path.join(storageRoot, "avatars", "seed"), { recursive: true });
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
  await writeFile(path.join(storageRoot, key), buffer);
  return `/api/files/${key}`;
}
