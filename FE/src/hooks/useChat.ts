/**
 * Chat Hooks using TanStack Query
 * 
 * Provides optimized data fetching and caching for:
 * - Conversations list
 * - Conversation messages
 * - Courses list
 * 
 * Benefits:
 * - Automatic caching (no manual cache management)
 * - Background refetching
 * - Optimistic updates
 * - Automatic retry on failure
 * - Stale-while-revalidate pattern
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type Conversation, type Message } from '@/services/chatService';
import { courseService } from '@/services/courseService';
import type { Course } from '@/types/course';

// Query Keys - centralized for easy invalidation
export const chatKeys = {
  all: ['chat'] as const,
  courses: () => [...chatKeys.all, 'courses'] as const,
  conversations: (courseId: number) => [...chatKeys.all, 'conversations', courseId] as const,
  conversation: (conversationId: number) => [...chatKeys.all, 'conversation', conversationId] as const,
  messages: (conversationId: number) => [...chatKeys.all, 'messages', conversationId] as const,
};

/**
 * Fetch user's courses
 * Cached for 5 minutes, refetches on window focus
 */
export function useCourses() {
  return useQuery({
    queryKey: chatKeys.courses(),
    queryFn: async () => {
      const data = await courseService.getMyCourses();
      return data.items;
    },
  });
}

/**
 * Fetch conversations for a course
 * Cached per course, instant switching between courses
 */
export function useConversations(courseId: number | null) {
  return useQuery({
    queryKey: courseId ? chatKeys.conversations(courseId) : ['conversations-null'],
    queryFn: async () => {
      if (!courseId) return [];
      return await chatService.listConversationsByCourse(courseId);
    },
    enabled: !!courseId, // Only fetch if courseId exists
  });
}

/**
 * Fetch messages for a conversation
 * Smart caching strategy:
 * - Use cache when switching conversations (instant, no loading)
 * - Longer staleTime (30s) to prevent premature refetch
 * - Optimistic updates handle new messages immediately
 */
export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: conversationId ? chatKeys.messages(conversationId) : ['messages-null'],
    queryFn: async () => {
      if (!conversationId) return [];
      const detail = await chatService.getConversation(conversationId);
      return detail.messages;
    },
    enabled: !!conversationId,
    staleTime: 30000, // 30s - longer to prevent refetch before backend saves
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: true, // Refetch if stale (>30s), use cache if fresh
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // Fail immediately on 404, no point in retrying manually deleted conversations
  });
}

/**
 * Create new conversation
 * Automatically invalidates conversations cache
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (courseId: number) => {
      return await chatService.createConversation(courseId);
    },
    onSuccess: (newConv, courseId) => {
      // Invalidate conversations cache to refetch
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations(courseId) });
      
      // Optionally: Optimistic update (add to cache immediately)
      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(courseId),
        (old) => (old ? [newConv, ...old] : [newConv])
      );
    },
  });
}

/**
 * Delete conversation
 * Automatically invalidates caches
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, courseId }: { conversationId: number; courseId: number }) => {
      await chatService.deleteConversation(conversationId);
      return { conversationId, courseId };
    },
    onSuccess: ({ conversationId, courseId }) => {
      // Remove from conversations cache
      queryClient.setQueryData<Conversation[]>(
        chatKeys.conversations(courseId),
        (old) => old?.filter((c) => c.id !== conversationId) || []
      );
      
      // Remove messages cache
      queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
    },
  });
}

/**
 * Add message to cache (optimistic update)
 * Use this when sending a message to update UI immediately
 */
export function useAddMessageToCache() {
  const queryClient = useQueryClient();
  
  return (conversationId: number, message: Message) => {
    queryClient.setQueryData<Message[]>(
      chatKeys.messages(conversationId),
      (old) => {
        if (!old) return [message];
        
        // Fix duplicate key bug: Prevent appending if message already exists
        const exists = old.some((m) => m.id === message.id);
        if (exists) {
          return old.map((m) => (m.id === message.id ? { ...m, ...message } : m));
        }
        
        return [...old, message];
      }
    );
    
    // Mark query as fresh to prevent immediate refetch
    queryClient.setQueryDefaults(chatKeys.messages(conversationId), {
      staleTime: 10000,
    });
  };
}

/**
 * Update message status in cache (optimistic -> saved)
 */
