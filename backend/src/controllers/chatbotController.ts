// chatbotController.ts
import { Request, Response } from 'express';
import { hybridService } from '../utils/hybridService';
import { pool } from '../config/database';
import path from 'path';
import { NoteController } from '../controllers/noteController';
import { dateUtils } from '../utils/dateUtils';

const noteController = new NoteController();

// Definir la función getRandomResponse fuera del objeto chatbotController
function getRandomResponse(action: string, itemName: string): string {
  const responses: {[key: string]: string[]} = {
    createNote: [
      `¡Listo! He creado tu nota "${itemName}"`,
      `¡Nota creada! "${itemName}" está lista para ti`,
      `He guardado una nueva nota con el título "${itemName}"`,
      `¡Perfecto! Tu nota "${itemName}" ha sido creada correctamente`
    ],
    createReminder: [
      `¡Recordatorio creado! Te avisaré sobre "${itemName}" a tiempo`,
      `No te preocupes, te recordaré "${itemName}" cuando llegue el momento`,
      `He programado un recordatorio para "${itemName}" 📅`,
      `¡Perfecto! No olvidarás "${itemName}" gracias a este recordatorio`
    ],
    searchResults: [
      `He encontrado esto sobre "${itemName}"`,
      `Aquí tienes los resultados para "${itemName}"`,
      `Esto es lo que encontré sobre "${itemName}"`,
      `He buscado información sobre "${itemName}"`
    ],
    infoProvided: [
      `Aquí tienes la información sobre "${itemName}"`,
      `Esta es la información que tengo sobre "${itemName}"`,
      `Estos son los datos que encontré sobre "${itemName}"`,
      `Aquí está la información que solicitaste sobre "${itemName}"`
    ]
  };

  // Obtener respuestas para la acción o usar respuesta genérica
  const actionResponses = responses[action] || [
    `¡Listo! He completado la acción que me pediste`,
    `¡Hecho! ¿Hay algo más en lo que pueda ayudarte?`,
    `¡Tarea completada! ¿Necesitas algo más?`,
    `¡Perfecto! He terminado con lo que me pediste`
  ];
  
  // Seleccionar una respuesta aleatoria
  return actionResponses[Math.floor(Math.random() * actionResponses.length)];
}

