'use strict';
/**
 * Deterministic, template-based insight generation. No randomness, no clock, no AI: every number in the
 * message is taken from the computed attention / trend objects, formatted with 1 decimal place.
 *
 * Decision order (first match wins):
 *  1. no timeline                                  -> type insufficient_data, rule NO_DATA
 *  2. attention.status === 'needs_attention'       -> type needs_attention, rule LOAD_UP_RECOVERY_DOWN
 *       severity = critical if load change >= +30% and recovery change <= -15%, else warning
 *       message contains the disclaimer sentence "Olympus is a decision-support tool and does not replace a
 *       doctor or physiotherapist."
 *  3. attention.status === 'insufficient_data'     -> type insufficient_data, rule INSUFFICIENT_DATA
 *  4. attention.status === 'monitoring'            -> type monitoring, rule INSUFFICIENT_WINDOW_DATA
 *  5. status ok and only ONE condition met         -> type monitoring, rule LOAD_UP_ONLY / RECOVERY_DOWN_ONLY
 *       (never flagged as needs_attention; both conditions are required)
 *  6. performance trend improving / declining      -> type trend, rule PERFORMANCE_IMPROVING / PERFORMANCE_DECLINING
 *  7. otherwise                                    -> type info, rule STABLE
 */
const C = require('./constants');
const { isNum } = require('./metrics');

const f1 = (n) => (isNum(n) ? n.toFixed(1) : 'n/a');
const abs1 = (n) => (isNum(n) ? Math.abs(n).toFixed(1) : 'n/a');

const factor = (metric, label, previous, current, changePct, unit) => ({ metric, label, previous, current, changePct, unit });

function generateInsight({ timeline, attention, trends } = {}) {
  const tl = timeline || [];
  if (tl.length === 0 || !attention) {
    return {
      type: 'insufficient_data',
      severity: 'info',
      title: 'No data yet',
      message: 'Log your first training day to start building your digital twin. Insights appear once enough entries are available.',
      rule: 'NO_DATA',
      contributingFactors: [],
    };
  }

  const m = attention.metrics;
  const loadF = m ? factor('trainingLoad', 'Average daily training load', m.trainingLoad.previous, m.trainingLoad.current, m.trainingLoad.changePct, 'load units') : null;
  const recF = m ? factor('recovery', 'Average recovery score', m.recovery.previous, m.recovery.current, m.recovery.changePct, 'score') : null;

  if (attention.status === 'needs_attention') {
    const l = m.trainingLoad;
    const r = m.recovery;
    const critical = l.changePct >= 30 && r.changePct <= -15;
    return {
      type: 'needs_attention',
      severity: critical ? 'critical' : 'warning',
      title: 'Needs Attention: higher load with lower recovery',
      message:
        `Training load has increased by ${f1(l.changePct)}% compared with the previous 7 days (${f1(l.previous)} to ${f1(l.current)}), ` +
        `while your recovery score has declined by ${abs1(r.changePct)}% (${f1(r.previous)} to ${f1(r.current)}). ` +
        'Consider discussing your recent training schedule and recovery with your coach. ' +
        'Olympus is a decision-support tool and does not replace a doctor or physiotherapist.',
      rule: 'LOAD_UP_RECOVERY_DOWN',
      contributingFactors: [loadF, recF],
    };
  }

  if (attention.status === 'insufficient_data') {
    return {
      type: 'insufficient_data',
      severity: 'info',
      title: 'Not enough data to compare yet',
      message: `${attention.explanation} Keep logging regularly; Olympus compares the last 7 days with the 7 days before once both periods have at least ${C.MIN_DAYS_PER_WINDOW} entries.`,
      rule: 'INSUFFICIENT_DATA',
      contributingFactors: [],
    };
  }

  if (attention.status === 'monitoring') {
    return {
      type: 'monitoring',
      severity: 'info',
      title: 'Monitoring: building your baseline',
      message: attention.explanation,
      rule: 'INSUFFICIENT_WINDOW_DATA',
      contributingFactors: [],
    };
  }

  // status ok: both windows have enough data
  const loadUp = m && isNum(m.trainingLoad.changePct) && m.trainingLoad.changePct >= C.ATTENTION_LOAD_RISE_PCT;
  const recDown = m && isNum(m.recovery.changePct) && m.recovery.changePct <= -C.ATTENTION_RECOVERY_DROP_PCT;
  if (loadUp) {
    return {
      type: 'monitoring',
      severity: 'info',
      title: 'Monitoring: training load is rising',
      message: `Training load rose ${f1(m.trainingLoad.changePct)}% versus the previous 7 days (${f1(m.trainingLoad.previous)} to ${f1(m.trainingLoad.current)}), but your recovery score is holding (${f1(m.recovery.changePct)}%, ${f1(m.recovery.previous)} to ${f1(m.recovery.current)}). No attention flag is raised because recovery has not dropped; keep watching sleep and how you feel.`,
      rule: 'LOAD_UP_ONLY',
      contributingFactors: [loadF, recF],
    };
  }
  if (recDown) {
    return {
      type: 'monitoring',
      severity: 'info',
      title: 'Monitoring: recovery is dipping',
      message: `Your recovery score fell ${abs1(m.recovery.changePct)}% versus the previous 7 days (${f1(m.recovery.previous)} to ${f1(m.recovery.current)}), while training load did not rise by ${C.ATTENTION_LOAD_RISE_PCT}% or more (${f1(m.trainingLoad.changePct)}%, ${f1(m.trainingLoad.previous)} to ${f1(m.trainingLoad.current)}). No attention flag is raised; consider prioritising sleep.`,
      rule: 'RECOVERY_DOWN_ONLY',
      contributingFactors: [loadF, recF],
    };
  }

  const p = trends && trends.performance;
  if (p && p.label === 'improving') {
    return {
      type: 'trend',
      severity: 'positive',
      title: 'Performance is trending up',
      message: `Your average performance score is up ${f1(p.changePct)}% versus the previous 7 days (${f1(p.previousMean)} to ${f1(p.currentMean)}), with training load and recovery within normal range.`,
      rule: 'PERFORMANCE_IMPROVING',
      contributingFactors: [factor('performance', 'Average performance score', p.previousMean, p.currentMean, p.changePct, 'score'), loadF, recF].filter(Boolean),
    };
  }
  if (p && p.label === 'declining') {
    return {
      type: 'trend',
      severity: 'warning',
      title: 'Performance is trending down',
      message: `Your average performance score is down ${abs1(p.changePct)}% versus the previous 7 days (${f1(p.previousMean)} to ${f1(p.currentMean)}). Training load and recovery have not triggered an attention flag; review sleep, nutrition and session quality with your coach.`,
      rule: 'PERFORMANCE_DECLINING',
      contributingFactors: [factor('performance', 'Average performance score', p.previousMean, p.currentMean, p.changePct, 'score'), loadF, recF].filter(Boolean),
    };
  }
  return {
    type: 'info',
    severity: 'info',
    title: 'Steady state',
    message: `Training load (${f1(m.trainingLoad.changePct)}%), recovery (${f1(m.recovery.changePct)}%) and performance are stable versus the previous 7 days. No action needed.`,
    rule: 'STABLE',
    contributingFactors: [loadF, recF],
  };
}

module.exports = { generateInsight };
