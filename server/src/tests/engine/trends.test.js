import { describe, it, expect } from 'vitest';
const E = require('../../engine');

describe('classifyTrend', () => {
  it('improving when change >= +5%', () => {
    const r = E.classifyTrend([70, 70, 70], [74, 74, 74]);
    expect(r.label).toBe('improving');
    expect(r.changePct).toBeCloseTo(5.71, 2);
    expect(r.previousMean).toBe(70);
    expect(r.currentMean).toBe(74);
    expect(r.previousDays).toBe(3);
    expect(r.currentDays).toBe(3);
    expect(typeof r.basis).toBe('string');
  });
  it('declining when change <= -5%', () => {
    expect(E.classifyTrend([100, 100, 100], [90, 90, 90]).label).toBe('declining');
  });
  it('stable when |change| < 5%', () => {
    expect(E.classifyTrend([100, 100, 100], [104, 104, 104]).label).toBe('stable');
    expect(E.classifyTrend([100, 100, 100], [96, 96, 96]).label).toBe('stable');
    expect(E.classifyTrend([100, 100, 100], [100, 100, 100]).changePct).toBe(0);
  });
  it('boundary exactly +/-5% is classified as a trend', () => {
    expect(E.classifyTrend([100, 100, 100], [105, 105, 105]).label).toBe('improving');
    expect(E.classifyTrend([100, 100, 100], [95, 95, 95]).label).toBe('declining');
  });
  it('insufficient_data with fewer than 3 values in either window', () => {
    expect(E.classifyTrend([100, 100], [120, 120, 120]).label).toBe('insufficient_data');
    expect(E.classifyTrend([100, 100, 100], [120, 120]).label).toBe('insufficient_data');
    expect(E.classifyTrend([], []).label).toBe('insufficient_data');
    expect(E.classifyTrend([], []).changePct).toBeNull();
    expect(E.classifyTrend(undefined, undefined).label).toBe('insufficient_data');
  });
  it('zero denominator gives insufficient_data and null change (no Infinity/NaN)', () => {
    const r = E.classifyTrend([0, 0, 0], [5, 5, 5]);
    expect(r.label).toBe('insufficient_data');
    expect(r.changePct).toBeNull();
  });
  it('ignores null / NaN values rather than treating them as 0', () => {
    const r = E.classifyTrend([100, null, 100, NaN, 100], [110, 110, undefined, 110]);
    expect(r.previousDays).toBe(3);
    expect(r.currentDays).toBe(3);
    expect(r.previousMean).toBe(100);
    expect(r.currentMean).toBe(110);
    expect(r.label).toBe('improving');
  });
  it('respects custom threshold / minDays', () => {
    expect(E.classifyTrend([100, 100], [103, 103], { minDays: 2, threshold: 2 }).label).toBe('improving');
  });
});

describe('computeTrends', () => {
  const { block, LAST } = require('./fixtures');
  it('compares last 7 days with the 7 days before, ending at last entry', () => {
    const entries = [
      ...block(LAST, [-13, -12, -10, -9], { performanceScore: 60, durationMinutes: 50 }),
      ...block(LAST, [-6, -4, -2, 0], { performanceScore: 72, durationMinutes: 50 }),
    ];
    const tl = E.computeTwinTimeline(entries);
    const t = E.computeTrends(entries.map((e) => ({ ...e })), tl);
    expect(t.performance.label).toBe('improving');
    expect(t.performance.changePct).toBe(20);
    expect(t.trainingDuration.label).toBe('stable');
    expect(t.recovery.label).toBe('stable');
  });
  it('empty input yields insufficient_data for all', () => {
    const t = E.computeTrends([], []);
    expect(Object.values(t).every((x) => x.label === 'insufficient_data')).toBe(true);
  });
});
