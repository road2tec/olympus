'use strict';
const PDFDocument = require('pdfkit');

const DISCLAIMER =
  'Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach.';

const COLORS = { ink: '#0A0F1E', navy: '#0F1B3D', electric: '#3B82F6', muted: '#5B6785', line: '#D5DBEA', text: '#1B2440' };

const day = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : '-');
const num = (v, suffix = '', dp = 1) =>
  v == null || !Number.isFinite(Number(v)) ? 'No data' : `${Number(Number(v).toFixed(dp))}${suffix}`;

const LABELS = { improving: 'Improving', stable: 'Stable', declining: 'Declining', insufficient_data: 'Insufficient data' };

function metricRows(m = {}) {
  return [
    ['Sessions', num(m.sessions, '', 0)],
    ['Total duration', num(m.totalDurationMinutes, ' min', 0)],
    ['Average intensity', num(m.avgIntensity, ' / 10')],
    ['Average performance', num(m.avgPerformance, ' / 100')],
    ['Average recovery', num(m.avgRecovery, ' / 100')],
    ['Average sleep', num(m.avgSleepHours, ' h')],
    ['Total training load', num(m.totalTrainingLoad, '', 0)],
    ['Average daily training load', num(m.avgDailyTrainingLoad, '', 0)],
    ['Days logged', m.daysLogged == null ? 'No data' : `${m.daysLogged} of ${m.daysInPeriod || 7}`],
    ['Completeness', num(m.completenessPct, '%', 0)],
  ];
}

/**
 * Streams a PDF for `report` (plain JSON shape, see reportToJSON) into `stream` (e.g. express res).
 * Resolves when the document is finished.
 */
function streamReportPdf(stream, report, { athleteName = 'Athlete' } = {}) {
  return new Promise((resolve, reject) => {
    const r = report || {};
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Olympus Weekly Report', Author: 'Olympus' } });
    doc.on('error', reject);
    stream.on('error', reject);
    stream.on('finish', resolve);
    doc.on('end', () => {
      if (typeof stream.writableFinished === 'undefined') resolve();
    });
    doc.pipe(stream);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const ensure = (h) => {
      if (doc.y + h > doc.page.height - doc.page.margins.bottom - 40) doc.addPage();
    };
    const heading = (t) => {
      ensure(40);
      doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor(COLORS.navy).text(t, left, doc.y);
      doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).strokeColor(COLORS.electric).lineWidth(1).stroke();
      doc.moveDown(0.6);
    };

    // Header band
    doc.rect(0, 0, doc.page.width, 90).fill(COLORS.ink);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(26).text('OLYMPUS', left, 28);
    doc.font('Helvetica').fontSize(11).fillColor('#9FB3E8').text('Weekly Performance Report', left, 60);
    doc.y = 110;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.text).text(athleteName || 'Athlete', left, doc.y);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.muted)
      .text(`Period: ${day(r.periodStart)} to ${day(r.periodEnd)}`, left, doc.y + 2);

    // Metrics table
    heading('Key metrics');
    const rows = metricRows(r.metrics);
    rows.forEach(([k, v], i) => {
      ensure(22);
      const y = doc.y;
      if (i % 2 === 0) doc.rect(left, y - 2, width, 20).fill('#F1F4FB');
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5).text(k, left + 8, y + 2, { width: width * 0.6 });
      doc.font('Helvetica-Bold').text(v, left + width * 0.6, y + 2, { width: width * 0.4 - 8, align: 'right' });
      doc.y = y + 20;
    });
    const missing = r.metrics && Array.isArray(r.metrics.missingDays) ? r.metrics.missingDays : [];
    if (missing.length) {
      doc.moveDown(0.4).font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(`Days without an entry: ${missing.join(', ')}`, left, doc.y, { width });
    }

    // Summary
    heading('Summary');
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(COLORS.text)
      .text(r.summary || 'No summary is available for this period.', left, doc.y, { width, lineGap: 2 });

    // Trends
    heading('Trend classification');
    const tc = r.trendClassification || {};
    const trendNames = [
      ['performance', 'Performance'],
      ['trainingDuration', 'Training duration'],
      ['recovery', 'Recovery'],
    ];
    trendNames.forEach(([k, name]) => {
      const t = tc[k];
      ensure(40);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text).text(`${name}: ${t ? LABELS[t.label] || t.label : 'No data'}${t && t.changePct != null ? ` (${t.changePct > 0 ? '+' : ''}${Number(t.changePct).toFixed(1)}%)` : ''}`, left, doc.y, { width });
      if (t && t.basis) doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(t.basis, left, doc.y, { width });
      doc.moveDown(0.4);
    });

    // Attention events
    heading('Attention events');
    const events = Array.isArray(r.attentionEvents) ? r.attentionEvents : [];
    if (!events.length) {
      doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.text).text('No needs-attention events were recorded in this period.', left, doc.y, { width });
    } else {
      events.forEach((e) => {
        ensure(60);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#B42318').text(`${day(e.date)}  ${e.title || 'Needs attention'}`, left, doc.y, { width });
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(e.message || '', left, doc.y, { width, lineGap: 1.5 });
        doc.moveDown(0.5);
      });
    }

    // Footer block
    ensure(90);
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.muted).text(DISCLAIMER, left, doc.y, { width, lineGap: 1.5 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Generated: ${new Date(r.generatedAt || Date.now()).toISOString()}`, left, doc.y, { width });

    doc.end();
  });
}

module.exports = { streamReportPdf, DISCLAIMER };
