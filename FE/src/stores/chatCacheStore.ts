/**
 * Chat Cache Store - Cache conversations and messages to improve performance
 * 
 * This store caches:
 * - Conversations list by course ID
 * - Messages by conversation ID
 * 
 * Benefits:
 * - Instant switching between conversations (no loading)
 * - Instant return to chat page (no re-fetching)
 * - Reduced API calls
 */

import { create } from 'zustand';
import type { Conversation, Message } from '@/services/chatService';

interface ChatCacheStore {
  // Cache structure
  conversationsCache: Record<number, Conversation[]>; // courseId -> conversations[]
  messagesCache: Record<number, Message[]>; // conversationId -> messages[]
  
  // Cache timestamps for invalidation
  conversationsCacheTime: Record<number, number>; // courseId -> timestamp
  messagesCacheTime: Record<number, number>; // conversationId -> timestamp
  
  // Cache TTL (Time To Live) in milliseconds
  cacheTTL: number; // Default: 5 minutes
  
  // Actions
  /**
   * Cache conversations for a course
   */
  cacheConversations: (courseId: number, conversations: Conversation[]) => void;
  
  /**
   * Get cached conversations for a course
   * Returns null if cache is expired or doesn't exist
   */
  getCachedConversations: (courseId: number) => Conversation[] | null;
  
  /**
   * Cache messages for a conversation
   */
  cacheMessages: (conversationId: number, messages: Message[]) => void;
  
  /**
   * Get cached messages for a conversation
   * Returns null if cache is expired or doesn't exist
   */
  getCachedMessages: (conversationId: number) => Message[] | null;
  
  /**
   * Invalidate (clear) cache for a specific course's conversations
   */
  invalidateConversationsCache: (courseId: number) => void;
  
  /**
   * Invalidate (clear) cache for a specific conversation's messages
   */
  invalidateMessagesCache: (conversationId: number) => void;
  
  /**
   * Clear all cache
   */
  clearAllCache: () => void;
  
  /**
   * Update a single conversation in cache (e.g., after title update)
   */
  updateConversationInCache: (courseId: number, updatedConv: Conversation) => void;
  
  /**
   * Add a new message to cache (optimistic update)
   */
  addMessageToCache: (conversationId: number, message: Message) => void;
  
  /**
   * Update message status in cache (optimistic -> saved)
   */
  updateMessageStatus: (conversationId: number, tempId: number, options: { status: 'saved' | 'error', realId?: number }) => void;
}

export const useChatCacheStore = create<ChatCacheStore>((set, get) => ({
  // Initial state
  conversationsCache: {},
  messagesCache: {},
  conversationsCacheTime: {},
  messagesCacheTime: {},
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  
  // Cache conversations
  cacheConversations: (courseId, conversations) => {
    set((state) => ({
      conversationsCache: {
        ...state.conversationsCache,
        [courseId]: conversations,
      },
      conversationsCacheTime: {
        ...state.conversationsCacheTime,
        [courseId]: Date.now(),
      },
    }));
  },
  
  // Get cached conversations
  getCachedConversations: (courseId) => {
    const state = get();
    const cached = state.conversationsCache[courseId];
    const cacheTime = state.conversationsCacheTime[courseId];
    
    if (!cached || !cacheTime) return null;
    
    // Check if cache is expired
    const isExpired = Date.now() - cacheTime > state.cacheTTL;
    if (isExpired) {
      // Clean up expired cache
      set((s) => {
        const { [courseId]: _, ...restConvs } = s.conversationsCache;
        const { [courseId]: __, ...restTimes } = s.conversationsCacheTime;
        return {
          conversationsCache: restConvs,
          conversationsCacheTime: restTimes,
        };
      });
      return null;
    }
    
    return cached;
  },
  
  // Cache messages
  cacheMessages: (conversationId, messages) => {
    set((state) => ({
      messagesCache: {
        ...state.messagesCache,
        [conversationId]: messages,
      },
      messagesCacheTime: {
        ...state.messagesCacheTime,
        [conversationId]: Date.now(),
      },
    }));
  },
  
  // Get cached messages
  getCachedMessages: (conversationId) => {
    const state = get();
    const cached = state.messagesCache[conversationId];
    const cacheTime = state.messagesCacheTime[conversationId];
    
    if (!cached || !cacheTime) return null;
    
    // Check if cache is expired
    const isExpired = Date.now() - cacheTime > state.cacheTTL;
    if (isExpired) {
      // Clean up expired cache
      set((s) => {
        const { [conversationId]: _, ...restMsgs } = s.messagesCache;
        const { [conversationId]: __, ...restTimes } = s.messagesCacheTime;
        return {
          messagesCache: restMsgs,
          messagesCacheTime: restTimes,
        };
      });
      return null;
    }
    
    return cached;
  },
  
  // Invalidate conversations cache
  invalidateConversationsCache: (courseId) => {
    set((state) => {
      const { [courseId]: _, ...restConvs } = state.conversationsCache;
      const { [courseId]: __, ...restTimes } = state.conversationsCacheTime;
      return {
        conversationsCache: restConvs,
        conversationsCacheTime: restTimes,
      };
    });
  },
  
  // Invalidate messages cache
  invalidateMessagesCache: (conversationId) => {
    set((state) => {
      const { [conversationId]: _, ...restMsgs } = state.messagesCache;
      const { [conversationId]: __, ...restTimes } = state.messagesCacheTime;
      return {
        messagesCache: restMsgs,
        messagesCacheTime: restTimes,
      };
    });
  },
  
  // Clear all cache
  clearAllCache: () => {
    set({
      conversationsCache: {},
      messagesCache: {},
      conversationsCacheTime: {},
      messagesCacheTime: {},
    });
  },
  
  // Update conversation in cache
  updateConversationInCache: (courseId, updatedConv) => {
    set((state) => {
      const cached = state.conversationsCache[courseId];
      if (!cached) return state;
      
      const updated = cached.map((conv) =>
        conv.id === updatedConv.id ? updatedConv : conv
      );
      
      return {
        conversationsCache: {
          ...state.conversationsCache,
          [courseId]: updated,
        },
      };
    });
  },
  
  // Add message to cache
  addMessageToCache: (conversationId, message) => {
    set((state) => {
      const cached = state.messagesCache[conversationId];
      if (!cached) return state;
      
      return {
        messagesCache: {
          ...state.messagesCache,
          [conversationId]: [...cached, message],
        },
      };
    });
  },

  // Update message status in cache
  updateMessageStatus: (conversationId, tempId, options) => {
    set((state) => {
      const cached = state.messagesCache[conversationId];
      if (!cached) return state;

      const updated = cached.map((msg) => {
        if (msg.id === tempId) {
          return {
            ...msg,
            status: options.status,
            id: options.realId ?? msg.id,
          };
        }
        return msg;
      });

      return {
        messagesCache: {
          ...state.messagesCache,
          [conversationId]: updated,
        },
      };
    });
  },
}));
