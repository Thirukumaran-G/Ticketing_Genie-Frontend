// src/features/admin/services/adminTicketService.ts
// Ticket-service admin routes: /admin/email-config, /admin/sla-rules,
// /admin/severity-priority-map, /admin/keyword-rules, /admin/product-config,
// /admin/reports/*, /admin/teams, /admin/teams/{id}/members
import { ticketClient } from '../../../lib/axios';
import {
  EmailConfigResponse,
  SLARuleResponse,
  SeverityPriorityMapResponse,
  KeywordRuleResponse,
  ProductConfigResponse,
  TeamResponse,
  TeamMemberResponse,
} from '../../../types';

export const adminTicketService = {
  // ── Tiers / Products (proxied from auth-service for dropdowns) ────────────
  listTiers: () =>
    ticketClient.get<{ id: string; name: string }[]>('/admin/tiers').then(r => r.data),
  listProducts: () =>
    ticketClient.get<{ id: string; name: string }[]>('/admin/products').then(r => r.data),

  // ── Email Config ──────────────────────────────────────────────────────────
  listEmailConfig: () =>
    ticketClient.get<EmailConfigResponse[]>('/admin/email-config').then(r => r.data),
  upsertEmailConfig: (payload: { key: string; value: string; is_secret?: boolean }[]) =>
    ticketClient.put<EmailConfigResponse[]>('/admin/email-config', payload).then(r => r.data),

  // ── SLA Rules ─────────────────────────────────────────────────────────────
  listSLARules: () =>
    ticketClient.get<SLARuleResponse[]>('/admin/sla-rules').then(r => r.data),
  upsertSLARule: (payload: {
    tier_id: string; priority: string;
    response_time_min: number; resolution_time_min: number;
  }) =>
    ticketClient.post<SLARuleResponse>('/admin/sla-rules', payload).then(r => r.data),
  deleteSLARule: (ruleId: string) =>
    ticketClient.delete(`/admin/sla-rules/${ruleId}`).then(r => r.data),

  // ── Severity-Priority Map ─────────────────────────────────────────────────
  listSeverityPriorityMap: () =>
    ticketClient.get<SeverityPriorityMapResponse[]>('/admin/severity-priority-map').then(r => r.data),
  upsertSeverityPriorityMap: (payload: { severity: string; tier_id: string; derived_priority: string }) =>
    ticketClient.post<SeverityPriorityMapResponse>('/admin/severity-priority-map', payload).then(r => r.data),
  deleteSeverityPriorityMap: (mapId: string) =>
    ticketClient.delete(`/admin/severity-priority-map/${mapId}`).then(r => r.data),

  // ── Keyword Rules ─────────────────────────────────────────────────────────
  listKeywordRules: () =>
    ticketClient.get<KeywordRuleResponse[]>('/admin/keyword-rules').then(r => r.data),
  createKeywordRule: (payload: { keyword: string; severity: string }) =>
    ticketClient.post<KeywordRuleResponse>('/admin/keyword-rules', payload).then(r => r.data),
  updateKeywordRule: (ruleId: string, payload: { keyword?: string; severity?: string }) =>
    ticketClient.patch<KeywordRuleResponse>(`/admin/keyword-rules/${ruleId}`, payload).then(r => r.data),
  deleteKeywordRule: (ruleId: string) =>
    ticketClient.delete(`/admin/keyword-rules/${ruleId}`).then(r => r.data),

  // ── Product Config ────────────────────────────────────────────────────────
  listProductConfigs: () =>
    ticketClient.get<ProductConfigResponse[]>('/admin/product-config').then(r => r.data),
  upsertProductConfig: (productId: string, payload: { min_severity?: string; default_escalate: boolean }) =>
    ticketClient.put<ProductConfigResponse>(`/admin/product-config/${productId}`, payload).then(r => r.data),
  deleteProductConfig: (productId: string) =>
    ticketClient.delete(`/admin/product-config/${productId}`).then(r => r.data),

  // ── Reports ───────────────────────────────────────────────────────────────
  reportOpenByPriority: () =>
    ticketClient.get<Record<string, number>>('/admin/reports/open-tickets-by-priority').then(r => r.data),
  reportSLABreachesByDay: () =>
    ticketClient.get<Record<string, number>>('/admin/reports/sla-breaches-by-day').then(r => r.data),
  reportFirstResponseTime: () =>
    ticketClient.get<{ avg_minutes: number; median_minutes: number }>('/admin/reports/first-response-time').then(r => r.data),
  reportTicketsByProduct: () =>
    ticketClient.get<Record<string, number>>('/admin/reports/tickets-by-product').then(r => r.data),

  // ── Teams ─────────────────────────────────────────────────────────────────
  listTeams: () =>
    ticketClient.get<TeamResponse[]>('/admin/teams').then(r => r.data),
  createTeam: (payload: { name: string; product_id: string; team_lead_id?: string }) =>
    ticketClient.post<TeamResponse>('/admin/teams', payload).then(r => r.data),
  deactivateTeam: (teamId: string) =>
    ticketClient.delete(`/admin/teams/${teamId}`).then(r => r.data),
  listTeamsByProduct: (productId: string) =>
    ticketClient.get<TeamResponse[]>(`/admin/products/${productId}/teams`).then(r => r.data),

  // ── Team Members ──────────────────────────────────────────────────────────
  addMember: (teamId: string, payload: { user_id: string; experience?: number; skills?: string }) =>
    ticketClient.post<TeamMemberResponse>(`/admin/teams/${teamId}/members`, payload).then(r => r.data),
  removeMember: (teamId: string, memberId: string) =>
    ticketClient.delete(`/admin/teams/${teamId}/members/${memberId}`).then(r => r.data),
};
