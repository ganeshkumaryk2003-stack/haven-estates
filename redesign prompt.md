# Rebrand and restyle this app as DoorKey Realtors (design only)

You are working in a Next.js 16 / React 19 / Tailwind 4 / shadcn-style real-estate marketplace (currently branded "Haven Estates"). Buyers search listings, enquire, message sellers, make offers, receive one counteroffer, and reserve a home with a Stripe deposit. Sellers and agents list properties; admins moderate.

Your job is to rebrand it as **DoorKey Realtors** and restyle the UI. **Do not change what the app does.** Every route, form, server action, API, database query, permission check and payment flow must behave exactly as before. If a design change seems to need new data, a new query, or a behaviour change, skip it and tell me.

Work in the phases below, one commit per phase, and run the checks at the end of each phase.

---

## Phase 0: Preflight (do this first)

1. `.gitignore` contains a bare `storage` line, meant for the top-level uploads folder. It also ignores `src/lib/storage/`, so that folder is missing from the repo and `@/lib/storage` imports fail typechecking. Change the line to `/storage`. If `src/lib/storage/` does not exist locally, **stop and tell me**. Do not invent it.
2. Record a baseline before touching anything: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Note anything that already fails so you don't blame it on your changes. Some unit tests need a Postgres `DATABASE_URL`; if none is available, run `npx vitest run tests/unit/components tests/unit/lib tests/unit/validations` and say which suites you skipped.

---

## Guardrails (read before every phase)

**Do not edit:** `prisma/**` (schema, migrations, seed), `src/server/**`, `src/app/api/**`, `src/lib/auth/**`, `src/validations/**`, any `"use server"` action file, `middleware`/`proxy`, `next.config.*`, `package.json` dependencies, or anything under `tests/`.

**The only allowed edits in those areas** are brand-string swaps from "Haven" to the new name, listed in Phase 1.

**Keep these exactly as they are. Tests and screen readers depend on them:**
- Accessible names: buttons "Enquire", "Make an offer", "Save to favorites", "Send enquiry", "Log in", "Next", "Submit for review"; the heading "Key facts" on the property page; the dialog title "Enquire about this property"; region "Search results"; list "Active filters" and its chip texts ("For sale", "House", …); headings in the listing form ("List a property", "Details", "Amenities", "Photos & media", "Review"); the "Welcome back, {name}" heading.
- Form field labels and `name` attributes, `href`s and route paths, `aria-*` attributes, `sr-only` text, focus-visible rings.
- `PropertyCard` must still render: `<article>`, the title as a heading containing a link to `/properties/{slug}`, the price string produced by `formatPrice` (full amount, e.g. `₹7,49,000`, `₹3,450/mo`), the text "Featured" for featured listings, the status label (e.g. "Reserved") for non-active listings, the cover image with its alt text, and `FavoriteButton`.
- Component exports and props. You may **add** optional props; never remove or rename existing ones.
- No duplicate interactive controls with the same accessible name visible at the same time (Playwright runs in strict mode).

**Do not change price formatting** in this pass. Compact "₹1.42 Cr" labels would break `property-card.test.tsx`; list it as a follow-up instead.

---

## Design direction

The brand idea is **a front door opening onto a home**. The palette is friendly and familiar for property: a clean warm white page, **door blue** for everything you can press, deep navy ink for text and prices (carried over from the logo), a soft sky tint for the hero and highlighted areas, and **porch-light yellow** for anything in progress (the current step, "Under offer", "Needs you"). The one signature element is a **journey rail**: Enquire, Offer, Counteroffer, Accepted, Reserved, with a key on the final step. It appears on the home page, the listing sidebar, the offers list and the dashboard. Everything else stays quiet: photo-first listings, one serif for prices and headings, rounded but not bubbly shapes (12px controls, 16px photos, 20px panels).

A static reference of the target look is published at https://claude.ai/artifact/BscMkAeQvhRErLkDV9wEXw. Match its intent, but this prompt wins where they differ.

Things to avoid: ALL-CAPS tracked labels, eyebrow text above headings, middle-dot meta strings (`A · B · C`), arrows appended to button text, icon-in-a-rounded-square tiles, identical bordered cards for everything, gradient washes, fabricated testimonials, hover zoom on every card.

---

## Phase 1: Brand name, logo, favicon

