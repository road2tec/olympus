import { describe, it, expect } from 'vitest';
const E = require('../../engine');
const { block, scenario, LAST, mk } = require('./fixtures');

const PREV = { durationMinutes: 60, intensity: 6, sleepHours: 8, feelingScore: 4 };
const DISCLAIMER_SENTENCE = 'Olympus is a decision-support tool and does not replace a doctor or physiotherapist.';

describe('generateInsight', () => {
  it('needs_attention: message built from the real computed numbers + disclaimer', () => {
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur: { durationMinutes: 70, intensity: 7, sleepHours: 6, feelingScore: 3 } }));
    const i = r.insight;
    expect(i.type).toBe('needs_attention');
    expect(i.rule).toBe('LOAD_UP_RECOVERY_DOWN');
    expect(['warning', 'critical']).toContain(i.severity);
    expect(i.severity).toBe('critical'); // +36.1% load, -28.6% recovery
    // every number in the message comes from the computed attention metrics
    expect(i.message).toContain('increased by 36.1%');
    expect(i.message).toContain('(360.0 to 490.0)');
    expect(i.message).toContain('declined by 28.6%');
    expect(i.message).toContain('(87.5 to 62.5)');
    expect(i.message).toContain(DISCLAIMER_SENTENCE);
    expect(i.message).toContain('discussing your recent training schedule and recovery with your coach');
    const m = r.attention.metrics;
    expect(i.contributingFactors).toHaveLength(2);
    const lf = i.contributingFactors.find((f) => f.metric === 'trainingLoad');
    const rf = i.contributingFactors.find((f) => f.metric === 'recovery');
    expect(lf).toMatchObject({ previous: m.trainingLoad.previous, current: m.trainingLoad.current, changePct: m.trainingLoad.changePct });
    expect(rf).toMatchObject({ previous: m.recovery.previous, current: m.recovery.current, changePct: m.recovery.changePct });
    for (const f of i.contributingFactors) {
      expect(Object.keys(f).sort()).toEqual(['changePct', 'current', 'label', 'metric', 'previous', 'unit']);
    }
  });

  it('needs_attention at the threshold is a warning', () => {
    const cur = { durationMinutes: 66, intensity: 6, sleepHours: 7, feelingScore: 4 }; // load +10%, recovery 81.25 (-7.1%)
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur }));
    expect(r.insight.type).toBe('needs_attention');
    expect(r.insight.severity).toBe('warning');
  });

  it('load up only -> monitoring insight, not needs_attention, message states recovery is holding', () => {
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur: { ...PREV, durationMinutes: 90, intensity: 8 } }));
    expect(r.insight.type).toBe('monitoring');
    expect(r.insight.rule).toBe('LOAD_UP_ONLY');
    expect(r.insight.severity).toBe('info');
    expect(r.insight.message).not.toContain('decision-support tool');
    expect(r.insight.message).toContain(`${((720 - 360) / 360 * 100).toFixed(1)}%`);
  });

  it('recovery down only -> monitoring, RECOVERY_DOWN_ONLY', () => {
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur: { ...PREV, sleepHours: 5, feelingScore: 2 } }));
    expect(r.insight.type).toBe('monitoring');
    expect(r.insight.rule).toBe('RECOVERY_DOWN_ONLY');
  });

  it('performance improving / declining produce trend insights with matching numbers', () => {
    const up = E.analyzeAthlete(scenario({ prev: { ...PREV, performanceScore: 60 }, cur: { ...PREV, performanceScore: 72 } }));
    expect(up.insight).toMatchObject({ type: 'trend', severity: 'positive', rule: 'PERFORMANCE_IMPROVING' });
    expect(up.insight.message).toContain('up 20.0%');
    expect(up.insight.message).toContain('(60.0 to 72.0)');
    const down = E.analyzeAthlete(scenario({ prev: { ...PREV, performanceScore: 80 }, cur: { ...PREV, performanceScore: 60 } }));
    expect(down.insight).toMatchObject({ type: 'trend', severity: 'warning', rule: 'PERFORMANCE_DECLINING' });
    expect(down.insight.message).toContain('down 25.0%');
  });

  it('stable data -> info/STABLE', () => {
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur: PREV }));
    expect(r.insight).toMatchObject({ type: 'info', severity: 'info', rule: 'STABLE' });
  });

  it('insufficient data and monitoring states', () => {
    expect(E.analyzeAthlete([]).insight).toMatchObject({ type: 'insufficient_data', rule: 'NO_DATA' });
    const one = E.analyzeAthlete([mk('2026-03-01')]);
    expect(one.insight.type).toBe('insufficient_data');
    expect(one.insight.rule).toBe('INSUFFICIENT_DATA');
    const mon = E.analyzeAthlete([...block(LAST, [-13, -12], PREV), ...block(LAST, [-6, -5, 0], PREV)]);
    expect(mon.insight).toMatchObject({ type: 'monitoring', rule: 'INSUFFICIENT_WINDOW_DATA' });
  });

  it('is deterministic for identical input', () => {
    const entries = scenario({ prev: PREV, cur: { durationMinutes: 70, intensity: 7, sleepHours: 6, feelingScore: 3 } });
    const strip = (r) => ({ ...r, attention: { ...r.attention, evaluatedAt: 'x' } });
    expect(strip(E.analyzeAthlete(entries))).toEqual(strip(E.analyzeAthlete([...entries].reverse())));
  });

  it('schema-valid output types/severities', () => {
    const types = ['needs_attention', 'trend', 'monitoring', 'info', 'insufficient_data'];
    const sev = ['info', 'positive', 'warning', 'critical'];
    const samples = [[], [mk('2026-03-01')], scenario({ prev: PREV, cur: PREV })];
    for (const s of samples) {
      const i = E.analyzeAthlete(s).insight;
      expect(types).toContain(i.type);
      expect(sev).toContain(i.severity);
      expect(i.title.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzeAthlete', () => {
  it('returns timeline, latest, previous, attention, trends, insight', () => {
    const r = E.analyzeAthlete(scenario({ prev: PREV, cur: PREV }));
    expect(r.timeline).toHaveLength(10);
    expect(r.latest).toBe(r.timeline[9]);
    expect(r.previous).toBe(r.timeline[8]);
    expect(Object.keys(r.trends).sort()).toEqual(['performance', 'recovery', 'trainingDuration']);
  });
  it('handles empty and single entry', () => {
    const e = E.analyzeAthlete([]);
    expect(e.latest).toBeNull();
    expect(e.previous).toBeNull();
    const s = E.analyzeAthlete([mk('2026-03-01')]);
    expect(s.latest.sequence).toBe(1);
    expect(s.previous).toBeNull();
  });
  it('propagates RangeError for corrupt entries rather than silently using 0', () => {
    expect(() => E.analyzeAthlete([mk('2026-03-01', { sleepHours: NaN })])).toThrow(RangeError);
  });
});
