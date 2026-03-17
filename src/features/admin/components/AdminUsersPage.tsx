import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { X, UserPlus, Loader2, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { MainLayout } from '../../../layouts/MainLayout';
import { Button, PageLoader, Badge } from '../../../components/ui';
import { adminNav } from './adminNav';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { adminAuthService } from '../services/adminAuthService';
import { RoleResponse, AdminUserResponse, CompanyResponse } from '../../../types';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:     'bg-purple-950 text-purple-300 border border-purple-800',
  agent:     'bg-blue-950 text-blue-300 border border-blue-800',
  team_lead: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
  customer:  'bg-slate-100 text-slate-700 border border-slate-300',
};

const PREFERRED_CONTACT_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'In App' },
];

const FILTER_ROLES = ['all', 'admin', 'agent', 'team_lead', 'customer'];

// ─── Create User Modal ────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose:   () => void;
  onCreated: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated }) => {
  const { createUser, creating } = useAdminUsers();

  const [roles,     setRoles]     = useState<RoleResponse[]>([]);
  const [rolesLoad, setRolesLoad] = useState(true);

  const [form, setForm] = useState({
    email:             '',
    full_name:         '',
    role:              '',
    preferred_contact: 'email',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    adminAuthService.listRoles()
      .then(data => {
        setRoles(data);
        if (data.length > 0) setForm(f => ({ ...f, role: data[0].name }));
      })
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setRolesLoad(false));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim())                     e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.role)                             e.role  = 'Please select a role';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await createUser({
        email:             form.email.trim().toLowerCase(),
        full_name:         form.full_name.trim() || undefined,
        role:              form.role,
        preferred_contact: form.preferred_contact,
      });
      toast.success(`User created — welcome email sent to ${form.email}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create user');
    }
  };

  const field = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Add User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => field('email', e.target.value)}
              placeholder="user@example.com"
              className={clsx(
                'w-full px-3 py-2.5 text-sm rounded-lg border bg-white transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300',
              )}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => field('full_name', e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Role <span className="text-red-500">*</span>
            </label>
            {rolesLoad ? (
              <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading roles…
              </div>
            ) : (
              <select
                value={form.role}
                onChange={e => field('role', e.target.value)}
                className={clsx(
                  'w-full px-3 py-2.5 text-sm rounded-lg border bg-white transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  errors.role ? 'border-red-400 bg-red-50' : 'border-slate-300',
                )}
              >
                <option value="" disabled>Select a role…</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            )}
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
          </div>

          {/* Preferred Contact */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Preferred Contact
            </label>
            <div className="flex gap-2">
              {PREFERRED_CONTACT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field('preferred_contact', opt.value)}
                  className={clsx(
                    'flex-1 py-2 text-sm rounded-lg border font-medium transition-all',
                    form.preferred_contact === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info note */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              A temporary password will be generated and emailed directly to the user.
              The admin will not see the password.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-300
                         text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || rolesLoad}
              className={clsx(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
                'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2',
              )}
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Customer Company Group ───────────────────────────────────────────────────

interface CustomerGroupProps {
  companyName:  string;
  customers:    AdminUserResponse[];
  onDeactivate: (id: string, email: string) => void;
}

const CustomerGroup: React.FC<CustomerGroupProps> = ({ companyName, customers, onDeactivate }) => {
  const [open, setOpen] = useState(true);
  const activeCount = customers.filter(u => u.is_active).length;

  return (
    <div className="border-b border-slate-100 last:border-0">

      {/* Collapsible group header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        {open
          ? <ChevronDown  className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        }
        <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-800">{companyName}</span>
        <span className="ml-auto text-xs text-slate-400 tabular-nums">
          {activeCount}/{customers.length} active
        </span>
      </button>

      {/* Individual customer rows, indented under the company header */}
      {open && customers.map(u => (
        <div
          key={u.id}
          className="flex items-center gap-4 px-6 py-3.5 pl-14 border-t border-slate-100 hover:bg-slate-50/40"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-900 truncate">{u.email}</p>
            {u.full_name && (
              <p className="text-xs text-slate-500 truncate">{u.full_name}</p>
            )}
          </div>
          <div className="w-28">
            <span className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize',
              ROLE_STYLES.customer,
            )}>
              customer
            </span>
          </div>
          <div className="w-20">
            <Badge variant={u.is_active ? 'success' : 'default'}>
              {u.is_active ? 'Active' : 'Off'}
            </Badge>
          </div>
          <div className="w-24">
            {u.is_active && (
              <Button size="sm" variant="danger" onClick={() => onDeactivate(u.id, u.email)}>
                Deactivate
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Table column header ──────────────────────────────────────────────────────

const TableHeader: React.FC<{ indent?: boolean }> = ({ indent = false }) => (
  <div className="flex gap-4 px-6 py-3 border-b border-slate-200 bg-blue-50/50">
    <div className={clsx('flex-1 text-xs font-semibold text-blue-600 uppercase tracking-widest', indent && 'pl-8')}>
      Email / Name
    </div>
    <div className="w-28 text-xs font-semibold text-blue-600 uppercase tracking-widest">Role</div>
    <div className="w-20 text-xs font-semibold text-blue-600 uppercase tracking-widest">Status</div>
    <div className="w-24" />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminUsersPage: React.FC = () => {
  const { filtered, users, loading, filter, setFilter, deactivate } = useAdminUsers();
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);

  // Fetch company list once for name resolution
  useEffect(() => {
    adminAuthService.listCompanies()
      .then(setCompanies)
      .catch(() => toast.error('Failed to load companies'));
  }, []);

  const resolveCompanyName = (companyId?: string) => {
    if (!companyId) return 'No Company';
    return companies.find(c => c.id === companyId)?.name ?? 'Unknown Company';
  };

  // Derive staff rows and customer groups from filtered list
  const { staffUsers, customerGroups } = useMemo(() => {
    const staff     = filtered.filter(u => u.role !== 'customer');
    const customers = filtered.filter(u => u.role === 'customer');

    // Group by company_id
    const groupMap: Record<string, AdminUserResponse[]> = {};
    customers.forEach(u => {
      const key = u.company_id ?? '__none__';
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(u);
    });

    // Resolve names and sort alphabetically
    const groups = Object.entries(groupMap)
      .map(([companyId, members]) => ({
        companyId,
        name:    resolveCompanyName(companyId === '__none__' ? undefined : companyId),
        members,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { staffUsers: staff, customerGroups: groups };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, companies]);

  const onDeactivate = async (id: string, email: string) => {
    if (!confirm(`Deactivate ${email}?`)) return;
    try {
      await deactivate(id);
      toast.success('User deactivated');
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const showStaff     = filter === 'all' || filter !== 'customer';
  const showCustomers = filter === 'all' || filter === 'customer';
  const isEmpty       = !loading && staffUsers.length === 0 && customerGroups.length === 0;

  return (
    <MainLayout navItems={adminNav} pageTitle="Users">
      <div className="p-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Users</h2>
            <p className="text-slate-600 text-sm mt-1">
              {users.length} total · {filtered.length} shown
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Role filter tabs */}
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 w-fit">
          {FILTER_ROLES.map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize',
                filter === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading && <PageLoader />}

        {/* ── Staff flat table (admin / agent / team_lead) ── */}
        {!loading && showStaff && staffUsers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <TableHeader />
            {staffUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-blue-100 last:border-0 hover:bg-slate-50/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 truncate">{u.email}</p>
                  {u.full_name && (
                    <p className="text-xs text-slate-600 truncate">{u.full_name}</p>
                  )}
                </div>
                <div className="w-28">
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize',
                    ROLE_STYLES[u.role] ?? ROLE_STYLES.customer,
                  )}>
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="w-20">
                  <Badge variant={u.is_active ? 'success' : 'default'}>
                    {u.is_active ? 'Active' : 'Off'}
                  </Badge>
                </div>
                <div className="w-24">
                  {u.is_active && (
                    <Button size="sm" variant="danger" onClick={() => onDeactivate(u.id, u.email)}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Customers grouped by company ── */}
        {!loading && showCustomers && customerGroups.length > 0 && (
          <div>
            {filter === 'all' && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Customers by Company
              </p>
            )}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <TableHeader indent />
              {customerGroups.map(group => (
                <CustomerGroup
                  key={group.companyId}
                  companyName={group.name}
                  customers={group.members}
                  onDeactivate={onDeactivate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 shadow-sm">
            <p className="text-slate-500 text-sm">No users found</p>
          </div>
        )}
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => {/* list updated optimistically in hook */}}
        />
      )}
    </MainLayout>
  );
};