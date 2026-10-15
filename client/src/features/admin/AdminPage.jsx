import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { listUsers, setUserStatus } from '../../services/athleteService';
import { parseError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../lib/format';

export default function AdminPage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, rows: [], meta: null, error: '' });
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data, meta } = await listUsers({ page, limit: 15, ...(role && { role }), ...(query && { q: query }) });
      setState({ loading: false, rows: data || [], meta, error: '' });
    } catch (err) {
      setState({ loading: false, rows: [], meta: null, error: parseError(err).message });
    }
  }, [page, role, query]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (u) => {
    setBusy(u.id);
    try {
      await setUserStatus(u.id, !u.isActive);
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`);
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === u.id ? { ...r, isActive: !u.isActive } : r)) }));
    } catch (err) {
      toast.error(parseError(err).message);
    } finally { setBusy(null); }
  };

  const { loading, rows, meta, error } = state;
  const totalPages = meta?.totalPages || 1;

  return (
    <div>
      <PageHeader title="User management" subtitle="Activate or deactivate accounts. Entry data is not accessible from here." />
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" aria-hidden />
          <input aria-label="Search users" className="field pl-9" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by role" className="field w-auto" value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }}>
          <option value="">All roles</option><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="admin">Admin</option>
        </select>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No users found" message="Try a different search or role filter." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
                <tr>{['Name', 'Email', 'Role', 'Joined', 'Status', ''].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3"><Badge tone={u.role === 'admin' ? 'violet' : u.role === 'coach' ? 'info' : 'neutral'}>{u.role}</Badge></td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3"><Badge tone={u.isActive ? 'ok' : 'crit'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant={u.isActive ? 'secondary' : 'primary'} loading={busy === u.id} disabled={u.id === me?.id}
                        title={u.id === me?.id ? 'You cannot change your own status' : undefined} onClick={() => toggle(u)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-slate-400">
            <span>Page {meta?.page || page} of {totalPages}{meta?.total != null && ` · ${meta.total} users`}</span>
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
