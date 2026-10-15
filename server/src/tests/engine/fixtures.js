'use strict';
const { addDays } = require('../../engine');

/** Build one entry per listed date with the given overrides. */
function mk(date, over = {}, i = 0) {
  return {
    _id: `id-${date}`,
    date,
    durationMinutes: 60,
    intensity: 6,
    performanceScore: 70,
    feelingScore: 4,
    sleepHours: 8,
    ...over,
    _i: i,
  };
}

/** entries for `offsets` (days relative to `base`) */
function block(base, offsets, over) {
  return offsets.map((o, i) => mk(addDays(base, o), typeof over === 'function' ? over(o, i) : over, i));
}

const LAST = '2026-03-15';
// previous window 03-02..03-08 ; current window 03-09..03-15
const PREV_OFFSETS = [-13, -12, -10, -9, -8]; // 5 entries
const CUR_OFFSETS = [-6, -5, -3, -2, 0]; // 5 entries

function scenario({ prev, cur }) {
  return [...block(LAST, PREV_OFFSETS, prev), ...block(LAST, CUR_OFFSETS, cur)];
}

module.exports = { mk, block, scenario, LAST, PREV_OFFSETS, CUR_OFFSETS };
