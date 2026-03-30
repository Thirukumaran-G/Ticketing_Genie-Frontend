import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MainLayout } from '../../../layouts/MainLayout';
import { Input, Modal, PageLoader } from '../../../components/ui';
import { adminAuthService } from '../services/adminAuthService';
import { adminTicketService } from '../services/adminTicketService';
import { adminNav } from './adminNav';
import { TeamResponse, AdminUserResponse, ProductResponse } from '../../../types';

// ─── Team schema ──────────────────────────────────────────────────────────────
const teamSchema = z.object({
  name:         z.string().min(2, 'Min 2 characters'),
  product_id:   z.string().min(1, 'Select product'),
  team_lead_id: z.string().optional(),
});
type TeamForm = z.infer<typeof teamSchema>;

// ─── Per-member detail (step 2) ───────────────────────────────────────────────
interface MemberDetail {
  user_id:    string;
  experience: number | '';
  skill_text: string;
  expErr:     string;
  skillErr:   string;
}

// ─── Sel component ────────────────────────────────────────────────────────────
const Sel: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }> = ({
  label, error, children, ...props
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
    <select
      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      {...props}
    >{children}</select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ─── SkillCell — inline expand/collapse ───────────────────────────────────────
const SKILL_PREVIEW_LEN = 60;

const SkillCell: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > SKILL_PREVIEW_LEN;

  return (
    <p className="text-xs text-slate-500 leading-snug">
      {isLong && !expanded
        ? <>{text.slice(0, SKILL_PREVIEW_LEN)}…</>
        : text
      }
      {isLong && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="ml-1 text-blue-500 hover:text-blue-700 font-semibold transition-colors"
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </p>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AdminTeamsPage: React.FC = () => {
  const [teams,            setTeams]            = useState<TeamResponse[]>([]);
  const [products,         setProducts]         = useState<ProductResponse[]>([]);
  const [users,            setUsers]            = useState<AdminUserResponse[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showCreate,       setShowCreate]       = useState(false);
  const [showMember,       setShowMember]       = useState(false);
  const [selectedTeam,     setSelectedTeam]     = useState<TeamResponse | null>(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [expandedTeams,    setExpandedTeams]    = useState<Set<string>>(new Set());

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step,           setStep]           = useState<1 | 2>(1);
  const [selectedLead,   setSelectedLead]   = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectionErr,   setSelectionErr]   = useState('');
  const [memberDetails,  setMemberDetails]  = useState<MemberDetail[]>([]);

  const teamForm = useForm<TeamForm>({ resolver: zodResolver(teamSchema) });

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, u] = await Promise.all([
        adminTicketService.listTeams(),
        adminAuthService.listProducts(),
        adminAuthService.listUsers(),
      ]);
      setTeams(t); setProducts(p); setUsers(u);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, TeamResponse[]> = {};
    teams.forEach(t => {
      const pid = t.product_id ?? 'unassigned';
      if (!map[pid]) map[pid] = [];
      map[pid].push(t);
    });
    return map;
  }, [teams]);

  const activeProductIds = useMemo(() => {
    const idsWithTeams = Object.keys(grouped);
    const known   = products.filter(p => idsWithTeams.includes(p.id)).map(p => p.id);
    const unknown = idsWithTeams.filter(id => !known.includes(id));
    return [...known, ...unknown];
  }, [grouped, products]);

  const getProduct  = (pid: string) => products.find(p => p.id === pid);
  const getUserName = (uid: string) => {
    const u = users.find(u => u.id === uid);
    return u ? (u.full_name ?? u.email) : uid.slice(0, 8) + '…';
  };
  const getUser = (uid: string) => users.find(u => u.id === uid);

  const teamLeads     = users.filter(u => u.role === 'team_lead');
  const agents        = users.filter(u => u.role === 'agent');
  const totalSelected = (selectedLead ? 1 : 0) + selectedAgents.length;

  // ─── Handlers ────────────────────────────────────────────────────────────
  const openCreate    = () => { teamForm.reset(); setShowCreate(true); };
  const closeCreate   = () => { setShowCreate(false); teamForm.reset(); };

  const openAddMember = (team: TeamResponse) => {
    setSelectedTeam(team);
    setStep(1);
    setSelectedLead('');
    setSelectedAgents([]);
    setSelectionErr('');
    setMemberDetails([]);
    setShowMember(true);
  };

  const closeMember = () => {
    setShowMember(false);
    setSelectedTeam(null);
    setStep(1);
    setSelectedLead('');
    setSelectedAgents([]);
    setMemberDetails([]);
  };

  const toggleAgent = (uid: string) =>
    setSelectedAgents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );

  const goToStep2 = () => {
    const allIds = [...(selectedLead ? [selectedLead] : []), ...selectedAgents];
    if (allIds.length === 0) { setSelectionErr('Select at least one team lead or agent.'); return; }
    setSelectionErr('');
    setMemberDetails(allIds.map(uid => {
      const existing = memberDetails.find(m => m.user_id === uid);
      return existing ?? { user_id: uid, experience: '', skill_text: '', expErr: '', skillErr: '' };
    }));
    setStep(2);
  };

  const updateDetail = (uid: string, field: 'experience' | 'skill_text', value: string) => {
    setMemberDetails(prev => prev.map(m =>
      m.user_id !== uid ? m : {
        ...m,
        [field]:  field === 'experience' ? (value === '' ? '' : Number(value)) : value,
        expErr:   field === 'experience' ? '' : m.expErr,
        skillErr: field === 'skill_text' ? '' : m.skillErr,
      }
    ));
  };

  const onSubmitMembers = async () => {
    let hasErr = false;
    const validated = memberDetails.map(m => {
      const expErr   = m.experience === '' || Number(m.experience) < 0 ? 'Required' : '';
      const skillErr = m.skill_text.trim().length < 3 ? 'Required (min 3 chars)' : '';
      if (expErr || skillErr) hasErr = true;
      return { ...m, expErr, skillErr };
    });
    setMemberDetails(validated);
    if (hasErr || !selectedTeam) return;

    try {
      setSubmitting(true);
      await Promise.all(
        validated.map(m =>
          adminTicketService.addMember(selectedTeam.id, {
            user_id:    m.user_id,
            experience: Number(m.experience),
            skill_text: m.skill_text.trim(),
          })
        )
      );
      toast.success(`${validated.length} member${validated.length > 1 ? 's' : ''} added`);
      closeMember();
      load();
    } catch { toast.error('Failed to add member(s)'); }
    finally { setSubmitting(false); }
  };

  const onCreate = async (d: TeamForm) => {
    try {
      setSubmitting(true);
      await adminTicketService.createTeam(d);
      toast.success('Team created');
      closeCreate(); load();
    } catch { toast.error('Failed to create team'); }
    finally { setSubmitting(false); }
  };

  const onDeleteTeam = async (t: TeamResponse) => {
    if (!confirm(`Permanently delete team "${t.name}"?`)) return;
    try {
      setDeletingId(t.id);
      await adminTicketService.deactivateTeam(t.id);
      toast.success('Team deleted');
      load();
    } catch { toast.error('Failed'); }
    finally { setDeletingId(null); }
  };

  const onDeleteMember = async (teamId: string, memberId: string, memberName: string) => {
    if (!confirm(`Permanently remove "${memberName}" from this team?`)) return;
    try {
      setDeletingMemberId(memberId);
      await adminTicketService.removeMember(teamId, memberId);
      toast.success('Member removed');
      load();
    } catch { toast.error('Failed to remove member'); }
    finally { setDeletingMemberId(null); }
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout navItems={adminNav} pageTitle="Teams">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Teams</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {teams.length} teams across {activeProductIds.length} products
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Team
          </button>
        </div>

        {loading ? <PageLoader /> : teams.length === 0 ? (
          <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl">
            <p className="text-slate-400 text-sm">No teams yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeProductIds.map(pid => {
              const product      = getProduct(pid);
              const productTeams = grouped[pid] ?? [];
              const displayName  = product?.name ?? `Product ${pid.slice(0, 8)}…`;
              const displayCode  = product?.code ?? pid.slice(0, 8);

              return (
                <div key={pid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center gap-3 px-6 py-4 bg-blue-600">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white">{displayName}</h3>
                      <p className="text-xs text-blue-200 mt-0.5 font-mono">
                        {displayCode} · {productTeams.length} team{productTeams.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {productTeams.map(team => {
                      const isExpanded = expandedTeams.has(team.id);
                      const members    = (team as any).members ?? [];
                      const lead       = team.team_lead_id ? getUserName(team.team_lead_id) : null;

                      return (
                        <div key={team.id}>
                          <div className="flex items-center gap-4 px-6 py-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">{team.name}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                                  team.is_active ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-slate-100 text-slate-500 ring-slate-200'
                                }`}>{team.is_active ? 'Active' : 'Inactive'}</span>
                              </div>
                              {lead && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <span>{lead}</span>
                                </p>
                              )}
                            </div>

                            <button onClick={() => toggleExpand(team.id)}
                              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {members.length} member{members.length !== 1 ? 's' : ''}
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            <button onClick={() => openAddMember(team)}
                              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Member
                            </button>

                            <button onClick={() => onDeleteTeam(team)} disabled={deletingId === team.id}
                              className="p-1.5 rounded-lg text-red-500 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-40" title="Delete team">
                              {deletingId === team.id ? (
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

                          {isExpanded && (
                            <div className="px-6 pb-4 bg-slate-50/60 border-t border-slate-100">
                              {members.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-3">No members yet — add one above</p>
                              ) : (
                                <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {members.map((m: any) => {
                                    const user      = users.find(u => u.id === m.user_id);
                                    const name      = user?.full_name ?? user?.email ?? m.user_id.slice(0, 8);
                                    const isLead    = m.user_id === team.team_lead_id;
                                    const skillText = m.skills?.skill_text ?? m.skill_text ?? '';

                                    return (
                                      <div key={m.id ?? m.user_id}
                                        className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3">

                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                          isLead ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                        }`}>{name.charAt(0).toUpperCase()}</div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                                            {isLead && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 flex-shrink-0">Lead</span>}
                                            {user?.role && !isLead && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200 flex-shrink-0 capitalize">{user.role}</span>}
                                          </div>
                                          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>

                                          {/* Experience + Skill — skill fully readable via SkillCell */}
                                          {(m.experience != null || skillText) && (
                                            <div className="mt-1 space-y-0">
                                              {m.experience != null && (
                                                <p className="text-xs text-slate-500 font-medium">
                                                  {m.experience} yr{m.experience !== 1 ? 's' : ''} exp
                                                </p>
                                              )}
                                              {skillText && <SkillCell text={skillText} />}
                                            </div>
                                          )}
                                        </div>

                                        {/* Delete */}
                                        <button onClick={() => onDeleteMember(team.id, m.id, name)}
                                          disabled={deletingMemberId === m.id}
                                          className="p-1 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all disabled:opacity-40 flex-shrink-0" title="Remove member">
                                          {deletingMemberId === m.id ? (
                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                            </svg>
                                          ) : (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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

      {/* ── Create Team Modal ── */}
      <Modal open={showCreate} onClose={closeCreate} title="New Team">
        <form onSubmit={teamForm.handleSubmit(onCreate)} className="space-y-4" noValidate>
          <Input label="Team Name" placeholder="e.g. Alpha Squad"
            error={teamForm.formState.errors.name?.message} {...teamForm.register('name')} />
          <Sel label="Product" error={teamForm.formState.errors.product_id?.message} {...teamForm.register('product_id')}>
            <option value="">Select product…</option>
            {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Sel>
          <Sel label="Team Lead (optional)" {...teamForm.register('team_lead_id')}>
            <option value="">None</option>
            {teamLeads.map(u => <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>)}
          </Sel>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeCreate}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add Member Modal (2-step wizard) ── */}
      <Modal
        open={showMember}
        onClose={closeMember}
        title={`Add Member — ${selectedTeam?.name ?? ''}`}
        maxW={step === 2 ? 'max-w-3xl' : 'max-w-2xl'}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[{ n: 1, label: 'Select People' }, { n: 2, label: 'Fill Details' }].map(({ n, label }, i) => {
            const active = step === n;
            const done   = step > n;
            return (
              <React.Fragment key={n}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>{done ? '✓' : n}</div>
                  <span className={`text-xs font-semibold ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i === 0 && <div className="flex-1 h-px bg-slate-200" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: Select people ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Team Lead <span className="normal-case font-normal text-slate-400">(pick one)</span>
              </p>
              <div className="space-y-2">
                {teamLeads.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No team leads available</p>
                ) : teamLeads.map(u => {
                  const sel        = selectedLead === u.id;
                  const isAssigned = selectedTeam?.team_lead_id === u.id;
                  return (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isAssigned
                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                        : sel
                        ? 'border-amber-400 bg-amber-50 cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                    }`}>
                      <input type="radio" checked={sel} disabled={isAssigned} onChange={() => setSelectedLead(sel ? '' : u.id)} className="accent-amber-500 flex-shrink-0" />
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-slate-900">{u.full_name ?? u.email}</p>
                        <p className="text-xs text-slate-400 break-all">{u.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 flex-shrink-0">Lead</span>
                      {isAssigned && (
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">Already assigned</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">and / or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Agents <span className="normal-case font-normal text-slate-400">(select multiple)</span>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {agents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No agents available</p>
                ) : agents.map(u => {
                  const checked    = selectedAgents.includes(u.id);
                  const isAssigned = ((selectedTeam as any)?.members ?? []).some((m: any) => m.user_id === u.id);
                  return (
                    <label key={u.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isAssigned
                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                        : checked
                        ? 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                    }`}>
                      <input type="checkbox" checked={checked} disabled={isAssigned} onChange={() => toggleAgent(u.id)} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(u.full_name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-slate-900">{u.full_name ?? u.email}</p>
                        <p className="text-xs text-slate-400 break-all">{u.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200 flex-shrink-0">Agent</span>
                      {isAssigned && (
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">Already in team</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {selectionErr && <p className="text-xs text-red-500">{selectionErr}</p>}

            <div className="flex items-center justify-between pt-1">
              {totalSelected > 0
                ? <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">{totalSelected}</span> person{totalSelected > 1 ? 's' : ''} selected</p>
                : <span />
              }
              <div className="flex gap-3">
                <button type="button" onClick={closeMember}
                  className="border border-slate-200 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="button" onClick={goToStep2}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                  Next — Fill Details
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Individual experience + skill per person ── */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              Enter experience and skill details for each selected member individually.
            </p>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {memberDetails.map((m, idx) => {
                const u      = getUser(m.user_id);
                const name   = u?.full_name ?? u?.email ?? m.user_id.slice(0, 8);
                const isLead = u?.role === 'team_lead';

                return (
                  <div key={m.user_id} className={`rounded-2xl border p-4 space-y-3 ${
                    isLead ? 'border-amber-200 bg-amber-50/40' : 'border-blue-100 bg-blue-50/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isLead ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>{name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 flex-shrink-0 ${
                            isLead ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-blue-100 text-blue-700 ring-blue-200'
                          }`}>{isLead ? 'Lead' : 'Agent'}</span>
                        </div>
                        <p className="text-xs text-slate-400">{u?.email}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex-shrink-0">{idx + 1} / {memberDetails.length}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
                          Experience (years) *
                        </label>
                        <input
                          type="number" min={0} placeholder="e.g. 3"
                          value={m.experience}
                          onChange={e => updateDetail(m.user_id, 'experience', e.target.value)}
                          className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            m.expErr ? 'border-red-400' : 'border-slate-200'
                          }`}
                        />
                        {m.expErr && <p className="text-xs text-red-500 mt-1">{m.expErr}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
                          Skill Description *
                        </label>
                        <textarea
                          rows={3} placeholder="e.g. Expert in network security…"
                          value={m.skill_text}
                          onChange={e => updateDetail(m.user_id, 'skill_text', e.target.value)}
                          className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                            m.skillErr ? 'border-red-400' : 'border-slate-200'
                          }`}
                        />
                        {m.skillErr && <p className="text-xs text-red-500 mt-1">{m.skillErr}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={closeMember}
                  className="border border-slate-200 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="button" onClick={onSubmitMembers} disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {submitting ? 'Adding…' : `Add ${memberDetails.length} Member${memberDetails.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};