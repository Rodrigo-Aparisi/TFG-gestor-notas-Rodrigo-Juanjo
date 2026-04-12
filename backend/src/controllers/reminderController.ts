import { Request, Response, NextFunction } from 'express';
import { Reminder } from '../models/reminder';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../errors/AppError';

export const reminderController = {
  async getReminders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
      }

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return next(new BadRequestError('Fechas inválidas'));
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
      next(error);
    }
  },

  async createReminder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
      }

      // Validar campos requeridos
      if (!req.body.title || !req.body.dateTime) {
        return next(new BadRequestError('El título y la fecha son requeridos'));
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
        return next(new BadRequestError('Fecha inválida'));
      }

      const reminder = await Reminder.create(reminderData);
      res.status(201).json({ reminder });
    } catch (error) {
      next(error);
    }
  },

  async updateReminderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
      }

      const { id } = req.params;
      const { statusId } = req.body;

      if (!statusId) {
        return next(new BadRequestError('El estado es requerido'));
      }

      const reminder = await Reminder.findOneAndUpdate(
        { id, userId: req.user.id },
        { statusId }
      );

      if (!reminder) {
        return next(new NotFoundError('Recordatorio no encontrado'));
      }

      res.json({ reminder });
    } catch (error) {
      next(error);
    }
  },

  async updateReminder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
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
        return next(new NotFoundError('Recordatorio no encontrado'));
      }

      res.json({ reminder });
    } catch (error) {
      next(error);
    }
  },

  async deleteReminder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
      }

      const { id } = req.params;
      const reminder = await Reminder.findOneAndDelete({
        id,
        userId: req.user.id
      });

      if (!reminder) {
        return next(new NotFoundError('Recordatorio no encontrado'));
      }

      res.json({ message: 'Recordatorio eliminado' });
    } catch (error) {
      next(error);
    }
  },

  async searchReminders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return next(new UnauthorizedError('Usuario no autenticado'));
      }

      const { query, startDate, endDate } = req.query;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return next(new BadRequestError('El parámetro de búsqueda "query" es requerido'));
      }

      const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
        return next(new BadRequestError('startDate inválido'));
      }
      if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
        return next(new BadRequestError('endDate inválido'));
      }

      const reminders = await Reminder.search(
        req.user.id,
        query.trim(),
        parsedStartDate,
        parsedEndDate
      );

      res.json({ success: true, reminders });
    } catch (error) {
      next(error);
    }
  }
};
