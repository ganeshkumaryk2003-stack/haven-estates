import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { buildStorageKey } from "@/lib/storage";
import { findConnectionBetween } from "@/server/services/connections";
import { createEnquiry } from "@/server/services/enquiries";
import { getConversationDetail, getOrCreateConversation, sendMessage } from "@/server/services/messaging";
import { counterOffer, createOffer, decideOffer } from "@/server/services/offers";
import { createRun } from "../../helpers/factories";

const run = createRun();
let seller: Awaited<ReturnType<typeof run.user>>;
let buyer: Awaited<ReturnType<typeof run.user>>;
let otherBuyer: Awaited<ReturnType<typeof run.user>>;
let outsider: Awaited<ReturnType<typeof run.user>>;
let admin: Awaited<ReturnType<typeof run.user>>;
let property: Awaited<ReturnType<typeof run.property>>;

beforeAll(async () => {
  seller = await run.user({ role: "SELLER" });
  buyer = await run.user();
  otherBuyer = await run.user();
  outsider = await run.user();
  admin = await run.user({ role: "ADMIN" });
  property = await run.property(seller.id, { price: 400_000 });
});

afterAll(() => run.cleanup());

const enquiryInput = { subject: "Is it available?", message: "Hello, I would like to arrange a viewing this week.", phone: null, preferredContact: "EMAIL" as const };
const inAWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

describe("enquiries", () => {
  it("prevents owners from enquiring about their own listing", async () => {
    await expect(createEnquiry(seller, { propertyId: property.id, ...enquiryInput })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates the enquiry, a buyer/seller connection and a notification for the seller", async () => {
    const enquiry = await createEnquiry(buyer, { propertyId: property.id, ...enquiryInput });
    expect(enquiry.status).toBe("NEW");
    const connection = await findConnectionBetween(buyer.id, seller.id);
    expect(connection?.status).toBe("ACTIVE");
    const notification = await prisma.notification.findFirst({ where: { userId: seller.id, type: "NEW_ENQUIRY" } });
    expect(notification?.href).toBe("/dashboard/enquiries");
  });
});

describe("conversation access control", () => {
  it("only lets participants (or admins) read a conversation", async () => {
    const conversation = await getOrCreateConversation(buyer.id, seller.id, property.id);
    await sendMessage(buyer, { conversationId: conversation.id, body: "Hi there", attachments: [] });

    const asBuyer = await getConversationDetail(conversation.id, { id: buyer.id, role: "BUYER" });
    expect(asBuyer.messages).toHaveLength(1);
    const asAdmin = await getConversationDetail(conversation.id, { id: admin.id, role: "ADMIN" });
    expect(asAdmin.messages).toHaveLength(1);
    await expect(getConversationDetail(conversation.id, { id: outsider.id, role: "BUYER" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(sendMessage(outsider, { conversationId: conversation.id, body: "Let me in", attachments: [] })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects attachments that the sender did not upload and normalises the ones they did", async () => {
    const conversation = await getOrCreateConversation(buyer.id, seller.id, property.id);
    const foreign = { url: "/api/files/x", storageKey: buildStorageKey("attachments", seller.id, "application/pdf"), name: "stolen.pdf", contentType: "application/pdf", size: 10, kind: "DOCUMENT" as const };
    await expect(sendMessage(buyer, { conversationId: conversation.id, body: "", attachments: [foreign] })).rejects.toBeInstanceOf(ForbiddenError);

    const ownKey = buildStorageKey("attachments", buyer.id, "application/pdf");
    const sent = await sendMessage(buyer, {
      conversationId: conversation.id,
      body: "",
      attachments: [{ url: "https://evil.example/ignored", storageKey: ownKey, name: "survey.pdf", contentType: "image/png", size: 4096, kind: "IMAGE" }],
    });
    expect(sent.attachments[0]).toMatchObject({ url: `/api/files/${ownKey}`, contentType: "application/pdf", kind: "DOCUMENT", name: "survey.pdf" });
  });

  it("reuses the same conversation for the same pair and property", async () => {
    const first = await getOrCreateConversation(buyer.id, seller.id, property.id);
    const second = await getOrCreateConversation(seller.id, buyer.id, property.id);
    expect(second.id).toBe(first.id);
  });

  it("refuses messaging yourself", async () => {
    await expect(getOrCreateConversation(buyer.id, buyer.id, null)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("offer state machine", () => {
  it("blocks self-purchase", async () => {
    await expect(createOffer(seller, { propertyId: property.id, amount: 400_000, financing: null, conditions: null, message: null, expiresAt: inAWeek() })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("walks pending → countered → accepted and expires competing offers", async () => {
    const offer = await createOffer(buyer, { propertyId: property.id, amount: 380_000, financing: "CASH", conditions: null, message: null, expiresAt: inAWeek() });
    const competing = await createOffer(otherBuyer, { propertyId: property.id, amount: 370_000, financing: null, conditions: null, message: null, expiresAt: inAWeek() });
    expect(offer.status).toBe("PENDING");

    // A buyer may only hold one open offer per listing.
    await expect(createOffer(buyer, { propertyId: property.id, amount: 385_000, financing: null, conditions: null, message: null, expiresAt: inAWeek() })).rejects.toBeInstanceOf(ConflictError);

    // Only the seller may counter, only the buyer may accept a counter.
    await expect(counterOffer(buyer, { offerId: offer.id, counterAmount: 395_000, counterMessage: null })).rejects.toBeInstanceOf(ForbiddenError);
    await counterOffer(seller, { offerId: offer.id, counterAmount: 395_000, counterMessage: "Meet in the middle?" });
    await expect(decideOffer(seller, offer.id, "accept_counter")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(decideOffer(seller, offer.id, "accept")).rejects.toBeInstanceOf(ConflictError);

    await decideOffer(buyer, offer.id, "accept_counter");

    const accepted = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(accepted.status).toBe("ACCEPTED");
    const updatedProperty = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(updatedProperty.status).toBe("UNDER_OFFER");
    const expired = await prisma.offer.findUniqueOrThrow({ where: { id: competing.id } });
    expect(expired.status).toBe("EXPIRED");

    // Accepted offers can no longer be withdrawn or rejected.
    await expect(decideOffer(buyer, offer.id, "withdraw")).rejects.toBeInstanceOf(ConflictError);
    await expect(decideOffer(seller, offer.id, "reject")).rejects.toBeInstanceOf(ConflictError);
  });

  it("lets buyers withdraw pending offers and sellers reject them", async () => {
    const second = await run.property(seller.id, { price: 100_000 });
    const offer = await createOffer(buyer, { propertyId: second.id, amount: 90_000, financing: null, conditions: null, message: null, expiresAt: inAWeek() });
    await expect(decideOffer(outsider, offer.id, "reject")).rejects.toBeInstanceOf(ForbiddenError);
    await decideOffer(buyer, offer.id, "withdraw");
    expect((await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } })).status).toBe("WITHDRAWN");

    const again = await createOffer(buyer, { propertyId: second.id, amount: 95_000, financing: null, conditions: null, message: null, expiresAt: inAWeek() });
    await decideOffer(seller, again.id, "reject");
    expect((await prisma.offer.findUniqueOrThrow({ where: { id: again.id } })).status).toBe("REJECTED");
  });
});
