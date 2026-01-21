import { pool } from '../database';

export const executeQuery = async (query: string, params?: any[]) => {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  }
};
