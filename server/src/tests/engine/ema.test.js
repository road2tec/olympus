import { describe, it, expect } from 'vitest';
const E = require('../../engine');
const { mk, block } = require('./fixtures');

describe('ema', () => {
  it('initialises with the first value (never 0)', () => {
    expect(E.ema(null, 420, 0.3)).toBe(420);
    expect(E.ema(undefined, 55, 0.3)).toBe(55);
  });
  it('updates with alpha*current + (1-alpha)*previous', () => {
    expect(E.ema(100, 200, 0.3)).toBeCloseTo(130, 10);
    expect(E.ema(100, 200)).toBeCloseTo(130, 10); // default alpha 0.30
    expect(E.ema(100, 50, 1)).toBe(50);
  });
  it('rejects invalid alpha or current', () => {
    expect(() => E.ema(1, 2, 0)).toThrow(RangeError);
    expect(() => E.ema(1, 2, 1.5)).toThrow(RangeError);
    expect(() => E.ema(1, NaN, 0.3)).toThrow(RangeError);
  });
  it('previous 0 is a legitimate value, not "missing"', () => {
    expect(E.ema(0, 100, 0.3)).toBeCloseTo(30, 10);
  });
});

describe('deriveFatigueAdaptation', () => {
  it('first state: adaptation 50, fatigue from formula', () => {
    // loadIndex = 300/600*100 = 50 ; fatigue = 0.6*50 + 0.4*(100-80) = 38
    const r = E.deriveFatigueAdaptation({ loadEma: 300, recoveryEma: 80, prevLoadEma: null, prevRecoveryEma: null, prevFatigue: null, prevAdaptation: null });
    expect(r).toEqual({ fatigue: 38, adaptation: 50 });
  });
  it('load index is capped at 100', () => {
    const r = E.deriveFatigueAdaptation({ loadEma: 6000, recoveryEma: 100 });
    expect(r.fatigue).toBe(60);
  });
  it('productive load with good recovery raises adaptation', () => {
    const r = E.deriveFatigueAdaptation({ loadEma: 300, recoveryEma: 80, prevLoadEma: 290, prevRecoveryEma: 80, prevFatigue: 38, prevAdaptation: 50 });
    // step = 3 * 0.5 * 0.8 = 1.2
    expect(r.adaptation).toBe(51.2);
  });
  it('poor recovery lowers adaptation', () => {
    const r = E.deriveFatigueAdaptation({ loadEma: 300, recoveryEma: 30, prevLoadEma: 290, prevRecoveryEma: 35, prevFatigue: 50, prevAdaptation: 50 });
    expect(r.adaptation).toBeLessThan(50);
  });
  it('overreaching (fatigue>=70) lowers adaptation even with moderate recovery', () => {
    const r = E.deriveFatigueAdaptation({ loadEma: 600, recoveryEma: 55, prevLoadEma: 600, prevRecoveryEma: 55, prevFatigue: 78, prevAdaptation: 60 });
    expect(r.fatigue).toBe(78);
    expect(r.adaptation).toBeLessThan(60);
  });
  it('is always bounded 0-100 and deterministic', () => {
    const args = { loadEma: 5000, recoveryEma: 0, prevLoadEma: 1, prevRecoveryEma: 1, prevFatigue: 100, prevAdaptation: 0 };
    const a = E.deriveFatigueAdaptation(args);
    expect(a).toEqual(E.deriveFatigueAdaptation(args));
    expect(a.adaptation).toBeGreaterThanOrEqual(0);
    expect(E.deriveFatigueAdaptation({ ...args, prevAdaptation: 100, recoveryEma: 100, loadEma: 600, prevFatigue: 0 }).adaptation).toBeLessThanOrEqual(100);
  });
  it('throws on non-finite input', () => {
    expect(() => E.deriveFatigueAdaptation({ loadEma: NaN, recoveryEma: 50 })).toThrow(RangeError);
  });
});

describe('computeTwinTimeline', () => {
  it('first state uses first values for EMAs and adaptation 50', () => {
    const [s] = E.computeTwinTimeline([mk('2026-03-01', { durationMinutes: 60, intensity: 7, performanceScore: 80, sleepHours: 8, feelingScore: 5 })]);
    expect(s.sequence).toBe(1);
    expect(s.entryId).toBe('id-2026-03-01');
    expect(s.dailyTrainingLoad).toBe(420);
    expect(s.dailyRecovery).toBe(100);
    expect(s.trainingLoad).toBe(420);
    expect(s.recovery).toBe(100);
    expect(s.performance).toBe(80);
    expect(s.adaptation).toBe(50);
  });
  it('applies EMA alpha 0.30 on subsequent entries and rounds to 2 dp', () => {
    const tl = E.computeTwinTimeline([
      mk('2026-03-01', { durationMinutes: 100, intensity: 5, performanceScore: 60 }),
      mk('2026-03-02', { durationMinutes: 100, intensity: 7, performanceScore: 90 }),
    ]);
    expect(tl[1].trainingLoad).toBe(560); // 0.3*700 + 0.7*500 = 560
    expect(tl[1].performance).toBe(69); // 0.3*90 + 0.7*60
  });
  it('sorts internally, de-duplicates by date (last wins), and honours custom alpha', () => {
    const entries = [
      mk('2026-03-03', { durationMinutes: 10, intensity: 1 }),
      mk('2026-03-01', { durationMinutes: 10, intensity: 1 }),
      mk('2026-03-03', { durationMinutes: 20, intensity: 2 }),
    ];
    const tl = E.computeTwinTimeline(entries, { alpha: 0.5 });
    expect(tl.map((t) => t.date)).toEqual(['2026-03-01', '2026-03-03']);
    expect(tl[1].dailyTrainingLoad).toBe(40);
    expect(tl[1].trainingLoad).toBe(25); // 0.5*40 + 0.5*10
  });
  it('accepts Date objects for date', () => {
    const tl = E.computeTwinTimeline([{ ...mk('2026-03-01'), date: new Date('2026-03-01T00:00:00Z') }]);
    expect(tl[0].date).toBe('2026-03-01');
  });
  it('returns [] for no entries', () => {
    expect(E.computeTwinTimeline([])).toEqual([]);
  });
  it('does not turn missing performance into 0', () => {
    const tl = E.computeTwinTimeline([
      mk('2026-03-01', { performanceScore: undefined }),
      mk('2026-03-02', { performanceScore: 80 }),
    ]);
    expect(tl[0].performance).toBeNull();
    expect(tl[1].performance).toBe(80);
  });
  it('keeps all metrics bounded over a long run of extreme data', () => {
    const entries = block('2026-01-01', Array.from({ length: 60 }, (_, i) => i), (o) => ({ durationMinutes: 600, intensity: 10, sleepHours: 0, feelingScore: 1, performanceScore: 100 }));
    for (const s of E.computeTwinTimeline(entries)) {
      for (const k of ['fatigue', 'adaptation', 'recovery']) {
        expect(s[k]).toBeGreaterThanOrEqual(0);
        expect(s[k]).toBeLessThanOrEqual(100);
      }
    }
  });
  it('is deterministic', () => {
    const entries = block('2026-01-01', [0, 1, 2, 4, 5, 9], (o) => ({ durationMinutes: 30 + o * 5, intensity: 3 + (o % 5) }));
    expect(E.computeTwinTimeline(entries)).toEqual(E.computeTwinTimeline([...entries].reverse()));
  });
  it('throws on invalid alpha', () => {
    expect(() => E.computeTwinTimeline([mk('2026-03-01')], { alpha: 2 })).toThrow(RangeError);
  });
});
