const mongoose = require('mongoose');
const AthleteProfile = require('../models/AthleteProfile');
const TwinState = require('../models/TwinState');
const User = require('../models/User');
const { ok, AppError, asyncHandler } = require('../utils/http');
const { twinToJSON } = require('../utils/serializers');
const { buildTwinPayload } = require('./twinController');

const twinService = () => require('../services/twinService');

const athletes = asyncHandler(async (req, res) => {
  const profiles = await AthleteProfile.find({ coachId: req.user._id }).populate('userId', 'name isActive');
  const rows = await Promise.all(
    profiles
      .filter((p) => p.userId && p.userId.name)
      .map(async (p) => {
        const athleteId = p.userId._id;
        let twin = null;
        let attentionStatus = null;
        try {
          twin = twinToJSON(await TwinState.findOne({ athleteId }));
          if (twin) {
            const { attention } = await twinService().getCurrentTwin(athleteId);
            attentionStatus = attention ? attention.status : null;
          }
        } catch (_) {
          /* summary is best effort */
        }
        return {
          id: String(athleteId),
          name: p.userId.name,
          isActive: p.userId.isActive,
          sport: p.sport,
          category: p.category,
          twin,
          attentionStatus,
        };
      })
  );
  return ok(res, rows);
});

const athleteTwin = asyncHandler(async (req, res) => {
  const { athleteId } = req.params;
  if (!mongoose.isValidObjectId(athleteId)) throw new AppError(404, 'NOT_FOUND', 'Athlete not found');
  // Assignment is verified server-side; unassigned athletes look nonexistent.
  const profile = await AthleteProfile.findOne({ userId: athleteId, coachId: req.user._id });
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Athlete not found');
  const athlete = await User.findById(athleteId);
  const payload = await buildTwinPayload(athleteId);
  return ok(res, {
    athlete: { id: String(athleteId), name: athlete ? athlete.name : null, sport: profile.sport, category: profile.category },
    ...payload,
  });
});

module.exports = { athletes, athleteTwin };
