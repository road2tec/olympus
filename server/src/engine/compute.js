'use strict';
/**
 * Twin timeline and full athlete analysis.
 *
 * computeTwinTimeline(entries, {alpha}):
 *   - entries normalised to 'YYYY-MM-DD' (Date / ISO accepted), sorted by date; duplicate dates: the LAST one
 *     in input order wins.
 *   - per entry: dailyTrainingLoad = duration x intensity; dailyRecovery = recoveryScore(sleep, feeling)
 *   - performance / trainingLoad / recovery = EMA (alpha default 0.30) of performanceScore / dailyTrainingLoad /
 *     dailyRecovery; first value initialises the EMA. A missing performanceScore keeps the previous
 *     performance EMA (null if none yet); it is never treated as 0.
 *   - fatigue / adaptation from ema.deriveFatigueAdaptation (see ema.js). Initial adaptation = 50.
 *   - sequence = 1-based position. EMA chains run on unrounded values; outputs are rounded to 2 dp.
 *
 * analyzeAthlete(entries, {alpha, now}) -> {timeline, latest, previous, attention, trends, insight}
 *   attention uses the RAW daily load / recovery per logged day (not the EMA).
 */
const C = require('./constants');
const { dailyTrainingLoad, recoveryScore, round2, isNum, toDateString } = require('./metrics');
const { ema, deriveFatigueAdaptation } = require('./ema');
const { detectNeedsAttention } = require('./attention');
const { computeTrends } = require('./trends');
const { generateInsight } = require('./insights');

function normaliseEntries(entries) {
  const byDate = new Map();
  for (const e of entries || []) {
    if (!e) continue;
    const date = toDateString(e.date);
    byDate.set(date, { ...e, date });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function computeTwinTimeline(entries, opts = {}) {
  const alpha = opts.alpha === undefined || opts.alpha === null ? C.EMA_ALPHA_DEFAULT : opts.alpha;
  if (!isNum(alpha) || alpha <= 0 || alpha > 1) throw new RangeError('alpha must be in (0, 1]');
  const sorted = normaliseEntries(entries);
  const timeline = [];
  let perfEma = null;
  let loadEma = null;
  let recEma = null;
  let prev = null;

  sorted.forEach((e, i) => {
    const load = dailyTrainingLoad(e.durationMinutes, e.intensity);
    const rec = recoveryScore(e.sleepHours, e.feelingScore);
    const prevLoadEma = loadEma;
    const prevRecEma = recEma;
    if (isNum(e.performanceScore)) perfEma = ema(perfEma, e.performanceScore, alpha);
    loadEma = ema(loadEma, load, alpha);
    recEma = ema(recEma, rec, alpha);
    const { fatigue, adaptation } = deriveFatigueAdaptation({
      loadEma,
      recoveryEma: recEma,
      prevLoadEma,
      prevRecoveryEma: prevRecEma,
      prevFatigue: prev ? prev.fatigue : null,
      prevAdaptation: prev ? prev.adaptation : null,
    });
    const state = {
      date: e.date,
      entryId: e._id !== undefined && e._id !== null ? e._id : null,
      sequence: i + 1,
      dailyTrainingLoad: load,
      dailyRecovery: rec,
      performance: perfEma === null ? null : round2(perfEma),
      trainingLoad: round2(loadEma),
      recovery: round2(recEma),
      fatigue,
      adaptation,
    };
    timeline.push(state);
    prev = state;
  });
  return timeline;
}

function analyzeAthlete(entries, opts = {}) {
  const normalised = normaliseEntries(entries);
  const timeline = computeTwinTimeline(normalised, opts);
  const latest = timeline.length ? timeline[timeline.length - 1] : null;
  const previous = timeline.length > 1 ? timeline[timeline.length - 2] : null;
  const attention = detectNeedsAttention(
    timeline.map((t) => ({ date: t.date, trainingLoad: t.dailyTrainingLoad, recovery: t.dailyRecovery })),
    { now: opts.now },
  );
  const trends = computeTrends(normalised, timeline);
  const insight = generateInsight({ timeline, attention, trends });
  return { timeline, latest, previous, attention, trends, insight };
}

module.exports = { computeTwinTimeline, analyzeAthlete, normaliseEntries };
