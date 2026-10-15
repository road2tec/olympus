'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { jsonOptions } = require('./_toJSON');

const ROLES = ['athlete', 'coach', 'admin'];
const NAME_MIN = 2;
const NAME_MAX = 80;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: NAME_MIN, maxlength: NAME_MAX },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [EMAIL_RE, 'Email is invalid'],
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: ROLES, default: 'athlete', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    phone: this.phone === undefined ? null : this.phone,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

// Requires passwordHash to be loaded (query with .select('+passwordHash')).
userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(String(plain), this.passwordHash);
};

// bcrypt cost 10 in test, 12 otherwise.
userSchema.statics.hashPassword = function hashPassword(plain) {
  const cost = process.env.NODE_ENV === 'test' ? 10 : 12;
  return bcrypt.hash(String(plain), cost);
};

const opts = jsonOptions([], ['passwordHash']);
userSchema.set('toJSON', opts);
userSchema.set('toObject', opts);

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
module.exports.ROLES = ROLES;
