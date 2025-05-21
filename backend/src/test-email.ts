import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { emailService } from './services/emailService';

// Cargar variables de entorno con ruta específica
const envPath = path.resolve(__dirname, '../.env');
console.log(`Intentando cargar .env desde: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('✅ Archivo .env encontrado');
  dotenv.config({ path: envPath });
} else {
  console.log('❌ Archivo .env no encontrado');
}

async function testEmailService() {
  try {
    console.log('=== Prueba del Servicio de Email ===');
    
    console.log('\nVerificando variables de entorno:');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Definido' : '❌ No definido');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Definido' : '❌ No definido');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Faltan variables de entorno necesarias para la configuración de email');
    }
    
    console.log('\nEnviando email de prueba...');
    const messageId = await emailService.sendTestEmail(
      process.env.EMAIL_USER,
      'Usuario de Prueba'
    );
    
    console.log(`✅ Email de prueba enviado, messageId: ${messageId}`);
    console.log('\nVerificando recordatorios pendientes...');
    
    await emailService.checkUpcomingReminders();
    
    console.log('\n✅ Prueba completada');
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error);
  }
}

testEmailService();