1. `src/lib/constants.ts`: default `APP_NAME` to `"DoorKey Realtors"` (keep reading `NEXT_PUBLIC_APP_NAME` first). Add `export const APP_SHORT_NAME = "DoorKey";`.
2. `.env.example`: `NEXT_PUBLIC_APP_NAME="DoorKey Realtors"`, and change `EMAIL_FROM` display name to `DoorKey Realtors` (leave the address alone).
3. Replace hardcoded "Haven" strings (string edits only):
   - `src/app/(site)/dashboard/page.tsx`: "Your latest actions on Haven." becomes "Your latest actions on DoorKey."
   - `src/app/(site)/onboarding/page.tsx`: "Welcome to Haven, …" becomes "Welcome to DoorKey, …"
   - `src/components/auth/signup-form.tsx`: "Join Haven to…" and "How will you use Haven?" use `APP_SHORT_NAME`.
   - "Haven user" fallbacks in `connection-list.tsx`, `enquiry-list.tsx`, `offer-list.tsx`, `reservation-list.tsx`, `conversation-list.tsx`, `message-thread.tsx` become "DoorKey member".
   - `src/lib/email/templates.ts`: "Open in Haven" becomes "Open in DoorKey".
   - `src/lib/stripe.ts`: `appInfo.name` becomes "DoorKey Realtors".
   - `src/server/services/messaging.ts`: the literal `"a Haven user"` becomes `"a DoorKey member"`. That single literal is the only permitted edit in that file.
   - Do **not** change seed data or demo login emails (`@haven.local`).
   - Finish with `grep -rn "Haven" src`, which should return nothing.
4. Logo. Replace the Lucide `Home` icon in `src/components/layout/logo.tsx` with this mark. Keep the `Link`, the `aria-label={`${APP_NAME} home`}` and the `compact` prop behaviour. The wordmark is "DoorKey" in the display serif (weight 600, tracking -0.015em) followed by "Realtors" in the UI sans, small and muted, hidden below 400px wide. The mark colours come from tokens so it works in dark mode:

   ```tsx
   <svg viewBox="0 0 40 44" className="h-8 w-auto" aria-hidden="true">
     <defs>
       <linearGradient id="dk-light" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stopColor="#FAF3E7" /><stop offset="1" stopColor="#E6C47F" />
       </linearGradient>
     </defs>
     <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1H19a20 21 0 0 1 0 42H4.5A1.5 1.5 0 0 1 3 41.5Z" fill="var(--door)" />
     <path d="M9 8H22V37H9Z" fill="var(--door-shadow)" />
     <path d="M9 8L19.5 10V35.2L9 38Z" fill="url(#dk-light)" />
     <circle cx="16.8" cy="23" r="1.25" fill="var(--door)" />
   </svg>
   ```
   Use React's `useId()` for the gradient id if the logo can render twice on a page (header and footer).
