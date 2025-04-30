import axios from 'axios';
import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/database';

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
      Ayudas a los usuarios a gestionar sus notas y recordatorios, y puedes crear, editar y eliminar elementos 
      a partir de sus solicitudes.

      FUNCIONES DISPONIBLES:
      1. Crear notas
      2. Editar notas existentes
      3. Eliminar notas
      4. Añadir imágenes a notas
      5. Crear recordatorios
      6. Transcribir imágenes a texto

      Cuando el usuario te pida crear una nota o recordatorio, responde en el siguiente formato:

      ACTION: {
        "action": "createNote",
        "data": {
          "title": "Título de la nota",
          "content": "Contenido de la nota",
          "color": "#hexcolor", (opcional)
          "images": [] (opcional, array de URLs de imágenes)
        }
      }

      Para editar una nota existente:

      ACTION: {
        "action": "updateNote",
        "data": {
          "id": "id-de-la-nota",
          "title": "Nuevo título", (opcional)
          "content": "Nuevo contenido", (opcional)
          "images": [] (opcional, array de URLs de imágenes)
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
                notesContext += `- ID: ${note.id}, Título: "${note.title}", Última actualización: \${new Date(note.updated_at).toLocaleString()}\n`;
              });
            }
          }
        } catch (error) {
          console.error('Error al obtener contexto de notas:', error);
        }
      }
      
      // Añadir el mensaje actual
      const fullPrompt = `${prompt}${conversationHistory}${notesContext}Usuario: ${message}\nAsistente:`;
      
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
  }
};
