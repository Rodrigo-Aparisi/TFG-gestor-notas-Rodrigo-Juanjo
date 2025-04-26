// backend/src/config/openai.ts
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  // Usa un modelo que esté disponible en tu cuenta
  model: 'gpt-3.5-turbo', // Cambia a un modelo más básico para pruebas
  maxTokens: 2000,
  temperature: 0.7
};
