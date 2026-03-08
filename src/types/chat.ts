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
