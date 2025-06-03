import { pool } from '../../database';
import schedule from 'node-schedule';

// Función para eliminar notas que llevan más de 30 días en la papelera
export const setupTrashCleanup = () => {
  // Programar la tarea para que se ejecute todos los días a las 3 AM
  schedule.scheduleJob('0 3 * * *', async () => {
    try {
      console.log('Ejecutando limpieza de papelera...');
      
      // Eliminar notas que llevan más de 30 días en la papelera
      const result = await pool.query(`
        DELETE FROM notes 
        WHERE is_deleted = true 
        AND deleted_at < NOW() - INTERVAL '30 days'
      `);
      
      console.log(`Limpieza completada: ${result.rowCount} notas eliminadas permanentemente.`);
    } catch (error) {
      console.error('Error durante la limpieza de la papelera:', error);
    }
  });
};
