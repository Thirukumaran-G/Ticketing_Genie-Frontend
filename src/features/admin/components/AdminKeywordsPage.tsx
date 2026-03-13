import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Input, Modal, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminAuthService } from '../services/adminAuthService';
import { adminNav } from './adminNav';
import { KeywordRuleResponse, ProductResponse } from '../../../types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

const SEV_STYLE: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'bg-red-100 text-red-700 ring-red-200',          dot: 'bg-red-500'    },
  high:     { badge: 'bg-orange-100 text-orange-700 ring-orange-200', dot: 'bg-orange-400' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700 ring-yellow-200', dot: 'bg-yellow-400' },
  low:      { badge: 'bg-blue-100 text-blue-700 ring-blue-200',       dot: 'bg-blue-400'   },
};

const schema = z.object({
  keyword:    z.string().min(1, 'Required'),
  severity:   z.string().min(1, 'Select severity'),
  product_id: z.string().min(1, 'Select product'),
});
type Form = z.infer<typeof schema>;

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <select
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export const AdminKeywordsPage: React.FC = () => {
  const [rules,      setRules]      = useState<KeywordRuleResponse[]>([]);
  const [products,   setProducts]   = useState<ProductResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<KeywordRuleResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<Form>({ resolver: zodResolver(schema) });

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        adminTicketService.listKeywordRules(),
        adminAuthService.listProducts(),
      ]);
      setRules(r);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); reset(); setShowModal(true); };
  const openEdit   = (r: KeywordRuleResponse) => {
    setEditing(r);
    setValue('keyword',    r.keyword);
    setValue('severity',   r.severity);
    setValue('product_id', (r as any).product_id ?? '');
    setShowModal(true);
  };
  const onClose = () => { setShowModal(false); setEditing(null); reset(); };

  const onSubmit = async (d: Form) => {
    try {
      setSubmitting(true);
      if (editing) {
        await adminTicketService.updateKeywordRule(editing.id, {
          keyword:  d.keyword,
          severity: d.severity,
        });
        toast.success('Updated');
      } else {
        await adminTicketService.createKeywordRule({
          keyword:    d.keyword,
          severity:   d.severity,
          product_id: d.product_id,
        });
        toast.success('Created');
      }
      onClose(); load();
    } catch { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Permanently delete this keyword rule?')) return;
    try {
      setDeletingId(id);
      await adminTicketService.deleteKeywordRule(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  // Group by product_id → severity
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, KeywordRuleResponse[]>> = {};
    rules.forEach(r => {
      const pid = (r as any).product_id;
      if (!pid) return;
      if (!map[pid]) map[pid] = { critical: [], high: [], medium: [], low: [] };
      if (!map[pid][r.severity]) map[pid][r.severity] = [];
      map[pid][r.severity].push(r);
    });
    return map;
  }, [rules]);

  // All product ids that have rules — known products first, then fallback to raw id
  const activeProductIds = useMemo(() => {
    const idsWithRules = Object.keys(grouped);
    const knownIds     = products.filter(p => idsWithRules.includes(p.id)).map(p => p.id);
    const unknownIds   = idsWithRules.filter(id => !knownIds.includes(id));
    return [...knownIds, ...unknownIds];
  }, [grouped, products]);

  const getProduct = (pid: string) => products.find(p => p.id === pid);

  return (
    <MainLayout navItems={adminNav} pageTitle="Keyword Rules">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Keyword Rules</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {rules.length} rules across {activeProductIds.length} products
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Rule
          </button>
        </div>

        {loading ? (
          <PageLoader />
        ) : rules.length === 0 ? (
          <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl">
            <p className="text-slate-400 text-sm">No keyword rules yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeProductIds.map(pid => {
              const product    = getProduct(pid);
              const prodRules  = grouped[pid];
              const totalCount = Object.values(prodRules).flat().length;
              const displayName = product?.name ?? `Product ${pid.slice(0, 8)}…`;
              const displayCode = product?.code ?? pid.slice(0, 8);

              return (
                <div key={pid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

                  {/* Product header */}
                  <div className="flex items-center gap-3 px-6 py-4 bg-blue-600">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white">{displayName}</h3>
                      <p className="text-xs text-blue-200 mt-0.5 font-mono">{displayCode} · {totalCount} rules</p>
                    </div>
                    {/* Severity summary pills */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                      {SEVERITIES.map(sev => {
                        const count = prodRules[sev]?.length ?? 0;
                        const style = SEV_STYLE[sev];
                        return (
                          <div key={sev} className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            <span className="text-xs text-white font-medium capitalize">{sev}</span>
                            <span className="text-xs text-blue-100 font-bold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2x2 severity grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {SEVERITIES.map((sev, idx) => {
                      const style    = SEV_STYLE[sev];
                      const sevRules = prodRules[sev] ?? [];
                      const isLastRow = idx >= 2;
                      const isRight   = idx % 2 === 1;
                      return (
                        <div
                          key={sev}
                          className={`p-5 ${!isLastRow ? 'border-b' : ''} border-slate-100 ${isRight ? 'md:border-l' : ''}`}
                        >
                          {/* Severity label */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ring-1 capitalize ${style.badge}`}>
                              {sev}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto">
                              {sevRules.length} keyword{sevRules.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Keyword chips */}
                          {sevRules.length === 0 ? (
                            <p className="text-xs text-slate-300 italic">No keywords assigned</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {sevRules.map(r => (
                                <div
                                  key={r.id}
                                  className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 group hover:border-slate-300 hover:shadow-sm transition-all"
                                >
                                  <span className="text-xs font-mono text-slate-700">{r.keyword}</span>
                                  <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => openEdit(r)}
                                      className="p-0.5 rounded text-slate-300 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => onDelete(r.id)}
                                      disabled={deletingId === r.id}
                                      className="p-0.5 rounded text-slate-300 hover:text-red-600 transition-colors disabled:opacity-40"
                                      title="Delete"
                                    >
                                      {deletingId === r.id ? (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={onClose}
        title={editing ? 'Edit Keyword Rule' : 'New Keyword Rule'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Keyword"
            placeholder="e.g. outage, crash, urgent"
            error={errors.keyword?.message}
            {...register('keyword')}
          />
          <Sel label="Severity" error={errors.severity?.message} {...register('severity')}>
            <option value="">Select severity…</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Sel>
          {!editing && (
            <Sel label="Product" error={errors.product_id?.message} {...register('product_id')}>
              <option value="">Select product…</option>
              {products.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Sel>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};