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

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  code: z.string().min(1, 'Required').max(100),
});
type Form = z.infer<typeof schema>;

export const AdminProductsPage: React.FC = () => {
  const [products,   setProducts]   = useState<ProductResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try { setProducts(await adminAuthService.listProducts()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (d: Form) => {
    try {
      setSubmitting(true);
      await adminAuthService.createProduct(d);
      toast.success('Product created');
      reset(); setShowCreate(false); load();
    } catch { toast.error('Failed to create product'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (p: ProductResponse) => {
    if (!confirm(`Permanently delete "${p.name}"?`)) return;
    try {
      setDeletingId(p.id);
      await adminAuthService.deleteProduct(p.id);
      toast.success('Product deleted');
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">

          {/* Header */}
          <div className="grid grid-cols-[1fr_200px_160px] px-6 py-3 bg-blue-600">
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Product</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Code</p>
            <p className="text-xs font-semibold text-white uppercase tracking-widest">Actions</p>
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
                className={`grid grid-cols-[1fr_200px_160px] items-center px-6 py-4 border-b border-slate-100 last:border-0 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {/* Name */}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                </div>

                {/* Code */}
                <p className="text-sm font-mono text-slate-600">{p.code}</p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDelete(p)}
                    disabled={deletingId === p.id}
                    className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-40"
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

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Product">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Product Name" placeholder="e.g. Cloud Platform" error={errors.name?.message} {...register('name')} />
          <Input label="Code" placeholder="e.g. CLOUD_PLT" error={errors.code?.message} {...register('code')} />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); reset(); }}
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
    </MainLayout>
  );
};