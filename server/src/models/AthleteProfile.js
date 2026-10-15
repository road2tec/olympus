'use strict';
const mongoose = require('mongoose');
const { jsonOptions } = require('./_toJSON');

const LIMITS = { SPORT_MAX: 80, CATEGORY_MAX: 80, PERSONAL_BEST_MAX: 120, GOAL_MAX: 300 };

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    sport: { type: String, required: [true, 'Sport is required'], trim: true, maxlength: LIMITS.SPORT_MAX },
    category: { type: String, required: [true, 'Category is required'], trim: true, maxlength: LIMITS.CATEGORY_MAX },
    personalBest: { type: String, trim: true, maxlength: LIMITS.PERSONAL_BEST_MAX },
    goal: { type: String, trim: true, maxlength: LIMITS.GOAL_MAX, default: '' },
    dateOfBirth: {
      type: Date,
      validate: { validator: (v) => v == null || v.getTime() <= Date.now(), message: 'Date of birth cannot be in the future' },
    },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
schema.index({ coachId: 1 });

const opts = jsonOptions(['dateOfBirth']);
schema.set('toJSON', opts);
schema.set('toObject', opts);

const AthleteProfile = mongoose.models.AthleteProfile || mongoose.model('AthleteProfile', schema);
module.exports = AthleteProfile;
module.exports.LIMITS = LIMITS;
