import { describe, expect, it } from "vitest";
import { loginSchema, passwordSchema, signupSchema } from "@/validations/auth";

describe("auth validation", () => {
  it("normalises and validates emails on login", () => {
    const result = loginSchema.safeParse({ email: "  Person@Example.COM ", password: "secret" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("person@example.com");
  });

  it("rejects invalid emails and empty passwords", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
    expect(passwordSchema.safeParse("GoodPass123").success).toBe(true);
  });

  it("requires matching passwords, accepted terms and a non-admin role on signup", () => {
    const base = { name: "Alex Morgan", email: "alex@example.com", password: "GoodPass123", confirmPassword: "GoodPass123", acceptTerms: true };
    expect(signupSchema.safeParse(base).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, confirmPassword: "Different1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, role: "AGENT" }).success).toBe(true);
  });
});

describe("optional field schemas re-validate their own output", () => {
  it("accepts null values produced by a previous parse", async () => {
    const { enquirySchema, offerSchema } = await import("@/validations/engagement");
    const { profileSchema } = await import("@/validations/profile");
    const enquiry = enquirySchema.parse({ propertyId: "p", subject: "Hello there", message: "Is this still available? Thanks!", phone: "", preferredContact: "EMAIL" });
    expect(enquiry.phone).toBeNull();
    expect(enquirySchema.safeParse(enquiry).success).toBe(true);

    const offer = offerSchema.parse({ propertyId: "p", amount: "1000", financing: "", conditions: "", message: "", expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(offer.financing).toBeNull();
    expect(offerSchema.safeParse(offer).success).toBe(true);

    const profile = profileSchema.parse({ name: "Alex", role: "BUYER", phone: "", bio: "", company: "", location: "", website: "" });
    expect(profile.website).toBeNull();
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });
});
