import { Request, Response } from "express";
import { pool } from "../config/database";
import fs from "fs";
import path from "path";
import multer from "multer";

// Configurar multer para el almacenamiento de imágenes en notas de grupo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(
      __dirname,
      "..",
      "uploads",
      "group-note-images"
    );
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
    fileSize: 5 * 1024 * 1024, // 5MB límite
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

export class UserGroupController {
  // Obtener todos los grupos del usuario
  async getUserGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // Obtener grupos donde el usuario es miembro
      const result = await pool.query(
        `
      SELECT 
        ug.*,
        (ug.owner_id = $1) AS is_owner,
        COALESCE(
          json_agg(
            json_build_object(
              'id', gm.id,
              'user_id', gm.user_id,
              'username', u.username,
              'profile_image', u.profile_image,
              'role', gm.role,
              'joined_at', gm.joined_at
            )
          ) FILTER (WHERE gm.id IS NOT NULL), 
          '[]'
        ) AS members
      FROM user_groups ug
      JOIN group_members gm ON ug.id = gm.group_id
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = $1
      )
      GROUP BY ug.id
      ORDER BY ug.created_at DESC
    `,
        [userId]
      );

      // Asegúrate de devolver un array vacío si no hay resultados
      const groups = result.rows || [];

      res.json({ groups }); // Devuelve un objeto con una propiedad 'groups' que es un array
    } catch (error) {
      console.error("Error al obtener grupos de usuario:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los grupos", groups: [] }); // Siempre devuelve un array vacío en caso de error
    }
  }

  // Crear un nuevo grupo de usuarios
  async createUserGroup(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { name, description } = req.body;
      const ownerId = req.user.id;

      if (!name || name.trim() === "") {
        res.status(400).json({ error: "El nombre del grupo es obligatorio" });
        return;
      }

      // Crear el grupo
      const createGroupResult = await client.query(
        `
        INSERT INTO user_groups (name, description, owner_id)
        VALUES ($1, $2, \$3)
        RETURNING *
      `,
        [name, description, ownerId]
      );

      const group = createGroupResult.rows[0];
      const groupId = group.id;

      // Añadir al creador como miembro con rol 'owner'
      await client.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, \$3)
        RETURNING *
      `,
        [groupId, ownerId, "owner"]
      );

      // Obtener información del miembro para la respuesta
      const memberResult = await client.query(
        `
        SELECT 
          gm.id,
          gm.user_id,
          u.username,
          u.profile_image,
          gm.role,
          gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.user_id = $2
      `,
        [groupId, ownerId]
      );

      await client.query("COMMIT");

      // Devolver el grupo con sus miembros
      res.status(201).json({
        message: "Grupo creado exitosamente",
        group: {
          ...group,
          is_owner: true,
          members: memberResult.rows,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al crear grupo de usuarios:", error);
      res.status(500).json({ error: "Error al crear el grupo" });
    } finally {
      client.release();
    }
  }

  // Obtener un grupo específico
  async getUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verificar que el usuario es miembro del grupo
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

      // Obtener información del grupo con sus miembros
      const result = await pool.query(
        `
        SELECT 
          ug.*, 
          (ug.owner_id = \$2) AS is_owner,
          COALESCE(
            json_agg(
              json_build_object(
                'id', gm.id,
                'user_id', gm.user_id,
                'username', u.username,
                'profile_image', u.profile_image,
                'role', gm.role,
                'joined_at', gm.joined_at
              )
            ) FILTER (WHERE gm.id IS NOT NULL), 
            '[]'
          ) AS members
        FROM user_groups ug
        LEFT JOIN group_members gm ON ug.id = gm.group_id
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE ug.id = \$1
        GROUP BY ug.id
      `,
        [groupId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({ group: result.rows[0] });
    } catch (error) {
      console.error("Error al obtener grupo:", error);
      res.status(500).json({ error: "Error al obtener el grupo" });
    }
  }

  // Actualizar un grupo
  async updateUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { name, description } = req.body;

      // Verificar que el usuario es propietario o administrador del grupo
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
          .json({ error: "No tienes permisos para actualizar este grupo" });
        return;
      }

      // Actualizar el grupo
      const updateResult = await pool.query(
        `
        UPDATE user_groups
        SET name = COALESCE(\$1, name),
            description = COALESCE(\$2, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = \$3
        RETURNING *
      `,
        [name, description, groupId]
      );

      if (updateResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      res.json({
        message: "Grupo actualizado exitosamente",
        group: updateResult.rows[0],
      });
    } catch (error) {
      console.error("Error al actualizar grupo:", error);
      res.status(500).json({ error: "Error al actualizar el grupo" });
    }
  }

  // Eliminar un grupo
  async deleteUserGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verificar que el usuario es propietario del grupo
      const ownerCheckResult = await pool.query(
        `
        SELECT owner_id FROM user_groups WHERE id = \$1
      `,
        [groupId]
      );

      if (ownerCheckResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      if (ownerCheckResult.rows[0].owner_id !== userId) {
        res
          .status(403)
          .json({ error: "Solo el propietario puede eliminar el grupo" });
        return;
      }

      // Eliminar el grupo (las eliminaciones en cascada manejarán miembros y notas)
      await pool.query(
        `
        DELETE FROM user_groups
        WHERE id = \$1
      `,
        [groupId]
      );

      res.json({ message: "Grupo eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar grupo:", error);
      res.status(500).json({ error: "Error al eliminar el grupo" });
    }
  }

  // Obtener miembros de un grupo
  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verificar que el usuario es miembro del grupo
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

      // Obtener miembros del grupo
      const result = await pool.query(
        `
        SELECT 
          gm.id,
          gm.user_id,
          u.username,
          u.profile_image,
          gm.role,
          gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = \$1
        ORDER BY 
          CASE 
            WHEN gm.role = 'owner' THEN 1
            WHEN gm.role = 'admin' THEN 2
            ELSE 3
          END,
          u.username
      `,
        [groupId]
      );

      res.json({ members: result.rows });
    } catch (error) {
      console.error("Error al obtener miembros del grupo:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los miembros del grupo" });
    }
  }

  // Añadir un miembro al grupo
  async addGroupMember(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const groupId = req.params.id;
      const userId = req.user.id;
      const { username, role = "member" } = req.body;

      if (!username) {
        res.status(400).json({ error: "El nombre de usuario es obligatorio" });
        return;
      }

      if (!["admin", "member"].includes(role)) {
        res.status(400).json({ error: "Rol no válido" });
        return;
      }

      // Verificar que el usuario que añade es propietario o administrador
      const roleCheckResult = await client.query(
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

      const currentUserRole = roleCheckResult.rows[0].role;
      if (currentUserRole !== "owner" && currentUserRole !== "admin") {
        res
          .status(403)
          .json({ error: "No tienes permisos para añadir miembros" });
        return;
      }

      // Verificar que solo el propietario puede añadir administradores
      if (role === "admin" && currentUserRole !== "owner") {
        res
          .status(403)
          .json({ error: "Solo el propietario puede añadir administradores" });
        return;
      }

      // Buscar al usuario por nombre de usuario
      const findUserResult = await client.query(
        `
        SELECT id FROM users WHERE username = \$1
      `,
        [username]
      );

      if (findUserResult.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const newMemberId = findUserResult.rows[0].id;

      // Verificar si el usuario ya es miembro
      const memberExistsResult = await client.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        ) as exists
      `,
        [groupId, newMemberId]
      );

      const memberExists = memberExistsResult.rows[0].exists;

      if (memberExists) {
        res.status(400).json({ error: "El usuario ya es miembro del grupo" });
        return;
      }

      // Añadir al nuevo miembro
      await client.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, \$3)
        RETURNING *
      `,
        [groupId, newMemberId, role]
      );

      // Obtener información completa del miembro
      const getMemberResult = await client.query(
        `
        SELECT 
          gm.id,
          gm.user_id,
          u.username,
          u.profile_image,
          gm.role,
          gm.joined_at
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.user_id = $2
      `,
        [groupId, newMemberId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Miembro añadido correctamente",
        member: getMemberResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al añadir miembro al grupo:", error);
      res.status(500).json({ error: "Error al añadir miembro al grupo" });
    } finally {
      client.release();
    }
  }

  // Eliminar un miembro del grupo
  async removeGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.userId;
      const userId = req.user.id;

      // Verificar que el usuario que elimina es propietario, administrador o se está eliminando a sí mismo
      if (userId !== memberUserId) {
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

        const currentUserRole = roleCheckResult.rows[0].role;
        if (currentUserRole !== "owner" && currentUserRole !== "admin") {
          res
            .status(403)
            .json({ error: "No tienes permisos para eliminar miembros" });
          return;
        }

        // Verificar el rol del miembro a eliminar
        const memberRoleResult = await pool.query(
          `
          SELECT role FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        `,
          [groupId, memberUserId]
        );

        if (memberRoleResult.rows.length === 0) {
          res.status(404).json({ error: "Miembro no encontrado" });
          return;
        }

        const memberRole = memberRoleResult.rows[0].role;

        // Administradores no pueden eliminar al propietario ni a otros administradores
        if (
          currentUserRole === "admin" &&
          (memberRole === "owner" || memberRole === "admin")
        ) {
          res
            .status(403)
            .json({ error: "No tienes permisos para eliminar a este miembro" });
          return;
        }

        // No se puede eliminar al propietario
        if (memberRole === "owner") {
          res
            .status(403)
            .json({ error: "No se puede eliminar al propietario del grupo" });
          return;
        }
      }

      // Eliminar al miembro
      const deleteResult = await pool.query(
        `
        DELETE FROM group_members
        WHERE group_id = $1 AND user_id = $2
        RETURNING *
      `,
        [groupId, memberUserId]
      );

      if (deleteResult.rows.length === 0) {
        res.status(404).json({ error: "Miembro no encontrado" });
        return;
      }

      res.json({ message: "Miembro eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar miembro del grupo:", error);
      res.status(500).json({ error: "Error al eliminar miembro del grupo" });
    }
  }

  // Cambiar el rol de un miembro
async updateMemberRole(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.id;
    const memberUserId = req.params.userId;
    const userId = req.user.id;
    const { role } = req.body;

    // Validar el rol proporcionado
    if (!["admin", "member"].includes(role)) {
      res.status(400).json({ error: "Rol no válido" });
      return;
    }

    // No permitir que un usuario cambie su propio rol
    if (memberUserId === userId) {
      res.status(403).json({ error: "No puedes cambiar tus propios permisos" });
      return;
    }

    // Obtener información del grupo y verificar que existe
    const groupResult = await pool.query(
      `
      SELECT owner_id FROM user_groups WHERE id = $1
      `,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      res.status(404).json({ error: "Grupo no encontrado" });
      return;
    }

    // No se puede cambiar el rol del propietario
    if (memberUserId === groupResult.rows[0].owner_id) {
      res
        .status(403)
        .json({ error: "No se puede cambiar el rol del propietario" });
      return;
    }

    // Verificar el rol del usuario actual en el grupo
    const currentUserRoleResult = await pool.query(
      `
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, userId]
    );

    if (currentUserRoleResult.rows.length === 0) {
      res.status(403).json({ error: "No tienes acceso a este grupo" });
      return;
    }

    const currentUserRole = currentUserRoleResult.rows[0].role;
    
    // Solo propietarios y administradores pueden cambiar roles
    if (currentUserRole !== "owner" && currentUserRole !== "admin") {
      res
        .status(403)
        .json({ error: "No tienes permisos para cambiar roles" });
      return;
    }

    // Obtener el rol actual del miembro a modificar
    const memberRoleResult = await pool.query(
      `
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, memberUserId]
    );

    if (memberRoleResult.rows.length === 0) {
      res.status(404).json({ error: "Miembro no encontrado" });
      return;
    }

    const memberCurrentRole = memberRoleResult.rows[0].role;

    // Si el usuario actual es admin, no puede cambiar el rol de otros admins
    if (currentUserRole === "admin" && memberCurrentRole === "admin") {
      res
        .status(403)
        .json({ error: "Los administradores no pueden modificar el rol de otros administradores" });
      return;
    }

    // Actualizar el rol
    const updateResult = await pool.query(
      `
      UPDATE group_members
      SET role = $1
      WHERE group_id = $2 AND user_id = $3
      RETURNING *
      `,
      [role, groupId, memberUserId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: "Miembro no encontrado" });
      return;
    }

    // Obtener información completa del miembro
    const getMemberResult = await pool.query(
      `
      SELECT 
        gm.id,
        gm.user_id,
        u.username,
        u.profile_image,
        gm.role,
        gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.user_id = $2
      `,
      [groupId, memberUserId]
    );

    res.json({
      message: "Rol actualizado correctamente",
      member: getMemberResult.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar rol de miembro:", error);
    res.status(500).json({ error: "Error al actualizar rol de miembro" });
  }
}

  // Obtener notas de un grupo
  async getGroupNotes(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verificar que el usuario es miembro del grupo
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

      // Obtener las notas del grupo
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

      console.log("Group notes query result:", result.rows); // Log para depuración

      const notes = result.rows || [];

      console.log("Sending response with notes:", { notes }); // Log para depuración

      res.json({ notes });
    } catch (error) {
      console.error("Error al obtener notas del grupo:", error);
      res
        .status(500)
        .json({ error: "Error al obtener las notas del grupo", notes: [] });
    }
  }

  // Crear una nota en el grupo
  async createGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { title, content, images = [] } = req.body;

      if (!title || title.trim() === "") {
        res.status(400).json({ error: "El título es obligatorio" });
        return;
      }

      // Verificar que el usuario es miembro del grupo
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

      // Crear la nota
      const createNoteResult = await pool.query(
        `
        INSERT INTO group_notes (title, content, user_id, group_id, images)
        VALUES ($1, $2, $3, $4, \$5)
        RETURNING *
      `,
        [title, content, userId, groupId, images]
      );

      const note = createNoteResult.rows[0];

      // Obtener el nombre de usuario del creador
      const userResult = await pool.query(
        `
        SELECT username FROM users WHERE id = \$1
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

  // Obtener una nota específica del grupo
  async getGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

      // Verificar que el usuario es miembro del grupo
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

      // Obtener la nota
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

  // Actualizar una nota del grupo
  async updateGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;
      const { title, content, color, images } = req.body;

      // Verificar que la nota existe y pertenece al grupo
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

      // Verificar que el usuario es el creador de la nota o tiene permisos de administrador/propietario
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
            .json({ error: "No tienes permisos para editar esta nota" });
          return;
        }
      }

      // Construir la consulta de actualización dinámica
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(title);
      }

      if (content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        values.push(content);
      }

      if (color !== undefined) {
        updateFields.push(`color = $${paramIndex++}`);
        values.push(color);
      }

      if (images !== undefined) {
        updateFields.push(`images = $${paramIndex++}`);
        values.push(images);
      }

      if (updateFields.length === 0) {
        res
          .status(400)
          .json({ error: "No se proporcionaron campos para actualizar" });
        return;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(noteId);

      const updateQuery = `
        UPDATE group_notes
        SET \${updateFields.join(', ')}
        WHERE id = \$\${paramIndex}
        RETURNING *
      `;

      const updateResult = await pool.query(updateQuery, values);

      // Obtener información completa de la nota actualizada
      const getNoteResult = await pool.query(
        `
        SELECT 
          gn.*,
          u.username as created_by_username
        FROM group_notes gn
        JOIN users u ON gn.user_id = u.id
        WHERE gn.id = \$1
      `,
        [noteId]
      );

      res.json({
        message: "Nota actualizada correctamente",
        note: getNoteResult.rows[0],
      });
    } catch (error) {
      console.error("Error al actualizar nota de grupo:", error);
      res.status(500).json({ error: "Error al actualizar la nota" });
    }
  }

  // Eliminar una nota del grupo
  async deleteGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

      // Verificar que la nota existe y pertenece al grupo
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

      // Verificar que el usuario es el creador de la nota o tiene permisos de administrador/propietario
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

      // Eliminar imágenes asociadas si existen
      const noteResult = await pool.query(
        `
        SELECT images FROM group_notes WHERE id = $1
      `,
        [noteId]
      );

      const images = noteResult.rows[0].images || [];

      for (const imagePath of images) {
        if (imagePath && imagePath.startsWith("/uploads/group-note-images/")) {
          const fullPath = path.join(__dirname, "..", imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // Eliminar la nota
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

  // Marcar/desmarcar una nota como importante
  async togglePinGroupNote(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const noteId = req.params.noteId;
      const userId = req.user.id;

      // Verificar que la nota existe y pertenece al grupo
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

      // Verificar que el usuario es el creador de la nota o tiene permisos de administrador/propietario
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

      // Actualizar el estado de is_pinned
      const updateResult = await pool.query(
        `
      UPDATE group_notes
      SET is_pinned = NOT is_pinned
      WHERE id = $1
      RETURNING *
    `,
        [noteId]
      );

      // Obtener información completa de la nota actualizada
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

  // Subir una imagen para una nota de grupo
  async uploadGroupNoteImage(
    req: RequestWithFile,
    res: Response
  ): Promise<void> {
    try {
      if (!req.file) {
        res
          .status(400)
          .json({ error: "No se ha proporcionado ninguna imagen" });
        return;
      }

      // Construir la URL relativa para la imagen
      const imageUrl = `/uploads/group-note-images/${req.file.filename}`;

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

  // Invitar a un usuario al grupo por email
  async inviteUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "El email es obligatorio" });
        return;
      }

      // Verificar que el usuario que invita es miembro del grupo
      const memberCheckResult = await pool.query(
        `
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2
      `,
        [groupId, userId]
      );

      if (memberCheckResult.rows.length === 0) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      // Solo propietarios y administradores pueden invitar
      const role = memberCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        res
          .status(403)
          .json({ error: "No tienes permisos para invitar usuarios" });
        return;
      }

      // Verificar que el grupo existe
      const groupResult = await pool.query(
        `
        SELECT name FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      // Buscar al usuario por email
      const userResult = await pool.query(
        `
        SELECT id FROM users WHERE email = $1
      `,
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const invitedUserId = userResult.rows[0].id;

      // Verificar si el usuario ya es miembro
      const existingMemberResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        ) as exists
      `,
        [groupId, invitedUserId]
      );

      if (existingMemberResult.rows[0].exists) {
        res.status(400).json({ error: "El usuario ya es miembro del grupo" });
        return;
      }

      // Añadir al usuario como miembro con rol 'member'
      await pool.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'member')
      `,
        [groupId, invitedUserId]
      );

      // En un sistema real, aquí enviaríamos un email de notificación

      res.json({ message: "Usuario invitado correctamente" });
    } catch (error) {
      console.error("Error al invitar usuario:", error);
      res.status(500).json({ error: "Error al procesar la invitación" });
    }
  }

  // Buscar usuarios para añadir al grupo
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const groupId = req.params.id;
      const userId = req.user.id;

      if (!query || query.trim().length < 2) {
        res
          .status(400)
          .json({
            error: "La consulta de búsqueda debe tener al menos 2 caracteres",
          });
        return;
      }

      // Verificar que el usuario es miembro del grupo
      const memberCheckResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, userId]
      );

      if (!memberCheckResult.rows[0].is_member) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      // Obtener los IDs de los usuarios que ya son miembros
      const existingMembersResult = await pool.query(
        `
        SELECT user_id FROM group_members WHERE group_id = $1
      `,
        [groupId]
      );

      const existingMemberIds = existingMembersResult.rows.map(
        (row) => row.user_id
      );

      // Buscar usuarios que coincidan con la consulta y no sean miembros
      const searchResult = await pool.query(
        `
        SELECT id, username, email, profile_image
        FROM users
        WHERE (username ILIKE $1 OR email ILIKE $1)
        AND id != ALL($2)
        LIMIT 10
      `,
        [`%${query}%`, existingMemberIds]
      );

      res.json({ users: searchResult.rows });
    } catch (error) {
      console.error("Error al buscar usuarios:", error);
      res.status(500).json({ error: "Error al buscar usuarios" });
    }
  }

  // Abandonar un grupo
  async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verificar que el usuario es miembro del grupo
      const memberCheckResult = await pool.query(
        `
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2
      `,
        [groupId, userId]
      );

      if (memberCheckResult.rows.length === 0) {
        res.status(403).json({ error: "No eres miembro de este grupo" });
        return;
      }

      // Verificar si el usuario es el propietario
      const role = memberCheckResult.rows[0].role;
      if (role === "owner") {
        res.status(400).json({
          error:
            "Eres el propietario del grupo. Transfiere la propiedad antes de abandonar o elimina el grupo.",
        });
        return;
      }

      // Eliminar al usuario del grupo
      await pool.query(
        `
        DELETE FROM group_members
        WHERE group_id = $1 AND user_id = $2
      `,
        [groupId, userId]
      );

      res.json({ message: "Has abandonado el grupo correctamente" });
    } catch (error) {
      console.error("Error al abandonar grupo:", error);
      res.status(500).json({ error: "Error al abandonar el grupo" });
    }
  }

  // Transferir propiedad del grupo
  async transferOwnership(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        res
          .status(400)
          .json({ error: "El ID del nuevo propietario es obligatorio" });
        return;
      }

      // Verificar que el usuario actual es el propietario
      const groupResult = await pool.query(
        `
        SELECT owner_id FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: "Grupo no encontrado" });
        return;
      }

      if (groupResult.rows[0].owner_id !== userId) {
        res
          .status(403)
          .json({ error: "Solo el propietario puede transferir la propiedad" });
        return;
      }

      // Verificar que el nuevo propietario es miembro del grupo
      const newOwnerCheckResult = await pool.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members 
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, newOwnerId]
      );

      if (!newOwnerCheckResult.rows[0].is_member) {
        res
          .status(400)
          .json({ error: "El nuevo propietario debe ser miembro del grupo" });
        return;
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Actualizar el propietario en la tabla user_groups
        await client.query(
          `
          UPDATE user_groups
          SET owner_id = $1
          WHERE id = $2
        `,
          [newOwnerId, groupId]
        );

        // Actualizar el rol del antiguo propietario a 'admin'
        await client.query(
          `
          UPDATE group_members
          SET role = 'admin'
          WHERE group_id = $1 AND user_id = $2
        `,
          [groupId, userId]
        );

        // Actualizar el rol del nuevo propietario a 'owner'
        await client.query(
          `
          UPDATE group_members
          SET role = 'owner'
          WHERE group_id = $1 AND user_id = $2
        `,
          [groupId, newOwnerId]
        );

        await client.query("COMMIT");

        res.json({ message: "Propiedad del grupo transferida correctamente" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error al transferir propiedad del grupo:", error);
      res
        .status(500)
        .json({ error: "Error al transferir propiedad del grupo" });
    }
  }
}
