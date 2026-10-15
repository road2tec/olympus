import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { listReports, generateReport } from '../../services/reportService';
import { parseError } from '../../services/api';
import ReportCard from './ReportCard';
import { mondayOf, todayStr, fmtDay } from './reportUtils';

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading reports">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-panel" />
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [week, setWeek] = useState(todayStr());
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await listReports({ page, limit: 12 });
      setReports(data || []);
      setMeta(m || null);
    } catch (err) {
      setError(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!week) {
      toast.error('Pick a date within the week you want to report on.');
      return;
    }
    setGenerating(true);
    try {
      const { report, created } = await generateReport(week);
      toast.success(created ? 'Report generated.' : 'Existing report refreshed.');
      navigate(`/app/reports/${report.id}`);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Weekly reports</h1>
          <p className="mt-1 text-sm text-slate-400">
            Summaries of your training, recovery and trends, week by week (Monday to Sunday).
          </p>
        </div>
        <form onSubmit={onGenerate} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="report-week" className="block text-xs font-medium text-slate-300">
              Any day in the week
            </label>
            <input
              id="report-week"
              type="date"
              value={week}
              max={todayStr()}
              onChange={(e) => setWeek(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric [color-scheme:dark]"
            />
            {week && <p className="mt-1 text-[11px] text-slate-500">Week starting {fmtDay(mondayOf(week))}</p>}
          </div>
          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white transition hover:bg-electric/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {generating ? 'Generating...' : 'Generate report'}
          </button>
        </form>
      </header>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-crit/30 bg-crit/10 p-5 text-sm text-crit">
          <p>{error}</p>
          <button type="button" onClick={load} className="mt-3 rounded-lg border border-crit/40 px-3 py-1.5 font-medium hover:bg-crit/10">
            Try again
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-14 text-center">
          <FileText className="h-10 w-10 text-electric" aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg text-white">No reports yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Log a few training days, then pick a week above and generate your first report. Weeks without entries are
            reported with missing days clearly marked.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
          {meta && meta.totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3 text-sm text-slate-300" aria-label="Pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
                Previous
              </button>
              <span>
                Page {meta.page} of {meta.totalPages}
              </span>
              <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
