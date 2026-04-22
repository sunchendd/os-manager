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

if (!config.deepseek.apiKey) {
  console.warn('警告: DEEPSEEK_API_KEY 未设置，AI功能将无法使用');
}
