const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response;
}

export interface Conversation {
  id: number;
  user_id: number;
  course_id: number;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  message_count: number;
}

export interface Citation {
  id: number;
  chunk_id: number | null;
  document_title: string | null;
  page_number: number | null;
  relevance_score: number | null;
  quote: string | null;
}

export interface AgentMetadata {
  quiz_id?: number;
  quiz_title?: string;
  question_count?: number;
  tool_used?: string;
  [key: string]: unknown;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number | null;
  model_used: string | null;
  trace_id: string | null;
  citations: Citation[];
  retrieval_fallback?: boolean;
  total_time_ms?: number | null;
  created_at: string;
  status?: 'pending' | 'saved' | 'error';
  agent_metadata?: AgentMetadata | null;
}

export interface ConversationDetail {
  id: number;
  user_id: number;
  course_id: number;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  messages: Message[];
}

export interface SSEEvent {
  type: 'token' | 'citations' | 'metadata' | 'done' | 'error' | 'progress' | 'saved';
  content?: string;
  index?: number;
  citations?: Citation[];
  trace_id?: string;
  model?: string;
  tokens_used?: number;
  total_time_ms?: number;
  message?: string;
  code?: string;
  step?: string;
  progress?: number;
  message_id?: number;
  timestamp?: string;
  conversation_title?: string;  // Updated title from backend
  quality_scores?: {
    retrieval_fallback?: boolean;
    intent?: string;
    confidence?: number;
    raw_llm_response?: string;
    agent_flow?: boolean;
    tool_used?: string;
  };
  agent_metadata?: AgentMetadata | null;
}

export const chatService = {
  // List conversations for current user
  async listConversations(limit = 50, offset = 0): Promise<{ results: Conversation[]; total: number }> {
    const response = await fetchWithAuth(`/api/conversations?limit=${limit}&offset=${offset}`);
    return response.json();
  },

  // List conversations by course
  async listConversationsByCourse(courseId: number): Promise<Conversation[]> {
    const response = await fetchWithAuth('/api/conversations?limit=100&offset=0');
    const data = await response.json();
    // Filter by course_id on client side
    return data.results.filter((conv: Conversation) => conv.course_id === courseId);
  },

  // Create new conversation
  async createConversation(courseId: number, title?: string): Promise<Conversation> {
    const response = await fetchWithAuth('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        title: title || null
      })
    });
    return response.json();
  },

  // Get conversation detail with messages
  async getConversation(conversationId: number): Promise<ConversationDetail> {
    const response = await fetchWithAuth(`/api/conversations/${conversationId}`);
    return response.json();
  },

  // Delete conversation
  async deleteConversation(conversationId: number): Promise<void> {
    await fetchWithAuth(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  },

  // Send message with SSE streaming
  async sendMessage(
    conversationId: number,
    content: string,
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    model?: string,
    signal?: AbortSignal
  ): Promise<void> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, model }),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send message');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      let buffer = '';
      let currentEventType = 'message';
      let completed = false; // Flag to ensure onComplete fires exactly once
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (!completed && onComplete) {
            completed = true;
            onComplete();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (!completed && onComplete) {
                completed = true;
                onComplete();
              }
              break; // BREAK instead of continue to stop reading the stream correctly!
            }

            try {
              const eventData = JSON.parse(data);
              // Frontend expects the event type inside the object
              eventData.type = currentEventType;
              onEvent(eventData as SSEEvent);
            } catch (e) {
              console.error('Failed to parse SSE event:', e, data);
            }
          }
        }
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  },

  // Edit message with rollback + SSE streaming re-process
  async editMessage(
    conversationId: number,
    messageId: number,
    content: string,
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    model?: string,
    signal?: AbortSignal
  ): Promise<void> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await fetch(
      `${API_URL}/api/conversations/${conversationId}/messages/${messageId}/edit`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, model }),
        signal,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to edit message');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      let buffer = '';
      let currentEventType = 'message';
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (!completed && onComplete) {
            completed = true;
            onComplete();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (!completed && onComplete) {
                completed = true;
                onComplete();
              }
              break;
            }

            try {
              const eventData = JSON.parse(data);
              eventData.type = currentEventType;
              onEvent(eventData as SSEEvent);
            } catch (e) {
              console.error('Failed to parse SSE event:', e, data);
            }
          }
        }
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }
};
