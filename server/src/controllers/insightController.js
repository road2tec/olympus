const Insight = require('../models/Insight');
const { ok, asyncHandler, pageMeta } = require('../utils/http');
const { insightToJSON } = require('../utils/serializers');

const list = asyncHandler(async (req, res) => {
  const { page, limit, type } = req.validatedQuery;
  const filter = { athleteId: req.user._id };
  if (type) filter.type = type;
  const [items, total] = await Promise.all([
    Insight.find(filter).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Insight.countDocuments(filter),
  ]);
  return ok(res, items.map(insightToJSON), pageMeta(page, limit, total));
});

const latest = asyncHandler(async (req, res) => {
  const item = await Insight.findOne({ athleteId: req.user._id }).sort({ date: -1, createdAt: -1 });
  return ok(res, insightToJSON(item));
});

module.exports = { list, latest };
