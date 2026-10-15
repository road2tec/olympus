'use strict';
const mongoose = require('mongoose');
const { jsonOptions } = require('./_toJSON');

const schema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyEntry' },
    date: { type: Date, required: true },
    performance: { type: Number, default: null },
    trainingLoad: { type: Number, required: true },
    recovery: { type: Number, required: true },
    fatigue: { type: Number, required: true },
    adaptation: { type: Number, required: true },
    dailyTrainingLoad: { type: Number, required: true },
    dailyRecovery: { type: Number, required: true },
    sequence: { type: Number, required: true },
  },
  { timestamps: true }
);
schema.index({ athleteId: 1, date: 1 }, { unique: true });
schema.index({ athleteId: 1, date: -1 });

const opts = jsonOptions(['date']);
schema.set('toJSON', opts);
schema.set('toObject', opts);

module.exports = mongoose.models.TwinStateHistory || mongoose.model('TwinStateHistory', schema);
