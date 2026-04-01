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

// Shared breach-day shape — includes both legacy and new split fields
export interface BreachDayRaw {
  day: string;
  breach_count: number;
  response_breach_count: number;
  resolve_breach_count: number;
}

export const adminTicketService = {
  // Tiers / Products (proxied)
  listTiers:    () =>
    ticketClient.get<{ id: string; name: string }[]>('/admin/tiers').then(r => r.data),
  listProducts: () =>
    ticketClient.get<{ id: string; name: string }[]>('/admin/products').then(r => r.data),

  // Email Config
  listEmailConfig:   () =>
    ticketClient.get<EmailConfigResponse[]>('/admin/email-config').then(r => r.data),
  upsertEmailConfig: (payload: { key: string; value: string; is_secret?: boolean }[]) =>
    ticketClient.put<EmailConfigResponse[]>('/admin/email-config', payload).then(r => r.data),
  createEmailConfig: (p: { key: string; value: string; is_secret?: boolean }) =>
    ticketClient.post<EmailConfigResponse>('/admin/email-config', p).then(r => r.data),
  deleteEmailConfig: (key: string) =>
    ticketClient.delete(`/admin/email-config/${key}`),

  // SLA Rules
  listSLARules:  () =>
    ticketClient.get<SLARuleResponse[]>('/admin/sla-rules').then(r => r.data),
  toggleSLARule: (id: string) =>
    ticketClient.patch<SLARuleResponse>(`/admin/sla-rules/${id}/toggle`).then(r => r.data),

  toggleSeverityPriorityMap: (id: string) =>
    ticketClient.patch<SeverityPriorityMapResponse>(`/admin/severity-priority-map/${id}/toggle`).then(r => r.data),

  // Severity-Priority Map
  listSeverityPriorityMap:   () =>
    ticketClient.get<SeverityPriorityMapResponse[]>('/admin/severity-priority-map').then(r => r.data),

  updateSLARule: (id: string, p: { response_time_min: number; resolution_time_min: number }) =>
    ticketClient.patch<SLARuleResponse>(`/admin/sla-rules/${id}`, p).then(r => r.data),

  updateSeverityPriorityMap: (id: string, p: { derived_priority: string }) =>
    ticketClient.patch<SeverityPriorityMapResponse>(`/admin/severity-priority-map/${id}`, p).then(r => r.data),
  

  // Keyword Rules
  listKeywordRules:  () =>
    ticketClient.get<KeywordRuleResponse[]>('/admin/keyword-rules').then(r => r.data),
  createKeywordRule: (p: { keyword: string; severity: string; product_id: string }) =>
    ticketClient.post<KeywordRuleResponse>('/admin/keyword-rules', p).then(r => r.data),
  updateKeywordRule: (id: string, p: { keyword?: string; severity?: string; is_active?: boolean }) =>
    ticketClient.patch<KeywordRuleResponse>(`/admin/keyword-rules/${id}`, p).then(r => r.data),
  deleteKeywordRule: (id: string) =>
    ticketClient.delete(`/admin/keyword-rules/${id}`),

  // Product Config
  listProductConfigs:  () =>
    ticketClient.get<ProductConfigResponse[]>('/admin/product-config').then(r => r.data),
  upsertProductConfig: (productId: string, p: { min_severity?: string; default_escalate: boolean }) =>
    ticketClient.put<ProductConfigResponse>(`/admin/product-config/${productId}`, p).then(r => r.data),
  deleteProductConfig: (productId: string) =>
    ticketClient.delete(`/admin/product-config/${productId}`),

  // Reports
  reportOpenByPriority:    () =>
    ticketClient.get<{ open_tickets_by_priority: { priority: string; count: number }[] }>('/admin/reports/open-tickets-by-priority').then(r => r.data),

  // ← Updated: now returns split response + resolve breach counts
  reportSLABreachesByDay:  () =>
    ticketClient.get<{ sla_breaches_by_day: BreachDayRaw[] }>('/admin/reports/sla-breaches-by-day').then(r => r.data),

  reportFirstResponseTime: () =>
    ticketClient.get<{ average_first_response_time_min: number; median_first_response_time_min: number }>('/admin/reports/first-response-time').then(r => r.data),
  reportTicketsByProduct:  () =>
    ticketClient.get<{ tickets_by_product: { product_id: string; product_name: string; total: number; resolved: number; avg_resolution_time_min: number }[] }>('/admin/reports/tickets-by-product').then(r => r.data),
  reportResolvedByDay: () =>
    ticketClient.get<{ resolved_by_day: { day: string; count: number }[] }>('/admin/reports/resolved-by-day').then(r => r.data),
  reportDashboardSummary: () =>
    ticketClient.get<{
      open_ticket_count:      number;
      total_sla_breaches:     number;
      avg_first_response_min: number;
      tickets_resolved_today: number;
    }>('/admin/reports/dashboard-summary').then(r => r.data),
  reportTicketsBySeverity:   () => ticketClient.get<any>('/admin/reports/tickets-by-severity').then(r => r.data),
  reportTicketsByStatus:     () => ticketClient.get<any>('/admin/reports/tickets-by-status').then(r => r.data),
  reportAvgResolutionTime:   () => ticketClient.get<any>('/admin/reports/avg-resolution-time').then(r => r.data),
  reportSLABreachBySeverity: () => ticketClient.get<any>('/admin/reports/sla-breach-by-severity').then(r => r.data),
  reportTicketsByDay:        () => ticketClient.get<any>('/admin/reports/tickets-by-day').then(r => r.data),
  reportTopCompanies:        () => ticketClient.get<any>('/admin/reports/top-companies').then(r => r.data),

  // Teams
  listTeams:          () =>
    ticketClient.get<TeamResponse[]>('/admin/teams').then(r => r.data),
  createTeam:         (p: { name: string; product_id: string; team_lead_id?: string }) =>
    ticketClient.post<TeamResponse>('/admin/teams', p).then(r => r.data),
  deactivateTeam:     (id: string) =>
    ticketClient.delete(`/admin/teams/${id}`),
  listTeamsByProduct: (productId: string) =>
    ticketClient.get<TeamResponse[]>(`/admin/products/${productId}/teams`).then(r => r.data),
  removeTeamLead: (teamId: string) =>
    ticketClient.patch<TeamResponse>(`/admin/teams/${teamId}/remove-lead`).then(r => r.data),

  // Team Members
  addMember: (teamId: string, p: { user_id: string; experience?: number; skill_text?: string }) =>
    ticketClient.post<TeamMemberResponse>(`/admin/teams/${teamId}/members`, {
      user_id:    p.user_id,
      experience: p.experience,
      skill_text: p.skill_text,
      skills:     { skill_text: p.skill_text ?? '' },
    }).then(r => r.data),
  removeMember: (teamId: string, memberId: string) =>
    ticketClient.delete(`/admin/teams/${teamId}/members/${memberId}`),
  listTeamMembers: (teamId: string) =>
    ticketClient.get<any[]>(`/admin/teams/${teamId}/members`).then(r => r.data),
};