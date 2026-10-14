# Studio North

A full-stack portfolio application for a **fictional** premium barbershop in Portland, Oregon. Includes the approved public website, a server-confirmed demo booking flow, and protected administration. No real appointment, payment, email or SMS is provided. Do not enter real personal information.

## Main features

- Responsive editorial public pages, persistent dark/light themes and accessible navigation with reduced-motion support.
- MongoDB-backed services, fictional barber profiles and Pacific-time availability.
- Six-stage booking with transactional reservations, idempotent retries and limited public confirmation.
- Protected administration for appointments, catalog, profiles and working schedules.
- Explicit isolated synthetic demo administration with guarded transactional reset.

## Screenshots

Screenshots are pending capture; no screenshots are included in this repository yet. Capture Home, Services, Barbers, Gallery, the booking review/confirmation, and synthetic admin overview/appointments/schedules. Use desktop 1440px and mobile 390px, with both themes represented. Keep local captures under ignored `.tools/screenshots/` and use synthetic records only; review images before any later publication.

## Local setup

Use Node **24.21.0 LTS** (see `.nvmrc`) and npm 11. A **MongoDB replica set or compatible Atlas deployment** is required for transactions; startup rejects standalone MongoDB. Local prerequisites and API contracts are in [booking-api.md](docs/booking-api.md).

```sh
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env
# Configure the ignored local environment files and start MongoDB.
npm run seed:dev
npm run dev
```

On PowerShell use `Copy-Item` instead of `cp`; use `npm.cmd` if execution policy blocks `npm.ps1`. Preserve existing local `.env` files. The client is http://127.0.0.1:5173 and the API defaults to port 3000. Check `/api/health` before assuming the API started. The root dev command runs both watchers; a server watcher can remain open after a startup error.

For visitor-accessible synthetic administration, follow the **separate demo setup** in [admin-demo.md](docs/admin-demo.md). Normal mode has password-protected administration; demo entry and reset are disabled. Never expose the ordinary database as a public demo.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Both workspace watchers |
| `npm run lint` | Both workspace ESLint checks |
| `npm run typecheck` | Both strict TypeScript checks |
| `npm run build` | Client production bundle and compiled API |
| `npm run check` | Lint, typecheck and build |
| `npm test` | Database-independent HTTP, startup, validation and scheduling/DST tests |
| `npm run test:integration` | Real transaction, concurrency, authentication and management tests in isolated databases |
| `npm run seed:dev` | Insert-only development catalog/schedules; preserves edits and appointments; disabled in production and demo mode |
| `npm run admin:setup` | Insert-only owner initialization using runtime-only credentials |
| `npm run demo:reset` | Guarded operator initialization/reset of explicitly designated synthetic demo data |
| `npm run dev --workspace client` | Frontend only |
| `npm run dev --workspace server` | API only |
| `npm run start --workspace server` | Compiled API; build first |
| `npm run preview --workspace client` | Local frontend production-build preview |

## Environment

Server configuration is validated before listening. Keep `server/.env` ignored; never put credentials in browser-exposed `VITE_*` variables.

| Variable | Requirement/default |
| --- | --- |
| `PORT` | Required integer 1–65535; normally 3000 |
| `MONGODB_URI` | Required private MongoDB URI |
| `CLIENT_ORIGIN` | Required exact browser HTTP(S) origin, without path or trailing slash; normally `http://127.0.0.1:5173` |
| `BUSINESS_TIMEZONE` | Default `America/Los_Angeles`; use this zone with seeded schedules and the current management UI |
| `BOOKING_LEAD_MINUTES` | Default 60; integer 0–10080 |
| `BOOKING_HORIZON_DAYS` | Default 60; integer 1–365 |
| `BOOKING_RATE_LIMIT_MAX` | Default 10 creation attempts/IP/15-minute window |
| `NODE_ENV` | development, test or production; default development |
| `SESSION_MINUTES` | Default 60; absolute session lifetime, integer 1–480 |
| `SESSION_COOKIE_SECURE` | Defaults true in production, false locally; production explicitly refuses false |
| `DEMO_MODE` | Default false; true requires guarded demo database initialization |
| `DEMO_DATABASE` | Required with demo mode; `studio_north_demo_` plus 1–12 lowercase letters/digits/underscores |
| `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Runtime-only `admin:setup` inputs; no registration/password-change API |
| `DEMO_RESET_CONFIRM` | Runtime-only operator reset input; exact `RESET DEMO` |
| `MONGODB_TEST_URI` | Optional integration-test connection; otherwise uses `MONGODB_URI`, always with a fresh guarded database name |

Client `API_PROXY_TARGET` defaults to `http://127.0.0.1:3000`. Vite development/preview proxy API requests; administration also verifies the actual browser Origin. If reviewing on a different frontend port, set **both** API proxy target and server `CLIENT_ORIGIN` correctly. Production requires HTTPS, API reverse-proxy routing and SPA history fallback; no deployment is included.

