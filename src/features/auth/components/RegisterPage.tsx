import React, { useEffect, useState } from 'react';
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
  full_name: z.string().min(1, 'Full name is required.').max(255, 'Name is too long.'),
  email:     z.string().email('Enter a valid email address.'),
  password:  z
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

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, isAuthenticated, user, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', ph_no: '' },
  });

  useEffect(() => {
    if (isAuthenticated && user) navigate(ROLE_HOME[user.role] ?? '/');
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); clearError(); }
  }, [error, clearError]);

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
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            rightIcon={<EyeIcon show={showPassword} onClick={() => setShowPassword(p => !p)} />}
            {...register('password')}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Min. 8 characters · uppercase · lowercase · number
          </p>
        </div>

        <Input
          label="Phone number"
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

        <Button type="submit" full size="lg" loading={isLoading}>Create account</Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};