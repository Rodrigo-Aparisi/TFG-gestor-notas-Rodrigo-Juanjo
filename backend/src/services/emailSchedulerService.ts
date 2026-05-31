// emailSchedulerService.ts
import { Reminder } from '../models/reminder';
import { emailService } from './emailService';
import logger from '../config/logger';

export const emailSchedulerService = {
  // Función que se ejecutará cada hora para programar los correos
  async scheduleEmails(): Promise<void> {
    try {
      // Obtener recordatorios que necesitan enviar correo
      const reminders = await Reminder.findRemindersForEmailNotification();

      // Send all reminder emails in parallel; individual failures don't cancel the rest
      const results = await Promise.allSettled(
        reminders.map(reminder =>
          emailService.sendReminderEmail(
            reminder.userId,
            reminder.title,
            reminder.description || '',
            reminder.dateTime
          )
        )
      );

      // Log any individual failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Error al enviar correo de recordatorio', {
            reminderId: reminders[index]?.id,
            error: result.reason,
          });
        }
      });
    } catch (error) {
      logger.error('Error al programar correos de recordatorio:', { error });
    }
  },
};
