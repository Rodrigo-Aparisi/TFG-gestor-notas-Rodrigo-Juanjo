import { Request, Response } from 'express';
import { Reminder } from '../models/reminder';

export const reminderController = {
  async getReminders(req: Request, res: Response) {
    try {
      const date = new Date(req.query.date as string);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const reminders = await Reminder.findWithStatus({
        userId: req.user.id,
        dateTime: {
          $gte: date,
          $lt: endDate
        }
      });
      
      res.json({ reminders });
    } catch (error) {
      console.error('Error al obtener recordatorios:', error);
      res.status(500).json({ error: 'Error al obtener recordatorios' });
    }
  },

  async createReminder(req: Request, res: Response) {
    try {
      const reminderData = {
        title: req.body.title,
        description: req.body.description,
        dateTime: new Date(req.body.dateTime),
        userId: req.user.id,
        statusId: 1 // Estado por defecto: pendiente
      };

      const reminder = await Reminder.create(reminderData);
      
      // Si hay información de recurrencia, crearla también
      if (req.body.recurrence) {
        // Aquí irá la lógica para crear la recurrencia
      }

      res.json({ reminder });
    } catch (error) {
      console.error('Error al crear recordatorio:', error);
      res.status(500).json({ error: 'Error al crear recordatorio' });
    }
  },

  async updateReminderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;

      const reminder = await Reminder.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        { statusId }
      );

      if (!reminder) {
        return res.status(404).json({ error: 'Recordatorio no encontrado' });
      }

      res.json({ reminder });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({ error: 'Error al actualizar estado del recordatorio' });
    }
  },

  async updateReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        dateTime: new Date(req.body.dateTime)
      };

      const reminder = await Reminder.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        updateData
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Recordatorio no encontrado' });
      }
      
      res.json({ reminder });
    } catch (error) {
      console.error('Error al actualizar recordatorio:', error);
      res.status(500).json({ error: 'Error al actualizar recordatorio' });
    }
  },

  async deleteReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reminder = await Reminder.findOneAndDelete({ 
        _id: id, 
        userId: req.user.id 
      });

      if (!reminder) {
        return res.status(404).json({ error: 'Recordatorio no encontrado' });
      }

      res.json({ message: 'Recordatorio eliminado' });
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      res.status(500).json({ error: 'Error al eliminar recordatorio' });
    }
  }
};
