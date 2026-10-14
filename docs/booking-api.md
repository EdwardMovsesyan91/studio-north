# Fictional booking API

All bookings are **portfolio demonstration records**. No real appointment, email, SMS, payment or customer account is created. The client now provides the complete booking flow and protected administration; see [admin contracts, setup and demo safeguards](admin-demo.md).

## Setup and commands

Use Node 24.21+ within the documented Node 24 range and npm 11. Configure the ignored `server/.env`, then:

```sh
npm run build
npm run seed:dev
npm run start --workspace server
npm test
npm run test:integration
```

`seed:dev` loads the five existing services and three fictional barbers, using the original string IDs. Dollars convert to integer cents (4500, 5500, 3000, 7000, 9000), with durations 45, 60, 30, 75, 90 minutes. Descriptions, biographies and local portrait references match the existing frontend. Insert-only upserts preserve existing content, timestamps, schedules, exceptions, appointments and unrelated records. The command can be rerun after partial failure; it never resets data. It is disabled with NODE_ENV=production. It does not overwrite edited records or automatically activate inactive records.

A **replica set or compatible managed deployment** is required, including locally. A standalone `mongod` can serve catalog data but cannot run booking transactions; API startup rejects it. For local development start MongoDB with `--replSet rs0 --bind_ip localhost`, initiate `rs0` with `mongosh`, and use a URI such as `mongodb://127.0.0.1:27017/studio_north?replicaSet=rs0`. Atlas is an alternative; keep its URI private. Ensure the database account can create required indexes.

Integration tests use MONGODB_TEST_URI when supplied, otherwise MONGODB_URI loaded from server/.env. Booking tests override the database name with fresh `studio_north_test_<16 random hex digits>`; administration tests use fresh `studio_north_demo_<12 random hex digits>`. Neither uses the development database. The account needs create/index/drop permission for that isolated database. Cleanup checks the exact generated name and prefix before dropping it. A disconnected or standalone deployment fails the integration run; no URI produces an explicit skipped test, not a pass. No destructive resets are run against development data.

## Configuration

| Variable | Default | Rule |
| --- | --- | --- |
| BUSINESS_TIMEZONE | America/Los_Angeles | Valid IANA zone; stored schedules must agree with this configuration |
| BOOKING_LEAD_MINUTES | 60 | Integer 0–10080; zero still excludes past/current instants |
| BOOKING_HORIZON_DAYS | 60 | Integer 1–365; appointment end must fit within this rolling UTC horizon |
| BOOKING_RATE_LIMIT_MAX | 10 | Integer 1–1000 booking attempts per IP per fixed 15-minute window |

PORT, CLIENT_ORIGIN and MONGODB_URI remain required. No credentials are sent to browsers or logged. Origin and deployment proxy behavior remain as documented in README; same-origin API proxy/reverse-proxy use is expected.

## Persisted data and indexes

- **Service:** original string `_id`, unique slug, name/description, durationMinutes, integer priceCents, isActive, displayOrder, timestamps. Active/order index supports the catalog.
- **Barber:** original string `_id`, unique slug, name/title/biography/specialty, nullable portrait, supportedServiceIds, isActive, timestamps. Active/service index supports eligible-barber queries. All seeded barbers support all five services; eligibility is explicit and can later be restricted.
- **WorkingSchedule:** one business document and one document per barber, each with explicit timezone, seven weekday entries and local opening/closing minutes (Sunday=0), plus UTC half-open timeOff intervals. Empty period arrays mean closed; disjoint periods support breaks. Closing follows opening; periods cannot overlap. Unique `(kind, barberId)` index ensures one schedule per subject. Overnight work is not supported; split policies need a future reviewed change.
- **Appointment:** random 192-bit/32-character base64url reference with unique index; service/barber IDs, customer name/email/optional phone, UTC startsAt/endsAt, pending/confirmed/cancelled/completed status, immutable service-name and cents-price snapshots, timestamps. `(barberId,status,startsAt,endsAt)` index supports occupied-interval reads. Customer fields remain server-side.
- **OccupancyBlock:** appointment ObjectId, barberId and 15-minute UTC start. Unique `(barberId,startsAt)` named `unique_barber_slot` is the concurrency gate. Appointment-ID index supports cancellation. Blocks have no TTL: completed appointments retain their time.
- **BookingRateLimit:** shared atomic counter keyed by a hash of IP/window, with TTL expiry. This is abuse control, not an appointment/customer model.

Startup adds/verifies declared indexes before listening, without dropping any existing index (`syncIndexes` is not used). Catalog and schedule seeding is explicit, not automatic during startup. Missing/mismatched business configuration returns 503; do not change the environment timezone without deliberately migrating the stored schedules.

