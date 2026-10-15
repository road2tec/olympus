const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AthleteProfile = require('../models/AthleteProfile');
const { signToken } = require('../middleware/auth');
const { ok, AppError, asyncHandler } = require('../utils/http');
const { userToJSON, profileToJSON } = require('../utils/serializers');

// A valid bcrypt hash used to equalize timing when the email does not exist.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8e0q1l9mH3b0Kq1p3d5Q5mV8Qe9vXa';
const bcrypt = require('bcryptjs');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }
  const passwordHash = await User.hashPassword(password);
  let user;
  try {
    // role is never taken from the request: public registration always creates an athlete
    user = await User.create({ name, email, passwordHash, role: 'athlete', ...(phone ? { phone } : {}) });
  } catch (err) {
    if (err && err.code === 11000) throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
    throw err;
  }
  const token = signToken(user);
  return ok(res, { user: userToJSON(user), token }, undefined, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }
  const match = await user.comparePassword(password);
  if (!match) throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  if (!user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Account inactive');
  const token = signToken(user);
  const decoded = jwt.decode(token);
  return ok(res, { user: userToJSON(user), token, expiresIn: decoded.exp - decoded.iat });
});

const me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === 'athlete') {
    const p = await AthleteProfile.findOne({ userId: req.user._id }).populate('coachId', 'name');
    profile = p ? profileToJSON(p) : null;
  }
  return ok(res, { user: userToJSON(req.user), profile });
});

module.exports = { register, login, me };
