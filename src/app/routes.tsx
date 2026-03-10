// src/app/routes.tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store';
import { Spinner } from '../components/ui';
import { ROLES, ROLE_HOME } from '../config/constants';

// ── Auth ──────────────────────────────────────────────────────────────────────
const LoginPage        = lazy(() => import('../features/auth/components/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage     = lazy(() => import('../features/auth/components/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPage       = lazy(() => import('../features/auth/components/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPage        = lazy(() => import('../features/auth/components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// ── Customer ──────────────────────────────────────────────────────────────────
const MyTicketsPage    = lazy(() => import('../features/tickets/components/customer/MyTicketsPage').then(m => ({ default: m.MyTicketsPage })));
const RaiseTicketPage  = lazy(() => import('../features/tickets/components/customer/RaiseTicketPage').then(m => ({ default: m.RaiseTicketPage })));
const TicketDetailPage = lazy(() => import('../features/tickets/components/customer/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));

// ── Agent ─────────────────────────────────────────────────────────────────────
const AgentQueuePage      = lazy(() => import('../features/tickets/components/agent/AgentQueuePage').then(m => ({ default: m.AgentQueuePage })));
const AgentAllTicketsPage = lazy(() => import('../features/tickets/components/agent/AgentAllTicketsPage').then(m => ({ default: m.AgentAllTicketsPage })));
const AgentDetailPage     = lazy(() => import('../features/tickets/components/agent/AgentTicketDetailPage').then(m => ({ default: m.AgentTicketDetailPage })));

// ── Team Lead ─────────────────────────────────────────────────────────────────
const TLQueuePage        = lazy(() => import('../features/tickets/components/teamlead/TLQueuePage').then(m => ({ default: m.TLQueuePage })));
const TLTicketsPage      = lazy(() => import('../features/tickets/components/teamlead/TLTicketsPage').then(m => ({ default: m.TLTicketsPage })));
const TLOverviewPage     = lazy(() => import('../features/tickets/components/teamlead/TLOverviewPage').then(m => ({ default: m.TLOverviewPage })));
const TLTicketDetailPage = lazy(() => import('../features/tickets/components/teamlead/TLTicketDetailPage').then(m => ({ default: m.TLTicketDetailPage })));

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminDashboard     = lazy(() => import('../features/admin/components/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminCompaniesPage = lazy(() => import('../features/admin/components/AdminCompaniesPage').then(m => ({ default: m.AdminCompaniesPage })));
const AdminProductsPage  = lazy(() => import('../features/admin/components/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })));
const AdminUsersPage     = lazy(() => import('../features/admin/components/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminTeamsPage     = lazy(() => import('../features/admin/components/AdminTeamsPage').then(m => ({ default: m.AdminTeamsPage })));
const AdminSLAPage       = lazy(() => import('../features/admin/components/AdminSLAPage').then(m => ({ default: m.AdminSLAPage })));
// const AdminSevMapPage    = lazy(() => import('../features/admin/components/AdminSeverityMapPage').then(m => ({ default: m.AdminSeverityMapPage })));
const AdminKeywordsPage  = lazy(() => import('../features/admin/components/AdminKeywordsPage').then(m => ({ default: m.AdminKeywordsPage })));
const AdminProductCfg    = lazy(() => import('../features/admin/components/AdminProductConfigPage').then(m => ({ default: m.AdminProductConfigPage })));
// const AdminEmailConfig   = lazy(() => import('../features/admin/components/AdminEmailConfigPage').then(m => ({ default: m.AdminEmailConfigPage })));
const AdminReportsPage   = lazy(() => import('../features/admin/components/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));

// ── Guards ────────────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace />;
  return <>{children}</>;
};

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  if (isAuthenticated && user) return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  return <>{children}</>;
};

const Fallback = () => (
  <div className="flex h-screen bg-black items-center justify-center">
    <Spinner size="lg" />
  </div>
);

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Guest */}
        <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"        element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPage /></GuestRoute>} />
        <Route path="/reset-password"  element={<GuestRoute><ResetPage /></GuestRoute>} />

        {/* Customer */}
        <Route path="/tickets/mine"      element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><MyTicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/new"       element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><RaiseTicketPage /></ProtectedRoute>} />
        <Route path="/tickets/:ticketId" element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><TicketDetailPage /></ProtectedRoute>} />

        {/* Agent */}
        <Route path="/tickets/queue"           element={<ProtectedRoute roles={[ROLES.AGENT]}><AgentQueuePage /></ProtectedRoute>} />
        <Route path="/tickets/agent/all"       element={<ProtectedRoute roles={[ROLES.AGENT]}><AgentAllTicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/agent/:ticketId" element={<ProtectedRoute roles={[ROLES.AGENT]}><AgentDetailPage /></ProtectedRoute>} />

        {/* Team Lead */}
        <Route path="/tickets/team"               element={<ProtectedRoute roles={[ROLES.TEAM_LEAD]}><TLQueuePage /></ProtectedRoute>} />
        <Route path="/tickets/team/all"           element={<ProtectedRoute roles={[ROLES.TEAM_LEAD]}><TLTicketsPage /></ProtectedRoute>} />
        <Route path="/tickets/team/overview"      element={<ProtectedRoute roles={[ROLES.TEAM_LEAD]}><TLOverviewPage /></ProtectedRoute>} />
        <Route path="/tickets/teamlead/:ticketId" element={<ProtectedRoute roles={[ROLES.TEAM_LEAD]}><TLTicketDetailPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/dashboard"      element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/companies"      element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminCompaniesPage /></ProtectedRoute>} />
        <Route path="/admin/products"       element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminProductsPage /></ProtectedRoute>} />
        <Route path="/admin/users"          element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/teams"          element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminTeamsPage /></ProtectedRoute>} />
        <Route path="/admin/sla-rules"      element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminSLAPage /></ProtectedRoute>} />
        {/* <Route path="/admin/severity-map"   element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminSevMapPage /></ProtectedRoute>} /> */}
        <Route path="/admin/keyword-rules"  element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminKeywordsPage /></ProtectedRoute>} />
        <Route path="/admin/product-config" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminProductCfg /></ProtectedRoute>} />
        {/* <Route path="/admin/email-config"   element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminEmailConfig /></ProtectedRoute>} /> */}
        <Route path="/admin/reports"        element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminReportsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
