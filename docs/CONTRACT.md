# OLYMPUS — Shared Contract (single source of truth for all agents)

Stack: Node 24 (CommonJS on server), Express, Mongoose, MongoDB (standalone, **no transactions**), React 18 + Vite + Tailwind 3 (ESM on client), Chart.js via react-chartjs-2.
Installed already (do NOT run `npm install` for existing deps; if you need a new package, tell the lead in your final report instead of installing concurrently).

## 1. Ownership (never edit files you do not own; request via your final report)
| Agent | Owns |
|---|---|
| A3 Backend/Auth | `server/src/app.js`, `server.js`, `config/env.js`, `middleware/*`, `routes/index.js`, `routes/{auth,athlete,dailyEntries,twin,insights,admin}.js`, matching `controllers/*`, `validators/*`, `utils/*`, `tests/api/*` (auth/authz/entries API tests) |
| A4 Data | `models/*`, `config/db.js`, `seed/seed.js` |
| A5 Engine | `engine/*`, `services/twinService.js`, `tests/engine/*` |
| A7 Reports/Viz | `services/reportService.js`, `services/pdfService.js`, `controllers/reportController.js`, `routes/reports.js`, `tests/api/reports.test.js`, `client/src/components/charts/*`, `client/src/features/reports/*` |
| A2 Frontend | everything else in `client/` (config, `index.html`, `App.jsx`, `main.jsx`, layouts, pages, auth, services, routes, UI components, features/{auth,athlete,daily-tracking,digital-twin,insights}, dashboard) |
| A6 QA | `server/src/tests/qa/*`, `client/src/**/*.test.jsx`, `docs/TESTING.md`; may fix bugs only after reporting to lead |
| Lead | `docs/*` (except TESTING.md), `PROJECT_STATUS.md`, README, `.env.example`, cross-cutting integration fixes |

`routes/index.js` (A3) mounts: `/auth /athlete /daily-entries /twin /insights /admin` and `require('./reports')` at `/reports`. A7 must export an `express.Router` from `routes/reports.js` using `auth` middleware from `../middleware/auth`.

## 2. Env (server/.env — placeholders in `.env.example`)
`PORT=5000`, `MONGODB_URI=mongodb://127.0.0.1:27017/olympus`, `JWT_SECRET=<min 32 chars>`, `JWT_EXPIRES_IN=2h`, `CLIENT_ORIGIN=http://localhost:5173`, `NODE_ENV=development`, `APP_TIMEZONE=UTC`, `EMA_ALPHA=0.30`.
`config/env.js` exports a frozen object `{port, mongoUri, jwtSecret, jwtExpiresIn, clientOrigin, nodeEnv, timezone, emaAlpha}`; throws if JWT_SECRET missing/short outside `NODE_ENV=test` (tests set a test secret).
Client: `VITE_API_URL=http://localhost:5000/api/v1` (Vite dev server also proxies `/api` → `http://localhost:5000`, so default base URL is `/api/v1`).

## 3. Response conventions
Success: `{ "success": true, "data": <payload>, "meta"?: {page,limit,total,totalPages} }`
Error: `{ "success": false, "error": { "code": "VALIDATION_ERROR"|"UNAUTHORIZED"|"FORBIDDEN"|"NOT_FOUND"|"CONFLICT"|"RATE_LIMITED"|"INTERNAL", "message": "...", "details"?: [{field,message}] } }`
Status codes: 200, 201, 400 (validation), 401, 403, 404, 409, 429, 500. Helpers in `utils/http.js` (A3): `ok(res,data,meta,status)`, `AppError(status,code,message,details)`, `asyncHandler`. A7 imports these.
Pagination query: `?page=1&limit=20` (limit max 100). Dates on the wire: ISO strings; **`date` of a DailyEntry is a calendar day string `YYYY-MM-DD`** (stored as Date at 00:00:00Z of that day; serialized as `YYYY-MM-DD`).

