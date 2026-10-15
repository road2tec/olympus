import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, cx } from '../../components/ui';
import { FEELINGS, TRAINING_TYPES, cap, todayISO } from '../../lib/format';

export const emptyEntry = () => ({
  date: todayISO(),
  trainingType: 'endurance',
  durationMinutes: '',
  intensity: 5,
  performanceScore: '',
  feelingScore: '3',
  sleepHours: '',
  dietNotes: '',
  mealCount: '3',
});

export const entryToForm = (e) => ({
  date: String(e.date).slice(0, 10),
  trainingType: e.trainingType,
  durationMinutes: e.durationMinutes,
  intensity: e.intensity,
  performanceScore: e.performanceScore,
  feelingScore: String(e.feelingScore),
  sleepHours: e.sleepHours,
  dietNotes: e.dietNotes || '',
  mealCount: String(e.mealCount ?? 0),
});

const num = (label, min, max, integer) => ({
  required: `${label} is required`,
  setValueAs: (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
  validate: (v) => {
    if (Number.isNaN(v)) return `${label} is required`;
    if (integer && !Number.isInteger(v)) return `${label} must be a whole number`;
    if (v < min || v > max) return `${label} must be between ${min} and ${max}`;
    return true;
  },
});

/**
 * Pure presentational form. `onSubmit(payload)` must return a promise.
 * `serverError` string and `fieldErrors` ({field: message}) are shown if provided.
 */
export default function EntryForm({ defaultValues, onSubmit, submitLabel = 'Save entry', serverError, fieldErrors, dateLocked, children }) {
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues || emptyEntry(),
  });

  useEffect(() => {
    Object.entries(fieldErrors || {}).forEach(([f, message]) => setError(f, { message }));
  }, [fieldErrors, setError]);

  const intensity = watch('intensity');
  const feeling = String(watch('feelingScore'));
  const diet = watch('dietNotes') || '';
  const today = todayISO();

  const submit = (v) =>
    onSubmit({
      date: v.date,
      trainingType: v.trainingType,
      durationMinutes: Number(v.durationMinutes),
      intensity: Math.min(10, Math.max(1, Math.round(Number(v.intensity)))),
      performanceScore: Number(v.performanceScore),
      feelingScore: Number(v.feelingScore),
      sleepHours: Number(v.sleepHours),
      dietNotes: (v.dietNotes || '').trim(),
      mealCount: Number(v.mealCount),
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6" aria-label="Daily entry">
      {serverError && <div role="alert" className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-red-300">{serverError}</div>}
      {children}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date" type="date" max={today} disabled={dateLocked} error={errors.date?.message}
          {...register('date', { required: 'Date is required', validate: (d) => d <= today || 'Date cannot be in the future' })} />
        <div>
          <label htmlFor="trainingType" className="mb-1.5 block text-sm font-medium text-slate-300">Training type</label>
          <select id="trainingType" className="field" {...register('trainingType', { required: true })}>
            {TRAINING_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
          </select>
        </div>
        <Input label="Duration (minutes)" type="number" inputMode="numeric" min="1" max="600" step="1" error={errors.durationMinutes?.message}
          {...register('durationMinutes', num('Duration', 1, 600, true))} />
        <Input label="Performance score (0-100)" type="number" inputMode="decimal" min="0" max="100" step="any" error={errors.performanceScore?.message}
          {...register('performanceScore', num('Performance score', 0, 100, false))} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="intensity" className="text-sm font-medium text-slate-300">Intensity (RPE)</label>
          <span className="rounded-md bg-electric/15 px-2 py-0.5 font-display text-sm font-semibold text-blue-300">{intensity} / 10</span>
        </div>
        <input id="intensity" type="range" min="1" max="10" step="1" className="mt-3 w-full" {...register('intensity')} />
        <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Easy</span><span>Moderate</span><span>Maximal</span></div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-300">How did you feel?</legend>
        <div className="grid grid-cols-5 gap-2">
          {FEELINGS.map((f) => (
            <label key={f.v} className={cx('cursor-pointer rounded-lg border px-1 py-2.5 text-center text-xs transition-colors',
              feeling === String(f.v) ? 'border-electric bg-electric/15 text-white' : 'border-line bg-ink/40 text-slate-400 hover:border-slate-500')}>
              <input type="radio" value={String(f.v)} className="sr-only" {...register('feelingScore', { required: 'Select how you felt' })} />
              <span className="block font-display text-base font-semibold">{f.v}</span>
              <span className="hidden sm:block">{f.label}</span>
            </label>
          ))}
        </div>
        {errors.feelingScore && <p role="alert" className="mt-1 text-xs text-red-400">{errors.feelingScore.message}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Sleep last night (hours)" type="number" inputMode="decimal" min="0" max="24" step="0.25" error={errors.sleepHours?.message}
          {...register('sleepHours', num('Sleep hours', 0, 24, false))} />
        <div>
          <label htmlFor="mealCount" className="mb-1.5 block text-sm font-medium text-slate-300">Meals today</label>
          <select id="mealCount" className="field" {...register('mealCount')}>
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={String(i)}>{i}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="dietNotes" className="mb-1.5 flex justify-between text-sm font-medium text-slate-300">
          <span>Diet notes (optional)</span><span className={cx('text-xs', diet.length > 500 ? 'text-red-400' : 'text-slate-500')}>{diet.length}/500</span>
        </label>
        <textarea id="dietNotes" rows={3} className="field" placeholder="What did you eat and drink? Anything unusual?"
          {...register('dietNotes', { maxLength: { value: 500, message: 'Diet notes must be 500 characters or fewer' } })} />
        {errors.dietNotes && <p role="alert" className="mt-1 text-xs text-red-400">{errors.dietNotes.message}</p>}
      </div>

      <Button type="submit" loading={isSubmitting} size="lg" className="w-full sm:w-auto">{submitLabel}</Button>
    </form>
  );
}
