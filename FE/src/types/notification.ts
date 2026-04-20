export type NotificationType = 'enrollment' | 'course_staff' | 'document' | 'quiz' | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_type?: string | null;   // "course" | "document" | "quiz"
  related_id?: number | null;
  created_at: string;
}

export interface NotificationCount {
  unread: number;
}