export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();
  
  return (conversationId: number, tempId: number, options: { status: 'saved' | 'error', realId?: number }) => {
    queryClient.setQueryData<Message[]>(
      chatKeys.messages(conversationId),
      (old) => {
        if (!old) return old;
        return old.map((msg) => {
          if (msg.id === tempId) {
            return {
              ...msg,
              status: options.status,
              id: options.realId ?? msg.id,
            };
          }
          return msg;
        });
      }
    );
  };
}

/**
 * Update conversation in cache (e.g., after title update)
 */
export function useUpdateConversationInCache() {
  const queryClient = useQueryClient();
  
  return (courseId: number, updatedConv: Conversation) => {
    queryClient.setQueryData<Conversation[]>(
      chatKeys.conversations(courseId),
      (old) => old?.map((c) => (c.id === updatedConv.id ? updatedConv : c)) || []
    );
  };
}

/**
 * Invalidate messages query to refetch from server
 * Use after stream completes to get real message IDs
 */
export function useInvalidateMessages() {
  const queryClient = useQueryClient();
  
  return (conversationId: number) => {
    queryClient.invalidateQueries({ 
      queryKey: chatKeys.messages(conversationId),
      refetchType: 'active', // Only refetch if query is currently active
    });
  };
}

/**
 * Truncate messages cache — keep only messages up to (and including) the given messageId.
 * Optionally updates the content of the kept message (for edit flow).
 */
export function useTruncateMessages() {
  const queryClient = useQueryClient();
  
  return (conversationId: number, keepUpToMessageId: number, newContent?: string) => {
    queryClient.setQueryData<Message[]>(
      chatKeys.messages(conversationId),
      (old) => {
        if (!old) return [];
        const idx = old.findIndex(m => m.id === keepUpToMessageId);
        if (idx < 0) return old;
        const kept = old.slice(0, idx + 1);
        // Update the edited message's content in cache
        if (newContent !== undefined) {
          kept[kept.length - 1] = { ...kept[kept.length - 1], content: newContent };
        }
        return kept;
      }
    );
  };
}

/**
 * Refetch messages and merge with cache (Smart Merge Strategy)
 * Ensures optimistic messages (temporary IDs) aren't destroyed before backend confirms
 */
export function useRefetchAndMergeMessages() {
  const queryClient = useQueryClient();
  
  return async (conversationId: number) => {
    try {
      // Get current local cache
      const currentMessages = queryClient.getQueryData<Message[]>(chatKeys.messages(conversationId)) || [];
      
      // Fetch fresh data from server
      const detail = await chatService.getConversation(conversationId);
      const serverMessages = detail.messages;
      
      // 1. Augment server messages with any local tracking data (e.g. time, fallback status)
      const augmentedServerMessages = serverMessages.map(serverMsg => {
        const cachedMsg = currentMessages.find(m => 
          m.id === serverMsg.id || 
          (m.trace_id && serverMsg.trace_id && m.trace_id === serverMsg.trace_id) ||
          (m.content === serverMsg.content && m.role === serverMsg.role)
        );
        
        return {
          ...serverMsg,
          // Preserve client-side tracked metrics if backend missed it
          total_time_ms: serverMsg.total_time_ms ?? cachedMsg?.total_time_ms,
          retrieval_fallback: serverMsg.retrieval_fallback ?? cachedMsg?.retrieval_fallback,
        };
      });

      // 2. Identify optimistic messages that are NOT yet in the server response
      // We assume optimistic messages have temporary IDs like Date.now() (very large > 1 trillion)
      const serverMessageContents = new Set(serverMessages.map(m => `${m.role}:${m.content}`));
      const serverTraceIds = new Set(serverMessages.map(m => m.trace_id).filter(Boolean));
      
      const optimisticMessages = currentMessages.filter(m => {
        const isOptimistic = m.id > 1000000000000;
        if (!isOptimistic) return false;
        
        // Check if it's already returned by the server (matched by trace_id)
        if (m.trace_id && serverTraceIds.has(m.trace_id)) return false;
        
        // Check if it's already returned by the server (matched by exact content & role)
        if (serverMessageContents.has(`${m.role}:${m.content}`)) return false;
        
        return true;
      });

      // 3. Combine server messages and optimistic messages, sorted by creation time
      const mergedMessages = [...augmentedServerMessages, ...optimisticMessages].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      // 4. Safely update cache with merged data, avoiding full replace
      queryClient.setQueryData(chatKeys.messages(conversationId), mergedMessages);
    } catch (error) {
      console.error('Failed to refetch & merge messages:', error);
    }
  };
}

/**
 * Invalidate all chat caches
 * Use when logging out or switching users
 */
export function useInvalidateAllChatCaches() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: chatKeys.all });
  };
}
