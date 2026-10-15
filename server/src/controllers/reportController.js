'use strict';
const { ok, AppError, parsePagination, pageMeta } = require('../utils/http');
const reportService = require('../services/reportService');
const { streamReportPdf } = require('../services/pdfService');

const notFound = () => new AppError(404, 'NOT_FOUND', 'Report not found');

async function generate(req, res) {
  const weekStart = req.body && req.body.weekStart;
  if (weekStart != null && typeof weekStart !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'weekStart must be a string in YYYY-MM-DD format', [
      { field: 'weekStart', message: 'Must be a string' },
    ]);
  }
  const doc = await reportService.generateWeeklyReport(req.user._id, weekStart || undefined);
  const created = !!(doc.$locals && doc.$locals.created);
  return ok(res, reportService.reportToJSON(doc), undefined, created ? 201 : 200);
}

async function list(req, res) {
  const { page, limit } = parsePagination(req.query);
  const { items, total } = await reportService.listReports(req.user._id, { page, limit });
  return ok(res, items.map(reportService.reportToJSON), pageMeta(page, limit, total));
}

async function getOne(req, res) {
  const doc = await reportService.getReport(req.user._id, req.params.id);
  if (!doc) throw notFound();
  return ok(res, reportService.reportToJSON(doc));
}

async function pdf(req, res) {
  const doc = await reportService.getReport(req.user._id, req.params.id);
  if (!doc) throw notFound();
  const json = reportService.reportToJSON(doc);
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="olympus-report-${json.periodStart}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  await streamReportPdf(res, json, { athleteName: req.user.name });
}

module.exports = { generate, list, getOne, pdf };
