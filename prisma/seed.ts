// Seeds the development database with demo users, listings, engagement data and generated
// placeholder photos. Run with `npm run db:seed`. The script is self-contained (it does not
// import Next.js server modules) so it works from plain Node via tsx.
import "dotenv/config";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { subDays, subHours, addDays } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AMENITIES, PROPERTIES, USERS } from "./seed-data";
import { renderAvatar, renderPropertyImage, resetSeedImageDir } from "./seed-images";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
// Mirrors src/lib/storage/local-root.ts: absolute paths are used as-is, relative paths live
// inside ./storage.
function resolveStorageRoot(configured: string) {
  if (path.isAbsolute(configured)) return configured;
  return path.join(process.cwd(), "storage", configured.replace(/^\.\//, "").replace(/^storage\/?/, ""));
}
const STORAGE_ROOT = resolveStorageRoot(process.env.STORAGE_LOCAL_DIR ?? "./storage");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pairKey(a: string, b: string, propertyId?: string | null) {
  const [first, second] = [a, b].sort();
  return `${first}:${second}:${propertyId ?? "general"}`;
}

async function reset() {
  console.log("→ Clearing existing data");
  // Users cascade to almost everything; the rest are independent tables.
  await prisma.$transaction([
    prisma.stripeEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.amenity.deleteMany(),
    prisma.verificationToken.deleteMany(),
  ]);
}

async function main() {
  console.log(`Seeding Doorkey Realty (storage: ${STORAGE_ROOT})`);
  await reset();
  await resetSeedImageDir(STORAGE_ROOT);
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // ------------------------------------------------------------------ amenities
  console.log("→ Amenities");
  const amenityBySlug = new Map<string, string>();
  for (const amenity of AMENITIES) {
    const created = await prisma.amenity.create({ data: amenity });
    amenityBySlug.set(amenity.slug, created.id);
  }

  // ---------------------------------------------------------------------- users
  console.log("→ Users");
  const users = new Map<string, { id: string; name: string; email: string }>();
  for (const [index, seedUser] of USERS.entries()) {
    const image = await renderAvatar(STORAGE_ROOT, seedUser.name, index);
    const created = await prisma.user.create({
      data: {
        name: seedUser.name,
        email: seedUser.email,
        emailVerified: seedUser.verified ? subDays(new Date(), 90 - index) : null,
        image,
        passwordHash,
        role: seedUser.role,
        status: seedUser.status ?? "ACTIVE",
        suspendedAt: seedUser.status === "SUSPENDED" ? subDays(new Date(), 3) : null,
        suspendReason: seedUser.status === "SUSPENDED" ? "Repeated spam listings." : null,
        createdAt: subDays(new Date(), 120 - index * 7),
        profile: { create: { ...seedUser.profile, onboardingCompleted: seedUser.key !== "newbie" } },
      },
    });
    users.set(seedUser.key, { id: created.id, name: created.name ?? seedUser.name, email: created.email });
  }
  const u = (key: string) => {
    const user = users.get(key);
    if (!user) throw new Error(`Unknown seed user ${key}`);
    return user;
  };

  // ----------------------------------------------------------------- properties
  console.log("→ Properties & photos (this renders images, give it a moment)");
  const propertyIds: string[] = [];
  for (const [index, seed] of PROPERTIES.entries()) {
    const owner = u(seed.owner);
    const publishedAt = ["DRAFT", "PENDING_REVIEW", "REJECTED"].includes(seed.status) ? null : subDays(new Date(), seed.daysAgo);
    const images = [];
    for (let variant = 0; variant < seed.images; variant += 1) {
      const rendered = await renderPropertyImage(STORAGE_ROOT, {
        kind: seed.propertyType,
        caption: seed.title,
        subcaption: `${seed.city}, ${seed.state} · Photo ${variant + 1}`,
        seed: index,
        variant,
      });
      images.push({
        url: rendered.url,
        storageKey: rendered.key,
        alt: variant === 0 ? `${seed.title} - exterior` : `${seed.title} - photo ${variant + 1}`,
        width: rendered.width,
        height: rendered.height,
        position: variant,
      });
    }
    const property = await prisma.property.create({
      data: {
        slug: `${slugify(`${seed.title} ${seed.city}`)}-${randomBytes(3).toString("hex")}`,
        title: seed.title,
        description: seed.description,
        listingType: seed.listingType,
        propertyType: seed.propertyType,
        status: seed.status,
        price: seed.price,
        currency: "INR",
        depositAmount: seed.deposit,
        address: seed.address,
        city: seed.city,
        state: seed.state,
        postalCode: seed.postalCode,
        country: "India",
        latitude: seed.lat,
        longitude: seed.lng,
        bedrooms: seed.bedrooms,
        bathrooms: seed.bathrooms,
        parkingSpaces: seed.parking,
        interiorArea: seed.interiorArea,
        lotArea: seed.lotArea,
        areaUnit: "SQFT",
        yearBuilt: seed.yearBuilt,
        furnished: seed.furnished,
        availableFrom: seed.listingType === "RENT" ? addDays(new Date(), 14) : null,
        featured: seed.featured ?? false,
        viewCount: seed.views,
        publishedAt,
        soldAt: seed.status === "SOLD" || seed.status === "RENTED" ? subDays(new Date(), 5) : null,
        rejectionReason: seed.rejectionReason ?? null,
        reviewedAt: publishedAt,
        reviewedById: publishedAt ? u("admin").id : null,
        ownerId: owner.id,
        createdAt: subDays(new Date(), seed.daysAgo + 1),
        images: { create: images },
        amenities: { create: seed.amenities.map((slug) => ({ amenityId: amenityBySlug.get(slug)! })) },
      },
    });
    propertyIds.push(property.id);
  }
  const prop = (index: number) => propertyIds[index]!;
  const propertyTitle = (index: number) => PROPERTIES[index]!.title;

  // ------------------------------------------------------------------ favorites
  console.log("→ Favorites");
  const favoritePairs: [string, number][] = [
    ["priya", 0], ["priya", 1], ["priya", 18], ["priya", 2],
    ["vikram", 3], ["vikram", 5], ["vikram", 4],
    ["sneha", 16], ["sneha", 17], ["sneha", 14], ["sneha", 19],
    ["karthik", 11], ["karthik", 12], ["karthik", 13], ["karthik", 7],
    ["newbie", 0], ["newbie", 7],
  ];
  for (const [userKey, propertyIndex] of favoritePairs) {
    await prisma.favorite.create({ data: { userId: u(userKey).id, propertyId: prop(propertyIndex) } });
    await prisma.property.update({ where: { id: prop(propertyIndex) }, data: { favoriteCount: { increment: 1 } } });
  }

  // ------------------------------------------------------ connections & messaging
  console.log("→ Connections, conversations & messages");
  async function connect(buyerKey: string, sellerKey: string, propertyIndex: number, lastInteractionHoursAgo: number) {
    const buyer = u(buyerKey);
    const seller = u(sellerKey);
    let connection = await prisma.connection.findFirst({ where: { OR: [{ buyerId: buyer.id, sellerId: seller.id }, { buyerId: seller.id, sellerId: buyer.id }] } });
    if (!connection) {
      connection = await prisma.connection.create({ data: { buyerId: buyer.id, sellerId: seller.id, lastInteractionAt: subHours(new Date(), lastInteractionHoursAgo) } });
    }
    await prisma.connectionProperty.upsert({
      where: { connectionId_propertyId: { connectionId: connection.id, propertyId: prop(propertyIndex) } },
      update: {},
      create: { connectionId: connection.id, propertyId: prop(propertyIndex) },
    });
    return connection;
  }

  async function conversation(aKey: string, bKey: string, propertyIndex: number | null, messages: { from: string; body: string; hoursAgo: number }[]) {
    const a = u(aKey);
    const b = u(bKey);
    const propertyId = propertyIndex === null ? null : prop(propertyIndex);
    const last = messages[messages.length - 1]!;
    const created = await prisma.conversation.create({
      data: {
        pairKey: pairKey(a.id, b.id, propertyId),
        propertyId,
        lastMessageAt: subHours(new Date(), last.hoursAgo),
        lastMessagePreview: last.body.slice(0, 100),
        participants: {
          create: [
            { userId: a.id, lastReadAt: subHours(new Date(), Math.min(...messages.filter((m) => m.from === aKey).map((m) => m.hoursAgo))) },
            { userId: b.id, lastReadAt: subHours(new Date(), messages.find((m) => m.from === bKey)?.hoursAgo ?? last.hoursAgo + 1) },
          ],
        },
      },
    });
    for (const message of messages) {
      await prisma.message.create({ data: { conversationId: created.id, senderId: u(message.from).id, body: message.body, createdAt: subHours(new Date(), message.hoursAgo) } });
    }
    return created;
  }

  await connect("priya", "meera", 0, 2);
  await connect("priya", "meera", 1, 30);
  await connect("vikram", "rohan", 3, 5);
  await connect("vikram", "rohan", 4, 48);
  await connect("sneha", "arjun", 14, 72);
  await connect("sneha", "arjun", 16, 20);
  await connect("karthik", "arjun", 11, 8);
  await connect("karthik", "kavya", 7, 100);
  const archived = await connect("vikram", "kavya", 9, 400);
  await prisma.connection.update({ where: { id: archived.id }, data: { status: "ARCHIVED", archivedById: u("vikram").id } });

  await conversation("priya", "meera", 0, [
    { from: "priya", body: "Hi Meera! Is the JP Nagar house still available? We'd love to see it this weekend.", hoursAgo: 26 },
    { from: "meera", body: "Hi Priya, yes it is. Saturday at 11am works - I can show you the garden and the khata and tax paperwork too.", hoursAgo: 24 },
    { from: "priya", body: "Perfect, see you Saturday. Is there flexibility on the registration date? Our lease runs until the end of next month.", hoursAgo: 23 },
    { from: "meera", body: "Absolutely, a 45-day registration timeline is fine for us.", hoursAgo: 2 },
  ]);
  await conversation("vikram", "rohan", 3, [
    { from: "vikram", body: "Hello Rohan, I'm relocating from Bengaluru in October. Does the Koregaon Park bungalow have fibre internet?", hoursAgo: 7 },
    { from: "rohan", body: "Hi Vikram - yes, gigabit fibre is installed and the study is wired with Cat6. Happy to do a video walkthrough.", hoursAgo: 5 },
  ]);
  await conversation("sneha", "arjun", 16, [
    { from: "sneha", body: "What is the current maintenance charge on the Lower Parel flat, and is short-term renting allowed?", hoursAgo: 21 },
    { from: "arjun", body: "Maintenance is ₹11,800/month including the clubhouse. Minimum lease term in the society is 11 months, so no short-term.", hoursAgo: 20 },
  ]);
  await conversation("karthik", "arjun", 11, [
    { from: "karthik", body: "Beautiful house. Would you consider an offer contingent on the sale of my current flat in Adyar?", hoursAgo: 9 },
    { from: "arjun", body: "The owners prefer a non-contingent offer, but let's talk - what's your timeline?", hoursAgo: 8 },
  ]);

  // ------------------------------------------------------------------ enquiries
  console.log("→ Enquiries");
  const enquiries = [
    { property: 0, from: "priya", to: "meera", subject: "Site visit this weekend?", message: "Hi Meera, is the JP Nagar house still available? We'd love to arrange a site visit this Saturday.", phone: "+91 98450 67890", contact: "PHONE" as const, status: "REPLIED" as const, hoursAgo: 30 },
    { property: 3, from: "vikram", to: "rohan", subject: "Fibre internet and home office", message: "Does the property have fibre? I work from home and need a dedicated office.", phone: null, contact: "MESSAGE" as const, status: "READ" as const, hoursAgo: 8 },
    { property: 7, from: "karthik", to: "kavya", subject: "Pet policy", message: "We have a 20 kg dog - is that OK with the society, and what is the deposit?", phone: null, contact: "EMAIL" as const, status: "NEW" as const, hoursAgo: 3 },
    { property: 16, from: "sneha", to: "arjun", subject: "Rental yield details", message: "Could you share the last 12 months of maintenance bills and any pending society dues?", phone: "+91 98210 34567", contact: "EMAIL" as const, status: "NEW" as const, hoursAgo: 1 },
    { property: 12, from: "karthik", to: "arjun", subject: "Parking question", message: "Is the second car park allotted in the sale deed or assigned by the association?", phone: null, contact: "MESSAGE" as const, status: "CLOSED" as const, hoursAgo: 120 },
    { property: 1, from: "priya", to: "meera", subject: "Row house maintenance", message: "What does the monthly society maintenance cover for the Whitefield row house?", phone: null, contact: "EMAIL" as const, status: "REPLIED" as const, hoursAgo: 60 },
  ];
  for (const enquiry of enquiries) {
    await prisma.enquiry.create({
      data: {
        propertyId: prop(enquiry.property),
        senderId: u(enquiry.from).id,
        recipientId: u(enquiry.to).id,
        subject: enquiry.subject,
        message: enquiry.message,
        phone: enquiry.phone,
        preferredContact: enquiry.contact,
        status: enquiry.status,
        repliedAt: enquiry.status === "REPLIED" ? subHours(new Date(), enquiry.hoursAgo - 2) : null,
        createdAt: subHours(new Date(), enquiry.hoursAgo),
      },
    });
  }

  // --------------------------------------------------------------------- offers
  console.log("→ Offers, reservation & payment");
  // Pending offer on the JP Nagar house (seller meera, buyer priya)
  await prisma.offer.create({
    data: {
      propertyId: prop(0), buyerId: u("priya").id, sellerId: u("meera").id, amount: 17500000, currency: "INR", financing: "MORTGAGE",
      conditions: "Subject to home loan sanction and a clear encumbrance certificate within 21 days.", message: "We love the house and can be flexible on the registration date.",
      expiresAt: addDays(new Date(), 6), status: "PENDING", createdAt: subHours(new Date(), 20),
    },
  });
  // Countered offer on the Koregaon Park bungalow (seller rohan, buyer vikram)
  await prisma.offer.create({
    data: {
      propertyId: prop(3), buyerId: u("vikram").id, sellerId: u("rohan").id, amount: 29500000, currency: "INR", financing: "MIXED",
      conditions: "Registration no earlier than 1 November.", expiresAt: addDays(new Date(), 4), status: "COUNTERED",
      counterAmount: 30500000, counterMessage: "The owners can meet you at ₹3.05 crore with the November registration.", counteredAt: subHours(new Date(), 6), createdAt: subHours(new Date(), 30),
    },
  });
  // Accepted offer on the Kalyani Nagar loft (UNDER_OFFER) - buyer karthik, not yet reserved
  await prisma.offer.create({
    data: {
      propertyId: prop(4), buyerId: u("karthik").id, sellerId: u("rohan").id, amount: 12000000, currency: "INR", financing: "CASH",
      expiresAt: addDays(new Date(), 10), status: "ACCEPTED", respondedAt: subHours(new Date(), 40), createdAt: subHours(new Date(), 50),
    },
  });
  // Rejected offer on the Besant Nagar bungalow (buyer karthik)
  await prisma.offer.create({
    data: {
      propertyId: prop(11), buyerId: u("karthik").id, sellerId: u("arjun").id, amount: 58000000, currency: "INR", financing: "MORTGAGE",
      conditions: "Contingent on the sale of my current flat in Adyar.", expiresAt: addDays(new Date(), 3), status: "REJECTED", respondedAt: subHours(new Date(), 7), createdAt: subHours(new Date(), 10),
    },
  });
  // Expired offer (buyer vikram on the Aundh duplex)
  await prisma.offer.create({
    data: {
      propertyId: prop(5), buyerId: u("vikram").id, sellerId: u("rohan").id, amount: 19000000, currency: "INR",
      expiresAt: subDays(new Date(), 2), status: "EXPIRED", respondedAt: subDays(new Date(), 2), createdAt: subDays(new Date(), 9),
    },
  });
  // Withdrawn offer (buyer sneha on the Juhu villa)
  await prisma.offer.create({
    data: {
      propertyId: prop(17), buyerId: u("sneha").id, sellerId: u("arjun").id, amount: 172000000, currency: "INR", financing: "CASH",
      expiresAt: addDays(new Date(), 5), status: "WITHDRAWN", respondedAt: subDays(new Date(), 1), createdAt: subDays(new Date(), 3),
    },
  });
  // Accepted + reserved (deposit paid) on the Kochi Marine Drive flat (buyer sneha)
  const reservedOffer = await prisma.offer.create({
    data: {
      propertyId: prop(14), buyerId: u("sneha").id, sellerId: u("arjun").id, amount: 23000000, currency: "INR", financing: "CASH",
      expiresAt: addDays(new Date(), 20), status: "ACCEPTED", respondedAt: subDays(new Date(), 6), createdAt: subDays(new Date(), 8),
    },
  });
  const reservation = await prisma.reservation.create({
    data: {
      reference: "DKR-SEED0001", propertyId: prop(14), offerId: reservedOffer.id, buyerId: u("sneha").id, sellerId: u("arjun").id,
      depositAmount: 150000, currency: "INR", status: "DEPOSIT_PAID", stripeCheckoutSessionId: "cs_test_seed_kochi_0001", paidAt: subDays(new Date(), 5), createdAt: subDays(new Date(), 5),
    },
  });
  await prisma.payment.create({
    data: {
      reservationId: reservation.id, amount: 150000, currency: "INR", status: "SUCCEEDED", stripeCheckoutSessionId: "cs_test_seed_kochi_0001",
      stripePaymentIntentId: "pi_test_seed_kochi_0001", createdAt: subDays(new Date(), 5),
    },
  });
  await prisma.stripeEvent.create({ data: { id: "evt_test_seed_kochi_0001", type: "checkout.session.completed", processedAt: subDays(new Date(), 5) } });
  // Completed reservation for the sold Baner penthouse (buyer vikram)
  const soldOffer = await prisma.offer.create({
    data: {
      propertyId: prop(20), buyerId: u("vikram").id, sellerId: u("rohan").id, amount: 26500000, currency: "INR", financing: "MORTGAGE",
      expiresAt: subDays(new Date(), 30), status: "ACCEPTED", respondedAt: subDays(new Date(), 45), createdAt: subDays(new Date(), 50),
    },
  });
  const completed = await prisma.reservation.create({
    data: {
      reference: "DKR-SEED0002", propertyId: prop(20), offerId: soldOffer.id, buyerId: u("vikram").id, sellerId: u("rohan").id,
      depositAmount: 150000, currency: "INR", status: "COMPLETED", stripeCheckoutSessionId: "cs_test_seed_baner_0002", paidAt: subDays(new Date(), 44), completedAt: subDays(new Date(), 5), createdAt: subDays(new Date(), 44),
    },
  });
  await prisma.payment.create({
    data: { reservationId: completed.id, amount: 150000, currency: "INR", status: "SUCCEEDED", stripeCheckoutSessionId: "cs_test_seed_baner_0002", stripePaymentIntentId: "pi_test_seed_baner_0002", createdAt: subDays(new Date(), 44) },
  });

  // ---------------------------------------------------------------------- report
  console.log("→ Reports");
  await prisma.propertyReport.create({
    data: { propertyId: prop(19), reporterId: u("sneha").id, reason: "INACCURATE", details: "The listing says fully leased but two units looked vacant when I visited.", status: "OPEN", createdAt: subDays(new Date(), 1) },
  });
  await prisma.propertyReport.create({
    data: { propertyId: prop(8), reporterId: u("vikram").id, reason: "DUPLICATE", details: "Looks like the same studio as another listing.", status: "DISMISSED", resolvedById: u("admin").id, resolvedAt: subDays(new Date(), 4), resolution: "Different unit in the same building.", createdAt: subDays(new Date(), 6) },
  });

  // --------------------------------------------------------------- notifications
  console.log("→ Notifications & audit log");
  const notifications = [
    { user: "meera", type: "NEW_ENQUIRY" as const, title: `New enquiry about ${propertyTitle(0)}`, body: "Priya Menon wrote: “Site visit this weekend?”", href: "/dashboard/enquiries", read: true, hoursAgo: 30 },
    { user: "meera", type: "NEW_OFFER" as const, title: `New offer on ${propertyTitle(0)}`, body: "Priya Menon offered ₹1,75,00,000.", href: "/dashboard/offers", read: false, hoursAgo: 20 },
    { user: "meera", type: "NEW_MESSAGE" as const, title: "New message from Priya Menon", body: "Perfect, see you Saturday. Is there flexibility on the registration date?", href: "/messages", read: true, hoursAgo: 23 },
    { user: "priya", type: "NEW_MESSAGE" as const, title: "New message from Meera Iyer", body: "Absolutely, a 45-day registration timeline is fine for us.", href: "/messages", read: false, hoursAgo: 2 },
    { user: "vikram", type: "COUNTER_OFFER" as const, title: `Counteroffer on ${propertyTitle(3)}`, body: "The seller countered with ₹3,05,00,000.", href: "/dashboard/offers", read: false, hoursAgo: 6 },
    { user: "vikram", type: "OFFER_EXPIRED" as const, title: "Offer expired", body: `Your offer on "${propertyTitle(5)}" expired.`, href: "/dashboard/offers", read: true, hoursAgo: 48 },
    { user: "karthik", type: "OFFER_ACCEPTED" as const, title: "Offer accepted 🎉", body: `Your offer of ₹1,20,00,000 on "${propertyTitle(4)}" was accepted. You can now reserve the property.`, href: "/dashboard/offers", read: false, hoursAgo: 40 },
    { user: "karthik", type: "OFFER_REJECTED" as const, title: "Offer declined", body: `The seller declined your offer on "${propertyTitle(11)}".`, href: "/dashboard/offers", read: false, hoursAgo: 7 },
    { user: "sneha", type: "RESERVATION_PAID" as const, title: "Deposit received", body: `Your ₹1,50,000 token deposit for "${propertyTitle(14)}" is confirmed. Reference DKR-SEED0001.`, href: "/dashboard/reservations", read: true, hoursAgo: 120 },
    { user: "arjun", type: "RESERVATION_PAID" as const, title: "Property reserved", body: `The buyer paid the ₹1,50,000 token deposit for "${propertyTitle(14)}".`, href: "/dashboard/reservations", read: false, hoursAgo: 120 },
    { user: "arjun", type: "NEW_ENQUIRY" as const, title: `New enquiry about ${propertyTitle(16)}`, body: "Sneha Kulkarni wrote: “Rental yield details”", href: "/dashboard/enquiries", read: false, hoursAgo: 1 },
    { user: "kavya", type: "NEW_ENQUIRY" as const, title: `New enquiry about ${propertyTitle(7)}`, body: "Karthik Raman wrote: “Pet policy”", href: "/dashboard/enquiries", read: false, hoursAgo: 3 },
    { user: "meera", type: "LISTING_REJECTED" as const, title: "Listing needs changes", body: `"${propertyTitle(25)}" was not approved. ${PROPERTIES[25]!.rejectionReason}`, href: "/dashboard/properties", read: true, hoursAgo: 300 },
    { user: "rohan", type: "LISTING_APPROVED" as const, title: "Listing approved", body: `"${propertyTitle(3)}" is now live and visible to buyers.`, href: "/dashboard/properties", read: true, hoursAgo: 96 },
  ];
  for (const notification of notifications) {
    await prisma.notification.create({
      data: {
        userId: u(notification.user).id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        readAt: notification.read ? subHours(new Date(), notification.hoursAgo - 1) : null,
        createdAt: subHours(new Date(), notification.hoursAgo),
      },
    });
  }

  const audits = [
    { actor: "admin", action: "property.approved", targetType: "Property", targetId: prop(3), daysAgo: 4 },
    { actor: "admin", action: "property.rejected", targetType: "Property", targetId: prop(25), daysAgo: 12, metadata: { reason: PROPERTIES[25]!.rejectionReason } },
    { actor: "admin", action: "user.suspended", targetType: "User", targetId: u("suspended").id, daysAgo: 3, metadata: { reason: "Repeated spam listings." } },
    { actor: "sneha", action: "reservation.paid", targetType: "Reservation", targetId: reservation.id, daysAgo: 5, metadata: { sessionId: "cs_test_seed_kochi_0001" } },
    { actor: "admin", action: "reservation.completed", targetType: "Reservation", targetId: completed.id, daysAgo: 5 },
    { actor: "sneha", action: "offer.created", targetType: "Offer", targetId: reservedOffer.id, daysAgo: 8, metadata: { amount: 23000000 } },
  ];
  for (const entry of audits) {
    await prisma.auditLog.create({
      data: { actorId: u(entry.actor).id, action: entry.action, targetType: entry.targetType, targetId: entry.targetId, metadata: entry.metadata, createdAt: subDays(new Date(), entry.daysAgo) },
    });
  }

  console.log("\n✔ Seed complete\n");
  console.log("Demo accounts (password for all: %s)", SEED_PASSWORD);
  for (const seedUser of USERS) {
    console.log(`  ${seedUser.role.padEnd(6)} ${seedUser.email.padEnd(28)} ${seedUser.status === "SUSPENDED" ? "(suspended)" : seedUser.verified ? "" : "(email not verified)"}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
