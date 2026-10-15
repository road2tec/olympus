'use strict';
const mongoose = require('mongoose');
const { jsonOptions } = require('./_toJSON');

const TYPES = ['needs_attention', 'trend', 'monitoring', 'info', 'insufficient_data'];
const SEVERITIES = ['info', 'positive', 'warning', 'critical'];
const LIMITS = { TITLE_MAX: 160, MESSAGE_MAX: 2000 };

const factorSchema = new mongoose.Schema(
  {
    metric: { type: String },
    label: { type: String },
    previous: { type: Number, default: null },
    current: { type: Number, default: null },
    changePct: { type: Number, default: null },
    unit: { type: String },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyEntry' },
    date: { type: Date, required: true },
    type: { type: String, enum: TYPES, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    title: { type: String, required: true, trim: true, maxlength: LIMITS.TITLE_MAX },
    message: { type: String, required: true, maxlength: LIMITS.MESSAGE_MAX },
    contributingFactors: { type: [factorSchema], default: [] },
    rule: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ athleteId: 1, createdAt: -1 });
// One insight per entry (partial: only enforced when entryId is set).
schema.index(
  { athleteId: 1, entryId: 1 },
  { unique: true, partialFilterExpression: { entryId: { $type: 'objectId' } } }
);

const opts = jsonOptions(['date']);
schema.set('toJSON', opts);
schema.set('toObject', opts);

const Insight = mongoose.models.Insight || mongoose.model('Insight', schema);
module.exports = Insight;
module.exports.TYPES = TYPES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.LIMITS = LIMITS;
