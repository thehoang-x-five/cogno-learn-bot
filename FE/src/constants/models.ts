import { LLMModel } from '@/types/llm';

export const AVAILABLE_MODELS: LLMModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    speed: 'fast',
    cost: 'free',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'google',
    speed: 'fast',
    cost: 'free',
  },
];

export const LLM_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  },
];