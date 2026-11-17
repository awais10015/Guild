# Database Design — MongoDB Collections

> Version 1.0 · 2026-11-11 · Status: PROPOSED (awaiting approval)
> Conventions: `ref` = ObjectId reference · `ts` = `createdAt`/`updatedAt` via Mongoose timestamps · money = **integer USD** · GeoJSON = `{ type: "Point", coordinates: [lng, lat] }`.

## 0. Collection map

```
user (Better Auth) ─┬─1:1─ customerProfile
                    ├─1:1─ providerProfile ──1:N── service
                    │             │
                    │             └──1:N── verificationRequest
                    ├─1:N── booking ──1:N── quotation
                    ├─1:N── conversation ──1:N── message
                    ├─1:N── review (customer→provider, 1 per booking)
                    ├─1:N── favorite (customer→provider)
                    ├─1:N── notification
                    └─1:N── report (polymorphic target)

category ──1:N── profession      (taxonomy, admin-managed)
```

Better Auth manages its own collections (`user`, `session`, `account`, `verification`) through the MongoDB adapter on the same database. We extend `user` with `role`, `phone` via `additionalFields` (server-set only).

---

## 1. user (managed by Better Auth)

| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | |
| name | string | |
| email | string | unique, lowercased |
| emailVerified | bool | |
| image | string? | Cloudinary URL |
| role | `"customer" \| "provider" \| "admin"` | **additionalField**; default `customer`; settable only by seed/CLI/admin API |
| phone | string? | additionalField; E.164 international format `+14155552671` validated by Zod |
| banned / banReason / banExpires | bool / string? / date? | from admin plugin (suspension) |
| ts | | |

Indexes: `{ email: 1 } unique`. Sessions and accounts live in Better Auth's `session`/`account` collections (indexed by userId, token).

---

## 2. customerProfiles

| Field | Type | Notes |
|-------|------|-------|
| userId | ref user | unique |
| defaultPhone | string? | |
| address | `{ label?, city, area?, street?, coordinates? }` | private; prefills booking address |
| ts | | |

Indexes: `{ userId: 1 } unique`.

## 3. providerProfiles

| Field | Type | Notes |
|-------|------|-------|
| userId | ref user | unique |
| slug | string | unique, public URL: `name-city-xxxx` |
| displayName | string | **denormalized** from user.name for text search + card rendering |
| professionalTitle | string | e.g. "Master Electrician · 12 yrs" |
| bio | string | max 2000 |
| professions | [ref profession] | 1..n |
| categoryIds | [ref category] | derived from professions; denormalized for filtering |
| skills | [string] | max 20 |
| experienceYears | number | 0–60 |
| experienceSummary | string? | |
| languages | [string] | e.g. ["Urdu","English","Punjabi"] |
| phone / whatsapp | string? | public contact (optional per provider) |
| location | `{ country, city, area, coordinates }` | **registered location — public, approximate, never street-level** |
| serviceAreas | `[{ name, city, coordinates, radiusKm }]` | 1..n; where they actually work |
| workingHours | `{ mon…sun: [{ start:"09:00", end:"18:00" }] \| null }` | null = closed |
| isAvailable | bool | manual toggle ("accepting work") |
| portfolio | `[{ url, publicId, caption?, order }]` | max 20 |
| certifications | `[{ title, issuer, year?, documentUrl? }]` | |
| verification | `{ status: "unverified"\|"pending"\|"verified"\|"rejected", verifiedAt? }` | mirrors latest verificationRequest |
| rating | `{ average: number, count: number }` | recomputed on review write |
| stats | `{ profileViews, completedJobs }` | incremented atomically |
| isSuspended | bool | admin moderation |
| ts | | |

Indexes:
- `{ userId: 1 } unique`, `{ slug: 1 } unique`
- `{ location.coordinates: "2dsphere" }`, `{ "serviceAreas.coordinates": "2dsphere" }` (multikey — one provider matches near **any** of their areas)
- `{ professions: 1, "verification.status": 1, isSuspended: 1, isAvailable: 1 }`
- `{ "location.city": 1 }`, `{ "rating.average": -1 }`
- text: `{ displayName, professionalTitle, bio, skills }` (weights: title 10, displayName 8, skills 4, bio 1)

