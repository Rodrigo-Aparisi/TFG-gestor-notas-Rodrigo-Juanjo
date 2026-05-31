import { Request, Response, NextFunction } from 'express';
import { pool } from '../../database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors/AppError';

/**
 * Controller for Note Sharing operations
 * Handles sharing notes with other users and managing permissions
 */
export class NoteSharingController {
  async shareNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { noteId, username, includeImages = true, canEdit = false } = req.body;
      const ownerId = req.user!.id;

      // Validate input
      if (!noteId || !username) {
        return next(new BadRequestError('Se requieren noteId y username'));
      }

      // Verify note exists and belongs to current user
      const note = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [
        noteId,
        ownerId,
      ]);

      if (note.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada o no tienes permiso'));
      }

      // Find target user
      const targetUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

      if (targetUser.rows.length === 0) {
        return next(new NotFoundError('Usuario no encontrado'));
      }

      const sharedWithId = targetUser.rows[0].id;

      // Prevent sharing with self
      if (sharedWithId === ownerId) {
        return next(new BadRequestError('No puedes compartir una nota contigo mismo'));
      }

      // Check if already shared
      const existingShare = await pool.query(
        'SELECT * FROM shared_notes WHERE note_id = $1 AND shared_with_id = $2',
        [noteId, sharedWithId]
      );

      if (existingShare.rows.length > 0) {
        // Update existing share permissions
        await pool.query(
          'UPDATE shared_notes SET can_edit = $1, include_images = $2, updated_at = CURRENT_TIMESTAMP WHERE note_id = $3 AND shared_with_id = $4',
          [canEdit, includeImages, noteId, sharedWithId]
        );

        res.status(200).json({
          success: true,
          message: 'Permisos de nota compartida actualizados',
        });
        return;
      }

      // Create new share
      await pool.query(
        'INSERT INTO shared_notes (note_id, owner_id, shared_with_id, can_edit, include_images) VALUES ($1, $2, $3, $4, $5)',
        [noteId, ownerId, sharedWithId, canEdit, includeImages]
      );

      res.status(200).json({ success: true, message: 'Nota compartida exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  async getSharedNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await pool.query(
        `
        SELECT
          n.id,
          n.title,
          n.content,
          CASE WHEN sn.include_images THEN n.images ELSE ARRAY[]::TEXT[] END AS images,
          n.color,
          u.username as shared_by,
          sn.can_edit,
          sn.include_images,
          sn.created_at
        FROM notes n
        JOIN shared_notes sn ON n.id = sn.note_id
        JOIN users u ON sn.owner_id = u.id
        WHERE sn.shared_with_id = $1
        ORDER BY n.updated_at DESC
      `,
        [userId]
      );

      res.json({ sharedNotes: result.rows });
    } catch (error) {
      next(error);
    }
  }

  async updateSharedNotePermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { username, canEdit, includeImages } = req.body;
      const ownerId = req.user!.id;

      // Find target user
      const targetUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

      if (targetUser.rows.length === 0) {
        return next(new NotFoundError('Usuario no encontrado'));
      }

      const sharedWithId = targetUser.rows[0].id;

      // Verify current user is the owner
      const isOwner = await pool.query(
        'SELECT 1 FROM shared_notes WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3',
        [id, ownerId, sharedWithId]
      );

      if (isOwner.rows.length === 0) {
        return next(
          new ForbiddenError(
            'No tienes permiso para modificar los permisos de esta nota compartida'
          )
        );
      }

      // Build update query dynamically
      let updateQuery = 'UPDATE shared_notes SET updated_at = CURRENT_TIMESTAMP';
      const queryParams: (string | boolean)[] = [id, ownerId, sharedWithId];
      let paramIndex = 4;

      if (canEdit !== undefined) {
        updateQuery += `, can_edit = $${paramIndex}`;
        queryParams.push(canEdit);
        paramIndex++;
      }

      if (includeImages !== undefined) {
        updateQuery += `, include_images = $${paramIndex}`;
        queryParams.push(includeImages);
        paramIndex++;
      }

      updateQuery += ' WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3';

      await pool.query(updateQuery, queryParams);

      res.json({ message: 'Permisos actualizados exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  async updateSharedNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // Exclude `images` intentionally: editors must not modify the owner's images
      const { title, content } = req.body;
      const userId = req.user!.id;

      // Verify edit permission
      const hasPermission = await pool.query(
        `SELECT 1 FROM shared_notes
       WHERE note_id = $1
       AND shared_with_id = $2
       AND can_edit = true`,
        [id, userId]
      );

      if (hasPermission.rows.length === 0) {
        return next(new ForbiddenError('No tienes permiso para editar esta nota'));
      }

      // Build update query — only title and content are editable by shared users
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

      if (updateFields.length === 0) {
        return next(new BadRequestError('No hay campos para actualizar'));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
      UPDATE notes
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return next(new NotFoundError('Nota no encontrada'));
      }

      res.json({
        success: true,
        note: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        return next(new BadRequestError('La consulta debe tener al menos 2 caracteres'));
      }

      // Search users by username prefix
      const result = await pool.query(
        `SELECT id, username FROM users
       WHERE username ILIKE $1
       ORDER BY username ASC
       LIMIT 10`,
        [`${query}%`]
      );

      res.json({ users: result.rows });
    } catch (error) {
      next(error);
    }
  }
}