5. Favicon: add `src/app/icon.svg` (Next's file convention) with the same mark in fixed colours (`#2F54C4` for the D, `#1E3A8F` for the doorway).
6. `src/app/layout.tsx`: update `viewport.themeColor` to `#FBFAF8` (light) and `#0D1320` (dark).

---

## Phase 2: Tokens and type (restyles everything through existing variables)

Keep every existing shadcn variable name so all components pick up the new look automatically. Replace the values in `src/app/globals.css`:

```css
:root {
  --radius: 0.75rem;
  --background: #FBFAF8;  --foreground: #16233B;
  --card: #FFFFFF;        --card-foreground: #16233B;
  --popover: #FFFFFF;     --popover-foreground: #16233B;
  --primary: #2F54C4;     --primary-foreground: #FFFFFF;
  --secondary: #F1F2F5;   --secondary-foreground: #16233B;
  --muted: #F1F2F5;       --muted-foreground: #566479;
  --accent: #EEF3FC;      --accent-foreground: #16233B;
  --destructive: #B42318; --destructive-foreground: #FFFFFF;
  --border: #E4E7EE;      --input: #7D879B;   --ring: #2F54C4;
  --success: #23804F;     --warning: #F5B840;
  --gold: #F5B840;        --gold-foreground: #16233B;
  --sky: #EEF3FC;         --warm: #FDF3E0;
  --door: #2F54C4;        --door-shadow: #1E3A8F;
  --chart-1: #2F54C4; --chart-2: #F5B840; --chart-3: #B42318; --chart-4: #23804F;
}
.dark {
  --background: #0D1320;  --foreground: #EEF2FA;
  --card: #141C2E;        --card-foreground: #EEF2FA;
  --popover: #141C2E;     --popover-foreground: #EEF2FA;
  --primary: #93AEF7;     --primary-foreground: #0D1320;
  --secondary: #1A2336;   --secondary-foreground: #EEF2FA;
  --muted: #1A2336;       --muted-foreground: #9AA6BD;
  --accent: #18233B;      --accent-foreground: #EEF2FA;
  --destructive: #F97066; --destructive-foreground: #0D1320;
  --border: #243049;      --input: #5E6B86;   --ring: #93AEF7;
  --success: #5BC98F;     --warning: #F7C45A;
  --gold: #F7C45A;        --gold-foreground: #16233B;
  --sky: #18233B;         --warm: #2E2615;
  --door: #93AEF7;        --door-shadow: #2B3D6E;
}
```

Add `--color-gold`, `--color-gold-foreground`, `--color-sky`, `--color-warm`, `--color-door` and `--color-door-shadow` to the `@theme inline` block.

All text pairings above were checked and pass WCAG AA (4.5:1) in both themes. The input border passes the 3:1 control-boundary rule. **Porch-light yellow (`--gold`) is a fill colour only.** Never put it behind white text or use it as text colour (1.8:1). Text on it is always `--gold-foreground`.

**Type.** In `layout.tsx`, replace Inter and Manrope with `Figtree` (UI, variable `--font-ui`) and `Source_Serif_4` (display, variable `--font-serif`, `axes: ["opsz"]`; drop `axes` if it errors) from `next/font/google`. In `@theme`, set `--font-sans: var(--font-ui), ui-sans-serif, system-ui, sans-serif;` and `--font-display: var(--font-serif), Georgia, serif;` (this also fixes the current self-referencing `--font-display`). Remove the Inter-specific `font-feature-settings`. Headings use the serif at weight 600 with `tracking-tight`; prices use the serif at weight 600 with `tabular-nums`; everything else uses Figtree.

**Primitives** (`src/components/ui/`, visual classes only):
- `button.tsx`: default = door-blue fill; outline = 1px `--input` border on card; link = door blue, underline offset 4px; add a `gold` variant (gold fill, `--gold-foreground` text) for the seller call to action. Keep existing sizes and variant names.
- `badge.tsx`: `warning` becomes a porch-light fill with `--gold-foreground` text; `success` a pale green tint with `--success` text; pills (`rounded-full`), weight 600. Keep variant names.
- `card.tsx`: softer border (`--border`), no shadow.

---

## Phase 3: Signature component, the journey rail

Create `src/components/offers/journey-rail.tsx` (a server component, no data fetching):
- Props: `current: 0 | 1 | 2 | 3 | 4`, `complete?: boolean`, `orientation?: "horizontal" | "vertical"`, `size?: "full" | "mini"`.
- Steps: Enquire, Offer, Counteroffer, Accepted, Reserved. Render as `<ol aria-label="Offer progress">`, with `aria-current="step"` on the current item.
- Done steps: door-blue node with a check. Current step: porch-light node with a navy number and a 4px soft yellow halo. Future steps: outlined node in muted text. The final node shows Lucide `KeyRound` instead of a number. The connecting line is door blue up to the current step and `--border` after it.
- In the vertical orientation, each step has a one-line hint under its label: "Ask the seller anything", "You choose how long it stays open", "The seller can counter once", "Nothing is charged before this", "Pay the deposit through Stripe".
- `mini`: five 8px dots in the same colours, with a visually hidden text label ("Step 3 of 5: Counteroffer").
- Export a pure helper `stepFromStatus(offerStatus?: string, reservationStatus?: string)` that maps: no offer to 0; `PENDING` to 1; `COUNTERED` to 2; `ACCEPTED` to 3; reservation `DEPOSIT_PAID` or `COMPLETED` to 4 with `complete`. For `REJECTED`, `WITHDRAWN` or `EXPIRED` it returns `null`, and callers render no rail. Use only data the page already has.

---

## Phase 4: Pages and components

**Header** (`site-header.tsx`, `main-nav.tsx`): same items and hrefs. The active item is marked by a 2px gold underline instead of the accent pill (keep the existing `aria-current` logic). Background `--background` at 92% with blur, bottom border `--border`.

**Home** (`src/app/(site)/page.tsx`; keep every data call):
- **Hero (dusk street):** remove the uppercase eyebrow and the radial-gradient wash. The hero is a high-contrast evening scene: background `linear-gradient(180deg, #0A1330 0%, #15275A 42%, #34509E 74%, #D9A15A 100%)` in both themes, white text, and a pale moon (`#FCE7B8` circle with two faint halo rings) in the top-right corner. Content, left aligned: an H1 in the serif, set on three lines ("Find a home." / "Make an offer." / "Reserve it."); the subline "Every offer and counteroffer is on the record, and the deposit comes only after the seller says yes." in `#DCE3F5`; then `HeroSearch`. Restyle only its outer container: white card, 20px radius, one deep shadow, fields separated by 1px dividers, max-width about 960px. Stat labels use `#C9D3EE`.
  Below the content, full width at the bottom of the hero, add `src/components/home/hero-skyline.tsx`: an `aria-hidden` inline SVG (`viewBox="0 0 1600 300"`, `preserveAspectRatio="xMidYMax slice"`, height `clamp(150px, 20vw, 290px)`) of a street frieze. It has faint white distant towers at 6% opacity with a few yellow windows, then a row of flat, simple buildings in dusk blues (`#56689A`, `#44568A`, trim `#8395C4`, roofs `#2A3864`, glass `#172247`): two apartment towers, two tiled-roof bungalows, a modern villa, and three terraced townhouses. Windows are a mix of dark glass and porch light (`#F5B840`), and every front door is lit (`#FFD27A`). Under each door, a soft trapezoid of porch light (a vertical gradient from `#F5B840` at 60% to 0%) spills across a dark pavement strip (`#101A36`). This is the brand idea carried into the skyline: doors opening onto homes.
  Keep all text contrast at AA or better against the lightest part of the gradient it overlaps (checked: headline 7.5:1, subline 5.9:1, stat labels 5.0:1).
- **Stats:** keep the four numbers but drop the uppercase labels. Show them as one quiet row of serif numbers, each with a sentence-case label.
- **Featured:** photo-first `PropertyCard`s. On lg screens the first card spans two columns and shows the listing's first line of description (add optional `size?: "default" | "large"` and `featuredTag?: boolean` props to `PropertyCard`; pass `featuredTag={false}` in this section so every card doesn't repeat "Featured"). All photos in this grid share one height so rows line up.
- **Browse by property type:** replace the icon tiles with a two-column typographic list: type name in the serif, count right-aligned in muted text, a hairline between rows. Keep the same links.
- **How it works:** replace the three numbered cards with the horizontal `JourneyRail` (`current={4} complete`), plus three short sentences: "You choose how long an offer stays open.", "A seller can counter once, and you accept or decline.", "The deposit comes last and is taken by Stripe only after acceptance." Keep the three trust statements (verified accounts, secure deposits, map search) as plain text lines, without icon tiles.
- **Testimonials:** remove the section. The names are invented and the cities don't match the INR setup.
- **CTA:** a door-blue panel (`--primary` background in light mode, a deeper `#233F94` in dark mode, white text, 24px radius) with the button "List a property" (gold variant). On the right, a new `src/components/home/hero-doorway.tsx` (reuse it on the auth pages): an `aria-hidden` inline SVG of the logo's D drawn as a real doorway about 300px tall, sitting on the panel's bottom edge. The D is white on the blue panel. Through the opening you see a small sunny room (warm cream wall, a window with sky, a floor lamp, a door-blue sofa with a yellow cushion, a wooden floor). The door leaf is swung open toward the viewer (cream-to-yellow gradient), with a doormat in front, a potted plant beside it, and a soft wedge of porch light falling across the floor. Hide it below `md`. Remove the `ArrowRight` icons from buttons across the site.

