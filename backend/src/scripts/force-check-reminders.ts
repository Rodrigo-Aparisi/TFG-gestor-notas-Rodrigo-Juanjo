// scripts/force-check-reminders.ts
import dotenv from 'dotenv';
import path from 'path';
import { emailService } from '../services/emailService';

// Cargar variables de entorno con ruta específica
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function forceCheckReminders() {
  try {
    console.log('Forzando comprobación de recordatorios...');
    
    // Modificar la función para que considere también recordatorios en el futuro cercano
    await emailService.checkUpcomingRemindersForTest();
    
    console.log('Comprobación completada');
  } catch (error) {
    console.error('Error al comprobar recordatorios:', error);
  }
}

forceCheckReminders();
