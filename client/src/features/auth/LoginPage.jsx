import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/ui';
import PasswordInput from './PasswordInput';
import AuthLayout from './AuthLayout';
import { useAuth, homeForRole } from '../../context/AuthContext';
import { parseError } from '../../services/api';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onSubmit = async (v) => {
    setServerError('');
    try {
      const u = await login(v.email.trim(), v.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' && u.role === 'athlete' ? from : homeForRole(u.role), { replace: true });
    } catch (err) {
      const e = parseError(err);
      setServerError(e.status === 401 ? 'Incorrect email or password.' : e.message);
    }
  };

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back to Olympus."
      footer={<>New here? <Link to="/register" className="font-medium text-electric hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <div role="alert" className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-red-300">{serverError}</div>}
        <Input
          label="Email" type="email" autoComplete="email" error={errors.email?.message}
          {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })}
        />
        <PasswordInput
          label="Password" autoComplete="current-password" error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">Log in</Button>
      </form>
      <p className="mt-6 rounded-lg border border-line bg-panel/60 p-3 text-xs text-slate-400">
        Demo accounts (development seed): athlete@olympus.demo / Athlete@123
      </p>
    </AuthLayout>
  );
}
