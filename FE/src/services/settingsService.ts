import apiClient from './apiClient';
import type { ApiError } from './apiClient';

export interface SystemSettings {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  system_prompt_override: boolean;
  gemini_api_key_configured: boolean;
  gemini_api_key_last4: string | null;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  embedding_model: string;
  total_chunks: number;
  total_documents: number;
  embedding_dimension: number;
}

export type SystemSettingsUpdate = Partial<{
  provider: string;
  model: string;
  gemini_api_key: string | null;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  system_prompt_override: boolean;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  embedding_model: string;
}>;

export async function getSettings(): Promise<SystemSettings> {
  const response = await apiClient.get<SystemSettings>('/api/admin/settings');
  return response.data;
}

export async function updateSettings(payload: SystemSettingsUpdate): Promise<SystemSettings> {
  const response = await apiClient.put<SystemSettings>('/api/admin/settings', payload);
  return response.data;
}

export function formatSettingsError(err: unknown): string {
  const e = err as ApiError;
  if (typeof e?.detail === 'string') return e.detail;
  if (Array.isArray(e?.detail)) {
    const details = e.detail as Array<{ msg?: string }>;
    return details.map((x) => x.msg).filter(Boolean).join('; ') || 'Validation error';
  }
  return e?.message || 'Request failed';
}
