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

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Form = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: Form) => {
    try {
      setLoading(true);
      await authService.forgotPassword(d.email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent a reset link">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm">Reset link sent to</p>
          <p className="text-white font-semibold mt-1 mb-6">{getValues('email')}</p>
          <Link to="/login" className="text-sm text-zinc-400 hover:text-white">← Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send a reset link">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input label="Email address" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
        <Button type="submit" full size="lg" loading={loading}>Send reset link</Button>
        <p className="text-center text-sm text-zinc-500">
          <Link to="/login" className="text-zinc-400 hover:text-white">← Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};
