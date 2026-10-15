import { useCallback, useEffect, useState } from 'react';
import { Card, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import ProfileForm from './ProfileForm';
import { getProfile } from '../../services/athleteService';
import { useAuth } from '../../context/AuthContext';
import { parseError } from '../../services/api';

export default function ProfilePage() {
  const { user, setProfile } = useAuth();
  const [state, setState] = useState({ loading: true, profile: null, error: '' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const profile = await getProfile();
      setState({ loading: false, profile, error: '' });
    } catch (err) {
      setState({ loading: false, profile: null, error: parseError(err).message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile" subtitle="Your athlete details help your coach and your reports stay relevant." />
      <Card title="Account" className="mb-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Name</dt><dd className="text-slate-100">{user?.name}</dd></div>
          <div><dt className="text-xs text-slate-500">Email</dt><dd className="break-all text-slate-100">{user?.email}</dd></div>
          <div><dt className="text-xs text-slate-500">Phone</dt><dd className="text-slate-100">{user?.phone || '—'}</dd></div>
        </dl>
      </Card>
      {state.loading ? <Skeleton className="h-72 w-full" /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : (
        <Card title={state.profile ? 'Athlete profile' : 'Create your athlete profile'} subtitle={state.profile?.coach ? `Coach: ${state.profile.coach.name}` : 'No coach assigned yet'}>
          <ProfileForm initial={state.profile} onSaved={(p) => { setProfile(p); setState({ loading: false, profile: p, error: '' }); }} />
        </Card>
      )}
    </div>
  );
}
