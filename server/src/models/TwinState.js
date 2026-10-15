'use strict';
const mongoose = require('mongoose');
const { jsonOptions } = require('./_toJSON');

const schema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    performance: { type: Number, default: null },
    trainingLoad: { type: Number, required: true },
    recovery: { type: Number, required: true },
    fatigue: { type: Number, required: true },
    adaptation: { type: Number, required: true },
    lastEntryDate: { type: Date },
    version: { type: Number, default: 0 }, // count of updates
  },
  { timestamps: true } // updatedAt serves as the contract's updatedAt
);

const opts = jsonOptions(['lastEntryDate']);
schema.set('toJSON', opts);
schema.set('toObject', opts);

module.exports = mongoose.models.TwinState || mongoose.model('TwinState', schema);
