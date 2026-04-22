import * as apiClient from './apiClient';
import * as authService from './authService';
import type {
  Quiz,
  QuizDetail,
  QuizAttemptResult,
  CourseQuizStats,
  ExamSchedule,
  ExamSchedulePayload,
} from '@/types/quiz';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * GET authenticated binary (Excel) and trigger browser download.
 */
async function downloadExcelBlob(endpoint: string): Promise<void> {
  const token = authService.getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  let response = await fetch(url, { method: 'GET', headers });

  if (response.status === 401 && token) {
    const refreshed = await authService.refreshAccessToken();
    if (refreshed) {
      const newToken = authService.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { method: 'GET', headers });
      }
    } else {
      authService.clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    try {
      const errData = await response.json();
      const detail = (errData as { detail?: string }).detail;
      throw new Error(detail || response.statusText);
    } catch (e) {
      if (e instanceof Error && e.message !== response.statusText) throw e;
      throw new Error(response.statusText);
    }
  }

  const blob = await response.blob();
  const cd = response.headers.get('Content-Disposition');
  let filename = 'export.xlsx';
  if (cd) {
    const quoted = /filename="([^"]+)"/.exec(cd);
    const utf8 = /filename\*=UTF-8''(.+)/.exec(cd);
    if (quoted?.[1]) filename = quoted[1];
    else if (utf8?.[1]) filename = decodeURIComponent(utf8[1].trim());
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export interface CreateQuizManualPayload {
  course_id: number;
  title: string;
  questions: {
    question: string;
    options: Record<'A' | 'B' | 'C' | 'D', string>;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  }[];
}

export interface CreateQuizAIPayload {
  course_id: number;
  title: string;
  topic?: string;
  num_questions?: number;
}

export interface SubmitAttemptPayload {
  answers: Record<string, string>;  // { "0": "A", "1": "C", ... }
  time_spent_seconds?: number;
  started_at?: string;
}

export const quizService = {
  list: async (courseId?: number): Promise<{ items: Quiz[]; total: number }> => {
    const url = courseId ? `/api/quizzes?course_id=${courseId}` : '/api/quizzes';
    return apiClient.get<{ items: Quiz[]; total: number }>(url);
  },

  getById: async (quizId: number): Promise<QuizDetail> => {
    return apiClient.get<QuizDetail>(`/api/quizzes/${quizId}`);
  },

  createManual: async (payload: CreateQuizManualPayload): Promise<Quiz> => {
    return apiClient.post<Quiz>('/api/quizzes', payload);
  },

  createAI: async (payload: CreateQuizAIPayload): Promise<QuizDetail> => {
    return apiClient.post<QuizDetail>('/api/quizzes/ai-generate', payload);
  },

  delete: async (quizId: number): Promise<void> => {
    return apiClient.del<void>(`/api/quizzes/${quizId}`);
  },

  submitAttempt: async (quizId: number, payload: SubmitAttemptPayload): Promise<QuizAttemptResult> => {
    return apiClient.post<QuizAttemptResult>(`/api/quizzes/${quizId}/attempts`, payload);
  },

  getAttemptsByQuiz: async (quizId: number): Promise<{ items: QuizAttemptResult[]; total: number }> => {
    return apiClient.get<{ items: QuizAttemptResult[]; total: number }>(`/api/quizzes/${quizId}/attempts`);
  },

  getMyAttempts: async (courseId?: number): Promise<{ items: QuizAttemptResult[]; total: number }> => {
    const url = courseId ? `/api/quizzes/me/attempts?course_id=${courseId}` : '/api/quizzes/me/attempts';
    return apiClient.get<{ items: QuizAttemptResult[]; total: number }>(url);
  },

  getCourseStats: async (courseId: number): Promise<CourseQuizStats> => {
    return apiClient.get<CourseQuizStats>(`/api/quizzes/stats/course/${courseId}`);
  },

  getExamSchedules: async (courseId: number): Promise<{ items: ExamSchedule[]; total: number }> => {
    return apiClient.get<{ items: ExamSchedule[]; total: number }>(`/api/quizzes/schedules/course/${courseId}`);
  },

  createExamSchedule: async (courseId: number, payload: ExamSchedulePayload): Promise<ExamSchedule> => {
    return apiClient.post<ExamSchedule>(`/api/quizzes/schedules/course/${courseId}`, payload);
  },

  updateExamSchedule: async (scheduleId: number, payload: ExamSchedulePayload): Promise<ExamSchedule> => {
    return apiClient.put<ExamSchedule>(`/api/quizzes/schedules/${scheduleId}`, payload);
  },

  deleteExamSchedule: async (scheduleId: number): Promise<void> => {
    await apiClient.del<void>(`/api/quizzes/schedules/${scheduleId}`);
  },

  /** Xuất Excel: tất cả lần làm của một quiz (giáo viên / admin). */
  exportQuizAttempts: async (quizId: number): Promise<void> => {
    await downloadExcelBlob(`/api/quizzes/${quizId}/attempts/export`);
  },

  /** Xuất Excel: tổng hợp quiz theo môn học (giáo viên / admin). */
  exportCourseStats: async (courseId: number): Promise<void> => {
    await downloadExcelBlob(`/api/quizzes/stats/course/${courseId}/export`);
  },

  /** Xuất Excel: lịch sử làm bài của user hiện tại. */
  exportMyAttempts: async (courseId?: number): Promise<void> => {
    const q = courseId != null ? `?course_id=${courseId}` : '';
    await downloadExcelBlob(`/api/quizzes/me/attempts/export${q}`);
  },
};
