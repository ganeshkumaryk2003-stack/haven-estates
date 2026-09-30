## A. Signup form — `/signup`

Rules: `src/validations/auth.ts` → `signupSchema`

### TC-01 — Name too short
- **Steps:**  name `A`, valid emailEnter, valid password, tick terms, submit.
- **Expected:** Inline error under Name: "Enter your full name". Form not submitted.
- **Rule:** `name: min(2)`

### TC-02 — Name over 80 characters
- **Steps:** Paste an 81-character name, fill the rest validly, submit.
- **Expected:** Inline error under Name (too long). Not submitted.
- **Rule:** `name: max(80)`

### TC-03 — Name is only whitespace
- **Steps:** Enter `     ` (five spaces) as the name, submit.
- **Expected:** "Enter your full name". Whitespace is trimmed before the length check.
- **Rule:** `.trim().min(2)`

### TC-04 — Invalid email formats
- **Steps:** Try each in turn: `notanemail`, `missing@`, `@nodomain.com`, `two@@at.com`, `spaces in@mail.com`.
- **Expected:** Every one shows "Enter a valid email address". None submits.
- **Rule:** `emailSchema` → `z.email()`

### TC-05 — Email is normalised
- **Steps:** Sign up with `  NewPerson@Example.COM  ` (leading/trailing spaces, mixed case).
- **Expected:** Signup succeeds. Log out, then log in with `newperson@example.com` in all lowercase.
- **Rule:** `.trim().toLowerCase()` — the stored email is lowercase, so both forms log in.

### TC-06 — Email over 254 characters
- **Steps:** Paste a 250-char local part + `@example.com`.
- **Expected:** Rejected as invalid.
- **Rule:** `max(254)`

### TC-07 — Password too short
- **Steps:** Password `Ab1`, confirm `Ab1`.
- **Expected:** "Use at least 8 characters".
- **Rule:** `passwordSchema: min(8)`

### TC-08 — Password without uppercase
- **Steps:** Password `password123`.
- **Expected:** "Include upper and lower case letters".
- **Rule:** `refine(/[a-z]/ && /[A-Z]/)`

### TC-09 — Password without lowercase
- **Steps:** Password `PASSWORD123`.
- **Expected:** "Include upper and lower case letters".
- **Rule:** same refine as TC-08

### TC-10 — Password without a digit
- **Steps:** Password `PasswordOnly`.
- **Expected:** "Include at least one number".
- **Rule:** `refine(/\d/)`

### TC-11 — Passwords do not match
- **Steps:** Password `Password123!`, confirm `Password123?`.
- **Expected:** "Passwords do not match" under the **Confirm password** field specifically.
- **Rule:** `.refine(password === confirmPassword, { path: ["confirmPassword"] })`

### TC-12 — Terms not accepted
- **Steps:** Fill everything validly, leave the terms checkbox unticked, submit.
- **Expected:** "You must accept the terms to continue".
- **Rule:** `acceptTerms: refine(value => value)`

### TC-13 — Duplicate email
- **Steps:** Sign up with `meera.iyer@doorkey.local` (already seeded).
- **Expected:** Signup fails with an error saying the email is already registered. No second account is created.
- **Rule:** `User.email @unique` in `prisma/schema.prisma`

### TC-14 — Signup rate limit
- **Steps:** Submit the signup form 6 times within an hour (any values; failures count too if they reach the server).
- **Expected:** The 6th attempt is rejected with a "Too many requests" message.
- **Rule:** `RATE_LIMITS.signup = 5 per 60 minutes` in `src/lib/rate-limit.ts`

