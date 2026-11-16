# Project Progress Tracker

> Living document — updated at the end of every work session.
> Legend: [ ] not started · [~] in progress · [x] done · [!] blocked

## Phase 0 — Foundation
- [ ] Environment init (done: sandbox scaffold verified — Next 16.1.1, Tailwind 4, shadcn/ui)
- [ ] MongoDB availability spike (local mongod vs mongodb-memory-server vs Atlas)
- [ ] Remove Prisma scaffold; Mongoose connection + env handling (`lib/db.ts`)
- [ ] Install runtime deps (mongoose, better-auth + mongo adapter, socket.io, cloudinary, leaflet, nodemailer, recharts 3)
- [ ] Tailwind 4 theme tokens (brand palette, dark mode), typography
- [ ] Layout shell: navbar, footer, theme toggle, homepage skeleton
- [ ] `.env.example` + secrets hygiene
- [ ] DoD: app boots, DB connects, homepage renders light+dark, lint clean

## Phase 1 — Data & Auth
- [ ] 14 Mongoose models + indexes (`src/models/`)
- [ ] Better Auth config (Mongo adapter, email verification, password reset, admin plugin)
- [ ] Route middleware + role guards (`lib/guards.ts`)
- [ ] Register/login/logout UI, verify-email, forgot/reset password
- [ ] Role-select onboarding wizard (customer / provider)
- [ ] Admin bootstrap seed
- [ ] DoD: both roles register→verify→login; protected routes bounce; role immutable from client

## Phase 2 — Profiles & Services
- [ ] Provider profile editor (all spec fields, service areas + map picker)
- [ ] Cloudinary signed uploads + `image-uploader` component
- [ ] Service CRUD (4 pricing models, pause/activate/delete)
- [ ] Public provider profile page (read-only view)
- [ ] DoD: provider publishes profile + services; privacy rules verified

## Phase 3 — Search & Discovery
- [ ] Search service (text + $geoNear + filters + 6 sorts + pagination)
- [ ] Homepage category browse + featured
- [ ] Results page: URL-state filters, sort, pagination, map view
- [ ] DoD: nearest sort distance-ordered; filters correct; map pins correct

## Phase 4 — Bookings & Quotations
- [ ] Booking state machine service + tests
- [ ] Booking request dialog, per-role lists/detail, status timeline
- [ ] Quotation send/accept/decline (transactional)
- [ ] Notifications (in-app + email)
- [ ] DoD: full lifecycle demo; invalid transitions 4xx; duplicate open request blocked

## Phase 5 — Messaging
- [ ] socket-service (mini-service, port 3003) + session handshake
- [ ] Conversations UI, attachments, presence, unread counts
- [ ] Notification bell + badge counts
- [ ] DoD: two-browser realtime chat verified; non-participants rejected

## Phase 6 — Trust & Accounts
- [ ] Reviews (eligibility-gated) + rating recalc + provider reply
- [ ] Favorites, reports, notification preferences, account settings
- [ ] DoD: review rules enforced; ratings update; duplicate review blocked

## Phase 7 — Admin Console
- [ ] Admin layout + analytics (Recharts)
- [ ] Users/providers management, verification queue, reports queue, review moderation
- [ ] Category/profession CRUD
- [ ] DoD: end-to-end verification by admin; platform charts correct

## Phase 8 — Hardening & Delivery
- [ ] Rate limiting on all mutations; authz matrix test pass
- [ ] Skeletons, empty states, error boundaries, a11y pass
- [ ] Demo seed data; README + deployment guide (VPS/nginx/Atlas/pm2)
- [ ] DoD: golden paths browser-verified; security checklist signed off

## Decision log
| Date | Decision |
|------|----------|
| 2026-11-11 | Architecture proposed (see ARCHITECTURE.md v1.0) — awaiting approval |
