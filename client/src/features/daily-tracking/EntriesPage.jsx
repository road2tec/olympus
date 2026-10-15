import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { listEntries } from '../../services/entryService';
import { parseError } from '../../services/api';
import { cap, fmtDate, fmtNum } from '../../lib/format';

const LIMIT = 15;

export default function EntriesPage() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, rows: [], meta: null, error: '' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data, meta } = await listEntries({ page, limit: LIMIT });
      setState({ loading: false, rows: data || [], meta, error: '' });
    } catch (err) {
      setState({ loading: false, rows: [], meta: null, error: parseError(err).message });
    }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const { loading, rows, meta, error } = state;
  const totalPages = meta?.totalPages || 1;

  return (
    <div>
      <PageHeader title="Entries" subtitle="Your daily training history, newest first."
        action={<Link to="/app/log"><Button size="sm"><Plus className="h-4 w-4" /> Log today</Button></Link>} />
      {error ? <ErrorState message={error} onRetry={load} /> : loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No entries yet" message="Log your first training day to start building your digital twin."
          action={<Link to="/app/log"><Button>Log today</Button></Link>} />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {['Date', 'Type', 'Duration', 'Intensity', 'Performance', 'Feeling', 'Sleep', ''].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((e) => {
                  const id = e.id || e._id;
                  return (
                    <tr key={id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3"><Badge tone="info">{cap(e.trainingType)}</Badge></td>
                      <td className="px-4 py-3 text-slate-300">{e.durationMinutes} min</td>
                      <td className="px-4 py-3 text-slate-300">{e.intensity}/10</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(e.performanceScore)}</td>
                      <td className="px-4 py-3 text-slate-300">{e.feelingScore}/5</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(e.sleepHours)} h</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/app/log?edit=${id}`} aria-label={`Edit entry ${e.date}`} className="inline-flex items-center gap-1 text-xs font-medium text-electric hover:underline">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-slate-400">
            <span>Page {meta?.page || page} of {totalPages}{meta?.total != null && ` · ${meta.total} entries`}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
