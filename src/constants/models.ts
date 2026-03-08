import { LLMModel } from '@/types/llm';

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', speed: 'fast', cost: '$' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', speed: 'slow', cost: '$$$' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', speed: 'fast', cost: '$' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', speed: 'slow', cost: '$$' },
  { id: 'llama-3', name: 'Llama 3 (Local)', provider: 'local', speed: 'fast', cost: 'free' },
];

export const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'google', name: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'codellama'] },
];
