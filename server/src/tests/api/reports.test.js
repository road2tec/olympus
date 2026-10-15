import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const DailyEntry = require('../../models/DailyEntry');
const WeeklyReport = require('../../models/WeeklyReport');
const Insight = require('../../models/Insight');
const h = require('./helpers');

const BASE = '/api/v1/reports';
// 2026-03-02 is a Monday, 2026-03-08 the Sunday.
const WEEK_START = '2026-03-02';
const WEEK_END = '2026-03-08';
const day = (s) => new Date(`${s}T00:00:00Z`);

const mk = (athleteId, date, over = {}) => ({
  athleteId,
  date: day(date),
  trainingType: 'strength',
  durationMinutes: 60,
  intensity: 5,
  performanceScore: 60,
  feelingScore: 3,
  sleepHours: 8,
  dietNotes: '',
  mealCount: 3,
  ...over,
});

describe('reports API', () => {
  let a;
  let b;
  let empty;

  beforeAll(async () => {
    await h.setupDb();
    a = await h.registerAthlete({ email: 'ra@example.com' });
    b = await h.registerAthlete({ email: 'rb@example.com' });
    empty = await h.registerAthlete({ email: 'rc@example.com' });

    // current week: Mon, Tue, Wed, Fri
    await DailyEntry.insertMany([
      mk(a.user.id, '2026-03-02', { durationMinutes: 60, intensity: 5, performanceScore: 80, sleepHours: 8, feelingScore: 5 }),
      mk(a.user.id, '2026-03-03', { durationMinutes: 90, intensity: 6, performanceScore: 80, sleepHours: 8, feelingScore: 5 }),
      mk(a.user.id, '2026-03-04', { durationMinutes: 30, intensity: 7, performanceScore: 80, sleepHours: 8, feelingScore: 5 }),
      mk(a.user.id, '2026-03-06', { durationMinutes: 60, intensity: 8, performanceScore: 80, sleepHours: 8, feelingScore: 5 }),
      // previous week: 3 entries at performance 60
      mk(a.user.id, '2026-02-23', { performanceScore: 60 }),
      mk(a.user.id, '2026-02-25', { performanceScore: 60 }),
      mk(a.user.id, '2026-02-27', { performanceScore: 60 }),
      // outside both windows: must not leak into aggregation
      mk(a.user.id, '2026-03-10', { durationMinutes: 500, intensity: 10 }),
    ]);
    await Insight.create({
      athleteId: a.user.id,
      date: day('2026-03-06'),
      type: 'needs_attention',
      severity: 'warning',
      title: 'Needs attention',
      message: 'Load up, recovery down.',
      rule: 'LOAD_UP_RECOVERY_DOWN',
    });
  });
  afterAll(h.teardownDb);

  const generate = (token, body) => h.api().post(`${BASE}/generate`).set(h.authz(token)).send(body);

  it('requires auth', async () => {
    expect((await h.api().get(BASE)).status).toBe(401);
    expect((await h.api().post(`${BASE}/generate`).send({})).status).toBe(401);
  });

  it('rejects non-athlete roles', async () => {
    const coach = await h.createUser({ role: 'coach', email: 'coachr@example.com' });
    const res = await h.api().get(BASE).set(h.authz(h.signToken(coach)));
    expect(res.status).toBe(403);
  });

  it('aggregates the week correctly and normalizes any date to Monday', async () => {
    const res = await generate(a.token, { weekStart: '2026-03-05' }); // a Thursday
    expect(res.status).toBe(201);
    const r = res.body.data;
    expect(r.periodStart).toBe(WEEK_START);
    expect(r.periodEnd).toBe(WEEK_END);
    expect(r.metrics.sessions).toBe(4);
    expect(r.metrics.totalDurationMinutes).toBe(240);
    expect(r.metrics.avgIntensity).toBeCloseTo(6.5, 5);
    expect(r.metrics.avgPerformance).toBe(80);
    expect(r.metrics.avgSleepHours).toBe(8);
    expect(r.metrics.totalTrainingLoad).toBe(300 + 540 + 210 + 480);
    expect(r.metrics.daysLogged).toBe(4);
    expect(r.metrics.daysInPeriod).toBe(7);
    expect(r.metrics.missingDays).toEqual(['2026-03-05', '2026-03-07', '2026-03-08']);
    expect(r.metrics.completenessPct).toBeCloseTo(57.1, 1);
    expect(r.metrics.attentionStatus).toBeUndefined();
    expect(r.athleteId).toBeUndefined();
    expect(r.trendClassification.performance.label).toBe('improving');
    expect(r.trendClassification.performance.changePct).toBeCloseTo(33.33, 1);
    expect(typeof r.trendClassification.performance.basis).toBe('string');
    expect(r.attentionEvents).toHaveLength(1);
    expect(r.attentionEvents[0].date).toBe('2026-03-06');
    expect(r.attentionEvents[0].rule).toBe('LOAD_UP_RECOVERY_DOWN');
    expect(typeof r.summary).toBe('string');
    expect(r.summary.length).toBeGreaterThan(10);
    expect(r.generatedAt).toBeTruthy();
  });

  it('upserts without creating duplicates (201 then 200)', async () => {
    const first = await generate(a.token, { weekStart: WEEK_START });
    expect(first.status).toBe(200);
    const third = await generate(a.token, { weekStart: WEEK_END });
    expect(third.status).toBe(200);
    expect(third.body.data.id).toBe(first.body.data.id);
    expect(await WeeklyReport.countDocuments({ athleteId: a.user.id, periodStart: day(WEEK_START) })).toBe(1);
  });

  it('upsert reflects newly added data', async () => {
    await DailyEntry.create(mk(a.user.id, '2026-03-05', { durationMinutes: 30, intensity: 2, performanceScore: 80 }));
    const res = await generate(a.token, { weekStart: WEEK_START });
    expect(res.status).toBe(200);
    expect(res.body.data.metrics.sessions).toBe(5);
    expect(res.body.data.metrics.totalDurationMinutes).toBe(270);
    expect(res.body.data.metrics.missingDays).not.toContain('2026-03-05');
    expect(await WeeklyReport.countDocuments({ athleteId: a.user.id })).toBe(1);
  });

  it('handles a week with no data (null averages, no crash)', async () => {
    const res = await generate(empty.token, { weekStart: WEEK_START });
    expect(res.status).toBe(201);
    const m = res.body.data.metrics;
    expect(m.sessions).toBe(0);
    expect(m.daysLogged).toBe(0);
    expect(m.avgPerformance).toBeNull();
    expect(m.avgRecovery).toBeNull();
    expect(m.avgSleepHours).toBeNull();
    expect(m.missingDays).toHaveLength(7);
    expect(res.body.data.trendClassification.performance.label).toBe('insufficient_data');
    expect(res.body.data.attentionEvents).toEqual([]);
  });

  it('defaults to the current week and rejects invalid dates', async () => {
    const res = await generate(empty.token, {});
    expect([200, 201]).toContain(res.status);
    expect(res.body.data.metrics.daysInPeriod).toBe(7);
    const bad = await generate(empty.token, { weekStart: 'not-a-date' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const bad2 = await generate(empty.token, { weekStart: '2026-02-30' });
    expect(bad2.status).toBe(400);
  });

  it('lists reports newest first with pagination meta, scoped to the athlete', async () => {
    await generate(a.token, { weekStart: '2026-02-23' });
    const res = await h.api().get(`${BASE}?page=1&limit=10`).set(h.authz(a.token));
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.periodStart)).toEqual([WEEK_START, '2026-02-23']);
    expect(res.body.meta.total).toBe(2);
    const other = await h.api().get(BASE).set(h.authz(b.token));
    expect(other.body.data).toEqual([]);
  });

  it('gets own report by id', async () => {
    const list = await h.api().get(BASE).set(h.authz(a.token));
    const id = list.body.data[0].id;
    const res = await h.api().get(`${BASE}/${id}`).set(h.authz(a.token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('returns 404 for another athlete\'s report, a malformed id and an unknown id', async () => {
    const list = await h.api().get(BASE).set(h.authz(a.token));
    const id = list.body.data[0].id;
    expect((await h.api().get(`${BASE}/${id}`).set(h.authz(b.token))).status).toBe(404);
    expect((await h.api().get(`${BASE}/${id}/pdf`).set(h.authz(b.token))).status).toBe(404);
    expect((await h.api().get(`${BASE}/nope`).set(h.authz(a.token))).status).toBe(404);
    expect((await h.api().get(`${BASE}/507f1f77bcf86cd799439011`).set(h.authz(a.token))).status).toBe(404);
  });

  const binaryParser = (res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };

  it('streams a valid PDF attachment', async () => {
    const list = await h.api().get(BASE).set(h.authz(a.token));
    const rep = list.body.data[0];
    const res = await h.api().get(`${BASE}/${rep.id}/pdf`).set(h.authz(a.token)).buffer(true).parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toContain(`olympus-report-${rep.periodStart}.pdf`);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('streams a PDF for a report with no data', async () => {
    const gen = await generate(empty.token, { weekStart: WEEK_START });
    const res = await h
      .api()
      .get(`${BASE}/${gen.body.data.id}/pdf`)
      .set(h.authz(empty.token))
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
