# Olympus — Architecture

## Components
```
React (Vite, Tailwind, Chart.js)  --Bearer JWT-->  Express /api/v1
                                                     |
   routes -> controllers -> (zod validators) -> models (Mongoose) -> MongoDB
                                  |
                       services/twinService  --uses-->  engine/ (pure functions)
                       services/reportService, pdfService (PDFKit)
```
- **Engine** (`server/src/engine`): pure, DB-free functions: daily load, recovery score, EMA, trend classification, Needs-Attention detection, fatigue/adaptation, insight generation, weekly metrics. Formulas are documented in each file header.
- **twinService**: the only place the engine meets the database.
- **Reports**: `reportService` aggregates stored entries into a `WeeklyReport` (Mon–Sun, upsert per athlete+week); `pdfService` streams it as a PDF.

## Data flow: a new daily entry
1. `POST /daily-entries` validates (zod) and saves the entry scoped to `req.user._id`.
2. `twinService.recomputeTwin(athleteId)` runs under a per-athlete in-process lock, loads **all** entries, recomputes the whole timeline, replaces `TwinStateHistory`, upserts `TwinState` (version++), and upserts the `Insight` for the latest entry.
3. If recompute fails, the entry is rolled back and the API returns 500. It never reports success on failure.
4. The response contains the entry, current/previous twin, insight and attention result.

Because the twin is a deterministic function of the stored entries, editing an entry (PATCH) simply recomputes the same way, so history stays correct. Deleting entries is deliberately not exposed.

## Consistency note
The configured MongoDB may be standalone (no transactions). Consistency comes from (a) full deterministic recompute, (b) the per-athlete lock, (c) rollback on failure. The lock is in-process, so a multi-instance deployment would need a distributed lock or replica-set transactions (known limitation).

## Metrics (simplified project models, not physiological measurements)
- Daily training load = duration (min) × intensity.
- Recovery = 50% sleep (hours/8, capped) + 50% feeling ((score−1)/4), 0–100.
- EMA: `new = α·current + (1−α)·previous`, α = 0.30, first value initializes the EMA.
- Needs Attention: mean load up ≥ 10% **and** mean recovery down ≥ 5%, last 7 days vs the previous 7, ≥ 3 entries per window; otherwise ok / monitoring / insufficient data.

## Security
bcrypt hashing, JWT (HS256, expiry, user reloaded per request, inactive blocked), role middleware, ownership scoping on every athlete resource, strict zod schemas (no mass assignment), Helmet, restricted CORS, auth rate limiting, centralized safe errors.
