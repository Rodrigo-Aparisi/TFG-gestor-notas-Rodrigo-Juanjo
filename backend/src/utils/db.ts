import { PoolClient } from 'pg';
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

/**
 * Ejecuta `fn` dentro de una transacción de PostgreSQL.
 *
 * Toma un cliente del pool, emite `BEGIN`, ejecuta `fn(client)` y hace `COMMIT`.
 * Si `fn` (o cualquier query) lanza, hace `ROLLBACK` y re-lanza el error. El
 * cliente se libera siempre (también ante error), evitando fugas del pool.
 *
 * @param fn - Callback que recibe el `PoolClient` de la transacción y devuelve un valor.
 * @returns El valor devuelto por `fn`.
 *
 * @example
 * await withTransaction(async (client) => {
 *   await client.query('UPDATE ...');
 *   await client.query('DELETE ...');
 * });
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
