import { Request, Response } from "express";
import { pool } from "../../database";

/**
 * Controller for Note Sharing operations
 * Handles sharing notes with other users and managing permissions
 */
export class NoteSharingController {
  async shareNote(req: Request, res: Response): Promise<void> {
    try {
      const {
        noteId,
        username,
        includeImages = true,
        canEdit = false,
      } = req.body;
      const ownerId = req.user.id;

      // Validate input
      if (!noteId || !username) {
        res.status(400).json({ error: "Se requieren noteId y username" });
        return;
      }

      // Verify note exists and belongs to current user
      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [noteId, ownerId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada o no tienes permiso" });
        return;
      }

      // Find target user
      const targetUser = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );

      if (targetUser.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const sharedWithId = targetUser.rows[0].id;

      // Prevent sharing with self
      if (sharedWithId === ownerId) {
        res.status(400).json({ error: "No puedes compartir una nota contigo mismo" });
        return;
      }

      // Check if already shared
      const existingShare = await pool.query(
        "SELECT * FROM shared_notes WHERE note_id = $1 AND shared_with_id = $2",
        [noteId, sharedWithId]
      );

      if (existingShare.rows.length > 0) {
        // Update existing share permissions
        await pool.query(
          "UPDATE shared_notes SET can_edit = $1, include_images = $2, updated_at = CURRENT_TIMESTAMP WHERE note_id = $3 AND shared_with_id = $4",
          [canEdit, includeImages, noteId, sharedWithId]
        );

        res.status(200).json({
          success: true,
          message: "Permisos de nota compartida actualizados",
        });
        return;
      }

      // Create new share
      await pool.query(
        "INSERT INTO shared_notes (note_id, owner_id, shared_with_id, can_edit, include_images) VALUES ($1, $2, $3, $4, $5)",
        [noteId, ownerId, sharedWithId, canEdit, includeImages]
      );

      res.status(200).json({ success: true, message: "Nota compartida exitosamente" });
    } catch (error) {
      console.error("Error al compartir nota:", error);
      res.status(500).json({ error: "Error al compartir la nota" });
    }
  }

  async getSharedNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

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
      console.error("Error al obtener notas compartidas:", error);
      res.status(500).json({ error: "Error al obtener las notas compartidas" });
    }
  }

  async updateSharedNotePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { username, canEdit, includeImages } = req.body;
      const ownerId = req.user.id;

      // Find target user
      const targetUser = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );

      if (targetUser.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const sharedWithId = targetUser.rows[0].id;

      // Verify current user is the owner
      const isOwner = await pool.query(
        "SELECT 1 FROM shared_notes WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3",
        [id, ownerId, sharedWithId]
      );

      if (isOwner.rows.length === 0) {
        res.status(403).json({
          error: "No tienes permiso para modificar los permisos de esta nota compartida",
        });
        return;
      }

      // Build update query dynamically
      let updateQuery = "UPDATE shared_notes SET updated_at = CURRENT_TIMESTAMP";
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

      updateQuery += " WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3";

      await pool.query(updateQuery, queryParams);

      res.json({ message: "Permisos actualizados exitosamente" });
    } catch (error) {
      console.error("Error al actualizar permisos:", error);
      res.status(500).json({ error: "Error al actualizar permisos" });
    }
  }

  async updateSharedNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, images } = req.body;
      const userId = req.user.id;

      // Verify edit permission
      const hasPermission = await pool.query(
        `SELECT 1 FROM shared_notes
       WHERE note_id = $1
       AND shared_with_id = $2
       AND can_edit = true`,
        [id, userId]
      );

      if (hasPermission.rows.length === 0) {
        res.status(403).json({
          error: "No tienes permiso para editar esta nota",
        });
        return;
      }

      // Build update query
      const updateFields = [];
      const values = [];
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

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No hay campos para actualizar" });
        return;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
      UPDATE notes
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      res.json({
        success: true,
        note: result.rows[0],
      });
    } catch (error) {
      console.error("Error in updateSharedNote:", error);
      res.status(500).json({
        error: "Error al actualizar la nota",
        ...(process.env.NODE_ENV !== 'production' && { details: error instanceof Error ? error.message : "Error desconocido" }),
      });
    }
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string" || query.length < 2) {
        res.status(400).json({ error: "La consulta debe tener al menos 2 caracteres" });
        return;
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
      console.error("Error al buscar usuarios:", error);
      res.status(500).json({ error: "Error al buscar usuarios" });
    }
  }
}
