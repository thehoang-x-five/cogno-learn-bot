import { mockQuizzes, mockQuizQuestions, mockQuizAttempts } from '@/data/mockData';
import { mockList, mockCreate, mockUpdate, mockDelete, delay, type ApiResponse } from './api';
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types/quiz';

let quizzes = [...mockQuizzes];
const questions = [...mockQuizQuestions];
const attempts = [...mockQuizAttempts];

export const quizService = {
  list: (): Promise<ApiResponse<Quiz[]>> => mockList(quizzes),
  create: (quiz: Quiz): Promise<ApiResponse<Quiz>> => mockCreate(quizzes, quiz),
  update: (id: string, patch: Partial<Quiz>): Promise<ApiResponse<Quiz | null>> => mockUpdate(quizzes, id, patch),
  delete: (id: string): Promise<ApiResponse<boolean>> => mockDelete(quizzes, id),
  getQuestions: async (quizId: string): Promise<ApiResponse<QuizQuestion[]>> => {
    await delay();
    return { data: questions.filter((q) => q.quizId === quizId), success: true };
  },
  getAttempts: async (): Promise<ApiResponse<QuizAttempt[]>> => mockList(attempts),
  _reset: () => { quizzes.length = 0; quizzes.push(...mockQuizzes); },
};
