// Money helpers. Prisma returns Decimal instances; these helpers convert them to
// plain numbers / strings for DTOs and to integer minor units for Stripe.

type DecimalLike = { toString(): string };

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "UGX"]);

export function decimalToNumber(value: DecimalLike | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(num) ? num : 0;
}

export function decimalToString(value: DecimalLike | number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return typeof value === "string" ? value : value.toString();
}

export function minorUnitFactor(currency: string) {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
}

// Convert a decimal amount (e.g. "1250.50") into integer minor units ("125050") for Stripe.
export function toMinorUnits(amount: DecimalLike | number | string, currency: string): number {
  const factor = minorUnitFactor(currency);
  const [whole = "0", fraction = ""] = decimalToString(amount).split(".");
  const wholeUnits = Number.parseInt(whole, 10) * factor;
  if (factor === 1) return wholeUnits;
  const cents = Number.parseInt(fraction.padEnd(2, "0").slice(0, 2), 10);
  return wholeUnits + cents;
}

export function fromMinorUnits(amount: number, currency: string): number {
  return amount / minorUnitFactor(currency);
}

// Sensible default reservation deposit: 1% of the price for sales, one month for rentals,
// clamped to a reasonable range.
export function suggestedDeposit(price: number, listingType: "SALE" | "RENT") {
  if (listingType === "RENT") return Math.round(price);
  const onePercent = Math.round(price * 0.01);
  return Math.min(Math.max(onePercent, 500), 25_000);
}
