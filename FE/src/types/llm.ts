export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'google' | 'local';
  speed: 'fast' | 'slow';
  cost: '$' | '$$' | '$$$' | 'free';
}
