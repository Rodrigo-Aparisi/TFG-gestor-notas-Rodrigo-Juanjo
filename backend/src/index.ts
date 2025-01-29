// Importaciones
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import authRoutes from './routes/auth';
import notesRoutes from './routes/noteRoutes';

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Middleware básico
app.use(cors());          // Permite peticiones CORS
app.use(express.json());  // Parsea JSON en el body

// Configurar conexión a base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432')
});

// Configurar rutas
app.use('/api/auth', authRoutes);     // Rutas de autenticación
app.use('/api/notes', notesRoutes);   // Rutas de notas

// Ruta de prueba para la base de datos
app.get('/test-db', async (req, res) => {
  try {
    // Intenta hacer una consulta simple
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Conexión exitosa', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error conectando a la base de datos' 
    });
  }
});

// Configurar puerto
const PORT = process.env.PORT || 3001;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
