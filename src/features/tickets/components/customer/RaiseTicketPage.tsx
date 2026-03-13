// src/features/tickets/components/customer/RaiseTicketPage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { MainLayout } from '../../../../layouts/MainLayout';
import { useAppDispatch, useAppSelector } from '../../../../app/store';
import { createTicketThunk, fetchProducts } from '../../slices/ticketsSlice';
import { customerNav } from './customerNav';
import { ENVIRONMENTS, SEVERITIES } from '../../../../config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILES = 5;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.txt', '.md', '.csv',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz',
  '.log', '.json', '.xml', '.yaml', '.yml',
]);

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  product_id: z.string().min(1, 'Select a product'),
  customer_severity: z.enum(['critical', 'high', 'medium', 'low'], {
    required_error: 'Please select a priority',
  }),
  environment: z.string().optional(),
});
type Form = z.infer<typeof schema>;

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

// ── Severity config ───────────────────────────────────────────────────────────

const SEV_CONFIG = {
  critical: {
    active: 'bg-red-600 text-white border-red-600',
    idle: 'border-[#DFE1E6] text-[#42526E] hover:border-red-400 hover:bg-red-50 hover:text-red-700',
    dot: 'bg-red-500',
    activeDot: 'bg-white/80',
    label: 'Critical',
  },
  high: {
    active: 'bg-orange-500 text-white border-orange-500',
    idle: 'border-[#DFE1E6] text-[#42526E] hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700',
    dot: 'bg-orange-400',
    activeDot: 'bg-white/80',
    label: 'High',
  },
  medium: {
    active: 'bg-yellow-500 text-white border-yellow-500',
    idle: 'border-[#DFE1E6] text-[#42526E] hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700',
    dot: 'bg-yellow-400',
    activeDot: 'bg-white/80',
    label: 'Medium',
  },
  low: {
    active: 'bg-blue-500 text-white border-blue-500',
    idle: 'border-[#DFE1E6] text-[#42526E] hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700',
    dot: 'bg-blue-400',
    activeDot: 'bg-white/80',
    label: 'Low',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(file: File): string {
  if (file.type.startsWith('image/')) return '🖼';
  if (file.type === 'application/pdf') return '📄';
  if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.csv')) return '📊';
  if (file.type.includes('word') || file.type.includes('document')) return '📝';
  if (file.type.includes('zip') || file.type.includes('tar') || file.type.includes('gzip')) return '📦';
  return '📎';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const RaiseTicketPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isSubmitting, products } = useAppSelector((s) => s.tickets);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
    };
  }, []); // eslint-disable-line

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const severity = watch('customer_severity');

  // ── File handling ─────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const remaining = MAX_FILES - pendingFiles.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_FILES} attachments allowed`); return; }
    const toAdd: PendingFile[] = [];
    for (const file of arr.slice(0, remaining)) {
      if (!ALLOWED_EXTENSIONS.has(getExt(file.name))) { toast.error(`${file.name}: file type not allowed`); continue; }
      if (file.size > MAX_FILE_BYTES) { toast.error(`${file.name}: exceeds 25 MB`); continue; }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      toAdd.push({ id: crypto.randomUUID(), file, preview });
    }
    if (toAdd.length) setPendingFiles((prev) => [...prev, ...toAdd]);
  }, [pendingFiles.length]);

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const t = prev.find((f) => f.id === id);
      if (t?.preview) URL.revokeObjectURL(t.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current = 0; setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: Form) => {
    const result = await dispatch(createTicketThunk({
      ...data,
      source: 'web',
      files: pendingFiles.map((pf) => pf.file),
    }));
    if (createTicketThunk.fulfilled.match(result)) {
      toast.success(`Ticket ${result.payload.ticket_number} created`);
      navigate('/tickets/mine');
    } else {
      toast.error((result.payload as string) ?? 'Failed to create ticket');
    }
  };

  const productOptions = products.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name }));
  const envOptions = ENVIRONMENTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }));

  // ── Field style helpers ───────────────────────────────────────────────────

  const fieldBase = 'w-full rounded border text-sm text-[#172B4D] placeholder-[#8993A4] bg-[#FAFBFC] outline-none transition-colors focus:bg-white focus:border-[#4C9AFF] focus:ring-2 focus:ring-[#4C9AFF]/20 hover:border-[#B3BAC5]';
  const fieldErr  = 'border-red-400';
  const fieldNorm = 'border-[#DFE1E6]';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout navItems={customerNav} pageTitle="Create issue">
      <div className="min-h-screen bg-[#F4F5F7]">

        {/* Main */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-1">
            <div className="bg-white rounded border border-[#DFE1E6]">

              {/* Card title */}
              <div className="px-6 py-4 border-b border-[#DFE1E6]">
                <h1 className="text-base font-semibold text-[#172B4D]">Create issue</h1>
              </div>

              <div className="px-6 py-5 flex flex-col gap-5">

                {/* Summary */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#172B4D]">
                    Summary <span className="text-[#DE350B]">*</span>
                  </label>
                  <input
                    placeholder="Short summary of the issue"
                    className={clsx(fieldBase, 'h-9 px-3', errors.title ? fieldErr : fieldNorm)}
                    {...register('title')}
                  />
                  {errors.title && <p className="text-xs text-[#DE350B]">{errors.title.message}</p>}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#172B4D]">
                    Description <span className="text-[#DE350B]">*</span>
                  </label>
                  <textarea
                    rows={9}
                    placeholder={'Steps to reproduce:\n\n1. \n2. \n\nExpected result:\n\nActual result:'}
                    className={clsx(fieldBase, 'px-3 py-2 resize-y', errors.description ? fieldErr : fieldNorm)}
                    {...register('description')}
                  />
                  {errors.description && <p className="text-xs text-[#DE350B]">{errors.description.message}</p>}
                </div>

                {/* Details row — product / environment / priority in one line */}
                <div className="border-t border-[#DFE1E6] pt-5">
                  <p className="text-xs font-semibold text-[#6B778C] uppercase tracking-wide mb-3">Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Product */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-[#172B4D]">
                        Product <span className="text-[#DE350B]">*</span>
                      </label>
                      <select
                        className={clsx(
                          'w-full h-9 px-2 rounded border text-sm text-[#172B4D] bg-[#FAFBFC] outline-none transition-colors',
                          'hover:border-[#B3BAC5] focus:bg-white focus:border-[#4C9AFF] focus:ring-2 focus:ring-[#4C9AFF]/20',
                          errors.product_id ? 'border-red-400' : 'border-[#DFE1E6]',
                        )}
                        {...register('product_id')}
                      >
                        <option value="">{products.length === 0 ? 'Loading…' : 'Select product'}</option>
                        {productOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {errors.product_id && <p className="text-xs text-[#DE350B]">{errors.product_id.message}</p>}
                    </div>

                    {/* Environment */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-[#172B4D]">Environment</label>
                      <select
                        className="w-full h-9 px-2 rounded border border-[#DFE1E6] text-sm text-[#172B4D] bg-[#FAFBFC] outline-none transition-colors hover:border-[#B3BAC5] focus:bg-white focus:border-[#4C9AFF] focus:ring-2 focus:ring-[#4C9AFF]/20"
                        {...register('environment')}
                      >
                        <option value="">None</option>
                        {envOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-[#172B4D]">
                        Priority <span className="text-[#DE350B]">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([...SEVERITIES] as Array<'critical' | 'high' | 'medium' | 'low'>).map((level) => {
                          const cfg = SEV_CONFIG[level];
                          const isActive = severity === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setValue('customer_severity', level, { shouldValidate: true })}
                              className={clsx(
                                'h-9 rounded border text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-100',
                                isActive ? cfg.active : cfg.idle,
                              )}
                            >
                              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', isActive ? cfg.activeDot : cfg.dot)} />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                      {errors.customer_severity && (
                        <p className="text-xs text-[#DE350B]">{errors.customer_severity.message}</p>
                      )}
                    </div>

                  </div>
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-1.5 border-t border-[#DFE1E6] pt-5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#172B4D]">Attachments</label>
                    <span className="text-xs text-[#6B778C]">{pendingFiles.length} / {MAX_FILES}</span>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => pendingFiles.length < MAX_FILES && fileInputRef.current?.click()}
                    className={clsx(
                      'rounded border-2 border-dashed transition-all duration-150',
                      'flex items-center justify-center gap-3 py-5 px-5',
                      isDragging
                        ? 'border-[#4C9AFF] bg-[#DEEBFF] cursor-copy'
                        : pendingFiles.length >= MAX_FILES
                        ? 'border-[#DFE1E6] bg-[#FAFBFC] cursor-not-allowed opacity-50'
                        : 'border-[#DFE1E6] bg-[#FAFBFC] cursor-pointer hover:border-[#4C9AFF] hover:bg-[#EAF2FF]',
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept={Array.from(ALLOWED_EXTENSIONS).join(',')}
                      onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                      disabled={pendingFiles.length >= MAX_FILES}
                    />
                    <svg
                      className={clsx('w-5 h-5 flex-shrink-0', isDragging ? 'text-[#0052CC]' : 'text-[#8993A4]')}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div>
                      <p className={clsx('text-sm', isDragging ? 'text-[#0052CC] font-medium' : 'text-[#42526E]')}>
                        {isDragging
                          ? 'Drop to attach files'
                          : <><span className="text-[#0052CC] font-medium">Browse</span> or drop files here</>
                        }
                      </p>
                      <p className="text-xs text-[#8993A4] mt-0.5">Images, PDF, Office, logs · Max 25 MB each</p>
                    </div>
                  </div>

                  {/* Attached files */}
                  {pendingFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 mt-0.5">
                      {pendingFiles.map((pf) => (
                        <div
                          key={pf.id}
                          className="group flex items-center gap-2.5 rounded border border-[#DFE1E6] bg-[#F4F5F7] px-3 py-2"
                        >
                          {pf.preview
                            ? <img src={pf.preview} alt="" className="w-7 h-7 rounded object-cover border border-[#DFE1E6] flex-shrink-0" />
                            : <span className="text-base w-7 h-7 flex items-center justify-center flex-shrink-0">{fileIcon(pf.file)}</span>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#172B4D] truncate">{pf.file.name}</p>
                            <p className="text-xs text-[#6B778C]">{formatSize(pf.file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(pf.id)}
                            aria-label="Remove"
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[#6B778C] hover:text-[#DE350B] hover:bg-red-50 transition-all flex-shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-[#DFE1E6] bg-[#F4F5F7] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/tickets/mine')}
                  className="h-8 px-4 rounded text-sm font-medium text-[#42526E] bg-white border border-[#DFE1E6] hover:bg-[#EBECF0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-5 rounded text-sm font-medium text-white bg-[#0052CC] hover:bg-[#0065FF] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {isSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};