import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse } from '@/services/api';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Generic hook for data fetching with loading/error states.
 * Automatically fetches on mount. Call refetch() to reload.
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useApi(() => courseService.list());
 *
 * When switching to real API:
 *   const { data, isLoading, error } = useApi(() => fetch('/api/courses').then(r => r.json()));
 */
export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = []
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      if (result.success) {
        setState({ data: result.data, isLoading: false, error: null });
      } else {
        setState({ data: null, isLoading: false, error: result.message || 'Unknown error' });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, isLoading: false, error: (err as Error).message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  const setData = useCallback<React.Dispatch<React.SetStateAction<T | null>>>(
    (value) => setState((prev) => ({
      ...prev,
      data: typeof value === 'function' ? (value as (prev: T | null) => T | null)(prev.data) : value,
    })),
    []
  );

  return { ...state, refetch: fetchData, setData };
}

/**
 * Hook for mutations (create, update, delete) with loading state.
 *
 * Usage:
 *   const { mutate, isLoading } = useMutation((id) => courseService.delete(id));
 *   mutate('123').then(res => { ... });
 */
export function useMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (...args: TArgs): Promise<ApiResponse<TResult>> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutationFn(...args);
      setIsLoading(false);
      if (!result.success) setError(result.message || 'Error');
      return result;
    } catch (err) {
      setIsLoading(false);
      setError((err as Error).message);
      return { data: null as unknown as TResult, success: false, message: (err as Error).message };
    }
  }, [mutationFn]);

  return { mutate, isLoading, error };
}
