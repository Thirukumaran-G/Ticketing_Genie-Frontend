// src/features/auth/components/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../../../layouts/AuthLayout';
import { Button, Input } from '../../../components/ui/index';
import { authService } from '../services/authService';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
});
type Form = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  // Client validation → toast, no inline
  const onInvalid = (errs: typeof errors) => {
    const first = Object.values(errs)[0]?.message;
    if (first) toast.error(first);
  };

  const onSubmit = async (d: Form) => {
    try {
      setLoading(true);
      await authService.forgotPassword(d.email);
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent a reset link">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">If an account exists for</p>
          <p className="text-slate-900 font-semibold mt-1 mb-2">{getValues('email')}</p>
          <p className="text-slate-400 text-xs mb-6">a reset link has been sent — check your inbox and spam folder.</p>
          <Link to="/login" className="text-sm text-slate-700 hover:text-blue-600">← Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send a reset link">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>

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

        <Button type="submit" full size="lg" loading={loading}>Send reset link</Button>

        <p className="text-center text-sm text-slate-600">
          <Link to="/login" className="text-slate-700 hover:text-blue-600">← Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};