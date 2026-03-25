import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Input, Modal, PageLoader } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { ProductResponse } from '../../../types';
import { extractErrorMessage } from '../../../utils/errorUtils';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:        z.string().min(2, 'Min 2 chars'),
  code:        z.string().min(1, 'Required').max(100),
  description: z.string().min(1, 'Description is required').max(1000, 'Max 1000 chars'),
});
type ProductForm = z.infer<typeof productSchema>;

const editProductSchema = z.object({
  name:        z.string().min(2, 'Min 2 chars'),
  description: z.string().min(1, 'Description is required').max(1000, 'Max 1000 chars'),
});
type EditProductForm = z.infer<typeof editProductSchema>;

// ─── Helper components ────────────────────────────────────────────────────────

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }> = ({
  label, error, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <textarea
      rows={3}
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── Shared column definition (header + rows stay in sync) ────────────────────
const COL = 'grid grid-cols-[minmax(140px,1.5fr)_120px_minmax(200px,2fr)_100px] gap-4';

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminProductsPage: React.FC = () => {
  const [products,   setProducts]   = useState<ProductResponse[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editTarget,     setEditTarget]     = useState<ProductResponse | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [viewDesc, setViewDesc] = useState<ProductResponse | null>(null);

  const {
    register: regProduct,
    handleSubmit: handleProduct,
    reset: resetProduct,
    formState: { errors: productErrors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const {
    register: regEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditProductForm>({ resolver: zodResolver(editProductSchema) });

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const p = await adminAuthService.listProducts();
      setProducts(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Product CRUD ──────────────────────────────────────────────────────────

  const onCreate = async (d: ProductForm) => {
    try {
      setSubmitting(true);
      await adminAuthService.createProduct(d);
      toast.success('Product created');
      resetProduct(); setShowCreate(false); load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: ProductResponse) => {
    setEditTarget(p);
    resetEdit({ name: p.name, description: p.description ?? '' });
  };

  const onEdit = async (d: EditProductForm) => {
    if (!editTarget) return;
    try {
      setEditSubmitting(true);
      await adminAuthService.updateProduct(editTarget.id, {
        name:        d.name,
        description: d.description,
      });
      toast.success('Product updated');
      setEditTarget(null); resetEdit(); load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDeleteProduct = async (p: ProductResponse) => {
    if (!confirm(`Permanently delete "${p.name}"?`)) return;
    try {
      setDeletingId(p.id);
      await adminAuthService.deleteProduct(p.id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <MainLayout navItems={adminNav} pageTitle="Products">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Products</h2>
            <p className="text-slate-500 text-sm mt-0.5">{products.length} total</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Product
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

          {/* Header row */}
          <div className={`${COL} items-center px-6 py-3 bg-blue-600`}>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Product</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Code</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Description</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest text-right">Actions</p>
          </div>

          {loading ? (
            <PageLoader />
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">No products yet</p>
            </div>
          ) : (
            products.map((p, idx) => (
              <div
                key={p.id}
                className={`${COL} items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                {/* Name */}
                <p className="text-sm font-semibold text-slate-900 truncate" title={p.name}>
                  {p.name}
                </p>

                {/* Code */}
                <p className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md w-fit truncate max-w-full">
                  {p.code}
                </p>

                {/* Description */}
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-slate-500 truncate min-w-0">
                    {p.description && p.description.length > 0
                      ? p.description.length > 55
                        ? p.description.slice(0, 55) + '…'
                        : p.description
                      : <span className="text-slate-300 italic">No description</span>
                    }
                  </p>
                  {p.description && p.description.length > 55 && (
                    <button
                      onClick={() => setViewDesc(p)}
                      className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    title="Edit product"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 15H9v-3z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => onDeleteProduct(p)}
                    disabled={deletingId === p.id}
                    className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500 transition-all disabled:opacity-40"
                    title="Delete product"
                  >
                    {deletingId === p.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Create Product Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetProduct(); }} title="New Product">
        <form onSubmit={handleProduct(onCreate)} className="space-y-4" noValidate>
          <Input
            label="Product Name *"
            placeholder="e.g. Cloud Platform"
            error={productErrors.name?.message}
            {...regProduct('name')}
          />
          <Input
            label="Code *"
            placeholder="e.g. CLOUD_PLT"
            error={productErrors.code?.message}
            {...regProduct('code')}
          />
          <Textarea
            label="Description *"
            placeholder="Describe this product…"
            error={productErrors.description?.message}
            {...regProduct('description')}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetProduct(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); resetEdit(); }}
        title={`Edit — ${editTarget?.name ?? ''}`}
      >
        <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4" noValidate>
          <Input
            label="Product Name *"
            placeholder="e.g. Cloud Platform"
            error={editErrors.name?.message}
            {...regEdit('name')}
          />
          <Textarea
            label="Description *"
            placeholder="Describe this product…"
            error={editErrors.description?.message}
            {...regEdit('description')}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setEditTarget(null); resetEdit(); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {editSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Full Description Modal ── */}
      <Modal
        open={!!viewDesc}
        onClose={() => setViewDesc(null)}
        title={viewDesc?.name ?? ''}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Code</span>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{viewDesc?.code}</span>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {viewDesc?.description}
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={() => setViewDesc(null)}
              className="w-full border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};