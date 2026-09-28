import "server-only";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const booleanString = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Haven Estates"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_TRUST_HOST: booleanString,
    AUTH_GOOGLE_ID: optionalString,
    AUTH_GOOGLE_SECRET: optionalString,

    EMAIL_DRIVER: z.enum(["console", "resend", "mailpit"]).default("console"),
    EMAIL_FROM: z.string().default("Haven Estates <no-reply@haven.local>"),
    RESEND_API_KEY: optionalString,
    MAILPIT_API_URL: z.url().default("http://localhost:8025"),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    S3_BUCKET: optionalString,
    S3_REGION: z.string().default("us-east-1"),
    S3_ENDPOINT: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString,

    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,

    SEED_PASSWORD: z.string().default("Password123!"),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!value[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
        }
      }
    }
    if (value.EMAIL_DRIVER === "resend" && !value.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_DRIVER=resend" });
    }
    if (value.NODE_ENV === "production" && value.STRIPE_SECRET_KEY?.startsWith("sk_live")) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message: "This reference app only supports Stripe test-mode keys (sk_test_...).",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

// Validated once per process. Server modules import `env` instead of touching process.env.
export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
export const googleAuthConfigured = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