## Seeded working hours

All times are local America/Los_Angeles wall-clock values; Portland observes that zone.

| Subject | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Business | 09–19 | 09–19 | 09–19 | 09–19 | 09–19 | 10–17 | Closed |
| Adrian Cole | 09–17 | 09–17 | 09–17 | 09–17 | 09–17 | 10–15 | Closed |
| Marcus Bennett | Closed | 11–19 | 11–19 | 11–19 | 11–19 | 10–17 | Closed |
| Elias Reed | 10–18 | 10–18 | Closed | 10–18 | 10–18 | 10–17 | Closed |

These are fictional scheduling defaults, not claims about photographed people. The normal insert-only development seed creates no appointments. Explicit guarded demo initialization/reset creates three synthetic appointments in the separate designated demo database only.

## Scheduling and transaction behavior

The domain engine intersects business and barber periods, service duration, both subjects' time off, active appointments, minimum lead time and rolling horizon. Half-open intervals allow adjacency. Cancelled appointments do not occupy availability; pending, confirmed and completed appointments do. Services/barbers must be active and supported. Starts align to 15-minute UTC boundaries (also local quarter-hours in the Pacific zone).

Availability enumerates real UTC instants and projects them through Node's IANA/Intl timezone data into the requested local date. Spring-forward missing times never appear; fall-back repetitions have distinct UTC starts. Every occupied minute must remain inside one working period, including DST changes. Duration is elapsed time in minutes, not naive wall-clock arithmetic. Clients must submit the returned UTC instant, not independently reconstruct it from a clock label. Slots are advisory snapshots; booking rechecks everything authoritatively.

Creation tries eligible barbers in deterministic ID order (not random or load-balanced). Each attempt uses a MongoDB snapshot transaction and majority write concern. Inside the transaction, it rereads service, barber, schedules and active overlap; inserts every covering occupancy block, then the appointment. The domain also reserves partial final blocks for legacy durations; new admin-created durations must be multiples of 15. The database unique index arbitrates simultaneous reservations across Node processes. Genuine occupancy conflicts return 409; unrelated reference/index or infrastructure failures are not mislabeled as slot conflicts. The Mongoose transaction helper handles transient transaction retries. Any Available may try another eligible barber after an aborted conflict, with no partial reservation retained.

`changeAppointmentStatus()` is the shared domain operation used by the protected admin status endpoint; it is never exposed without authorization. Pending can confirm/cancel; confirmed can complete/cancel; terminal statuses cannot reopen. Cancellation saves status and removes all blocks in one transaction. Confirm/complete preserve blocks. No public unauthenticated mutation or fabricated customer authorization is introduced. Admin cancellation calls this operation rather than editing documents directly.

## Public endpoints

All responses are JSON, non-cacheable and explicitly marked fictional. Monetary values are integer USD cents. Public endpoints expose no database URI, stack, raw MongoDB `_id` or customer contact details. Authorized admin responses include internal record IDs and private contact fields. Unknown fields are rejected instead of silently accepted.

### GET /api/services

No query parameters required. Returns `{ fictionalDemo:true, currency:"USD", services:[{ id,name,slug,description,durationMinutes,priceCents,isActive,displayOrder }] }`, active only, ordered by displayOrder/id.

### GET /api/barbers

Returns `{ fictionalDemo:true, barbers:[{ id,name,slug,title,biography,specialty,portrait,supportedServiceIds,isActive }] }`, active only. Portraits are existing local reference paths, not a claim that stock subjects are employees.

### GET /api/availability

Strict query: `serviceId` (required stable string ID), `date` (required valid YYYY-MM-DD **business-local date**), `barberId` (specific ID or `any`, defaults to `any`). No other query fields allowed.

```sh
curl 'http://127.0.0.1:3000/api/availability?serviceId=classic-cut&date=2026-10-22&barberId=any'
```

Replace the example date with a date inside the current horizon. Response:

```json
{
  "fictionalDemo": true,
  "serviceId": "classic-cut",
  "date": "2026-10-22",
  "timezone": "America/Los_Angeles",
  "slots": [{ "startsAt": "2026-10-22T16:00:00.000Z", "endsAt": "2026-10-22T16:45:00.000Z", "localTime": 540, "barbers": [{ "id": "adrian-cole", "name": "Adrian Cole" }] }],
  "emptyReason": null
}
```

