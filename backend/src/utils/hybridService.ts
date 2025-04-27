import axios from 'axios';
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

// URL de la API local de Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api';

export const hybridService = {
  async processMessage(message: string, history: any[] = [], image?: string) {
    try {
      console.log('Procesando mensaje:', { message, historyLength: history?.length, hasImage: !!image });
      
      // Si hay una imagen, procesarla con OCR
      if (image) {
        return this.processImageWithOCR(image, message);
      }
      
      // Formatear el historial para el modelo
      const formattedHistory = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Crear el sistema prompt para instruir al modelo
      const systemPrompt = `Eres un asistente IA integrado en una aplicación de notas y recordatorios. 
      Ayudas a los usuarios a gestionar sus notas y recordatorios, y puedes crear nuevos elementos 
      a partir de sus solicitudes.

      FUNCIONES DISPONIBLES:
      1. Crear notas
      2. Crear recordatorios
      3. Transcribir imágenes a texto

      Cuando el usuario te pida crear una nota o recordatorio, responde en el siguiente formato:

      ACTION: {
        "action": "createNote",
        "data": {
          "title": "Título de la nota",
          "content": "Contenido de la nota",
          "color": "#hexcolor" (opcional)
        }
      }

      ACTION: {
        "action": "createReminder",
        "data": {
          "title": "Título del recordatorio",
          "description": "Descripción del recordatorio",
          "date_time": "YYYY-MM-DDTHH:MM:SS",
          "has_time": true/false
        }
      }

      Para cualquier otra solicitud, responde normalmente sin el formato ACTION.
      Recuerda que eres parte de una aplicación de notas, así que siempre orienta tus respuestas en ese contexto.`;
      
      // Crear el prompt completo para enviar a Ollama
      const prompt = `${systemPrompt}\n\n`;
      
      // Añadir el historial de conversación
      let conversationHistory = "";
      formattedHistory.forEach(msg => {
        if (msg.role === 'user') {
          conversationHistory += `Usuario: ${msg.content}\n`;
        } else {
          conversationHistory += `Asistente: ${msg.content}\n`;
        }
      });
      
      // Añadir el mensaje actual
      const fullPrompt = `${prompt}${conversationHistory}Usuario: ${message}\nAsistente:`;
      
      console.log('Enviando solicitud a Ollama...');
      
      // Llamar a la API de Ollama
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
        model: 'mistral',
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      });
      
      // Extraer la respuesta
      const aiResponse = response.data.response;
      console.log('Respuesta de Ollama:', aiResponse);
      
      return aiResponse;
    } catch (error) {
      console.error('Error en hybrid service:', error);
      throw new Error('Error al procesar el mensaje');
    }
  },
  
  async processImageWithOCR(imagePath: string, userPrompt: string) {
    try {
      console.log('Procesando imagen con OCR:', imagePath);
      
      // Verificar que la ruta de la imagen sea válida
      if (!fs.existsSync(imagePath)) {
        console.error('La imagen no existe en la ruta:', imagePath);
        return `ACTION: {"action":"transcribeImage","data":{"text":"Error: No se pudo encontrar la imagen"}}`;
      }
      
      // Configurar Tesseract - método actualizado para la versión actual
      console.log('Creando worker de Tesseract...');
      
      // Crear el worker con la configuración adecuada para la versión actual
      const worker = await createWorker('spa+eng');
      
      // Procesar la imagen
      console.log('Iniciando reconocimiento OCR...');
      const result = await worker.recognize(imagePath);
      const extractedText = result.data.text;
      
      // Liberar recursos
      await worker.terminate();
      
      console.log('Texto extraído de la imagen:', extractedText.substring(0, 100) + '...');
      
      // Formatear la respuesta según el prompt del usuario
      if (userPrompt.toLowerCase().includes('transcribe') || 
          userPrompt.toLowerCase().includes('transcribir') ||
          userPrompt.toLowerCase().includes('texto') ||
          userPrompt.toLowerCase().includes('extraer')) {
        
        return `ACTION: {"action":"transcribeImage","data":{"text":"${extractedText.replace(/"/g, '\\"')}"}}`;
      } 
      else if (userPrompt.toLowerCase().includes('nota') || 
               userPrompt.toLowerCase().includes('guardar')) {
        
        const title = extractedText.split('\n')[0].substring(0, 50) || 'Nota de imagen';
        
        return `ACTION: {"action":"createNote","data":{"title":"${title.replace(/"/g, '\\"')}","content":"${extractedText.replace(/"/g, '\\"')}"}}`;
      } 
      else {
        return `He extraído el siguiente texto de la imagen:\n\n${extractedText}\n\n¿Qué te gustaría hacer con este texto? Puedo crear una nota o un recordatorio con él.`;
      }
    } catch (error) {
      console.error('Error en OCR:', error);
      return `ACTION: {"action":"transcribeImage","data":{"text":"Error al procesar la imagen"}}`;
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
