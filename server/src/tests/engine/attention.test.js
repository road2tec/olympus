import { describe, it, expect } from 'vitest';
const E = require('../../engine');
const { block, scenario, LAST, PREV_OFFSETS, CUR_OFFSETS } = require('./fixtures');

const series = (entries) => E.analyzeAthlete(entries).attention;
const PREV = { durationMinutes: 60, intensity: 6, sleepHours: 8, feelingScore: 4 }; // load 360, recovery 87.5

describe('detectNeedsAttention', () => {
  it('triggers when load rises >=10% AND recovery falls >=5%', () => {
    const a = series(scenario({
      prev: PREV,
      cur: { durationMinutes: 70, intensity: 7, sleepHours: 6, feelingScore: 3 }, // load 490, recovery 62.5
    }));
    expect(a.status).toBe('needs_attention');
    expect(a.rule).toBe('LOAD_UP_RECOVERY_DOWN');
    expect(a.triggers).toHaveLength(2);
    const load = a.triggers.find((t) => t.metric === 'trainingLoad');
    const rec = a.triggers.find((t) => t.metric === 'recovery');
    expect(load).toMatchObject({ previous: 360, current: 490 });
    expect(load.changePct).toBeCloseTo(36.11, 2);
    expect(rec).toMatchObject({ previous: 87.5, current: 62.5 });
    expect(rec.changePct).toBeCloseTo(-28.57, 2);
    expect(a.comparisonPeriod).toEqual({
      previous: { from: '2026-03-02', to: '2026-03-08', days: 5 },
      current: { from: '2026-03-09', to: '2026-03-15', days: 5 },
    });
    expect(a.explanation).toContain('36.1%');
    expect(a.explanation).toContain('-28.6%');
    expect(() => new Date(a.evaluatedAt).toISOString()).not.toThrow();
  });

  it('does NOT flag when load rises but recovery is stable', () => {
    const a = series(scenario({ prev: PREV, cur: { ...PREV, durationMinutes: 90, intensity: 8 } }));
    expect(a.status).toBe('ok');
    expect(a.rule).toBeNull();
    expect(a.triggers).toEqual([]);
    expect(a.metrics.trainingLoad.changePct).toBeGreaterThan(10);
    expect(a.metrics.recovery.changePct).toBe(0);
  });

  it('does NOT flag when recovery falls but load is stable', () => {
    const a = series(scenario({ prev: PREV, cur: { ...PREV, sleepHours: 5, feelingScore: 2 } }));
    expect(a.status).toBe('ok');
    expect(a.triggers).toEqual([]);
    expect(a.metrics.recovery.changePct).toBeLessThan(-5);
  });

  it('does NOT flag when load falls and recovery falls', () => {
    const a = series(scenario({ prev: PREV, cur: { durationMinutes: 30, intensity: 3, sleepHours: 5, feelingScore: 2 } }));
    expect(a.status).toBe('ok');
  });

  it('uses inclusive thresholds exactly at +10% and -5%', () => {
    const mkSeries = (load, rec) => [
      ...PREV_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: 100, recovery: 100 })),
      ...CUR_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: load, recovery: rec })),
    ];
    expect(E.detectNeedsAttention(mkSeries(110, 95)).status).toBe('needs_attention');
    expect(E.detectNeedsAttention(mkSeries(109, 95)).status).toBe('ok');
    expect(E.detectNeedsAttention(mkSeries(110, 96)).status).toBe('ok');
  });

  it('insufficient_data when there are no entries at all', () => {
    const a = E.detectNeedsAttention([]);
    expect(a.status).toBe('insufficient_data');
    expect(a.triggers).toEqual([]);
  });

  it('insufficient_data when the previous window is empty', () => {
    const a = series(block(LAST, [-6, -5, -4, -3, 0], PREV));
    expect(a.status).toBe('insufficient_data');
    expect(a.rule).toBeNull();
  });

  it('monitoring when a window has fewer than 3 entries (min 3 each)', () => {
    const cur = { durationMinutes: 90, intensity: 9, sleepHours: 4, feelingScore: 1 };
    const fewPrev = [...block(LAST, [-13, -10], PREV), ...block(LAST, [-6, -5, -3, 0], cur)];
    const fewCur = [...block(LAST, [-13, -12, -10], PREV), ...block(LAST, [-2, 0], cur)];
    expect(series(fewPrev).status).toBe('monitoring');
    expect(series(fewCur).status).toBe('monitoring');
    expect(series(fewPrev).triggers).toEqual([]);
  });

  it('exactly 3 entries per window is enough', () => {
    const a = series([
      ...block(LAST, [-13, -12, -10], PREV),
      ...block(LAST, [-6, -5, 0], { durationMinutes: 90, intensity: 8, sleepHours: 4, feelingScore: 2 }),
    ]);
    expect(a.status).toBe('needs_attention');
  });

  it('entries older than 14 days before the last entry are ignored', () => {
    const a = series([
      ...block(LAST, [-30, -29, -28], { durationMinutes: 600, intensity: 10, sleepHours: 1, feelingScore: 1 }),
      ...block(LAST, PREV_OFFSETS, PREV),
      ...block(LAST, CUR_OFFSETS, PREV),
    ]);
    expect(a.status).toBe('ok');
  });

  it('zero-denominator recovery mean cannot trigger (null change, no NaN)', () => {
    const s = [
      ...PREV_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: 100, recovery: 0 })),
      ...CUR_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: 200, recovery: 0 })),
    ];
    const a = E.detectNeedsAttention(s);
    expect(a.status).toBe('ok');
    expect(a.metrics.recovery.changePct).toBeNull();
  });

  it('sorts unsorted input and ignores points with missing values', () => {
    const s = [
      ...CUR_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: 200, recovery: 50 })),
      { date: '2026-03-04', trainingLoad: null, recovery: 90 },
      ...PREV_OFFSETS.map((o) => ({ date: E.addDays(LAST, o), trainingLoad: 100, recovery: 80 })),
    ];
    expect(E.detectNeedsAttention(s).status).toBe('needs_attention');
  });
});
