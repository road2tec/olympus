const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/http');

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    throw new AppError(401, 'UNAUTHORIZED', err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }
  if (!payload || typeof payload.sub !== 'string') throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  let user = null;
  try {
    user = await User.findById(payload.sub);
  } catch (_) {
    user = null;
  }
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  if (!user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Account inactive');
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'));
  }
  next();
};

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });

module.exports = { auth, requireRole, signToken };
