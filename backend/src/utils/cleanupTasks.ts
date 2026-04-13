import { pool } from '../database';
import schedule from 'node-schedule';
import logger from '../config/logger';

// Función para eliminar notas que llevan más de 30 días en la papelera
export const setupTrashCleanup = () => {
  // Programar la tarea para que se ejecute todos los días a las 3 AM
  schedule.scheduleJob('0 3 * * *', async () => {
    try {
      const result = await pool.query(`
        DELETE FROM notes 
        WHERE is_deleted = true 
        AND deleted_at < NOW() - INTERVAL '30 days'
      `);
      
    } catch (error) {
      logger.error('Error durante la limpieza de la papelera:', { error });
    }
  });
};
