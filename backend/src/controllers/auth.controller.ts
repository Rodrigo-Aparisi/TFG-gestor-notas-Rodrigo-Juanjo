import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

// Función de registro
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validaciones
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, profile_image, created_at',
      [username, email, hashedPassword]
    );

    // Construir URL completa de la imagen si existe
    const baseUrl = (process.env.API_URL || 'http://localhost:3001').replace('/api', '');
    const userResponse = {
      ...result.rows[0],
      profile_image: result.rows[0].profile_image ? 
        `${baseUrl}${result.rows[0].profile_image}` : 
        null
    };

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: userResponse
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Función de login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }

    const result = await pool.query(
      'SELECT id, username, email, password, profile_image, created_at FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(400).json({ error: 'Usuario no encontrado' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Contraseña incorrecta' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // Construir URL completa de la imagen si existe
    const baseUrl = (process.env.API_URL || 'http://localhost:3001').replace('/api', '');
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      profile_image: user.profile_image ? 
        `${baseUrl}${user.profile_image}` : 
        null,
      created_at: user.created_at
    };

    // Obtener configuración del usuario
    const settingsResult = await pool.query(
      'SELECT theme, notifications_enabled, language FROM settings WHERE user_id = $1',
      [user.id]
    );

    const settings = settingsResult.rows[0] || {
      theme: 'dark',
      notifications_enabled: true,
      language: 'es'
    };

    console.log('Login exitoso:', {
      user: userResponse,
      settings
    });

    res.json({
      message: 'Login exitoso',
      token,
      user: userResponse,
      settings
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
