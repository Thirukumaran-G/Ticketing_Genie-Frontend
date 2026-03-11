import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { ProductResponse } from '../../../types';

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars'),
  code: z.string().min(1, 'Required').max(100),
});
type Form = z.infer<typeof schema>;

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts]     = useState<ProductResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      toast.success('Product created'); reset(); setShowCreate(false); load();
    } catch { toast.error('Failed to create product'); }
    finally { setSubmitting(false); }
  };

  const onToggle = async (p: ProductResponse) => {
    try {
      await adminAuthService.updateProduct(p.id, { is_active: !p.is_active });
      toast.success('Updated'); load();
    } catch { toast.error('Failed'); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Products">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Products</h2>
            <p className="text-zinc-500 text-sm mt-1">{products.length} registered</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Product</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Name</div>
            <div className="w-36 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Code</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-24" />
          </div>
          {loading ? <PageLoader /> : products.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No products yet</p></div>
          ) : products.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="text-xs text-zinc-600 font-mono">{p.id.slice(0,8)}…</p>
              </div>
              <div className="w-36 font-mono text-xs text-zinc-400">{p.code}</div>
              <div className="w-20">
                <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="w-24">
                <Button size="sm" variant={p.is_active ? 'danger' : 'secondary'} onClick={() => onToggle(p)}>
                  {p.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Product">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Product Name" placeholder="e.g. Cloud Platform" error={errors.name?.message} {...register('name')} />
          <Input label="Code" placeholder="e.g. CLOUD_PLT" error={errors.code?.message} {...register('code')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Create</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};