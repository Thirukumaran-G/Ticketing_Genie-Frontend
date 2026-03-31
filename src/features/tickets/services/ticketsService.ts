import { ticketClient, authClient } from '../../../lib/axios';
import { ENV } from '../../../config/env';
import {
  TicketCreateResponse,
  CustomerTicketListItem,
  CustomerTicketDetail,
  TicketQueueItem,
  TLTicketDetail,
  TeamOverviewResponse,
  TicketThreadResponse,
  ConversationItem,
  AttachmentItem,
} from '../../../types';

export const ticketsService = {

  // Customer routes 

  createTicket: (payload: {
    title:             string;
    description:       string;
    product_id:        string;
    customer_severity: string;
    environment?:      string;
    source?:           string;
    files?:            File[];
  }) => {
    const form = new FormData();
    form.append('title',             payload.title);
    form.append('description',       payload.description);
    form.append('product_id',        payload.product_id);
    form.append('customer_severity', payload.customer_severity);
    if (payload.environment) form.append('environment', payload.environment);
    form.append('source', payload.source ?? 'web');
    if (payload.files?.length) {
      payload.files.forEach((file) => form.append('files', file));
    }
    return ticketClient
      .post<TicketCreateResponse>('/customer/tickets', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  listMyTickets: () =>
    ticketClient
      .get<CustomerTicketListItem[]>('/customer/tickets')
      .then((r) => r.data),

  getMyTicket: (ticketId: string) =>
    ticketClient
      .get<CustomerTicketDetail>(`/customer/tickets/${ticketId}`)
      .then((r) => r.data),

  getTicketAgentInfo: (ticketId: string) =>
    ticketClient
      .get<{ assigned: boolean; agent_name: string | null }>(
        `/customer/tickets/${ticketId}/agent`,
      )
      .then((r) => r.data),

  getThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/customer/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  replyToTicket: (ticketId: string, message: string) =>
    ticketClient
      .post<ConversationItem>(`/customer/tickets/${ticketId}/reply`, { message })
      .then((r) => r.data),

  closeTicket: (ticketId: string) =>
    ticketClient
      .patch(`/customer/tickets/${ticketId}/close`)
      .then((r) => r.data),

  uploadAttachment: (ticketId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return ticketClient
      .post<AttachmentItem>(`/customer/tickets/${ticketId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  getCustomerAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/customer/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),

  // Agent routes 

  getAgentQueue: () =>
    ticketClient
      .get<TicketQueueItem[]>('/agent/queue')
      .then((r) => r.data),

  getAgentTickets: () =>
    ticketClient
      .get<TicketQueueItem[]>('/agent/tickets')
      .then((r) => r.data),

  getAgentTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/agent/tickets/${ticketId}`)
      .then((r) => r.data),

  getAgentThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/agent/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  getTicketCustomerInfo: (ticketId: string) =>
    ticketClient
      .get<{ full_name: string; email: string }>(
        `/agent/tickets/${ticketId}/customer`,
      )
      .then((r) => r.data),

  postAgentComment: (ticketId: string, content: string, isInternal = false) =>
    ticketClient
      .post<ConversationItem>(`/agent/tickets/${ticketId}/comment`, {
        content,
        is_internal: isInternal,
      })
      .then((r) => r.data),

  getAgentAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/agent/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),


  updateAgentStatus: (ticketId: string, status: string, reason?: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/agent/tickets/${ticketId}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  setInProgress: (ticketId: string) =>
    ticketClient
      .patch(`/agent/tickets/${ticketId}/in-progress`)
      .then((r) => r.data),

  unassignTicket: (ticketId: string, justification: string) =>
    ticketClient
      .patch(`/agent/tickets/${ticketId}/unassign`, { justification })
      .then((r) => r.data),

  /** Submit SLA breach justification */
  submitBreachJustification: (
    ticketId:      string,
    breachType:    'response' | 'resolution',
    justification: string,
  ) =>
    ticketClient
      .post(`/agent/tickets/${ticketId}/breach-justification`, {
        breach_type:   breachType,
        justification,
      })
      .then((r) => r.data),

  /** List breach justifications for a ticket (agent view) */
  getBreachJustifications: (ticketId: string) =>
    ticketClient
      .get(`/agent/tickets/${ticketId}/breach-justifications`)
      .then((r) => r.data),

  // ── Team Lead routes ──────────────────────────────────────────────────────

  /** Unassigned queue across all TL's teams */
  getTLQueue: () =>
    ticketClient
      .get<TicketQueueItem[]>('/teamlead/queue')
      .then((r) => r.data),

  sendReopenWarning: (
  ticketId:       string,
  templateId:     string,
  customMessage?: string,
) =>
  ticketClient
    .post(`/teamlead/tickets/${ticketId}/send-reopen-warning`, {
      template_id:    templateId,
      custom_message: customMessage,
    })
    .then((r) => r.data), 

  getTLTickets: (status?: string) =>
    ticketClient
      .get<TLTicketDetail[]>('/teamlead/tickets', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),
  
  updateAgentSkill: (agentUserId: string, skillText: string) =>
    ticketClient
      .patch<{ user_id: string; skills: { skill_text: string } }>(
        `/teamlead/members/${agentUserId}/skill`,
        { skill_text: skillText },
      )
      .then((r) => r.data),

  getTLTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/teamlead/tickets/${ticketId}`)
      .then((r) => r.data),

  manualAssign: (ticketId: string, agent_user_id: string) =>
    ticketClient
      .post<TLTicketDetail>(`/teamlead/tickets/${ticketId}/assign`, { agent_user_id })
      .then((r) => r.data),

  updateTLStatus: (ticketId: string, status: string, reason?: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/teamlead/tickets/${ticketId}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  getTeamOverview: () =>
    ticketClient
      .get<TeamOverviewResponse>('/teamlead/overview')
      .then((r) => r.data),

  /** Full thread for a ticket (TL view) */
  getTLTicketThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/teamlead/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  /** Add internal note (TL) */
  postTLInternalNote: (ticketId: string, content: string) =>
    ticketClient
      .post(`/teamlead/tickets/${ticketId}/note`, { content })
      .then((r) => r.data),

  /** Customer info (TL can look up via ticket) */
  getTLTicketCustomerInfo: (ticketId: string) =>
    ticketClient
      .get<{ full_name: string; email: string }>(
        `/teamlead/tickets/${ticketId}/customer`,
      )
      .then((r) => r.data),

  /** Breach justifications (TL view) */
  getTLBreachJustifications: (ticketId: string) =>
    ticketClient
      .get(`/teamlead/tickets/${ticketId}/breach-justifications`)
      .then((r) => r.data),


  getTLAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/teamlead/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),

  getAllTeams: (productId?: string) =>
  ticketClient
    .get<{ id: string; name: string }[]>('/teamlead/teams', {
      params: productId ? { product_id: productId } : {},
    })
    .then((r) => r.data),

  rerouteTicket: (ticketId: string, targetTeamId: string) =>
    ticketClient
      .post<TLTicketDetail>(`/teamlead/tickets/${ticketId}/reroute`, { target_team_id: targetTeamId })
      .then((r) => r.data),

  // ── Notification Templates ────────────────────────────────────────────────

  listNotificationTemplates: () =>
    ticketClient
      .get('/teamlead/notification-templates')
      .then((r) => r.data),

  getNotificationTemplate: (templateId: string) =>
    ticketClient
      .get(`/teamlead/notification-templates/${templateId}`)
      .then((r) => r.data),

  updateNotificationTemplate: (
    templateId: string,
    payload: { name?: string; subject?: string; body?: string; is_active?: boolean },
  ) =>
    ticketClient
      .put(`/teamlead/notification-templates/${templateId}`, payload)
      .then((r) => r.data),

  // ── Send Apology ──────────────────────────────────────────────────────────

  sendApology: (
    ticketId:       string,
    templateId:     string,
    customMessage?: string,
    commitTime?:    string,
  ) =>
    ticketClient
      .post(`/teamlead/tickets/${ticketId}/send-apology`, {
        template_id:    templateId,
        custom_message: customMessage,
        commit_time:    commitTime,
      })
      .then((r) => r.data),

  // ── Notifications ─────────────────────────────────────────────────────────

  getUnreadNotificationCount: () =>
    ticketClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data.count),
  
  getSubscribedProducts: () =>
    ticketClient
      .get<{ id: string; name: string; code: string }[]>('/customer/products')
      .then((r) => r.data),

  // ── Products list ─────────────────────────────────────────────────────────

  getProducts: () =>
    authClient
      .get<{ id: string; name: string; is_active: boolean }[]>('admin/products')
      .then((r) => r.data),

  enhanceReply: (
  ticketId: string,
  draft:    string,
  mode:     'reply' | 'internal' = 'reply',
  ): Promise<{ enhanced_text: string; changes_summary: string }> =>
  ticketClient
    .post(`/agent/tickets/${ticketId}/enhance-reply`, { draft, mode })
    .then((r) => r.data),

  // ── User name resolution ──────────────────────────────────────────────────

  resolveUserNames: async (userIds: string[]): Promise<Record<string, string>> => {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return {};
    const results = await Promise.allSettled(
      unique.map((id) =>
        authClient
          .get<{ id: string; full_name: string }>(`/internal/users/${id}`)
          .then((r) => ({ id, name: r.data.full_name })),
      ),
    );
    const map: Record<string, string> = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') map[r.value.id] = r.value.name;
    });
    return map;
  },
};