// emailSchedulerService.ts
import { Reminder } from '../models/reminder';
import { emailService } from './emailService';

export const emailSchedulerService = {
  // Función que se ejecutará cada hora para programar los correos
  async scheduleEmails(): Promise<void> {
    try {
      // Obtener recordatorios que necesitan enviar correo
      const reminders = await Reminder.findRemindersForEmailNotification();
      
      console.log(`Encontrados ${reminders.length} recordatorios para enviar correo`);
      
      // Programar el envío de correos para cada recordatorio
      for (const reminder of reminders) {
        await emailService.sendReminderEmail(
          reminder.userId,
          reminder.title,
          reminder.description || '',
          reminder.dateTime
        );
      }
      
      console.log(`${reminders.length} correos de recordatorio enviados`);
    } catch (error) {
      console.error('Error al programar correos de recordatorio:', error);
    }
  }
};
