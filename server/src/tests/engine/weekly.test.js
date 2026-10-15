import { describe, it, expect } from 'vitest';
const E = require('../../engine');
const { mk } = require('./fixtures');

describe('getWeekRange', () => {
  it('returns Monday..Sunday for any day in the week', () => {
    // 2026-03-09 is a Monday
    for (const d of ['2026-03-09', '2026-03-10', '2026-03-12', '2026-03-15']) {
      expect(E.getWeekRange(d)).toEqual({ start: '2026-03-09', end: '2026-03-15' });
    }
  });
  it('Sunday belongs to the week that started the previous Monday; next Monday starts a new week', () => {
    expect(E.getWeekRange('2026-03-15').start).toBe('2026-03-09');
    expect(E.getWeekRange('2026-03-16')).toEqual({ start: '2026-03-16', end: '2026-03-22' });
  });
  it('crosses month and year boundaries', () => {
    expect(E.getWeekRange('2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(E.getWeekRange('2024-03-01')).toEqual({ start: '2024-02-26', end: '2024-03-03' });
  });
  it('accepts Date and ISO inputs', () => {
    expect(E.getWeekRange(new Date('2026-03-11T23:30:00Z'))).toEqual({ start: '2026-03-09', end: '2026-03-15' });
    expect(E.getWeekRange('2026-03-11T05:00:00.000Z').start).toBe('2026-03-09');
  });
  it('Date + timezone uses the calendar day in that zone; bad tz falls back to UTC', () => {
    // 2026-03-15T20:00Z is already Monday 2026-03-16 in Asia/Kolkata (+05:30)
    expect(E.getWeekRange(new Date('2026-03-15T20:00:00Z'), 'Asia/Kolkata').start).toBe('2026-03-16');
    expect(E.getWeekRange(new Date('2026-03-15T20:00:00Z'), 'UTC').start).toBe('2026-03-09');
    expect(E.getWeekRange(new Date('2026-03-15T20:00:00Z'), 'Not/AZone').start).toBe('2026-03-09');
  });
  it('throws on invalid input', () => {
    expect(() => E.getWeekRange('garbage')).toThrow(RangeError);
  });
});

const range = { start: '2026-03-09', end: '2026-03-15' };
const WEEK = [
  mk('2026-03-09', { durationMinutes: 60, intensity: 6, performanceScore: 70, sleepHours: 8, feelingScore: 4 }), // load 360, rec 87.5
  mk('2026-03-11', { durationMinutes: 90, intensity: 8, performanceScore: 80, sleepHours: 6, feelingScore: 3 }), // load 720, rec 62.5
  mk('2026-03-14', { durationMinutes: 30, intensity: 2, performanceScore: 60, sleepHours: 7, feelingScore: 5 }), // load 60
];

describe('buildWeeklyMetrics', () => {
  it('aggregates correctly and reports missing days', () => {
    const tl = E.computeTwinTimeline(WEEK);
    const m = E.buildWeeklyMetrics(WEEK, tl, range);
    expect(m.sessions).toBe(3);
    expect(m.totalDurationMinutes).toBe(180);
    expect(m.avgIntensity).toBeCloseTo(5.33, 2);
    expect(m.avgPerformance).toBe(70);
    expect(m.avgSleepHours).toBe(7);
    expect(m.totalTrainingLoad).toBe(1140);
    expect(m.avgDailyTrainingLoad).toBe(380);
    expect(m.daysLogged).toBe(3);
    expect(m.daysInPeriod).toBe(7);
    expect(m.missingDays).toEqual(['2026-03-10', '2026-03-12', '2026-03-13', '2026-03-15']);
    expect(m.completenessPct).toBe(42.9);
    const rec = (87.5 + 62.5 + E.recoveryScore(7, 5)) / 3;
    expect(m.avgRecovery).toBeCloseTo(rec, 1);
    expect(typeof m.attentionStatus).toBe('string');
  });
  it('averages are null (not 0) when the week has no data; all days missing', () => {
    const m = E.buildWeeklyMetrics(WEEK, E.computeTwinTimeline(WEEK), { start: '2026-04-06', end: '2026-04-12' });
    expect(m.sessions).toBe(0);
    expect(m.totalDurationMinutes).toBe(0);
    expect(m.totalTrainingLoad).toBe(0);
    for (const k of ['avgIntensity', 'avgPerformance', 'avgRecovery', 'avgSleepHours', 'avgDailyTrainingLoad']) expect(m[k]).toBeNull();
    expect(m.missingDays).toHaveLength(7);
    expect(m.completenessPct).toBe(0);
  });
  it('ignores entries outside the range and works with no timeline', () => {
    const outside = [...WEEK, mk('2026-03-08'), mk('2026-03-16')];
    const m = E.buildWeeklyMetrics(outside, [], range);
    expect(m.sessions).toBe(3);
    expect(m.avgRecovery).not.toBeNull();
  });
  it('full week is 100% complete with no missing days', () => {
    const full = Array.from({ length: 7 }, (_, i) => mk(E.addDays('2026-03-09', i)));
    const m = E.buildWeeklyMetrics(full, E.computeTwinTimeline(full), range);
    expect(m.completenessPct).toBe(100);
    expect(m.missingDays).toEqual([]);
  });
  it('is deterministic', () => {
    const tl = E.computeTwinTimeline(WEEK);
    expect(E.buildWeeklyMetrics(WEEK, tl, range)).toEqual(E.buildWeeklyMetrics([...WEEK].reverse(), tl, range));
  });
});

describe('buildWeeklyTrends / buildWeeklySummary', () => {
  it('compares this week with the previous week', () => {
    const prevWeek = ['2026-03-02', '2026-03-03', '2026-03-04'].map((d) => mk(d, { performanceScore: 50, durationMinutes: 60 }));
    const curWeek = ['2026-03-09', '2026-03-10', '2026-03-11'].map((d) => mk(d, { performanceScore: 60, durationMinutes: 60 }));
    const all = [...prevWeek, ...curWeek];
    const t = E.buildWeeklyTrends(all, E.computeTwinTimeline(all), range);
    expect(t.performance.label).toBe('improving');
    expect(t.performance.changePct).toBe(20);
    expect(t.trainingDuration.label).toBe('stable');
  });
  it('summary mentions real numbers and attention events', () => {
    const tl = E.computeTwinTimeline(WEEK);
    const m = E.buildWeeklyMetrics(WEEK, tl, range);
    const trends = E.buildWeeklyTrends(WEEK, tl, range);
    const s = E.buildWeeklySummary(m, trends, [{ date: '2026-03-14', title: 't', message: 'm', rule: 'LOAD_UP_RECOVERY_DOWN' }]);
    expect(s).toContain('3 of 7 days');
    expect(s).toContain('180 minutes');
    expect(s).toContain('1 Needs Attention alert was raised');
    expect(s).toContain('not enough data to classify');
    expect(E.buildWeeklySummary(m, trends, [])).toContain('No Needs Attention alerts');
  });
  it('summary for an empty week does not fabricate numbers', () => {
    const m = E.buildWeeklyMetrics([], [], range);
    const s = E.buildWeeklySummary(m, null, []);
    expect(s).toMatch(/No training days were logged/);
    expect(s).not.toMatch(/NaN|null|undefined/);
  });
});
