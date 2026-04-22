// Document statuses
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

// Quiz difficulties
export const QUIZ_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  MIXED: 'mixed',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  QUIZ: 'quiz',
  DOCUMENT: 'document',
  CHAT: 'chat',
  COURSE: 'course',
  SYSTEM: 'system',
  ACHIEVEMENT: 'achievement',
} as const;

// Allowed file extensions for upload
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const;

// API delay range for mock (ms)
export const MOCK_API_DELAY = { min: 300, max: 800 } as const;
