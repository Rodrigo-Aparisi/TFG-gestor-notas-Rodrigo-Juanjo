import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../database';

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
      res.status(400).json({ error: 'Correo no encontrado' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Contraseña incorrecta' });
      return;
    }

    // Generate access token (1 hour expiration)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Generate refresh token (7 days expiration)
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
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
      token: accessToken,
      refreshToken,
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

// Función de refresh token
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token requerido' });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

    // Check if refresh token exists in database and is not expired
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );

    if (tokenResult.rows.length === 0) {
      res.status(403).json({ error: 'Refresh token inválido o expirado' });
      return;
    }

    // Get user data
    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Token renovado exitosamente',
      token: newAccessToken
    });
  } catch (error) {
    console.error('Error al renovar token:', error);
    res.status(403).json({
      error: 'Refresh token inválido',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Función de logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // Revoke access token (add to blacklist)
    if (token) {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        await pool.query(
          'INSERT INTO revoked_tokens (token, user_id, expires_at, reason) VALUES ($1, $2, $3, $4)',
          [token, decoded.id, expiresAt, 'logout']
        );
      }
    }

    // Delete refresh token from database
    if (refreshToken) {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error en el servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
