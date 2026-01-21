"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSchedulerService = void 0;
// emailSchedulerService.ts
const reminder_1 = require("../models/reminder");
const emailService_1 = require("./emailService");
exports.emailSchedulerService = {
    // Función que se ejecutará cada hora para programar los correos
    async scheduleEmails() {
        try {
            // Obtener recordatorios que necesitan enviar correo
            const reminders = await reminder_1.Reminder.findRemindersForEmailNotification();
            console.log(`Encontrados ${reminders.length} recordatorios para enviar correo`);
            // Programar el envío de correos para cada recordatorio
            for (const reminder of reminders) {
                await emailService_1.emailService.sendReminderEmail(reminder.userId, reminder.title, reminder.description || '', reminder.dateTime);
            }
            console.log(`${reminders.length} correos de recordatorio enviados`);
        }
        catch (error) {
            console.error('Error al programar correos de recordatorio:', error);
        }
    }
};
