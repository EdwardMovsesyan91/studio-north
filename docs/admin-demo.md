# Administration and safe demonstration

## Owner setup (normal mode)

Configure the ignored server environment and seed the fictional development catalog with `npm run seed:dev`. `DEMO_MODE` defaults false: visitor demo entry/reset remain forbidden. Initialize the **one** owner with `npm run admin:setup`, using runtime `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` (12–72 characters, at most 72 UTF-8 bytes). The command hashes with bcrypt cost 12 and uses insert-only upsert: rerunning never changes existing credentials. There is no public registration or password-change endpoint.

PowerShell example, without writing the password into source, documentation or shell history:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Administrator email'
$adminPassword = Read-Host 'Initial password' -AsSecureString
$env:ADMIN_INITIAL_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
try { npm.cmd run admin:setup }
finally {
  Remove-Item Env:ADMIN_INITIAL_PASSWORD
  Remove-Item Env:ADMIN_EMAIL
  $adminPassword = $null
}
```

Start the API/client and open `/admin`. Use an operator-controlled secret, never shared portfolio credentials. No owner is silently created during ordinary startup. Credential recovery is a deliberate operator/database task outside the visitor interface.

## Explicit synthetic demo mode

For public portfolio exploration use **a separate database**, never `studio_north`. `DEMO_DATABASE` must match `studio_north_demo_[a-z0-9_]{1,12}` and takes precedence over the URI database name in demo startup/setup/reset. The original URI and ordinary database are not changed.

Initialize while no demo API is serving the new database:

```powershell
$env:DEMO_MODE = 'true'
$env:DEMO_DATABASE = 'studio_north_demo_portfolio'
$env:DEMO_RESET_CONFIRM = 'RESET DEMO'
try { npm.cmd run demo:reset }
finally { Remove-Item Env:DEMO_RESET_CONFIRM }
npm.cmd run dev
```

These variables live in this shell; alternatively set the nonsecret DEMO_MODE/DEMO_DATABASE in the ignored local server environment. For normal mode later, remove the runtime overrides or set DEMO_MODE=false. Do not run seed:dev in demo mode; it refuses rather than touching the ordinary URI database.

The operator command refuses a wrongly named database, missing confirmation or an unmarked database already containing appointments. On an empty guarded database it sets the persistent `BookingState.demoDesignated` marker and initializes synthetic data. Demo startup refuses to listen without this marker. Initialization/reset is never automatic in normal application startup.

In initialized demo mode `/admin` offers **Enter demo administration**, and the public footer provides the real demo-admin link. The server grants an expiring `demo` session, not owner credentials. It can manage only the selected synthetic database and the explicitly implemented business operations. There are no database-selection, credential-change, user-management, upload or arbitrary database endpoints. Normal-mode API processes reject demo sessions/entry/reset even if a browser sends a valid-shaped cookie.

**Privacy:** demo booking input is validated, then name/email/phone are replaced with `Demo Visitor`, `visitor@studio-north.invalid`, and no phone before persistence. Visitors are also told not to enter real details. Neither public confirmation nor catalogs include customer contact fields. Public owner-enabled normal mode should never be published as the visitor demo; it retains validated customer inputs for its private dashboard.

## Deliberate reset and concurrency

The admin reset button requires a browser confirmation, followed by server `{ "confirmation":"RESET DEMO" }`, session, CSRF token, correct Origin, demo flag, guarded database name and designation marker. It is rate-limited to three requests/IP/15-minute window. Operator CLI confirmation is likewise explicit. Neither path drops a database.

One snapshot/majority transaction replaces only Service, Barber, WorkingSchedule, Appointment and OccupancyBlock collections in the designated demo database. Credentials, sessions, abuse counters and booking state survive. It restores five catalog services, three sample barbers, business/barber schedules and three synthetic appointments (future pending/confirmed and past completed). Fixture dates are derived from the reset's Pacific calendar date; repeated resets on that date give the same fixture references/counts. Internal MongoDB IDs/timestamps may differ. Predictable fixture references reveal synthetic fixture details only; visitor appointment references remain cryptographically random.

Booking creation, status changes, catalog changes, schedule changes and reset first update the same BookingState document inside their transactions. This serializes overlapping mutations across API instances; transient write conflicts retry through Mongoose. A booking committed before reset is deliberately cleared; one committed after reset remains. Tests verify there are no orphan blocks or partial reservations when booking races reset. This favors safety over high throughput and is appropriate for this low-volume single-business demo.

## Session and request policy

- Random 256-bit opaque cookie token; only SHA-256 hash stored in MongoDB. Fresh login rotates the session and revokes the prior cookie's session.
- Cookie `sn_admin`: HttpOnly, SameSite=Strict, Path=/api/admin, explicit max-age; Secure defaults true in production and cannot be explicitly false there. Local HTTP development uses false. Production requires HTTPS.
- Absolute session expiration is checked on every request; TTL is cleanup, not authorization. Logout deletes the session and expires the cookie. Client clears cached private queries on logout/session failure and checks expiration periodically; server remains authoritative.
- Every private endpoint requires a valid session. Mutations additionally require exact `Origin == CLIENT_ORIGIN` and timing-safe `X-CSRF-Token` comparison. Login/demo-login require the allowed Origin too. Frontend receives its CSRF token from authenticated session JSON.
- Login: five attempts/IP/fixed 15-minute window. Demo entry: ten. Creation: BOOKING_RATE_LIMIT_MAX, default ten. Counters are shared through MongoDB. Reverse-proxy client-IP policy is deliberately not guessed; Express trust proxy remains disabled.
- Admin responses use no-store. Private API records include customer details/internal IDs only after authorization. There is no CORS relaxation or client-only security guard.

## Admin API contracts

All paths below are under `/api/admin`. Errors use `{ error:{ code,message } }`; invalid input 400, unauthenticated 401, rejected Origin/CSRF/demo restrictions 403, missing records 404, unsafe transitions/schedule conflicts/duplicate slugs 409, rate limits 429. API requests are bounded to 16 KiB.

| Method/path | Contract |
| --- | --- |
| POST `/login` | Strict `{email,password}`; allowed Origin; sets cookie and returns `{authenticated:true,scope,csrf,expiresAt}` |
| POST `/demo-login` | Strict `{}`; initialized demo only; same session contract with scope demo |
| GET `/session` | Protected session contract |
| POST `/logout` | Protected + CSRF; revokes session/cookie; `{authenticated:false}` |
| GET `/overview` | `{counts:{pending,confirmed,completed,cancelled},revenueCents,upcoming,fictionalDemo:true}`; revenue is sum of completed saved price snapshots, no payment claim |
| GET `/appointments?date=&status=` | Optional valid Pacific YYYY-MM-DD and status; `{appointments:[...]}` newest 200, including protected contacts and snapshot fields |
| POST `/appointments/:reference/status` | Strict `{status:"confirmed"|"cancelled"|"completed"}`; validated domain transition and atomic cancellation |
| GET `/services` | All active/inactive raw admin records, `{services:[...]}` |
| POST `/services` | Strict service input; stable new ID derived from slug; 201 `{service}` |
| PUT `/services/:id` | Same input, preserves ID and appointment snapshots |
| GET `/barbers` | All profiles, `{barbers:[...]}` |
| PUT `/barbers/:id` | Strict profile input; existing local portrait path or null; unique nonempty supported service IDs must exist |
| GET `/schedules` | `{schedules:[...]}`, business and barber records |
| PUT `/schedules/:barberId` | Strict `{timezone,hours,timeOff}`; barber schedule only; returns `{schedule}` |
| POST `/reset` | Strict `{confirmation:"RESET DEMO"}`; guarded synthetic reset, returns `{reset:true,fictionalDemo:true}` |

Service input: name, slug, description, durationMinutes (15–480, multiple of 15), priceCents (integer 0–1,000,000), isActive, displayOrder (integer 0–10,000). Barber input: name, slug, title, biography, specialty, portrait, supportedServiceIds, isActive. Portrait choices are the three existing attributed assets; no uploads/hotlinked replacements.

Schedule input: America/Los_Angeles, exactly seven unique weekday entries `{day:0..6,periods:[{opens,closes}]}` with at most four disjoint same-day minute intervals, plus up to 100 UTC Z `{startsAt,endsAt}` exceptions. Intervals must have positive duration; working periods must lie within the business schedule. Exceptions can overlap because their union is unavailability. Upcoming/ongoing pending or confirmed appointments must still fit after the change; otherwise the entire update is rejected with EXISTING_BOOKING. Use saved appointment elapsed duration when checking, not a newly edited service duration. Completed/cancelled history is preserved. The UI views business hours but edits only barber schedules. UTC exception inputs show Pacific review text.

## Verification and remaining limits

Run `npm run check`, `npm test`, `npm run test:integration`. Integration tests use fresh exact random `studio_north_test_<16hex>` (booking) and `studio_north_demo_<12hex>` (admin) databases; cleanup checks the exact name before drop. No-URI suites explicitly skip. A supplied unreachable database fails, not passes. CLI setup and missing-demo-marker startup are covered against real isolated databases.

Browser checklist: complete specific and Any Available journeys, closed date, real competing-slot conflict, one POST after rapid confirm clicks, server-confirmed reference privacy, owner/demo login/logout, status/filter/details and terminal rejection, catalog/profile changes, working hours/time off, deliberate reset, themes, keyboard focus, six widths, header motion, Back/Forward and section scrolling. Development and production-preview results are in progress.md. Browser harnesses/screenshots are local ignored tooling, not application dependencies.

Known limits: no deployment/HTTPS browser session was performed; Secure defaults/configuration are tested, not actual hosted HTTPS. Chrome-only automated review, no screen-reader/full WCAG audit. No pending-hold auto-expiry, reschedule, notification, payment, customer account, password-management, audit export or pagination beyond newest 200 records. There is one business and one owner role. Portfolio demo sessions share synthetic changes and can disrupt one another deliberately; resets make recovery possible but are not sandbox-per-visitor. Operational production security/retention/backups/trusted proxies require a separate review.
