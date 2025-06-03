// hybridService.ts - VERSIÓN COMPLETA ACTUALIZADA
import axios from 'axios';
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { pool } from '../../database';
import { dateUtils } from './dateUtils';

// URL de la API local de Ollama
const OLLAMA_API_URL = process.env.OLLAMA_API_URL;

export const hybridService = {
  async processMessage(message: string, history: any[] = [], image?: string) {
    try {
      console.log('Procesando mensaje:', { message, historyLength: history?.length, hasImage: !!image });
      
      // Formatear el historial para el modelo
      const formattedHistory = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Crear el sistema prompt para instruir al modelo
      const systemPrompt = `Eres un asistente IA amigable y conversacional integrado en una aplicación de notas y recordatorios llamada Olympus Scribe.

      PERSONALIDAD Y TONO:
      - Habla de forma natural y cercana.
      - Usa un tono cálido y ocasionalmente incluye expresiones coloquiales apropiadas.
      - Varía la longitud de tus respuestas. A veces sé breve y directo, otras veces elabora más.
      - Personaliza tus respuestas basándote en el contexto de la conversación.
      - Muestra empatía y comprensión cuando sea apropiado.

      FUNCIONES DISPONIBLES (LIMITADAS):

      1. NOTAS:
        - Crear notas con los siguientes campos:
          * title (obligatorio): Título de la nota
          * content: Contenido de la nota

      2. RECORDATORIOS:
        - Crear recordatorios con los siguientes campos:
          * title (obligatorio): Título del recordatorio
          * description: Descripción detallada
          * date_time (obligatorio): Fecha y hora en formato ISO
          * has_time: true/false para indicar si incluye hora específica
          * send_email: true/false para recibir notificación por email
          * status_id: Estado del recordatorio (1=pendiente)

      3. BÚSQUEDA:
        - Buscar entre notas y recordatorios

      4. INFORMACIÓN:
        - Proporcionar información sobre datos guardados

      Cuando el usuario te pida crear una nota, responde en el siguiente formato:

      ACTION: {
        "action": "createNote",
        "data": {
          "title": "Título de la nota",
          "content": "Contenido de la nota"
        }
      }

      Para crear un recordatorio:

      ACTION: {
        "action": "createReminder",
        "data": {
          "title": "Título del recordatorio",
          "description": "Descripción del recordatorio",
          "date_time": "FECHA-ISO-8601",
          "has_time": true,
          "send_email": false,
          "status_id": 1
        }
      }

      Para buscar entre notas y recordatorios:

      ACTION: {
        "action": "searchNotes",
        "data": {
          "searchTerm": "término de búsqueda"
        }
      }

      Para proporcionar información:

      ACTION: {
        "action": "getInfo",
        "data": {
          "infoType": "notes" o "reminders" o "general"
        }
      }

      IMPORTANTE: Solo puedes realizar estas funciones. No incluyas comentarios en el formato JSON de las acciones. El formato date_time debe ser una fecha real en formato ISO 8601.

      Para cualquier otra solicitud, responde de manera conversacional y amigable sin el formato ACTION.`;
      
      let reminderPrompt = "";
      if (message.toLowerCase().includes('recordatorio') || 
          message.toLowerCase().includes('recordar') || 
          message.toLowerCase().includes('reunión') || 
          message.toLowerCase().includes('cita')) {
          
        reminderPrompt = `
        INSTRUCCIONES ESPECÍFICAS PARA RECORDATORIOS:
        
        Si el usuario está pidiendo crear un recordatorio:
        1. Identifica claramente la fecha y hora mencionadas
        2. Determina un título apropiado basado en el contenido
        3. Si se menciona "enviar por email" o similar, activa send_email
        
        IMPORTANTE: Si el usuario menciona "llamado X" o "llamada X", ese X DEBE ser el título del recordatorio.
        Por ejemplo, si el mensaje dice "recordatorio para mañana a las 12:00 llamado Cena familia", 
        el título debe ser exactamente "Cena familia".
        `;
      }

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
      
      // Intentar añadir contexto de notas si el mensaje lo requiere
      let notesContext = "";
      if (message.toLowerCase().includes('nota')) {
        try {
          const userId = history[0]?.userId;
          if (userId) {
            const notesResult = await this.getRecentNotes(userId);
            if (notesResult.length > 0) {
              notesContext = "\n\nNotas recientes:\n";
              notesResult.forEach(note => {
                notesContext += `- ID: ${note.id}, Título: "${note.title}", Última actualización: ${new Date(note.updated_at).toLocaleString()}\n`;
              });
            }
          }
        } catch (error) {
          console.error('Error al obtener contexto de notas:', error);
        }
      }

      let remindersContext = "";
      if (message.toLowerCase().includes('recordatorio') || 
          message.toLowerCase().includes('recordar') || 
          message.toLowerCase().includes('alarma') || 
          message.toLowerCase().includes('aviso') ||
          message.toLowerCase().includes('reunión') ||
          message.toLowerCase().includes('cita')) {
        
        try {
          const userId = history[0]?.userId;
          if (userId) {
            const remindersResult = await this.getRecentReminders(userId);
            if (remindersResult.length > 0) {
              remindersContext = "\n\nRecordatorios recientes:\n";
              remindersResult.forEach(reminder => {
                const statusText = reminder.status_id === 1 ? "pendiente" : 
                                  reminder.status_id === 2 ? "completado" : "cancelado";
                remindersContext += `- ID: ${reminder.id}, Título: "${reminder.title}", Fecha: ${new Date(reminder.date_time).toLocaleString()}, Estado: ${statusText}\n`;
              });
            }
          }
        } catch (error) {
          console.error('Error al obtener contexto de recordatorios:', error);
        }
      }

      // Procesar información de fecha/hora para recordatorios
      let dateTimeContext = "";
      if (message.toLowerCase().includes('recordatorio')) {
        const dateTimeInfo = dateUtils.extractDateTimeFromMessage(message);
        
        // Extraer título del mensaje para recordatorios
        let title = "";
        const llamadoPattern = /llamado\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
        const llamadoMatch = message.match(llamadoPattern);
        if (llamadoMatch && llamadoMatch[1]) {
          title = llamadoMatch[1].trim();
        }
        
        dateTimeContext = `\n\nPara crear recordatorios, usa esta fecha exacta: ${dateTimeInfo.dateTime}\n`;
        dateTimeContext += `Esta fecha corresponde a "${dateTimeInfo.originalText.date}" ${dateTimeInfo.originalText.time ? `a las ${dateTimeInfo.originalText.time}` : ""}\n`;
        dateTimeContext += `has_time debe ser: ${dateTimeInfo.hasTime}\n`;
        
        if (title) {
          dateTimeContext += `Título exacto del recordatorio: "${title}"\n`;
        }
      }
      
      // Añadir el mensaje actual
      const fullPrompt = `${prompt}${conversationHistory}${notesContext}${remindersContext}${dateTimeContext}${reminderPrompt}Usuario: ${message}\nAsistente:`;
      
      console.log('Enviando solicitud a Ollama...');
      
      // Llamar a la API de Ollama
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, {
        model: 'mistral',
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          presence_penalty: 0.6,
          frequency_penalty: 0.6
        }
      });
      
      // Extraer la respuesta
      const aiResponse = response.data.response;
      console.log('Respuesta de Ollama:', aiResponse);
      
      // Mejorar la respuesta si no es una acción
      if (!aiResponse.includes('ACTION:')) {
        const enhancedResponse = await this.enhanceResponse(aiResponse);
        console.log('Respuesta mejorada:', enhancedResponse);
        return enhancedResponse;
      }
      
      return aiResponse;
    } catch (error) {
      console.error('Error en hybrid service:', error);
      throw new Error('Error al procesar el mensaje');
    }
  },
  
  async detectIntent(aiResponse: string, originalMessage: string = '') {
    try {
      console.log('Detectando intención en respuesta:', aiResponse);
      
      if (!aiResponse) {
        return { action: null };
      }

      // Caso 1: Primero intentar extraer datos del JSON de la IA
      let jsonString = null;
      
      // Buscar formato ACTION: {}
      if (aiResponse.includes('ACTION:')) {
        const parts = aiResponse.split('ACTION:');
        if (parts.length >= 2) {
          const actionPart = parts[1].trim();
          const jsonMatch = actionPart.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
            
            try {
              // Limpiar comentarios del JSON antes de parsearlo
              jsonString = jsonString.replace(/\/\/.*$/gm, '');
              
              // Si es un recordatorio y el formato de fecha es incorrecto
              if (jsonString.includes('"action":"createReminder"') || 
                  jsonString.includes('"action": "createReminder"')) {
                
                // Si la fecha está en formato incorrecto, reemplazarla
                if (jsonString.includes('"date_time": "YYYY-MM-DDTHH:MM:SS"') || 
                    jsonString.includes('"date_time":"YYYY-MM-DDTHH:MM:SS"') ||
                    jsonString.includes('"date_time": "FECHA-ISO-8601"') ||
                    jsonString.includes('"date_time":"FECHA-ISO-8601"')) {
                  
                  // Extraer información de fecha/hora del mensaje original
                  const dateTimeInfo = dateUtils.extractDateTimeFromMessage(originalMessage);
                  
                  // Construir la fecha ISO manualmente para evitar conversión de zona horaria
                  const dateObj = new Date(dateTimeInfo.dateTime);
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  
                  // Usar la hora exacta especificada en el mensaje
                  let hour, minutes;
                  const timeAtMatch = originalMessage.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?/i);
                  if (timeAtMatch) {
                    hour = parseInt(timeAtMatch[1]);
                    minutes = timeAtMatch[2] ? parseInt(timeAtMatch[2]) : 0;
                  } else {
                    hour = 12;
                    minutes = 0;
                  }
                  
                  const hourStr = String(hour).padStart(2, '0');
                  const minutesStr = String(minutes).padStart(2, '0');
                  const exactDateTime = `${year}-${month}-${day}T${hourStr}:${minutesStr}:00`;
                  
                  // Reemplazar el placeholder con la fecha exacta
                  jsonString = jsonString.replace(/"date_time"\s*:\s*"[^"]*"/, `"date_time":"${exactDateTime}"`);
                  jsonString = jsonString.replace(/"has_time"\s*:\s*(true|false)/, `"has_time":true`);
                  
                  // También actualizar send_email si está disponible
                  if (dateTimeInfo.sendEmail !== undefined) {
                    jsonString = jsonString.replace(
                      /"send_email"\s*:\s*(true|false)/, 
                      `"send_email":${dateTimeInfo.sendEmail}`
                    );
                  }
                }
                
                // Extraer título más específicamente para "llamado" o "llamada"
                const llamadoPattern = /llamado\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
                const llamadoMatch = originalMessage.match(llamadoPattern);
                if (llamadoMatch && llamadoMatch[1]) {
                  const title = llamadoMatch[1].trim();
                  // Reemplazar el título en el JSON
                  jsonString = jsonString.replace(/"title"\s*:\s*"[^"]*"/, `"title":"${title}"`);
                }
              }
              
              const actionData = JSON.parse(jsonString);
              console.log('Intención detectada desde JSON:', actionData);
              return actionData;
            } catch (parseError) {
              console.error('Error al parsear JSON de la acción:', parseError, 'JSON string:', jsonString);
            }
          }
        }
      }
      
      // Caso 2: Si no se pudo extraer del JSON, buscar otros formatos
      
      // Buscar bloques de código markdown con JSON
      if (!jsonString) {
        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonString = codeBlockMatch[1];
          try {
            const actionData = JSON.parse(jsonString);
            console.log('Intención detectada desde bloque de código:', actionData);
            return actionData;
          } catch (parseError) {
            console.error('Error al parsear JSON del bloque de código:', parseError);
          }
        }
      }
      
      // Caso 3: Buscar JSON directo en la respuesta
      if (!jsonString) {
        const directJsonMatch = aiResponse.match(/\{[\s\S]*"action"\s*:\s*"[^"]+[\s\S]*\}/);
        if (directJsonMatch) {
          jsonString = directJsonMatch[0];
          try {
            const actionData = JSON.parse(jsonString);
            console.log('Intención detectada desde JSON directo:', actionData);
            return actionData;
          } catch (parseError) {
            console.error('Error al parsear JSON directo:', parseError);
          }
        }
      }
      
      // Caso 4: Si todo falla, crear un recordatorio manualmente si el mensaje lo sugiere
      if (originalMessage && (
        originalMessage.toLowerCase().includes('recordatorio') || 
        originalMessage.toLowerCase().includes('recordar')
      )) {
        // Extraer título del mensaje
        let title = "Recordatorio";
        const llamadoPattern = /llamado\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
        const llamadoMatch = originalMessage.match(llamadoPattern);
        if (llamadoMatch && llamadoMatch[1]) {
          title = llamadoMatch[1].trim();
        }
        
        // Extraer fecha y hora
        const dateTimeInfo = dateUtils.extractDateTimeFromMessage(originalMessage);
        
        // Construir la fecha ISO manualmente para evitar conversión de zona horaria
        const dateObj = new Date(dateTimeInfo.dateTime);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        // Usar la hora exacta especificada en el mensaje
        let hour, minutes;
        const timeAtMatch = originalMessage.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?/i);
        if (timeAtMatch) {
          hour = parseInt(timeAtMatch[1]);
          minutes = timeAtMatch[2] ? parseInt(timeAtMatch[2]) : 0;
        } else {
          hour = 12;
          minutes = 0;
        }
        
        const hourStr = String(hour).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const exactDateTime = `${year}-${month}-${day}T${hourStr}:${minutesStr}:00`;
        
        return {
          action: "createReminder",
          data: {
            title: title,
            description: originalMessage,
            date_time: exactDateTime,
            has_time: true,
            send_email: dateTimeInfo.sendEmail || false,
            status_id: 1
          }
        };
      }
      
      // Si el mensaje original contiene palabras clave de búsqueda
      if (originalMessage && (
        originalMessage.toLowerCase().includes('busca') || 
        originalMessage.toLowerCase().includes('encuentra') || 
        originalMessage.toLowerCase().includes('buscar') ||
        originalMessage.toLowerCase().includes('encontrar')
      )) {
        // Extraer término de búsqueda
        const searchTerm = originalMessage.replace(/busca|encuentra|buscar|encontrar|por favor|me puedes|podrías|entre mis notas|en mis notas|entre mis recordatorios|en mis recordatorios/gi, '').trim();
        
        if (searchTerm) {
          return {
            action: "searchNotes",
            data: {
              searchTerm: searchTerm
            }
          };
        }
      }

      // Si el mensaje original pide información
      if (originalMessage && (
        originalMessage.toLowerCase().includes('información sobre') || 
        originalMessage.toLowerCase().includes('datos de') || 
        originalMessage.toLowerCase().includes('estadísticas')
      )) {
        let infoType = 'general';
        
        if (originalMessage.toLowerCase().includes('nota')) {
          infoType = 'notes';
        } else if (originalMessage.toLowerCase().includes('recordatorio')) {
          infoType = 'reminders';
        }
        
        return {
          action: "getInfo",
          data: {
            infoType: infoType
          }
        };
      }
      
      console.log('No se detectó ninguna intención específica');
      return { action: null };
    } catch (error) {
      console.error('Error detectando intención:', error);
      return { action: null };
    }
  },

  // Método auxiliar para extraer el mensaje del usuario
  extractUserMessageFromResponse(aiResponse: string): string {
    // Buscar un patrón como "Usuario: [mensaje]" en la respuesta
    const userMessageMatch = aiResponse.match(/Usuario:\s*([^\n]+)/i);
    if (userMessageMatch && userMessageMatch[1]) {
      return userMessageMatch[1];
    }
    
    // Si no se encuentra, devolver un string vacío
    return "";
  },
  
  async getRecentNotes(userId: string) {
    try {
      const result = await pool.query(
        `SELECT id, title, updated_at FROM notes 
         WHERE user_id = $1 
         ORDER BY updated_at DESC 
         LIMIT 5`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener notas recientes:', error);
      return [];
    }
  },
  
  async getRecentReminders(userId: string) {
    try {
      const result = await pool.query(
        `SELECT id, title, description, date_time, has_time, send_email, status_id 
        FROM reminders 
        WHERE user_id = $1 
        ORDER BY date_time DESC 
        LIMIT 5`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener recordatorios recientes:', error);
      return [];
    }
  },

  // Método auxiliar para extraer un mejor título del mensaje del usuario
  extractBetterTitle(message: string): string {
    // Patrón específico para "llamado X" o "llamada X"
    const llamadoPattern = /llamado\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
    const llamadaPattern = /llamada\s+([^,.]+?)(?:\s*$|\s+(?:para|el|mañana|hoy))/i;
    
    const llamadoMatch = message.match(llamadoPattern);
    const llamadaMatch = message.match(llamadaPattern);
    
    if (llamadoMatch && llamadoMatch[1]) {
      return llamadoMatch[1].trim();
    } else if (llamadaMatch && llamadaMatch[1]) {
      return llamadaMatch[1].trim();
    }
    
    // Patrón 2: "se llame [título]"
    const seLlamePattern = /se\s+llame\s+(?:"|')?([^"',.]+)(?:"|')?/i;
    const seLlameMatch = message.match(seLlamePattern);
    if (seLlameMatch && seLlameMatch[1]) {
      return seLlameMatch[1].trim();
    }
    
    // Patrón 3: "título [título]"
    const tituloPattern = /título\s+(?:"|')?([^"',.]+)(?:"|')?/i;
    const tituloMatch = message.match(tituloPattern);
    if (tituloMatch && tituloMatch[1]) {
      return tituloMatch[1].trim();
    }
    
    // Reuniones específicas
    if (message.toLowerCase().includes('reunión') || message.toLowerCase().includes('reunion')) {
      if (message.toLowerCase().includes('comsa')) {
        return "Reunión Comsa";
      }
      
      const reunionPattern = /reuni[óo]n\s+(?:con|de|sobre)\s+([^,.]+)/i;
      const reunionMatch = message.match(reunionPattern);
      if (reunionMatch && reunionMatch[1]) {
        return `Reunión con ${reunionMatch[1].trim()}`;
      }
    }
    
    // Citas específicas
    if (message.toLowerCase().includes('cita')) {
      const citaMatch = message.match(/cita\s+(?:con|para)\s+([^,.]+)/i);
      if (citaMatch && citaMatch[1]) {
        return `Cita con ${citaMatch[1].trim()}`;
      }
    }
    
    // Si no se encontró un título específico
    return "";
  },

  async enhanceResponse(response: string) {
    // Si la respuesta contiene ACTION, no la modificamos
    if (response.includes('ACTION:')) {
      return response;
    }
    
    // Lista de posibles inicios conversacionales
    const conversationalStarters = [
      "", // A veces sin inicio
      "¡Claro! ",
      "¡Por supuesto! ",
      "¡Genial! ",
      "¡Perfecto! ",
      "¡Desde luego! ",
      "¡Hecho! ",
      "¡Entendido! ",
      "¡Excelente pregunta! ",
      "Mmm, ",
      "Bueno, ",
      "Pues ",
    ];   
    
    // Decidir si añadir un inicio conversacional (70% de probabilidad)
    let enhancedResponse = response;
    if (Math.random() < 0.7) {
      const randomStarter = conversationalStarters[Math.floor(Math.random() * conversationalStarters.length)];
      enhancedResponse = randomStarter + enhancedResponse;
    }

    return enhancedResponse;
  }
};
