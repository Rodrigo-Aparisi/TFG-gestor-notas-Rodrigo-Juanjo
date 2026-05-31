import { Request, Response, NextFunction } from 'express';
import { pool } from '../../database';
import fs from 'fs';
import { buildOrderByClause } from '../../utils/queryHelpers';
import { RequestWithFile } from '../../middleware/upload';
import { AppError, NotFoundError, BadRequestError } from '../../errors/AppError';
import logger from '../../config/logger';

/**
 * Controlador de operaciones CRUD sobre notas, gestión de papelera,
 * pin/marcado y preferencias de ordenación del usuario.
 *
 * Todas las operaciones verifican que el recurso pertenece al usuario autenticado
 * (`req.user.id` inyectado por el middleware `authenticateToken`).
 * Los errores de negocio se propagan con `next(new AppError)`.
 */
export class NoteCrudController {
  // ==================== CRUD Operations ====================

  /**
   * Crea una nueva nota para el usuario autenticado.
   *
   * Convierte listas Markdown (`- `, `* `, `1. `) en viñetas (•) antes de guardar.
   *
   * @param req - Request autenticado. Body validado por `createNoteSchema` (title, content?, images?)
   * @param res - Express Response
   * @param next - Manejador de errores
   * @throws {BadRequestError} 400 — Título vacío o ausente
   * @returns 201 con `{ message, note }` — objeto nota completo
   */
  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, images } = req.body;
      const userId = req.user!.id;

      if (!title || title.trim() === '') {
        return next(new BadRequestError('El título es requerido'));
      }

      // Process content for lists
      const processedContent = content
        ?.replace(/^- (.+)$/gm, '• $1')
        .replace(/^\* (.+)$/gm, '• $1')
        .replace(/^(\d+)\. (.+)$/gm, '$1. $2');

      const result = await pool.query(
        'INSERT INTO notes (title, content, user_id, images) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, processedContent, userId, images || []]
      );

      res.status(201).json({
        message: 'Nota creada exitosamente',
        note: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene las notas activas (no eliminadas) del usuario autenticado.
   *
   * Ordena según las preferencias guardadas en `settings` (tipo y dirección).
   * Soporta paginación mediante `page` y `limit`; desactivable con `paginate=false`.
   *
   * @param req - Query params opcionales: `page` (default 1), `limit` (default 50, máx 100), `paginate` (default true)
   * @param res - Express Response
   * @param next - Manejador de errores
   * @returns 200 con `{ notes, pagination: { page, limit, totalNotes, totalPages, hasMore } }`
   */
  async getNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      // Pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      const paginate = req.query.paginate !== 'false'; // Default to true, can disable with ?paginate=false

      // Get user sort preferences
      const settingsResult = await pool.query(
        'SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1',
        [userId]
      );

      let orderBy = 'updated_at DESC';

      if (settingsResult.rows.length > 0) {
        const { default_note_sort, default_note_sort_direction } = settingsResult.rows[0];

        const fieldMapping: { [key: string]: string } = {
          date: 'updated_at',
          pinned: 'is_pinned',
          title: 'title',
        };

        const mappedField = fieldMapping[default_note_sort] || default_note_sort;
        orderBy = buildOrderByClause(mappedField, default_note_sort_direction);
      }

      // Get total count for pagination
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM notes WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)`,
        [userId]
      );
      const totalNotes = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalNotes / limit);

      // Get notes with optional pagination
      let query = `SELECT * FROM notes
        WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
        ORDER BY ${orderBy}`;

      const queryParams: (string | number)[] = [userId];

      if (paginate) {
        query += ` LIMIT $2 OFFSET $3`;
        queryParams.push(limit, offset);
      }

      const result = await pool.query(query, queryParams);

      res.json({
        notes: result.rows,
        pagination: {
          page,
          limit,
          totalNotes,
          totalPages,
          hasMore: page < totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, images } = req.body;
      const userId = req.user!.id;

      // Verify note exists and belongs to user
      const noteExists = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (noteExists.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      const updateFields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }

      if (content !== undefined) {
        updateFields.push(`content = $${paramCount}`);
        values.push(content);
        paramCount++;
      }

      if (images !== undefined) {
        updateFields.push(`images = $${paramCount}`);
        values.push(images);
        paramCount++;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id, userId);

      const query = `
        UPDATE notes
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      res.status(200).json({
        message: 'Nota actualizada exitosamente',
        note: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const noteResult = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (noteResult.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      const isInTrash = noteResult.rows[0].is_deleted;

      if (isInTrash) {
        // Permanently delete if already in trash
        await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
        res.json({ message: 'Nota eliminada permanentemente' });
      } else {
        // Move to trash
        await pool.query(
          'UPDATE notes SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND user_id = $2',
          [id, userId]
        );
        res.json({ message: 'Nota movida a la papelera' });
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteMultipleNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { noteIds } = req.body;
      const userId = req.user!.id;

      await client.query('DELETE FROM notes WHERE id = ANY($1) AND user_id = $2', [
        noteIds,
        userId,
      ]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Notas eliminadas exitosamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }

  // ==================== Trash Operations ====================

  async getTrashNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 AND is_deleted = true ORDER BY deleted_at DESC',
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      next(error);
    }
  }

  async restoreNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await pool.query(
        'UPDATE notes SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      res.json({
        message: 'Nota restaurada exitosamente',
        note: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  async emptyTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      await pool.query('DELETE FROM notes WHERE user_id = $1 AND is_deleted = true', [userId]);

      res.json({ message: 'Papelera vaciada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Image Operations ====================

  async uploadNoteImage(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        return next(new BadRequestError('No se ha proporcionado ninguna imagen'));
      }

      const imageUrl = `/uploads/note-images/${req.file.filename}`;

      res.json({
        message: 'Imagen subida correctamente',
        data: { imageUrl },
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, err => {
          if (err) console.error('Error eliminando archivo temporal:', err);
        });
      }
      next(error);
    }
  }

  // ==================== Pin/Mark Operations ====================

  async togglePin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (note.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      const result = await pool.query(
        'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async toggleMark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const note = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
        id,
        userId,
      ]);

      if (note.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      const result = await pool.query(
        'UPDATE notes SET is_marked = NOT is_marked WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  async unmarkAllNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      await pool.query('UPDATE notes SET is_marked = false WHERE user_id = $1', [userId]);

      res.json({ message: 'Todas las notas han sido desmarcadas' });
    } catch (error) {
      next(error);
    }
  }

  async getMarkedNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 AND is_marked = true ORDER BY updated_at DESC',
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      next(error);
    }
  }

  // ==================== User Preferences ====================

  async getUserSortPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await pool.query(
        'SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        await pool.query(
          'INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
          [userId, 'date', 'desc']
        );

        res.status(200).json({
          success: true,
          preferences: { sortType: 'date', sortDirection: 'desc' },
        });
        return;
      }

      const sortType = ['date', 'title', 'pinned'].includes(result.rows[0].default_note_sort)
        ? result.rows[0].default_note_sort
        : 'date';

      const sortDirection = ['asc', 'desc'].includes(result.rows[0].default_note_sort_direction)
        ? result.rows[0].default_note_sort_direction
        : 'desc';

      res.status(200).json({
        success: true,
        preferences: { sortType, sortDirection },
      });
    } catch (error) {
      // Intentional fallback: sort preferences are non-critical, but log the error
      logger.error('Error al obtener preferencias de ordenación:', { error });
      res.status(200).json({
        success: true,
        preferences: { sortType: 'date', sortDirection: 'desc' },
      });
    }
  }

  async saveUserSortPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sortType, sortDirection } = req.body;
      const userId = req.user!.id;

      const checkResult = await pool.query('SELECT id FROM settings WHERE user_id = $1', [userId]);

      if (checkResult.rows.length === 0) {
        await pool.query(
          'INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3)',
          [userId, sortType, sortDirection]
        );
      } else {
        await pool.query(
          'UPDATE settings SET default_note_sort = $1, default_note_sort_direction = $2 WHERE user_id = $3',
          [sortType, sortDirection, userId]
        );
      }

      res.status(200).json({
        success: true,
        message: 'Preferencias de ordenación guardadas correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Internal Methods ====================

  async createNoteInternal(noteData: {
    title: string;
    content: string;
    user_id: string;
    color?: string;
    images?: string[];
  }) {
    try {
      const result = await pool.query(
        `INSERT INTO notes (title, content, user_id, color, images)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [noteData.title, noteData.content, noteData.user_id, noteData.color, noteData.images]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }
}
