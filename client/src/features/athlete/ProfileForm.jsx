import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/ui';
import { createProfile, updateProfile } from '../../services/athleteService';
import { parseError } from '../../services/api';

export default function ProfileForm({ initial, onSaved, submitLabel }) {
  const editing = !!initial;
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      sport: initial?.sport || '',
      category: initial?.category || '',
      personalBest: initial?.personalBest || '',
      goal: initial?.goal || '',
      dateOfBirth: initial?.dateOfBirth ? String(initial.dateOfBirth).slice(0, 10) : '',
    },
  });

  const onSubmit = async (v) => {
    setServerError('');
    const body = { sport: v.sport.trim(), category: v.category.trim() };
    if (v.personalBest.trim() || editing) body.personalBest = v.personalBest.trim();
    if (v.goal.trim() || editing) body.goal = v.goal.trim();
    if (v.dateOfBirth) body.dateOfBirth = v.dateOfBirth;
    try {
      const saved = editing ? await updateProfile(body) : await createProfile(body);
      toast.success(editing ? 'Profile updated' : 'Profile created');
      onSaved?.(saved);
    } catch (err) {
      const e = parseError(err);
      if (e.status === 409) {
        setServerError('A profile already exists. Reload the page to edit it.');
      } else {
        (e.details || []).forEach((d) => d.field && setError(d.field, { message: d.message }));
        setServerError(e.message);
      }
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <div role="alert" className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-red-300">{serverError}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Sport" placeholder="e.g. Sprinting" error={errors.sport?.message}
          {...register('sport', { required: 'Sport is required', maxLength: { value: 80, message: 'Too long (max 80)' } })} />
        <Input label="Category / event" placeholder="e.g. 100m / 200m" error={errors.category?.message}
          {...register('category', { required: 'Category is required', maxLength: { value: 80, message: 'Too long (max 80)' } })} />
        <Input label="Personal best (optional)" placeholder="e.g. 10.85s" error={errors.personalBest?.message}
          {...register('personalBest', { maxLength: { value: 80, message: 'Too long (max 80)' } })} />
        <Input label="Date of birth (optional)" type="date" max={today} error={errors.dateOfBirth?.message}
          {...register('dateOfBirth', { validate: (d) => !d || d <= today || 'Date of birth cannot be in the future' })} />
      </div>
      <div>
        <label htmlFor="goal" className="mb-1.5 block text-sm font-medium text-slate-300">Goal (optional)</label>
        <textarea id="goal" rows={3} className="field" placeholder="What are you training towards?"
          {...register('goal', { maxLength: { value: 300, message: 'Goal must be 300 characters or fewer' } })} />
        {errors.goal && <p role="alert" className="mt-1 text-xs text-red-400">{errors.goal.message}</p>}
      </div>
      <Button type="submit" loading={isSubmitting}>{submitLabel || (editing ? 'Save changes' : 'Create profile')}</Button>
    </form>
  );
}
