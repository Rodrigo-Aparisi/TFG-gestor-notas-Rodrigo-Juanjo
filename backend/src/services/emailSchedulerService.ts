// emailSchedulerService.ts
import { Reminder } from '../models/reminder';
import { emailService } from './emailService';

export const emailSchedulerService = {
  // Función que se ejecutará cada hora para programar los correos
  async scheduleEmails(): Promise<void> {
    try {
      // Obtener recordatorios que necesitan enviar correo
      const reminders = await Reminder.findRemindersForEmailNotification();
      
      for (const reminder of reminders) {
        await emailService.sendReminderEmail(
          reminder.userId,
          reminder.title,
          reminder.description || '',
          reminder.dateTime
        );
      }
      
    } catch (error) {
      console.error('Error al programar correos de recordatorio:', error);
    }
  }
};
