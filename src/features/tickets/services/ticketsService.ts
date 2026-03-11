// src/features/tickets/services/ticketsService.ts
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
    title: string;
    description: string;
    product_id: string;
    customer_severity: string;
    environment?: string;
    source?: string;
  }) =>
    ticketClient
      .post<TicketCreateResponse>('/customer/tickets', payload)
      .then((r) => r.data),

  listMyTickets: () =>
    ticketClient
      .get<CustomerTicketListItem[]>('/customer/tickets')
      .then((r) => r.data),

  getMyTicket: (ticketId: string) =>
    ticketClient
      .get<CustomerTicketDetail>(`/customer/tickets/${ticketId}`)
      .then((r) => r.data),

  getThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/customer/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  replyToTicket: (ticketId: string, message: string) =>
    ticketClient
      .post<ConversationItem>(`/customer/tickets/${ticketId}/reply`, { message })
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

  getAttachmentUrl: (ticketId: string, attachmentId: string) =>
    `${ENV.TICKET_BASE}/customer/tickets/${ticketId}/attachments/${attachmentId}`,

  // ── Agent routes ──────────────────────────────────────────────────────────
  getAgentQueue: () =>
    ticketClient
      .get<TicketQueueItem[]>('/agent/queue')
      .then((r) => r.data),

  getAgentTickets: () =>
    ticketClient
      .get<TLTicketDetail[]>('/agent/tickets')
      .then((r) => r.data),

  getAgentTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/agent/tickets/${ticketId}`)
      .then((r) => r.data),

  getAgentThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/agent/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  postAgentComment: (ticketId: string, content: string, isInternal = false) =>
    ticketClient
      .post<ConversationItem>(`/agent/tickets/${ticketId}/comment`, {
        content,
        is_internal: isInternal,
      })
      .then((r) => r.data),

  uploadAgentAttachment: (ticketId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return ticketClient
      .post<AttachmentItem>(`/agent/tickets/${ticketId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  getAgentAttachmentUrl: (ticketId: string, attachmentId: string) =>
    `${ENV.TICKET_BASE}/agent/tickets/${ticketId}/attachments/${attachmentId}`,

  postComment: (ticketId: string, content: string) =>
    ticketClient
      .post<ConversationItem>(`/agent/tickets/${ticketId}/comment`, {
        content,
        is_internal: false,
      })
      .then((r) => r.data),

  updateAgentStatus: (ticketId: string, status: string, reason?: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/agent/tickets/${ticketId}/status`, {
        status,
        ...(reason ? { reason } : {}),
      })
      .then((r) => r.data),

  // ── NEW: Agent unassign ───────────────────────────────────────────────────
  unassignTicket: (ticketId: string, justification: string) =>
    ticketClient
      .patch(`/agent/tickets/${ticketId}/unassign`, { justification })
      .then((r) => r.data),

  // ── Team Lead routes ──────────────────────────────────────────────────────
  getTLQueue: () =>
    ticketClient
      .get<TicketQueueItem[]>('/teamlead/queue')
      .then((r) => r.data),

  getTLTickets: (status?: string) =>
    ticketClient
      .get<TLTicketDetail[]>('/teamlead/tickets', { params: status ? { status } : {} })
      .then((r) => r.data),

  getTLTicket: (ticketId: string) =>
    ticketClient
      .get<TLTicketDetail>(`/teamlead/tickets/${ticketId}`)
      .then((r) => r.data),

  manualAssign: (ticketId: string, agent_user_id: string) =>
    ticketClient
      .post<TLTicketDetail>(`/teamlead/tickets/${ticketId}/assign`, { agent_user_id })
      .then((r) => r.data),

  updateTLStatus: (ticketId: string, status: string) =>
    ticketClient
      .patch<TLTicketDetail>(`/teamlead/tickets/${ticketId}/status`, { status })
      .then((r) => r.data),

  getTeamOverview: () =>
    ticketClient
      .get<TeamOverviewResponse>('/teamlead/overview')
      .then((r) => r.data),

  getTicketCustomerInfo: (ticketId: string) =>
    ticketClient
      .get<{ full_name: string; email: string }>(`/agent/tickets/${ticketId}/customer`)
      .then((r) => r.data),

  // ── NEW: Team Lead thread + internal note ─────────────────────────────────
  getTLTicketThread: (ticketId: string) =>
    ticketClient
      .get<TicketThreadResponse>(`/teamlead/tickets/${ticketId}/thread`)
      .then((r) => r.data),

  postTLInternalNote: (ticketId: string, content: string) =>
    ticketClient
      .post(`/teamlead/tickets/${ticketId}/note`, { content })
      .then((r) => r.data),

  // ── SSE stream URLs ───────────────────────────────────────────────────────
  getAgentQueueStreamUrl: (token: string) =>
    `${ENV.TICKET_BASE}/agent/queue/stream?token=${token}`,

  getTLQueueStreamUrl: (token: string) =>
    `${ENV.TICKET_BASE}/teamlead/queue/stream?token=${token}`,

  getNotificationStreamUrl: (token: string) =>
    `${ENV.TICKET_BASE}/notifications/stream?token=${token}`,

  // ── Products list ─────────────────────────────────────────────────────────
  getProducts: () =>
    authClient
      .get<{ id: string; name: string; is_active: boolean }[]>('admin/products')
      .then((r) => r.data),
};