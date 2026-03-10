// src/features/admin/components/AdminProductConfigPage.tsx
// GET /admin/product-config, PUT /admin/product-config/{product_id}, DELETE /{product_id}
// GET /admin/products (ticket-service proxy) for product name resolution
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Modal, PageLoader, Badge } from '../../../components/ui/index';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { ProductConfigResponse } from '../../../types';
import { SEVERITIES } from '../../../config';

const schema = z.object({
  product_id: z.string().min(1, 'Select product'),
  min_severity: z.string().optional(),
  default_escalate: z.boolean(),
});
type Form = z.infer<typeof schema>;

export const AdminProductConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<ProductConfigResponse[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductConfigResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { default_escalate: false },
  });

  const load = () => Promise.all([
    adminTicketService.listProductConfigs(),
    adminTicketService.listProducts(),
  ]).then(([c, p]) => { setConfigs(c); setProducts(p); }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const productName = (id: string) => products.find(p => p.id === id)?.name ?? id.slice(0, 8) + '…';

  const openCreate = () => { setEditing(null); reset({ default_escalate: false }); setShowModal(true); };
  const openEdit = (c: ProductConfigResponse) => {
    setEditing(c);
    setValue('product_id', c.product_id);
    setValue('min_severity', c.min_severity ?? '');
    setValue('default_escalate', c.default_escalate);
    setShowModal(true);
  };
  const onClose = () => { setShowModal(false); setEditing(null); reset(); };

  const onSubmit = async (d: Form) => {
    try {
      setSubmitting(true);
      await adminTicketService.upsertProductConfig(d.product_id, {
        min_severity: d.min_severity || undefined,
        default_escalate: d.default_escalate,
      });
      toast.success(editing ? 'Updated' : 'Created');
      onClose(); load();
    } catch { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  const onDelete = async (productId: string) => {
    if (!confirm('Deactivate this product config?')) return;
    try { await adminTicketService.deleteProductConfig(productId); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Product Config">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Product Config</h2>
            <p className="text-zinc-500 text-sm mt-1">Min severity and escalation defaults per product</p>
          </div>
          <Button size="sm" onClick={openCreate}>+ New Config</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Product</div>
            <div className="w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Min Severity</div>
            <div className="w-32 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Auto-Escalate</div>
            <div className="w-28" />
          </div>
          {loading ? <PageLoader /> : configs.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No product configs yet</p></div>
          ) : configs.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
              <div className="flex-1 text-sm text-white">{productName(c.product_id)}</div>
              <div className="w-32">
                {c.min_severity
                  ? <Badge variant={({ critical:'critical', high:'high', medium:'medium', low:'low' } as any)[c.min_severity] ?? 'default'}>{c.min_severity}</Badge>
                  : <span className="text-xs text-zinc-600">—</span>}
              </div>
              <div className="w-32">
                <Badge variant={c.default_escalate ? 'warning' : 'default'}>{c.default_escalate ? 'Yes' : 'No'}</Badge>
              </div>
              <div className="w-28 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(c.product_id)}>Off</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={onClose} title={editing ? 'Edit Product Config' : 'New Product Config'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Product</label>
            <select
              disabled={!!editing}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
              {...register('product_id')}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.product_id && <p className="text-xs text-red-400 mt-1">{errors.product_id.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Min Severity (optional)</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...register('min_severity')}>
              <option value="">No minimum</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <input type="checkbox" id="escalate" {...register('default_escalate')}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-white cursor-pointer" />
            <label htmlFor="escalate" className="text-sm text-zinc-300 cursor-pointer">Auto-escalate by default</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" full loading={submitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};
