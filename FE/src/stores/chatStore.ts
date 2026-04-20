/**
 * Chat Store - Global State Management for Chat Streaming
 * 
 * This store manages streaming state across the entire application,
 * allowing chat streams to continue even when navigating away from ChatPage.
 */

import { create } from 'zustand';

/**
 * Global AbortController Map
 * 
 * Stored outside the Zustand store because AbortController instances
 * cannot be serialized. This map is accessible from anywhere in the app
 * and persists across component mounts/unmounts.
 * 
 * Key: conversation ID
 * Value: AbortController for that conversation's stream
 */
export const globalAbortControllers = new Map<number, AbortController>();

/**
 * Chat Store Interface
 */
interface ChatStore {
  // State
  /** Map of conversation IDs to their sending status (true = AI is generating) */
  sendingMap: Record<number, boolean>;
  
  /** Map of conversation IDs to their current streaming content */
  streamsMap: Record<number, string>;
  
  /** Currently selected course ID (persisted in localStorage) */
  selectedCourseId: number | null;
  
  /** Currently active conversation ID (persisted in localStorage) */
  activeConversationId: number | null;
  
  // Actions
  /**
   * Set the sending status for a conversation
   * @param convId - Conversation ID
   * @param isSending - Whether AI is currently generating a response
   */
  setSending: (convId: number, isSending: boolean) => void;
  
  /**
   * Set the streaming content for a conversation
   * @param convId - Conversation ID
   * @param content - Current accumulated streaming content
   */
  setStream: (convId: number, content: string) => void;
  
  /**
   * Clear the streaming content for a conversation
   * @param convId - Conversation ID
   */
  clearStream: (convId: number) => void;
  
  /**
   * Clear the sending status for a conversation
   * @param convId - Conversation ID
   */
  clearSending: (convId: number) => void;
  
  /**
   * Set the selected course ID (persists to localStorage)
   * @param courseId - Course ID or null
   */
  setSelectedCourseId: (courseId: number | null) => void;
  
  /**
   * Set the active conversation ID (persists to localStorage)
   * @param convId - Conversation ID or null
   */
  setActiveConversationId: (convId: number | null) => void;
  
  /**
   * Reset the entire store to initial state
   * Useful for logout or testing
   */
  reset: () => void;
}

// Helper functions for localStorage persistence
const getPersistedCourseId = (): number | null => {
  try {
    const stored = localStorage.getItem('chat-selected-course-id');
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
};

const getPersistedConvId = (): number | null => {
  try {
    const stored = localStorage.getItem('chat-active-conversation-id');
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
};

/**
 * Chat Store Hook
 * 
 * Usage:
 * ```typescript
 * const { sendingMap, streamsMap, setSending, setStream } = useChatStore();
 * ```
 */
export const useChatStore = create<ChatStore>((set) => ({
  // Initial state (restore from localStorage)
  sendingMap: {},
  streamsMap: {},
  selectedCourseId: getPersistedCourseId(),
  activeConversationId: getPersistedConvId(),
  
  // Actions
  setSending: (convId, isSending) =>
    set((state) => ({
      sendingMap: { ...state.sendingMap, [convId]: isSending },
    })),
  
  setStream: (convId, content) =>
    set((state) => ({
      streamsMap: { ...state.streamsMap, [convId]: content },
    })),
  
  clearStream: (convId) =>
    set((state) => {
      const { [convId]: _, ...rest } = state.streamsMap;
      return { streamsMap: rest };
    }),
  
  clearSending: (convId) =>
    set((state) => {
      const { [convId]: _, ...rest } = state.sendingMap;
      return { sendingMap: rest };
    }),
  
  setSelectedCourseId: (courseId) => {
    // Persist to localStorage
    try {
      if (courseId !== null) {
        localStorage.setItem('chat-selected-course-id', courseId.toString());
      } else {
        localStorage.removeItem('chat-selected-course-id');
      }
    } catch (e) {
      console.error('Failed to persist course ID:', e);
    }
    set({ selectedCourseId: courseId });
  },
  
  setActiveConversationId: (convId) => {
    // Persist to localStorage
    try {
      if (convId !== null) {
        localStorage.setItem('chat-active-conversation-id', convId.toString());
      } else {
        localStorage.removeItem('chat-active-conversation-id');
      }
    } catch (e) {
      console.error('Failed to persist conversation ID:', e);
    }
    set({ activeConversationId: convId });
  },
  
  reset: () => {
    // Clear localStorage
    try {
      localStorage.removeItem('chat-selected-course-id');
      localStorage.removeItem('chat-active-conversation-id');
    } catch (e) {
      console.error('Failed to clear persisted data:', e);
    }
    set({
      sendingMap: {},
      streamsMap: {},
      selectedCourseId: null,
      activeConversationId: null,
    });
  },
}));
