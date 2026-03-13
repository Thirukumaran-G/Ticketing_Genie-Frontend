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

const schema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255, 'Name is too long'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  ph_no: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, isAuthenticated, user, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      ph_no: '',
    }
  });

  useEffect(() => {
    if (isAuthenticated && user) navigate(ROLE_HOME[user.role] ?? '/');
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); clearError(); }
  }, [error, clearError]);

  const onSubmit = async (data: Form) => { 
    await registerUser(
      data.full_name,
      data.email, 
      data.password, 
      data.ph_no || undefined
    ); 
  };

  return (
    <AuthLayout title="Create account" subtitle="Sign up to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Full name" 
          type="text" 
          placeholder="John Doe"
          autoComplete="name" 
          error={errors.full_name?.message}
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
          error={errors.email?.message}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
          {...register('email')}
        />
        
        <Input
          label="Password" 
          type="password" 
          placeholder="••••••••"
          autoComplete="new-password" 
          error={errors.password?.message}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          {...register('password')}
        />
        
        <Input
          label="Phone number" 
          type="tel" 
          placeholder="+1234567890"
          autoComplete="tel" 
          error={errors.ph_no?.message}
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
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};