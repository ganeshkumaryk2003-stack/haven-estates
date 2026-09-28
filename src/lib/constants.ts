// Shared, client-safe constants and labels. Enum string values mirror prisma/schema.prisma
// so this file can be imported by client components without pulling in Prisma.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Haven Estates";
export const APP_DESCRIPTION =
  "Buy, rent, sell and list homes with verified sellers, secure enquiries, offers and reservation deposits.";

export const LISTING_TYPES = ["SALE", "RENT"] as const;
export const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "CONDO", "TOWNHOUSE", "LAND", "COMMERCIAL", "OTHER"] as const;
export const PROPERTY_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "UNDER_OFFER",
  "RESERVED",
  "SOLD",
  "RENTED",
  "REJECTED",
  "ARCHIVED",
] as const;
export const FURNISHED_STATUSES = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"] as const;
export const AREA_UNITS = ["SQFT", "SQM"] as const;
export const CONTACT_METHODS = ["EMAIL", "PHONE", "MESSAGE"] as const;
export const FINANCING_METHODS = ["CASH", "MORTGAGE", "MIXED", "OTHER"] as const;
export const REPORT_REASONS = ["INACCURATE", "SCAM", "DUPLICATE", "INAPPROPRIATE", "ALREADY_SOLD", "OTHER"] as const;
export const USER_ROLES = ["BUYER", "SELLER", "AGENT", "ADMIN"] as const;
export const SORT_OPTIONS = ["newest", "oldest", "price_asc", "price_desc", "popular"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export type ListingTypeValue = (typeof LISTING_TYPES)[number];
export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number];
export type PropertyStatusValue = (typeof PROPERTY_STATUSES)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];

export const LISTING_TYPE_LABELS: Record<ListingTypeValue, string> = {
  SALE: "For sale",
  RENT: "For rent",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyTypeValue, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatusValue, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Active",
  UNDER_OFFER: "Under offer",
  RESERVED: "Reserved",
  SOLD: "Sold",
  RENTED: "Rented",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export const FURNISHED_LABELS: Record<(typeof FURNISHED_STATUSES)[number], string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FURNISHED: "Furnished",
};

export const CONTACT_METHOD_LABELS: Record<(typeof CONTACT_METHODS)[number], string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  MESSAGE: "In-app message",
};

export const FINANCING_LABELS: Record<(typeof FINANCING_METHODS)[number], string> = {
  CASH: "Cash",
  MORTGAGE: "Mortgage",
  MIXED: "Cash + mortgage",
  OTHER: "Other",
};

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  INACCURATE: "Inaccurate information",
  SCAM: "Looks like a scam",
  DUPLICATE: "Duplicate listing",
  INAPPROPRIATE: "Inappropriate content",
  ALREADY_SOLD: "Already sold or rented",
  OTHER: "Something else",
};

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  popular: "Most popular",
};

export const ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  AGENT: "Agent",
  ADMIN: "Administrator",
};

// Statuses visible to the public. Everything else is only visible to the owner/admin.
export const PUBLIC_PROPERTY_STATUSES: PropertyStatusValue[] = ["ACTIVE", "UNDER_OFFER", "RESERVED", "SOLD", "RENTED"];
// Statuses that accept new enquiries/offers.
export const OPEN_PROPERTY_STATUSES: PropertyStatusValue[] = ["ACTIVE", "UNDER_OFFER"];

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PROPERTY_IMAGES = 20;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf"] as const;

export const PAGE_SIZE = 12;
export const MESSAGE_PAGE_SIZE = 30;
