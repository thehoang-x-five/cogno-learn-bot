import { documentService } from '@/services/documentService';
import type { Notification } from '@/types/notification';

/**
 * Static routes for notification types that do not need an extra API call.
 * Document notifications must use `resolveDocumentNotificationHref` instead.
 */
export function getNotificationHref(n: Notification): string | null {
  if (n.related_type === 'quiz' && n.related_id) {
    return `/quizzes?start=${n.related_id}`;
  }
  if (n.related_type === 'course' && n.related_id) {
    return `/courses/${n.related_id}`;
  }
  return null;
}

/**
 * Students cannot access `/documents` (route is teacher/admin only).
 * Resolve `course_id` from the document API, then link to course detail with `?doc=`.
 */
export async function resolveDocumentNotificationHref(
  documentId: number,
  role: string | undefined
): Promise<string> {
  const detail = await documentService.getDetail(documentId);
  if (role === 'student') {
    return `/courses/${detail.course_id}?doc=${documentId}`;
  }
  return `/documents?doc=${documentId}`;
}
