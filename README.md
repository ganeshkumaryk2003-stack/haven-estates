# Doorkey Realty

An end-to-end real estate marketplace for the Indian market: browse and search flats, houses and plots (residential, commercial, semi-commercial and industrial), save favorites, enquire, message sellers in real time, make and negotiate offers, and reserve a property with a Stripe token deposit. Sellers and agents manage listings from a dashboard; administrators moderate listings, users, reports and transactions. Prices are in INR (lakh/crore grouping), addresses use PIN codes and the demo data covers Bengaluru, Pune, Hyderabad, Chennai, Kochi and Mumbai.

Built with Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS 4, Prisma 7 + PostgreSQL, Auth.js v5, Zod 4, React Hook Form, Stripe Checkout, Vitest and Playwright.

> Reservations are **deposits held while the legal sale/lease completes offline**. The app never claims to transfer legal ownership, and card details never touch the server (Stripe Checkout handles them).

---

## Contents

1. [Quick start](#quick-start)
2. [Demo accounts](#demo-accounts)
3. [Feature tour](#feature-tour)
4. [Architecture](#architecture)
5. [Project structure](#project-structure)
6. [Environment variables](#environment-variables)
7. [Stripe (test mode) and webhooks](#stripe-test-mode-and-webhooks)
8. [Email and file storage](#email-and-file-storage)
9. [Scripts](#scripts)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Security notes](#security-notes)
13. [Assumptions and trade-offs](#assumptions-and-trade-offs)

---

## Quick start

Prerequisites: Node.js 20.19+ (24 recommended) and either Docker or a local PostgreSQL 15+.

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Configure environment
cp .env.example .env
#    then set AUTH_SECRET, e.g.  openssl rand -base64 32

# 3. Start PostgreSQL (+ Mailpit inbox for local emails)
docker compose up -d
#    …or without Docker (macOS/Homebrew):
#    brew install postgresql@17 && brew services start postgresql@17
#    psql -d postgres -c "CREATE ROLE postgres LOGIN SUPERUSER PASSWORD 'postgres'" ; createdb -O postgres haven ; createdb -O postgres haven_test
#    and set EMAIL_DRIVER="console" in .env (verification links are printed to the terminal)

# 4. Create the schema and seed demo data (30 listings with generated photos, users, offers, messages…)
npx prisma migrate dev
npm run db:seed

# 5. Run
npm run dev
```

Open http://localhost:3000. Emails (verification, password reset, notifications) land in Mailpit at http://localhost:8025 when `EMAIL_DRIVER=mailpit`, or are printed to the terminal with `EMAIL_DRIVER=console`.

## Demo accounts

Password for every seeded account: **`Password123!`** (configurable via `SEED_PASSWORD`).

| Role | Email | Notes |
| --- | --- | --- |
| Administrator | `admin@doorkey.local` | Admin area at `/admin` |
| Seller | `meera.iyer@doorkey.local` | Bengaluru listings incl. an industrial plot, has a pending offer and a rejected plot listing |
| Agent | `rohan.mehta@doorkey.local` | Pune listings, one under offer, one sold, one draft, one industrial site for rent |
| Seller | `kavya.reddy@doorkey.local` | Hyderabad rentals and a semi-commercial plot |
| Agent | `arjun.nair@doorkey.local` | Chennai / Kochi / Mumbai, one reserved (deposit paid), a commercial plot |
| Buyer | `priya.menon@doorkey.local` | Pending offer, active conversation with Meera |
| Buyer | `vikram.singh@doorkey.local` | Countered offer, completed purchase |
| Buyer | `sneha.kulkarni@doorkey.local` | Paid reservation deposit |
| Buyer | `karthik.raman@doorkey.local` | Accepted offer waiting for deposit |
| Buyer | `new.user@doorkey.local` | Email **not** verified (see the verification gate) |
| Seller | `suspended@doorkey.local` | Suspended account (cannot sign in) |

## Feature tour

- **Guests** browse `/properties` (keyword, location, sale/rent, type, budget, BHK/baths, built-up area, amenities, furnished, listed-within, sort, pagination, grid/list/map views, shareable URL filters) and view details with a gallery/lightbox, key facts, amenities, map, structured data and similar properties. Property types: flat/apartment, independent house/villa, row house, residential / commercial / semi-commercial / industrial plot, commercial space, other. The home page hero offers Buy / Rent (search) and Sell (jump straight into listing a property).
- **Sign up / log in / sign out**, email verification, forgot/reset password, optional Google OAuth, onboarding, profile editing with avatar upload, notification preferences, password change, account deletion (blocked while a paid deposit is outstanding).
- **Buyers** save favorites, enquire, message sellers (real-time via SSE with attachments, read receipts and typing indicators), make offers, accept/decline counteroffers, withdraw, pay reservation deposits through Stripe Checkout and track everything in the dashboard.
- **Sellers/agents** create listings with a six-step form (drafts, image upload with drag-to-reorder and alt text, floor plan/video/tour links), publish for review, unpublish, archive, restore, mark sold/rented, delete (business rules enforced), see views/saves/enquiries/offers, accept/counter/decline offers.
- **Connections**: every enquiry, message or offer creates a buyer↔seller connection with related properties, last interaction, quick link to the conversation, archive and block.
- **Notifications**: in-app bell with live updates + full page, email copies gated by per-user preferences.
- **Administrators**: platform stats, listing moderation queue (approve/reject/feature/remove/reactivate), user management (roles, suspend/reactivate), transactions (complete/cancel reservations), reported listings, and a full audit log.

## Architecture

```
Browser ──(RSC / server actions / route handlers)──► Next.js 16 (Node runtime)
                                                     │
                       ┌─────────────────────────────┼──────────────────────────┐
                       ▼                             ▼                          ▼
                 Prisma 7 + pg                Storage driver              Email driver
                 (PostgreSQL)              local disk | S3-compatible   console | Mailpit | Resend
                       │
              Stripe Checkout ◄── /api/webhooks/stripe (signature-verified, idempotent by event id)
              SSE /api/realtime ◄── in-process event bus (messages, read receipts, typing, notifications)
```

- **Rendering**: server components by default; client components only where interactivity is needed (forms, dialogs, messenger, map, uploader).
- **Mutations**: server actions in `src/server/actions/*` validate input with Zod, check the session, enforce rate limits and delegate to services. Multipart uploads and the Stripe webhook use route handlers (raw body / large payloads).
- **Domain logic**: `src/server/services/*` own the business rules (status machines, authorization, transactions, notifications, audit).
- **Auth**: Auth.js v5 with JWT sessions, Credentials + optional Google provider, Prisma adapter. `src/proxy.ts` redirects unauthenticated users early; every page/action still authorizes server-side. Suspensions/role changes propagate within 5 minutes via token refresh.
- **Realtime**: Server-Sent Events from `/api/realtime`; publishers use an in-process `EventEmitter` (`src/lib/realtime.ts`). Swap it for Redis pub/sub or Pusher/Ably for multi-instance deployments; the publish/subscribe API is the only touch point.
- **Money**: `Decimal(14,2)` columns, converted to integer minor units only when creating Stripe sessions.

## Project structure

```
prisma/
  schema.prisma          data model (22 models, enums, indexes, constraints)
  migrations/            SQL migrations
  seed.ts, seed-data.ts, seed-images.ts   demo data + generated placeholder photos
src/
  app/                   routes (App Router)
    (auth)/              login, signup, forgot/reset password, verify-email
    (site)/              everything with the main header/footer
      properties/        browse, [slug], new, [slug]/edit
      dashboard/         overview, properties, enquiries, offers, reservations, connections, notifications
      messages/          inbox, [conversationId]
      admin/             overview, properties, users, transactions, reports, audit
      settings/, profile/[userId], favorites/, onboarding/, unauthorized/
    api/                 auth, uploads, files/[...key], realtime (SSE), webhooks/stripe
    sitemap.ts, robots.ts
  components/            ui/ (shadcn-style primitives), layout/, properties/, messaging/, dashboard/, admin/, auth/, settings/, home/, map/
  lib/                   env validation, prisma client, auth config, storage & email drivers, rate limit, realtime bus, formatting, money, slugs
  server/
    actions/             "use server" mutations (auth, profile, properties, engagement, messaging, notifications, admin)
    services/            business logic (users, properties, enquiries, connections, messaging, offers, reservations, notifications, admin, audit)
  validations/           Zod schemas shared by client forms and server actions
  types/                 DTOs and Auth.js type augmentation
  proxy.ts               route protection (Next 16 "proxy", formerly middleware)
tests/
  unit/                  Vitest: validation, helpers, services (integration against haven_test), actions, components
  e2e/                   Playwright: buyer journey (login → browse → details → enquire), seller listing creation
```

## Environment variables

See `.env.example` for the full list with comments. Required: `DATABASE_URL`, `AUTH_SECRET` (32+ chars). Everything else has a sensible default or degrades gracefully:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Absolute URL used in emails, canonical links, Stripe redirects |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth (button hidden when empty) |
| `EMAIL_DRIVER` | `console` (default), `mailpit`, or `resend` (+ `RESEND_API_KEY`) |
| `STORAGE_DRIVER` | `local` (default, files under `./storage`, served via `/api/files`) or `s3` (+ `S3_*`) |
| `IMAGE_REMOTE_HOSTS` | Comma-separated hosts allowed for `next/image` when using S3 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test** keys. When empty, payment buttons show a "not configured" notice |
| `SEED_PASSWORD` | Password for seeded demo accounts |

Environment variables are validated at startup by `src/lib/env.ts`; a misconfiguration fails fast with a readable list of problems. Live-mode Stripe keys are rejected on purpose.

## Stripe (test mode) and webhooks

1. Create a Stripe account and copy the **test** secret key (`sk_test_…`) into `STRIPE_SECRET_KEY`.
2. Install the Stripe CLI and forward webhooks to the app:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
3. Flow to try: sign in as `karthik.raman@doorkey.local` → Dashboard → Offers → "Made" tab → **Reserve & pay deposit** on the accepted Kalyani Nagar loft offer → pay with card `4242 4242 4242 4242`, any future date, any CVC.
4. Stripe calls the webhook; the app verifies the signature, records the event id (`StripeEvent` table) so retries are idempotent, marks the reservation `DEPOSIT_PAID`, sets the property to `RESERVED` and notifies both parties. The success redirect page never trusts the redirect itself – it simply shows the current database state.

Handled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

## Email and file storage

- **Email drivers** (`src/lib/email`): `console` prints the message to the terminal (links remain clickable), `mailpit` posts to the Mailpit HTTP API bundled in `docker-compose.yml`, `resend` uses the Resend REST API. Delivery failures never break user actions and fall back to the console.
- **Storage drivers** (`src/lib/storage`): `local` writes to `./storage` (git-ignored) and serves files from `/api/files/<key>` with immutable caching; `s3` targets AWS S3 or any S3-compatible endpoint (MinIO, R2, Spaces). Every uploaded image is sniffed by magic bytes and re-encoded through `sharp` (metadata stripped, resized, WebP). PDFs are allowed only for message attachments and floor plans.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (flat config, Next + TypeScript + React hooks rules) |
| `npm run typecheck` | `prisma generate` + `tsc --noEmit` |
| `npm test` | Vitest unit + integration tests (needs PostgreSQL; uses `haven_test`) |
| `npm run test:e2e` | Playwright end-to-end tests (needs a seeded database) |
| `npm run db:migrate` / `db:deploy` / `db:reset` | Prisma migrations |
| `npm run db:seed` | Reset and seed demo data (regenerates placeholder photos) |
| `npm run db:studio` | Prisma Studio |

## Testing

```bash
# Unit + integration (creates/updates the haven_test database schema automatically)
npm test

# End-to-end (first time: npx playwright install chromium). Requires `npm run db:seed` and
# either a running `npm run dev` or lets Playwright start one.
npm run test:e2e
```

Coverage focus (40 Vitest tests, 3 Playwright tests):

- Authentication validation (email normalisation, password strength, signup rules)
- Property creation validation, including that schemas re-validate their own output
- Property filtering/sorting against real database queries; drafts never leak
- Ownership and visibility rules; status transition guards
- Favorite toggling through the server action with a mocked session
- Enquiry creation → connection + notification; self-enquiry blocked
- Conversation access control (participants and admins only)
- Offer state machine: pending → countered → accepted, competing offers expired, invalid transitions rejected, self-purchase blocked
- Stripe webhook idempotency (duplicate event ids, already-paid reservations)
- `PropertyCard` rendering (jsdom)
- E2E: sign in → browse with URL filters → open details → send enquiry → see it in the dashboard; guest favorite redirects to login; seller creates a listing with a real image upload and submits it for review.

Set `TEST_DATABASE_URL` to point the integration tests elsewhere.

## Deployment

Any Node.js host works (Vercel, Fly.io, Render, Railway, a container). Checklist:

1. Provision PostgreSQL and set `DATABASE_URL`. Run `npm run db:deploy` on release (not `migrate dev`).
2. Set `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (https), `AUTH_TRUST_HOST=true` behind proxies.
3. Use `STORAGE_DRIVER=s3` (local disk is not durable on ephemeral/serverless hosts) and add the public host to `IMAGE_REMOTE_HOSTS`.
4. Choose a real email driver (`resend`, or add an SMTP driver in `src/lib/email/index.ts`).
5. Configure a Stripe webhook endpoint pointing at `https://<host>/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET`.
6. **Realtime and rate limiting** use in-process memory. For a single instance (Fly/Render/Railway/VM) this works as-is. On serverless or multi-instance deployments replace `src/lib/realtime.ts` with Redis pub/sub or a hosted service, and `src/lib/rate-limit.ts` with a shared store (e.g. `@upstash/ratelimit`). Long-lived SSE connections also need a platform that supports streaming responses.
7. Build with `npm run build`; start with `npm start`. `next.config.ts` sets security headers and `Cache-Control: private, no-store` for authenticated areas.

A minimal Dockerfile would be: `node:24-alpine`, `npm ci`, `npm run build`, `CMD ["npm","start"]`, with `npx prisma migrate deploy` as a release step.

## Security notes

- Passwords hashed with bcrypt (cost 12); verification/reset tokens are random, stored as SHA-256 hashes, single-use, expiring (24h / 1h).
- Every server action and route handler re-validates input with Zod and re-checks the session and ownership; UI visibility is never the only guard.
- Rate limits on login, signup, password reset, enquiries, messages, offers, reports and uploads.
- Uploads: size limits, MIME sniffing by magic bytes, image re-encoding, UUID storage keys (no user-controlled paths), path traversal guard in the local driver.
- Stripe: signature verification, idempotent processing, no card data stored, test keys only.
- Security headers (HSTS, nosniff, frame deny, referrer policy, permissions policy) and no caching of private pages.
- Audit log for sign-ins, listing lifecycle, moderation, offers, payments, suspensions and blocks.
- Suspended users are signed out on their next request and cannot sign in; their live listings are archived.

## Assumptions and trade-offs

- **Listing moderation is required**: publishing puts a listing into `PENDING_REVIEW`; an administrator approves it (`/admin/properties`). Admin-owned listings go live immediately. Edits to live listings publish immediately without re-review.
- **Buying = offer + reservation deposit.** Accepting an offer moves the property to `UNDER_OFFER` and expires competing offers; a paid deposit moves it to `RESERVED`; an administrator marks the transaction `COMPLETED` (property `SOLD`/`RENTED`) or cancels it (listing returns to `ACTIVE`; refunds are issued in the Stripe dashboard).
- **Offers expire lazily**: expiry is applied when offers are listed, so no cron job is needed.
- **Email verification gates contact features** (enquire, message, offer, publish) but not browsing or saving favorites.
- **One conversation per user pair per property** enforced by a unique `pairKey`; blocking applies to the whole connection between two users.
- **Realtime uses SSE + in-memory pub/sub** instead of Socket.IO (which needs a custom server) or Pusher (which needs external credentials). See deployment note 6.
- **Placeholder photos** are generated locally by the seed (SVG → WebP via sharp) so the demo never depends on remote images.
- **Maps** use Leaflet with OpenStreetMap tiles (no API key). Coordinates are entered manually on the listing form; geocoding was intentionally left out to avoid a third-party dependency.
- **Google OAuth** is optional and only appears when credentials are configured. Accounts are linked by email only through the normal Auth.js flow (dangerous email linking disabled).
- **ESLint 9** is pinned because `eslint-config-next`'s bundled `eslint-plugin-react` is not yet compatible with ESLint 10. `npm audit` reports advisories in the Prisma CLI's dev-only dependencies (`mysql2`, `deepmerge-ts`); they are not part of the runtime bundle.
- **Orphaned uploads**: photos uploaded to an abandoned listing form stay in storage. A periodic cleanup job comparing `PropertyImage.storageKey`/`MessageAttachment.storageKey` with the bucket would remove them.
- **No SMTP driver** is bundled (to avoid a dependency with open advisories); Mailpit (HTTP API) covers local development and Resend covers production. Adding SMTP is a single new class in `src/lib/email/index.ts`.


# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Doorkey"

# Database (matches docker-compose.yml)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/haven?schema=public"

# Auth.js - generate with: openssl rand -base64 32
AUTH_SECRET="LxBDANv1EcYs_8uQcRfcGjeeWZPLRueK6GcB_4EPSFA="
AUTH_TRUST_HOST="true"

# Optional Google OAuth (leave empty to hide the Google button)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Email delivery driver:
#   console - print emails (with verification / reset links) to the server terminal
#   mailpit - deliver to the docker-compose Mailpit inbox at http://localhost:8025
#   resend  - deliver through https://resend.com (requires RESEND_API_KEY)
EMAIL_DRIVER="console"
EMAIL_FROM="Doorkey Realty <no-reply@doorkey.local>"
MAILPIT_API_URL="http://localhost:8025"
RESEND_API_KEY=""

# File storage. Driver: "local" (files in ./storage, served from /api/files) or "s3".
STORAGE_DRIVER="local"
STORAGE_LOCAL_DIR="./storage"
# S3-compatible settings (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces ...)
S3_BUCKET=""
S3_REGION="us-east-1"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_URL=""
# Comma separated hostnames that next/image may optimize (e.g. your S3 public host)
IMAGE_REMOTE_HOSTS=""

# Stripe (test mode only). Keys: https://dashboard.stripe.com/test/apikeys
# Webhook secret comes from: stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Leave empty to run the app without payments (the reserve button explains it is disabled).
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# Development password used by `npm run db:seed` for every demo account
SEED_PASSWORD="Password123!"


-------

DATABASE_URL="postgresql://haven_user:your-password@localhost:5432/haven?schema=public"
AUTH_SECRET="<paste output of: openssl rand -base64 32>"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
EMAIL_DRIVER="resend"
RESEND_API_KEY="re_..."
STORAGE_DRIVER="local"
STORAGE_LOCAL_DIR="/var/www/haven-storage"