## 4. Auth
`Authorization: Bearer <jwt>`; payload `{sub: userId, role}`; verify signature + expiry; load user from DB each request; reject if `!isActive` (401 `UNAUTHORIZED`, message "Account inactive"). `req.user` = Mongoose user doc (no passwordHash).
Middleware (`middleware/auth.js`): `auth` (require valid token), `requireRole(...roles)`. Athlete-only resources use `requireRole('athlete')` and always scope by `req.user._id` (never by id from client).
Public register creates role `athlete` ONLY (role field in body ignored/rejected). Coach/Admin via seed only. Rate limit on `/auth/*` (disabled when `NODE_ENV=test`).
Safe user shape: `{id, name, email, phone, role, isActive, createdAt}`.
Frontend: token in `sessionStorage` key `olympus_token`; axios interceptor adds header; 401 → clear + redirect `/login`. Role redirect: athlete→`/app/dashboard`, coach→`/coach`, admin→`/admin`.

## 5. Models (A4) — Mongoose, file per model, export the model
- `User`: name(2-80), email(unique, lowercase, trim, valid), passwordHash(select:false), phone(optional), role(enum athlete|coach|admin, default athlete), isActive(default true). timestamps. Method `toSafeJSON()`. Static `User.hashPassword(plain)`/ instance `comparePassword(plain)` (bcryptjs, cost 10; 12 outside test).
- `AthleteProfile`: userId(ref User, unique), sport, category, personalBest(string, optional), goal(string), dateOfBirth(optional), coachId(ref User, optional). timestamps. index userId unique.
- `DailyEntry`: athleteId(ref User), date(Date), trainingType(enum: strength|endurance|speed|skill|recovery|match|other), durationMinutes(int 1–600; **0 allowed only for trainingType `recovery`? NO — min 1**; rest days are simply absent entries), intensity(int 1–10), performanceScore(0–100), feelingScore(int 1–5), sleepHours(0–24), dietNotes(≤500), mealCount(int 0–10). unique index `{athleteId:1,date:1}`; index `{athleteId:1,date:-1}`.
- `TwinState` (latest, one per athlete): athleteId(unique), performance, trainingLoad, recovery, fatigue, adaptation (Numbers), lastEntryDate, version(Number, count of updates), updatedAt. 
- `TwinStateHistory`: athleteId, entryId, date, same metric fields + `dailyTrainingLoad`, `dailyRecovery`, `sequence`. unique `{athleteId:1,date:1}`; index `{athleteId:1,date:-1}`.
- `Insight`: athleteId, entryId(optional), date, type(enum `needs_attention|trend|monitoring|info|insufficient_data`), severity(enum `info|positive|warning|critical`), title, message, contributingFactors(array of `{metric,label,previous,current,changePct,unit}`), rule(string id e.g. `LOAD_UP_RECOVERY_DOWN`), createdAt. index `{athleteId:1,createdAt:-1}`; unique `{athleteId:1,entryId:1}` (partial, one insight per entry).
- `WeeklyReport`: athleteId, periodStart(Date, Monday), periodEnd(Date, Sunday), summary(string), metrics(Object — see §7), trendClassification `{performance,trainingDuration,recovery}` each `{label, changePct, basis}`, attentionEvents(array of `{date,title,message,rule}`), generatedAt. unique `{athleteId:1,periodStart:1}`.