### TC-15 — Happy path
- **Steps:** Name `Test Buyer`, unique email, `Password123!` twice, role Buyer, terms ticked.
- **Expected:** Account created, you are signed in immediately, redirected onward. A verification email is logged to the server terminal (or Mailpit at http://localhost:8025).
- **Rule:** `signupAction` calls `signIn` right after creation

---

## B. Login form — `/login`

Rules: `loginSchema`, `src/lib/auth/index.ts`

### TC-16 — Empty password
- **Steps:** Enter a valid email, leave password blank, submit.
- **Expected:** "Enter your password" or the generic "Enter your email and password."
- **Rule:** `password: min(1)`

### TC-17 — Wrong password
- **Steps:** `meera.iyer@doorkey.local` / `WrongPass1`.
- **Expected:** "Incorrect email or password, or this account has been suspended." Same message as TC-18 and TC-19.
- **Rule:** `loginAction` catches `AuthError` → one generic message

### TC-18 — Non-existent email
- **Steps:** `nobody@doorkey.local` / `Password123!`.
- **Expected:** **Identical** message to TC-17. The app must not reveal whether the email exists.
- **Rule:** deliberate — prevents account enumeration

### TC-19 — Suspended account
- **Steps:** `suspended@doorkey.local` / `Password123!` (correct credentials).
- **Expected:** Login rejected with the same generic message. You stay logged out.
- **Rule:** Credentials provider returns `null` when `status === "SUSPENDED"`

### TC-20 — Case-insensitive email login
- **Steps:** `MEERA.IYER@DOORKEY.LOCAL` / `Password123!`.
- **Expected:** Login succeeds.
- **Rule:** `emailSchema` lowercases before lookup

### TC-21 — Login rate limit
- **Steps:** Enter wrong password for the same email 11 times within 15 minutes.
- **Expected:** 11th attempt blocked with "Too many requests", even if the password is now correct.
- **Rule:** `RATE_LIMITS.login = 10 per 15 minutes`, keyed on email + IP

### TC-22 — Redirect after login
- **Steps:** While logged out, visit http://localhost:3000/dashboard directly.
- **Expected:** Redirected to `/login?callbackUrl=/dashboard`. After logging in, you land on `/dashboard`, not the home page.
- **Rule:** `src/proxy.ts` `PROTECTED_PREFIXES`

### TC-23 — Logged-in user visiting /login
- **Steps:** While logged in, navigate to `/login`.
- **Expected:** Redirected away (to dashboard). You cannot see the login form while signed in.
- **Rule:** `src/proxy.ts` `AUTH_PAGES` redirect

---

## C. Forgot / reset password — `/forgot-password`, `/reset-password`

### TC-24 — Forgot password does not leak existence
- **Steps:** Submit `nobody@doorkey.local`, then submit `meera.iyer@doorkey.local`.
- **Expected:** **Same** success message both times ("If an account exists, we sent a link…" or similar). No indication of which one is real.
- **Rule:** `requestPasswordReset` silently returns when user not found

### TC-25 — Reset page with missing or short token
- **Steps:** Visit `/reset-password` (no token), then `/reset-password?token=abc`.
- **Expected:** Both show an "invalid or expired link" card with a "Request a new link" button. No password form.
- **Rule:** page checks `!token || token.length < 20`

### TC-26 — Reset with a tampered token
- **Steps:** Request a reset for Maria, copy the link from the server log, change 3 characters in the token, open it, submit a new valid password.
- **Expected:** Rejected — "invalid or expired" style error. Password unchanged; old password still logs in.
- **Rule:** `resetPasswordWithToken` looks up the exact token hash

### TC-27 — Reset password weak
- **Steps:** Open a valid reset link, enter `weak` twice.
- **Expected:** Same password-strength errors as signup (TC-07 to TC-10).
- **Rule:** `resetPasswordSchema` reuses `passwordSchema`

### TC-28 — Reset token single-use
- **Steps:** Use a valid reset link successfully. Then open the **same** link again.
- **Expected:** Second use is rejected as invalid/expired.
- **Rule:** `consumeAuthToken` deletes the token on use

---

## D. Property listing form — `/properties/new`

Rules: `src/validations/property.ts` → `propertySchema`. Log in as `meera.iyer@doorkey.local`.
The form is multi-step; validation fires when you press Next or Publish.

### TC-29 — Title too short
- **Steps:** Title `Nice` (4 chars). Press Next.
- **Expected:** "Title should be at least 8 characters".
- **Rule:** `title: min(8)`

### TC-30 — Title too long
- **Steps:** Paste a 121-character title.
- **Expected:** "Keep the title under 120 characters".
- **Rule:** `title: max(120)`

### TC-31 — Description too short
- **Steps:** Description `Great house.` (12 chars).
- **Expected:** "Describe the property in at least 40 characters".
- **Rule:** `description: min(40)`

### TC-32 — Price zero
- **Steps:** Price `0`.
- **Expected:** "Enter a price".
- **Rule:** `price: positive()`

### TC-33 — Price negative
- **Steps:** Price `-500000`.
- **Expected:** "Enter a price". Negative is not positive.
- **Rule:** `price: positive()`

### TC-34 — Price non-numeric
- **Steps:** Type `abc` into Price (if the browser allows), or paste it.
- **Expected:** Rejected. The field is `type=number` so the browser may block letters entirely — either outcome is a pass.
- **Rule:** `z.coerce.number()` → NaN fails

### TC-35 — Price absurdly large
- **Steps:** Price `9999999999999` (13 digits).
- **Expected:** "Price is too large".
- **Rule:** `price: max(999_999_999_999)`

### TC-36 — Deposit below minimum
- **Steps:** Deposit `10`.
- **Expected:** "Deposit must be at least 50".
- **Rule:** `depositAmount: min(50)`

### TC-37 — Deposit exceeds price
- **Steps:** Price `100000`, Deposit `150000`.
- **Expected:** "The deposit cannot exceed the price" under the Deposit field.
- **Rule:** `superRefine: depositAmount > price`

### TC-38 — Currency dropdown is INR only
- **Steps:** Open the Currency dropdown on step 1.
- **Expected:** Exactly one option, `INR`. It is pre-selected.
- **Rule:** `CURRENCIES = ["INR"]`, `DEFAULT_CURRENCY = "INR"`

### TC-39 — Suggested deposit updates live
- **Steps:** Enter price `500000` for a Sale listing.
- **Expected:** A "Suggested: ₹5,000" hint appears under Deposit (1% of price). Clicking "Use suggestion" fills the field. Formatting uses ₹ and Indian grouping.
- **Rule:** `suggestedDeposit` in `src/lib/money.ts`; `formatMoney` with `en-IN`

### TC-40 — Latitude out of range
- **Steps:** Latitude `95`, Longitude `10`.
- **Expected:** Error on Latitude (must be −90 to 90).
- **Rule:** `latitude: min(-90).max(90)`

### TC-41 — Longitude out of range
- **Steps:** Latitude `10`, Longitude `-200`.
- **Expected:** Error on Longitude (must be −180 to 180).
- **Rule:** `longitude: min(-180).max(180)`

### TC-42 — Only one coordinate provided
- **Steps:** Latitude `12.97`, Longitude left empty.
- **Expected:** "Provide both latitude and longitude, or leave both empty" under Longitude.
- **Rule:** `superRefine: (lat === null) !== (lng === null)`

### TC-43 — Bathrooms not a half-step
- **Steps:** Bathrooms `2.3`.
- **Expected:** "Use whole or half bathrooms (e.g. 2.5)".
- **Rule:** `bathrooms: multipleOf(0.5)`

### TC-44 — Bathrooms valid half
- **Steps:** Bathrooms `2.5`.
- **Expected:** Accepted, no error.
- **Rule:** same

### TC-45 — Bedrooms decimal
- **Steps:** Bedrooms `3.5`.
- **Expected:** Rejected — must be a whole number.
- **Rule:** `bedrooms: int()`

### TC-46 — Bedrooms over 50
- **Steps:** Bedrooms `51`.
- **Expected:** Rejected.
- **Rule:** `bedrooms: max(50)`

### TC-47 — Year built too old
- **Steps:** Year built `1500`.
- **Expected:** Rejected.
- **Rule:** `yearBuilt: min(1600)`

### TC-48 — Year built too far in the future
- **Steps:** Year built = current year + 5.
- **Expected:** Rejected. Current year + 3 is the max (allows under-construction).
- **Rule:** `yearBuilt: max(currentYear + 3)`

### TC-49 — Interior area zero
- **Steps:** Interior area `0`.
- **Expected:** Rejected (minimum 1). Leaving it **empty** is fine — it is optional.
- **Rule:** `interiorArea: optionalInt(1, …)`

### TC-50 — Video URL without protocol
- **Steps:** Video URL `youtube.com/watch?v=abc`.
- **Expected:** "Enter a full URL starting with http:// or https://".
- **Rule:** `optionalUrl()` regex `^https?:\/\/`

### TC-51 — Video URL with javascript: scheme
- **Steps:** Video URL `javascript:alert(1)`.
- **Expected:** Rejected by the same rule as TC-50. Must never be saved.
- **Rule:** same regex — only http/https pass

### TC-52 — Available-from invalid date
- **Steps:** For a Rent listing, type `not-a-date` into Available from (if the input allows free text).
- **Expected:** "Enter a valid date".
- **Rule:** `availableFrom: refine(!isNaN(Date.parse))`

### TC-53 — Publish without photos
- **Steps:** Fill every step validly, upload **no** photos, press Publish.
- **Expected:** Jumps to the Photos step with "Add at least one photo before publishing." Saving as **Draft** with no photos is allowed.
- **Rule:** `createProperty` throws when `intent === "publish" && images.length === 0`

### TC-54 — Publish as unverified user
- **Steps:** Log in as `new.user@doorkey.local`. Fill the form validly with one photo, press Publish.
- **Expected:** Blocked — a message asks you to verify your email first. Save as Draft still works.
- **Rule:** `createPropertyAction` uses `requireVerifiedUser()` only for `intent === "publish"`

### TC-55 — Happy path, status goes to Pending review
- **Steps:** As Maria, complete the form with one photo, Publish.
- **Expected:** Toast: "Listing submitted for review. We'll notify you once it is approved." Listing appears in `/dashboard/properties` with a **Pending review** badge. It is **not** visible at `/properties` while logged out.
- **Rule:** non-admin publish → `PENDING_REVIEW`; `BROWSABLE_STATUSES` excludes it

### TC-56 — Admin publish skips review
- **Steps:** Log in as `admin@doorkey.local`, create a listing with one photo, Publish.
- **Expected:** Status is **Active** immediately, not Pending review.
- **Rule:** `actor.role === "ADMIN" ? "ACTIVE" : "PENDING_REVIEW"`

### TC-57 — Unsaved changes warning
- **Steps:** Type into any field, then try to close the tab or navigate away.
- **Expected:** Browser "Leave site?" dialog appears.
- **Rule:** `beforeunload` handler when `isDirty`

---

## E. Photo upload — inside the listing form

Rules: `src/app/api/uploads/route.ts`

### TC-58 — Oversized image
- **Steps:** Upload an image larger than 8 MB.
- **Expected:** Error "Files must be smaller than 8 MB." Not uploaded.
- **Rule:** `MAX_IMAGE_SIZE_BYTES = 8 MB` → HTTP 413

### TC-59 — Wrong file type by extension
- **Steps:** Upload a `.txt` or `.zip` file.
- **Expected:** "Only JPEG, PNG, WebP or AVIF images are allowed."
- **Rule:** magic-byte sniff fails → HTTP 415

### TC-60 — Fake extension
- **Steps:** Rename a `.txt` file to `photo.jpg` and upload it.
- **Expected:** **Still rejected** with the same 415 message. The app checks the file's bytes, not its name.
- **Rule:** `sniffImageType(buffer)` reads magic bytes

### TC-61 — PDF as a listing photo
- **Steps:** Upload a real PDF as a property photo.
- **Expected:** Rejected. PDFs are only accepted for floor plans and message attachments.
- **Rule:** PDF branch requires `purpose === "attachment" || "floorplan"`

### TC-62 — Valid image is re-encoded
- **Steps:** Upload a valid 4000×3000 PNG.
- **Expected:** Upload succeeds. The stored file is WebP and the width is at most 2000 px (check the image URL in DevTools Network tab).
- **Rule:** `processImage(buffer, 2000)`

### TC-63 — Photo limit
- **Steps:** Upload 21 photos.
- **Expected:** The 21st is blocked: "You can add up to 20 photos".
- **Rule:** `MAX_PROPERTY_IMAGES = 20`

### TC-64 — Upload rate limit
- **Steps:** Upload 41 small images within 10 minutes.
- **Expected:** 41st returns "Too many uploads. Try again in a few minutes." (HTTP 429 with a `Retry-After` header).
- **Rule:** `RATE_LIMITS.upload = 40 per 10 minutes`

---

## F. Enquiries, offers, messages — on a property page

Rules: `src/validations/engagement.ts`, `src/server/services/*`

### TC-65 — Enquiry subject too short
- **Steps:** As Priya, open an active listing owned by Maria, click Enquire. Subject `Hi`, message 20 chars.
- **Expected:** "Add a short subject".
- **Rule:** `subject: min(3)`

### TC-66 — Enquiry message too short
- **Steps:** Subject `Viewing?`, message `Hello`.
- **Expected:** "Tell the seller a little more (10+ characters)".
- **Rule:** `message: min(10)`

### TC-67 — Enquiry phone invalid
- **Steps:** Phone `abc` with otherwise valid fields.
- **Expected:** "Enter a valid phone number". Phone `+91 98765 43210` is accepted.
- **Rule:** `optionalPhone()` regex

### TC-68 — Enquire on your own listing
- **Steps:** As Maria, open one of her own active listings.
- **Expected:** The Enquire / Make offer buttons are hidden or disabled for the owner. If forced via a second tab, the server returns "You cannot enquire about your own listing."
- **Rule:** `createEnquiry: property.ownerId === user.id → ForbiddenError`

### TC-69 — Offer amount zero or negative
- **Steps:** As Priya, Make an offer with amount `0`, then `-1000`.
- **Expected:** "Enter your offer amount" both times.
- **Rule:** `amount: positive()`

### TC-70 — Offer expiry in the past
- **Steps:** Set the offer expiry date to yesterday.
- **Expected:** "Choose an expiry date in the future".
- **Rule:** `expiresAt: refine(date > now)`

### TC-71 — Unverified user cannot enquire or offer
- **Steps:** As `new.user@doorkey.local`, try to enquire and to make an offer.
- **Expected:** Both blocked with a verify-your-email message.
- **Rule:** `createEnquiryAction` / `createOfferAction` use `requireVerifiedUser()`

### TC-72 — Empty message with no attachment
- **Steps:** Open any conversation, press Send with an empty body.
- **Expected:** "Write a message or attach a file". Nothing is sent.
- **Rule:** `messageSchema.refine(body.length > 0 || attachments.length > 0)`

---

## G. Authorization and access control

### TC-73 — Pending listing hidden from public
- **Steps:** After TC-55, copy the pending listing's URL. Log out and open it.
- **Expected:** 404 "not found" page. Log back in as Maria — the page loads with a "pending review, only visible to you" banner.
- **Rule:** `canViewProperty` — non-public statuses need owner or admin

### TC-74 — Edit someone else's listing
- **Steps:** As Priya, take the URL of Maria's listing and append `/edit`.
- **Expected:** Redirected to `/unauthorized`.
- **Rule:** edit page: `property.ownerId !== user.id && role !== "ADMIN" → redirect("/unauthorized")`

### TC-75 — Non-admin visits /admin
- **Steps:** As Priya, visit `/admin`.
- **Expected:** Redirected to `/unauthorized`. Not a 404, not a blank page.
- **Rule:** `src/proxy.ts` `ADMIN_PREFIX` check; `admin/layout.tsx` re-checks

### TC-76 — Logged-out visits /admin
- **Steps:** Log out, visit `/admin`.
- **Expected:** Redirected to `/login?callbackUrl=/admin`.
- **Rule:** `admin/layout.tsx`

---

## H. Admin moderation — `/admin/properties`

Log in as `admin@doorkey.local`.

### TC-77 — Pending queue shows the badge
- **Steps:** After TC-55 left a listing pending, open `/admin`.
- **Expected:** The **Listings** sidebar item shows a red count badge (≥ 1). The "Pending review" stat card links to `/admin/properties?status=PENDING_REVIEW`.
- **Rule:** `admin/layout.tsx` counts `PENDING_REVIEW`

### TC-78 — Approve a listing
- **Steps:** In the pending queue, click Approve on Maria's listing.
- **Expected:** Toast "Listing approved". Status becomes Active. Log in as Maria → a **Listing approved** notification exists at `/dashboard/notifications`. The listing is now visible at `/properties` while logged out.
- **Rule:** `moderateProperty("approve")` → `ACTIVE`, `notify(LISTING_APPROVED)`

### TC-79 — Reject requires a reason and notifies owner
- **Steps:** Publish another listing as Maria. As admin, click Reject, enter reason `Photos are too dark`, confirm.
- **Expected:** Status becomes Rejected. As Maria, a **Listing needs changes** notification includes the text "Photos are too dark", and the listing's page shows the rejection reason.
- **Rule:** `moderateProperty("reject")` stores `rejectionReason`, `notify(LISTING_REJECTED)`

### TC-80 — Resubmit after rejection clears the reason
- **Steps:** As Maria, edit the rejected listing and Publish again.
- **Expected:** Status returns to Pending review. The old rejection reason is no longer shown.
- **Rule:** `updateProperty` sets `rejectionReason: null` when going to `PENDING_REVIEW`

### TC-81 — Admin cannot suspend themselves
- **Steps:** In `/admin/users`, find `admin@doorkey.local` and try to Suspend.
- **Expected:** Rejected — "You cannot suspend your own account."
- **Rule:** `setUserStatus: adminId === userId → ConflictError`

### TC-82 — Suspending a seller hides their listings
- **Steps:** As admin, suspend `rohan.mehta@doorkey.local`. Log out, browse `/properties`.
- **Expected:** All of Rohan's previously Active listings are gone from public search. In `/admin/properties` they show as **Archived**. James can no longer log in (TC-19 behaviour).
- **Rule:** `setUserStatus("SUSPENDED")` archives `ACTIVE` and `PENDING_REVIEW` listings, deletes sessions

---

## I. Currency and formatting (post-INR migration)

### TC-83 — All prices use the rupee symbol
- **Steps:** Browse `/`, `/properties`, a listing detail page, `/dashboard/properties`, `/admin/transactions`.
- **Expected:** Every price shows `₹`, none show `$`. Use browser Find (Ctrl/Cmd-F) for `$` — zero matches in visible text.
- **Rule:** `DEFAULT_CURRENCY = "INR"`, DB rows back-filled by migration `20260928120000_currency_inr`

### TC-84 — Indian digit grouping
- **Steps:** Find a listing priced at 749000 (the Austin craftsman if seeded).
- **Expected:** Displays as `₹7,49,000` — **not** `₹749,000` and not `₹7,490,00`.
- **Rule:** `DEFAULT_LOCALE = "en-IN"` in `formatMoney`

### TC-85 — Rental suffix
- **Steps:** Find any Rent listing.
- **Expected:** Price ends in `/mo`, e.g. `₹3,450/mo`.
- **Rule:** `formatPrice` appends `/mo` for `RENT`

### TC-86 — Filter chips use the formatter
- **Steps:** On `/properties`, set Min price `500000`, Max price `2000000`, apply.
- **Expected:** Active-filter chips read `Min ₹5,00,000` and `Max ₹20,00,000` with Indian grouping.
- **Rule:** `property-filters.tsx` chips call `formatMoney()` (previously hardcoded `$`)

---

## Results sheet

| ID | Area | Result | Notes |
|---|---|---|---|
| TC-01 | Signup | | |
| TC-02 | Signup | | |
| TC-03 | Signup | | |
| TC-04 | Signup | | |
| TC-05 | Signup | | |
| TC-06 | Signup | | |
| TC-07 | Signup | | |
| TC-08 | Signup | | |
| TC-09 | Signup | | |
| TC-10 | Signup | | |
| TC-11 | Signup | | |
| TC-12 | Signup | | |
| TC-13 | Signup | | |
| TC-14 | Signup | | |
| TC-15 | Signup | | |
| TC-16 | Login | | |
| TC-17 | Login | | |
| TC-18 | Login | | |
| TC-19 | Login | | |
| TC-20 | Login | | |
| TC-21 | Login | | |
| TC-22 | Login | | |
| TC-23 | Login | | |
| TC-24 | Reset | | |
| TC-25 | Reset | | |
| TC-26 | Reset | | |
| TC-27 | Reset | | |
| TC-28 | Reset | | |
| TC-29 | Listing | | |
| TC-30 | Listing | | |
| TC-31 | Listing | | |
| TC-32 | Listing | | |
| TC-33 | Listing | | |
| TC-34 | Listing | | |
| TC-35 | Listing | | |
| TC-36 | Listing | | |
| TC-37 | Listing | | |
| TC-38 | Listing | | |
| TC-39 | Listing | | |
| TC-40 | Listing | | |
| TC-41 | Listing | | |
| TC-42 | Listing | | |
| TC-43 | Listing | | |
| TC-44 | Listing | | |
| TC-45 | Listing | | |
| TC-46 | Listing | | |
| TC-47 | Listing | | |
| TC-48 | Listing | | |
| TC-49 | Listing | | |
| TC-50 | Listing | | |
| TC-51 | Listing | | |
| TC-52 | Listing | | |
| TC-53 | Listing | | |
| TC-54 | Listing | | |
| TC-55 | Listing | | |
| TC-56 | Listing | | |
| TC-57 | Listing | | |
| TC-58 | Upload | | |
| TC-59 | Upload | | |
| TC-60 | Upload | | |
| TC-61 | Upload | | |
| TC-62 | Upload | | |
| TC-63 | Upload | | |
| TC-64 | Upload | | |
| TC-65 | Engagement | | |
| TC-66 | Engagement | | |
| TC-67 | Engagement | | |
| TC-68 | Engagement | | |
| TC-69 | Engagement | | |
| TC-70 | Engagement | | |
| TC-71 | Engagement | | |
| TC-72 | Engagement | | |
| TC-73 | Access | | |
| TC-74 | Access | | |
| TC-75 | Access | | |
| TC-76 | Access | | |
| TC-77 | Admin | | |
| TC-78 | Admin | | |
| TC-79 | Admin | | |
| TC-80 | Admin | | |
| TC-81 | Admin | | |
| TC-82 | Admin | | |
| TC-83 | Currency | | |
| TC-84 | Currency | | |
| TC-85 | Currency | | |
| TC-86 | Currency | | |

---

## Already covered by automated tests

The following are exercised by `npm test` (46 Vitest tests) and do not need manual repetition
unless you are checking the UI presentation specifically:

- Property schema accepts valid input and rejects each bad field (`tests/unit/validations/property.test.ts`)
- Auth schemas: email normalisation, password rules, mismatch (`tests/unit/validations/auth.test.ts`)
- Offer state machine: pending → countered → accepted, competing offers expire (`tests/unit/services/engagement.test.ts`)
- Stripe webhook idempotency (`tests/unit/services/stripe-webhook.test.ts`)
- Storage key ownership checks (`tests/unit/lib/storage-keys.test.ts`)
- Property card renders `₹7,49,000` and `₹3,450/mo` (`tests/unit/components/property-card.test.tsx`)

Run them with `npm test` before a manual pass — if they fail, fix that first.
