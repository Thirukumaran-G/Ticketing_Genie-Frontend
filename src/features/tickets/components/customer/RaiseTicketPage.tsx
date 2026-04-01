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
const DRAFT_KEY = 'ticket_draft_v1';
const AUTOSAVE_DEBOUNCE_MS = 600;

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png','.pdf']);

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

// ── Draft helpers ─────────────────────────────────────────────────────────────

interface DraftData {
  form: Partial<Form>;
  savedAt: string;
}

function saveDraft(data: Partial<Form>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: data, savedAt: new Date().toISOString() }));
  } catch { /* storage full — ignore */ }
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftData) : null;
  } catch { return null; }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return '';
  if (mins < 60) return ``;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return ``;
  return ``;
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

// ── ImagePreviewModal ─────────────────────────────────────────────────────────
// NEW: opens when user clicks an image thumbnail in the pending files list

const ImagePreviewModal: React.FC<{ src: string; name: string; onClose: () => void }> = ({ src, name, onClose }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow text-[#172B4D] hover:bg-[#f4f5f7] z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={src}
          alt={name}
          className="max-w-[90vw] max-h-[90vh] rounded shadow-lg object-contain"
        />
        <p className="absolute bottom-0 left-0 right-0 text-center text-xs text-white/70 bg-black/40 py-1 rounded-b truncate px-3">
          {name}
        </p>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export const RaiseTicketPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isSubmitting, products } = useAppSelector((s) => s.tickets);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draftBanner, setDraftBanner] = useState<DraftData | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // NEW: track which image is being previewed
  const [previewFile, setPreviewFile] = useState<PendingFile | null>(null);

  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && Object.keys(draft.form).length > 0) setDraftBanner(draft);
  }, []);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []); // eslint-disable-line

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const severity = watch('customer_severity');
  const allValues = watch();

  // ── Auto-save to localStorage ─────────────────────────────────────────────

  useEffect(() => {
    if (draftBanner) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      const isEmpty = !allValues.title && !allValues.description && !allValues.product_id;
      if (isEmpty) return;

      saveDraft(allValues);
      setLastSavedAt(new Date().toISOString());
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [allValues, draftBanner]);

  // ── Draft restore / discard ───────────────────────────────────────────────

  const handleRestoreDraft = () => {
    if (!draftBanner) return;
    const f = draftBanner.form;
    if (f.title)             setValue('title', f.title);
    if (f.description)       setValue('description', f.description);
    if (f.product_id)        setValue('product_id', f.product_id);
    if (f.customer_severity) setValue('customer_severity', f.customer_severity);
    if (f.environment)       setValue('environment', f.environment);
    setLastSavedAt(draftBanner.savedAt);
    setDraftBanner(null);
    toast.success('Draft restored!');
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftBanner(null);
    toast('Draft discarded', { icon: '🗑️' });
  };

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
      clearDraft();
      toast.success(`Ticket ${result.payload.ticket_number} created`);
      navigate('/tickets/mine');
    } else {
      toast.error((result.payload as string) ?? 'Failed to create ticket');
    }
  };

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  const envOptions = ENVIRONMENTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }));

  // ── Field style helpers ───────────────────────────────────────────────────

  const fieldBase = 'w-full rounded border text-sm text-[#172B4D] placeholder-[#8993A4] bg-[#FAFBFC] outline-none transition-colors focus:bg-white focus:border-[#4C9AFF] focus:ring-2 focus:ring-[#4C9AFF]/20 hover:border-[#B3BAC5]';
  const fieldErr  = 'border-red-400';
  const fieldNorm = 'border-[#DFE1E6]';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout navItems={customerNav} pageTitle="Create issue">
      {/* NEW: image preview modal */}
      {previewFile?.preview && (
        <ImagePreviewModal
          src={previewFile.preview}
          name={previewFile.file.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      <div className="min-h-screen bg-[#F4F5F7]">

        {/* ── Draft Recovery Banner ── */}
        {draftBanner && (
          <div className="mx-1 mt-1 mb-0 rounded border border-[#FFC400] bg-[#FFFAE6] px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-[#FF991F] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm text-[#172B4D]">
                <span className="font-semibold">Unsaved draft found</span>
                <span className="text-[#6B778C] ml-1">· saved {timeAgo(draftBanner.savedAt)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="h-7 px-3 rounded text-xs font-medium text-[#42526E] bg-white border border-[#DFE1E6] hover:bg-[#EBECF0] transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="h-7 px-3 rounded text-xs font-medium text-white bg-[#FF991F] hover:bg-[#FF8B00] transition-colors"
              >
                Restore draft
              </button>
            </div>
          </div>
        )}

        {/* Main */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-1">
            <div className="bg-white rounded border border-[#DFE1E6]">

              {/* Card title + draft saved indicator */}
                  <div className="px-6 flex items-center">

                    {!draftBanner && lastSavedAt && (
                      <div className="ml-auto flex items-center gap-1.5 text-xs text-[#6B778C]">
                        <svg className="w-3 h-3 text-[#36B37E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Draft saved {timeAgo(lastSavedAt)}</span>
                      </div>
                    )}
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
                      <p className="text-xs text-[#8993A4] mt-0.5">Images, PDF, Max 25 MB each</p>
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
                          {/* NEW: image thumbnail is now clickable to open preview */}
                          {pf.preview ? (
                            <img
                              src={pf.preview}
                              alt=""
                              onClick={() => setPreviewFile(pf)}
                              className="w-7 h-7 rounded object-cover border border-[#DFE1E6] flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <span className="text-base w-7 h-7 flex items-center justify-center flex-shrink-0">{fileIcon(pf.file)}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={clsx(
                                'text-sm font-medium text-[#172B4D] truncate',
                                pf.preview && 'cursor-zoom-in hover:text-[#0052CC] transition-colors',
                              )}
                              onClick={() => pf.preview && setPreviewFile(pf)}
                            >
                              {pf.file.name}
                            </p>
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
              <div className="px-6 py-3.5 border-t border-[#DFE1E6] bg-[#F4F5F7] flex items-center justify-between gap-2">
                {lastSavedAt ? (
                  <button
                    type="button"
                    onClick={() => { clearDraft(); setLastSavedAt(null); toast('Draft cleared', { icon: '🗑️' }); }}
                    className="text-xs text-[#6B778C] hover:text-[#DE350B] transition-colors"
                  >
                    Clear draft
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
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
          </div>
        </form>
      </div>
    </MainLayout>
  );
};