`localTime` is minute-of-day (540=09:00), for presentation only; startsAt is authoritative. Empty slots return `NO_AVAILABLE_SLOTS` or `NO_ELIGIBLE_BARBERS`, not fake times. Unknown/inactive service/barber returns 404; a specific barber that cannot perform the service returns 400. Out-of-horizon dates return 400.

### POST /api/appointments

Strict JSON body (16KiB maximum):

```json
{
  "serviceId": "classic-cut",
  "barberId": "any",
  "startsAt": "2026-10-22T16:00:00.000Z",
  "customer": { "name": "Fictional Demo", "email": "demo@example.invalid", "phone": "+15035550100" }
}
```

Use a currently returned availability instant rather than assuming this sample remains bookable. Phone is optional (omit it if empty); whitespace/parentheses/hyphens normalize away, then 7–15 digits with optional leading + are required. Name is trimmed/NFC-normalized, 2–100 characters without control characters. Email is trimmed/lowercased and validated, max254. startsAt must be a UTC Z timestamp on a 15-minute boundary. Client price, duration, end, status and reference fields are never accepted.

Only after commit returns **201** `{ appointment:{ reference,serviceId,barberId,startsAt,endsAt,status,serviceName,priceCents,currency,fictionalDemo }, timezone }`. Initial status is pending. The assigned barber is always concrete, including Any Available. No name/email/phone is echoed. The reference is random and unique, not a guessable appointment ID.

### GET /api/appointments/:reference

Requires the 32-character base64url reference. Returns the same limited appointment DTO plus timezone, never name/email/phone, internal ID or audit timestamps. This is a limited public confirmation lookup, **not** authentication or a private access token. Anyone holding the reference can see the booking time, service, barber, status and snapshot price. More private customer data would require separate scoped authorization in a future milestone.

### Errors and abuse limits

Envelope `{ error:{ code,message } }`:

| HTTP | Examples |
| --- | --- |
| 400 | INVALID_REQUEST, UNSUPPORTED_SERVICE, DATE_OUT_OF_RANGE, OUTSIDE_BOOKING_WINDOW, INVALID_JSON |
| 404 | SERVICE_NOT_FOUND, BARBER_NOT_FOUND, APPOINTMENT_NOT_FOUND, NOT_FOUND |
| 409 | SLOT_CONFLICT; internal status operation INVALID_STATUS_TRANSITION |
| 413 | PAYLOAD_TOO_LARGE |
| 429 | RATE_LIMITED, Retry-After:900 |
| 503 | SCHEDULE_UNAVAILABLE |
| 500 | INTERNAL_ERROR, generic response and value-free server log |

Valid-shaped creation attempts consume a shared database counter even if the slot is invalid/unavailable. Strict malformed requests fail before counter access. Counter increments are atomic across API processes and fixed windows expire logically even if MongoDB TTL deletion is delayed. Express leaves trust proxy disabled; production must explicitly configure known proxies before relying on original-client IPs. Development proxy traffic may share a loopback quota. No distributed application-memory limiter or new dependency is used.

## Administration, idempotency and current limitations

The public marketing catalog and business hours now query these API contracts through TanStack Query; there are no parallel permanent client service/barber/hour datasets. [Admin documentation](admin-demo.md) specifies authentication, protected CRUD/status/schedule/reset contracts and operator commands.

POST /api/appointments accepts an optional UUID `Idempotency-Key` header. A unique sparse appointment index plus normalized request hash makes exact retries return the original limited DTO; a changed payload returns 409 IDEMPOTENCY_CONFLICT. This also works across transaction retries/processes. Client UUIDs are retained for an unchanged submission and replaced when details change. Rate-limit attempts still count, including retries. In demo mode inputs are validated then customer contact fields are replaced before persistence/hash comparison.

BookingState is a shared transaction write gate for create, status, catalog, barber schedule and reset mutations. Every writer enters it before authoritative reads; occupancy uniqueness remains enforced. This deliberately serializes low-volume mutations across instances. Reset is limited to a specifically named and operator-designated synthetic database; a concurrently created booking persists only if it commits after reset. No orphan occupancy can be left.

GET /api/business returns `{fictionalDemo:true,timezone,currency,hours,leadMinutes,horizonDays,demoMode}`, with hours read from the business schedule. It returns 503 for missing/mismatched schedule configuration rather than fixture defaults. The current frontend/management timezone is explicitly America/Los_Angeles and currency USD.

No customer accounts, payments, real notifications, rescheduling, retention policy or automatic pending-hold expiry. Pending holds persist until authorized cancellation/reset. No business-hours editor, overnight schedule support or barber load balancing. Portfolio demo visitors share synthetic changes. Deploying as a real booking service requires a separate security/operations review; no deployment was performed.
