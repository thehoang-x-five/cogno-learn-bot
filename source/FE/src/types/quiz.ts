export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

// ─── Backend-aligned types (real API) ───────────────────

export interface QuizQuestion {
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface Quiz {
  id: number;
  course_id: number;
  title: string;
  question_count: number;
  is_ai_generated: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface QuizDetail extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizAttemptResult {
  id: number;
  quiz_id: number;
  user_id: number;
  user_name?: string | null;
  score: number;
  total_questions: number;
  score_pct?: number;
  time_spent_seconds?: number | null;
  completed_at?: string | null;
  created_at: string;
  correct_indices?: number[];
}

export interface CourseQuizStats {
  course_id: number;
  total_quizzes: number;
  total_attempts: number;
  average_score_pct: number;
  quizzes: {
    id: number;
    title: string;
    question_count: number;
    attempt_count: number;
    average_score_pct: number;
  }[];
}

// ─── Legacy types kept for UI compatibility ──────────────

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  startedAt: string;
  completedAt?: string;
}

export type ExamType = 'midterm' | 'final' | 'quiz' | 'practical';

export interface ExamSchedule {
  id: number;
  course_id: number;
  exam_type: ExamType;
  exam_date: string;
  duration_minutes: number;
  location?: string | null;
  notes?: string | null;
}

export interface ExamSchedulePayload {
  exam_type: ExamType;
  exam_date: string;
  duration_minutes: number;
  location?: string | null;
  notes?: string | null;
}
