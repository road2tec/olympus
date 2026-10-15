import { describe, it, expect } from 'vitest';
const E = require('../../engine');

describe('dailyTrainingLoad', () => {
  it('is duration x intensity', () => {
    expect(E.dailyTrainingLoad(60, 7)).toBe(420);
    expect(E.dailyTrainingLoad(1, 1)).toBe(1);
    expect(E.dailyTrainingLoad(600, 10)).toBe(6000);
  });
  it('throws RangeError on non-finite input', () => {
    expect(() => E.dailyTrainingLoad(NaN, 5)).toThrow(RangeError);
    expect(() => E.dailyTrainingLoad(60, undefined)).toThrow(RangeError);
    expect(() => E.dailyTrainingLoad(Infinity, 5)).toThrow(RangeError);
  });
});

describe('recoveryScore', () => {
  it('computes the weighted score', () => {
    expect(E.recoveryScore(8, 5)).toBe(100);
    expect(E.recoveryScore(8, 1)).toBe(50);
    expect(E.recoveryScore(0, 1)).toBe(0);
    expect(E.recoveryScore(4, 3)).toBe(50); // sleep 50, feeling 50
    expect(E.recoveryScore(6, 4)).toBe(75); // sleep 75, feeling 75
    expect(E.recoveryScore(6, 3)).toBe(62.5); // sleep 75, feeling 50
  });
  it('is bounded 0-100 for extreme inputs', () => {
    for (const [s, f] of [[24, 5], [0, 1], [100, 100], [-5, -5], [12, 9], [3.3, 2.7]]) {
      const r = E.recoveryScore(s, f);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(100);
    }
  });
  it('caps sleep above the 8h target', () => {
    expect(E.recoveryScore(12, 3)).toBe(E.recoveryScore(8, 3));
  });
  it('rounds to 2 decimals', () => {
    expect(E.recoveryScore(5.123, 2)).toBe(44.52); // 0.5*64.0375 + 0.5*25 = 44.51875
  });
  it('throws RangeError on non-finite', () => {
    expect(() => E.recoveryScore(NaN, 3)).toThrow(RangeError);
    expect(() => E.recoveryScore(7, null)).toThrow(RangeError);
    expect(() => E.recoveryScore(undefined, 3)).toThrow(RangeError);
  });
});

describe('percentChange', () => {
  it('computes percent change', () => {
    expect(E.percentChange(100, 118.2)).toBeCloseTo(18.2, 5);
    expect(E.percentChange(50, 25)).toBe(-50);
    expect(E.percentChange(10, 10)).toBe(0);
  });
  it('returns null on zero denominator or missing/NaN input (never 0)', () => {
    expect(E.percentChange(0, 10)).toBeNull();
    expect(E.percentChange(null, 10)).toBeNull();
    expect(E.percentChange(undefined, 10)).toBeNull();
    expect(E.percentChange(NaN, 10)).toBeNull();
    expect(E.percentChange(10, null)).toBeNull();
  });
});

describe('calendar helpers', () => {
  it('addDays / daysBetween use UTC calendar maths across month, year and leap boundaries', () => {
    expect(E.addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(E.addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(E.addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(E.daysBetween('2026-03-01', '2026-03-15')).toBe(14);
  });
  it('toDateString normalises Date and ISO input', () => {
    expect(E.toDateString(new Date('2026-03-15T00:00:00Z'))).toBe('2026-03-15');
    expect(E.toDateString('2026-03-15T10:00:00.000Z')).toBe('2026-03-15');
    expect(() => E.toDateString('nope')).toThrow(RangeError);
  });
});

describe('constants', () => {
  it('match the contract', () => {
    expect(E.EMA_ALPHA_DEFAULT).toBe(0.3);
    expect(E.SLEEP_TARGET_HOURS).toBe(8);
    expect(E.RECOVERY_WEIGHTS).toEqual({ sleep: 0.5, feeling: 0.5 });
    expect(E.TREND_THRESHOLD_PCT).toBe(5);
    expect(E.TREND_WINDOW_DAYS).toBe(7);
    expect(E.MIN_DAYS_PER_WINDOW).toBe(3);
    expect(E.ATTENTION_LOAD_RISE_PCT).toBe(10);
    expect(E.ATTENTION_RECOVERY_DROP_PCT).toBe(5);
  });
});