## 4. categories

`{ name, slug (unique), icon (lucide name), description?, order, isActive, ts }`
Indexes: `{ slug: 1 } unique`, `{ order: 1 }`.

## 5. professions

`{ categoryId: ref, name, slug (unique), keywords: [string], isActive, ts }`
Indexes: `{ slug: 1 } unique`, `{ categoryId: 1 }`.
Search note: `keywords` hold Urdu/English synonyms ("hakeem wala", "AC mechanic", "چائے"…) for matching without Atlas Search.

## 6. services

| Field | Type | Notes |
|-------|------|-------|
| providerId | ref user | ownership checks |
| providerProfileId | ref providerProfiles | denormalized for lookups |
| title | string | max 120 |
| description | string | max 5000 |
| categoryId | ref category | denormalized from profession for cheap filters |
| professionId | ref profession | |
| images | `[{ url, publicId }]` | max 8 |
| pricingModel | `"fixed" \| "hourly" \| "starting" \| "custom"` | |
| price | int? | null when `custom`; display label varies by model |
| currency | `"USD"` | constant for now |
| durationHours | number? | estimate |
| usesProfileAreas | bool | default true (inherit provider coverage) |
| areaIds | [number]? | override indexes into provider's serviceAreas |
| isActive | bool | pause/activate |
| stats | `{ views, bookings }` | |
| ts | | |

Indexes: `{ providerId: 1, isActive: 1 }`, `{ professionId: 1, isActive: 1, price: 1 }`, `{ categoryId: 1, isActive: 1 }`, text `{ title, description }`.

## 7. bookings

| Field | Type | Notes |
|-------|------|-------|
| bookingNumber | string | unique, human-readable `BK-YYMMDD-XXXX` |
| customerId / providerId | ref user | |
| serviceId | ref service | |
| description | string | what the customer needs |
| attachments | `[{ url, publicId }]` | max 5 |
| address | `{ contactName, contactPhone, city, area, streetAddress, coordinates? }` | **private — visible only to participants** |
| scheduledDate | date | |
| scheduledTime | string | slot label e.g. `"09:00 – 12:00"` |
| pricing | `{ model, amount?, currency }` | `amount` filled from accepted quotation or service price |
| status | enum: `pending, accepted, quotation_sent, confirmed, in_progress, completed, cancelled, rejected, disputed` | |
| statusHistory | `[{ status, byUserId, at, note? }]` | append-only audit trail |
| activeQuotationId | ref quotations? | |
| conversationId | ref conversations | auto-created with the booking |
| ts | | |

Indexes:
- `{ bookingNumber: 1 } unique`
- `{ customerId: 1, createdAt: -1 }`, `{ providerId: 1, createdAt: -1 }`
- `{ status: 1, scheduledDate: 1 }`
- **Partial unique**: `{ customerId: 1, serviceId: 1, status: 1 }` with `partialFilterExpression: { status: { $in: ["pending","accepted","quotation_sent","confirmed","in_progress"] } }` → database-level guarantee against duplicate open requests.

**Status machine (server-enforced, `booking-service.ts`):**

| From | Allowed to (actor) |
|------|--------------------|
| pending | accepted (provider) · rejected (provider) · cancelled (customer) |
| accepted | quotation_sent (provider) · confirmed (provider, fixed-price) · cancelled (customer/provider) |
| quotation_sent | confirmed (customer accepts quote) · cancelled (customer/provider) |
| confirmed | in_progress (provider) · cancelled (customer/provider, rule-checked) |
| in_progress | completed (provider) · disputed (either) |
| completed | disputed (customer, 48h window) |
| cancelled/rejected/disputed | terminal (disputed → admin resolves to completed or cancelled) |

## 8. quotations

`{ bookingId: ref, providerId, customerId, items: [{ label, amount }], totalAmount: int, laborHours?: number, note?, validUntil: date, status: "sent"\|"accepted"\|"declined"\|"expired"\|"superseded", ts }`
Indexes: `{ bookingId: 1, status: 1 }`, `{ providerId: 1, createdAt: -1 }`.
Rules: creating a new quotation supersedes older `sent` ones; acceptance happens inside a transaction with the booking transition.