## Architecture and behavior

One npm-workspace repository: `client/` uses React, TypeScript, Vite, Tailwind v4, React Router, TanStack Query, React Hook Form and Zod. `server/` uses Express 5, TypeScript, Mongoose, Zod and bcryptjs. `docs/` records contracts, decisions, asset licensing and verification.

Public routes: `/`, `/services`, `/barbers`, `/gallery`, `/book`, and `/book/confirmation/:reference`. `/design-system` stays outside the public layout. `/admin` has overview, appointments, services, barbers and schedules behind server authentication. Unknown routes have intentional NotFound screens.

Services, barbers and opening hours are fetched from MongoDB through TanStack Query. The temporary frontend catalog datasets were removed. Static location/brand metadata remains in `business.ts`. Existing local licensed images and editorial layouts are preserved; see [asset provenance](docs/assets.md).

Booking uses six stages: service, specific/Any Available barber, Pacific date/time, details, review and persisted confirmation. Availability is advisory. Creation revalidates inside a transaction, reserving every covering 15-minute block. Duplicate UI submission is blocked; a UUID idempotency key makes same-payload retries return the original appointment. Conflicts refresh slots and preserve customer inputs. Confirmation lookup never exposes customer contact fields. Appointments store UTC instants; display and recurring hours use America/Los_Angeles.

Administration uses random opaque sessions, HTTP-only SameSite Strict cookies, server-side expiration, CSRF tokens and exact Origin validation. Passwords use bcrypt hashing; login is rate-limited. Status changes reuse the existing domain transaction. Historical service/price snapshots are immutable. Schedule changes that would invalidate active appointments are rejected. All booking/configuration/reset mutations coordinate through one transaction gate, trading throughput for clear low-volume demo safety.

`GET /api/health` returns `{ status, service, timestamp, database: { status, connected } }`, HTTP 200 when connected and 503 otherwise. It is a connection-state probe, not a transaction audit. Startup verifies indexes/replica-set compatibility before listening; graceful shutdown drains requests and disconnects MongoDB.

## Testing and limitations

`npm test` needs no database. Integration tests use `MONGODB_TEST_URI`, otherwise the local `MONGODB_URI`; they override the database name with a fresh guarded random test name and clean up only that exact database. The account needs permissions to create/index/drop isolated test databases. Missing URI is explicitly skipped, not passed; a supplied unreachable/standalone database fails. Never point destructive manual tests at `studio_north`.

See [actual verification results](docs/progress.md) and [admin/demo setup, safeguards and browser checklist](docs/admin-demo.md). Test both themes and widths 320, 390, 768, 1024, 1440 and 1920. Public header/section navigation, hidden desktop scrollbars, stable layout width and reduced motion remain intact. Native mobile and contrast-mode scrolling remain available.

This is a fictional demo, not a production booking service. Pending appointments hold slots until explicitly cancelled; no automated expiration, rescheduling, notifications, payments, customer accounts or real reporting. Appointments view shows the latest 200 matches without pagination. Public demo visitors can edit shared synthetic business data; deliberate reset restores it. Rate limits can be shared behind the development proxy. HTTPS deployment, trusted-proxy policy, real customer retention/security review, backups and operational monitoring are deferred. No cross-browser or screen-reader audit is claimed. Marketing is client-rendered; raw HTML/social crawlers see generic metadata. Stock portraits are not actual employees, gallery imagery is atmosphere reference, and testimonials remain labeled fictional.

Local implementation and GitHub handoff are complete; the application is not publicly deployed. Hosted HTTPS behavior is unverified, and cross-browser and screen-reader coverage is incomplete. No deployment or additional features are included in this handoff.
