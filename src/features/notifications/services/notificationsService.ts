// src/features/notifications/services/notificationsService.ts
import { ticketClient } from '../../../lib/axios';
import { NotificationItem, NotificationPreference } from '../../../types';

export type { NotificationItem, NotificationPreference };

export const notificationsService = {

  list: (unreadOnly = false) =>
    ticketClient
      .get<NotificationItem[]>('/notifications', {
        params: unreadOnly ? { unread_only: true } : {},
      })
      .then((r) => r.data),

  getUnreadCount: (): Promise<number> =>
    ticketClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data.count),

  markRead: (notificationId: string) =>
    ticketClient
      .patch<void>(`/notifications/${notificationId}/read`)
      .then((r) => r.data),

  getPreference: () =>
    ticketClient
      .get<NotificationPreference>('/notifications/preference')
      .then((r) => r.data),

  setPreference: (preferred_contact: 'email' | 'in_app') =>
    ticketClient
      .put<NotificationPreference>('/notifications/preference', { preferred_contact })
      .then((r) => r.data),

  togglePreference: () =>
    ticketClient
      .patch<NotificationPreference>('/notifications/preference/toggle')
      .then((r) => r.data),
};