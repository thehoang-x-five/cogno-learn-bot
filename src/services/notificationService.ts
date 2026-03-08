import { mockNotifications } from '@/data/mockData';
import { mockList, mockDelete, mockUpdate, type ApiResponse } from './api';
import type { Notification } from '@/types/notification';

let notifications = [...mockNotifications];

export const notificationService = {
  list: (): Promise<ApiResponse<Notification[]>> => mockList(notifications),
  markRead: (id: string): Promise<ApiResponse<Notification | null>> => mockUpdate(notifications, id, { read: true }),
  markAllRead: async (): Promise<ApiResponse<boolean>> => {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    return { data: true, success: true };
  },
  delete: (id: string): Promise<ApiResponse<boolean>> => mockDelete(notifications, id),
  _reset: () => { notifications = [...mockNotifications]; },
};
