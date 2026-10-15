import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/ui';
import PasswordInput from './PasswordInput';
import AuthLayout from './AuthLayout';
import { useAuth, homeForRole } from '../../context/AuthContext';
import { parseError } from '../../services/api';

export default function RegisterPage() {
  const { register: signUp, user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, getValues, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '' },
  });

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onSubmit = async (v) => {
    setServerError('');
    try {
      const payload = { name: v.name.trim(), email: v.email.trim(), password: v.password };
      if (v.phone.trim()) payload.phone = v.phone.trim();
      const u = await signUp(payload);
      toast.success('Account created. Let us set up your profile.');
      navigate(homeForRole(u.role), { replace: true });
    } catch (err) {
      const e = parseError(err);
      if (e.details?.length) e.details.forEach((d) => d.field && setError(d.field, { message: d.message }));
      setServerError(e.status === 409 ? 'An account with this email already exists.' : e.message);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your training and build your digital twin."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-electric hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <div role="alert" className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-red-300">{serverError}</div>}
        <Input label="Full name" autoComplete="name" error={errors.name?.message}
          {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' }, maxLength: { value: 80, message: 'Name must be 80 characters or fewer' } })} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message}
          {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        <Input label="Phone (optional)" type="tel" autoComplete="tel" error={errors.phone?.message}
          {...register('phone', { pattern: { value: /^[+\d][\d\s-]{6,19}$/, message: 'Enter a valid phone number' } })} />
        <PasswordInput label="Password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
            validate: (p) => (/[A-Za-z]/.test(p) && /\d/.test(p)) || 'Password must contain a letter and a number',
          })} />
        <PasswordInput label="Confirm password" autoComplete="new-password" error={errors.confirm?.message}
          {...register('confirm', { required: 'Please confirm your password', validate: (c) => c === getValues('password') || 'Passwords do not match' })} />
        <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
      </form>
    </AuthLayout>
  );
}
