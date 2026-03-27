import { Request, Response } from 'express';
import { Reminder } from '../models/reminder';

interface ApiError {
  message: string;
  status: number;
}

export const reminderController = {
  async getReminders(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }
  
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
  
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Fechas inválidas'
        });
      }
  
      const reminders = await Reminder.findWithStatus({
        userId: req.user.id,
        dateTime: {
          $gte: startDate,
          $lt: endDate
        }
      });
  
      // Transformar los recordatorios antes de enviarlos
      const transformedReminders = reminders.map(reminder => ({
        ...reminder,
        hasTime: reminder.hasTime === true // Asegurarse de que sea booleano
      }));
  
      res.json({ reminders: transformedReminders });
    } catch (error) {
      console.error('Error completo:', error);
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error desconocido',
        status: 500
      };
      console.error('Error al obtener recordatorios:', apiError);
      res.status(apiError.status).json({
        error: 'Error al obtener recordatorios',
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
      });
    }
  }
  ,

  async createReminder(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      // Validar campos requeridos
      if (!req.body.title || !req.body.dateTime) {
        return res.status(400).json({
          error: 'El título y la fecha son requeridos'
        });
      }

      // Crear el objeto de datos con los tipos correctos
      const reminderData = {
        title: req.body.title,
        description: req.body.description || '',
        dateTime: new Date(req.body.dateTime),
        userId: req.user.id,
        statusId: req.body.statusId || 1,
        hasTime: req.body.hasTime || false,
        sendEmail: req.body.sendEmail || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validar fecha válida
      if (isNaN(reminderData.dateTime.getTime())) {
        return res.status(400).json({
          error: 'Fecha inválida'
        });
      }

      const reminder = await Reminder.create(reminderData);
      res.status(201).json({ reminder });
    } catch (error) {
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error desconocido',
        status: 500
      };
      console.error('Error al crear recordatorio:', apiError);
      res.status(apiError.status).json({
        error: 'Error al crear recordatorio',
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
      });
    }
  },

  async updateReminderStatus(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const { statusId } = req.body;

      if (!statusId) {
        return res.status(400).json({
          error: 'El estado es requerido'
        });
      }

      const reminder = await Reminder.findOneAndUpdate(
        { id, userId: req.user.id },
        { statusId }
      );

      if (!reminder) {
        return res.status(404).json({
          error: 'Recordatorio no encontrado'
        });
      }

      res.json({ reminder });
    } catch (error) {
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error desconocido',
        status: 500
      };
      console.error('Error al actualizar estado:', apiError);
      res.status(apiError.status).json({
        error: 'Error al actualizar estado del recordatorio',
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
      });
    }
  },

  async updateReminder(req: Request, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const { id } = req.params;
        const updateData = {
            title: req.body.title,
            description: req.body.description,
            dateTime: req.body.date_time ? new Date(req.body.date_time) : undefined,
            statusId: req.body.status_id,
            hasTime: req.body.has_time,
            sendEmail: req.body.send_email,
            updatedAt: new Date()
        };

        const reminder = await Reminder.findOneAndUpdate(
            { id, userId: req.user.id },
            updateData
        );
        
        if (!reminder) {
            return res.status(404).json({
                error: 'Recordatorio no encontrado'
            });
        }
        
        res.json({ reminder });
    } catch (error) {
        console.error('Error completo:', error);
        const apiError: ApiError = {
            message: error instanceof Error ? error.message : 'Error desconocido',
            status: 500
        };
        res.status(apiError.status).json({
            error: 'Error al actualizar recordatorio',
            ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
        });
    }
  },

  async deleteReminder(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const { id } = req.params;
      const reminder = await Reminder.findOneAndDelete({ 
        id,
        userId: req.user.id 
      });

      if (!reminder) {
        return res.status(404).json({
          error: 'Recordatorio no encontrado'
        });
      }

      res.json({ message: 'Recordatorio eliminado' });
    } catch (error) {
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error desconocido',
        status: 500
      };
      console.error('Error al eliminar recordatorio:', apiError);
      res.status(apiError.status).json({
        error: 'Error al eliminar recordatorio',
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
      });
    }
  },

  async searchReminders(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const { query, status } = req.query;
      
      // Construir filtro base
      const filter: any = {
        userId: req.user.id
      };
      
      // Añadir filtro de búsqueda si existe
      if (query) {
        filter.$or = [
          { title: { "$regex": query, "$options": 'i' } },
          { description: { "$regex": query, "$options": 'i' } }
        ];
      }
      
      // Añadir filtro de estado si existe
      if (status) {
        filter.statusId = parseInt(status as string);
      }
      
      const reminders = await Reminder.findWithStatus(filter);
      
      // Transformar los recordatorios antes de enviarlos
      const transformedReminders = reminders.map(reminder => ({
        ...reminder,
        hasTime: reminder.hasTime === true
      }));
      
      res.json({ reminders: transformedReminders });
    } catch (error) {
      console.error('Error completo:', error);
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Error desconocido',
        status: 500
      };
      console.error('Error al buscar recordatorios:', apiError);
      res.status(apiError.status).json({
        error: 'Error al buscar recordatorios',
        ...(process.env.NODE_ENV !== 'production' && { details: apiError.message })
      });
    }
  }
};
