import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { EmailConfigResponse } from '../../../types';

export const AdminEmailConfigPage: React.FC = () => {
  const [configs, setConfigs]   = useState<EmailConfigResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [values, setValues]     = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const c = await adminTicketService.listEmailConfig();
    setConfigs(c);
    const init: Record<string, string> = {};
    c.forEach(cfg => { init[cfg.key] = cfg.is_secret ? '' : (cfg.value ?? ''); });
    setValues(init);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onChange = (key: string, val: string) =>
    setValues(v => ({ ...v, [key]: val }));

  const onSave = async () => {
    const payload = Object.entries(values)
      .filter(([, v]) => v.trim() !== '')
      .map(([key, value]) => ({ key, value }));
    if (payload.length === 0) { toast.error('Nothing to save'); return; }
    try {
      setSaving(true);
      await adminTicketService.upsertEmailConfig(payload);
      toast.success('Email config saved'); load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Email Config">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Email Config</h2>
            <p className="text-zinc-500 text-sm mt-1">IMAP credentials — IMAP_USER and IMAP_PASSWORD only</p>
          </div>
          <Button size="sm" onClick={onSave} loading={saving}>Save All</Button>
        </div>

        {loading ? <PageLoader /> : (
          <div className="space-y-3">
            {configs.length === 0 ? (
              <div className="text-center py-16 bg-zinc-950 border border-zinc-800 rounded-xl">
                <p className="text-zinc-500 text-sm">No email config entries found</p>
                <p className="text-zinc-600 text-xs mt-1">Seeded by the backend on startup</p>
              </div>
            ) : configs.map(cfg => (
              <div key={cfg.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-mono font-bold text-zinc-300">{cfg.key}</p>
                      {cfg.is_secret && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-950 text-yellow-400 border border-yellow-900">
                          SECRET
                        </span>
                      )}
                    </div>
                    <input
                      type={cfg.is_secret ? 'password' : 'text'}
                      placeholder={cfg.is_secret ? 'Enter new value (blank = keep existing)' : ''}
                      value={values[cfg.key] ?? ''}
                      onChange={e => onChange(cfg.key, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};