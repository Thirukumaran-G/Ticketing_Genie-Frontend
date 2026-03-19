// src/features/auth/components/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '../../../layouts/AuthLayout';
import { Button, Input } from '../../../components/ui/index';
import { authService } from '../services/authService';

const schema = z
  .object({
    new_password: z
      .string()
      .min(8,   'Password must be at least 8 characters.')
      .max(128, 'Password is too long.')
      .refine((v) => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter.')
      .refine((v) => /[a-z]/.test(v), 'Password must contain at least one lowercase letter.')
      .refine((v) => /[0-9]/.test(v), 'Password must contain at least one number.'),
    confirm: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Passwords do not match.',
    path:    ['confirm'],
  });

type Form = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const [params]          = useSearchParams();
  const navigate          = useNavigate();
  const [loading, setLoading] = useState(false);

  // Read token exactly as-is from URL — never encode/decode it
  const token = params.get('token') ?? '';

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  // Client validation → toast first error, no inline
  const onInvalid = (errs: typeof errors) => {
    const first = Object.values(errs)[0]?.message;
    if (first) toast.error(first);
  };

  const onSubmit = async (d: Form) => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }
    try {
      setLoading(true);
      await authService.resetPassword(token, d.new_password);
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      const msg =
        err?.response?.data?.details?.[0]?.message ||
        err?.response?.data?.detail               ||
        err?.response?.data?.message              ||
        'Link expired or invalid. Please request a new one.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>

        <div>
          <Input
            label="New password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('new_password')}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Min. 8 characters · uppercase · lowercase · number
          </p>
        </div>

        <Input
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          {...register('confirm')}
        />

        <Button type="submit" full size="lg" loading={loading}>
          Reset password
        </Button>

      </form>
    </AuthLayout>
  );
};