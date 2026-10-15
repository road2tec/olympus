'use strict';
/**
 * OLYMPUS engine constants (CONTRACT section 6). Pure module, no side effects.
 *
 * Extra (non-contract) constants document the deterministic fatigue/adaptation model:
 *  - LOAD_REFERENCE_CEILING: 600 = 60 min x intensity 10. Load EMA at or above it maps to loadIndex 100.
 *  - ADAPTATION_INITIAL: adaptation of the first twin state.
 */
module.exports = Object.freeze({
  EMA_ALPHA_DEFAULT: 0.3,
  SLEEP_TARGET_HOURS: 8,
  RECOVERY_WEIGHTS: Object.freeze({ sleep: 0.5, feeling: 0.5 }),
  TREND_THRESHOLD_PCT: 5,
  TREND_WINDOW_DAYS: 7,
  MIN_DAYS_PER_WINDOW: 3,
  ATTENTION_LOAD_RISE_PCT: 10,
  ATTENTION_RECOVERY_DROP_PCT: 5,
  LOAD_REFERENCE_CEILING: 600,
  ADAPTATION_INITIAL: 50,
  DISCLAIMER:
    'Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach.',
});
