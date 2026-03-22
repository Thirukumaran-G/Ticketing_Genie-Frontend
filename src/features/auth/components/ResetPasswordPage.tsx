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

const EyeIcon: React.FC<{ show: boolean; onClick: () => void }> = ({ show, onClick }) => (
  <button type="button" onClick={onClick} className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
    {show ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )}
  </button>
);

export const ResetPasswordPage: React.FC = () => {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const [loading, setLoading]             = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const token = params.get('token') ?? '';

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

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
            type={showNew ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            rightIcon={<EyeIcon show={showNew} onClick={() => setShowNew(p => !p)} />}
            {...register('new_password')}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Min. 8 characters · uppercase · lowercase · number
          </p>
        </div>

        <Input
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          rightIcon={<EyeIcon show={showConfirm} onClick={() => setShowConfirm(p => !p)} />}
          {...register('confirm')}
        />

        <Button type="submit" full size="lg" loading={loading}>Reset password</Button>

      </form>
    </AuthLayout>
  );
};