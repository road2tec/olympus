import { Link } from 'react-router-dom';
import { Activity, FileText, Plus, UserRound } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusPill, TrendBadge } from '../../components/ui';
import { TrendLineChart } from '../../components/charts';
import InsightCard from '../insights/InsightCard';
import ProfileForm from './ProfileForm';
import useAsync from '../../lib/useAsync';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../services/athleteService';
import { getCurrentTwin, getTwinHistory } from '../../services/twinService';
import { listEntries } from '../../services/entryService';
import { listReports } from '../../services/reportService';
import { METRICS, cap, fmtDate, fmtNum } from '../../lib/format';

const shortDate = (d) => fmtDate(d, { day: 'numeric', month: 'short' });

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, setProfile } = useAuth();
  const profile = useAsync(getProfile, []);
  const twin = useAsync(getCurrentTwin, []);
  const history = useAsync(() => getTwinHistory({ limit: 30 }), []);
  const entries = useAsync(() => listEntries({ page: 1, limit: 5 }), []);
  const reports = useAsync(async () => {
    const r = await listReports({ page: 1, limit: 3 });
    return Array.isArray(r) ? r : r?.data || r?.reports || [];
  }, []);

  const first = user?.name?.split(' ')[0] || 'athlete';

  if (profile.loading || twin.loading) {
    return (<><PageHeader title={`Welcome, ${first}`} /><DashboardSkeleton /></>);
  }

  // First-time user: onboarding
  if (!profile.error && profile.data === null) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={`Welcome to Olympus, ${first}`} subtitle="Two quick steps: set up your athlete profile, then log your first training day." />
        <Card title="Step 1 of 2: Your athlete profile" subtitle="This takes under a minute.">
          <ProfileForm submitLabel="Save and continue" onSaved={(p) => { setProfile(p); profile.reload(); }} />
        </Card>
      </div>
    );
  }

  if (twin.error) {
    return (<><PageHeader title={`Welcome, ${first}`} /><ErrorState message={twin.error} onRetry={() => { twin.reload(); history.reload(); }} /></>);
  }

  const t = twin.data || {};
  const cur = t.twin;
  const hist = Array.isArray(history.data) ? history.data : [];
  const labels = hist.map((h) => shortDate(h.date));
  const series = (k) => hist.map((h) => (h[k] == null ? null : Number(h[k])));
  const attention = t.attention;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${first}`}
        subtitle={cur?.lastEntryDate ? `Last entry ${fmtDate(cur.lastEntryDate)}` : 'Your training overview'}
        action={<Link to="/app/log"><Button><Plus className="h-4 w-4" /> Log today</Button></Link>}
      />

      {!t.hasData || !cur ? (
        <EmptyState
          icon={Activity}
          title="Your digital twin is waiting for data"
          message="Log your first training day and Olympus will start modelling your load, recovery, fatigue and adaptation."
          action={<Link to="/app/log"><Button>Log your first day</Button></Link>}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twin status</span>
            <StatusPill status={attention?.status || 'insufficient_data'} />
            <p className="min-w-0 flex-1 text-sm text-slate-300">{attention?.explanation || 'Not enough data yet to compare weeks.'}</p>
            <Link to="/app/twin" className="text-sm font-medium text-electric hover:underline">View twin</Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {METRICS.map((m, i) => (
              <div key={m.key} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}>
                <StatCard label={m.label} value={fmtNum(cur[m.key])} change={t.changes?.[m.key]} invertGood={!!m.invert} neutral={m.key === 'trainingLoad'} accent={m.color} />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Performance and recovery" subtitle="Smoothed values, last 30 days">
              {history.loading ? <Skeleton className="h-60" /> : history.error ? <ErrorState message={history.error} onRetry={history.reload} /> : (
                <TrendLineChart labels={labels} yMin={0} yMax={100} height={240}
                  datasets={[{ label: 'Performance', data: series('performance'), color: '#3B82F6' }, { label: 'Recovery', data: series('recovery'), color: '#22C55E' }]} />
              )}
            </Card>
            <Card title="Load and fatigue" subtitle="Load is duration × intensity; fatigue is 0-100">
              {history.loading ? <Skeleton className="h-60" /> : history.error ? <ErrorState message={history.error} onRetry={history.reload} /> : (
                <TrendLineChart labels={labels} height={240}
                  datasets={[{ label: 'Training load', data: series('trainingLoad'), color: '#7C5CFF' }, { label: 'Fatigue', data: series('fatigue'), color: '#F59E0B' }]} />
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><InsightCard insight={t.latestInsight} /></div>
            <Card title="Trends" subtitle="This week vs previous week">
              <ul className="space-y-3 text-sm">
                {[['performance', 'Performance'], ['trainingDuration', 'Training duration'], ['recovery', 'Recovery']].map(([k, l]) => (
                  <li key={k} className="flex items-center justify-between"><span className="text-slate-300">{l}</span><TrendBadge label={t.trends?.[k]?.label} /></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Recent entries" action={<Link to="/app/entries" className="text-xs font-medium text-electric hover:underline">View all</Link>}>
          {entries.loading ? <Skeleton className="h-32" /> : entries.error ? <ErrorState message={entries.error} onRetry={entries.reload} /> :
            (entries.data?.data || []).length === 0 ? <p className="text-sm text-slate-400">No entries logged yet.</p> : (
              <ul className="divide-y divide-line/60">
                {entries.data.data.map((e) => (
                  <li key={e.id || e._id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-200">{fmtDate(e.date)}</span>
                    <span className="flex items-center gap-3 text-slate-400"><Badge tone="info">{cap(e.trainingType)}</Badge>{e.durationMinutes} min · RPE {e.intensity}</span>
                  </li>
                ))}
              </ul>
            )}
        </Card>
        <Card title="Recent reports" action={<Link to="/app/reports" className="text-xs font-medium text-electric hover:underline">All reports</Link>}>
          {reports.loading ? <Skeleton className="h-32" /> : reports.error ? <ErrorState message={reports.error} onRetry={reports.reload} /> :
            (reports.data || []).length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-slate-400"><FileText className="h-5 w-5 text-slate-500" /> No weekly reports yet. <Link to="/app/reports" className="text-electric hover:underline">Generate one</Link></div>
            ) : (
              <ul className="divide-y divide-line/60">
                {reports.data.map((r) => (
                  <li key={r.id} className="py-2.5 text-sm">
                    <Link to={`/app/reports/${r.id}`} className="flex items-center justify-between hover:text-white">
                      <span className="text-slate-200">{fmtDate(r.periodStart, { day: 'numeric', month: 'short' })} to {fmtDate(r.periodEnd)}</span>
                      <span className="text-xs text-slate-500">{r.metrics?.daysLogged ?? 0}/7 days</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>

      {profile.error && (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><UserRound className="h-3.5 w-3.5" /> Profile could not be loaded: {profile.error}</p>
      )}
    </div>
  );
}
