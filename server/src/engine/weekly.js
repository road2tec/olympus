'use strict';
/**
 * Weekly report maths (CONTRACT section 7). Weeks run Monday..Sunday on UTC calendar strings.
 *
 * getWeekRange(dateOrString, tz): Monday = date - ((utcDay + 6) % 7) days; Sunday = Monday + 6.
 *   Strings are used as calendar days (tz irrelevant). A Date object is converted to a calendar day in `tz`
 *   (IANA name, default 'UTC'; invalid tz falls back to UTC).
 *
 * buildWeeklyMetrics(entries, timeline, {start,end}):
 *   Entries are filtered to [start,end] (duplicate dates: last wins).
 *   sessions            = number of entries
 *   totalDurationMinutes= sum durationMinutes
 *   avgIntensity        = mean intensity
 *   avgPerformance      = mean performanceScore
 *   avgRecovery         = mean daily recovery score (from timeline.dailyRecovery, else recoveryScore())
 *   avgSleepHours       = mean sleepHours
 *   totalTrainingLoad   = sum(duration x intensity)
 *   avgDailyTrainingLoad= totalTrainingLoad / daysLogged   (days with an entry only)
 *   daysLogged, daysInPeriod = 7, missingDays = dates in the week without an entry,
 *   completenessPct     = daysLogged / 7 x 100 (1 dp)
 *   Averages are null when no data (never 0). Extra key attentionStatus = detectNeedsAttention status using
 *   data up to the week's end date.
 *
 * buildWeeklyTrends(entries, {start,end}): classifyTrend of this week vs the previous week (performance,
 *   trainingDuration, recovery) using the daily values of both weeks.
 *
 * buildWeeklySummary(metrics, trends, attentionEvents): deterministic plain-English summary.
 */
const { mean, round2, isNum, isDateString, toDateString, addDays, recoveryScore, dailyTrainingLoad } = require('./metrics');
const { classifyTrend } = require('./trends');
const { detectNeedsAttention } = require('./attention');
const { normaliseEntries } = require('./compute');

function calendarDayInTz(date, tz) {
  if (!tz || tz === 'UTC') return date.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch (_e) {
    return date.toISOString().slice(0, 10);
  }
}

function getWeekRange(dateOrString, tz = 'UTC') {
  let day;
  if (dateOrString instanceof Date) {
    if (Number.isNaN(dateOrString.getTime())) throw new RangeError('Invalid date');
    day = calendarDayInTz(dateOrString, tz);
  } else if (typeof dateOrString === 'string' && isDateString(dateOrString)) {
    day = dateOrString;
  } else {
    day = toDateString(dateOrString);
  }
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const start = addDays(day, -((dow + 6) % 7));
  return { start, end: addDays(start, 6) };
}

function weekDates(start) {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
}

function buildWeeklyMetrics(entries, timeline, range) {
  const { start, end } = range;
  const week = normaliseEntries(entries).filter((e) => e.date >= start && e.date <= end);
  const recByDate = new Map((timeline || []).map((t) => [t.date, t.dailyRecovery]));
  const recoveries = week.map((e) => (recByDate.has(e.date) ? recByDate.get(e.date) : recoveryScore(e.sleepHours, e.feelingScore)));
  const loads = week.map((e) => dailyTrainingLoad(e.durationMinutes, e.intensity));
  const logged = new Set(week.map((e) => e.date));
  const missingDays = weekDates(start).filter((d) => !logged.has(d));
  const daysLogged = week.length;
  const avg = (vals) => {
    const m = mean(vals);
    return m === null ? null : round2(m);
  };
  const totalLoad = loads.reduce((a, b) => a + b, 0);

  const series = (timeline || []).filter((t) => t.date <= end).map((t) => ({ date: t.date, trainingLoad: t.dailyTrainingLoad, recovery: t.dailyRecovery }));

  return {
    sessions: daysLogged,
    totalDurationMinutes: week.reduce((a, e) => a + e.durationMinutes, 0),
    avgIntensity: avg(week.map((e) => e.intensity)),
    avgPerformance: avg(week.map((e) => e.performanceScore)),
    avgRecovery: avg(recoveries),
    avgSleepHours: avg(week.map((e) => e.sleepHours)),
    totalTrainingLoad: totalLoad,
    avgDailyTrainingLoad: daysLogged === 0 ? null : round2(totalLoad / daysLogged),
    daysLogged,
    daysInPeriod: 7,
    missingDays,
    completenessPct: Math.round((daysLogged / 7) * 1000) / 10,
    attentionStatus: detectNeedsAttention(series).status,
  };
}

function buildWeeklyTrends(entries, timeline, range) {
  const prevRange = { start: addDays(range.start, -7), end: addDays(range.start, -1) };
  const all = normaliseEntries(entries);
  const recByDate = new Map((timeline || []).map((t) => [t.date, t.dailyRecovery]));
  const within = (r) => all.filter((e) => e.date >= r.start && e.date <= r.end);
  const rec = (e) => (recByDate.has(e.date) ? recByDate.get(e.date) : recoveryScore(e.sleepHours, e.feelingScore));
  const cur = within(range);
  const prev = within(prevRange);
  const opts = { windowDays: 7 };
  return {
    performance: classifyTrend(prev.map((e) => e.performanceScore), cur.map((e) => e.performanceScore), opts),
    trainingDuration: classifyTrend(prev.map((e) => e.durationMinutes), cur.map((e) => e.durationMinutes), opts),
    recovery: classifyTrend(prev.map(rec), cur.map(rec), opts),
  };
}

const LABEL_TEXT = { improving: 'improving', stable: 'stable', declining: 'declining', insufficient_data: 'not enough data to classify' };
const fmt = (n, d = 1) => (isNum(n) ? n.toFixed(d) : 'n/a');

function buildWeeklySummary(metrics, trends, attentionEvents) {
  const m = metrics || {};
  if (!m.daysLogged) {
    return 'No training days were logged this week, so no averages or trends are available. Logging at least 3 days per week gives Olympus enough data for reliable comparisons.';
  }
  const parts = [];
  parts.push(
    `You logged ${m.daysLogged} of ${m.daysInPeriod || 7} days (${fmt(m.completenessPct)}% complete) with ${m.sessions} session${m.sessions === 1 ? '' : 's'} totalling ${m.totalDurationMinutes} minutes and a training load of ${fmt(m.totalTrainingLoad, 0)}.`,
  );
  parts.push(`Average performance was ${fmt(m.avgPerformance)}, average recovery ${fmt(m.avgRecovery)} and average sleep ${fmt(m.avgSleepHours)} hours.`);
  if (trends) {
    const t = (key, name) => {
      const x = trends[key];
      if (!x) return null;
      return x.label === 'insufficient_data' ? `${name} has not enough data to classify` : `${name} is ${LABEL_TEXT[x.label]} (${fmt(x.changePct)}% vs previous week)`;
    };
    const tr = [t('performance', 'performance'), t('trainingDuration', 'training duration'), t('recovery', 'recovery')].filter(Boolean);
    if (tr.length) parts.push(`Compared with the previous week, ${tr.join('; ')}.`);
  }
  const n = (attentionEvents || []).length;
  parts.push(
    n > 0
      ? `${n} Needs Attention alert${n === 1 ? ' was' : 's were'} raised this week (training load up while recovery fell); consider reviewing your schedule with your coach.`
      : 'No Needs Attention alerts were raised this week.',
  );
  return parts.join(' ');
}

module.exports = { getWeekRange, buildWeeklyMetrics, buildWeeklyTrends, buildWeeklySummary };
