import { Users } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatusPill } from '../../components/ui';
import useAsync from '../../lib/useAsync';
import { getCoachAthletes } from '../../services/athleteService';
import { fmtNum } from '../../lib/format';

export default function CoachPage() {
  const { data, loading, error, reload } = useAsync(getCoachAthletes, []);
  const list = Array.isArray(data) ? data : data?.athletes || [];
  return (
    <div>
      <PageHeader title="My athletes" subtitle="Athletes assigned to you, with their latest twin summary." />
      {loading ? <Skeleton className="h-48" /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? (
        <EmptyState icon={Users} title="No athletes assigned" message="Athletes appear here once an administrator assigns them to you." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
                <tr>{['Athlete', 'Sport', 'Performance', 'Recovery', 'Fatigue', 'Status'].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {list.map((a) => {
                  const tw = a.twin || a.twinSummary || {};
                  const status = a.attention?.status || a.attentionStatus || tw.status;
                  return (
                    <tr key={a.id || a.athleteId}>
                      <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                      <td className="px-4 py-3 text-slate-300">{a.sport || '—'}{a.category && <span className="text-slate-500"> · {a.category}</span>}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(tw.performance)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(tw.recovery)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(tw.fatigue)}</td>
                      <td className="px-4 py-3">{status ? <StatusPill status={status} /> : <Badge>No data</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