## 9. conversations

`{ pairKey: string (sorted user ids), participants: [ref user] (exactly 2, sorted), bookingId?: ref, lastMessage: { body, senderId, at }, unread: { [userId]: number }, isArchived: { [userId]: bool }, ts }`
Indexes: `{ pairKey: 1, bookingId: 1 } unique` — one thread per pair + booking context; `{ participants: 1 }` for inbox listing.
`unread` is a plain Mixed object updated with atomic `$inc` per participant.

## 10. messages

`{ conversationId: ref, senderId: ref, type: "text"\|"image"\|"system", body: string (max 4000), attachments: [{ url, publicId }], readBy: [ref user], createdAt }`
Indexes: `{ conversationId: 1, createdAt: -1 }`, `{ senderId: 1 }`.
Access rule: API + socket handlers verify sender ∈ conversation.participants before any read/write.

## 11. reviews

`{ bookingId: ref (unique), customerId, providerId, serviceId?, ratings: { overall: 1–5, quality, professionalism, communication }, comment: string (max 2000), images: [{ url, publicId }] (max 4), providerReply: { body, at }?, moderation: { status: "visible"\|"hidden"\|"flagged", reason?, by?, at? }, ts }`
Indexes: `{ bookingId: 1 } unique`, `{ providerId: 1, createdAt: -1 }`, `{ "moderation.status": 1 }`.
Rating recalc: single aggregation over `reviews` (`$match providerId + moderation.status=visible` → `$group avg+count` → `$merge` back into providerProfiles.rating).

## 12. favorites

`{ customerId, providerId, ts }` — Index: `{ customerId: 1, providerId: 1 } unique`.

## 13. notifications

`{ userId, type: enum(booking_requested, booking_accepted, booking_rejected, quotation_received, quotation_accepted, booking_status, message_received, review_received, verification_update, announcement), title, body, data: { entityType?, entityId? }, readAt?, emailSentAt?, ts }`
Indexes: `{ userId: 1, createdAt: -1 }`, `{ userId: 1, readAt: 1 }` partial (`readAt: null`) for badge counts. Cap per user (prune > 100 on write).

## 14. verificationRequests

`{ providerProfileId, userId, documents: [{ type: "id_document"\|"license"\|"certificate"\|"business_proof", label, url, publicId }], status: "pending"\|"approved"\|"rejected", submittedAt, reviewedBy?: ref, reviewedAt?, reviewNotes?, history: [{ status, byUserId, at, note? }], ts }`
Indexes: `{ status: 1, submittedAt: 1 }`, `{ userId: 1 }`.
Documents are Cloudinary assets in a private folder type; delivery uses signed URLs, visible **only to the owning provider and admins**.

## 15. reports

`{ reporterId, targetType: "user"\|"provider"\|"service"\|"booking"\|"review"\|"message", targetId, reason: enum(spam, scam, inappropriate, fake_profile, poor_quality, pricing_issue, other), description: string (max 2000), status: "open"\|"investigating"\|"resolved"\|"dismissed", resolutionNote?, handledBy?: ref, handledAt?, ts }`
Indexes: `{ status: 1, createdAt: -1 }`, `{ targetType: 1, targetId: 1 }`.

---

## 16. Data-integrity rules

1. **References**: all refs validated for existence in domain services before writes (cheap `exists` queries).
2. **Denormalization is bounded and justified**: `displayName`, `categoryIds`, `rating`, `lastMessage`, `unread`, `stats` — each has exactly one writer service and a defined recalculation path.
3. **Deletion policy**: providers/services are never hard-deleted while bookings reference them — deactivation/suspension only. Hard delete allowed only for orphans.
4. **Atomicity**: single-document invariants (status transitions, unread counters) via guarded `findOneAndUpdate`; multi-document invariants (quotation accept → booking confirm) via MongoDB transactions.
5. **Indexes** are declared in Mongoose schemas and auto-created at boot; a boot-time check logs missing indexes; seed script verifies the `2dsphere` behavior with a radius query before Phase 3 is signed off.
6. **PII separation**: street addresses live **only** in `bookings.address` and `customerProfiles.address` (private); public surfaces expose city/area approximations only.
