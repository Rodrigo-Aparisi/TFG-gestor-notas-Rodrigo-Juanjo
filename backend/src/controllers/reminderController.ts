import { Request, Response } from 'express';
import { Reminder } from '../models/reminder';

export const reminderController = {
  async getReminders(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const reminders = await Reminder.find({
        userId: req.user.id,
        dateTime: {
          $gte: new Date(date as string),
          $lt: new Date(new Date(date as string).setDate(new Date(date as string).getDate() + 1))
        }
      }).sort({ dateTime: 1 });
      
      res.json({ reminders });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener recordatorios' });
    }
  },

  async createReminder(req: Request, res: Response) {
    try {
      const { title, description, dateTime } = req.body;
      const reminder = new Reminder({
        userId: req.user.id,
        title,
        description,
        dateTime: new Date(dateTime)
      });
      
      await reminder.save();
      res.json({ reminder });
    } catch (error) {
      res.status(500).json({ error: 'Error al crear recordatorio' });
    }
  },

  async updateReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reminder = await Reminder.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        req.body,
        { new: true }
      );
      
      if (!reminder) {
        return res.status(404).json({ error: 'Recordatorio no encontrado' });
      }
      
      res.json({ reminder });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar recordatorio' });
    }
  },

  async deleteReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await Reminder.findOneAndDelete({ _id: id, userId: req.user.id });
      res.json({ message: 'Recordatorio eliminado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar recordatorio' });
    }
  }
};
