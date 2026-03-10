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

const schema = z.object({
  new_password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type Form = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const token = params.get('token') ?? '';
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (d: Form) => {
    if (!token) { toast.error('Invalid reset link.'); return; }
    try {
      setLoading(true);
      await authService.resetPassword(token, d.new_password);
      toast.success('Password reset! Please sign in.');
      navigate('/login');
    } catch {
      toast.error('Link expired or invalid. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input label="New password" type="password" placeholder="Min. 8 characters" autoComplete="new-password" error={errors.new_password?.message} {...register('new_password')} />
        <Input label="Confirm password" type="password" placeholder="Re-enter password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" full size="lg" loading={loading}>Reset password</Button>
      </form>
    </AuthLayout>
  );
};
