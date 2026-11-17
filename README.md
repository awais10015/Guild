# Guild — hire trusted local professionals, worldwide

Guild is a worldwide local-services marketplace: customers browse verified
electricians, plumbers, AC technicians, cleaners, photographers and tutors,
compare profiles and ratings, book fixed-price services or request custom
quotations, chat in real time, and pay in cash on completion.
All prices are in **USD**; demo data spans cities across six continents.

## Tech stack

| Layer          | Choice |
| -------------- | ------ |
| Web app        | Next.js 16 (App Router, Turbopack, standalone output) + TypeScript + Tailwind CSS 4 + shadcn/ui |
| Realtime       | Pusher Channels (server `pusher` + browser `pusher-js`) — chat, presence, typing, notification push |
| Database       | MongoDB (local `mongod`, single-node replica set `rs0` for transactions) + Mongoose models |
| Auth           | Better Auth (Mongo adapter, email/password, admin plugin, role-based redirects) |
| Maps & search  | Leaflet + OpenStreetMap pins, `$geoNear` distance search, `$text` fuzzy search |
| Images         | Cloudinary signed uploads (graceful local fallback without credentials) |
| Charts         | Recharts (provider analytics, admin overview) |

## Quick start

```bash
# 1. configure
cp .env.example .env          # defaults work for local dev; edit secrets for prod

# 2. infrastructure + app (dev)
npm run dev                   # starts mongod + Next on :3000

# …or production
npm run build                 # compiles, copies static assets into .next/standalone
npm start                     # serves the standalone server on :3000
```

`scripts/start-deps.sh` runs automatically before `dev`: it boots the local
`mongod` (replica set `rs0`) when it is not already listening. Realtime is
provided by Pusher Channels — no extra local service is needed.

On first boot against an **empty** database the app seeds itself
(`AUTO_SEED=true`): 13 categories, 15 professions, 8 demo providers with
services, 2 customers, sample bookings, conversations and reviews.
Re-seed manually with `npm run db:seed`.

## Demo accounts

All demo users share the same password unless you override `DEMO_PASSWORD` in the environment (default `Demo@1234`).

| Role      | Email | Password |
| --------- | ----- | -------- |
| Admin     | `admin@guild.app` | `ADMIN_SEED_PASSWORD` in `.env` (default `Admin@1234`; re-synced on `npm run db:seed` unless `ADMIN_SEED_SYNC_PASSWORD=false`) |
| Customer  | `emily@demo.guild.app` | `Demo@1234` |
| Customer  | `james@demo.guild.app` | `Demo@1234` |
| Provider  | `marcus.reed@guild.app` (electrician, New York) | `Demo@1234` |
| Provider  | `farhan.cooling@guild.app` (AC, Dubai) | `Demo@1234` |
| Provider  | `sparklehome@guild.app` (cleaning, London) | `Demo@1234` |
| Provider  | `dave.lane@guild.app` (plumbing, Toronto) | `Demo@1234` |
| Provider  | `oakline@guild.app` (carpentry, Berlin) | `Demo@1234` |
| Provider  | `arcticpro@guild.app` (HVAC, Singapore) | `Demo@1234` |
| Provider  | `lumina.studio@guild.app` (photography, Sydney) | `Demo@1234` |
| Provider  | `cornerstone.works@guild.app` (renovation, Mumbai) | `Demo@1234` |

Professionals are created by the database seed (not via public sign-up). New accounts from **Register** are customers; they can book any listed provider.

### Demo walkthrough

1. Point MongoDB at the `guild` database (`DB_NAME=guild` and/or `MONGODB_URI` ending in `/guild`).
2. Run `npm run db:seed` (or rely on `AUTO_SEED=true` on first boot).
3. **Customer:** sign in as `emily@demo.guild.app` → **Dashboard** for sample appointments (`BK-SEED-DEMO-*`) → **Messages** for chats (AC confirmed, electrical thank-you, renovation quote thread).
4. **Provider:** sign in as `farhan.cooling@guild.app` → **Provider studio** for requests → **Messages** for the same AC conversation.
5. Book another service from **Find professionals** to create a new live appointment (separate from seed data).

