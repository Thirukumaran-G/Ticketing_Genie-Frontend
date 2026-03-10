// // src/features/admin/components/AdminEmailConfigPage.tsx
// // GET /admin/email-config, PUT /admin/email-config (bulk upsert)
// import React, { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import toast from 'react-hot-toast';
// import { MainLayout } from '../../../layouts/MainLayout';
// import { Button, Input, PageLoader } from '../../../components/ui/index';
// import { adminTicketService } from '../services/adminTicketService';
// import { adminNav } from './adminNav';
// import { EmailConfigResponse } from '../../../types';

// export const AdminEmailConfigPage: React.FC = () => {
//   const [configs, setConfigs] = useState<EmailConfigResponse[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [values, setValues] = useState<Record<string, string>>({});

//   const load = () => adminTicketService.listEmailConfig().then(c => {
//     setConfigs(c);
//     const init: Record<string, string> = {};
//     c.forEach(cfg => { init[cfg.key] = cfg.is_secret ? '' : cfg.value; });
//     setValues(init);
//   }).finally(() => setLoading(false));

//   useEffect(() => { load(); }, []);

//   const onChange = (key: string, val: string) => setValues(v => ({ ...v, [key]: val }));

//   const onSave = async () => {
//     const payload = Object.entries(values)
//       .filter(([, v]) => (v as string).trim() !== '')
//       .map(([key, value]) => ({ key, value: value as string }));
//     if (payload.length === 0) { toast.error('Nothing to save'); return; }
//     try {
//       setSaving(true);
//       await adminTicketService.upsertEmailConfig(payload);
//       toast.success('Email config saved');
//       load();
//     } catch { toast.error('Failed to save'); } finally { setSaving(false); }
//   };

//   return (
//     <MainLayout navItems={adminNav} pageTitle="Email Config">
//       <div className="p-6">
//         <div className="flex items-center justify-between mb-6">
//           <div>
//             <h2 className="text-2xl font-bold text-white">Email Config</h2>
//             <p className="text-zinc-500 text-sm mt-1">IMAP credentials and email routing settings</p>
//           </div>
//           <Button size="sm" onClick={onSave} loading={saving}>Save All</Button>
//         </div>

//         {loading ? <PageLoader /> : (
//           <div className="space-y-3">
//             {configs.map(cfg => (
//               <div key={cfg.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
//                 <div className="flex items-start justify-between gap-4">
//                   <div className="flex-1">
//                     <p className="text-xs font-mono font-bold text-zinc-300 mb-1">{cfg.key}</p>
//                     {cfg.is_secret ? (
//                       <input
//                         type="password"
//                         placeholder="Enter new value (leave blank to keep existing)"
//                         value={values[cfg.key] ?? ''}
//                         onChange={e => onChange(cfg.key, e.target.value)}
//                         className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white font-mono"
//                       />
//                     ) : (
//                       <input
//                         type="text"
//                         value={values[cfg.key] ?? ''}
//                         onChange={e => onChange(cfg.key, e.target.value)}
//                         className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white font-mono"
//                       />
//                     )}
//                   </div>
//                   {cfg.is_secret && (
//                     <span className="mt-6 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-950 text-yellow-400">SECRET</span>
//                   )}
//                 </div>
//                 {cfg.updated_at && (
//                   <p className="text-xs text-zinc-600 mt-2">Last updated: {new Date(cfg.updated_at).toLocaleString()}</p>
//                 )}
//               </div>
//             ))}
//             {configs.length === 0 && (
//               <div className="text-center py-16 bg-zinc-950 border border-zinc-800 rounded-xl">
//                 <p className="text-zinc-500 text-sm">No email config entries found</p>
//                 <p className="text-zinc-600 text-xs mt-1">Config is seeded by the backend on startup</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </MainLayout>
//   );
// };
