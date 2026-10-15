const mongoose = require('mongoose');
const DailyEntry = require('../models/DailyEntry');
const { ok, AppError, asyncHandler, parsePagination, pageMeta } = require('../utils/http');
const { entryToJSON, twinToJSON, insightToJSON } = require('../utils/serializers');
const { toDateOnly, fromDate } = require('../utils/date');

const twinService = () => require('../services/twinService'); // lazy: owned by another module

const FIELDS = [
  'date', 'trainingType', 'durationMinutes', 'intensity', 'performanceScore',
  'feelingScore', 'sleepHours', 'dietNotes', 'mealCount',
];

const duplicateDate = () =>
  new AppError(409, 'CONFLICT', 'An entry for this date already exists', undefined, 'DUPLICATE_DATE');

const recomputeFailed = () =>
  new AppError(500, 'INTERNAL', 'Entry could not be processed; no changes were saved. Please try again.');

const result = (entry, r) => ({
  entry: entryToJSON(entry),
  twin: twinToJSON(r && r.twin),
  previousTwin: twinToJSON(r && r.previousTwin),
  insight: insightToJSON(r && r.insight),
  attention: (r && r.attention) || null,
});

const findOwned = async (req) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'NOT_FOUND', 'Entry not found');
  const entry = await DailyEntry.findOne({ _id: id, athleteId: req.user._id });
  if (!entry) throw new AppError(404, 'NOT_FOUND', 'Entry not found');
  return entry;
};

const create = asyncHandler(async (req, res) => {
  const athleteId = req.user._id;
  const body = req.body;
  if (await DailyEntry.exists({ athleteId, date: toDateOnly(body.date) })) throw duplicateDate();

  let entry;
  try {
    entry = await DailyEntry.create({
      athleteId, // from the token, never from the client
      date: toDateOnly(body.date),
      trainingType: body.trainingType,
      durationMinutes: body.durationMinutes,
      intensity: body.intensity,
      performanceScore: body.performanceScore,
      feelingScore: body.feelingScore,
      sleepHours: body.sleepHours,
      dietNotes: body.dietNotes ?? '',
      mealCount: body.mealCount,
    });
  } catch (err) {
    if (err && err.code === 11000) throw duplicateDate();
    throw err;
  }

  let r;
  try {
    r = await twinService().recomputeTwin(athleteId);
  } catch (err) {
    console.error('[entries] twin recompute failed on create:', err && err.message);
    try {
      await DailyEntry.deleteOne({ _id: entry._id });
      await twinService().recomputeTwin(athleteId);
    } catch (rollbackErr) {
      console.error('[entries] rollback recompute failed:', rollbackErr && rollbackErr.message);
    }
    throw recomputeFailed();
  }
  return ok(res, result(entry, r), undefined, 201);
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, from, to } = req.validatedQuery;
  const skip = (page - 1) * limit;
  const filter = { athleteId: req.user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = toDateOnly(from);
    if (to) filter.date.$lte = toDateOnly(to);
  }
  const [items, total] = await Promise.all([
    DailyEntry.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    DailyEntry.countDocuments(filter),
  ]);
  return ok(res, items.map(entryToJSON), pageMeta(page, limit, total));
});

const getOne = asyncHandler(async (req, res) => ok(res, entryToJSON(await findOwned(req))));

const update = asyncHandler(async (req, res) => {
  const entry = await findOwned(req);
  const athleteId = req.user._id;
  const body = req.body;

  if (body.date !== undefined && body.date !== fromDate(entry.date)) {
    const clash = await DailyEntry.exists({ athleteId, date: toDateOnly(body.date), _id: { $ne: entry._id } });
    if (clash) throw duplicateDate();
  }

  const previous = {};
  for (const f of FIELDS) previous[f] = entry.get(f);

  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    entry.set(f, f === 'date' ? toDateOnly(body[f]) : body[f]);
  }
  try {
    await entry.save();
  } catch (err) {
    if (err && err.code === 11000) throw duplicateDate();
    throw err;
  }

  let r;
  try {
    r = await twinService().recomputeTwin(athleteId);
  } catch (err) {
    console.error('[entries] twin recompute failed on update:', err && err.message);
    try {
      for (const f of FIELDS) entry.set(f, previous[f]);
      await entry.save();
      await twinService().recomputeTwin(athleteId);
    } catch (rollbackErr) {
      console.error('[entries] restore failed:', rollbackErr && rollbackErr.message);
    }
    throw recomputeFailed();
  }
  return ok(res, result(entry, r));
});

module.exports = { create, list, getOne, update };
