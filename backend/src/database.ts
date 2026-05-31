import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Enable SSL in production to encrypt data in transit
  ssl: isProduction ? { rejectUnauthorized: true } : false,
  // Pool tuning (overridable via env)
  max: parseInt(process.env.PG_POOL_MAX || '10'),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT || '2000'),
});

pool.on('error', (err) => {
  // Use console.error here because logger may not be initialized yet at module load
  console.error('Unexpected error on idle PostgreSQL client', err.message);
});

pool.connect((_err, _client, release) => {
  if (_err) {
    console.error('Error al conectar a la base de datos:', _err.message);
    return;
  }
  release();
});
