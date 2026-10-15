const AthleteProfile = require('../models/AthleteProfile');
const { ok, AppError, asyncHandler } = require('../utils/http');
const { profileToJSON } = require('../utils/serializers');
const { toDateOnly } = require('../utils/date');

const load = (userId) => AthleteProfile.findOne({ userId }).populate('coachId', 'name');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await load(req.user._id);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Profile not found', undefined, 'PROFILE_NOT_FOUND');
  return ok(res, profileToJSON(profile));
});

const createProfile = asyncHandler(async (req, res) => {
  if (await AthleteProfile.exists({ userId: req.user._id })) {
    throw new AppError(409, 'CONFLICT', 'Profile already exists');
  }
  const { sport, category, personalBest, goal, dateOfBirth } = req.body;
  try {
    await AthleteProfile.create({
      userId: req.user._id, // never from the client; coachId is not writable by athletes
      sport,
      category,
      ...(personalBest !== undefined ? { personalBest } : {}),
      ...(goal !== undefined ? { goal } : {}),
      ...(dateOfBirth ? { dateOfBirth: toDateOnly(dateOfBirth) } : {}),
    });
  } catch (err) {
    if (err && err.code === 11000) throw new AppError(409, 'CONFLICT', 'Profile already exists');
    throw err;
  }
  return ok(res, profileToJSON(await load(req.user._id)), undefined, 201);
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await load(req.user._id);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Profile not found', undefined, 'PROFILE_NOT_FOUND');
  for (const key of ['sport', 'category', 'personalBest', 'goal']) {
    if (req.body[key] !== undefined) profile[key] = req.body[key];
  }
  if (req.body.dateOfBirth !== undefined) profile.dateOfBirth = toDateOnly(req.body.dateOfBirth);
  await profile.save();
  return ok(res, profileToJSON(profile));
});

module.exports = { getProfile, createProfile, updateProfile };
