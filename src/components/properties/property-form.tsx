"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Eye, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/properties/image-uploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError, FormField, fieldA11y } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AREA_UNITS,
  CURRENCIES,
  FURNISHED_LABELS,
  FURNISHED_STATUSES,
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { suggestedDeposit } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createPropertyAction, updatePropertyAction } from "@/server/actions/properties";
import type { AmenityDTO, PropertyDetailDTO } from "@/types/dto";
import { propertySchema, type PropertyFormValues, type PropertyInput } from "@/validations/property";

interface PropertyFormProps {
  amenities: AmenityDTO[];
  property?: PropertyDetailDTO;
  emailVerified: boolean;
}

const STEPS = [
  { id: "basics", title: "Basics", description: "Title, type and price" },
  { id: "location", title: "Location", description: "Address and map position" },
  { id: "details", title: "Details", description: "Rooms, size and features" },
  { id: "amenities", title: "Amenities", description: "What's included" },
  { id: "media", title: "Photos & media", description: "Gallery, floor plan, video" },
  { id: "review", title: "Review", description: "Save or publish" },
] as const;

const STEP_FIELDS: Record<(typeof STEPS)[number]["id"], FieldPath<PropertyFormValues>[]> = {
  basics: ["title", "description", "listingType", "propertyType", "price", "currency", "depositAmount"],
  location: ["address", "city", "state", "postalCode", "country", "latitude", "longitude"],
  details: ["bedrooms", "bathrooms", "parkingSpaces", "interiorArea", "lotArea", "areaUnit", "yearBuilt", "furnished", "availableFrom"],
  amenities: ["amenityIds"],
  media: ["images", "floorPlanUrl", "videoUrl", "virtualTourUrl"],
  review: [],
};

function toFormValues(property?: PropertyDetailDTO): PropertyFormValues {
  if (!property) {
    return {
      title: "",
      description: "",
      listingType: "SALE",
      propertyType: "HOUSE",
      price: "",
      currency: "USD",
      depositAmount: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United States",
      latitude: "",
      longitude: "",
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      interiorArea: "",
      lotArea: "",
      areaUnit: "SQFT",
      yearBuilt: "",
      furnished: "UNFURNISHED",
      availableFrom: "",
      amenityIds: [],
      images: [],
      floorPlanUrl: "",
      videoUrl: "",
      virtualTourUrl: "",
    };
  }
  return {
    title: property.title,
    description: property.description,
    listingType: property.listingType,
    propertyType: property.propertyType,
    price: property.price,
    currency: property.currency as PropertyFormValues["currency"],
    depositAmount: property.depositAmount,
    address: property.address,
    city: property.city,
    state: property.state,
    postalCode: property.postalCode,
    country: property.country,
    latitude: property.latitude ?? "",
    longitude: property.longitude ?? "",
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpaces: property.parkingSpaces,
    interiorArea: property.interiorArea ?? "",
    lotArea: property.lotArea ?? "",
    areaUnit: property.areaUnit,
    yearBuilt: property.yearBuilt ?? "",
    furnished: property.furnished,
    availableFrom: property.availableFrom ? property.availableFrom.slice(0, 10) : "",
    amenityIds: property.amenities.map((amenity) => amenity.id),
    images: property.images.map((image) => ({ id: image.id, url: image.url, storageKey: image.storageKey, alt: image.alt ?? "", width: image.width, height: image.height })),
    floorPlanUrl: property.floorPlanUrl ?? "",
    videoUrl: property.videoUrl ?? "",
    virtualTourUrl: property.virtualTourUrl ?? "",
  };
}

