import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Modal, PageLoader } from '../../../components/ui';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { EmailConfigResponse } from '../../../types';

const USER_KEY     = 'IMAP_USER';
const PASSWORD_KEY = 'IMAP_PASSWORD';

export const AdminEmailConfigPage: React.FC = () => {
  const [loading,      setLoading]      = useState(true);
  const [configs,      setConfigs]      = useState<EmailConfigResponse[]>([]);
  const [showEmail,    setShowEmail]    = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail,     setNewEmail]     = useState('');
  const [newPassword,  setNewPassword]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [savingEmail,  setSavingEmail]  = useState(false);
  const [savingPass,   setSavingPass]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await adminTicketService.listEmailConfig();
      setConfigs(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getCfg = (key: string) => configs.find(c => c.key === key);
  const emailCfg    = getCfg(USER_KEY);
  const passwordCfg = getCfg(PASSWORD_KEY);

  const onUpdateEmail = async () => {
    if (!newEmail.trim()) { toast.error('Email is required'); return; }
    try {
      setSavingEmail(true);
      await adminTicketService.upsertEmailConfig([{ key: USER_KEY, value: newEmail.trim() }]);
      toast.success('Email updated');
      setShowEmail(false);
      setNewEmail('');
      load();
    } catch { toast.error('Failed'); }
    finally { setSavingEmail(false); }
  };

  const onUpdatePassword = async () => {
    if (!newPassword.trim()) { toast.error('App password is required'); return; }
    try {
      setSavingPass(true);
      await adminTicketService.upsertEmailConfig([{ key: PASSWORD_KEY, value: newPassword.trim() }]);
      toast.success('Password updated');
      setShowPassword(false);
      setNewPassword('');
      load();
    } catch { toast.error('Failed'); }
    finally { setSavingPass(false); }
  };

  return (
    <MainLayout navItems={adminNav} pageTitle="Email Config">
      <div className="p-6 max-w-lg space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Email Config</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Inbound email credentials for ticket processing
          </p>
        </div>

        {/* Gmail hint */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-sm mt-0.5">ℹ️</span>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p className="font-semibold">Gmail requires an App Password</p>
            <p>
              Go to{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">
                myaccount.google.com → Security → App Passwords
              </span>{' '}
              and generate one for "Mail".
            </p>
          </div>
        </div>

        {loading ? <PageLoader /> : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-4 bg-blue-600">
              <p className="text-sm font-bold text-white">Inbound Email Credentials</p>
              <p className="text-xs text-blue-200 mt-0.5">Used to read incoming support emails</p>
            </div>

            {/* Email row */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Email Address</p>
                {emailCfg?.value ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{emailCfg.value}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                      Inbound
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Not configured</p>
                )}
              </div>
              <button
                onClick={() => { setNewEmail(emailCfg?.value ?? ''); setShowEmail(true); }}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {emailCfg?.value ? 'Update' : 'Set'}
              </button>
            </div>

            {/* Password row */}
            <div className="flex items-center justify-between px-6 py-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">App Password</p>
                {passwordCfg?.value ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 font-mono tracking-widest">
                      ••••••••••••••••
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                      Secret
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ring-1 ring-green-200">
                      Set
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Not configured</p>
                )}
              </div>
              <button
                onClick={() => { setNewPassword(''); setShowPassword(true); }}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                {passwordCfg?.value ? 'Update' : 'Set'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update Email Modal */}
      <Modal
        open={showEmail}
        onClose={() => { setShowEmail(false); setNewEmail(''); }}
        title="Update Email Address"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
              Email Address
            </label>
            <input
              type="email"
              placeholder="support@yourcompany.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowEmail(false); setNewEmail(''); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUpdateEmail}
              disabled={savingEmail}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingEmail ? 'Saving…' : 'Update Email'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Password Modal */}
      <Modal
        open={showPassword}
        onClose={() => { setShowPassword(false); setNewPassword(''); }}
        title="Update App Password"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-sm mt-0.5">🔑</span>
            <p className="text-xs text-amber-700">
              Use an <span className="font-semibold">App Password</span>, not your Gmail account password.
              Generate one at <span className="font-mono bg-amber-100 px-1 rounded">myaccount.google.com → Security → App Passwords</span>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
              App Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="16-character app password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowPassword(false); setNewPassword(''); }}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUpdatePassword}
              disabled={savingPass}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingPass ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};