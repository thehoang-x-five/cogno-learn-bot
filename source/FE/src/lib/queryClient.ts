/**
 * TanStack Query Client Configuration
 * 
 * Centralized configuration for React Query with optimized defaults
 * for chat application performance.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests 1 time
      retry: 1,
      
      // Refetch on window focus (user returns to tab)
      refetchOnWindowFocus: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations 0 times (user should retry manually)
      retry: 0,
    },
  },
});
