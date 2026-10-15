import { Card, StatusPill } from '../../components/ui';
import { fmtDate, fmtNum, fmtPct } from '../../lib/format';

const METRIC_LABEL = { trainingLoad: 'Training load', recovery: 'Recovery', performance: 'Performance' };

export default function AttentionCard({ attention, compact = false }) {
  const status = attention?.status || 'insufficient_data';
  const cp = attention?.comparisonPeriod;
  const border = status === 'needs_attention' ? 'border-crit/40' : status === 'monitoring' ? 'border-warn/30' : '';
  return (
    <Card title="Attention status" subtitle="Compares the last 7 days with the 7 days before" action={<StatusPill status={status} />} className={border}>
      {!attention ? (
        <p className="text-sm text-slate-400">Log at least a few days in two consecutive weeks to enable this check.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-300">{attention.explanation}</p>
          {!compact && attention.triggers?.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Triggers</h4>
              <ul className="space-y-2">
                {attention.triggers.map((t) => (
                  <li key={t.metric} className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2 text-sm">
                    <span className="text-slate-300">{METRIC_LABEL[t.metric] || t.metric}</span>
                    <span className="text-slate-200">{fmtNum(t.previous)} → {fmtNum(t.current)} <span className={t.changePct > 0 ? 'text-amber-400' : 'text-red-400'}>({fmtPct(t.changePct)})</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!compact && cp && (
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              {[['Previous period', cp.previous], ['Current period', cp.current]].map(([label, p]) => (
                <div key={label} className="rounded-lg border border-line bg-ink/40 px-3 py-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-slate-200">{p?.from ? `${fmtDate(p.from)} to ${fmtDate(p.to)}` : 'No data'}{p?.days != null && <span className="text-slate-500"> · {p.days} days logged</span>}</dd>
                </div>
              ))}
            </dl>
          )}
          {attention.rule && !compact && <p className="text-xs text-slate-500">Rule: {attention.rule}</p>}
        </div>
      )}
    </Card>
  );
}