## 6. Engine (A5) — `server/src/engine/` pure functions, no DB/Express imports
Files: `constants.js`, `metrics.js`, `ema.js`, `trends.js`, `attention.js`, `insights.js`, `weekly.js`, `compute.js`, `index.js` (re-exports all).
Constants: `EMA_ALPHA_DEFAULT=0.30`, `SLEEP_TARGET_HOURS=8`, `RECOVERY_WEIGHTS={sleep:0.5,feeling:0.5}`, `TREND_THRESHOLD_PCT=5` (|change| < 5% → stable), `TREND_WINDOW_DAYS=7`, `MIN_DAYS_PER_WINDOW=3`, `ATTENTION_LOAD_RISE_PCT=10`, `ATTENTION_RECOVERY_DROP_PCT=5`.
Signatures (all return plain objects; document formulas in file headers):
- `dailyTrainingLoad(durationMinutes, intensity)` → duration × intensity.
- `recoveryScore(sleepHours, feelingScore)` → sleepComponent=min(sleep/8,1)×100; feelingComponent=(feeling−1)/4×100; 0.5/0.5 weighting; clamped 0–100; rounded 2 dp. Throws RangeError on non-finite.
- `ema(previous, current, alpha)` → `previous==null ? current : alpha*current+(1-alpha)*previous` (first value initializes EMA = current; never substitutes 0).
- `percentChange(previous, current)` → null if previous null/NaN or previous===0 (zero denominator) else `(current-previous)/previous*100`.
- `classifyTrend(prevValues[], currValues[], opts)` → `{label:'improving'|'stable'|'declining'|'insufficient_data', changePct, previousMean, currentMean, previousDays, currentDays, basis:string}`; compares mean of current window vs previous window; insufficient_data when either window has < MIN_DAYS_PER_WINDOW values or change is null.
- `detectNeedsAttention(dailySeries)` where `dailySeries` = `[{date:'YYYY-MM-DD', trainingLoad, recovery}]` sorted asc → `{status:'needs_attention'|'ok'|'monitoring'|'insufficient_data', rule:'LOAD_UP_RECOVERY_DOWN'|null, comparisonPeriod:{previous:{from,to,days},current:{from,to,days}}, triggers:[{metric,previous,current,changePct}], explanation:string, evaluatedAt:ISOString}`. Windows: current = last 7 calendar days ending at last entry date; previous = the 7 days before. Needs data in both windows (≥3 entries each) else `insufficient_data` (if no entries in previous) / `monitoring`. Trigger: load mean change ≥ +10% AND recovery mean change ≤ −5%.
- `deriveFatigueAdaptation({loadEma, recoveryEma, prevLoadEma, prevRecoveryEma, prevFatigue, prevAdaptation})` → `{fatigue, adaptation}` both 0–100. Document: fatigue = clamp(loadIndex×(1−recovery/100)×… ) — define deterministic: `loadIndex = min(loadEma/600,1)*100` (600 = 60min×10 reference ceiling /… document it); `fatigue = clamp(0.6*loadIndex + 0.4*(100-recoveryEma))`; `adaptation = clamp(prevAdaptation + k*(performanceDeltaPositive when recovery>=60) ...)` — A5 may refine, but must be deterministic, bounded 0–100, documented, tested; initial adaptation = 50.
- `computeTwinTimeline(entries, {alpha})` → entries `[{date:'YYYY-MM-DD', durationMinutes, intensity, performanceScore, feelingScore, sleepHours, _id}]` (any order; sorted internally; duplicates by date: last wins). Returns array of states in date order: `[{date, entryId, sequence, dailyTrainingLoad, dailyRecovery, performance, trainingLoad, recovery, fatigue, adaptation}]` (EMA values rounded to 2 dp).
- `generateInsight({timeline, attention, trends})` → `{type, severity, title, message, rule, contributingFactors:[{metric,label,previous,current,changePct,unit}]}` deterministic. Needs-attention message example: "Training load has increased by 18.2% compared with the previous 7 days (… → …), while your recovery score has declined by 9.1% (… → …). Consider discussing your recent training schedule and recovery with your coach. Olympus is a decision-support tool and does not replace a doctor or physiotherapist."
- `analyzeAthlete(entries, {alpha})` → `{timeline, latest, previous, attention, trends:{performance,trainingDuration,recovery}, insight}` (does everything from raw entries — the one function the service uses).
- `weekly.js`: `getWeekRange(dateOrString, tz)` → `{start:'YYYY-MM-DD'(Mon), end:'YYYY-MM-DD'(Sun)}`; `buildWeeklyMetrics(entries, timeline, {start,end})` → `metrics` object (§7) + `attentionStatus`; `buildWeeklySummary(metrics, trends, attentionEvents)` → string.
Timezone: calendar-day strings only; no `Date` local-time arithmetic (use UTC math on `YYYY-MM-DD`).

**twinService.js (A5)** — `async recomputeTwin(athleteId)`: serialized per athlete (in-process promise-chain mutex Map keyed by athleteId), loads all DailyEntries for athlete, runs `analyzeAthlete`, then (a) replaces `TwinStateHistory` docs for athlete (deleteMany + insertMany), (b) upserts `TwinState` (version++), (c) upserts `Insight` for the LATEST entry (one per entry; delete insights for entries that no longer exist — keep insights of other entries intact, but refresh the latest), returns `{twin, previousTwin, insight, attention}`. If athlete has zero entries: removes state/history, returns `{twin:null,...}`. Throws on any failure (callers must not report success). Idempotent, so safe to call after create/edit. Entry deletion not exposed in API (document: restricted to protect history); recompute makes edit correct.
Also exports `getCurrentTwin(athleteId)` → `{current, previous, attention, trends}` (previous = prior history state; attention/trends recomputed from entries so always consistent) and `getTwinHistory(athleteId,{from,to,limit})`.

