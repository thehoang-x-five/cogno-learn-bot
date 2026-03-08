import { useApi } from './useApi';
import { courseService } from '@/services/courseService';
import { documentService } from '@/services/documentService';
import { quizService } from '@/services/quizService';
import { userService } from '@/services/userService';
import { chatService } from '@/services/chatService';
import { notificationService } from '@/services/notificationService';

/** Fetch all courses */
export const useCourses = () => useApi(() => courseService.list());

/** Fetch all documents */
export const useDocuments = () => useApi(() => documentService.list());

/** Fetch all quizzes */
export const useQuizzes = () => useApi(() => quizService.list());

/** Fetch quiz questions by quiz ID */
export const useQuizQuestions = (quizId: string) =>
  useApi(() => quizService.getQuestions(quizId), [quizId]);

/** Fetch quiz attempts */
export const useQuizAttempts = () => useApi(() => quizService.getAttempts());

/** Fetch all users (admin) */
export const useUsers = () => useApi(() => userService.list());

/** Fetch conversations */
export const useConversations = () => useApi(() => chatService.listConversations());

/** Fetch messages for a conversation */
export const useMessages = (conversationId: string | null) =>
  useApi(
    () =>
      conversationId
        ? chatService.getMessages(conversationId)
        : Promise.resolve({ data: [], success: true as const }),
    [conversationId]
  );

/** Fetch notifications */
export const useNotifications = () => useApi(() => notificationService.list());
