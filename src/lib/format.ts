import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants";

export function formatMoney(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY,
  options: { compact?: boolean; maximumFractionDigits?: number } = {},
) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.maximumFractionDigits ?? (options.compact ? 1 : 0),
  }).format(value);
}

export function formatPrice(amount: number | string, currency: string, listingType: "SALE" | "RENT") {
  const base = formatMoney(amount, currency);
  return listingType === "RENT" ? `${base}/month` : base;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(value);
}

export function formatArea(value: number | null | undefined, unit: "SQFT" | "SQM" = "SQFT") {
  if (!value) return "—";
  return `${formatNumber(value)} ${unit === "SQFT" ? "sq ft" : "m²"}`;
}

// Day-first patterns, as written in India (e.g. 5 Oct 2026).
export function formatDate(date: Date | string, pattern = "d MMM yyyy") {
  return format(typeof date === "string" ? new Date(date) : date, pattern);
}

export function formatDateTime(date: Date | string) {
  return format(typeof date === "string" ? new Date(date) : date, "d MMM yyyy 'at' h:mm a");
}

export function formatRelative(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${formatDistanceToNowStrict(value, { addSuffix: true })}`;
}

export function formatMessageTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  if (isToday(value)) return format(value, "h:mm a");
  if (isYesterday(value)) return `Yesterday ${format(value, "h:mm a")}`;
  return format(value, "d MMM, h:mm a");
}

export function formatBathrooms(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
