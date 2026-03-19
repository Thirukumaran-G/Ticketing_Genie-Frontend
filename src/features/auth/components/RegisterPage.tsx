// src/features/auth/components/RegisterPage.tsx
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

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  full_name: z
    .string()
    .min(1,   'Full name is required.')
    .max(255, 'Name is too long.'),

  email: z
    .string()
    .email('Enter a valid email address.'),

  password: z
    .string()
    .min(8,   'Password must be at least 8 characters.')
    .max(128, 'Password is too long.')
    .refine((v) => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter.')
    .refine((v) => /[a-z]/.test(v), 'Password must contain at least one lowercase letter.')
    .refine((v) => /[0-9]/.test(v), 'Password must contain at least one number.'),

  ph_no: z
    .string()
    .optional()
    .refine(
      (v) => { if (!v || !v.trim()) return true; return v.replace(/\D/g, '').length === 10; },
      'Phone number must be exactly 10 digits.',
    )
    .refine(
      (v) => { if (!v || !v.trim()) return true; return /^[6-9]/.test(v.replace(/\D/g, '')); },
      'Phone number must start with 6, 7, 8, or 9.',
    ),
});

type Form = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────────

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, isAuthenticated, user, clearError } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', ph_no: '' },
  });

  useEffect(() => {
    if (isAuthenticated && user) navigate(ROLE_HOME[user.role] ?? '/');
  }, [isAuthenticated, user, navigate]);

  // Server errors → toast
  useEffect(() => {
    if (error) { toast.error(error); clearError(); }
  }, [error, clearError]);

  // Client validation errors → toast first error only, no inline display
  const onInvalid = (errs: typeof errors) => {
    const first = Object.values(errs)[0]?.message;
    if (first) toast.error(first);
  };

  const onSubmit = async (data: Form) => {
    await registerUser(data.full_name, data.email, data.password, data.ph_no || undefined);
  };

  return (
    <AuthLayout title="Create account" subtitle="Sign up to get started">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>

        <Input
          label="Full name"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          {...register('full_name')}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            {...register('password')}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Min. 8 characters · uppercase · lowercase · number
          </p>
        </div>

        <Input
          label="Phone number (optional)"
          type="tel"
          placeholder="9876543210"
          autoComplete="tel"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
          {...register('ph_no')}
        />

        <Button type="submit" full size="lg" loading={isLoading}>
          Create account
        </Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};