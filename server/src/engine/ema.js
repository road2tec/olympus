'use strict';
/**
 * Exponential moving average and the deterministic fatigue / adaptation model.
 *
 * EMA
 *   ema(previous, current, alpha) = previous == null ? current : alpha*current + (1-alpha)*previous
 *   The first observation initialises the EMA (never 0). Default alpha = 0.30 (EMA_ALPHA_DEFAULT).
 *   The EMA is advanced per LOGGED entry (days without entries are not filled with zeros).
 *
 * FATIGUE (0..100)
 *   loadIndex = min(loadEma / 600, 1) x 100        (600 = 60 min x intensity 10 reference ceiling)
 *   fatigue   = clamp(0.6 x loadIndex + 0.4 x (100 - recoveryEma), 0, 100)
 *
 * ADAPTATION (0..100, initial 50 when there is no previous adaptation / first state)
 *   Each state moves the previous adaptation by one bounded step:
 *     overreaching = max(fatigue, prevFatigue ?? fatigue) >= 70
 *     if recoveryEma >= 60 and loadIndex >= 20 and not overreaching:
 *          step = +3 x (loadIndex/100) x (recoveryEma/100)     (productive stimulus + adequate recovery)
 *     else if recoveryEma < 40 or overreaching:
 *          step = -2 x (1 - recoveryEma/100)                    (poor recovery / overreaching erodes adaptation)
 *     else if loadIndex < 20:
 *          step = -0.5                                          (detraining: almost no stimulus)
 *     else step = 0
 *   adaptation = clamp(prevAdaptation + step, 0, 100)
 *   prevLoadEma / prevRecoveryEma only serve to detect the first state (both null -> adaptation = 50).
 * Outputs rounded to 2 dp. Pure and deterministic.
 */
const C = require('./constants');
const { isNum, clamp, round2 } = require('./metrics');

function ema(previous, current, alpha = C.EMA_ALPHA_DEFAULT) {
  if (!isNum(current)) throw new RangeError('ema requires a finite current value');
  if (!isNum(alpha) || alpha <= 0 || alpha > 1) throw new RangeError('alpha must be in (0, 1]');
  if (previous === null || previous === undefined || Number.isNaN(previous)) return current;
  return alpha * current + (1 - alpha) * previous;
}

function deriveFatigueAdaptation({ loadEma, recoveryEma, prevLoadEma, prevRecoveryEma, prevFatigue, prevAdaptation } = {}) {
  if (!isNum(loadEma) || !isNum(recoveryEma)) {
    throw new RangeError('deriveFatigueAdaptation requires finite loadEma and recoveryEma');
  }
  const loadIndex = Math.min(loadEma / C.LOAD_REFERENCE_CEILING, 1) * 100;
  const fatigue = clamp(0.6 * loadIndex + 0.4 * (100 - recoveryEma));

  const first = !isNum(prevAdaptation) || (prevLoadEma == null && prevRecoveryEma == null);
  let adaptation;
  if (first) {
    adaptation = C.ADAPTATION_INITIAL;
  } else {
    const overreaching = Math.max(fatigue, isNum(prevFatigue) ? prevFatigue : fatigue) >= 70;
    let step = 0;
    if (recoveryEma >= 60 && loadIndex >= 20 && !overreaching) step = 3 * (loadIndex / 100) * (recoveryEma / 100);
    else if (recoveryEma < 40 || overreaching) step = -2 * (1 - recoveryEma / 100);
    else if (loadIndex < 20) step = -0.5;
    adaptation = clamp(prevAdaptation + step);
  }
  return { fatigue: round2(fatigue), adaptation: round2(adaptation) };
}

module.exports = { ema, deriveFatigueAdaptation };
