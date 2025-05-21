import { emailSchedulerService } from '../services/emailSchedulerService';

// Función para configurar el programador de correos
export function setupEmailScheduler() {
  // Ejecutar cada hora
  setInterval(() => {
    emailSchedulerService.scheduleEmails();
  }, 60 * 60 * 1000); // 1 hora en milisegundos
  
  // Ejecutar inmediatamente al iniciar
  emailSchedulerService.scheduleEmails();
  
  console.log('Programador de correos de recordatorio configurado');
}
