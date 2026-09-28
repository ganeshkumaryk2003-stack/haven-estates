import { z } from "zod";
import { CONTACT_METHODS, FINANCING_METHODS, REPORT_REASONS } from "@/lib/constants";
import { optionalEnum, optionalPhone, optionalText } from "@/validations/shared";

export const enquirySchema = z.object({
  propertyId: z.string().min(1),
  subject: z.string().trim().min(3, "Add a short subject").max(120),
  message: z.string().trim().min(10, "Tell the seller a little more (10+ characters)").max(3000),
  phone: optionalPhone(),
  preferredContact: z.enum(CONTACT_METHODS).default("EMAIL"),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const enquiryStatusSchema = z.object({
  enquiryId: z.string().min(1),
  status: z.enum(["READ", "REPLIED", "CLOSED", "SPAM"]),
});

export const reportSchema = z.object({
  propertyId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: optionalText(1000),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const messageSchema = z
  .object({
    conversationId: z.string().min(1),
    body: z.string().trim().max(4000),
    attachments: z
      .array(
        z.object({
          url: z.string().min(1),
          storageKey: z.string().min(1),
          name: z.string().min(1).max(200),
          contentType: z.string().min(1),
          size: z.number().int().positive(),
          kind: z.enum(["IMAGE", "DOCUMENT"]),
        }),
      )
      .max(5)
      .default([]),
  })
  .refine((data) => data.body.length > 0 || data.attachments.length > 0, {
    message: "Write a message or attach a file",
    path: ["body"],
  });
export type MessageInput = z.infer<typeof messageSchema>;

export const startConversationSchema = z.object({
  recipientId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  body: z.string().trim().min(1, "Write a message").max(4000),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const offerSchema = z.object({
  propertyId: z.string().min(1),
  amount: z.coerce.number().positive("Enter your offer amount").max(999_999_999_999),
  financing: optionalEnum(FINANCING_METHODS),
  conditions: optionalText(2000),
  message: optionalText(2000),
  expiresAt: z.string().refine((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
  }, "Choose an expiry date in the future"),
});
export type OfferInput = z.infer<typeof offerSchema>;

export const counterOfferSchema = z.object({
  offerId: z.string().min(1),
  counterAmount: z.coerce.number().positive("Enter a counter amount").max(999_999_999_999),
  counterMessage: optionalText(2000),
});
export type CounterOfferInput = z.infer<typeof counterOfferSchema>;

export const offerDecisionSchema = z.object({
  offerId: z.string().min(1),
  decision: z.enum(["accept", "reject", "withdraw", "accept_counter", "reject_counter"]),
});
export type OfferDecisionInput = z.infer<typeof offerDecisionSchema>;
