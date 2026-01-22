import { Request, Response } from "express";
import { pool } from "../../database";
import fs from "fs";
import path from "path";
import { groupNoteImageUpload, deleteImage, handleMulterError } from "../../config/multerConfig";
import { getGroupNoteImageUrl, isGroupNoteImageUrl } from "../../utils/urlHelpers";

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Controller for Group Notes operations
 * Handles CRUD operations for notes within user groups
 */
export class GroupNoteController {
  // Get group notes
  async getGroupNotes(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

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
        res
          .status(403)
          .json({ error: "No tienes acceso a este grupo", notes: [] });
        return;
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
      console.error("Error al obtener notas del grupo:", error);
      res
        .status(500)
        .json({ error: "Error al obtener las notas del grupo", notes: [] });
    }
  }

  // Create a group note
  async createGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { title, content, images = [] } = req.body;

      if (!title || title.trim() === "") {
        res.status(400).json({ error: "El título es obligatorio" });
        return;
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
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
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
      console.error("Error al crear nota de grupo:", error);
      res.status(500).json({ error: "Error al crear la nota" });
    }
  }

  // Get a specific group note
  async getGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

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
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
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
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      res.json({ note: result.rows[0] });
    } catch (error) {
      console.error("Error al obtener nota de grupo:", error);
      res.status(500).json({ error: "Error al obtener la nota" });
    }
  }

  // Update a group note
  async updateGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;
      const { title, content, color, images } = req.body;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `SELECT user_id FROM group_notes WHERE id = $1 AND group_id = $2`,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
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
        res.status(404).json({ error: "No se pudo actualizar la nota" });
        return;
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
      console.error("Error al actualizar nota de grupo:", error);
      res.status(500).json({
        error: "Error al actualizar la nota",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  // Delete a group note
  async deleteGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `
        SELECT user_id FROM group_notes
        WHERE id = $1 AND group_id = $2
      `,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
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
          res.status(403).json({ error: "No tienes acceso a este grupo" });
          return;
        }

        const role = roleCheckResult.rows[0].role;
        if (role !== "owner" && role !== "admin") {
          res
            .status(403)
            .json({ error: "No tienes permisos para eliminar esta nota" });
          return;
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

      for (const imagePath of images) {
        if (imagePath && isGroupNoteImageUrl(imagePath)) {
          const fullPath = path.join(__dirname, "..", "..", imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

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
      console.error("Error al eliminar nota de grupo:", error);
      res.status(500).json({ error: "Error al eliminar la nota" });
    }
  }

  // Toggle pin on group note
  async togglePinGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

      // Verify note exists and belongs to group
      const noteCheckResult = await pool.query(
        `
      SELECT user_id FROM group_notes
      WHERE id = $1 AND group_id = $2
    `,
        [noteId, groupId]
      );

      if (noteCheckResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
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
          res.status(403).json({ error: "No tienes acceso a este grupo" });
          return;
        }

        const role = roleCheckResult.rows[0].role;
        if (role !== "owner" && role !== "admin") {
          res
            .status(403)
            .json({ error: "No tienes permisos para modificar esta nota" });
          return;
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
      console.error("Error al marcar/desmarcar nota de grupo:", error);
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  // Upload group note image
  async uploadGroupNoteImage(req: RequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha proporcionado ninguna imagen" });
        return;
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
      console.error("Error al subir imagen:", error);
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error eliminando archivo temporal:", err);
        });
      }
      res.status(500).json({ error: "Error al procesar la imagen" });
    }
  }

  // Delete group note image
  async deleteGroupNoteImage(req: Request, res: Response): Promise<void> {
    try {
      const { noteId, imageIndex } = req.params;
      const userId = req.user.id;
      const index = parseInt(imageIndex);

      // Verify note exists and user has permission
      const noteResult = await pool.query(
        `SELECT * FROM group_notes WHERE id = $1`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      const note = noteResult.rows[0];
      const images = note.images || [];

      if (index < 0 || index >= images.length) {
        res.status(400).json({ error: "Índice de imagen inválido" });
        return;
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
        res.status(403).json({ error: "No tienes permiso para eliminar esta imagen" });
        return;
      }

      // Delete file if it exists on server
      const imageUrl = images[index];
      if (imageUrl && isGroupNoteImageUrl(imageUrl)) {
        const fullPath = path.join(__dirname, '..', '..', imageUrl);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
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
      console.error("Error al eliminar imagen:", error);
      res.status(500).json({ error: "Error al eliminar la imagen" });
    }
  }
}
