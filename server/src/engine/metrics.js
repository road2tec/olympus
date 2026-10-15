'use strict';
/**
 * Core metric formulas and small shared helpers (pure, deterministic).
 *
 * FORMULAS
 *  dailyTrainingLoad = durationMinutes x intensity            (e.g. 60 min x 7 = 420)
 *  recoveryScore:
 *    sleepComponent   = min(sleepHours / 8, 1) x 100           (clamped 0..100)
 *    feelingComponent = (feelingScore - 1) / 4 x 100           (1 -> 0, 5 -> 100; clamped 0..100)
 *    recovery         = 0.5 x sleepComponent + 0.5 x feelingComponent, clamped 0..100, rounded to 2 dp
 *  percentChange(prev, curr) = (curr - prev) / prev x 100; null when prev is missing or 0 (no division by zero)
 *
 * Calendar handling: only 'YYYY-MM-DD' strings, UTC arithmetic (no local-time maths).
 * Missing values are never replaced by 0.
 */
const C = require('./constants');

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round2 = (v) => (isNum(v) ? Math.round((v + Number.EPSILON) * 100) / 100 : v);

function dailyTrainingLoad(durationMinutes, intensity) {
  if (!isNum(durationMinutes) || !isNum(intensity)) {
    throw new RangeError('dailyTrainingLoad requires finite numeric durationMinutes and intensity');
  }
  if (durationMinutes < 0 || intensity < 0) throw new RangeError('durationMinutes and intensity must be >= 0');
  return durationMinutes * intensity;
}

function recoveryScore(sleepHours, feelingScore) {
  if (!isNum(sleepHours) || !isNum(feelingScore)) {
    throw new RangeError('recoveryScore requires finite numeric sleepHours and feelingScore');
  }
  const sleepComponent = clamp(Math.min(sleepHours / C.SLEEP_TARGET_HOURS, 1) * 100);
  const feelingComponent = clamp(((feelingScore - 1) / 4) * 100);
  const score = C.RECOVERY_WEIGHTS.sleep * sleepComponent + C.RECOVERY_WEIGHTS.feeling * feelingComponent;
  return round2(clamp(score));
}

function percentChange(previous, current) {
  if (!isNum(previous) || !isNum(current) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function mean(values) {
  const v = (values || []).filter(isNum);
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isDateString(s) {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Accepts 'YYYY-MM-DD', ISO string or Date (UTC calendar day). */
function toDateString(v) {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) throw new RangeError('Invalid date');
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    if (isDateString(v)) return v;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  throw new RangeError(`Invalid date: ${String(v)}`);
}

function addDays(dateStr, n) {
  const m = DATE_RE.exec(dateStr);
  if (!m) throw new RangeError(`Invalid date string: ${dateStr}`);
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function daysBetween(fromStr, toStr) {
  const f = DATE_RE.exec(fromStr);
  const t = DATE_RE.exec(toStr);
  if (!f || !t) throw new RangeError('Invalid date string');
  return Math.round((Date.UTC(+t[1], +t[2] - 1, +t[3]) - Date.UTC(+f[1], +f[2] - 1, +f[3])) / 86400000);
}

/** Windows ending at lastDate: current = last N days, previous = the N days before. */
function windowRanges(lastDate, days = C.TREND_WINDOW_DAYS) {
  return {
    current: { from: addDays(lastDate, -(days - 1)), to: lastDate },
    previous: { from: addDays(lastDate, -(2 * days - 1)), to: addDays(lastDate, -days) },
  };
}

const inRange = (d, r) => d >= r.from && d <= r.to;

module.exports = {
  dailyTrainingLoad,
  recoveryScore,
  percentChange,
  mean,
  isNum,
  clamp,
  round2,
  isDateString,
  toDateString,
  addDays,
  daysBetween,
  windowRanges,
  inRange,
};
