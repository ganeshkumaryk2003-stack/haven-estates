import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createRun, sessionUser } from "../../helpers/factories";

const run = createRun();
let buyer: Awaited<ReturnType<typeof run.user>>;
let property: Awaited<ReturnType<typeof run.property>>;

// Server actions read the session from Auth.js and revalidate Next.js caches. Both are
// replaced here so the action logic can run inside plain Node.
const currentUser = vi.hoisted(() => ({ value: null as ReturnType<typeof sessionUser> | null }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => {
    if (!currentUser.value) throw new Error("UNAUTHORIZED");
    return currentUser.value;
  },
  requireVerifiedUser: async () => {
    if (!currentUser.value) throw new Error("UNAUTHORIZED");
    return currentUser.value;
  },
  getCurrentUser: async () => currentUser.value,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));

const { toggleFavoriteAction } = await import("@/server/actions/properties");

beforeAll(async () => {
  const seller = await run.user({ role: "SELLER" });
  buyer = await run.user();
  property = await run.property(seller.id);
  currentUser.value = sessionUser(buyer);
});

afterAll(() => run.cleanup());

describe("toggleFavoriteAction", () => {
  it("adds then removes a favorite and keeps the counter in sync", async () => {
    const added = await toggleFavoriteAction(property.id);
    expect(added).toEqual({ ok: true, data: { favorited: true, count: 1 } });
    expect(await prisma.favorite.count({ where: { userId: buyer.id, propertyId: property.id } })).toBe(1);

    const removed = await toggleFavoriteAction(property.id);
    expect(removed).toEqual({ ok: true, data: { favorited: false, count: 0 } });
    expect(await prisma.favorite.count({ where: { userId: buyer.id, propertyId: property.id } })).toBe(0);
    expect((await prisma.property.findUniqueOrThrow({ where: { id: property.id } })).favoriteCount).toBe(0);
  });

  it("fails gracefully for unknown listings and signed-out users", async () => {
    const missing = await toggleFavoriteAction("does-not-exist");
    expect(missing.ok).toBe(false);

    currentUser.value = null;
    const anonymous = await toggleFavoriteAction(property.id);
    expect(anonymous.ok).toBe(false);
    currentUser.value = sessionUser(buyer);
  });
});
