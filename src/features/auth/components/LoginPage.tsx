// src/features/auth/components/LoginPage.tsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../../../layouts/AuthLayout';
import { Button, Input } from '../../../components/ui/index';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HOME } from '../../../config';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, user, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isAuthenticated && user) navigate(ROLE_HOME[user.role] ?? '/');
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); clearError(); }
  }, [error, clearError]);

  const onSubmit = async (d: Form) => { await login(d.email, d.password); };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email address" type="email" placeholder="you@company.com"
          autoComplete="email" error={errors.email?.message}
          leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>}
          {...register('email')}
        />
        <Input
          label="Password" type="password" placeholder="••••••••"
          autoComplete="current-password" error={errors.password?.message}
          leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-zinc-400 hover:text-white transition-colors">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" full size="lg" loading={isLoading}>Sign in</Button>
        <p className="text-center text-sm text-zinc-500">
          No account?{' '}
          <Link to="/register" className="text-white hover:underline font-medium">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
