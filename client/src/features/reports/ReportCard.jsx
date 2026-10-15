import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, ChevronRight, AlertTriangle } from 'lucide-react';
import TrendBadge from './TrendBadge';
import { fmtRange, fmtNum } from './reportUtils';

export default function ReportCard({ report }) {
  const m = report.metrics || {};
  const tc = report.trendClassification || {};
  const attention = (report.attentionEvents || []).length;
  return (
    <Link
      to={`/app/reports/${report.id}`}
      className="group block rounded-2xl border border-line bg-panel p-5 shadow-card transition hover:border-electric/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarRange className="h-4 w-4 text-electric" aria-hidden="true" />
          {fmtRange(report)}
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Sessions</dt>
          <dd className="mt-1 font-display text-lg text-white">{fmtNum(m.sessions, '', 0)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Performance</dt>
          <dd className="mt-1 font-display text-lg text-white">{fmtNum(m.avgPerformance)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">Recovery</dt>
          <dd className="mt-1 font-display text-lg text-white">{fmtNum(m.avgRecovery)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tc.performance && <TrendBadge label={tc.performance.label} />}
        {attention > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 text-xs font-semibold text-warn">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {attention} attention {attention === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>
    </Link>
  );
}
