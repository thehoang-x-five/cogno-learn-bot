/**
 * Base API service — wraps mock data with simulated network delay.
 * Replace `delay()` + local data with real `fetch()` calls when backend is ready.
 */

import { MOCK_API_DELAY } from '@/constants/enums';

// ─── Helpers ───────────────────────────────────────────
const delay = (ms?: number) =>
  new Promise<void>((r) =>
    setTimeout(r, ms ?? Math.random() * (MOCK_API_DELAY.max - MOCK_API_DELAY.min) + MOCK_API_DELAY.min)
  );

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { data, success: true, message };
}

// ─── Generic CRUD helper (works with any entity array) ─
export async function mockList<T>(items: T[]): Promise<ApiResponse<T[]>> {
  await delay();
  return ok([...items]);
}

export async function mockGet<T extends { id: string }>(items: T[], id: string): Promise<ApiResponse<T | null>> {
  await delay();
  return ok(items.find((i) => i.id === id) || null);
}

export async function mockCreate<T>(items: T[], item: T): Promise<ApiResponse<T>> {
  await delay();
  items.unshift(item);
  return ok(item, 'Created');
}

export async function mockUpdate<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): Promise<ApiResponse<T | null>> {
  await delay();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return { data: null, success: false, message: 'Not found' };
  items[idx] = { ...items[idx], ...patch };
  return ok(items[idx], 'Updated');
}

export async function mockDelete<T extends { id: string }>(items: T[], id: string): Promise<ApiResponse<boolean>> {
  await delay();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return { data: false, success: false, message: 'Not found' };
  items.splice(idx, 1);
  return ok(true, 'Deleted');
}

export { delay };