Demo bookings use fixed numbers like `BK-SEED-DEMO-CONFIRMED-AC`; re-running `npm run db:seed` is safe and does not remove real user bookings.

## What's inside

- **Marketplace** — category/profession taxonomy, service listing pages,
  provider profiles with portfolios, verified badges, ratings, favorites.
- **Search** — full-text + filters (city, area, price, pricing model, rating,
  experience, verification) and geo distance search (`?lat=&lng=`) with map pins.
- **Booking state machine** — `pending → accepted → quotation_sent → confirmed
  → in_progress → completed` (+ `cancelled / rejected / disputed`), guarded by
  role-checked transitions and `findOneAndUpdate` atomicity.
- **Quotations** — providers quote line items; customers accept/decline; accepting
  a quote confirms the booking.
- **Realtime messaging** — Pusher Channels (`pusher-js`): private conversation
  channels with persisted messages, image attachments, typing indicators,
  presence, unread counters; server-authoritative REST endpoints.
- **Notifications** — in-app notification center fed by booking/review/chat events,
  pushed live through Pusher with toast alerts.
- **Reviews** — five sub-ratings (quality, punctuality, communication,
  professionalism, value), provider replies, admin moderation.
- **Verification workflow** — providers submit ID/documents; admins
  approve/reject; verified badge gates trust features.
- **Admin console** — users, verification queue, bookings, review moderation,
  reports, category/profession management, platform stats.
- **Privacy by default** — exact street addresses are never shown publicly;
  only city/area-level locations and map pins at coarse precision.

## Project structure

```
src/app/(marketing)      public pages: home, services, professionals, categories
src/app/(auth)           login, register, verify-email, reset-password
src/app/dashboard        customer area        src/app/provider   provider studio
src/app/admin            admin console       src/app/messages   real-time chat
src/app/api/*            REST endpoints (Better Auth at /api/auth/[...all])
src/components/*         UI: marketplace cards, dashboard shells, messaging, shared
src/lib/*                db (Mongoose), auth (Better Auth), pusher server + realtime client, validations (zod)
src/models/*             Mongoose schemas: user, providerprofile, service, booking, …
src/server/services/*    search, notifications, messaging, seeding business logic
scripts/                 start-deps.sh, init-replica.ts, seed.ts
docs/                    database design, architecture decisions, progress log
public/images/demo/      seeded demo portfolio/service images
```

## Environment variables

See `.env.example` — every variable is documented there. Highlights:

- `MONGODB_URI` / `DB_NAME` — Mongo connection (replica set recommended). If the URI has no database path (common on Atlas), set `DB_NAME=guild` so Mongoose and Better Auth use the same database.
- `BETTER_AUTH_SECRET` — session signing key (`openssl rand -hex 32`).
- `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` (server) and
  `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` (browser, inlined at build
  time) — realtime chat, presence and notification push.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — all
  media uploads (portfolio, services, chat attachments, verification documents).
- Without Pusher/Cloudinary keys the app still runs: realtime degrades to
  refresh-on-change and upload endpoints return a clear "not configured" error.

## Troubleshooting

- **`/api/auth` warns "Base URL is not set"** → set `BETTER_AUTH_URL`.
- **Messages send but don't appear live** → check the Pusher env vars; the
  server logs `[pusher] not configured` when realtime events are skipped.
  `NEXT_PUBLIC_PUSHER_*` values are inlined into the client bundle at build
  time — rebuild after changing them.
- **Uploads fail with "Media storage is not configured"** → set the Cloudinary
  env vars (server-side only; no browser keys needed).
- **Port 3000 already in use after a rebuild** → the standalone server renames
  its process to `next-server`, so kill it by PID or `pkill -f next-server`.
- **Seed skipped** → marketplace data already present, or set `AUTO_SEED=false`. On Vercel, production auto-seeds missing categories/providers even when real users exist; run `npm run db:seed` locally against Atlas to populate immediately.
