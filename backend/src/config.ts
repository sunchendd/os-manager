import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  execution: {
    timeout: parseInt(process.env.EXECUTION_TIMEOUT || '30000'),
    maxOutputSize: parseInt(process.env.MAX_OUTPUT_SIZE || '1048576'),
  },
};

export function updateAIConfig(updates: Partial<typeof config.deepseek>) {
  if (updates.apiKey !== undefined) config.deepseek.apiKey = updates.apiKey;
  if (updates.baseURL !== undefined) config.deepseek.baseURL = updates.baseURL;
  if (updates.model !== undefined) config.deepseek.model = updates.model;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

// Note: DeepSeek is optional. OpenCode CLI is the recommended AI backend.
// If neither DeepSeek nor OpenCode is configured, the system falls back to mock mode.
