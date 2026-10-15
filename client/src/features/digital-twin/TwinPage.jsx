import { Link } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';
import { Button, Card, ChangeIndicator, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, TrendBadge } from '../../components/ui';
import { DurationBarChart, TwinHistoryChart } from '../../components/charts';
import InsightCard from '../insights/InsightCard';
import AttentionCard from './AttentionCard';
import useAsync from '../../lib/useAsync';
import { getCurrentTwin, getTwinHistory } from '../../services/twinService';
import { listEntries } from '../../services/entryService';
import { DISCLAIMER, METRICS, fmtDate, fmtNum, fmtPct } from '../../lib/format';

const TRENDS = [['performance', 'Performance'], ['trainingDuration', 'Training duration'], ['recovery', 'Recovery']];

export default function TwinPage() {
  const twin = useAsync(getCurrentTwin, []);
  const history = useAsync(() => getTwinHistory({ limit: 90 }), []);
  const entries = useAsync(() => listEntries({ page: 1, limit: 30 }), []);

  if (twin.loading) {
    return (<><PageHeader title="Digital Twin" /><div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div></>);
  }
  if (twin.error) return (<><PageHeader title="Digital Twin" /><ErrorState message={twin.error} onRetry={twin.reload} /></>);

  const t = twin.data || {};
  if (!t.hasData || !t.twin) {
    return (
      <>
        <PageHeader title="Digital Twin" subtitle="A smoothed model of your load, recovery, fatigue and adaptation." />
        <EmptyState icon={Activity} title="No twin yet" message="Your twin is created from your daily entries. Log a training day to initialise it."
          action={<Link to="/app/log"><Button><Plus className="h-4 w-4" /> Log today</Button></Link>} />
        <p className="mt-8 text-xs text-slate-500">{DISCLAIMER}</p>
      </>
    );
  }

  const { twin: cur, previous } = t;
  const hist = Array.isArray(history.data) ? history.data : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Digital Twin" subtitle={`Last updated from your entry on ${fmtDate(cur.lastEntryDate)} · model version ${cur.version ?? '—'}`}
        action={<Link to="/app/log"><Button size="sm"><Plus className="h-4 w-4" /> Log today</Button></Link>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {METRICS.map((m, i) => (
          <div key={m.key} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}>
            <StatCard label={m.label} value={fmtNum(cur[m.key])} change={t.changes?.[m.key]} invertGood={!!m.invert} neutral={m.key === 'trainingLoad'} accent={m.color} hint={m.hint} />
          </div>
        ))}
      </div>

      <Card title="Current vs previous" subtitle={previous ? `Previous state: ${fmtDate(previous.lastEntryDate || previous.date)}` : 'Only one state recorded so far'} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
              <tr><th scope="col" className="px-5 py-3 font-medium">Metric</th><th scope="col" className="px-5 py-3 font-medium">Previous</th><th scope="col" className="px-5 py-3 font-medium">Current</th><th scope="col" className="px-5 py-3 font-medium">Change</th></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {METRICS.map((m) => (
                <tr key={m.key}>
                  <td className="px-5 py-3 text-slate-200">{m.label}</td>
                  <td className="px-5 py-3 text-slate-400">{fmtNum(previous?.[m.key])}</td>
                  <td className="px-5 py-3 font-medium text-white">{fmtNum(cur[m.key])}</td>
                  <td className="px-5 py-3"><ChangeIndicator change={t.changes?.[m.key]} invertGood={!!m.invert} neutral={m.key === 'trainingLoad'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttentionCard attention={t.attention} />
        <Card title="Trends" subtitle="Mean of the current window vs the previous window">
          <ul className="space-y-4">
            {TRENDS.map(([k, label]) => {
              const tr = t.trends?.[k];
              return (
                <li key={k} className="rounded-lg border border-line bg-ink/40 p-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-200">{label}</span><TrendBadge label={tr?.label} /></div>
                  <p className="mt-1 text-xs text-slate-400">
                    {tr?.changePct != null ? `${fmtPct(tr.changePct)} (${fmtNum(tr.previousMean)} → ${fmtNum(tr.currentMean)})` : 'Not enough data to compare'}
                  </p>
                  {tr?.basis && <p className="mt-1 text-xs text-slate-500">Basis: {tr.basis}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <InsightCard insight={t.latestInsight} />

      <Card title="Twin history" subtitle="Toggle metrics to compare">
        {history.loading ? <Skeleton className="h-80" /> : history.error ? <ErrorState message={history.error} onRetry={history.reload} /> : <TwinHistoryChart history={hist} />}
      </Card>
      <Card title="Training duration" subtitle="Minutes per logged day, last 30 entries">
        {entries.loading ? <Skeleton className="h-56" /> : entries.error ? <ErrorState message={entries.error} onRetry={entries.reload} /> : <DurationBarChart entries={entries.data?.data || []} />}
      </Card>

      <p className="rounded-lg border border-line bg-panel/60 p-4 text-xs leading-relaxed text-slate-400">{DISCLAIMER}</p>
    </div>
  );
}
