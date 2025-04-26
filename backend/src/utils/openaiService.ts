// backend/src/utils/openaiService.ts
import OpenAI from 'openai';
import { openaiConfig } from '../config/openai';
import { systemPrompt, imagePrompt } from './chatbotPrompts';

// Crear instancia de OpenAI
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey
});

// Importar tipos directamente de la biblioteca de OpenAI
import { ChatCompletionMessageParam } from 'openai/resources';

export const openaiService = {
  async processMessage(message: string, history: any[] = [], image?: string) {
    try {
      console.log('openaiService.processMessage llamado con:', { 
        messageLength: message?.length, 
        historyLength: history?.length, 
        hasImage: !!image 
      });      

      // Incluir el prompt del sistema
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];
      
      // Añadir historial si existe
      if (history && history.length > 0) {
        history.forEach(msg => {
          if (msg && msg.text) {
            messages.push({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            });
          }
        });
      }
      
      // Si hay imagen, añadir un prompt específico para ella
      if (image) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: `${imagePrompt}\n\n${message}` },
            { type: 'image_url', image_url: { url: image } }
          ] as any // Usamos 'as any' para evitar problemas de tipo con contenido mixto
        });
      } else {
        messages.push({
          role: 'user',
          content: message
        });
      }

      console.log('Enviando solicitud a OpenAI con modelo:', openaiConfig.model);
      console.log('API Key configurada:', !!openaiConfig.apiKey);
      
      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages,
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
      });

      console.log('Respuesta recibida de OpenAI');
      
      const responseContent = response.choices[0]?.message?.content || '';
      return responseContent;
    } catch (error) {
      console.error('Error en OpenAI Service:', error);
      throw new Error('Error al procesar el mensaje con OpenAI');
    }
  },
  
  async detectIntent(aiResponse: string) {
    // Intentar extraer JSON de la respuesta si contiene formato específico
    try {
      console.log('Detectando intención en respuesta:', aiResponse);
      
      if (!aiResponse) {
        return { action: null };
      }
      
      if (aiResponse.includes('ACTION:')) {
        const parts = aiResponse.split('ACTION:');
        if (parts.length < 2) {
          return { action: null };
        }
        
        const actionPart = parts[1].trim();
        const jsonMatch = actionPart.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            const actionData = JSON.parse(jsonMatch[0]);
            console.log('Intención detectada:', actionData);
            return actionData;
          } catch (parseError) {
            console.error('Error al parsear JSON de la acción:', parseError);
            return { action: null };
          }
        }
      }
      
      console.log('No se detectó ninguna intención específica');
      return { action: null };
    } catch (error) {
      console.error('Error detectando intención:', error);
      return { action: null };
    }
  }
};
