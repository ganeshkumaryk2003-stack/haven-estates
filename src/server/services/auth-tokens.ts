import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60_000,
  PASSWORD_RESET: 60 * 60_000,
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Issues a single-use token. Only the SHA-256 hash is stored, so a database leak does not
// expose usable reset links. Older tokens of the same type are invalidated.
export async function issueAuthToken(userId: string, type: AuthTokenType) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]) },
    }),
  ]);
  return token;
}

// Returns the token row when valid (unused and unexpired); otherwise null.
export async function findValidAuthToken(token: string, type: AuthTokenType) {
  if (!token || token.length < 20) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function consumeAuthToken(id: string) {
  await prisma.authToken.update({ where: { id }, data: { usedAt: new Date() } });
}
