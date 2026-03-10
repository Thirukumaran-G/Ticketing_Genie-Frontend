// src/features/admin/components/AdminTeamsPage.tsx
// GET /admin/teams, POST /admin/teams, DELETE /admin/teams/{id}
// POST /admin/teams/{id}/members, DELETE /admin/teams/{id}/members/{memberId}
// GET /admin/users (to pick members), GET /admin/products (ticket-service)
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui/index';
import { adminAuthService } from '../services/adminAuthService';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { TeamResponse, AdminUserResponse } from '../../../types';

const teamSchema = z.object({
  name: z.string().min(2),
  product_id: z.string().min(1, 'Select a product'),
  team_lead_id: z.string().optional(),
});
type TeamForm = z.infer<typeof teamSchema>;

const memberSchema = z.object({
  user_id: z.string().min(1, 'Select agent'),
  experience: z.coerce.number().min(0).optional(),
});
type MemberForm = z.infer<typeof memberSchema>;

export const AdminTeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teamForm = useForm<TeamForm>({ resolver: zodResolver(teamSchema) });
  const memberForm = useForm<MemberForm>({ resolver: zodResolver(memberSchema) });

  const load = () => adminTicketService.listTeams().then(setTeams).finally(() => setLoading(false));

  useEffect(() => {
    load();
    adminTicketService.listProducts().then(setProducts);
    adminAuthService.listUsers().then(setUsers);
  }, []);

  const onCreate = async (d: TeamForm) => {
    try { setSubmitting(true); await adminTicketService.createTeam(d); toast.success('Team created'); teamForm.reset(); setShowCreate(false); load(); }
    catch { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  const onDeactivate = async (t: TeamResponse) => {
    if (!confirm(`Deactivate team "${t.name}"?`)) return;
    try { await adminTicketService.deactivateTeam(t.id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  const onAddMember = async (d: MemberForm) => {
    if (!selectedTeam) return;
    try { setSubmitting(true); await adminTicketService.addMember(selectedTeam.id, d); toast.success('Member added'); memberForm.reset(); setShowAddMember(false); }
    catch { toast.error('Failed'); } finally { setSubmitting(false); }
  };

  const agents = users.filter(u => u.role === 'agent' || u.role === 'team_lead');
  const teamLeads = users.filter(u => u.role === 'team_lead');

  return (
    <MainLayout navItems={adminNav} pageTitle="Teams">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Teams</h2>
            <p className="text-zinc-500 text-sm mt-1">{teams.length} teams</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Team</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Team Name</div>
            <div className="w-36 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Product</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-36" />
          </div>
          {loading ? <PageLoader /> : teams.map(t => {
            const prod = products.find(p => p.id === t.product_id);
            return (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-zinc-600 font-mono">{t.id.slice(0,8)}…</p>
                </div>
                <div className="w-36 text-sm text-zinc-400">{prod?.name ?? t.product_id.slice(0,8)}</div>
                <div className="w-20"><Badge variant={t.is_active ? 'success' : 'default'}>{t.is_active ? 'Active' : 'Off'}</Badge></div>
                <div className="w-36 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedTeam(t); setShowAddMember(true); }}>+ Member</Button>
                  <Button size="sm" variant="danger" onClick={() => onDeactivate(t)}>Disable</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Team">
        <form onSubmit={teamForm.handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Team Name" placeholder="e.g. Alpha Squad" error={teamForm.formState.errors.name?.message} {...teamForm.register('name')} />
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Product</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...teamForm.register('product_id')}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {teamForm.formState.errors.product_id && <p className="text-xs text-red-400 mt-1">{teamForm.formState.errors.product_id.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Team Lead (optional)</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...teamForm.register('team_lead_id')}>
              <option value="">None</option>
              {teamLeads.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title={`Add Member — ${selectedTeam?.name}`}>
        <form onSubmit={memberForm.handleSubmit(onAddMember)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Agent</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...memberForm.register('user_id')}>
              <option value="">Select agent…</option>
              {agents.map(u => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
            </select>
            {memberForm.formState.errors.user_id && <p className="text-xs text-red-400 mt-1">{memberForm.formState.errors.user_id.message}</p>}
          </div>
          <Input label="Experience (years, optional)" type="number" min={0} {...memberForm.register('experience')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Add</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};
