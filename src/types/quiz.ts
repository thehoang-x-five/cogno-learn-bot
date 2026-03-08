export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface Quiz {
  id: string;
  courseId: string;
  createdBy: string;
  title: string;
  chapter?: string;
  isAiGenerated: boolean;
  questionCount: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: QuizDifficulty;
}

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