**PropertyCard** (`src/components/properties/property-card.tsx`):
- Remove the card box (no border, background or shadow). The photo is the card: 4:3 ratio, 14px radius, no hover zoom. On hover, underline the title instead.
- One tag at most on the photo, bottom-left: the status label if not active (UNDER_OFFER as a gold pill, others white), otherwise "Featured" as a white pill, otherwise nothing. The listing type ("For sale"/"To rent") moves into the text below the photo. The property type moves into the facts line as plain text instead of an outline badge.
- The price uses `font-display text-2xl font-semibold text-foreground` (not `text-primary`). Below it come the title, then the location, then facts as plain text ("3 beds", "2 baths", "1,640 sq ft") without the icon row, since "bd"/"ba" abbreviations read poorly.
- Keep everything listed in the guardrails. Update `PropertyCardSkeleton` to match.

**Property detail** (`src/app/(site)/properties/[slug]/page.tsx`; same data, same components):
- **Header:** H1 in the serif. The address sits under it. Next to or under the title goes the price at large serif size (`formatPrice` output), plus the status pill only when not ACTIVE. Show "Listed {relative}" to everyone. Views, reference and "Updated" are shown **only when `isOwner || isAdmin`**.
- **Key facts:** keep the `<h2>Key facts</h2>`. Replace the nine bordered tiles with one horizontal strip (`<dl>`, number in serif, label under it, thin dividers between items, wrapping to two columns on mobile). Keep all nine facts.
- **Amenities:** group by amenity category if that data is already on the object. Otherwise keep a plain multi-column list without check icons.
- **Sidebar:** price (serif), then the deposit row, then actions, restyled via the existing `triggerProps` only. `OfferDialog` gets `{{ variant: "default", size: "lg", className: "w-full" }}`, `EnquiryDialog` gets `{{ variant: "outline", className: "w-full" }}`, `MessageSellerDialog` gets `{{ variant: "link" }}`. Below them: "What happens next" with a vertical `JourneyRail` whose step comes from `stepFromStatus(acceptedOffer?.status, acceptedOffer?.reservation?.status)`. The owner and accepted-offer branches keep their logic; only styling changes.
- **Seller card:** avatar, name, role, then "Email verified" (only if `emailVerified`), "Member since …". Plain text, no bullets.
- **Mobile:** below `lg`, add a fixed bottom bar with the price and a link "Offer options" that scrolls to the sidebar (`href="#offer-panel"`, add `id="offer-panel"` to the aside). It must be a link, not a second dialog trigger, and it is hidden at `lg`. Add bottom padding to the page so the bar never covers content.
- Keep the gallery and lightbox as they are, apart from radius and colours.

