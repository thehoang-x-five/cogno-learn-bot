// User types
export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  googleId?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Course types
export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  semester: string;
  isActive: boolean;
  createdAt: string;
  enrollmentRole?: 'teacher' | 'student';
  teacherCount?: number;
  studentCount?: number;
  documentCount?: number;
}

// Document types
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';
export type FileType = 'pdf' | 'docx' | 'txt';

export interface Document {
  id: string;
  courseId: string;
  uploadedBy: string;
  filename: string;
  filePath: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  totalChunks: number;
  createdAt: string;
}

// Chat types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  modelUsed?: string;
  createdAt: string;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  messageId: string;
  chunkId: string;
  relevanceScore: number;
  quote: string;
  documentName?: string;
  pageNumber?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

// Quiz types
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

// LLM Model types
export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'google' | 'local';
  speed: 'fast' | 'slow';
  cost: '$' | '$$' | '$$$' | 'free';
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', speed: 'fast', cost: '$' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', speed: 'slow', cost: '$$$' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', speed: 'fast', cost: '$' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', speed: 'slow', cost: '$$' },
  { id: 'llama-3', name: 'Llama 3 (Local)', provider: 'local', speed: 'fast', cost: 'free' },
];
