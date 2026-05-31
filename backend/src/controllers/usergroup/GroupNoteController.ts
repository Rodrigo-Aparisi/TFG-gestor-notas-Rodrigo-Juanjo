import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import fs from "fs";
import { RequestWithFile, deleteImage } from "../../middleware/upload";
import { getGroupNoteImageUrl, isGroupNoteImageUrl } from "../../utils/urlHelpers";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../errors/AppError";

/**
 * Controller for Group Notes operations
 * Handles CRUD operations for notes within user groups
 */
export class GroupNoteController {
  // Get group notes
  async getGroupNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;

      // Verify user is a member
      const memberCheckResult = await pool.query(
        `
      SELECT EXISTS(
        SELECT 1 FROM group_members
        WHERE group_id = $1 AND user_id = $2
      ) as is_member
    `,
        [groupId, userId]
      );

      const isMember = memberCheckResult.rows[0].is_member;

      if (!isMember) {
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      // Get group notes
      const result = await pool.query(
        `
      SELECT
        gn.*,
        u.username as created_by_username
      FROM group_notes gn
      JOIN users u ON gn.user_id = u.id
      WHERE gn.group_id = $1
      ORDER BY gn.is_pinned DESC, gn.updated_at DESC
    `,
        [groupId]
      );

      const notes = result.rows || [];
      res.json({ notes });
    } catch (error) {
      next(error);
    }
  }

  // Create a group note
  async createGroupNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
      const { title, content, images = [] } = req.body;

      if (!title || title.trim() === "") {
        return next(new BadRequestError("El título es obligatorio"));
      }

      // Verify user is a member
      const memberCheckResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, userId]
      );

      const isMember = memberCheckResult.rows[0].is_member;

      if (!isMember) {
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      // Create the note
      const createNoteResult = await pool.query(
        `
        INSERT INTO group_notes (title, content, user_id, group_id, images)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [title, content, userId, groupId, images]
      );

      const note = createNoteResult.rows[0];

      // Get creator username
      const userResult = await pool.query(
        `
        SELECT username FROM users WHERE id = $1
      `,
        [userId]
      );

      const username = userResult.rows[0].username;

      res.status(201).json({
        message: "Nota creada correctamente",
        note: {
          ...note,
          created_by_username: username,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a specific group note
  async getGroupNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user!.id;

      // Verify user is a member
      const memberCheckResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, userId]
      );

      const isMember = memberCheckResult.rows[0].is_member;

      if (!isMember) {
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      // Get the note
      const result = await pool.query(
        `
        SELECT
          gn.*,
          u.username as created_by_username
        FROM group_notes gn
        JOIN users u ON gn.user_id = u.id
        WHERE gn.id = $1 AND gn.group_id = $2
      `,
        [noteId, groupId]
      );

      if (result.rows.length === 0) {
        return next(new NotFoundError("Nota no encontrada"));
      }

      res.json({ note: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }

  // Update a group note
  async updateGroupNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user!.id;
      const { title, content, color, images } = req.body;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `SELECT user_id FROM group_notes WHERE id = $1 AND group_id = $2`,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        return next(new NotFoundError("Nota no encontrada"));
      }

      // Verify user is creator or has admin/owner permissions
      if (noteCheckResult.rows[0].user_id !== userId) {
        const roleCheckResult = await pool.query(
          `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
          [groupId, userId]
        );

        if (roleCheckResult.rows.length === 0) {
          return next(new ForbiddenError("No tienes acceso a este grupo"));
        }

        const role = roleCheckResult.rows[0].role;
        if (role !== "owner" && role !== "admin") {
          return next(new ForbiddenError("No tienes permisos para editar esta nota"));
        }
      }

      // Build update query
      let query = "UPDATE group_notes SET updated_at = CURRENT_TIMESTAMP";
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        query += `, title = $${paramCount++}`;
        values.push(title);
      }

      if (content !== undefined) {
        query += `, content = $${paramCount++}`;
        values.push(content);
      }

      if (color !== undefined) {
        query += `, color = $${paramCount++}`;
        values.push(color);
      }

      if (images !== undefined) {
        query += `, images = $${paramCount++}`;
        values.push(images);
      }

      // Complete query with WHERE clause
      query += ` WHERE id = $${paramCount++} AND group_id = $${paramCount++} RETURNING *`;
      values.push(noteId, groupId);

      // Execute query
      const updateResult = await pool.query(query, values);

      if (updateResult.rows.length === 0) {
        return next(new NotFoundError("No se pudo actualizar la nota"));
      }

      // Get complete updated note with username
      const getNoteResult = await pool.query(
        `
      SELECT
        gn.*,
        u.username as created_by_username
      FROM group_notes gn
      JOIN users u ON gn.user_id = u.id
      WHERE gn.id = $1
      `,
        [noteId]
      );

      res.json({
        message: "Nota actualizada correctamente",
        note: getNoteResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a group note
  async deleteGroupNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user!.id;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `
        SELECT user_id FROM group_notes
        WHERE id = $1 AND group_id = $2
      `,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        return next(new NotFoundError("Nota no encontrada"));
      }

      // Verify user is creator or has admin/owner permissions
      if (noteCheckResult.rows[0].user_id !== userId) {
        const roleCheckResult = await pool.query(
          `
          SELECT role FROM group_members
          WHERE group_id = $1 AND user_id = $2
        `,
          [groupId, userId]
        );

        if (roleCheckResult.rows.length === 0) {
          return next(new ForbiddenError("No tienes acceso a este grupo"));
        }

        const role = roleCheckResult.rows[0].role;
        if (role !== "owner" && role !== "admin") {
          return next(new ForbiddenError("No tienes permisos para eliminar esta nota"));
        }
      }

      // Delete associated images if they exist
      const noteResult = await pool.query(
        `
        SELECT images FROM group_notes WHERE id = $1
      `,
        [noteId]
      );

      const images = noteResult.rows[0].images || [];

      await Promise.allSettled(
        images
          .filter((imagePath: string) => imagePath && isGroupNoteImageUrl(imagePath))
          .map(async (imagePath: string) => {
            await deleteImage(imagePath);
          })
      );

      // Delete the note
      await pool.query(
        `
        DELETE FROM group_notes
        WHERE id = $1
      `,
        [noteId]
      );

      res.json({ message: "Nota eliminada correctamente" });
    } catch (error) {
      next(error);
    }
  }

  // Toggle pin on group note
  async togglePinGroupNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user!.id;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `
      SELECT user_id FROM group_notes
      WHERE id = $1 AND group_id = $2
    `,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        return next(new NotFoundError("Nota no encontrada"));
      }

      // Verify user is creator or has admin/owner permissions
      if (noteCheckResult.rows[0].user_id !== userId) {
        const roleCheckResult = await pool.query(
          `
        SELECT role FROM group_members
        WHERE group_id = $1 AND user_id = $2
      `,
          [groupId, userId]
        );

        if (roleCheckResult.rows.length === 0) {
          return next(new ForbiddenError("No tienes acceso a este grupo"));
        }

        const role = roleCheckResult.rows[0].role;
        if (role !== "owner" && role !== "admin") {
          return next(new ForbiddenError("No tienes permisos para modificar esta nota"));
        }
      }

      // Toggle is_pinned state
      const updateResult = await pool.query(
        `
      UPDATE group_notes
      SET is_pinned = NOT is_pinned
      WHERE id = $1
      RETURNING *
    `,
        [noteId]
      );

      // Get complete updated note
      const getNoteResult = await pool.query(
        `
      SELECT
        gn.*,
        u.username as created_by_username
      FROM group_notes gn
      JOIN users u ON gn.user_id = u.id
      WHERE gn.id = $1
    `,
        [noteId]
      );

      res.json({
        message: updateResult.rows[0].is_pinned
          ? "Nota marcada como importante"
          : "Nota desmarcada",
        note: getNoteResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload group note image
  async uploadGroupNoteImage(req: RequestWithFile, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        return next(new BadRequestError("No se ha proporcionado ninguna imagen"));
      }

      // Build relative URL for the image
      const imageUrl = getGroupNoteImageUrl(req.file.filename);

      res.json({
        message: "Imagen subida correctamente",
        data: {
          imageUrl: imageUrl,
        },
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error eliminando archivo temporal:", err);
        });
      }
      next(error);
    }
  }

  // Delete group note image
  async deleteGroupNoteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { noteId, imageIndex } = req.params;
      const userId = req.user!.id;
      const index = parseInt(imageIndex);

      // Fetch note together with a membership check to prevent IDOR
      // The JOIN ensures only notes from groups the user belongs to are returned
      const noteResult = await pool.query(
        `SELECT gn.* FROM group_notes gn
         INNER JOIN group_members gm ON gm.group_id = gn.group_id AND gm.user_id = $2
         WHERE gn.id = $1`,
        [noteId, userId]
      );

      if (noteResult.rows.length === 0) {
        return next(new NotFoundError("Nota no encontrada"));
      }

      const note = noteResult.rows[0];
      const images = note.images || [];

      if (index < 0 || index >= images.length) {
        return next(new BadRequestError("Índice de imagen inválido"));
      }

      // Verify permissions (note creator or group admin/owner)
      let hasPermission = note.user_id === userId;

      if (!hasPermission) {
        const roleResult = await pool.query(
          `SELECT role FROM group_members
          WHERE group_id = $1 AND user_id = $2`,
          [note.group_id, userId]
        );

        if (roleResult.rows.length > 0) {
          const role = roleResult.rows[0].role;
          hasPermission = role === 'owner' || role === 'admin';
        }
      }

      if (!hasPermission) {
        return next(new ForbiddenError("No tienes permiso para eliminar esta imagen"));
      }

      // Delete file if it exists on server
      const imageUrl = images[index];
      if (imageUrl && isGroupNoteImageUrl(imageUrl)) {
        await deleteImage(imageUrl);
      }

      // Update images array in database
      const updatedImages = [...images];
      updatedImages.splice(index, 1);

      await pool.query(
        `UPDATE group_notes SET images = $1 WHERE id = $2`,
        [updatedImages, noteId]
      );

      res.json({
        success: true,
        message: "Imagen eliminada correctamente"
      });
    } catch (error) {
      next(error);
    }
  }
}