**Browse** (`src/app/(site)/properties/page.tsx` and its components): keep the filter panel logic and URL params. Restyle filter controls as pill buttons and checkboxes in door blue, and results use the new cards. In map view, price pins use door blue for the selected listing and porch light for UNDER_OFFER, if pin styling lives in our CSS (don't change Leaflet logic).

**Dashboard:**
- `stat-card.tsx`: remove the icon chip and the uppercase label. The value is in the serif, the label sentence case. When `tone="warning"`, add a 3px gold left border and a small "Needs you" gold pill. The props API is unchanged.
- `offer-list.tsx`: add a `JourneyRail size="mini"` next to each offer's status, using fields already in the DTO. If reservation status isn't in the DTO, stop at "Accepted".
- "Recent activity": a timeline with a 2px left rule, porch-light for items from the last 24 hours. Replace the raw audit codes (e.g. `offer.updated` in a monospace badge) with plain sentences from a small lookup in the component ("You made an offer on a property", "You updated a listing"), falling back to the raw code for anything unmapped.
- Notifications panel: unread items get a small porch-light dot.

**Auth pages** (`(auth)/layout.tsx`): on lg and up, a left `--sky` panel with the `HeroDoorway` illustration (D filled with `--door`) and the line "Every offer on the record."; the form on the right is unchanged.

**Footer and admin:** logo plus tokens only; no layout changes to admin.

**Motion:** remove `group-hover:scale-*` zooms. Keep dialog and sheet animations, and wrap any new motion in `motion-safe:`.

---

## Phase 5 (optional, ask before doing): mobile tab bar

A `md:hidden` fixed bottom bar with Home, Browse, Saved, Messages and Account (reusing the nav items and `usePathname` active logic), keeping the hamburger for the rest. It must be `display:none` at md and above so there are no duplicate accessible names in desktop tests.

---

## Verification (after every phase)

1. `npm run typecheck`, `npm run lint`, `npm test` (or the DB-free subset), `npm run build`. Nothing may newly fail compared with the Phase 0 baseline.
2. If a seeded database is available: `npm run test:e2e`.
3. `grep -rn "Haven" src` returns nothing; `grep -rn "uppercase\|tracking-\[0.2em\]" src` returns nothing outside admin tables.
4. Visually check home, browse (grid and map), a property page (as guest, as buyer with a countered offer, and as owner), the dashboard, and login, at 375px, 768px and 1280px, in light and dark. Confirm there is no horizontal scrolling, focus rings are visible, and porch-light elements always have navy text.

**Definition of done.** Every route, form, server action, API response, database write, permission check, email, notification and Stripe flow behaves exactly as in the original folder. Before reporting, review your full diff (`git diff --stat` and `git diff`) and confirm that every changed line is presentation (classes, markup structure, SVG, copy listed above, new optional props, or new presentational components). Revert anything that is not.

**When done, report:** the files changed per phase, anything you skipped and why, and follow-ups. Follow-ups I already know about: compact ₹ Cr/L prices on cards (needs a test update), and seed listings being US cities with USD-sized prices while the app formats everything as INR.
