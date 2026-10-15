'use strict';
const mongoose = require('mongoose');
const { jsonOptions, toDayString } = require('./_toJSON');

const LIMITS = { SUMMARY_MAX: 5000 };
const TREND_LABELS = ['improving', 'stable', 'declining', 'insufficient_data'];

const trendSchema = new mongoose.Schema(
  {
    label: { type: String, enum: TREND_LABELS },
    changePct: { type: Number, default: null },
    basis: { type: String },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    date: { type: Date },
    title: { type: String },
    message: { type: String },
    rule: { type: String },
  },
  { _id: false }
);

const isUTCDay = (d, dow) => d instanceof Date && d.getTime() % 86400000 === 0 && d.getUTCDay() === dow;

const schema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    periodStart: { type: Date, required: true, validate: { validator: (d) => isUTCDay(d, 1), message: 'periodStart must be a Monday (UTC midnight)' } },
    periodEnd: { type: Date, required: true, validate: { validator: (d) => isUTCDay(d, 0), message: 'periodEnd must be a Sunday (UTC midnight)' } },
    summary: { type: String, default: '', maxlength: LIMITS.SUMMARY_MAX },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    trendClassification: {
      performance: { type: trendSchema, default: undefined },
      trainingDuration: { type: trendSchema, default: undefined },
      recovery: { type: trendSchema, default: undefined },
    },
    attentionEvents: { type: [eventSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, minimize: false }
);
schema.index({ athleteId: 1, periodStart: 1 }, { unique: true });

const opts = jsonOptions(['periodStart', 'periodEnd'], [], (doc, ret) => {
  if (Array.isArray(ret.attentionEvents)) {
    ret.attentionEvents = ret.attentionEvents.map((e) => ({ ...e, date: toDayString(e.date) }));
  }
});
schema.set('toJSON', opts);
schema.set('toObject', opts);

const WeeklyReport = mongoose.models.WeeklyReport || mongoose.model('WeeklyReport', schema);
module.exports = WeeklyReport;
module.exports.LIMITS = LIMITS;
