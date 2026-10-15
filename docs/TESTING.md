# OLYMPUS Testing and QA

## Commands
- Server unit/API tests: `cd server && npx vitest run` -> 11 files, 129 tests passed.
- Client tests: `cd client && npx vitest run` -> 2 files, 6 tests passed.
- Client build: `cd client && npx vite build` (passed).
- Live run: `cd server && node src/server.js` (port 5000), `cd client && npx vite --port 5174` (5173 was occupied by an unrelated project's Vite, left untouched; the proxy to :5000 was confirmed working via :5174/api/v1/health).

## Live end-to-end results (fresh user against DB `olympus`)
- register 201, login 200 (`expiresIn: 7200`), `/auth/me` 200 (`profile: null`), profile GET 404 with `error.subcode=PROFILE_NOT_FOUND`, profile POST 201.
- 14 daily entries (previous 7 days: 60 min x RPE 6, sleep 8, feeling 4; last 7 days: 80 x 7, sleep 5.5, feeling 2) all 201. The last response had `insight.type=needs_attention`, severity critical, rule LOAD_UP_RECOVERY_DOWN, load +55.6%, recovery -46.4%.
- Duplicate date -> 409 `code=CONFLICT`, `subcode=DUPLICATE_DATE`.
- `/twin/current`: twin, previous, changes {delta,pct}, attention (status, explanation, triggers, comparisonPeriod), trends, latestInsight, hasData. `/twin/history`: 14 states asc. `/insights`, `/insights/latest` OK.
- `POST /reports/generate` 201 (two weeks), `GET /reports/:id` 200, list 200 with meta, `/pdf` 200 `application/pdf`, `attachment; filename="olympus-report-2026-10-12.pdf"`, 4522 bytes, header `%PDF-1.3`.
- Seeded athlete: `needs_attention` present (load +37.9%, recovery -23.4%), 3 reports; coach `/coach/athletes` returns Arjun Rao with `attentionStatus: needs_attention`.

## Security results
- Athlete B reading/patching A's entry: 404; A's report and PDF: 404; B's entries list empty.
- Athlete -> `/admin/users` 403, `/coach/athletes` 403.
- Register with `role: admin` -> 400 (unrecognized key). Weak password 400, duplicate email 409.
- No token / malformed token -> 401. Deactivated user: existing token -> 401, login -> 401 "Account inactive".
- Validation (400 VALIDATION_ERROR) for intensity 0/11, duration 601, performance 101, feeling 6, sleep 25, bad trainingType, future date, malformed date, mealCount 11.
- Rate limiter: auth routes 429 after about 30 requests per 15 min per IP (in-memory).
- passwordHash never appeared in any observed response.

## Frontend/backend shape compatibility
Reviewed services and pages (Dashboard, Twin, AttentionCard, DailyLog, Coach, Admin, Reports) against observed JSON. Client branches on HTTP status (409/400/404), `attention.status`, `changes[k]`, `history[].date`, `{data, meta}` lists, and `/coach/athletes` `attentionStatus`; all match. No mismatches found, no code changes made.

## Not verified
- No browser tool was available. The UI was NOT browser-verified (no rendering, console errors, or visual checks). Only confirmed: Vite serves the page and key modules with HTTP 200, no Vite errors logged, component unit tests and production build pass.
- PDF content/layout was not visually inspected (header and size only).
- Expired-token behaviour tested only via malformed token (expiry is enforced by jsonwebtoken).

## Known limitations / observations
- `/twin/history` returns raw Mongo fields (`_id`, `__v`, `athleteId`, `entryId`) rather than the `id` convention; harmless to the client.
- Rate limiter is in-process memory (resets on restart, not shared across instances); during testing the 30-request cap was hit by the script itself.
- Seeded report for the week of 2026-10-05 has empty `attentionEvents` because insights are only stored for the latest entry per recompute.
- Reports generated for a partial current week compare against sparse previous windows ("3 entries").
