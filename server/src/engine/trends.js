'use strict';
/**
 * Trend classification.
 *
 * classifyTrend(prevValues, currValues, opts):
 *   previousMean / currentMean = arithmetic mean of finite values (nulls ignored, never counted as 0)
 *   changePct = (currentMean - previousMean) / previousMean x 100   (null if previousMean is 0/missing)
 *   label:
 *     insufficient_data  if either window has < minDays (default 3) values, or changePct is null
 *     improving          if changePct >=  threshold (default 5)
 *     declining          if changePct <= -threshold
 *     stable             otherwise (|change| < threshold)
 *
 * computeTrends(entries, timeline): trailing windows (last 7 calendar days ending at the last entry date vs
 *   the 7 days before) for performance (performanceScore), trainingDuration (durationMinutes) and
 *   recovery (dailyRecovery).
 */
const C = require('./constants');
const { mean, percentChange, round2, isNum, windowRanges, inRange } = require('./metrics');

function classifyTrend(prevValues, currValues, opts = {}) {
  const threshold = isNum(opts.threshold) ? opts.threshold : C.TREND_THRESHOLD_PCT;
  const minDays = isNum(opts.minDays) ? opts.minDays : C.MIN_DAYS_PER_WINDOW;
  const windowDays = isNum(opts.windowDays) ? opts.windowDays : C.TREND_WINDOW_DAYS;
  const prev = (prevValues || []).filter(isNum);
  const curr = (currValues || []).filter(isNum);
  const previousMean = mean(prev);
  const currentMean = mean(curr);
  const raw = percentChange(previousMean, currentMean);
  const changePct = raw === null ? null : round2(raw);
  const basis = `Mean of current ${windowDays}-day window (${curr.length} entries) vs previous ${windowDays}-day window (${prev.length} entries); threshold +/-${threshold}%.`;

  let label;
  if (prev.length < minDays || curr.length < minDays || raw === null) label = 'insufficient_data';
  else if (raw >= threshold) label = 'improving';
  else if (raw <= -threshold) label = 'declining';
  else label = 'stable';

  return {
    label,
    changePct,
    previousMean: previousMean === null ? null : round2(previousMean),
    currentMean: currentMean === null ? null : round2(currentMean),
    previousDays: prev.length,
    currentDays: curr.length,
    basis,
  };
}

function computeTrends(entries, timeline) {
  const empty = () => classifyTrend([], []);
  if (!entries || entries.length === 0) {
    return { performance: empty(), trainingDuration: empty(), recovery: empty() };
  }
  const last = entries.reduce((m, e) => (e.date > m ? e.date : m), entries[0].date);
  const { current, previous } = windowRanges(last);
  const pick = (list, field, range) => list.filter((e) => inRange(e.date, range)).map((e) => e[field]);
  const tl = timeline || [];
  return {
    performance: classifyTrend(pick(entries, 'performanceScore', previous), pick(entries, 'performanceScore', current)),
    trainingDuration: classifyTrend(pick(entries, 'durationMinutes', previous), pick(entries, 'durationMinutes', current)),
    recovery: classifyTrend(pick(tl, 'dailyRecovery', previous), pick(tl, 'dailyRecovery', current)),
  };
}

module.exports = { classifyTrend, computeTrends };
