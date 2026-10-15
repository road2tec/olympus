'use strict';
const mongoose = require('mongoose');
const { jsonOptions } = require('./_toJSON');

const TRAINING_TYPES = ['strength', 'endurance', 'speed', 'skill', 'recovery', 'match', 'other'];
const LIMITS = {
  DURATION_MIN: 1, DURATION_MAX: 600,
  INTENSITY_MIN: 1, INTENSITY_MAX: 10,
  PERFORMANCE_MIN: 0, PERFORMANCE_MAX: 100,
  FEELING_MIN: 1, FEELING_MAX: 5,
  SLEEP_MIN: 0, SLEEP_MAX: 24,
  DIET_NOTES_MAX: 500,
  MEAL_MIN: 0, MEAL_MAX: 10,
};

const int = (v) => Number.isInteger(v);
const intMsg = (f) => `${f} must be an integer`;

const schema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Stored as Date at 00:00:00Z of the calendar day; serialized as YYYY-MM-DD.
    date: {
      type: Date,
      required: [true, 'Date is required'],
      validate: {
        validator: (v) => v instanceof Date && !Number.isNaN(v.getTime()) && v.getTime() % 86400000 === 0,
        message: 'Date must be a calendar day at 00:00:00 UTC',
      },
    },
    trainingType: { type: String, enum: TRAINING_TYPES, required: true },
    durationMinutes: { type: Number, required: true, min: LIMITS.DURATION_MIN, max: LIMITS.DURATION_MAX, validate: { validator: int, message: intMsg('durationMinutes') } },
    intensity: { type: Number, required: true, min: LIMITS.INTENSITY_MIN, max: LIMITS.INTENSITY_MAX, validate: { validator: int, message: intMsg('intensity') } },
    performanceScore: { type: Number, required: true, min: LIMITS.PERFORMANCE_MIN, max: LIMITS.PERFORMANCE_MAX },
    feelingScore: { type: Number, required: true, min: LIMITS.FEELING_MIN, max: LIMITS.FEELING_MAX, validate: { validator: int, message: intMsg('feelingScore') } },
    sleepHours: { type: Number, required: true, min: LIMITS.SLEEP_MIN, max: LIMITS.SLEEP_MAX },
    dietNotes: { type: String, trim: true, maxlength: LIMITS.DIET_NOTES_MAX, default: '' },
    mealCount: { type: Number, required: true, min: LIMITS.MEAL_MIN, max: LIMITS.MEAL_MAX, validate: { validator: int, message: intMsg('mealCount') } },
  },
  { timestamps: true }
);
schema.index({ athleteId: 1, date: 1 }, { unique: true });
schema.index({ athleteId: 1, date: -1 });

const opts = jsonOptions(['date']);
schema.set('toJSON', opts);
schema.set('toObject', opts);

const DailyEntry = mongoose.models.DailyEntry || mongoose.model('DailyEntry', schema);
module.exports = DailyEntry;
module.exports.TRAINING_TYPES = TRAINING_TYPES;
module.exports.LIMITS = LIMITS;
