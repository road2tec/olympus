import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { Button, Card, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import EntryForm, { emptyEntry, entryToForm } from './EntryForm';
import { createEntry, getEntry, listEntries, updateEntry } from '../../services/entryService';
import { parseError } from '../../services/api';
import { fmtDate } from '../../lib/format';
import { useEffect } from 'react';

function showInsightToast(result, verb) {
  const ins = result?.insight;
  toast.custom(
    () => (
      <div className={`max-w-sm rounded-xl border border-line bg-panel p-4 shadow-xl`}>
        <p className="text-sm font-semibold text-white">Entry {verb}. Twin updated.</p>
        {ins ? (
          <>
            <p className="mt-1 text-sm font-medium text-blue-300">{ins.title}</p>
            <p className="mt-1 line-clamp-3 text-xs text-slate-400">{ins.message}</p>
          </>
        ) : <p className="mt-1 text-xs text-slate-400">No new insight yet.</p>}
      </div>
    ),
    { duration: 6000 }
  );
}

export default function DailyLogPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [existing, setExisting] = useState(null); // entry being edited via PATCH
  const [loading, setLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState('');
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(null);
  const [duplicate, setDuplicate] = useState(null); // {date}
  const [finding, setFinding] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    getEntry(editId)
      .then((e) => alive && setExisting(e))
      .catch((err) => alive && setLoadError(parseError(err).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editId]);

  const onSubmit = async (payload) => {
    setServerError(''); setFieldErrors(null);
    try {
      if (existing) {
        const body = { ...payload };
        const res = await updateEntry(existing.id || existing._id, body);
        showInsightToast(res, 'updated');
      } else {
        const res = await createEntry(payload);
        showInsightToast(res, 'saved');
      }
      navigate('/app/dashboard');
    } catch (err) {
      const e = parseError(err);
      if (e.status === 409 && !existing) {
        setDuplicate({ date: payload.date });
        setDraft(payload);
        setServerError('');
      } else if (e.status === 400 && e.details?.length) {
        setFieldErrors(Object.fromEntries(e.details.filter((d) => d.field).map((d) => [d.field, d.message])));
        setServerError(e.message);
      } else {
        setServerError(e.message);
      }
    }
  };

  const editExisting = async () => {
    setFinding(true);
    try {
      const { data } = await listEntries({ from: duplicate.date, to: duplicate.date, limit: 5 });
      const found = (data || []).find((x) => String(x.date).slice(0, 10) === duplicate.date) || data?.[0];
      if (!found) throw new Error('missing');
      setExisting(found);
      setDuplicate(null);
      toast('Editing the existing entry for ' + fmtDate(duplicate.date), { icon: '✏️' });
    } catch {
      toast.error('Could not load the existing entry. Open it from the Entries page.');
    } finally {
      setFinding(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl" />;
  if (loadError) return <ErrorState message={loadError} />;

  const defaults = existing ? entryToForm(existing) : draft ? { ...emptyEntry(), ...{
    date: draft.date, trainingType: draft.trainingType, durationMinutes: draft.durationMinutes, intensity: draft.intensity,
    performanceScore: draft.performanceScore, feelingScore: String(draft.feelingScore), sleepHours: draft.sleepHours,
    dietNotes: draft.dietNotes, mealCount: String(draft.mealCount),
  } } : undefined;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={existing ? `Edit entry, ${fmtDate(existing.date)}` : 'Log today'}
        subtitle={existing ? 'Changes recalculate your digital twin from this date onward.' : 'A minute a day keeps your twin accurate.'}
      />
      <Card>
        <EntryForm
          key={existing ? `edit-${existing.id || existing._id}` : 'new'}
          defaultValues={defaults}
          onSubmit={onSubmit}
          serverError={serverError}
          fieldErrors={fieldErrors}
          submitLabel={existing ? 'Save changes' : 'Save entry'}
        >
          {duplicate && (
            <div role="alert" className="rounded-lg border border-warn/30 bg-warn/10 p-4">
              <p className="text-sm font-medium text-amber-300">You already logged an entry for {fmtDate(duplicate.date)}.</p>
              <p className="mt-1 text-xs text-slate-400">Only one entry per day is allowed. You can edit the existing entry instead, or pick a different date.</p>
              <Button variant="secondary" size="sm" className="mt-3" loading={finding} onClick={editExisting}>
                <Pencil className="h-3.5 w-3.5" /> Edit existing entry
              </Button>
            </div>
          )}
        </EntryForm>
      </Card>
    </div>
  );
}
