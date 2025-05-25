import axios from 'axios';
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/database';
import { dateUtils } from './dateUtils';

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
      const systemPrompt = `Eres un asistente IA amigable y conversacional integrado en una aplicación de notas y recordatorios llamada Olympus Scribe.

      PERSONALIDAD Y TONO:
      - Habla de forma natural y cercana.
      - Usa un tono cálido y ocasionalmente incluye expresiones coloquiales apropiadas.
      - Varía la longitud de tus respuestas. A veces sé breve y directo, otras veces elabora más.
      - Personaliza tus respuestas basándote en el contexto de la conversación.
      - Muestra empatía y comprensión cuando sea apropiado.
      - Evita estructuras repetitivas en tus respuestas.

      FUNCIONES DISPONIBLES:

      1. NOTAS:
        - Crear notas con los siguientes campos:
          * title (obligatorio): Título de la nota
          * content: Contenido de la nota
          * color: Color en formato hexadecimal (ej: #f1c40f)
          * is_pinned: true/false para destacar la nota
          * is_marked: true/false para marcar la nota como importante
          * images: Array de URLs de imágenes

        - Editar notas existentes (cualquiera de los campos anteriores)
        - Eliminar notas
        - Añadir imágenes a notas existentes

      2. RECORDATORIOS:
        - Crear recordatorios con los siguientes campos:
          * title (obligatorio): Título del recordatorio
          * description: Descripción detallada
          * date_time (obligatorio): Fecha y hora en formato ISO
          * has_time: true/false para indicar si incluye hora específica
          * send_email: true/false para recibir notificación por email
          * status_id: Estado del recordatorio (1=pendiente, 2=completado, 3=cancelado)

        - Editar recordatorios existentes (cualquiera de los campos anteriores)
        - Eliminar recordatorios
        - Cambiar estado de recordatorios

      3. TRANSCRIPCIÓN DE IMÁGENES:
        - Transcribir texto de imágenes

      Cuando el usuario te pida crear o modificar una nota, responde en el siguiente formato:

      ACTION: {
        "action": "createNote",
        "data": {
          "title": "Título de la nota",
          "content": "Contenido de la nota",
          "color": "#hexcolor",
          "is_pinned": false,
          "is_marked": false,
          "images": []
        }
      }

      Para editar una nota existente:

      ACTION: {
        "action": "updateNote",
        "data": {
          "id": "id-de-la-nota",
          "title": "Nuevo título",
          "content": "Nuevo contenido",
          "color": "#hexcolor",
          "is_pinned": false,
          "is_marked": false,
          "images": []
        }
      }

      Para eliminar una nota:

      ACTION: {
        "action": "deleteNote",
        "data": {
          "id": "id-de-la-nota"
        }
      }

      Para añadir una imagen a una nota existente:

      ACTION: {
        "action": "addImageToNote",
        "data": {
          "id": "id-de-la-nota",
          "imageUrl": "url-de-la-imagen"
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

      Para actualizar un recordatorio existente:

      ACTION: {
        "action": "updateReminder",
        "data": {
          "id": "id-del-recordatorio",
          "title": "Nuevo título",
          "description": "Nueva descripción",
          "date_time": "FECHA-ISO-8601",
          "has_time": true,
          "send_email": false,
          "status_id": 1
        }
      }

      Para eliminar un recordatorio:

      ACTION: {
        "action": "deleteReminder",
        "data": {
          "id": "id-del-recordatorio"
        }
      }

      Para cambiar el estado de un recordatorio:

      ACTION: {
        "action": "updateReminderStatus",
        "data": {
          "id": "id-del-recordatorio",
          "status_id": 2
        }
      }

      IMPORTANTE: No incluyas comentarios en el formato JSON de las acciones. El formato date_time debe ser una fecha real en formato ISO 8601.

      Para cualquier otra solicitud, responde de manera conversacional y amigable sin el formato ACTION.
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
      
      // Intentar añadir contexto de notas si el mensaje lo requiere
      let notesContext = "";
      if (message.toLowerCase().includes('nota') || 
          message.toLowerCase().includes('editar') || 
          message.toLowerCase().includes('modificar') || 
          message.toLowerCase().includes('eliminar') || 
          message.toLowerCase().includes('borrar')) {
        
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
        dateTimeContext = `\n\nPara crear recordatorios, usa esta fecha exacta: ${dateTimeInfo.dateTime}\n`;
        dateTimeContext += `Esta fecha corresponde a "${dateTimeInfo.originalText.date}" ${dateTimeInfo.originalText.time ? `a las ${dateTimeInfo.originalText.time}` : ""}\n`;
        dateTimeContext += `has_time debe ser: ${dateTimeInfo.hasTime}\n`;
      }
      
      // Añadir el mensaje actual
      const fullPrompt = `${prompt}${conversationHistory}${notesContext}${remindersContext}${dateTimeContext}Usuario: \${message}\nAsistente:`;
      
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
        
        return `ACTION: {"action":"transcribeImage","data":{"text":"\${extractedText.replace(/"/g, '\\"')}"}}`;
      } 
      else if (userPrompt.toLowerCase().includes('nota') || 
               userPrompt.toLowerCase().includes('guardar')) {
        
        const title = extractedText.split('\n')[0].substring(0, 50) || 'Nota de imagen';
        
        // Si se menciona alguna nota existente para añadir la imagen
        if (userPrompt.toLowerCase().includes('añadir a') || 
            userPrompt.toLowerCase().includes('agregar a') ||
            userPrompt.toLowerCase().includes('adjuntar a')) {
          
          // Intentar extraer un ID de nota del prompt
          const idMatch = userPrompt.match(/\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/);
          
          if (idMatch && idMatch[1]) {
            return `ACTION: {"action":"addImageToNote","data":{"id":"${idMatch[1]}","imageUrl":"${imagePath.replace(/"/g, '\\"')}"}}`;
          }
        }
        
        // Por defecto, crear una nueva nota con la imagen
        return `ACTION: {"action":"createNote","data":{"title":"${title.replace(/"/g, '\\"')}","content":"${extractedText.replace(/"/g, '\\"')}","images":["\${imagePath.replace(/"/g, '\\"')}"]}}`; 
      } 
      else {
        return `He extraído el siguiente texto de la imagen:\n\n\${extractedText}\n\n¿Qué te gustaría hacer con este texto? Puedo crear una nota o un recordatorio con él.`;
      }
    } catch (error) {
      console.error('Error en OCR:', error);
      return `ACTION: {"action":"transcribeImage","data":{"text":"Error al procesar la imagen"}}`;
    }
  },
  
  async detectIntent(aiResponse: string) {
    try {
      console.log('Detectando intención en respuesta:', aiResponse);
      
      if (!aiResponse) {
        return { action: null };
      }
      
      let jsonString = null;
      
      // Caso 1: Buscar formato ACTION: {}
      if (aiResponse.includes('ACTION:')) {
        const parts = aiResponse.split('ACTION:');
        if (parts.length >= 2) {
          const actionPart = parts[1].trim();
          const jsonMatch = actionPart.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          }
        }
      }
      
      // Caso 2: Buscar bloques de código markdown con JSON
      if (!jsonString) {
        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonString = codeBlockMatch[1];
        }
      }
      
      // Caso 3: Buscar JSON directo en la respuesta
      if (!jsonString) {
        const directJsonMatch = aiResponse.match(/\{[\s\S]*"action"\s*:\s*"[^"]+[\s\S]*\}/);
        if (directJsonMatch) {
          jsonString = directJsonMatch[0];
        }
      }
      
      // Si encontramos un JSON, procesarlo
      if (jsonString) {
        try {
          // Limpiar comentarios del JSON antes de parsearlo
          jsonString = jsonString.replace(/\/\/.*\$/gm, '');
          
          // Verificar si es una acción de recordatorio y tiene un formato de fecha incorrecto
          if (jsonString.includes('"action":"createReminder"') || 
              jsonString.includes('"action": "createReminder"')) {
            
            // Si la fecha está en formato incorrecto, reemplazarla
            if (jsonString.includes('"date_time": "YYYY-MM-DDTHH:MM:SS"') || 
                jsonString.includes('"date_time":"YYYY-MM-DDTHH:MM:SS"') ||
                jsonString.includes('"date_time": "FECHA-ISO-8601"') ||
                jsonString.includes('"date_time":"FECHA-ISO-8601"')) {
              
              // Extraer mensaje del usuario o usar mensaje directo
              const userMessage = aiResponse.includes("Usuario:") ? 
                this.extractUserMessageFromResponse(aiResponse) : 
                "recordatorio mañana a las 12";
              
              // Usar la utilidad de fechas para extraer la fecha y hora
              const dateTimeInfo = dateUtils.extractDateTimeFromMessage(userMessage);
              
              // Reemplazar el placeholder con la fecha real
              jsonString = jsonString.replace(/"date_time"\s*:\s*"[^"]*"/, `"date_time":"${dateTimeInfo.dateTime}"`);
              jsonString = jsonString.replace(/"has_time"\s*:\s*(true|false)/, `"has_time":${dateTimeInfo.hasTime}`);
            }
          }
          
          const actionData = JSON.parse(jsonString);
          console.log('Intención detectada:', actionData);
          return actionData;
        } catch (parseError) {
          console.error('Error al parsear JSON de la acción:', parseError, 'JSON string:', jsonString);
          
          // Intento de recuperación manual para recordatorios
          if (aiResponse.toLowerCase().includes('recordatorio')) {
            const userMessage = aiResponse.includes("Usuario:") ? 
              this.extractUserMessageFromResponse(aiResponse) : 
              "recordatorio mañana a las 12";
              
            const dateTimeInfo = dateUtils.extractDateTimeFromMessage(userMessage);
            
            // Extraer título entre comillas si existe
            const titleMatch = aiResponse.match(/"([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : "Recordatorio";
            
            return {
              action: "createReminder",
              data: {
                title: title,
                description: "",
                date_time: dateTimeInfo.dateTime,
                has_time: dateTimeInfo.hasTime
              }
            };
          }
          
          return { action: null };
        }
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
         WHERE user_id = \$1 
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
  
  async getNoteById(noteId: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM notes 
         WHERE id = $1 AND user_id = $2`,
        [noteId, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al obtener nota por ID:', error);
      return null;
    }
  },
  
  async updateNote(noteId: string, userId: string, updateData: any) {
    try {
      // Construir la consulta dinámica
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        values.push(updateData.title);
        paramCount++;
      }
      
      if (updateData.content !== undefined) {
        updateFields.push(`content = $${paramCount}`);
        values.push(updateData.content);
        paramCount++;
      }
      
      if (updateData.images !== undefined) {
        updateFields.push(`images = $${paramCount}`);
        values.push(updateData.images);
        paramCount++;
      }
      
      if (updateFields.length === 0) {
        return null; // No hay nada que actualizar
      }
      
      // Añadir campo updated_at
      updateFields.push(`updated_at = NOW()`);
      
      // Añadir parámetros de where
      values.push(noteId, userId);
      
      const query = `
        UPDATE notes 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} AND user_id = \$\${paramCount + 1}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      throw error;
    }
  },
  
  async addImageToNote(noteId: string, userId: string, imageUrl: string) {
    try {
      // Primero obtener la nota actual para ver sus imágenes
      const noteResult = await pool.query(
        `SELECT * FROM notes WHERE id = $1 AND user_id = $2`,
        [noteId, userId]
      );
      
      if (noteResult.rows.length === 0) {
        throw new Error('Nota no encontrada');
      }
      
      const note = noteResult.rows[0];
      const currentImages = note.images || [];
      
      // Añadir la nueva imagen al array
      const updatedImages = [...currentImages, imageUrl];
      
      // Actualizar la nota con la nueva imagen
      const updateResult = await pool.query(
        `UPDATE notes SET images = $1, updated_at = NOW() WHERE id = $2 AND user_id = \$3 RETURNING *`,
        [updatedImages, noteId, userId]
      );
      
      return updateResult.rows[0];
    } catch (error) {
      console.error('Error al añadir imagen a nota:', error);
      throw error;
    }
  },
  
  async deleteNote(noteId: string, userId: string) {
    try {
      // Verificar que la nota existe y pertenece al usuario
      const noteExists = await pool.query(
        `SELECT * FROM notes WHERE id = $1 AND user_id = $2`,
        [noteId, userId]
      );
      
      if (noteExists.rows.length === 0) {
        throw new Error('Nota no encontrada');
      }
      
      // Eliminar la nota
      await pool.query(
        `DELETE FROM notes WHERE id = $1 AND user_id = $2`,
        [noteId, userId]
      );
      
      return noteExists.rows[0]; // Devolver la nota eliminada
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      throw error;
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