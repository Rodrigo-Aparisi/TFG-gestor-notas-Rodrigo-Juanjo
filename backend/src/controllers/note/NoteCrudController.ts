import { Request, Response } from "express";
import { pool } from "../../database";
import fs from "fs";
import { buildOrderByClause } from "../../utils/queryHelpers";
import { RequestWithFile } from "../../config/multerConfig";

/**
 * Controller for Note CRUD operations, trash management, and pin/mark functionality
 */
export class NoteCrudController {
  // ==================== CRUD Operations ====================

  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, images } = req.body;
      const userId = req.user.id;

      if (!title || title.trim() === "") {
        res.status(400).json({ error: "El título es requerido" });
        return;
      }

      // Process content for lists
      const processedContent = content
        .replace(/^- (.+)$/gm, "• $1")
        .replace(/^\* (.+)$/gm, "• $1")
        .replace(/^(\d+)\. (.+)$/gm, "$1. $2");

      const result = await pool.query(
        "INSERT INTO notes (title, content, user_id, images) VALUES ($1, $2, $3, $4) RETURNING *",
        [title, processedContent, userId, images || []]
      );

      res.status(201).json({
        message: "Nota creada exitosamente",
        note: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Error al crear la nota" });
    }
  }

  async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // Get user sort preferences
      const settingsResult = await pool.query(
        "SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1",
        [userId]
      );

      let orderBy = "updated_at DESC";

      if (settingsResult.rows.length > 0) {
        const { default_note_sort, default_note_sort_direction } = settingsResult.rows[0];

        const fieldMapping: { [key: string]: string } = {
          'date': 'updated_at',
          'pinned': 'is_pinned',
          'title': 'title'
        };

        const mappedField = fieldMapping[default_note_sort] || default_note_sort;
        orderBy = buildOrderByClause(mappedField, default_note_sort_direction);
      }

      const result = await pool.query(
        `SELECT * FROM notes
        WHERE user_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
        ORDER BY ${orderBy}`,
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      console.error("Error al obtener notas:", error);
      res.status(500).json({ error: "Error al obtener las notas" });
    }
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, images } = req.body;
      const userId = req.user.id;

      // Verify note exists and belongs to user
      const noteExists = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (noteExists.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

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

      updateFields.push(`updated_at = NOW()`);
      values.push(id, userId);

      const query = `
        UPDATE notes
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      res.status(200).json({
        message: "Nota actualizada exitosamente",
        note: result.rows[0],
      });
    } catch (error) {
      console.error("Error al actualizar nota:", error);
      res.status(500).json({
        error: "Error al actualizar la nota",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const noteResult = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (noteResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      const isInTrash = noteResult.rows[0].is_deleted;

      if (isInTrash) {
        // Permanently delete if already in trash
        await pool.query("DELETE FROM notes WHERE id = $1 AND user_id = $2", [id, userId]);
        res.json({ message: "Nota eliminada permanentemente" });
      } else {
        // Move to trash
        await pool.query(
          "UPDATE notes SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
        res.json({ message: "Nota movida a la papelera" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al procesar la nota" });
    }
  }

  async deleteMultipleNotes(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { noteIds } = req.body;
      const userId = req.user.id;

      await client.query(
        "DELETE FROM notes WHERE id = ANY($1) AND user_id = $2",
        [noteIds, userId]
      );

      await client.query("COMMIT");
      res.json({ message: "Notas eliminadas exitosamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== Trash Operations ====================

  async getTrashNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        "SELECT * FROM notes WHERE user_id = $1 AND is_deleted = true ORDER BY deleted_at DESC",
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las notas de la papelera" });
    }
  }

  async restoreNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        "UPDATE notes SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      res.json({
        message: "Nota restaurada exitosamente",
        note: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({ error: "Error al restaurar la nota" });
    }
  }

  async emptyTrash(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      await pool.query(
        "DELETE FROM notes WHERE user_id = $1 AND is_deleted = true",
        [userId]
      );

      res.json({ message: "Papelera vaciada exitosamente" });
    } catch (error) {
      res.status(500).json({ error: "Error al vaciar la papelera" });
    }
  }

  // ==================== Image Operations ====================

  async uploadNoteImage(req: RequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se ha proporcionado ninguna imagen" });
        return;
      }

      const imageUrl = `/uploads/note-images/${req.file.filename}`;

      res.json({
        message: "Imagen subida correctamente",
        data: { imageUrl },
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

  // ==================== Pin/Mark Operations ====================

  async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      const result = await pool.query(
        "UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  async toggleMark(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      const result = await pool.query(
        "UPDATE notes SET is_marked = NOT is_marked WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  async unmarkAllNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      await pool.query(
        "UPDATE notes SET is_marked = false WHERE user_id = $1",
        [userId]
      );

      res.json({ message: "Todas las notas han sido desmarcadas" });
    } catch (error) {
      res.status(500).json({ error: "Error al desmarcar las notas" });
    }
  }

  async getMarkedNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        "SELECT * FROM notes WHERE user_id = $1 AND is_marked = true ORDER BY updated_at DESC",
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las notas marcadas" });
    }
  }

  // ==================== User Preferences ====================

  async getUserSortPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        "SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        await pool.query(
          "INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING",
          [userId, "date", "desc"]
        );

        res.status(200).json({
          success: true,
          preferences: { sortType: "date", sortDirection: "desc" },
        });
        return;
      }

      const sortType = ["date", "title", "pinned"].includes(result.rows[0].default_note_sort)
        ? result.rows[0].default_note_sort
        : "date";

      const sortDirection = ["asc", "desc"].includes(result.rows[0].default_note_sort_direction)
        ? result.rows[0].default_note_sort_direction
        : "desc";

      res.status(200).json({
        success: true,
        preferences: { sortType, sortDirection },
      });
    } catch (error) {
      console.error("Error al obtener preferencias de ordenación:", error);
      res.status(200).json({
        success: true,
        preferences: { sortType: "date", sortDirection: "desc" },
      });
    }
  }

  async saveUserSortPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { sortType, sortDirection } = req.body;
      const userId = req.user.id;

      const checkResult = await pool.query(
        "SELECT id FROM settings WHERE user_id = $1",
        [userId]
      );

      if (checkResult.rows.length === 0) {
        await pool.query(
          "INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3)",
          [userId, sortType, sortDirection]
        );
      } else {
        await pool.query(
          "UPDATE settings SET default_note_sort = $1, default_note_sort_direction = $2 WHERE user_id = $3",
          [sortType, sortDirection, userId]
        );
      }

      res.status(200).json({
        success: true,
        message: "Preferencias de ordenación guardadas correctamente",
      });
    } catch (error) {
      console.error("Error al guardar preferencias de ordenación:", error);
      res.status(500).json({
        success: false,
        error: "Error al guardar preferencias de ordenación",
      });
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
        [
          noteData.title,
          noteData.content,
          noteData.user_id,
          noteData.color,
          noteData.images,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }
}
