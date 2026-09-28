import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";
import { optionalPhone, optionalText, optionalUrl } from "@/validations/shared";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  role: z.enum(USER_ROLES.filter((role) => role !== "ADMIN") as unknown as ["BUYER", "SELLER", "AGENT"]),
  phone: optionalPhone(),
  bio: optionalText(600),
  company: optionalText(120),
  location: optionalText(120),
  website: optionalUrl(200),
});
export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileFormValues = z.input<typeof profileSchema>;

export const notificationPreferencesSchema = z.object({
  emailOnEnquiry: z.boolean(),
  emailOnMessage: z.boolean(),
  emailOnOffer: z.boolean(),
  emailOnReservation: z.boolean(),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export const onboardingSchema = profileSchema.pick({ name: true, role: true, phone: true, location: true, company: true });
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingFormValues = z.input<typeof onboardingSchema>;
