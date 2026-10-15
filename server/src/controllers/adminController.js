const mongoose = require('mongoose');
const User = require('../models/User');
const { ok, AppError, asyncHandler, pageMeta } = require('../utils/http');
const { userToJSON } = require('../utils/serializers');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, q } = req.validatedQuery;
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return ok(res, items.map(userToJSON), pageMeta(page, limit, total));
});

const setStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (String(req.user._id) === id && req.body.isActive === false) {
    throw new AppError(400, 'VALIDATION_ERROR', 'You cannot deactivate your own account');
  }
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  user.isActive = req.body.isActive;
  await user.save();
  return ok(res, userToJSON(user));
});

module.exports = { listUsers, setStatus };
