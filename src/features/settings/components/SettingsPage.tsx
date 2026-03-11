// src/features/settings/components/SettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input } from '../../../components/ui/index';
import { authService } from '../../auth/services/authService';
import { notificationService } from '../services/notificationService';
import { NavItem } from '../../../layouts/MainLayout';

const pwSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
type PwForm = z.infer<typeof pwSchema>;

interface SettingsPageProps {
  navItems: NavItem[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ navItems }) => {
  const [pwLoading, setPwLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [preferred, setPreferred] = useState<'email' | 'in_app'>('email');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  useEffect(() => {
    setPrefLoading(true);
    notificationService.getPreference()
      .then((res) => setPreferred(res.preferred_contact))
      .catch(() => toast.error('Failed to load notification preference'))
      .finally(() => setPrefLoading(false));
  }, []);

  const onChangePassword = async (data: PwForm) => {
    try {
      setPwLoading(true);
      await authService.changePassword(data.current_password, data.new_password);
      toast.success('Password changed successfully');
      reset();
    } catch {
      toast.error('Current password is incorrect or request failed');
    } finally {
      setPwLoading(false);
    }
  };

  const onSavePreference = async () => {
    try {
      setPrefSaving(true);
      const res = await notificationService.setPreference(preferred);
      setPreferred(res.preferred_contact);
      toast.success('Notification preference saved');
    } catch {
      toast.error('Failed to save preference');
    } finally {
      setPrefSaving(false);
    }
  };

  return (
    <MainLayout navItems={navItems} pageTitle="Settings">
      <div className="w-full p-6 flex flex-col gap-6 max-w-2xl">

        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-zinc-500 text-sm mt-0.5">Manage your account preferences</p>
        </div>

        {/* Change Password */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Change Password</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Use a strong password with at least 8 characters</p>
          </div>

          <form onSubmit={handleSubmit(onChangePassword)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              autoComplete="current-password"
              error={errors.current_password?.message}
              {...register('current_password')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={errors.new_password?.message}
                {...register('new_password')}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={errors.confirm?.message}
                {...register('confirm')}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="lg" loading={pwLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>

        {/* Notification Preference */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Notification Preference</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Choose how you want to receive notifications</p>
          </div>

          {prefLoading ? (
            <div className="h-10 flex items-center">
              <span className="text-zinc-500 text-sm">Loading…</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {(['email', 'in_app'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPreferred(option)}
                    className={[
                      'p-4 rounded-xl border text-left transition-all duration-150',
                      preferred === option
                        ? 'border-white/30 bg-white/5 ring-1 ring-white/20'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={[
                        'w-2 h-2 rounded-full flex-shrink-0',
                        preferred === option ? 'bg-white' : 'bg-zinc-600',
                      ].join(' ')} />
                      <span className="text-white font-semibold text-xs uppercase tracking-wider">
                        {option === 'in_app' ? 'In-App' : 'Email'}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-snug">
                      {option === 'email'
                        ? 'Receive notifications via email'
                        : 'Receive notifications inside the app'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button type="button" size="lg" loading={prefSaving} onClick={onSavePreference}>
                  Save Preference
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
};  