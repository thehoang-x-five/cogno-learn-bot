import { useApi } from './useApi';
import { courseService } from '@/services/courseService';
import { documentService } from '@/services/documentService';
import { quizService } from '@/services/quizService';
import { userService } from '@/services/userService';
import { chatService } from '@/services/chatService';
import { notificationService } from '@/services/notificationService';
import type { Message } from '@/services/chatService';
import type { Course } from '@/types/course';
import type { QuizQuestion } from '@/types/quiz';

/** Fetch all courses — `data` and `setData` are consistently `Course[] | null` (not raw paginated envelope). */
export const useCourses = () => {
  return useApi<Course[]>(async () => {
    const result = await courseService.list();
    if (result.success && result.data) {
      const raw = result.data as { items?: Course[] } | Course[];
      const items = Array.isArray(raw) ? raw : raw.items;
      return {
        success: true as const,
        data: Array.isArray(items) ? items : [],
      };
    }
    return {
      success: false as const,
      data: [] as Course[],
      message: result.message || 'Failed to load courses',
    };
  });
};

/** Fetch all documents */
export const useDocuments = () =>
  useApi(async () => {
    const res = await documentService.list({ limit: 500 });
    return { success: true as const, data: res };
  });

/** Fetch all quizzes (optional course filter via caller — use QuizzesPage for filtered lists) */
export const useQuizzes = () =>
  useApi(async () => {
    const res = await quizService.list();
    return { success: true as const, data: res };
  });

/** Fetch quiz questions for a quiz (from quiz detail) */
export const useQuizQuestions = (quizId: string) =>
  useApi<QuizQuestion[]>(async () => {
    const id = Number(quizId);
    if (!id || Number.isNaN(id)) {
      return { success: true as const, data: [] };
    }
    const detail = await quizService.getById(id);
    return { success: true as const, data: detail.questions ?? [] };
  }, [quizId]);

/** Fetch current user's quiz attempts */
export const useQuizAttempts = () =>
  useApi(async () => {
    const res = await quizService.getMyAttempts();
    return { success: true as const, data: res.items };
  });

/** Fetch all users (admin) */
export const useUsers = () =>
  useApi(async () => {
    const res = await userService.list({ limit: 500 });
    return { success: true as const, data: res.items };
  });

/** Fetch conversations */
export const useConversations = () =>
  useApi(async () => {
    const res = await chatService.listConversations(100, 0);
    return { success: true as const, data: res.results };
  });

/** Fetch messages for a conversation */
export const useMessages = (conversationId: string | null) =>
  useApi<Message[]>(
    async () => {
      if (!conversationId) {
        return { success: true as const, data: [] };
      }
      const id = Number(conversationId);
      if (!id || Number.isNaN(id)) {
        return { success: true as const, data: [] };
      }
      const detail = await chatService.getConversation(id);
      return { success: true as const, data: detail.messages ?? [] };
    },
    [conversationId]
  );

/** Fetch notifications */
export const useNotifications = () =>
  useApi(async () => {
    const res = await notificationService.list();
    return { success: true as const, data: res };
  });
