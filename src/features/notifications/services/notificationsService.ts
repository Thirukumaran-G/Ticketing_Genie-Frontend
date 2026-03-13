// src/features/notifications/services/notificationsService.ts
import { ticketClient } from '../../../lib/axios';
import { NotificationItem, NotificationPreference } from '../../../types'; // ✅ import global types

export type { NotificationItem, NotificationPreference }; // re-export if needed elsewhere

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