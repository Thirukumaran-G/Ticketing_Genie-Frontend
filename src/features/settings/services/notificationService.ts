import { notificationClient } from '../../../lib/axios';

export interface NotificationPreferenceResponse {
  user_id: string;
  preferred_contact: 'email' | 'in_app';
}

export const notificationService = {
  getPreference: () =>
    notificationClient
      .get<NotificationPreferenceResponse>('/preference')
      .then((r) => r.data),

  setPreference: (preferred_contact: 'email' | 'in_app') =>
    notificationClient
      .put<NotificationPreferenceResponse>('/preference', { preferred_contact })
      .then((r) => r.data),
};