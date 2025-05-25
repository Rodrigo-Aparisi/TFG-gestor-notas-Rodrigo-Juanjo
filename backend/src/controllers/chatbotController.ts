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
    updateNote: [
      `¡Actualizado! Los cambios en "${itemName}" están guardados`,
      `He modificado la nota "${itemName}" como me pediste`,
      `¡Listo! La nota "${itemName}" ha sido actualizada`,
      `¡Cambios guardados en "${itemName}"! ¿Algo más que necesites?`
    ],
    deleteNote: [
      `He eliminado la nota "${itemName}"`,
      `La nota "${itemName}" ha sido borrada correctamente`,
      `¡Listo! La nota "${itemName}" ya no existe`,
      `"${itemName}" ha sido eliminada de tus notas`
    ],
    createReminder: [
      `¡Recordatorio creado! Te avisaré sobre "${itemName}" a tiempo`,
      `No te preocupes, te recordaré "${itemName}" cuando llegue el momento`,
      `He programado un recordatorio para "${itemName}" 📅`,
      `¡Perfecto! No olvidarás "${itemName}" gracias a este recordatorio`
    ],
    addImageToNote: [
      `¡Imagen añadida a "${itemName}"! Queda genial`,
      `He actualizado tu nota "${itemName}" con la imagen`,
      `¡Listo! La imagen ya está en tu nota "${itemName}"`,
      `La nota "${itemName}" ahora incluye la imagen que me enviaste`
    ],
    transcribeImage: [
      `¡He transcrito el texto de la imagen! Aquí tienes el resultado`,
      `Esto es lo que he podido extraer de la imagen`,
      `He convertido el texto de la imagen en palabras. ¿Es lo que necesitabas?`,
      `Aquí tienes la transcripción de la imagen`
    ],
    updateReminder: [
      `¡Recordatorio actualizado! He modificado "${itemName}" como me pediste 📝`,
      `He actualizado la información del recordatorio "${itemName}" 🔄`,
      `¡Listo! El recordatorio "${itemName}" ha sido actualizado con éxito ✅`,
      `Cambios guardados en el recordatorio "${itemName}" 📅`
    ],
    deleteReminder: [
      `He eliminado el recordatorio "${itemName}" 🗑️`,
      `El recordatorio "${itemName}" ha sido borrado correctamente ✓`,
      `¡Listo! El recordatorio "${itemName}" ya no existe 👌`,
      `"${itemName}" ha sido eliminado de tus recordatorios 🧹`
    ],
    updateReminderStatus: [
      `¡Estado actualizado! El recordatorio "${itemName}" ha cambiado de estado ✅`,
      `He modificado el estado del recordatorio "${itemName}" 🔄`,
      `El recordatorio "${itemName}" ahora tiene un nuevo estado 📝`,
      `¡Listo! Estado del recordatorio "${itemName}" actualizado correctamente 👍`
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
      const intentData = await hybridService.detectIntent(aiResponse);
      
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
                response: getRandomResponse('createNote', note.title) // Cambiado aquí
              });
            } catch (error) {
              console.error('Error al crear nota:', error);
              return res.status(500).json({
                error: 'Error al crear la nota'
              });
            }
            
          case 'updateNote':
            try {
              console.log('Actualizando nota');
              const noteId = intentData.data?.id;
              
              if (!noteId) {
                return res.status(400).json({
                  error: 'ID de nota no proporcionado'
                });
              }
              
              // Verificar si la nota existe y pertenece al usuario
              const noteExists = await pool.query(
                "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
                [noteId, userId]
              );
              
              if (noteExists.rows.length === 0) {
                return res.status(404).json({
                  error: 'Nota no encontrada'
                });
              }
              
              const updateData = {
                title: intentData.data?.title,
                content: intentData.data?.content,
                color: intentData.data?.color,
                is_pinned: intentData.data?.is_pinned,
                is_marked: intentData.data?.is_marked,
                images: intentData.data?.images
              };
              
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

              if (updateData.color !== undefined) {
                updateFields.push(`color = $${paramCount}`);
                values.push(updateData.color);
                paramCount++;
              }

              if (updateData.is_pinned !== undefined) {
                updateFields.push(`is_pinned = $${paramCount}`);
                values.push(updateData.is_pinned);
                paramCount++;
              }

              if (updateData.is_marked !== undefined) {
                updateFields.push(`is_marked = $${paramCount}`);
                values.push(updateData.is_marked);
                paramCount++;
              }
              
              updateFields.push(`updated_at = NOW()`);
              values.push(noteId, userId);
              
              const query = `
                UPDATE notes 
                SET ${updateFields.join(', ')} 
                WHERE id = $${paramCount} AND user_id = \$\${paramCount + 1}
                RETURNING *
              `;
              
              const result = await pool.query(query, values);
              const updatedNote = result.rows[0];
              
              return res.status(200).json({
                action: 'updateNote',
                noteData: {
                  id: updatedNote.id,
                  title: updatedNote.title
                },
                response: getRandomResponse('updateNote', updatedNote.title) // Cambiado aquí
              });
            } catch (error) {
              console.error('Error al actualizar nota:', error);
              return res.status(500).json({
                error: 'Error al actualizar la nota'
              });
            }
            
          case 'deleteNote':
            try {
              console.log('Eliminando nota');
              const noteId = intentData.data?.id;
              
              if (!noteId) {
                return res.status(400).json({
                  error: 'ID de nota no proporcionado'
                });
              }
              
              // Verificar si la nota existe y pertenece al usuario
              const noteExists = await pool.query(
                "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
                [noteId, userId]
              );
              
              if (noteExists.rows.length === 0) {
                return res.status(404).json({
                  error: 'Nota no encontrada'
                });
              }
              
              const noteTitleToDelete = noteExists.rows[0].title;
              
              // Eliminar la nota
              await pool.query(
                'DELETE FROM notes WHERE id = $1 AND user_id = $2',
                [noteId, userId]
              );
              
              return res.status(200).json({
                action: 'deleteNote',
                noteId: noteId,
                response: getRandomResponse('deleteNote', noteTitleToDelete) // Cambiado aquí
              });
            } catch (error) {
              console.error('Error al eliminar nota:', error);
              return res.status(500).json({
                error: 'Error al eliminar la nota'
              });
            }
            
          case 'createReminder':
            try {
              console.log('Creando recordatorio');
              
              // Verificar si la fecha proporcionada es válida
              let reminderDateTime;
              try {
                reminderDateTime = new Date(intentData.data?.date_time);
                if (isNaN(reminderDateTime.getTime())) {
                  throw new Error('Fecha inválida');
                }
              } catch (dateError) {
                // Si la fecha es inválida, extraerla del mensaje del usuario
                const userMessage = req.body.message;
                const dateTimeInfo = dateUtils.extractDateTimeFromMessage(userMessage);
                reminderDateTime = new Date(dateTimeInfo.dateTime);
              }
              
              const reminderData = {
                title: intentData.data?.title || 'Recordatorio sin título',
                description: intentData.data?.description || '',
                date_time: reminderDateTime,
                has_time: intentData.data?.has_time !== undefined ? intentData.data.has_time : true,
                send_email: intentData.data?.send_email !== undefined ? intentData.data.send_email : false,
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
                  response: getRandomResponse('createReminder', reminder.title) // Cambiado aquí
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
            
          case 'transcribeImage':
            console.log('Transcribiendo imagen');
            return res.status(200).json({
              action: 'transcribeImage',
              transcription: intentData.data?.text,
              response: getRandomResponse('transcribeImage', '') // Cambiado aquí
            });
            
          case 'addImageToNote':
            try {
              console.log('Añadiendo imagen a nota');
              const noteId = intentData.data?.id;
              const imageUrl = intentData.data?.imageUrl;
              
              if (!noteId || !imageUrl) {
                return res.status(400).json({
                  error: 'ID de nota o URL de imagen no proporcionados'
                });
              }
              
              // Verificar si la nota existe y pertenece al usuario
              const noteResult = await pool.query(
                "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
                [noteId, userId]
              );
              
              if (noteResult.rows.length === 0) {
                return res.status(404).json({
                  error: 'Nota no encontrada'
                });
              }
              
              const note = noteResult.rows[0];
              const currentImages = note.images || [];
              
              // Añadir la nueva imagen al array
              const updatedImages = [...currentImages, imageUrl];
              
              // Actualizar la nota con la nueva imagen
              const updateResult = await pool.query(
                "UPDATE notes SET images = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
                [updatedImages, noteId, userId]
              );
              
              const updatedNote = updateResult.rows[0];
              
             return res.status(200).json({
                action: 'addImageToNote',
                noteData: {
                  id: updatedNote.id,
                  title: updatedNote.title
                },
                response: getRandomResponse('addImageToNote', updatedNote.title) // Cambiado aquí
              });
            } catch (error) {
              console.error('Error al añadir imagen a nota:', error);
              return res.status(500).json({
                error: 'Error al añadir imagen a la nota'
              });
            }

          // Para actualizar un recordatorio:
          case 'updateReminder':
            try {
              console.log('Actualizando recordatorio');
              const reminderId = intentData.data?.id;
              
              if (!reminderId) {
                return res.status(400).json({
                  error: 'ID de recordatorio no proporcionado'
                });
              }
              
              // Verificar si el recordatorio existe y pertenece al usuario
              const reminderExists = await pool.query(
                "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
                [reminderId, userId]
              );
              
              if (reminderExists.rows.length === 0) {
                return res.status(404).json({
                  error: 'Recordatorio no encontrado'
                });
              }
              
              // Preparar datos para actualización
              const updateData: any = {};
              if (intentData.data?.title !== undefined) updateData.title = intentData.data.title;
              if (intentData.data?.description !== undefined) updateData.description = intentData.data.description;
              if (intentData.data?.date_time !== undefined) {
                try {
                  const dateTime = new Date(intentData.data.date_time);
                  if (!isNaN(dateTime.getTime())) {
                    updateData.date_time = dateTime;
                  }
                } catch (e) {
                  console.error('Fecha inválida:', e);
                }
              }
              if (intentData.data?.has_time !== undefined) updateData.has_time = intentData.data.has_time;
              if (intentData.data?.send_email !== undefined) updateData.send_email = intentData.data.send_email;
              if (intentData.data?.status_id !== undefined) updateData.status_id = intentData.data.status_id;
              
              // Construir la consulta dinámica
              const updateFields = [];
              const values = [];
              let paramCount = 1;
              
              for (const [key, value] of Object.entries(updateData)) {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
              }
              
              if (updateFields.length === 0) {
                return res.status(400).json({
                  error: 'No se proporcionaron campos para actualizar'
                });
              }
              
              updateFields.push(`updated_at = NOW()`);
              values.push(reminderId, userId);
              
              const query = `
                UPDATE reminders 
                SET ${updateFields.join(', ')} 
                WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
                RETURNING *
              `;
              
              const result = await pool.query(query, values);
              const updatedReminder = result.rows[0];
              
              return res.status(200).json({
                action: 'updateReminder',
                reminderData: {
                  id: updatedReminder.id,
                  title: updatedReminder.title,
                  date_time: updatedReminder.date_time
                },
                response: getRandomResponse('updateReminder', updatedReminder.title)
              });
            } catch (error) {
              console.error('Error al actualizar recordatorio:', error);
              return res.status(500).json({
                error: 'Error al actualizar el recordatorio'
              });
            }

          // Para eliminar un recordatorio:
          case 'deleteReminder':
            try {
              console.log('Eliminando recordatorio');
              const reminderId = intentData.data?.id;
              
              if (!reminderId) {
                return res.status(400).json({
                  error: 'ID de recordatorio no proporcionado'
                });
              }
              
              // Verificar si el recordatorio existe y pertenece al usuario
              const reminderExists = await pool.query(
                "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
                [reminderId, userId]
              );
              
              if (reminderExists.rows.length === 0) {
                return res.status(404).json({
                  error: 'Recordatorio no encontrado'
                });
              }
              
              const reminderTitleToDelete = reminderExists.rows[0].title;
              
              // Eliminar el recordatorio
              await pool.query(
                'DELETE FROM reminders WHERE id = $1 AND user_id = $2',
                [reminderId, userId]
              );
              
              return res.status(200).json({
                action: 'deleteReminder',
                reminderId: reminderId,
                response: getRandomResponse('deleteReminder', reminderTitleToDelete)
              });
            } catch (error) {
              console.error('Error al eliminar recordatorio:', error);
              return res.status(500).json({
                error: 'Error al eliminar el recordatorio'
              });
            }

          // Para actualizar el estado de un recordatorio:
          case 'updateReminderStatus':
            try {
              console.log('Actualizando estado de recordatorio');
              const reminderId = intentData.data?.id;
              const statusId = intentData.data?.status_id;
              
              if (!reminderId) {
                return res.status(400).json({
                  error: 'ID de recordatorio no proporcionado'
                });
              }
              
              if (!statusId || ![1, 2, 3].includes(statusId)) {
                return res.status(400).json({
                  error: 'Estado de recordatorio inválido'
                });
              }
              
              // Verificar si el recordatorio existe y pertenece al usuario
              const reminderExists = await pool.query(
                "SELECT * FROM reminders WHERE id = $1 AND user_id = $2",
                [reminderId, userId]
              );
              
              if (reminderExists.rows.length === 0) {
                return res.status(404).json({
                  error: 'Recordatorio no encontrado'
                });
              }
              
              const reminderTitle = reminderExists.rows[0].title;
              
              // Actualizar el estado del recordatorio
              const result = await pool.query(
                'UPDATE reminders SET status_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
                [statusId, reminderId, userId]
              );
              
              const updatedReminder = result.rows[0];
              const statusText = statusId === 1 ? "pendiente" : statusId === 2 ? "completado" : "cancelado";
              
              return res.status(200).json({
                action: 'updateReminderStatus',
                reminderData: {
                  id: updatedReminder.id,
                  title: updatedReminder.title,
                  status_id: updatedReminder.status_id
                },
                response: `He marcado el recordatorio "${reminderTitle}" como ${statusText}.`
              });
            } catch (error) {
              console.error('Error al actualizar estado de recordatorio:', error);
              return res.status(500).json({
                error: 'Error al actualizar el estado del recordatorio'
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
  },
  
  async uploadImage(req: Request, res: Response) {
    try {
      console.log('Subiendo imagen');
      // Si usas multer u otro middleware para subir archivos
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
      }
      
      const imageUrl = req.file.path || '';
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fullImageUrl = `${baseUrl}/${imageUrl}`;
      
      // Obtener la ruta absoluta del archivo para OCR
      const absolutePath = path.resolve(process.cwd(), imageUrl);
      console.log('Ruta absoluta de la imagen:', absolutePath);
      
      console.log('Imagen subida:', fullImageUrl);
      res.status(200).json({ 
        imageUrl: fullImageUrl,
        localPath: absolutePath // Esta es la ruta que usaremos para OCR
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({ error: 'Error al subir la imagen' });
    }
  },

  getRandomResponse
};