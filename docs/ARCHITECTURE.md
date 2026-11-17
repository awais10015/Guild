# Hariq Local Services Marketplace — System Architecture

> Version 1.0 · 2026-11-11 · Status: PROPOSED (awaiting approval)
> Companion docs: [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · [PROGRESS.md](./PROGRESS.md)

---

## 1. Requirements Analysis

### 1.1 Core capability map (extracted from the product spec)

| # | Capability | Key constraint from spec |
|---|------------|--------------------------|
| C1 | Dynamic taxonomy (Category → Profession → Service) | New professions must require **zero code changes** |
| C2 | Identity & RBAC (customer / provider / admin) | Role enforced **server-side**; users can never self-promote |
| C3 | Provider profile as the "product" | Portfolio, skills, certifications, verification, ratings, availability |
| C4 | Geospatial discovery | Nearest-provider search, coverage radius, map; **home address never public** |
| C5 | Marketplace search | Multi-facet filters, 6 sort modes, pagination, query-optimized |
| C6 | Booking + quotation workflow | 9 statuses, audited history, strict server-side transition validation |
| C7 | Real-time messaging | Text + images, presence, unread counts, booking-linked threads |
| C8 | Trust system | Reviews only after **completed** bookings; auto-computed ratings; moderation |
| C9 | Notifications | In-app + email fan-out |
| C10 | Admin console | Verification, taxonomy CRUD, disputes, analytics |
| C11 | Business model v1 | Free registration, cash-on-completion, USD, worldwide-first; **payment-ready but payment-free** |

### 1.2 Primary risks and architectural responses

| Risk | Response |
|------|----------|
| R1 — Next.js App Router cannot host a WebSocket server | Realtime runs on **Pusher Channels** (managed) — server triggers via REST, browser subscribes with `pusher-js` (see ADR-1) |
| R2 — Geospatial correctness (multi-point coverage per provider) | `2dsphere` multikey indexes + `$geoNear` pipeline; validated early in Phase 3 spike |
| R3 — Search relevance without Atlas Search | MongoDB `text` indexes on ProviderProfile + Service, merged with `$unionWith`; documented upgrade path |
| R4 — MongoDB availability in this sandbox | Phase 0 spike: local `mongod` or `mongodb-memory-server` for dev; Atlas free tier for shared/staging data |
| R5 — Rate limiting without Redis | In-memory sliding-window limiter behind an interface; Redis adapter is a drop-in later |
| R6 — Upload abuse | Cloudinary **signed uploads** (secret never leaves the server), server-issued signatures per user/folder, MIME + size allowlists |
| R7 — Booking state corruption | Atomic guarded transitions (`findOneAndUpdate({_id, status: from}, …)`) + unique partial index against duplicate open requests |

---

## 2. Architecture Overview

**Style: modular monolith (Next.js) + one realtime service (Socket.IO) + MongoDB.**

```
                         ┌─────────────────────────────────┐
                         │            Browser              │
                         │  RSC pages + client islands     │
                         │  (Leaflet map, Socket client)   │
                         └───────┬────────────────┬────────┘
                                 │ relative HTTPS │ relative WS path
                          ┌──────▼────────────────▼──────┐
                          │   Reverse proxy / gateway    │  (Caddy here; nginx/Caddy on VPS)
                          └──────┬────────────────┬──────┘
                                 │                │ /socket.io
                     ┌───────────▼──────────┐ ┌───▼─────────────────────┐
                     │  Next.js 16 (Node)   │ │  Socket.IO service      │
                     │  · RSC pages         │ │  · session handshake    │
                     │  · Route Handlers    │ │  · conversation rooms   │
                     │    (/api/*)          │ │  · presence tracking    │
                     │  · Better Auth       │ │  · notification push    │
                     │  · domain services   │ └────────┬────────────────┘
                     │  · Zod validation    │          │
                     └───────────┬──────────┘          │
                                 │ Mongoose            │ MongoDB driver (same DB)
                        ┌────────▼─────────────────────▼────────┐
                        │               MongoDB                 │
                        │  auth collections (Better Auth)       │
                        │  domain collections (Mongoose)        │
                        │  2dsphere · text · compound indexes   │
                        └───────────────────────────────────────┘
                                 │                    │
                        Cloudinary (images)       SMTP (email)
```

### 2.1 Layering rules (enforced by convention + review)

1. **Presentation** — `src/app/**`. RSC for all reads (fast public pages, direct service calls); client components only for interactive islands (forms, maps, chat, filters).
2. **API** — `src/app/api/**/route.ts`. Thin controllers only: parse → Zod validate → auth guard → call domain service → `{ ok, data | error }` envelope. **All mutations go through Route Handlers** (explicit, rate-limitable, testable, reusable by a future mobile app). Server Actions are used sparingly, if at all.
3. **Domain services** — `src/server/services/*.ts`. All business rules live here (booking state machine, review eligibility, rating recalculation, notification fan-out). Controllers never encode business rules.
4. **Data access** — `src/models/*.ts` (Mongoose). Indexes declared in schema definitions and verified at boot.
5. **Cross-cutting** — `src/lib/*`: auth guards, rate limiting, mail, Cloudinary, geo math, formatting (USD/dates), constants.

### 2.2 Key flows

**Search & discovery (read path)** — RSC page → `search-service` builds a `$geoNear`/text aggregation → pagination → streamed provider cards. Filters are encoded in the URL (`?q=&city=&profession=&sort=`) so results are shareable and SSR-able.

**Booking (write path)** — `POST /api/bookings` → Zod parse → auth guard (role: customer) → duplicate-open-request guard (partial unique index) → create with `status: pending` + first history entry → `notification-service.emit(provider)` (in-app doc + Socket.IO push + best-effort email).

**Quotation acceptance (multi-doc consistency)** — MongoDB transaction: `quotation.status = accepted` + `booking.status = confirmed` (+history entries) atomically; older quotations marked `superseded`.

**Messaging** — client connects via relative WS path → socket service verifies the Better Auth session cookie on handshake → joins `conversation:<id>` rooms only for conversations the user participates in → messages persisted → broadcast to room → offline participants get notification fan-out.

**Review** — `POST /api/reviews` → eligibility (booking `completed`, caller is the customer, no existing review via unique index) → insert → recompute provider `rating` with one aggregation → notify provider.

---

## 3. Technology Decisions (ADR summaries)

### ADR-1 — Pusher Channels for realtime (no self-hosted WebSocket)
Next.js App Router cannot host a WebSocket server, and a separate Socket.IO process complicated deployment (extra port, gateway routing, session sharing). Pusher Channels replaces it end-to-end: the server persists data first, then triggers events through Pusher's REST API (`src/lib/pusher.ts`); the browser subscribes with `pusher-js` through a session-guarded auth endpoint (`/api/pusher/auth`). Channels: `private-user-<id>` for notifications and conversation-list updates; `presence-conversation-<id>` for chat messages, typing, read receipts and per-conversation presence. All triggers are best-effort — if Pusher is unconfigured the app still works and the client falls back to refresh-on-change.

### ADR-2 — Better Auth over Auth.js/NextAuth
- Official **MongoDB adapter** (`@better-auth/mongo-adapter` 1.7.x) over the same database Mongoose uses.
- Built-in: email verification, password reset, DB sessions (revocable), rate limiting, and the **admin plugin** (role field + ban/suspend) — which the spec requires and NextAuth would have us hand-roll.
- TypeScript-first, framework-agnostic core.
- Roles (`customer | provider | admin`) live on the auth user record and are **only ever set server-side**; no registration/invite endpoint accepts a role parameter. Admins are created exclusively by the seed script / a CLI.

### ADR-3 — MongoDB + Mongoose 9
Flexible documents fit portfolios, service areas, status histories and quotation line items without join tables; `2dsphere` + `$geoNear` are first-class; the aggregation pipeline powers dashboards and rating recalculation. Mongoose gives schema validation, hooks (e.g., `updatedAt`), and typed models.

### ADR-4 — Taxonomy is data, not code
`Category` (e.g. "Home Repair") → `Profession` ("Plumber", with `keywords[]` for search) are admin-managed collections. Services reference them by ObjectId. Adding a profession is an admin-panel operation. Icons map via a Lucide icon-name string validated against an allowlist.

### ADR-5 — Leaflet + OpenStreetMap (Mapbox deferred)
No API key, no per-load cost, adequate for MVP pin/discovery UX. All map usage goes through one `<MapView>` wrapper so switching to Mapbox later is a single-component change.

### ADR-6 — Money as integer USD
All amounts are integers of US dollars (no cents) in `price`/`amount` fields with an explicit `currency: "USD"` constant. Avoids float errors; a per-record currency field makes internationalization additive.

### ADR-7 — Server-authoritative booking state machine
One `BOOKING_TRANSITIONS` map (from → allowed[to] per actor role) in `booking-service.ts`; transitions execute via `findOneAndUpdate({ _id, status: from }, { $set: { status: to }, $push: { statusHistory } })` — the precondition is atomic, so two concurrent actors cannot race past it.

### ADR-8 — Cloudinary signed uploads
Server endpoint `POST /api/uploads/sign` issues a short-lived signature scoped to `marketplace/<userId>/<kind>/` after checking role + declared content type/size. The client uploads directly to Cloudinary; only the resulting `publicId`/URL is stored. `next/image` with a Cloudinary `remotePatterns` allowlist renders them.

### ADR-9 — Notifications: one service, three channels
`notification-service.emit(userId, event)` → (1) Notification document, (2) Socket.IO push if online, (3) email dispatch (Nodemailer, best-effort, dev = console transport). Channel preferences per user arrive in Phase 6.

### ADR-10 — Privacy by default
Provider profile stores a **public** location (city/area/coordinates + coverage areas). The precise address exists only inside bookings and is readable **only by booking participants**. Verification documents are URL-signed, admin-only. Public APIs select fields explicitly (no `lean()` dumps of whole documents).

---

## 4. Repository / Folder Structure

```
local-services-marketplace/
├── docs/                            # ARCHITECTURE.md, DATABASE_DESIGN.md, PROGRESS.md
├── mini-services/
│   └── socket-service/              # Socket.IO process (own package.json, port 3003 in sandbox)
│       └── index.ts
├── prisma/                          # scaffold default — REMOVED in Phase 0 (we use MongoDB)
├── scripts/
│   └── seed.ts                      # admin user, categories, professions, demo data
├── src/
│   ├── app/
│   │   ├── layout.tsx  globals.css  not-found.tsx  error.tsx
│   │   ├── (marketing)/             # public, SEO-oriented, RSC
│   │   │   ├── page.tsx                       # homepage: hero, categories, featured providers
│   │   │   ├── professionals/page.tsx         # search results (URL-state filters + map)
│   │   │   ├── professionals/[slug]/page.tsx  # public provider profile
│   │   │   ├── services/[id]/page.tsx         # service detail + booking CTA
│   │   │   ├── categories/page.tsx  categories/[slug]/page.tsx
│   │   │   └── how-it-works/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx  register/page.tsx
│   │   │   ├── forgot-password/page.tsx  reset-password/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   ├── onboarding/page.tsx                # role-aware wizard (customer vs provider)
│   │   ├── dashboard/                         # CUSTOMER area (role: customer)
│   │   │   ├── layout.tsx  page.tsx
│   │   │   ├── bookings/page.tsx  bookings/[id]/page.tsx
│   │   │   ├── favorites/page.tsx  reviews/page.tsx  settings/page.tsx
│   │   ├── provider/                          # PROVIDER area ("Studio", role: provider)
│   │   │   ├── layout.tsx  page.tsx           # stats overview (Recharts sparklines)
│   │   │   ├── profile/page.tsx               # public profile editor
│   │   │   ├── services/page.tsx  services/new/page.tsx  services/[id]/edit/page.tsx
│   │   │   ├── bookings/page.tsx  bookings/[id]/page.tsx
│   │   │   ├── availability/page.tsx  verification/page.tsx  analytics/page.tsx
│   │   ├── admin/                             # ADMIN area (role: admin)
│   │   │   ├── layout.tsx  page.tsx           # platform analytics
│   │   │   ├── users/page.tsx  providers/page.tsx  verification/page.tsx
│   │   │   ├── bookings/page.tsx  reports/page.tsx  reviews/page.tsx
│   │   │   └── categories/page.tsx  settings/page.tsx
│   │   ├── messages/page.tsx                  # shared chat UI (customer + provider)
│   │   ├── notifications/page.tsx
│   │   └── api/
│   │       ├── auth/[...all]/route.ts         # Better Auth catch-all
│   │       ├── uploads/sign/route.ts          # Cloudinary signature issuer
│   │       ├── categories/route.ts  professions/route.ts
│   │       ├── providers/route.ts  providers/[id]/route.ts
│   │       ├── services/route.ts  services/[id]/route.ts
│   │       ├── search/route.ts
│   │       ├── bookings/route.ts  bookings/[id]/route.ts  bookings/[id]/status/route.ts
│   │       ├── quotations/route.ts  quotations/[id]/respond/route.ts
│   │       ├── conversations/route.ts  conversations/[id]/messages/route.ts
│   │       ├── reviews/route.ts  favorites/route.ts
│   │       ├── notifications/route.ts  verification/route.ts  reports/route.ts
│   │       └── admin/{users,verification,reports,reviews,categories,taxonomy,stats}/route.ts
│   ├── components/
│   │   ├── ui/                                # shadcn/ui (already installed)
│   │   ├── layout/                            # navbar, footer, dashboard shells, sidebars, theme-toggle
│   │   ├── marketplace/                       # provider-card, service-card, search-bar, filter-panel,
│   │   │                                      # category-grid, rating-stars, verified-badge, map-view
│   │   ├── provider/                          # profile-form sections, portfolio-manager, service-form
│   │   ├── booking/                           # request-dialog, status-timeline, quotation-card
│   │   ├── messaging/                         # conversation-list, chat-window, message-bubble
│   │   ├── dashboard/                         # stat-card, charts, activity-feed, empty-state
│   │   └── shared/                            # image-uploader, location-picker, confirm-dialog, skeletons
│   ├── lib/
│   │   ├── auth.ts  auth-client.ts  guards.ts
│   │   ├── db.ts                              # Mongoose connection (replaces scaffold Prisma client)
│   │   ├── cloudinary.ts  mail.ts  rate-limit.ts
│   │   ├── geo.ts  format.ts  constants.ts  utils.ts  socket.ts (client singleton)
│   │   └── validations/                       # zod schemas: auth, provider, service, booking,
│   │                                          # quotation, review, search, admin
│   ├── server/
│   │   └── services/                          # booking, quotation, review, search, notification,
│   │                                          # provider, admin services
│   ├── models/                                # one file per collection + index.ts registry
│   ├── hooks/                                 # use-socket, use-notifications, use-geolocation, use-debounce
│   ├── types/                                 # Better Auth additional-fields typing, enums, API types
│   └── styles/                                # (globals.css holds Tailwind 4 theme tokens, dark mode)
├── .env.example
├── next.config.ts                             # images.remotePatterns (Cloudinary)
└── package.json                               # npm-compatible scripts
```

> Sandbox note: the dev server runs on port 3000 automatically; the Socket.IO mini-service runs on 3003 and is reached via the gateway (`XTransformPort`). All client code uses relative URLs only.

---

## 5. Development Phases

Each phase ends in a **demonstrable, tested state**. I maintain `PROGRESS.md` as the living record; nothing moves forward until the DoD passes in the running app.

| Phase | Scope | Definition of Done |
|-------|-------|--------------------|
| **0 — Foundation** | Env init, replace Prisma with Mongoose connection, Tailwind 4 theme tokens (brand palette, dark mode), fonts, navbar/footer/homepage shell, `.env.example`, Mongo availability spike | App boots; DB connects; homepage shell renders in light+dark; lint clean |
| **1 — Data & Auth** | All 14 domain models + indexes; Better Auth (register/login/logout/email-verify/reset); middleware route protection; role-select onboarding wizard; admin seed | Both roles can register→verify→login; protected routes bounce correctly; no endpoint accepts `role` from client |
| **2 — Profiles & Services** | Provider profile editor (all spec fields, service areas with map picker), portfolio/certification uploads (Cloudinary signed), service CRUD with 4 pricing models | Provider publishes profile + ≥1 service; public profile page renders; privacy rules verified |
| **3 — Search & Discovery** | Search API (text + `$geoNear` + filters + 6 sorts + pagination), category browsing, results page with filter panel + map view, full public profile | Find providers by city/area/profession/keyword; "nearest" sort returns distance-ordered results; map pins correct |
| **4 — Bookings & Quotations** | State machine service, booking request dialog, per-role booking lists/detail, quotation send/accept/decline, status timeline, email + in-app notifications | Full lifecycle demo pending→completed (incl. quotation); invalid transitions → 4xx; duplicate open request blocked |
| **5 — Messaging** | Socket.IO service, conversations UI, image attachments, presence, unread counts, booking-linked threads, notification bell | Two browsers chat in real time; unread badges correct; non-participants rejected at handshake and API |
| **6 — Trust & Accounts** | Reviews (eligibility-gated), rating recalculation, provider replies, favorites, reports, notification preferences, account settings | Review impossible without completed booking; rating updates; duplicate review blocked |
| **7 — Admin Console** | Admin layout + analytics (Recharts), user/provider management, verification queue, reports queue, review moderation, category/profession CRUD | Admin verifies a provider end-to-end, moderates content, and sees correct platform charts |
| **8 — Hardening & Delivery** | Rate limits on all mutations, authz-matrix test pass, skeletons/empty/error states, a11y pass, demo seed data, README + deployment guide (VPS + nginx + Atlas + pm2) | Golden paths browser-verified; docs complete; security checklist signed off |

**Testing approach:** manual scenario checklists executed in the live preview after every phase (using the agent browser), plus `vitest` unit tests for the booking state machine, Zod schemas, and rating calculation. Playwright E2E is deliberately deferred (optional post-MVP) to keep the dependency surface small.

---

## 6. Dependencies

Runtime (exact versions pinned at install; verified stable as of 2026-11):

| Package | Ver | Purpose |
|---------|-----|---------|
| next / react / react-dom | 16.1.x / 19.x | Framework (already scaffolded) |
| mongoose | ^9.12 | ODM, indexes, aggregations |
| better-auth + @better-auth/mongo-adapter | ^1.7 | Auth, roles, sessions |
| zod | ^4.6 | Validation (already present) |
| react-hook-form + @hookform/resolvers | ^7 / ^5 | Forms (already present) |
| socket.io / socket.io-client | ^4.8.4 | Realtime |
| cloudinary | ^2 | Signed image uploads |
| react-leaflet + leaflet + @types/leaflet | ^5 / ^1.9 | Maps (OSM tiles) |
| recharts | ^3 (upgrade from scaffold's 2.x) | Admin/provider analytics |
| next-themes, sonner, lucide-react | present | Theme, toasts, icons |
| nodemailer + @types/nodemailer | ^7 | Email |
| date-fns | ^4 | Dates (present) |
| framer-motion | present | Subtle motion |

Dev: typescript ^5, tailwindcss ^4, eslint ^9, tsx (seed scripts), vitest (optional), prettier + prettier-plugin-tailwindcss.

**Explicitly NOT included (per your "no unnecessary dependencies" rule):** payment SDKs, Redis (interface ready, added when needed), Sentry (structured logging first), Mapbox, Tailwind UI kits beyond shadcn.

---

## 7. Environment Variables (`.env.example`)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Local dev `mongodb://127.0.0.1:27017/marketplace` or Atlas SRV |
| `BETTER_AUTH_SECRET` | Session/token signing secret (generated) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (auth callbacks, emails) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Signed uploads |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Email channel (dev falls back to console) |
| `SOCKET_PORT` | Socket.IO service port (3003 in sandbox) |
| `NEXT_PUBLIC_SOCKET_PATH` | Relative socket path incl. gateway param when applicable |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` / `ADMIN_SEED_SYNC_PASSWORD` | Admin bootstrap on every seed (sync password unless `ADMIN_SEED_SYNC_PASSWORD=false`) |

Secrets live only in `.env` (gitignored); `.env.example` documents every key. No secret is ever imported into client components (enforced by `NEXT_PUBLIC_` discipline).

---

## 8. MVP vs. Future

**MVP (Phases 0–8, exactly the spec's v1):** everything through the admin console — free registration, USD pricing, direct contact, bookings, quotations, cash-on-completion settlement tracked *in the UI* (no payment rails), reviews, verification, moderation, analytics.

**Designed-for, not built (v1.1+):**
- Booking commissions + escrow payments (Booking record already carries final `pricing.amount`; adding a `payment` subdocument is additive)
- Provider subscriptions & featured listings (`FeaturedSlot` collection; search ranking hook already isolated in `search-service`)
- Lead credits, business accounts
- SMS/WhatsApp notifications (notification-service third channel)
- Urdu i18n (next-intl already present)
- Atlas Search relevance upgrade, Redis adapter for Socket.IO + rate limiting, mobile app reusing `/api`

---

## 9. What I need from you

1. Approval (or changes) on ADR-1…ADR-10
2. Confirmation of the phase order
3. A Cloudinary account + SMTP credentials (or agreement to use dev transports until Phase 8)
4. MongoDB: local `mongod` vs. a free Atlas cluster for our shared dev data
