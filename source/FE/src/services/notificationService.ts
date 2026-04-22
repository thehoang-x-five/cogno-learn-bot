import * as apiClient from './apiClient';
import type { Notification, NotificationCount } from '@/types/notification';

export const notificationService = {
  list: (unread?: boolean): Promise<{ items: Notification[]; total: number }> => {
    const url = unread === true
      ? '/api/notifications?unread=true'
      : '/api/notifications';
    return apiClient.get<{ items: Notification[]; total: number }>(url);
  },

  count: (): Promise<NotificationCount> =>
    apiClient.get<NotificationCount>('/api/notifications/count'),

  markRead: (id: number): Promise<{ success: boolean }> =>
    apiClient.patch<{ success: boolean }>(`/api/notifications/${id}/read`),

  markAllRead: (): Promise<{ success: boolean }> =>
    apiClient.patch<{ success: boolean }>('/api/notifications/read-all'),

  delete: (id: number): Promise<void> =>
    apiClient.del<void>(`/api/notifications/${id}`),
};
