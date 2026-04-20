import apiClient from './apiClient';

export interface MyDashboardStats {
  courses_count: number;
  conversations_count: number;
  user_messages_count: number;
  total_students: number;
  documents_total: number;
  quizzes_count: number;
  quiz_avg_score: number | null;
}

export const dashboardMeService = {
  async getMyStats(): Promise<MyDashboardStats> {
    const response = await apiClient.get<MyDashboardStats>('/api/me/dashboard-stats');
    return response.data;
  },
};
