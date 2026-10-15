'use strict';
/**
 * "Needs Attention" rule LOAD_UP_RECOVERY_DOWN (explainable, deterministic).
 *
 * Input: dailySeries [{date, trainingLoad, recovery}] sorted ascending (re-sorted / de-duplicated defensively;
 * last entry per date wins). Windows are calendar based, anchored at the last entry date L:
 *   current  = [L-6, L]     previous = [L-13, L-7]
 * Only days with an entry count (rest days are absent, never zero).
 *
 * Status:
 *   no entries, or no entries in the previous window  -> insufficient_data
 *   < 3 entries in either window                      -> monitoring (data is building up, no verdict)
 *   both windows >= 3 entries:
 *     loadChange     = pct change of mean trainingLoad (current vs previous)
 *     recoveryChange = pct change of mean recovery
 *     loadChange >= +10 AND recoveryChange <= -5      -> needs_attention (rule LOAD_UP_RECOVERY_DOWN)
 *     otherwise                                       -> ok   (a single moving metric never triggers the flag)
 * A null change (zero denominator) can never satisfy a condition.
 * Extra field `metrics` ({trainingLoad,recovery} each {previous,current,changePct}) is provided for explainability.
 */
const C = require('./constants');
const { mean, percentChange, round2, isNum, windowRanges, inRange } = require('./metrics');

const f1 = (n) => (isNum(n) ? n.toFixed(1) : 'n/a');

function detectNeedsAttention(dailySeries, opts = {}) {
  const minDays = isNum(opts.minDays) ? opts.minDays : C.MIN_DAYS_PER_WINDOW;
  const loadRise = isNum(opts.loadRisePct) ? opts.loadRisePct : C.ATTENTION_LOAD_RISE_PCT;
  const recDrop = isNum(opts.recoveryDropPct) ? opts.recoveryDropPct : C.ATTENTION_RECOVERY_DROP_PCT;
  const evaluatedAt = opts.now instanceof Date ? opts.now.toISOString() : new Date().toISOString();

  const byDate = new Map();
  for (const p of dailySeries || []) {
    if (p && typeof p.date === 'string' && isNum(p.trainingLoad) && isNum(p.recovery)) byDate.set(p.date, p);
  }
  const series = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  if (series.length === 0) {
    return {
      status: 'insufficient_data',
      rule: null,
      comparisonPeriod: { previous: { from: null, to: null, days: 0 }, current: { from: null, to: null, days: 0 } },
      triggers: [],
      metrics: null,
      explanation: 'No training entries have been logged yet, so no comparison can be made.',
      evaluatedAt,
    };
  }
  const last = series[series.length - 1].date;
  const w = windowRanges(last);
  const cur = series.filter((p) => inRange(p.date, w.current));
  const prev = series.filter((p) => inRange(p.date, w.previous));
  const comparisonPeriod = {
    previous: { from: w.previous.from, to: w.previous.to, days: prev.length },
    current: { from: w.current.from, to: w.current.to, days: cur.length },
  };
  const base = { rule: null, comparisonPeriod, triggers: [], metrics: null, evaluatedAt };

  if (prev.length === 0) {
    return {
      ...base,
      status: 'insufficient_data',
      explanation: `No entries were logged between ${w.previous.from} and ${w.previous.to}, so the last 7 days cannot be compared with the 7 days before.`,
    };
  }
  if (prev.length < minDays || cur.length < minDays) {
    return {
      ...base,
      status: 'monitoring',
      explanation: `Monitoring: at least ${minDays} entries are needed in each 7-day window (previous: ${prev.length}, current: ${cur.length}) before a comparison is reliable.`,
    };
  }

  const pl = mean(prev.map((p) => p.trainingLoad));
  const cl = mean(cur.map((p) => p.trainingLoad));
  const pr = mean(prev.map((p) => p.recovery));
  const cr = mean(cur.map((p) => p.recovery));
  const rawLoad = percentChange(pl, cl);
  const rawRec = percentChange(pr, cr);
  const loadChangePct = rawLoad === null ? null : round2(rawLoad);
  const recChangePct = rawRec === null ? null : round2(rawRec);
  const metrics = {
    trainingLoad: { previous: round2(pl), current: round2(cl), changePct: loadChangePct },
    recovery: { previous: round2(pr), current: round2(cr), changePct: recChangePct },
  };

  const loadUp = rawLoad !== null && rawLoad >= loadRise;
  const recDown = rawRec !== null && rawRec <= -recDrop;

  if (loadUp && recDown) {
    return {
      ...base,
      status: 'needs_attention',
      rule: 'LOAD_UP_RECOVERY_DOWN',
      metrics,
      triggers: [
        { metric: 'trainingLoad', previous: metrics.trainingLoad.previous, current: metrics.trainingLoad.current, changePct: loadChangePct },
        { metric: 'recovery', previous: metrics.recovery.previous, current: metrics.recovery.current, changePct: recChangePct },
      ],
      explanation: `Mean training load changed ${f1(rawLoad)}% (${f1(pl)} -> ${f1(cl)}, threshold +${loadRise}%) while mean recovery changed ${f1(rawRec)}% (${f1(pr)} -> ${f1(cr)}, threshold -${recDrop}%) between ${w.previous.from}..${w.previous.to} and ${w.current.from}..${w.current.to}.`,
    };
  }
  const parts = [
    `load ${loadChangePct === null ? 'n/a' : `${f1(rawLoad)}%`} (needs >= +${loadRise}%): ${loadUp ? 'met' : 'not met'}`,
    `recovery ${recChangePct === null ? 'n/a' : `${f1(rawRec)}%`} (needs <= -${recDrop}%): ${recDown ? 'met' : 'not met'}`,
  ];
  return {
    ...base,
    status: 'ok',
    metrics,
    explanation: `No attention flag: both conditions are required; ${parts.join('; ')}.`,
  };
}

module.exports = { detectNeedsAttention };
