// src/features/tickets/components/customer/RaiseTicketPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { Button, Input, Select, Textarea } from '../../../../components/ui/index';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { createTicketThunk, fetchProducts } from '../../slices/ticketsSlice';
import { customerNav } from './customerNav';
import { ENVIRONMENTS, SEVERITIES } from '../../../../config';

const schema = z.object({
  title: z.string().min(5, 'At least 5 characters').max(500),
  description: z.string().min(10, 'Please provide more detail'),
  product_id: z.string().min(1, 'Select a product'),
  customer_severity: z.enum(['critical', 'high', 'medium', 'low'], { required_error: 'Select severity' }),
  environment: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const SEV_COLORS: Record<string, string> = {
  critical: 'border-red-700 bg-red-950/30 ring-1 ring-red-700/40',
  high:     'border-orange-700 bg-orange-950/30 ring-1 ring-orange-700/40',
  medium:   'border-yellow-700 bg-yellow-950/30 ring-1 ring-yellow-700/40',
  low:      'border-blue-700 bg-blue-950/30 ring-1 ring-blue-700/40',
};
const SEV_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
};
const SEV_DESC: Record<string, string> = {
  critical: 'Major production outage affecting all/most users',
  high:     'Major feature broken; severe degradation',
  medium:   'Functional issue with a workaround',
  low:      'Cosmetic issue or general question',
};

export const RaiseTicketPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isSubmitting, products } = useAppSelector((s) => s.tickets);

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const severity = watch('customer_severity');

  const onSubmit = async (data: Form) => {
    const result = await dispatch(createTicketThunk({ ...data, source: 'web' }));
    if (createTicketThunk.fulfilled.match(result)) {
      toast.success(`Ticket ${result.payload.ticket_number} created!`);
      navigate('/tickets/mine');
    } else {
      toast.error((result.payload as string) ?? 'Failed to create ticket');
    }
  };

  const productOptions = products
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.name }));

  const envOptions = ENVIRONMENTS.map((e) => ({
    value: e,
    label: e.charAt(0).toUpperCase() + e.slice(1),
  }));

  return (
    <MainLayout navItems={customerNav} pageTitle="New Ticket">
      <div className="w-full p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Raise a Support Ticket</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Describe your issue and our team will respond shortly</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Support team online
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

          {/* Issue Details */}
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Issue Details</h3>
            <Input
              label="Title"
              placeholder="Brief summary of the issue…"
              error={errors.title?.message}
              {...register('title')}
            />
            <Textarea
              label="Description"
              placeholder="Describe the issue — steps to reproduce, error messages, expected vs actual behaviour…"
              error={errors.description?.message}
              className="min-h-36 resize-none"
              {...register('description')}
            />
          </div>

          {/* Classification */}
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Classification</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Product / Service"
                options={productOptions}
                placeholder={products.length === 0 ? 'Loading…' : 'Select a product…'}
                error={errors.product_id?.message}
                {...register('product_id')}
              />
              <Select
                label="Environment (optional)"
                options={envOptions}
                placeholder="Select environment…"
                {...register('environment')}
              />
            </div>

            {/* Severity */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Severity</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SEVERITIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setValue('customer_severity', level, { shouldValidate: true })}
                    className={clsx(
                      'p-3 rounded-xl border text-left transition-all duration-150',
                      severity === level
                        ? SEV_COLORS[level]
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', SEV_DOT[level])} />
                      <span className="text-white font-semibold text-xs uppercase tracking-wider">{level}</span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-snug">{SEV_DESC[level]}</p>
                  </button>
                ))}
              </div>
              {errors.customer_severity && (
                <p className="text-xs text-red-400">{errors.customer_severity.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-zinc-600">All fields marked are required</p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/tickets/mine')} size="lg">
                Cancel
              </Button>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Submit Ticket
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};