'use strict';
/**
 * Weekly report service (Agent 7).
 * Aggregation is delegated to the engine (pure functions); this layer only loads data,
 * compares this week with the previous week, and upserts the WeeklyReport (unique per athlete+Monday).
 */
const mongoose = require('mongoose');
const DailyEntry = require('../models/DailyEntry');
const Insight = require('../models/Insight');
const WeeklyReport = require('../models/WeeklyReport');
const engine = require('../engine');
const env = require('../config/env');
const { AppError } = require('../utils/http');
const { isValidDateString, todayUTC, toDateOnly, fromDate } = require('../utils/date');

const inRange = (day, start, end) => day >= start && day <= end;

const toEngineEntry = (e) => ({
  _id: e._id,
  date: fromDate(e.date),
  durationMinutes: e.durationMinutes,
  intensity: e.intensity,
  performanceScore: e.performanceScore,
  feelingScore: e.feelingScore,
  sleepHours: e.sleepHours,
});

const pickTrend = (t) => ({
  label: t ? t.label : 'insufficient_data',
  changePct: t && t.changePct != null && Number.isFinite(t.changePct) ? t.changePct : null,
  basis: t ? t.basis : undefined,
});

function buildTrends(allEntries, timeline, range) {
  const t = engine.buildWeeklyTrends(allEntries, timeline, range);
  return { performance: pickTrend(t.performance), trainingDuration: pickTrend(t.trainingDuration), recovery: pickTrend(t.recovery) };
}

/** Normalizes an input into the Monday/Sunday range. Throws 400 for invalid date input. */
function resolveWeek(anyDate) {
  const input = anyDate == null || anyDate === '' ? todayUTC() : anyDate;
  const s = input instanceof Date ? input.toISOString().slice(0, 10) : String(input).slice(0, 10);
  if (!isValidDateString(s)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'weekStart must be a valid date in YYYY-MM-DD format', [
      { field: 'weekStart', message: 'Invalid date' },
    ]);
  }
  return engine.getWeekRange(s, env.timezone);
}

async function generateWeeklyReport(athleteId, anyDateInWeek) {
  const { start, end } = resolveWeek(anyDateInWeek);
  const athleteOid = new mongoose.Types.ObjectId(String(athleteId));

  const allDocs = await DailyEntry.find({ athleteId: athleteOid, date: { $lte: toDateOnly(end) } })
    .sort({ date: 1 })
    .lean();

  const all = allDocs.map(toEngineEntry);
  const weekEntries = all.filter((e) => inRange(e.date, start, end));

  const timeline = all.length ? engine.computeTwinTimeline(all, { alpha: env.emaAlpha }) : [];
  const built = engine.buildWeeklyMetrics(weekEntries, timeline, { start, end }) || {};
  const metrics = { ...(built.metrics && typeof built.metrics === 'object' ? built.metrics : built) };
  delete metrics.attentionStatus;
  delete metrics.metrics;

  const trendClassification = buildTrends(all, timeline, { start, end });

  const insights = await Insight.find({
    athleteId: athleteOid,
    type: 'needs_attention',
    date: { $gte: toDateOnly(start), $lte: toDateOnly(end) },
  })
    .sort({ date: 1 })
    .lean();
  const attentionEvents = insights.map((i) => ({
    date: i.date,
    title: i.title,
    message: i.message,
    rule: i.rule,
  }));

  const summary = engine.buildWeeklySummary(
    metrics,
    trendClassification,
    attentionEvents.map((e) => ({ ...e, date: fromDate(e.date) }))
  );

  const filter = { athleteId: athleteOid, periodStart: toDateOnly(start) };
  const update = {
    $set: {
      periodEnd: toDateOnly(end),
      summary: String(summary || '').slice(0, 5000),
      metrics,
      trendClassification,
      attentionEvents,
      generatedAt: new Date(),
    },
  };
  const opts = { upsert: true, returnDocument: 'after', includeResultMetadata: true, runValidators: true };

  let res;
  try {
    res = await WeeklyReport.findOneAndUpdate(filter, update, opts);
  } catch (err) {
    if (err && err.code === 11000) res = await WeeklyReport.findOneAndUpdate(filter, update, opts);
    else throw err;
  }
  const doc = res.value;
  doc.$locals.created = !(res.lastErrorObject && res.lastErrorObject.updatedExisting);
  return doc;
}

function reportToJSON(doc) {
  const o = doc.toJSON ? doc.toJSON() : doc;
  const out = { ...o };
  delete out.athleteId;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

async function listReports(athleteId, { page = 1, limit = 20 } = {}) {
  const filter = { athleteId: new mongoose.Types.ObjectId(String(athleteId)) };
  const [items, total] = await Promise.all([
    WeeklyReport.find(filter)
      .sort({ periodStart: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    WeeklyReport.countDocuments(filter),
  ]);
  return { items, total };
}

/** Returns the report only if owned by the athlete; otherwise null (callers answer 404). */
async function getReport(athleteId, reportId) {
  if (!mongoose.isValidObjectId(reportId)) return null;
  return WeeklyReport.findOne({ _id: reportId, athleteId: new mongoose.Types.ObjectId(String(athleteId)) });
}

module.exports = { generateWeeklyReport, listReports, getReport, reportToJSON, resolveWeek };
