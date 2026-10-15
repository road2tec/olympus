'use strict';
/**
 * Twin service: persists the output of the pure engine (CONTRACT section 6).
 *
 * recomputeTwin(athleteId) is a FULL recompute from all DailyEntries, so it is idempotent and correct after
 * create or edit. Calls for the same athlete are serialised by an in-process promise-chain mutex (a multi-process
 * deployment would need a distributed lock; MongoDB standalone has no transactions).
 *   a) replaces TwinStateHistory (deleteMany + insertMany)
 *   b) upserts TwinState with version++ ($inc)
 *   c) deletes insights of entries that no longer exist, upserts the Insight of the LATEST entry only
 * Any failure is thrown to the caller (never swallowed). Entry deletion is not exposed by the API (protects history).
 * Models are required lazily so engine unit tests never need Mongoose models or a DB.
 */
const { analyzeAthlete, toDateString } = require('../engine');

function getAlpha() {
  try {
    const env = require('../config/env');
    return typeof env.emaAlpha === 'number' && env.emaAlpha > 0 && env.emaAlpha <= 1 ? env.emaAlpha : undefined;
  } catch (_e) {
    return undefined; // env module absent or invalid: engine default (0.30)
  }
}

const models = () => ({
  DailyEntry: require('../models/DailyEntry'),
  TwinState: require('../models/TwinState'),
  TwinStateHistory: require('../models/TwinStateHistory'),
  Insight: require('../models/Insight'),
});

// ---- per-athlete mutex -------------------------------------------------------------------------
const chains = new Map();
function withAthleteLock(key, fn) {
  const k = String(key);
  const prior = chains.get(k) || Promise.resolve();
  const run = prior.then(fn, fn); // prior failure must not block; each run sees its own result
  const tail = run.then(() => undefined, () => undefined);
  chains.set(k, tail);
  tail.then(() => {
    if (chains.get(k) === tail) chains.delete(k);
  });
  return run;
}

const dayToDate = (s) => new Date(`${s}T00:00:00.000Z`);
const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc || null);
const METRICS = ['performance', 'trainingLoad', 'recovery', 'fatigue', 'adaptation'];

function stateToTwin(s) {
  if (!s) return null;
  const out = { date: s.date, sequence: s.sequence };
  for (const k of METRICS) out[k] = s[k];
  return out;
}

async function loadEntries(DailyEntry, athleteId) {
  const docs = await DailyEntry.find({ athleteId }).sort({ date: 1 }).lean();
  return docs.map((d) => ({
    _id: d._id,
    date: toDateString(d.date),
    durationMinutes: d.durationMinutes,
    intensity: d.intensity,
    performanceScore: d.performanceScore,
    feelingScore: d.feelingScore,
    sleepHours: d.sleepHours,
  }));
}

async function doRecompute(athleteId) {
  const { DailyEntry, TwinState, TwinStateHistory, Insight } = models();
  const entries = await loadEntries(DailyEntry, athleteId);

  if (entries.length === 0) {
    await TwinStateHistory.deleteMany({ athleteId });
    await TwinState.deleteOne({ athleteId });
    await Insight.deleteMany({ athleteId });
    return { twin: null, previousTwin: null, insight: null, attention: null };
  }

  const analysis = analyzeAthlete(entries, { alpha: getAlpha() });
  const { timeline, latest, previous, attention, insight } = analysis;

  // a) history: full replace
  await TwinStateHistory.deleteMany({ athleteId });
  await TwinStateHistory.insertMany(
    timeline.map((t) => ({
      athleteId,
      entryId: t.entryId,
      date: dayToDate(t.date),
      performance: t.performance,
      trainingLoad: t.trainingLoad,
      recovery: t.recovery,
      fatigue: t.fatigue,
      adaptation: t.adaptation,
      dailyTrainingLoad: t.dailyTrainingLoad,
      dailyRecovery: t.dailyRecovery,
      sequence: t.sequence,
    })),
  );

  // b) latest state, version++
  const twinDoc = await TwinState.findOneAndUpdate(
    { athleteId },
    {
      $set: {
        athleteId,
        performance: latest.performance,
        trainingLoad: latest.trainingLoad,
        recovery: latest.recovery,
        fatigue: latest.fatigue,
        adaptation: latest.adaptation,
        lastEntryDate: dayToDate(latest.date),
      },
      $inc: { version: 1 },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // c) insights: drop those of vanished entries, refresh the latest entry's insight
  const ids = entries.map((e) => e._id);
  await Insight.deleteMany({ athleteId, entryId: { $exists: true, $ne: null, $nin: ids } });
  const insightDoc = await Insight.findOneAndUpdate(
    { athleteId, entryId: latest.entryId },
    {
      $set: {
        athleteId,
        entryId: latest.entryId,
        date: dayToDate(latest.date),
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        message: insight.message,
        contributingFactors: insight.contributingFactors,
        rule: insight.rule,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return { twin: plain(twinDoc), previousTwin: stateToTwin(previous), insight: plain(insightDoc), attention };
}

/** Serialised, full recompute. Throws on any failure. */
function recomputeTwin(athleteId) {
  if (!athleteId) return Promise.reject(new Error('recomputeTwin requires athleteId'));
  return withAthleteLock(athleteId, () => doRecompute(athleteId));
}

async function getCurrentTwin(athleteId) {
  const { DailyEntry, TwinState, TwinStateHistory } = models();
  const [current, entries, lastTwo] = await Promise.all([
    TwinState.findOne({ athleteId }).lean(),
    loadEntries(DailyEntry, athleteId),
    TwinStateHistory.find({ athleteId }).sort({ date: -1 }).limit(2).lean(),
  ]);
  const previous = lastTwo.length > 1 ? lastTwo[1] : null;
  if (entries.length === 0) {
    const empty = analyzeAthlete([], { alpha: getAlpha() });
    return { current: current || null, previous: null, attention: null, trends: empty.trends };
  }
  const { attention, trends } = analyzeAthlete(entries, { alpha: getAlpha() });
  return { current: current || null, previous, attention, trends };
}

async function getTwinHistory(athleteId, { from, to, limit } = {}) {
  const { TwinStateHistory } = models();
  const n = Math.min(Math.max(parseInt(limit, 10) || 60, 1), 365);
  const q = { athleteId };
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = dayToDate(toDateString(from));
    if (to) q.date.$lte = dayToDate(toDateString(to));
  }
  // newest N states, returned ascending by date
  const rows = await TwinStateHistory.find(q).sort({ date: -1 }).limit(n).lean();
  return rows.reverse();
}

module.exports = { recomputeTwin, getCurrentTwin, getTwinHistory, _withAthleteLock: withAthleteLock };
