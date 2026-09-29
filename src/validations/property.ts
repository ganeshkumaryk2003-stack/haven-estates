import { z } from "zod";
import {
  AREA_UNITS,
  CURRENCIES,
  DEFAULT_CURRENCY,
  FURNISHED_STATUSES,
  LISTING_TYPES,
  MAX_PROPERTY_IMAGES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  SORT_OPTIONS,
} from "@/lib/constants";
import { optionalText, optionalUrl } from "@/validations/shared";

const currentYear = new Date().getFullYear();

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().int().min(min).max(max).nullable(),
  );

export const propertyImageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  storageKey: z.string().min(1),
  alt: z.string().max(200).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});
export type PropertyImageInput = z.infer<typeof propertyImageInputSchema>;

export const propertySchema = z
  .object({
    title: z.string().trim().min(8, "Title should be at least 8 characters").max(120, "Keep the title under 120 characters"),
    description: z.string().trim().min(40, "Describe the property in at least 40 characters").max(6000),
    listingType: z.enum(LISTING_TYPES),
    propertyType: z.enum(PROPERTY_TYPES),
    price: z.coerce.number().positive("Enter a price").max(999_999_999_999, "Price is too large"),
    currency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
    depositAmount: z.coerce.number().min(50, "Deposit must be at least 50").max(999_999_999),
    address: z.string().trim().min(3, "Enter the street address").max(200),
    city: z.string().trim().min(2, "Enter the city").max(100),
    state: z.string().trim().min(2, "Enter the state or region").max(100),
    postalCode: z.string().trim().min(2, "Enter the postal code").max(20),
    country: z.string().trim().min(2, "Enter the country").max(80),
    latitude: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().min(-90).max(90).nullable(),
    ),
    longitude: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().min(-180).max(180).nullable(),
    ),
    bedrooms: z.coerce.number().int().min(0).max(50),
    bathrooms: z.coerce.number().min(0).max(50).multipleOf(0.5, "Use whole or half bathrooms (e.g. 2.5)"),
    parkingSpaces: z.coerce.number().int().min(0).max(50),
    interiorArea: optionalInt(1, 10_000_000),
    lotArea: optionalInt(1, 1_000_000_000),
    areaUnit: z.enum(AREA_UNITS).default("SQFT"),
    yearBuilt: optionalInt(1600, currentYear + 3),
    furnished: z.enum(FURNISHED_STATUSES).default("UNFURNISHED"),
    availableFrom: optionalText(40).refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date"),
    amenityIds: z.array(z.string()).max(60).default([]),
    images: z.array(propertyImageInputSchema).max(MAX_PROPERTY_IMAGES, `You can add up to ${MAX_PROPERTY_IMAGES} photos`).default([]),
    floorPlanUrl: optionalUrl(),
    videoUrl: optionalUrl(),
    virtualTourUrl: optionalUrl(),
  })
  .superRefine((data, ctx) => {
    if ((data.latitude === null) !== (data.longitude === null)) {
      ctx.addIssue({ code: "custom", path: ["longitude"], message: "Provide both latitude and longitude, or leave both empty" });
    }
    if (data.depositAmount > data.price) {
      ctx.addIssue({ code: "custom", path: ["depositAmount"], message: "The deposit cannot exceed the price" });
    }
  });

export type PropertyInput = z.infer<typeof propertySchema>;
// Values as held by the form before coercion.
export type PropertyFormValues = z.input<typeof propertySchema>;

// Publishing requires at least one photo; drafts do not.
export const publishRequirements = z.object({
  images: z.array(z.unknown()).min(1, "Add at least one photo before publishing"),
});

export const propertyStatusActionSchema = z.object({
  propertyId: z.string().min(1),
  action: z.enum(["publish", "unpublish", "archive", "mark_sold", "mark_rented", "delete", "restore"]),
});

export const propertyFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  propertyType: z.array(z.enum(PROPERTY_TYPES)).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().min(0).max(20).optional(),
  minArea: z.coerce.number().min(0).optional(),
  maxArea: z.coerce.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  furnished: z.enum(FURNISHED_STATUSES).optional(),
  listedWithin: z.enum(["1", "7", "30", "90"]).optional(),
  sort: z.enum(SORT_OPTIONS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  view: z.enum(["grid", "list", "map"]).default("grid"),
});
export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;

export const adminPropertyStatusSchema = z.enum(PROPERTY_STATUSES);
