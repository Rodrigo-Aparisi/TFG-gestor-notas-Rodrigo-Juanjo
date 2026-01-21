"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEmailScheduler = setupEmailScheduler;
const emailSchedulerService_1 = require("../services/emailSchedulerService");
// Función para configurar el programador de correos
function setupEmailScheduler() {
    // Ejecutar cada hora
    setInterval(() => {
        emailSchedulerService_1.emailSchedulerService.scheduleEmails();
    }, 60 * 60 * 1000); // 1 hora en milisegundos
    // Ejecutar inmediatamente al iniciar
    emailSchedulerService_1.emailSchedulerService.scheduleEmails();
    console.log('Programador de correos de recordatorio configurado');
}
