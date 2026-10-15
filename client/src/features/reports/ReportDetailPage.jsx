import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReport, downloadReportPdf } from '../../services/reportService';
import { parseError } from '../../services/api';
import TrendBadge from './TrendBadge';
import { fmtRange, fmtNum, fmtDay } from './reportUtils';

const DISCLAIMER =
  'Olympus is a decision-support application built on a simplified data-analytics model. It is not a medical device and does not replace a doctor, physiotherapist, or qualified coach.';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 shadow-card">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-2 font-display text-2xl text-white">{value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <div className="h-8 w-64 animate-pulse rounded bg-panel" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel" />
        ))}
      </div>
      <div className="h-32 animate-pulse rounded-xl border border-line bg-panel" />
    </div>
  );
}

const TRENDS = [
  ['performance', 'Performance'],
  ['trainingDuration', 'Training duration'],
  ['recovery', 'Recovery'],
];

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getReport(id));
    } catch (err) {
      const p = parseError(err);
      setError(p.status === 404 ? 'This report could not be found.' : p.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportPdf(id, report ? `olympus-report-${report.periodStart}.pdf` : undefined);
    } catch (err) {
      toast.error('Could not download the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const back = (
    <Link to="/app/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All reports
    </Link>
  );

  if (loading) return <DetailSkeleton />;
  if (error || !report) {
    return (
      <div className="space-y-4">
        {back}
        <div role="alert" className="rounded-2xl border border-crit/30 bg-crit/10 p-5 text-sm text-crit">
          <p>{error || 'Report unavailable.'}</p>
          <button type="button" onClick={load} className="mt-3 rounded-lg border border-crit/40 px-3 py-1.5 font-medium hover:bg-crit/10">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const m = report.metrics || {};
  const tc = report.trendClassification || {};
  const events = report.attentionEvents || [];
  const missing = Array.isArray(m.missingDays) ? m.missingDays : [];
  const noData = !m.daysLogged;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {back}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white">Weekly report</h1>
            <p className="mt-1 text-sm text-slate-400">{fmtRange(report)}</p>
          </div>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white transition hover:bg-electric/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {downloading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {noData && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          No training entries were logged this week, so averages are unavailable.
        </div>
      )}

      <section aria-labelledby="metrics-h">
        <h2 id="metrics-h" className="mb-3 font-display text-lg text-white">Key metrics</h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Sessions" value={fmtNum(m.sessions, '', 0)} />
          <Stat label="Total duration" value={fmtNum(m.totalDurationMinutes, ' min', 0)} />
          <Stat label="Avg intensity" value={fmtNum(m.avgIntensity, '/10')} />
          <Stat label="Avg performance" value={fmtNum(m.avgPerformance, '/100')} />
          <Stat label="Avg recovery" value={fmtNum(m.avgRecovery, '/100')} />
          <Stat label="Avg sleep" value={fmtNum(m.avgSleepHours, ' h')} />
          <Stat
            label="Total training load"
            value={fmtNum(m.totalTrainingLoad, '', 0)}
            hint={`Avg daily ${fmtNum(m.avgDailyTrainingLoad, '', 0)}`}
          />
          <Stat
            label="Days logged"
            value={m.daysLogged == null ? '—' : `${m.daysLogged}/${m.daysInPeriod || 7}`}
            hint={m.completenessPct != null ? `${fmtNum(m.completenessPct, '%', 0)} complete` : undefined}
          />
        </dl>
        {missing.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">Days without an entry: {missing.map(fmtDay).join(', ')}</p>
        )}
      </section>

      <section aria-labelledby="summary-h" className="rounded-2xl border border-line bg-panel p-5">
        <h2 id="summary-h" className="font-display text-lg text-white">Summary</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">
          {report.summary || 'No summary available.'}
        </p>
      </section>

      <section aria-labelledby="trend-h">
        <h2 id="trend-h" className="mb-3 font-display text-lg text-white">Trends vs previous week</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TRENDS.map(([k, name]) => (
            <div key={k} className="rounded-xl border border-line bg-panel p-4">
              <p className="text-sm font-medium text-white">{name}</p>
              <div className="mt-2">
                <TrendBadge label={tc[k]?.label} changePct={tc[k]?.changePct} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {tc[k]?.basis || 'Not enough data to compare with the previous week.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="att-h">
        <h2 id="att-h" className="mb-3 font-display text-lg text-white">Attention events</h2>
        {events.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 p-4 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No needs-attention events this week.
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((e, i) => (
              <li key={`${e.date}-${i}`} className="rounded-xl border border-warn/30 bg-warn/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-warn">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {e.title || 'Needs attention'}
                  <span className="font-normal text-warn/70">&middot; {fmtDay(e.date)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="border-t border-line pt-4 text-xs text-slate-500">
        {DISCLAIMER}
        {report.generatedAt && (
          <span className="mt-1 block">Generated {new Date(report.generatedAt).toLocaleString()}</span>
        )}
      </p>
    </div>
  );
}
