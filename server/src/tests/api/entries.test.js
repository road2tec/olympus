import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const DailyEntry = require('../../models/DailyEntry');
const h = require('./helpers');

const BASE = '/api/v1';

describe('daily entries API', () => {
  let a;
  let b;
  beforeAll(async () => {
    await h.setupDb();
    a = await h.registerAthlete({ email: 'ea@example.com' });
    b = await h.registerAthlete({ email: 'eb@example.com' });
  });
  afterAll(h.teardownDb);

  const post = (token, body) => h.api().post(`${BASE}/daily-entries`).set(h.authz(token)).send(body);
  const dayDate = (s) => new Date(`${s}T00:00:00Z`);

  it('requires auth', async () => {
    expect((await h.api().post(`${BASE}/daily-entries`).send(h.validEntry())).status).toBe(401);
  });

  it('creates a valid entry and returns twin payload', async () => {
    const res = await post(a.token, h.validEntry({ date: h.daysAgo(5) }));
    expect(res.status).toBe(201);
    expect(res.body.data.entry.date).toBe(h.daysAgo(5));
    expect(res.body.data.entry.athleteId).toBe(a.user.id);
    expect(res.body.data.twin).toBeTruthy();
    expect(res.body.data.twin.version).toBeGreaterThanOrEqual(1);
    expect(res.body.data).toHaveProperty('previousTwin');
    expect(res.body.data).toHaveProperty('insight');
    expect(res.body.data).toHaveProperty('attention');
  });

  it('validates intensity, performance, sleep and other ranges', async () => {
    const cases = [
      { intensity: 0 }, { intensity: 11 }, { intensity: 5.5 },
      { performanceScore: -1 }, { performanceScore: 101 },
      { sleepHours: -1 }, { sleepHours: 25 },
      { feelingScore: 0 }, { feelingScore: 6 },
      { durationMinutes: 0 }, { durationMinutes: 601 },
      { mealCount: 11 }, { mealCount: -1 },
      { trainingType: 'swimming' },
      { dietNotes: 'x'.repeat(501) },
      { intensity: '7' },
      { date: 'yesterday' }, { date: '2026-02-30' },
    ];
    for (const c of cases) {
      const res = await post(a.token, h.validEntry({ date: h.daysAgo(20), ...c }));
      expect(res.status, JSON.stringify(c)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    }
    expect(await DailyEntry.countDocuments({ athleteId: a.user.id, date: dayDate(h.daysAgo(20)) })).toBe(0);
  });

  it('accepts boundary values', async () => {
    const res = await post(a.token, h.validEntry({
      date: h.daysAgo(30), intensity: 1, performanceScore: 0, sleepHours: 0, feelingScore: 1,
      durationMinutes: 1, mealCount: 0,
    }));
    expect(res.status).toBe(201);
    const res2 = await post(a.token, h.validEntry({
      date: h.daysAgo(31), intensity: 10, performanceScore: 100, sleepHours: 24, feelingScore: 5,
      durationMinutes: 600, mealCount: 10,
    }));
    expect(res2.status).toBe(201);
  });

  it('rejects future dates but accepts today', async () => {
    const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const res = await post(a.token, h.validEntry({ date: future }));
    expect(res.status).toBe(400);
    const today = await post(a.token, h.validEntry({ date: h.daysAgo(0) }));
    expect(today.status).toBe(201);
  });

  it('rejects mass assignment of athleteId / unknown fields', async () => {
    const res = await post(a.token, { ...h.validEntry({ date: h.daysAgo(40) }), athleteId: b.user.id });
    expect(res.status).toBe(400);
    const res2 = await post(a.token, { ...h.validEntry({ date: h.daysAgo(40) }), _id: '507f1f77bcf86cd799439011' });
    expect(res2.status).toBe(400);
  });

  it('rejects a duplicate date with 409 DUPLICATE_DATE', async () => {
    const date = h.daysAgo(10);
    expect((await post(a.token, h.validEntry({ date }))).status).toBe(201);
    const dup = await post(a.token, h.validEntry({ date }));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
    expect(dup.body.error.subcode).toBe('DUPLICATE_DATE');
    // a different athlete may log the same date
    expect((await post(b.token, h.validEntry({ date }))).status).toBe(201);
  });

  it('lists history sorted desc with pagination and date filters, scoped to the owner', async () => {
    const res = await h.api().get(`${BASE}/daily-entries?limit=3&page=1`).set(h.authz(a.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    const dates = res.body.data.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((e) => e.athleteId === a.user.id)).toBe(true);

    const ranged = await h.api().get(`${BASE}/daily-entries?from=${h.daysAgo(10)}&to=${h.daysAgo(5)}`).set(h.authz(a.token));
    expect(ranged.body.data.map((e) => e.date).sort()).toEqual([h.daysAgo(10), h.daysAgo(5)].sort());

    const tooMany = await h.api().get(`${BASE}/daily-entries?limit=1000`).set(h.authz(a.token));
    expect(tooMany.status).toBe(400);
  });

  it('athlete A cannot read or patch athlete B entry (404)', async () => {
    const created = await post(b.token, h.validEntry({ date: h.daysAgo(50) }));
    const id = created.body.data.entry.id;
    const own = await h.api().get(`${BASE}/daily-entries/${id}`).set(h.authz(b.token));
    expect(own.status).toBe(200);
    const read = await h.api().get(`${BASE}/daily-entries/${id}`).set(h.authz(a.token));
    expect(read.status).toBe(404);
    const patch = await h.api().patch(`${BASE}/daily-entries/${id}`).set(h.authz(a.token)).send({ intensity: 1 });
    expect(patch.status).toBe(404);
    const stored = await DailyEntry.findById(id);
    expect(stored.intensity).toBe(7);
    expect((await h.api().get(`${BASE}/daily-entries/not-an-id`).set(h.authz(a.token))).status).toBe(404);
    // no delete endpoint
    expect((await h.api().delete(`${BASE}/daily-entries/${id}`).set(h.authz(b.token))).status).toBe(404);
  });

  it('patches an entry, revalidates, and blocks date collisions', async () => {
    const e1 = (await post(a.token, h.validEntry({ date: h.daysAgo(60) }))).body.data.entry;
    const e2 = (await post(a.token, h.validEntry({ date: h.daysAgo(61) }))).body.data.entry;

    const okRes = await h.api().patch(`${BASE}/daily-entries/${e1.id}`).set(h.authz(a.token)).send({ intensity: 9, sleepHours: 6 });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.entry.intensity).toBe(9);
    expect(okRes.body.data.twin).toBeTruthy();

    const bad = await h.api().patch(`${BASE}/daily-entries/${e1.id}`).set(h.authz(a.token)).send({ intensity: 11 });
    expect(bad.status).toBe(400);
    const clash = await h.api().patch(`${BASE}/daily-entries/${e1.id}`).set(h.authz(a.token)).send({ date: e2.date });
    expect(clash.status).toBe(409);
    expect(clash.body.error.subcode).toBe('DUPLICATE_DATE');
    const athleteChange = await h.api().patch(`${BASE}/daily-entries/${e1.id}`).set(h.authz(a.token)).send({ athleteId: b.user.id });
    expect(athleteChange.status).toBe(400);
    const moved = await h.api().patch(`${BASE}/daily-entries/${e1.id}`).set(h.authz(a.token)).send({ date: h.daysAgo(62) });
    expect(moved.status).toBe(200);
    expect(moved.body.data.entry.date).toBe(h.daysAgo(62));
  });

  it('rolls back a created entry and returns 500 when twin recompute fails', async () => {
    const twinService = require('../../services/twinService');
    const original = twinService.recomputeTwin;
    let calls = 0;
    twinService.recomputeTwin = async (...args) => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return original(...args);
    };
    try {
      const date = h.daysAgo(70);
      const res = await post(a.token, h.validEntry({ date }));
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(await DailyEntry.countDocuments({ athleteId: a.user.id, date: dayDate(date) })).toBe(0);
    } finally {
      twinService.recomputeTwin = original;
    }
  });

  it('restores previous values and returns 500 when recompute fails on patch', async () => {
    const twinService = require('../../services/twinService');
    const created = (await post(a.token, h.validEntry({ date: h.daysAgo(71), intensity: 4 }))).body.data.entry;
    const original = twinService.recomputeTwin;
    let calls = 0;
    twinService.recomputeTwin = async (...args) => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return original(...args);
    };
    try {
      const res = await h.api().patch(`${BASE}/daily-entries/${created.id}`).set(h.authz(a.token)).send({ intensity: 9 });
      expect(res.status).toBe(500);
      expect((await DailyEntry.findById(created.id)).intensity).toBe(4);
    } finally {
      twinService.recomputeTwin = original;
    }
  });
});
