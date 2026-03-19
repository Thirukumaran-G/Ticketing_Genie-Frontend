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

  // ── Customer routes ───────────────────────────────────────────────────────

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

  /**
   * closeTicket — PATCH /customer/tickets/{ticketId}/close
   * Only succeeds when ticket status is 'resolved'.
   * Backend stamps closed_at + closed_by and returns 204.
   */
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

  /**
   * getCustomerAttachmentSignedUrl
   * Calls the backend JSON endpoint which returns { url: string } — a GCS
   * signed URL valid for 30 min. Use the returned URL directly as <img src>
   * or window.open(). Never pass it through XHR/axios (CORS would block it).
   */
  getCustomerAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/customer/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),

  // kept for backward compat — NOT used for image/download display any more
  getAttachmentUrl: (ticketId: string, attachmentId: string) =>
    `${ENV.TICKET_BASE}/customer/tickets/${ticketId}/attachments/${attachmentId}`,

  // ── Agent routes ──────────────────────────────────────────────────────────

  /** Initial queue load — tickets assigned to me */
  getAgentQueue: () =>
    ticketClient
      .get<TicketQueueItem[]>('/agent/queue')
      .then((r) => r.data),

  /** All tickets assigned to me (same data, different view) */
  getAgentTickets: () =>
    ticketClient
      .get<TicketQueueItem[]>('/agent/tickets')
      .then((r) => r.data),

  /** Single ticket detail */
  getAgentTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/agent/tickets/${ticketId}`)
      .then((r) => r.data),

  /** Full conversation thread */
  getAgentThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/agent/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  /** Customer info attached to a ticket */
  getTicketCustomerInfo: (ticketId: string) =>
    ticketClient
      .get<{ full_name: string; email: string }>(
        `/agent/tickets/${ticketId}/customer`,
      )
      .then((r) => r.data),

  /** Post a reply or internal note */
  postAgentComment: (ticketId: string, content: string, isInternal = false) =>
    ticketClient
      .post<ConversationItem>(`/agent/tickets/${ticketId}/comment`, {
        content,
        is_internal: isInternal,
      })
      .then((r) => r.data),

  /** Upload attachment on agent side */
  uploadAgentAttachment: (ticketId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return ticketClient
      .post<AttachmentItem>(`/agent/tickets/${ticketId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /**
   * getAgentAttachmentSignedUrl
   * Calls the backend JSON endpoint which returns { url: string } — a GCS
   * signed URL valid for 30 min. Use the returned URL directly as <img src>
   * or window.open(). Never pass it through XHR/axios (CORS would block it).
   */
  getAgentAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/agent/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),

  // kept for backward compat
  getAgentAttachmentUrl: (ticketId: string, attachmentId: string) =>
    `${ENV.TICKET_BASE}/agent/tickets/${ticketId}/attachments/${attachmentId}`,

  /**
   * updateAgentStatus — agent can only set:
   *   in_progress | on_hold | resolved
   */
  updateAgentStatus: (ticketId: string, status: string, reason?: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/agent/tickets/${ticketId}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  /**
   * setInProgress — called when agent focuses the reply composer.
   * Hits dedicated PATCH /agent/tickets/{id}/in-progress endpoint
   * so the transition assigned → in_progress is idempotent and silent.
   */
  setInProgress: (ticketId: string) =>
    ticketClient
      .patch(`/agent/tickets/${ticketId}/in-progress`)
      .then((r) => r.data),

  /** Agent self-unassign with justification */
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

  /** All team tickets, optionally filtered by status */
  getTLTickets: (status?: string) =>
    ticketClient
      .get<TLTicketDetail[]>('/teamlead/tickets', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),

  /** Single ticket detail (TL view) */
  getTLTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/teamlead/tickets/${ticketId}`)
      .then((r) => r.data),

  /** Manually assign a ticket to an agent */
  manualAssign: (ticketId: string, agent_user_id: string) =>
    ticketClient
      .post<TLTicketDetail>(`/teamlead/tickets/${ticketId}/assign`, { agent_user_id })
      .then((r) => r.data),

  /**
   * updateTLStatus — TL can set:
   *   in_progress | on_hold | resolved | closed
   */
  updateTLStatus: (ticketId: string, status: string, reason?: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/teamlead/tickets/${ticketId}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  /** Team workload overview */
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

  /**
   * getTLAttachmentSignedUrl
   * Calls the backend JSON endpoint which returns { url: string } — a GCS
   * signed URL valid for 30 min. Use the returned URL directly as <img src>
   * or window.open(). Never pass it through XHR/axios (CORS would block it).
   */
  getTLAttachmentSignedUrl: (ticketId: string, attachmentId: string): Promise<string> =>
    ticketClient
      .get<{ url: string }>(`/teamlead/tickets/${ticketId}/attachments/${attachmentId}/signed-url`)
      .then((r) => r.data.url),

  // kept for backward compat
  getTlAttachmentUrl: (ticketId: string, attachmentId: string) =>
    `${ENV.TICKET_BASE}/teamlead/tickets/${ticketId}/attachments/${attachmentId}`,

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

  // ── Similar Ticket Groups ─────────────────────────────────────────────────

  listTicketGroups: (confirmedOnly = false) =>
    ticketClient
      .get('/teamlead/ticket-groups', { params: { confirmed_only: confirmedOnly } })
      .then((r) => r.data),

  getTicketGroup: (groupId: string) =>
    ticketClient
      .get(`/teamlead/ticket-groups/${groupId}`)
      .then((r) => r.data),

  confirmTicketGroup: (groupId: string, name?: string) =>
    ticketClient
      .post(`/teamlead/ticket-groups/${groupId}/confirm`, { name })
      .then((r) => r.data),

  addTicketToGroup: (groupId: string, ticketId: string, similarityScore = 0) =>
    ticketClient
      .post(`/teamlead/ticket-groups/${groupId}/members`, {
        ticket_id:        ticketId,
        similarity_score: similarityScore,
      })
      .then((r) => r.data),

  removeTicketFromGroup: (groupId: string, ticketId: string) =>
    ticketClient
      .delete(`/teamlead/ticket-groups/${groupId}/members/${ticketId}`)
      .then((r) => r.data),

  bulkAssignGroup: (groupId: string, agentUserId: string, internalMessage: string) =>
    ticketClient
      .post(`/teamlead/ticket-groups/${groupId}/bulk-assign`, {
        agent_user_id:    agentUserId,
        internal_message: internalMessage,
      })
      .then((r) => r.data),

  bulkResolveGroup: (groupId: string, resolutionMessage: string) =>
    ticketClient
      .post(`/teamlead/ticket-groups/${groupId}/bulk-resolve`, {
        resolution_message: resolutionMessage,
      })
      .then((r) => r.data),

  getGroupsForTicket: (ticketId: string) =>
    ticketClient
      .get(`/teamlead/tickets/${ticketId}/similar-groups`)
      .then((r) => r.data),

  // ── Notifications ─────────────────────────────────────────────────────────

  getUnreadNotificationCount: () =>
    ticketClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data.count),

  // ── Products list ─────────────────────────────────────────────────────────

  getProducts: () =>
    authClient
      .get<{ id: string; name: string; is_active: boolean }[]>('admin/products')
      .then((r) => r.data),

  // ── SSE stream URLs ───────────────────────────────────────────────────────

  getAgentQueueStreamUrl: () =>
    `${ENV.TICKET_BASE}/agent/queue/stream`,

  getTLQueueStreamUrl: () =>
    `${ENV.TICKET_BASE}/teamlead/queue/stream`,

  getNotificationStreamUrl: () =>
    `${ENV.TICKET_BASE}/notifications/stream`,

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