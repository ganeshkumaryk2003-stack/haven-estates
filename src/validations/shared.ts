import { z } from "zod";

// Optional free-text fields arrive from forms as "" and are stored as null. The same schema is
// run again on the server against the already-transformed values, so null (and a missing key)
// must be accepted too.
export const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

export const optionalUrl = (max = 500) =>
  optionalText(max).refine((value) => !value || /^https?:\/\//i.test(value), "Enter a full URL starting with http:// or https://");

export const optionalPhone = () =>
  optionalText(30).refine((value) => !value || /^[+\d][\d\s().-]{6,}$/.test(value), "Enter a valid phone number");

export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? (value as T[number]) : null));
