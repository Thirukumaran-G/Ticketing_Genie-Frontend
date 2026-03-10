// src/features/notifications/services/notificationsService.ts
import { ticketClient } from '../../../lib/axios';
import { NotificationItem } from '../../../types';

export const notificationsService = {
  list: () =>
    ticketClient.get<NotificationItem[]>('/customer/notifications').then((r) => r.data),

  markRead: (notificationId: string) =>
    ticketClient
      .patch<NotificationItem>(`/customer/notifications/${notificationId}/read`)
      .then((r) => r.data),
};
