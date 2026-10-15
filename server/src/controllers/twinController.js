const Insight = require('../models/Insight');
const { ok, asyncHandler } = require('../utils/http');
const { twinToJSON, insightToJSON } = require('../utils/serializers');
const { fromDate } = require('../utils/date');

const twinService = () => require('../services/twinService');

const METRICS = ['performance', 'trainingLoad', 'recovery', 'fatigue', 'adaptation'];

const round2 = (n) => Math.round(n * 100) / 100;

const computeChanges = (cur, prev) => {
  const changes = {};
  for (const m of METRICS) {
    if (!cur || !prev || typeof cur[m] !== 'number' || typeof prev[m] !== 'number') {
      changes[m] = { delta: null, pct: null };
      continue;
    }
    const delta = round2(cur[m] - prev[m]);
    changes[m] = { delta, pct: prev[m] === 0 ? null : round2(((cur[m] - prev[m]) / prev[m]) * 100) };
  }
  return changes;
};

// Shared with the coach controller (assignment must be verified by the caller).
const buildTwinPayload = async (athleteId) => {
  const { current, previous, attention, trends } = await twinService().getCurrentTwin(athleteId);
  const latest = await Insight.findOne({ athleteId }).sort({ date: -1, createdAt: -1 });
  const twin = twinToJSON(current);
  const prev = twinToJSON(previous);
  return {
    twin,
    previous: prev,
    changes: computeChanges(twin, prev),
    attention: attention || null,
    trends: trends || null,
    latestInsight: insightToJSON(latest),
    hasData: !!twin,
  };
};

const current = asyncHandler(async (req, res) => ok(res, await buildTwinPayload(req.user._id)));

const history = asyncHandler(async (req, res) => {
  const { from, to, limit } = req.validatedQuery;
  const rows = await twinService().getTwinHistory(req.user._id, { from, to, limit });
  const out = (rows || []).map((h) => {
    const o = typeof h.toJSON === 'function' ? h.toJSON() : { ...h };
    if (o.date) o.date = fromDate(o.date);
    return o;
  });
  return ok(res, out);
});

module.exports = { current, history, buildTwinPayload };
