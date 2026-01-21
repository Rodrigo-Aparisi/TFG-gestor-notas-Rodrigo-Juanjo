import { Request, Response } from "express";
import { pool } from "../../database";
import fs from "fs";
import path from "path";
import multer from "multer";
import { buildOrderByClause } from "../utils/queryHelpers";

// Configurar multer para el almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "note-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB límite
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }
    cb(null, true);
  },
}).single("image");

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

export class NoteController {
  // Crear una nueva nota
  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, images } = req.body;
      const userId = req.user.id;

      if (!title || title.trim() === "") {
        res.status(400).json({ error: "El título es requerido" });
        return;
      }

      // Procesar el contenido para manejar listas
      const processedContent = content
        .replace(/^- (.+)$/gm, "• $1")
        .replace(/^\* (.+)$/gm, "• $1")
        .replace(/^(\d+)\. (.+)$/gm, "$1. $2");

      // Modificar la consulta para incluir las imágenes
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

  // Obtener todas las notas del usuario
  async getNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // Primero obtenemos las preferencias de ordenación
      const settingsResult = await pool.query(
        "SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1",
        [userId]
      );

      let orderBy = "updated_at DESC";

      // Si hay preferencias, las aplicamos de forma segura
      if (settingsResult.rows.length > 0) {
        const { default_note_sort, default_note_sort_direction } =
          settingsResult.rows[0];

        // Map 'date' to 'updated_at' and 'pinned' to 'is_pinned' for compatibility
        const fieldMapping: { [key: string]: string } = {
          'date': 'updated_at',
          'pinned': 'is_pinned',
          'title': 'title'
        };

        const mappedField = fieldMapping[default_note_sort] || default_note_sort;

        // Use secure helper to build ORDER BY clause
        orderBy = buildOrderByClause(mappedField, default_note_sort_direction);
      }

      // Modificar esta consulta para excluir notas en papelera
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

  // Actualizar una nota
  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, images } = req.body;
      const userId = req.user.id;

      // Primero verifico si la nota existe y pertenece al usuario
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

  // Eliminar una nota
  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verificar si la nota existe y pertenece al usuario
      const noteResult = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (noteResult.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      // Verificar si la nota ya está en la papelera
      const isInTrash = noteResult.rows[0].is_deleted;

      if (isInTrash) {
        // Si ya está en la papelera, eliminar permanentemente
        await pool.query("DELETE FROM notes WHERE id = $1 AND user_id = $2", [
          id,
          userId,
        ]);
        res.json({ message: "Nota eliminada permanentemente" });
      } else {
        // Si no está en la papelera, mover a la papelera
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

  // Método para obtener notas de la papelera
  async getTrashNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        "SELECT * FROM notes WHERE user_id = $1 AND is_deleted = true ORDER BY deleted_at DESC",
        [userId]
      );

      res.json({ notes: result.rows });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Error al obtener las notas de la papelera" });
    }
  }

  // Método para restaurar una nota de la papelera
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

  // Método para eliminar permanentemente todas las notas de la papelera
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

  // Añadir nuevo método para subir imágenes
  async uploadNoteImage(req: RequestWithFile, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res
          .status(400)
          .json({ error: "No se ha proporcionado ninguna imagen" });
        return;
      }

      const imageUrl = `/uploads/note-images/${req.file.filename}`; // Modificar esta línea

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

  async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Primero verificamos si la nota existe y pertenece al usuario
      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      // Actualizamos el estado de is_pinned
      const result = await pool.query(
        "UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  // Método toggleMark dentro de la clase
  async toggleMark(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Primero verificamos si la nota existe y pertenece al usuario
      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (note.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      // Actualizamos el estado de is_marked
      const result = await pool.query(
        "UPDATE notes SET is_marked = NOT is_marked WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      res.json({ note: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  // Método para desmarcar todas las notas
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

  // Método para eliminar múltiples notas
  async deleteMultipleNotes(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verificación y eliminación
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

  // Método para obtener notas marcadas
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

  async createGroup(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const { name, color, noteIds } = req.body;
      const userId = req.user.id;

      await client.query("BEGIN");

      // Obtener la posición máxima actual
      const positionResult = await client.query(
        "SELECT COALESCE(MAX(position), -1) as max_position FROM note_groups WHERE user_id = $1",
        [userId]
      );

      const nextPosition = positionResult.rows[0].max_position + 1;

      // Crear el grupo con la nueva posición
      const groupResult = await client.query(
        "INSERT INTO note_groups (name, color, user_id, position) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, color, userId, nextPosition]
      );

      const groupId = groupResult.rows[0].id;

      // Añadir notas al grupo
      if (noteIds && noteIds.length > 0) {
        // Corregir este tipo explícitamente
        const placeholders = noteIds
          .map((_: any, idx: number) => `($1, $${idx + 2})`)
          .join(",");
        const values = [groupId, ...noteIds];

        await client.query(
          `
          INSERT INTO note_group_items (group_id, note_id) 
          VALUES ${placeholders}
        `,
          values
        );
      }

      await client.query("COMMIT");

      // Devolver el grupo con las notas incluidas
      const completeGroup = {
        ...groupResult.rows[0],
        note_ids: noteIds || [],
      };

      res.status(201).json({
        message: "Grupo creado exitosamente",
        group: completeGroup,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al crear el grupo:", error);
      res.status(500).json({ error: "Error al crear el grupo" });
    } finally {
      client.release();
    }
  }

  async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT g.*, 
        COALESCE(array_agg(ngi.note_id) FILTER (WHERE ngi.note_id IS NOT NULL), ARRAY[]::uuid[]) as note_ids,
        g.position
        FROM note_groups g
        LEFT JOIN note_group_items ngi ON g.id = ngi.group_id
        WHERE g.user_id = $1
        GROUP BY g.id
        ORDER BY g.position ASC, g.created_at DESC`,
        [userId]
      );

      const groups = result.rows.map((group) => ({
        ...group,
        id: group.id.toString(),
        note_ids: group.note_ids || [],
      }));

      res.json({ groups });
    } catch (error) {
      console.error("Error in getGroups:", error);
      res.status(500).json({ error: "Error al obtener los grupos" });
    }
  }

  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, color } = req.body;
      const userId = req.user.id;

      // Verificar que el grupo existe y pertenece al usuario
      const checkGroup = await pool.query(
        "SELECT * FROM note_groups WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (checkGroup.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      // Actualizar el grupo
      const result = await pool.query(
        "UPDATE note_groups SET name = $1, color = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
        [name, color, id, userId]
      );

      // Obtener las notas asociadas al grupo
      const notesResult = await pool.query(
        `SELECT note_id FROM note_group_items WHERE group_id = $1`,
        [id]
      );

      const noteIds = notesResult.rows.map((row) => row.note_id);

      res.json({
        message: "Grupo actualizado exitosamente",
        group: {
          ...result.rows[0],
          id: result.rows[0].id.toString(),
          note_ids: noteIds,
        },
      });
    } catch (error) {
      console.error("Error al actualizar grupo:", error);
      res.status(500).json({ error: "Error al actualizar el grupo" });
    }
  }

  async addNoteToGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, noteId } = req.body;
      const userId = req.user.id;

      // Verificar que el grupo existe y pertenece al usuario
      const groupCheck = await pool.query(
        "SELECT * FROM note_groups WHERE id = $1 AND user_id = $2",
        [groupId, userId]
      );

      if (groupCheck.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      // Verificar que la nota existe y pertenece al usuario
      const noteCheck = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [noteId, userId]
      );

      if (noteCheck.rows.length === 0) {
        res.status(404).json({ error: "Nota no encontrada" });
        return;
      }

      // Verificar si la nota ya está en el grupo
      const existingCheck = await pool.query(
        "SELECT * FROM note_group_items WHERE group_id = $1 AND note_id = $2",
        [groupId, noteId]
      );

      if (existingCheck.rows.length > 0) {
        res.status(400).json({ error: "La nota ya está en este grupo" });
        return;
      }

      // Añadir la nota al grupo
      await pool.query(
        "INSERT INTO note_group_items (group_id, note_id) VALUES ($1, $2)",
        [groupId, noteId]
      );

      res.json({ message: "Nota añadida al grupo exitosamente" });
    } catch (error) {
      console.error("Error al añadir nota al grupo:", error);
      res.status(500).json({ error: "Error al añadir la nota al grupo" });
    }
  }

  async removeNoteFromGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, noteId } = req.params;
      const userId = req.user.id;

      // Verificar que el grupo existe y pertenece al usuario
      const groupCheck = await pool.query(
        "SELECT * FROM note_groups WHERE id = $1 AND user_id = $2",
        [groupId, userId]
      );

      if (groupCheck.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      // Eliminar la nota del grupo
      await pool.query(
        "DELETE FROM note_group_items WHERE group_id = $1 AND note_id = $2",
        [groupId, noteId]
      );

      res.json({ message: "Nota eliminada del grupo exitosamente" });
    } catch (error) {
      console.error("Error al eliminar nota del grupo:", error);
      res.status(500).json({ error: "Error al eliminar la nota del grupo" });
    }
  }

  async reorderGroups(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const { groupIds } = req.body;
      const userId = req.user.id;

      // Verificar si groupIds es un array y no está vacío
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        res
          .status(400)
          .json({ error: "Se requiere un array de IDs de grupos" });
        return;
      }

      await client.query("BEGIN");

      // Verificar que todos los grupos pertenecen al usuario antes de reordenarlos
      const groupsCheck = await client.query(
        "SELECT id FROM note_groups WHERE id = ANY($1) AND user_id = $2",
        [groupIds, userId]
      );

      if (groupsCheck.rows.length !== groupIds.length) {
        await client.query("ROLLBACK");
        res.status(400).json({
          error: "Uno o más grupos no existen o no pertenecen al usuario",
        });
        return;
      }

      // Actualizar la posición de cada grupo con manejo adecuado de errores
      for (let i = 0; i < groupIds.length; i++) {
        await client.query(
          "UPDATE note_groups SET position = $1 WHERE id = $2 AND user_id = $3",
          [i, groupIds[i], userId]
        );
      }

      await client.query("COMMIT");
      res.json({ message: "Orden de grupos actualizado exitosamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al reordenar grupos:", error);
      res.status(500).json({
        error: "Error al reordenar los grupos",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      client.release();
    }
  }

  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await pool.query(
        "DELETE FROM note_groups WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({ message: "Grupo eliminado exitosamente" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar el grupo" });
    }
  }

  async shareNote(req: Request, res: Response): Promise<void> {
    try {
      const {
        noteId,
        username,
        includeImages = true,
        canEdit = false,
      } = req.body;
      const ownerId = req.user.id;

      // Validar datos de entrada
      if (!noteId || !username) {
        res.status(400).json({ error: "Se requieren noteId y username" });
        return;
      }

      // Verificar que la nota existe y pertenece al usuario actual
      const note = await pool.query(
        "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        [noteId, ownerId]
      );

      if (note.rows.length === 0) {
        res
          .status(404)
          .json({ error: "Nota no encontrada o no tienes permiso" });
        return;
      }

      // Buscar al usuario con quien compartir
      const targetUser = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );

      if (targetUser.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const sharedWithId = targetUser.rows[0].id;

      // Evitar compartir con uno mismo
      if (sharedWithId === ownerId) {
        res
          .status(400)
          .json({ error: "No puedes compartir una nota contigo mismo" });
        return;
      }

      // Verificar si ya está compartida con este usuario
      const existingShare = await pool.query(
        "SELECT * FROM shared_notes WHERE note_id = $1 AND shared_with_id = $2",
        [noteId, sharedWithId]
      );

      if (existingShare.rows.length > 0) {
        // Si ya está compartida, actualizamos los permisos
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

      // Insertar en la tabla shared_notes con los nuevos campos
      await pool.query(
        "INSERT INTO shared_notes (note_id, owner_id, shared_with_id, can_edit, include_images) VALUES ($1, $2, $3, $4, $5)",
        [noteId, ownerId, sharedWithId, canEdit, includeImages]
      );

      res
        .status(200)
        .json({ success: true, message: "Nota compartida exitosamente" });
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
        WHERE sn.shared_with_id = \$1
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

  async updateSharedNotePermissions(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { username, canEdit, includeImages } = req.body;
      const ownerId = req.user.id;

      // Buscar al usuario con quien se compartió
      const targetUser = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );

      if (targetUser.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const sharedWithId = targetUser.rows[0].id;

      // Verificar que el usuario actual es el propietario de la nota
      const isOwner = await pool.query(
        "SELECT 1 FROM shared_notes WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3",
        [id, ownerId, sharedWithId]
      );

      if (isOwner.rows.length === 0) {
        res.status(403).json({
          error:
            "No tienes permiso para modificar los permisos de esta nota compartida",
        });
        return;
      }

      // Actualizar los permisos
      let updateQuery =
        "UPDATE shared_notes SET updated_at = CURRENT_TIMESTAMP";
      const queryParams = [id, ownerId, sharedWithId];
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

      updateQuery +=
        " WHERE note_id = $1 AND owner_id = $2 AND shared_with_id = $3";

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

      console.log("Updating shared note:", { id, userId, data: req.body });

      // Verificar permisos
      const hasPermission = await pool.query(
        `SELECT 1 FROM shared_notes 
       WHERE note_id = $1 
       AND shared_with_id = $2 
       AND can_edit = true`,
        [id, userId]
      );

      console.log("Permission check result:", hasPermission.rows);

      if (hasPermission.rows.length === 0) {
        console.log("Permission denied for user", userId, "on note", id);
        res.status(403).json({
          error: "No tienes permiso para editar esta nota",
        });
        return;
      }

      // Construir la consulta de actualización
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
        console.log("No fields to update");
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

      console.log("Query:", query);
      console.log("Values:", values);

      const result = await pool.query(query, values);

      console.log("Update result:", result.rows);

      if (result.rows.length === 0) {
        console.log("Note not found:", id);
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
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string" || query.length < 2) {
        res
          .status(400)
          .json({ error: "La consulta debe tener al menos 2 caracteres" });
        return;
      }

      // Buscar usuarios que coincidan con el patrón
      const result = await pool.query(
        `SELECT id, username FROM users 
       WHERE username ILIKE $1 
       ORDER BY username ASC 
       LIMIT 10`,
        [`${query}%`] // Busca usuarios que comiencen con la consulta
      );

      res.json({ users: result.rows });
    } catch (error) {
      console.error("Error al buscar usuarios:", error);
      res.status(500).json({ error: "Error al buscar usuarios" });
    }
  }

  async getUserSortPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        "SELECT default_note_sort, default_note_sort_direction FROM settings WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        // Si no hay configuración, crear una predeterminada
        await pool.query(
          "INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING",
          [userId, "date", "desc"]
        );

        res.status(200).json({
          success: true,
          preferences: {
            sortType: "date",
            sortDirection: "desc",
          },
        });
        return;
      }

      // Asegurar que los valores son válidos
      const sortType = ["date", "title", "pinned"].includes(
        result.rows[0].default_note_sort
      )
        ? result.rows[0].default_note_sort
        : "date";

      const sortDirection = ["asc", "desc"].includes(
        result.rows[0].default_note_sort_direction
      )
        ? result.rows[0].default_note_sort_direction
        : "desc";

      res.status(200).json({
        success: true,
        preferences: {
          sortType,
          sortDirection,
        },
      });
    } catch (error) {
      console.error("Error al obtener preferencias de ordenación:", error);
      // En caso de error, devolver valores predeterminados
      res.status(200).json({
        success: true,
        preferences: {
          sortType: "date",
          sortDirection: "desc",
        },
      });
    }
  }

  async saveUserSortPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { sortType, sortDirection } = req.body;
      const userId = req.user.id;

      // Verificar si ya existe una configuración para el usuario
      const checkResult = await pool.query(
        "SELECT id FROM settings WHERE user_id = $1",
        [userId]
      );

      if (checkResult.rows.length === 0) {
        // Si no existe, crear una nueva configuración
        await pool.query(
          "INSERT INTO settings (user_id, default_note_sort, default_note_sort_direction) VALUES ($1, $2, $3)",
          [userId, sortType, sortDirection]
        );
      } else {
        // Si existe, actualizar la configuración existente
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

  // Método para uso interno desde chatbotController
  async createNoteInternal(noteData: any) {
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
