import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../database';
import { getProfileImageUrl } from '../utils/urlHelpers';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../errors';
import { logger, log } from '../config/logger';

/**
 * User Registration
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validations (Zod middleware handles most, this is backup)
    if (!username || !email || !password) {
      throw new BadRequestError('Todos los campos son requeridos', 'MISSING_FIELDS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, profile_image, created_at',
      [username, email, hashedPassword]
    );

    const userResponse = {
      ...result.rows[0],
      profile_image: getProfileImageUrl(result.rows[0].profile_image)
    };

    log.auth('Registro exitoso', userResponse.id, { username, email });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: userResponse
    });
  } catch (error) {
    // Handle unique constraint violations
    if ((error as Error & { code?: string }).code === '23505') {
      return next(new BadRequestError('El usuario o correo ya existe', 'USER_EXISTS'));
    }
    next(error);
  }
};

/**
 * User Login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validations
    if (!email || !password) {
      throw new BadRequestError('Todos los campos son requeridos', 'MISSING_FIELDS');
    }

    const result = await pool.query(
      'SELECT id, username, email, password, profile_image, created_at FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundError('Correo no encontrado', 'USER_NOT_FOUND');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      log.security('Intento de login fallido', { email, reason: 'password_incorrect' });
      throw new UnauthorizedError('Contraseña incorrecta', 'INVALID_PASSWORD');
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      profile_image: getProfileImageUrl(user.profile_image),
      created_at: user.created_at
    };

    // Get user settings
    const settingsResult = await pool.query(
      'SELECT theme, notifications_enabled, language FROM settings WHERE user_id = $1',
      [user.id]
    );

    const settings = settingsResult.rows[0] || {
      theme: 'dark',
      notifications_enabled: true,
      language: 'es'
    };

    log.auth('Login exitoso', user.id, { email });

    res.json({
      success: true,
      message: 'Login exitoso',
      token: accessToken,
      refreshToken,
      user: userResponse,
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token requerido', 'MISSING_REFRESH_TOKEN');
    }

    // Verify refresh token
    let decoded: { id: string; type: string };
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as { id: string; type: string };
    } catch {
      throw new ForbiddenError('Refresh token inválido', 'INVALID_REFRESH_TOKEN');
    }

    // Check if refresh token exists in database and is not expired
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );

    if (tokenResult.rows.length === 0) {
      throw new ForbiddenError('Refresh token inválido o expirado', 'EXPIRED_REFRESH_TOKEN');
    }

    // Get user data
    const userResult = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado', 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    logger.debug('Token renovado', { userId: user.id });

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      token: newAccessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Logout
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // Revoke access token (add to blacklist)
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id?: string; exp?: number };
        if (decoded && decoded.exp && decoded.id) {
          const expiresAt = new Date(decoded.exp * 1000);
          await pool.query(
            'INSERT INTO revoked_tokens (token, user_id, expires_at, reason) VALUES ($1, $2, $3, $4)',
            [token, decoded.id, expiresAt, 'logout']
          );
        }
      } catch {
        // Token inválido o expirado: no insertar en blacklist, continuar con logout
      }
    }

    // Delete refresh token from database
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    log.auth('Logout exitoso', (req as Request & { user?: { id: string } }).user?.id);

    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    next(error);
  }
};