export const chatbotController = {
  async processMessage(req: Request, res: Response) {
    try {
      console.log('Recibida solicitud en /chatbot/process');
      console.log('Body:', JSON.stringify(req.body));
      
      const { message, history, image } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        console.log('Error: Usuario no autenticado');
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      // Usar el servicio híbrido
      console.log('Llamando a hybridService.processMessage');
      const aiResponse = await hybridService.processMessage(message, history, image);
      console.log('Respuesta recibida del servicio híbrido');
      
      // Detectar intenciones
      const intentData = await hybridService.detectIntent(aiResponse, message);
      
      // Procesar según la intención detectada
      if (intentData && intentData.action) {
        switch (intentData.action) {
          case 'createNote':
            try {
              console.log('Creando nota');
              // Crear la nota directamente en la base de datos
              const noteData = {
                title: intentData.data?.title || 'Nota sin título',
                content: intentData.data?.content || '',
                color: intentData.data?.color || null,
                is_pinned: intentData.data?.is_pinned !== undefined ? intentData.data.is_pinned : false,
                is_marked: intentData.data?.is_marked !== undefined ? intentData.data.is_marked : false,
                user_id: userId,
                images: intentData.data?.images || []
              };
              
              console.log('Datos de la nota:', noteData);
              
              // Insertar nota en la base de datos usando el controlador
              const note = await noteController.createNoteInternal(noteData);
              console.log('Nota creada:', note);
              
              return res.status(200).json({
                action: 'createNote',
                noteData: {
                  id: note.id,
                  title: note.title
                },
                response: getRandomResponse('createNote', note.title)
              });
            } catch (error) {
              console.error('Error al crear nota:', error);
              return res.status(500).json({
                error: 'Error al crear la nota'
              });
            }
            
          case 'createReminder':
            try {
              console.log('Creando recordatorio');
              
              // Usar directamente los datos de intentData para mayor prioridad
              const userMessage = req.body.message;
              const messageIntent = req.body.messageIntent || {};
              
              // Determinar el título con prioridad clara
              let title = intentData.data?.title; // Usar el título de la IA primero
              
              // Si no hay título de la IA, usar el título del messageIntent
              if (!title && messageIntent?.details?.title) {
                title = messageIntent.details.title;
              }
              
              // Si aún no hay título, intentar extraer "llamado X" del mensaje
              if (!title) {
                const llamadoMatch = userMessage.match(/llamado\s+([^,.]+)(?:\s*$|\s+(?:para|el|mañana|hoy))/i);
                if (llamadoMatch && llamadoMatch[1]) {
                  title = llamadoMatch[1].trim();
                }
              }
              
              // Si todavía no hay título, usar uno genérico
              if (!title) {
                title = 'Recordatorio';
              }
              
              // Determinar fecha y hora
              // IMPORTANTE: Usar directamente la fecha y hora de intentData si está disponible
              let dateTime = intentData.data?.date_time;
              let hasTime = intentData.data?.has_time !== undefined ? intentData.data.has_time : true;
              
              // Si no hay fecha/hora en intentData, intentar usar messageIntent
              if (!dateTime && messageIntent.details?.hour !== undefined) {
                // Crear fecha para mañana con la hora especificada
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(
                  messageIntent.details.hour,
                  messageIntent.details.minutes || 0,
                  0,
                  0
                );
                dateTime = tomorrow.toISOString().split('.')[0];
              }
              
              // Si todavía no hay fecha/hora, usar dateUtils como último recurso
              if (!dateTime) {
                const dateTimeInfo = dateUtils.extractDateTimeFromMessage(userMessage);
                dateTime = dateTimeInfo.dateTime;
                hasTime = dateTimeInfo.hasTime;
              }
              
              // Verificar si quiere email
              const wantsEmail = messageIntent.wantsEmail || 
                                userMessage.toLowerCase().includes('email') || 
                                userMessage.toLowerCase().includes('correo') || 
                                userMessage.toLowerCase().includes('mandes');
              
              // Construir los datos del recordatorio
              const reminderData = {
                title: title,
                description: intentData.data?.description || userMessage,
                date_time: dateTime,
                has_time: hasTime,
                send_email: intentData.data?.send_email !== undefined ? intentData.data.send_email : wantsEmail,
                status_id: intentData.data?.status_id !== undefined ? intentData.data.status_id : 1,
                user_id: userId
              };
              
              console.log('Datos del recordatorio:', reminderData);
              
              try {
                // Insertar recordatorio en la base de datos
                const reminderResult = await pool.query(
                  `INSERT INTO reminders (title, description, date_time, has_time, send_email, status_id, user_id) 
                  VALUES ($1, $2, $3, $4, $5, $6, $7) 
                  RETURNING *`,
                  [
                    reminderData.title, 
                    reminderData.description, 
                    reminderData.date_time, 
                    reminderData.has_time, 
                    reminderData.send_email,
                    reminderData.status_id,
                    reminderData.user_id
                  ]
                );
                
                const reminder = reminderResult.rows[0];
                console.log('Recordatorio creado:', reminder);
                
                return res.status(200).json({
                  action: 'createReminder',
                  reminderData: {
                    id: reminder.id,
                    title: reminder.title,
                    date_time: reminder.date_time
                  },
                  response: getRandomResponse('createReminder', reminder.title)
                });
              } catch (dbError) {
                console.error('Error en la base de datos:', dbError);
                return res.status(200).json({
                  action: 'reply',
                  response: `Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.`
                });
              }
            } catch (error) {
              console.error('Error al crear recordatorio:', error);
              return res.status(200).json({
                action: 'reply',
                response: `Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.`
              });
            }
            
          case 'searchNotes':
            try {
              console.log('Buscando entre notas y recordatorios');
              const searchTerm = intentData.data?.searchTerm || '';
              
              // Buscar en notas
              const notesResult = await pool.query(
                `SELECT * FROM notes 
                WHERE user_id = $1 AND (
                  title ILIKE $2 OR 
                  content ILIKE $2
                )
                ORDER BY updated_at DESC
                LIMIT 5`,
                [userId, `%${searchTerm}%`]
              );
              
              // Buscar en recordatorios
              const remindersResult = await pool.query(
                `SELECT * FROM reminders 
                WHERE user_id = $1 AND (
                  title ILIKE $2 OR 
                  description ILIKE $2
                )
                ORDER BY date_time DESC
                LIMIT 5`,
                [userId, `%${searchTerm}%`]
              );
              
              return res.status(200).json({
                action: 'searchResults',
                results: {
                  notes: notesResult.rows,
                  reminders: remindersResult.rows
                },
                response: getRandomResponse('searchResults', searchTerm)
              });
            } catch (error) {
              console.error('Error al buscar:', error);
              return res.status(500).json({
                error: 'Error al buscar entre notas y recordatorios'
              });
            }
            
          case 'getInfo':
            try {
              console.log('Proporcionando información');
              const infoType = intentData.data?.infoType || 'general';
              
              let infoData = {};
              
              if (infoType === 'notes') {
                // Obtener estadísticas de notas
                const notesStats = await pool.query(
                  `SELECT COUNT(*) as total, 
                  COUNT(*) FILTER (WHERE is_pinned = true) as pinned,
                  COUNT(*) FILTER (WHERE is_marked = true) as marked
                  FROM notes WHERE user_id = $1`,
                  [userId]
                );
                
                infoData = {
                  ...notesStats.rows[0]
                };
              } 
              else if (infoType === 'reminders') {
                // Obtener estadísticas de recordatorios
                const remindersStats = await pool.query(
                  `SELECT COUNT(*) as total, 
                  COUNT(*) FILTER (WHERE status_id = 1) as pending,
                  COUNT(*) FILTER (WHERE status_id = 2) as completed,
                  COUNT(*) FILTER (WHERE status_id = 3) as cancelled
                  FROM reminders WHERE user_id = $1`,
                  [userId]
                );
                
                infoData = {
                  ...remindersStats.rows[0]
                };
              }
              else {
                // Información general
                const notesCount = await pool.query(
                  `SELECT COUNT(*) FROM notes WHERE user_id = $1`,
                  [userId]
                );
                
                const remindersCount = await pool.query(
                  `SELECT COUNT(*) FROM reminders WHERE user_id = $1`,
                  [userId]
                );
                
                infoData = {
                  notesCount: notesCount.rows[0].count,
                  remindersCount: remindersCount.rows[0].count
                };
              }
              
              return res.status(200).json({
                action: 'infoProvided',
                infoData: infoData,
                response: getRandomResponse('infoProvided', infoType)
              });
            } catch (error) {
              console.error('Error al proporcionar información:', error);
              return res.status(500).json({
                error: 'Error al proporcionar información'
              });
            }
        }
      }
      
      // Si no hay acción específica, devolver la respuesta normal
      console.log('Enviando respuesta normal');
      return res.status(200).json({
        action: 'reply',
        response: aiResponse
      });
      
    } catch (error) {
      console.error('Error detallado en chatbotController:', error);
      res.status(500).json({ 
        error: 'Error al procesar el mensaje',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
};