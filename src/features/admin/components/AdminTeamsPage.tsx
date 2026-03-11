import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, Input, Modal, PageLoader, Badge } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { TeamResponse, AdminUserResponse } from '../../../types';

const teamSchema = z.object({
  name:         z.string().min(2),
  product_id:   z.string().min(1, 'Select product'),
  team_lead_id: z.string().optional(),
});
type TeamForm = z.infer<typeof teamSchema>;

const memberSchema = z.object({
  user_id:    z.string().min(1, 'Select agent'),
  experience: z.coerce.number().min(0).optional(),
  skill_text: z.string().optional(),
});
type MemberForm = z.infer<typeof memberSchema>;

const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">{label}</label>
    <select className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white" {...props}>
      {children}
    </select>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

export const AdminTeamsPage: React.FC = () => {
  const [teams, setTeams]           = useState<TeamResponse[]>([]);
  const [products, setProducts]     = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers]           = useState<AdminUserResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null);
  const [showMember, setShowMember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teamForm   = useForm<TeamForm>({ resolver: zodResolver(teamSchema) });
  const memberForm = useForm<MemberForm>({ resolver: zodResolver(memberSchema) });

  const load = async () => {
    setLoading(true);
    try { setTeams(await adminTicketService.listTeams()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    adminTicketService.listProducts().then(setProducts);
    adminAuthService.listUsers().then(setUsers);
  }, []);

  const onCreate = async (d: TeamForm) => {
    try {
      setSubmitting(true);
      await adminTicketService.createTeam(d);
      toast.success('Team created');
      teamForm.reset(); setShowCreate(false); load();
    } catch { toast.error('Failed to create team'); }
    finally { setSubmitting(false); }
  };

  const onDeactivate = async (t: TeamResponse) => {
    if (!confirm(`Deactivate team "${t.name}"?`)) return;
    try { await adminTicketService.deactivateTeam(t.id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  const onAddMember = async (d: MemberForm) => {
    if (!selectedTeam) return;
    try {
      setSubmitting(true);
      await adminTicketService.addMember(selectedTeam.id, d);
      toast.success('Member added');
      memberForm.reset(); setShowMember(false);
    } catch { toast.error('Failed to add member'); }
    finally { setSubmitting(false); }
  };

  const agents    = users.filter(u => u.role === 'agent' || u.role === 'team_lead');
  const teamLeads = users.filter(u => u.role === 'team_lead');

  return (
    <MainLayout navItems={adminNav} pageTitle="Teams">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Teams</h2>
            <p className="text-zinc-500 text-sm mt-1">{teams.length} teams</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Team</Button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Team</div>
            <div className="w-40 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Product</div>
            <div className="w-20 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Status</div>
            <div className="w-36" />
          </div>
          {loading ? <PageLoader /> : teams.length === 0 ? (
            <div className="text-center py-16"><p className="text-zinc-500 text-sm">No teams yet</p></div>
          ) : teams.map(t => {
            const prod = products.find(p => p.id === t.product_id);
            return (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900 hover:bg-zinc-900/30">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-zinc-600 font-mono">{t.id.slice(0,8)}…</p>
                </div>
                <div className="w-40 text-sm text-zinc-400">{prod?.name ?? t.product_id.slice(0,8)}</div>
                <div className="w-20">
                  <Badge variant={t.is_active ? 'success' : 'default'}>{t.is_active ? 'Active' : 'Off'}</Badge>
                </div>
                <div className="w-36 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedTeam(t); setShowMember(true); }}>
                    + Member
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDeactivate(t)}>Disable</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); teamForm.reset(); }} title="New Team">
        <form onSubmit={teamForm.handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Team Name" placeholder="e.g. Alpha Squad" error={teamForm.formState.errors.name?.message} {...teamForm.register('name')} />
          <Sel label="Product" error={teamForm.formState.errors.product_id?.message} {...teamForm.register('product_id')}>
            <option value="">Select product…</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Sel>
          <Sel label="Team Lead (optional)" {...teamForm.register('team_lead_id')}>
            <option value="">None</option>
            {teamLeads.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
          </Sel>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showMember} onClose={() => { setShowMember(false); memberForm.reset(); }} title={`Add Member — ${selectedTeam?.name}`}>
        <form onSubmit={memberForm.handleSubmit(onAddMember)} className="space-y-4" noValidate>
          <Sel label="Agent" error={memberForm.formState.errors.user_id?.message} {...memberForm.register('user_id')}>
            <option value="">Select agent…</option>
            {agents.map(u => <option key={u.id} value={u.id}>{u.email} ({u.role})</option>)}
          </Sel>
          <Input label="Experience (years, optional)" type="number" min={0} {...memberForm.register('experience')} />
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-widest">Skill Description (optional)</label>
            <textarea
              rows={3}
              placeholder="e.g. Expert in network security and Linux systems…"
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white resize-none"
              {...memberForm.register('skill_text')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowMember(false)}>Cancel</Button>
            <Button type="submit" full loading={submitting}>Add Member</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
};