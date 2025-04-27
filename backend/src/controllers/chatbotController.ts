import { Request, Response } from 'express';
import { hybridService } from '../utils/hybridService';
import { pool } from '../config/database';
import path from 'path';

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
                color: intentData.data?.color,
                user_id: userId,
                images: intentData.data?.images || []
              };
              
              console.log('Datos de la nota:', noteData);
              
              // Insertar nota en la base de datos
              const noteResult = await pool.query(
                `INSERT INTO notes (title, content, user_id, color, images) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [noteData.title, noteData.content, noteData.user_id, noteData.color, noteData.images]
              );
              
              const note = noteResult.rows[0];
              console.log('Nota creada:', note);
              
              return res.status(200).json({
                action: 'createNote',
                noteData: {
                  id: note.id,
                  title: note.title
                },
                response: `He creado una nota titulada "${note.title}".`
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
              const reminderData = {
                title: intentData.data?.title || 'Recordatorio sin título',
                description: intentData.data?.description || '',
                date_time: new Date(intentData.data?.date_time || Date.now()),
                has_time: intentData.data?.has_time !== undefined ? intentData.data.has_time : true,
                user_id: userId
              };
              
              console.log('Datos del recordatorio:', reminderData);
              
              // Insertar recordatorio en la base de datos
              const reminderResult = await pool.query(
                `INSERT INTO reminders (title, description, date_time, has_time, user_id) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [
                  reminderData.title, 
                  reminderData.description, 
                  reminderData.date_time, 
                  reminderData.has_time, 
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
                response: `He creado un recordatorio titulado "${reminder.title}" para ${new Date(reminder.date_time).toLocaleString()}.`
              });
            } catch (error) {
              console.error('Error al crear recordatorio:', error);
              return res.status(500).json({
                error: 'Error al crear el recordatorio'
              });
            }
            
          case 'transcribeImage':
            console.log('Transcribiendo imagen');
            return res.status(200).json({
              action: 'transcribeImage',
              transcription: intentData.data?.text,
              response: `He transcrito el texto de la imagen.`
            });
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
  }
};