export function PropertyForm({ amenities, property, emailVerified }: PropertyFormProps) {
  const router = useRouter();
  const isEdit = Boolean(property);
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<"draft" | "publish" | null>(null);

  const form = useForm<PropertyFormValues, unknown, PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: toFormValues(property),
    mode: "onBlur",
  });
  const { errors, isDirty } = form.formState;
  const listingType = useWatch({ control: form.control, name: "listingType" });
  const propertyType = useWatch({ control: form.control, name: "propertyType" });
  const price = useWatch({ control: form.control, name: "price" });
  const currency = useWatch({ control: form.control, name: "currency" }) ?? "USD";
  const images = useWatch({ control: form.control, name: "images" }) ?? [];
  const amenityIds = useWatch({ control: form.control, name: "amenityIds" }) ?? [];

  // Warn before leaving with unsaved changes.
  React.useEffect(() => {
    if (!isDirty || submitting) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, submitting]);

  const currentStep = STEPS[step]!;

  async function goTo(next: number) {
    if (next > step) {
      const valid = await form.trigger(STEP_FIELDS[currentStep.id], { shouldFocus: true });
      if (!valid) return;
    }
    setStep(Math.min(Math.max(0, next), STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyFieldErrors(fieldErrors?: Record<string, string[]>) {
    if (!fieldErrors) return;
    let firstStep: number | null = null;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      form.setError(field as FieldPath<PropertyFormValues>, { message: messages[0] });
      const stepIndex = STEPS.findIndex((entry) => (STEP_FIELDS[entry.id] as string[]).includes(field));
      if (stepIndex !== -1 && (firstStep === null || stepIndex < firstStep)) firstStep = stepIndex;
    }
    if (firstStep !== null) setStep(firstStep);
  }

  async function submit(intent: "draft" | "publish") {
    setError(null);
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      const firstErrorField = Object.keys(form.formState.errors)[0];
      const stepIndex = STEPS.findIndex((entry) => firstErrorField && (STEP_FIELDS[entry.id] as string[]).includes(firstErrorField));
      if (stepIndex !== -1) setStep(stepIndex);
      setError("Please fix the highlighted fields before continuing.");
      return;
    }
    if (intent === "publish" && images.length === 0) {
      setStep(4);
      setError("Add at least one photo before publishing.");
      return;
    }
    setSubmitting(intent);
    const values = form.getValues();
    const result = property
      ? await updatePropertyAction(property.id, values, intent === "publish" ? "publish" : "save")
      : await createPropertyAction(values, intent);
    if (!result.ok) {
      setSubmitting(null);
      setError(result.error);
      applyFieldErrors(result.fieldErrors);
      return;
    }
    form.reset(form.getValues());
    toast.success(
      result.data.status === "PENDING_REVIEW"
        ? "Listing submitted for review. We'll notify you once it is approved."
        : result.data.status === "ACTIVE"
          ? "Listing published."
          : "Draft saved.",
    );
    router.push(intent === "publish" ? `/properties/${result.data.slug}` : "/dashboard/properties");
    router.refresh();
  }

  const priceNumber = Number(price);
  const suggested = Number.isFinite(priceNumber) && priceNumber > 0 ? suggestedDeposit(priceNumber, listingType) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Form steps">
        {STEPS.map((entry, index) => {
          const state = index === step ? "current" : index < step ? "done" : "todo";
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => void goTo(index)}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60",
                  state === "current" && "bg-accent text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    state === "done" && "border-primary bg-primary text-primary-foreground",
                    state === "current" && "border-primary text-primary",
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium whitespace-nowrap">{entry.title}</span>
                  <span className="hidden text-xs text-muted-foreground lg:block">{entry.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(property && property.status !== "DRAFT" ? "draft" : "publish");
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-xl font-semibold">{currentStep.title}</h2>
            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
          </div>
          <FormError message={error} />

          {/* ---------------------------------------------------------------- Basics */}
          <div className={cn("flex flex-col gap-5", step !== 0 && "hidden")}>
            <FormField id="title" label="Listing title" error={errors.title?.message} required description="e.g. Sunlit 3-bed craftsman with a private garden">
              <Input maxLength={120} {...fieldA11y("title", errors.title?.message, true)} {...form.register("title")} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Listing type</legend>
                <Controller
                  control={form.control}
                  name="listingType"
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
                      {LISTING_TYPES.map((type) => (
                        <Label key={type} htmlFor={`listing-${type}`} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50">
                          <RadioGroupItem value={type} id={`listing-${type}`} />
                          {LISTING_TYPE_LABELS[type]}
                        </Label>
                      ))}
                    </RadioGroup>
                  )}
                />
              </fieldset>
              <FormField id="propertyType" label="Property type" error={errors.propertyType?.message} required>
                <Controller
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="propertyType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {PROPERTY_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField id="price" label={listingType === "RENT" ? "Monthly rent" : "Asking price"} error={errors.price?.message} required className="sm:col-span-2">
                <Input type="number" inputMode="decimal" min={0} step="1" {...fieldA11y("price", errors.price?.message)} {...form.register("price")} />
              </FormField>
              <FormField id="currency" label="Currency" error={errors.currency?.message}>
                <Controller
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value ?? "USD"} onValueChange={field.onChange}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
            <FormField
              id="depositAmount"
              label="Reservation deposit"
              error={errors.depositAmount?.message}
              required
              description={
                <>
                  Paid by the buyer through Stripe after you accept an offer. It reserves the property; it is not the legal purchase.
                  {suggested ? (
                    <>
                      {" "}
                      Suggested: {formatMoney(suggested, currency)}.{" "}
                      <button type="button" className="text-primary underline" onClick={() => form.setValue("depositAmount", suggested, { shouldDirty: true, shouldValidate: true })}>
                        Use suggestion
                      </button>
                    </>
                  ) : null}
                </>
              }
            >
              <Input type="number" inputMode="decimal" min={50} step="1" {...fieldA11y("depositAmount", errors.depositAmount?.message, true)} {...form.register("depositAmount")} />
            </FormField>
            <FormField id="description" label="Description" error={errors.description?.message} required description="Highlight the layout, light, neighbourhood and anything recently renovated. Minimum 40 characters.">
              <Textarea rows={8} maxLength={6000} {...fieldA11y("description", errors.description?.message, true)} {...form.register("description")} />
            </FormField>
          </div>

          {/* -------------------------------------------------------------- Location */}
          <div className={cn("flex flex-col gap-5", step !== 1 && "hidden")}>
            <FormField id="address" label="Street address" error={errors.address?.message} required>
              <Input autoComplete="street-address" {...fieldA11y("address", errors.address?.message)} {...form.register("address")} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="city" label="City" error={errors.city?.message} required>
                <Input autoComplete="address-level2" {...fieldA11y("city", errors.city?.message)} {...form.register("city")} />
              </FormField>
              <FormField id="state" label="State / region" error={errors.state?.message} required>
                <Input autoComplete="address-level1" {...fieldA11y("state", errors.state?.message)} {...form.register("state")} />
              </FormField>
              <FormField id="postalCode" label="Postal code" error={errors.postalCode?.message} required>
                <Input autoComplete="postal-code" {...fieldA11y("postalCode", errors.postalCode?.message)} {...form.register("postalCode")} />
              </FormField>
              <FormField id="country" label="Country" error={errors.country?.message} required>
                <Input autoComplete="country-name" {...fieldA11y("country", errors.country?.message)} {...form.register("country")} />
              </FormField>
              <FormField id="latitude" label="Latitude (optional)" error={errors.latitude?.message} description="Shown as a map pin. Find coordinates on openstreetmap.org.">
                <Input type="number" step="any" min={-90} max={90} {...fieldA11y("latitude", errors.latitude?.message, true)} {...form.register("latitude")} />
              </FormField>
              <FormField id="longitude" label="Longitude (optional)" error={errors.longitude?.message}>
                <Input type="number" step="any" min={-180} max={180} {...fieldA11y("longitude", errors.longitude?.message)} {...form.register("longitude")} />
              </FormField>
            </div>
          </div>

          {/* --------------------------------------------------------------- Details */}
          <div className={cn("flex flex-col gap-5", step !== 2 && "hidden")}>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField id="bedrooms" label="Bedrooms" error={errors.bedrooms?.message}>
                <Input type="number" min={0} max={50} {...fieldA11y("bedrooms", errors.bedrooms?.message)} {...form.register("bedrooms")} disabled={propertyType === "LAND"} />
              </FormField>
              <FormField id="bathrooms" label="Bathrooms" error={errors.bathrooms?.message}>
                <Input type="number" min={0} max={50} step={0.5} {...fieldA11y("bathrooms", errors.bathrooms?.message)} {...form.register("bathrooms")} disabled={propertyType === "LAND"} />
              </FormField>
              <FormField id="parkingSpaces" label="Parking spaces" error={errors.parkingSpaces?.message}>
                <Input type="number" min={0} max={50} {...fieldA11y("parkingSpaces", errors.parkingSpaces?.message)} {...form.register("parkingSpaces")} />
              </FormField>
              <FormField id="interiorArea" label="Interior area" error={errors.interiorArea?.message}>
                <Input type="number" min={0} {...fieldA11y("interiorArea", errors.interiorArea?.message)} {...form.register("interiorArea")} />
              </FormField>
              <FormField id="lotArea" label="Lot area" error={errors.lotArea?.message}>
                <Input type="number" min={0} {...fieldA11y("lotArea", errors.lotArea?.message)} {...form.register("lotArea")} />
              </FormField>
              <FormField id="areaUnit" label="Area unit" error={errors.areaUnit?.message}>
                <Controller
                  control={form.control}
                  name="areaUnit"
                  render={({ field }) => (
                    <Select value={field.value ?? "SQFT"} onValueChange={field.onChange}>
                      <SelectTrigger id="areaUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit === "SQFT" ? "Square feet" : "Square metres"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="yearBuilt" label="Year built" error={errors.yearBuilt?.message}>
                <Input type="number" min={1600} max={new Date().getFullYear() + 3} {...fieldA11y("yearBuilt", errors.yearBuilt?.message)} {...form.register("yearBuilt")} />
              </FormField>
              <FormField id="furnished" label="Furnished" error={errors.furnished?.message}>
                <Controller
                  control={form.control}
                  name="furnished"
                  render={({ field }) => (
                    <Select value={field.value ?? "UNFURNISHED"} onValueChange={field.onChange}>
                      <SelectTrigger id="furnished">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FURNISHED_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {FURNISHED_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="availableFrom" label="Available from" error={errors.availableFrom?.message}>
                <Input type="date" {...fieldA11y("availableFrom", errors.availableFrom?.message)} {...form.register("availableFrom")} />
              </FormField>
            </div>
          </div>

          {/* ------------------------------------------------------------- Amenities */}
          <div className={cn("flex flex-col gap-5", step !== 3 && "hidden")}>
            {amenities.length === 0 ? <p className="text-sm text-muted-foreground">No amenities are configured yet.</p> : null}
            {Object.entries(
              amenities.reduce<Record<string, AmenityDTO[]>>((groups, amenity) => {
                const key = amenity.category ?? "Other";
                (groups[key] ??= []).push(amenity);
                return groups;
              }, {}),
            ).map(([category, list]) => (
              <fieldset key={category} className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-semibold">{category}</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((amenity) => {
                    const checked = amenityIds.includes(amenity.id);
                    return (
                      <Label key={amenity.id} htmlFor={`amenity-${amenity.id}`} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50">
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            form.setValue("amenityIds", value ? [...amenityIds, amenity.id] : amenityIds.filter((id) => id !== amenity.id), { shouldDirty: true })
                          }
                        />
                        {amenity.name}
                      </Label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {/* ----------------------------------------------------------------- Media */}
          <div className={cn("flex flex-col gap-6", step !== 4 && "hidden")}>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Photos</h3>
              <p className="text-xs text-muted-foreground">The first photo is the cover image. Drag to reorder. At least one photo is required to publish.</p>
              <Controller control={form.control} name="images" render={({ field }) => <ImageUploader images={field.value ?? []} onChange={field.onChange} disabled={Boolean(submitting)} />} />
              {errors.images?.message ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {errors.images.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-1">
              <FormField id="floorPlanUrl" label="Floor plan URL (optional)" error={errors.floorPlanUrl?.message} description="Link to a PDF or image of the floor plan.">
                <Input type="url" placeholder="https://" {...fieldA11y("floorPlanUrl", errors.floorPlanUrl?.message, true)} {...form.register("floorPlanUrl")} />
              </FormField>
              <FormField id="videoUrl" label="Video URL (optional)" error={errors.videoUrl?.message}>
                <Input type="url" placeholder="https://youtube.com/…" {...fieldA11y("videoUrl", errors.videoUrl?.message)} {...form.register("videoUrl")} />
              </FormField>
              <FormField id="virtualTourUrl" label="Virtual tour URL (optional)" error={errors.virtualTourUrl?.message}>
                <Input type="url" placeholder="https://" {...fieldA11y("virtualTourUrl", errors.virtualTourUrl?.message)} {...form.register("virtualTourUrl")} />
              </FormField>
            </div>
          </div>

          {/* ---------------------------------------------------------------- Review */}
          <div className={cn("flex flex-col gap-6", step !== 5 && "hidden")}>
            <ReviewSummary form={form} amenities={amenities} />
            {!emailVerified ? (
              <div role="alert" className="rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
                Verify your email address before publishing. You can still save this listing as a draft.{" "}
                <Link href="/settings/account" className="font-medium underline">
                  Account settings
                </Link>
              </div>
            ) : null}
            {property && property.status !== "DRAFT" ? (
              <p className="text-sm text-muted-foreground">
                Current status: <strong>{PROPERTY_STATUS_LABELS[property.status]}</strong>. Saving keeps the listing live; only drafts, rejected and archived listings need to be published again.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Published listings are reviewed by our team before they appear in search. You will be notified when it goes live.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => void goTo(step - 1)} disabled={step === 0 || Boolean(submitting)}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {property ? (
              <Button asChild type="button" variant="ghost">
                <Link href={`/properties/${property.slug}`}>
                  <Eye /> Preview
                </Link>
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <>
                <Button type="button" variant="secondary" onClick={() => void submit("draft")} loading={submitting === "draft"} disabled={Boolean(submitting)}>
                  <Save /> {property && property.status !== "DRAFT" ? "Save changes" : "Save draft"}
                </Button>
                <Button type="button" onClick={() => void goTo(step + 1)} disabled={Boolean(submitting)}>
                  Next <ArrowRight />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => void submit("draft")} loading={submitting === "draft"} disabled={Boolean(submitting)}>
                  <Save /> {property && property.status !== "DRAFT" ? "Save changes" : "Save draft"}
                </Button>
                {!property || ["DRAFT", "REJECTED", "ARCHIVED"].includes(property.status) ? (
                  <Button type="button" onClick={() => void submit("publish")} loading={submitting === "publish"} disabled={Boolean(submitting) || !emailVerified}>
                    <Send /> {isEdit ? "Publish listing" : "Submit for review"}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function ReviewSummary({ form, amenities }: { form: ReturnType<typeof useForm<PropertyFormValues, unknown, PropertyInput>>; amenities: AmenityDTO[] }) {
  const values = useWatch({ control: form.control });
  const selected = amenities.filter((amenity) => values.amenityIds?.includes(amenity.id));
  const rows: [string, React.ReactNode][] = [
    ["Title", values.title || "—"],
    ["Type", `${PROPERTY_TYPE_LABELS[values.propertyType ?? "HOUSE"]} · ${LISTING_TYPE_LABELS[values.listingType ?? "SALE"]}`],
    ["Price", values.price ? formatMoney(Number(values.price), values.currency ?? "USD") : "—"],
    ["Deposit", values.depositAmount ? formatMoney(Number(values.depositAmount), values.currency ?? "USD") : "—"],
    ["Address", [values.address, values.city, values.state, values.postalCode, values.country].filter(Boolean).join(", ") || "—"],
    ["Rooms", `${values.bedrooms ?? 0} bed · ${values.bathrooms ?? 0} bath · ${values.parkingSpaces ?? 0} parking`],
    ["Area", values.interiorArea ? `${values.interiorArea} ${values.areaUnit === "SQM" ? "m²" : "sq ft"}` : "—"],
    ["Amenities", selected.length ? selected.map((amenity) => amenity.name).join(", ") : "None selected"],
    ["Photos", `${values.images?.length ?? 0} uploaded`],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/30 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