## 7. Weekly report metrics object (A5 produces, A7 stores/renders)
`metrics = { sessions, totalDurationMinutes, avgIntensity, avgPerformance, avgRecovery, avgSleepHours, totalTrainingLoad, avgDailyTrainingLoad, daysLogged, daysInPeriod:7, missingDays:['YYYY-MM-DD'], completenessPct }` (averages are `null` when no data, never 0). `trendClassification` compares this week vs the previous week's entries using `classifyTrend`. `attentionEvents` = insights with type `needs_attention` whose date falls in the period (from Insight collection).

## 8. REST API (all under `/api/v1`; auth required unless stated)
**Health** `GET /health` (public) → `{success:true,data:{status:'ok',db:'connected'|'disconnected',uptime}}` — mounted at `/api/v1/health`.
**Auth** (public + rate limited) `POST /auth/register {name,email,password(min 8, letter+number),phone?}` → 201 `{user, token}`; `POST /auth/login {email,password}` → `{user, token, expiresIn}`; `GET /auth/me` → `{user, profile|null}`.
**Profile** (athlete) `GET /athlete/profile` → profile or 404 NOT_FOUND `PROFILE_NOT_FOUND`; `POST /athlete/profile {sport,category,personalBest?,goal?,dateOfBirth?}` → 201 (409 if exists); `PATCH /athlete/profile` partial. Response includes populated `coach: {id,name}|null`. `coachId` NOT writable by athlete.
**Daily entries** (athlete) `POST /daily-entries` body `{date:'YYYY-MM-DD',trainingType,durationMinutes,intensity,performanceScore,feelingScore,sleepHours,dietNotes?,mealCount}` → 201 `{entry, twin, previousTwin, insight, attention}`; 409 `CONFLICT` (code `DUPLICATE_DATE`) if date exists; future dates rejected (>today+1 day tolerance none: reject date > today UTC). `GET /daily-entries?page&limit&from&to` (sorted date desc) → list + meta. `GET /daily-entries/:id` (404 if not owner's). `PATCH /daily-entries/:id` (any field except athleteId; date change allowed but must not collide) → 200 same shape as POST; triggers `recomputeTwin`. No DELETE endpoint. Entry saved + recompute: if recompute throws, respond 500 and (for create) roll back by deleting the just-created entry then recompute again best-effort — never claim success on failure.
**Twin** (athlete) `GET /twin/current` → `{twin:{performance,trainingLoad,recovery,fatigue,adaptation,lastEntryDate,version,updatedAt}|null, previous:{...}|null, changes:{performance,trainingLoad,recovery,fatigue,adaptation → {delta,pct}}, attention:{...detectNeedsAttention result}|null, trends:{performance,trainingDuration,recovery}, latestInsight|null, hasData:boolean}`; `GET /twin/history?from&to&limit(default 60, max 365)` → array of history states asc by date.
**Insights** (athlete) `GET /insights?page&limit&type` ; `GET /insights/latest` → insight or `null` data.
**Reports** (athlete; A7) `POST /reports/generate {weekStart?:'YYYY-MM-DD'}` (any date in the week accepted; default = most recent completed-or-current week; normalizes to Monday; **upsert** — regenerates and replaces existing report for that period, returns 201 new / 200 updated) → report; `GET /reports?page&limit` (periodStart desc); `GET /reports/:id`; `GET /reports/:id/pdf` → `application/pdf` attachment `olympus-report-YYYY-MM-DD.pdf` (client downloads via axios `responseType:'blob'` since Authorization header is needed). Ownership enforced → 404 for other athletes' reports. Report JSON: `{id,periodStart,periodEnd,summary,metrics,trendClassification,attentionEvents,generatedAt}` (dates `YYYY-MM-DD` for period fields).
**Admin** (admin only) `GET /admin/users?page&limit&role&q` ; `PATCH /admin/users/:id/status {isActive:boolean}` (cannot deactivate self). Admin routes expose no entry-editing.
**Coach (minimal, optional A3)** `GET /coach/athletes` → athletes whose `AthleteProfile.coachId === req.user._id` (id,name,sport,category,twin summary, attention status); `GET /coach/athletes/:athleteId/twin` → 403/404 unless assigned. Implement if time allows; frontend shows a simple coach panel.

## 9. Frontend (A2 + A7) conventions
Routes: `/` landing, `/login`, `/register`, `/app` (athlete shell): `/app/dashboard`, `/app/log`, `/app/entries`, `/app/twin`, `/app/reports`, `/app/reports/:id`, `/app/profile`; `/coach` (coach list), `/admin` (user mgmt). `ProtectedRoute({roles})`.
Services in `client/src/services/`: `api.js` (axios instance + interceptors, A2), `authService.js`, `athleteService.js`, `entryService.js`, `twinService.js`, `insightService.js` (A2); `reportService.js` (A7: `generateReport(weekStart)`, `listReports(params)`, `getReport(id)`, `downloadReportPdf(id)` → triggers browser download).
A7 exports from `client/src/components/charts/`: `TrendLineChart({labels, datasets:[{label,data,color}], yMin, yMax, height, unit})`, `MetricSparkline`, `TwinHistoryChart({history})` (multi-metric), `DurationBarChart({entries})`; and from `client/src/features/reports/`: `ReportsPage` (default export), `ReportDetailPage` (default export), `ReportCard`. All Chart.js registration in `components/charts/registerCharts.js`.
A2 builds dashboard/twin pages importing A7 charts. Until A7 files exist, A2 must still compile: A7 delivers the chart components FIRST (priority), report pages second. A2 imports `ReportsPage`, `ReportDetailPage` in routes (lazy not required).
UI tokens (Tailwind theme extend in `tailwind.config.js`, A2): colors `ink` (#0A0F1E near-black navy), `navy` (#0F1B3D), `panel` (#131C36), `line` (#24304F), `electric` (#3B82F6), `violet` (#7C5CFF), `mist` (#F4F6FB), semantic `ok #22C55E`, `warn #F59E0B`, `crit #EF4444`. Font: Inter (Google Fonts link in index.html) + `Sora` for headings. Dark app shell, light landing sections. Include the decision-support disclaimer in footer and Digital Twin page.
Toasts: `react-hot-toast`. Icons: `lucide-react`. Forms: `react-hook-form`.

## 10. Testing
Server tests: vitest + supertest, files `server/src/tests/**/*.test.js`; `server/vitest.config.js` (A6 writes): `environment: node`, `fileParallelism: false`, setupFiles sets `NODE_ENV=test`, `JWT_SECRET`, `MONGODB_URI=mongodb://127.0.0.1:27017/olympus_test`. API tests drop the test DB collections in `beforeAll/afterAll`. Engine tests need no DB. Client tests: vitest + jsdom + RTL, `client/vitest.config` inside `vite.config.js` (A2 sets `test: {environment:'jsdom', setupFiles:'./src/test/setup.js', globals:true}`).
`app.js` exports the Express `app` (no listen); `server.js` connects DB + listens. `config/db.js` exports `connectDB(uri)`.

## 11. Seed (A4) credentials (dev only)
`athlete@olympus.demo / Athlete@123`, `coach@olympus.demo / Coach@12345`, `admin@olympus.demo / Admin@12345`. Fictional athlete "Arjun Rao" (sprinter, 100m/200m), coach "Meera Iyer" assigned. ~6 weeks of daily entries ending yesterday (relative to run date, idempotent via upsert on athleteId+date): weeks 1–3 stable; week 4 load up with stable recovery; weeks 5–6 load higher AND recovery declining (triggers Needs Attention in latest window). Seed uses `twinService.recomputeTwin` (A5) after inserting entries, then generates one WeeklyReport via `reportService.generateWeeklyReport(athleteId, weekStartString)` (A7) for the most recent full week and, if available, previous weeks. Seed must `require` services lazily and fail clearly if absent. Refuses to run when `NODE_ENV=production`.
`reportService.generateWeeklyReport(athleteId, anyDateInWeek)` → saved report doc (upsert) — A7 implements.

## 12. Disclaimer text (use verbatim)
"Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach."
