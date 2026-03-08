export type NotificationType = 'quiz' | 'document' | 'chat' | 'course' | 'system' | 'achievement';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  read: boolean;
}
