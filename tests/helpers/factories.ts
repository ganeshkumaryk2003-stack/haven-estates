import { randomUUID } from "node:crypto";
import type { PropertyStatus, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Every factory tags rows with a unique run id so parallel/leftover data never collides and
// cleanup can remove exactly what a test created.
export function createRun() {
  const runId = randomUUID().slice(0, 8);
  const userIds: string[] = [];

  async function user(overrides: { role?: UserRole; verified?: boolean; name?: string } = {}) {
    const created = await prisma.user.create({
      data: {
        name: overrides.name ?? `Test ${runId}`,
        email: `${runId}-${randomUUID().slice(0, 6)}@test.local`,
        emailVerified: overrides.verified === false ? null : new Date(),
        role: overrides.role ?? "BUYER",
        passwordHash: "not-a-real-hash",
        profile: { create: { onboardingCompleted: true } },
      },
    });
    userIds.push(created.id);
    return created;
  }

  async function property(ownerId: string, overrides: Partial<{ status: PropertyStatus; price: number; city: string; listingType: "SALE" | "RENT"; bedrooms: number; title: string; featured: boolean }> = {}) {
    return prisma.property.create({
      data: {
        slug: `test-${runId}-${randomUUID().slice(0, 6)}`,
        title: overrides.title ?? `Test property ${runId}`,
        description: "A property created by the automated test suite. It has more than forty characters.",
        listingType: overrides.listingType ?? "SALE",
        propertyType: "HOUSE",
        status: overrides.status ?? "ACTIVE",
        price: overrides.price ?? 500_000,
        depositAmount: 5_000,
        address: "1 Test Street",
        city: overrides.city ?? "Testville",
        state: "Test State",
        postalCode: "560001",
        country: "India",
        bedrooms: overrides.bedrooms ?? 3,
        bathrooms: 2,
        featured: overrides.featured ?? false,
        publishedAt: new Date(),
        ownerId,
        images: { create: [{ url: "/api/files/test/cover.webp", storageKey: `test/${runId}/cover.webp`, position: 0 }] },
      },
    });
  }

  async function cleanup() {
    // Deleting users cascades to properties, offers, messages, notifications, etc.
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  return { runId, user, property, cleanup };
}

export const sessionUser = (user: { id: string; role: UserRole; email: string; name: string | null; emailVerified: Date | null }) => ({
  id: user.id,
  role: user.role,
  status: "ACTIVE" as const,
  isEmailVerified: Boolean(user.emailVerified),
  onboardingCompleted: true,
  email: user.email,
  name: user.name,
  image: null,
});
