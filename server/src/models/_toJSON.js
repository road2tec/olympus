'use strict';
// Shared serialization helpers: _id -> id, drop __v, Date -> 'YYYY-MM-DD' for listed day fields.

function toDayString(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return value;
}

/**
 * Build a mongoose toJSON/toObject transform.
 * @param {string[]} dayFields top-level fields serialized as YYYY-MM-DD
 * @param {string[]} extraRemove fields removed from output
 * @param {Function} [extra] optional (doc, ret) hook
 */
function makeTransform(dayFields = [], extraRemove = [], extra) {
  return function transform(doc, ret) {
    if (ret._id !== undefined) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    for (const f of dayFields) if (ret[f] !== undefined && ret[f] !== null) ret[f] = toDayString(ret[f]);
    for (const f of extraRemove) delete ret[f];
    if (extra) extra(doc, ret);
    return ret;
  };
}

function jsonOptions(dayFields, extraRemove, extra) {
  return { virtuals: false, versionKey: false, transform: makeTransform(dayFields, extraRemove, extra) };
}

module.exports = { toDayString, makeTransform, jsonOptions };
