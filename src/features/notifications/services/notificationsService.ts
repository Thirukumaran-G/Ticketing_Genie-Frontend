import { ticketClient } from '../../../lib/axios';

export interface NotificationItem {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  ticket_id: string | null;
}

export interface NotificationPreference {
  user_id: string;
  preferred_contact: 'email' | 'in_app';
}

export const notificationsService = {
  list: (unreadOnly = false) =>
    ticketClient
      .get<NotificationItem[]>('/notifications', {
        params: unreadOnly ? { unread_only: true } : {},
      })
      .then((r) => r.data),

  markRead: (notificationId: string) =>
    ticketClient
      .patch<void>(`/notifications/${notificationId}/read`)
      .then((r) => r.data),

  getPreference: () =>
    ticketClient
      .get<NotificationPreference>('/notifications/preference')
      .then((r) => r.data),

  togglePreference: () =>
    ticketClient
      .patch<NotificationPreference>('/notifications/preference/toggle')
      .then((r) => r.data),
};