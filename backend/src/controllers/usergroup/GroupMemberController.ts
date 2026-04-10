import { Request, Response } from "express";
import { pool } from "../../database";

/**
 * Controller for Group Member operations
 * Handles member management, invitations, and ownership transfers
 */
export class GroupMemberController {
  // Get group members
  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verify user is a member of the group
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

      // Get group members
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
        WHERE gm.group_id = $1
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

  // Add a member to the group
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

      // Verify user adding is owner or admin
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

      // Only owner can add admins
      if (role === "admin" && currentUserRole !== "owner") {
        res
          .status(403)
          .json({ error: "Solo el propietario puede añadir administradores" });
        return;
      }

      // Find user by username
      const findUserResult = await client.query(
        `
        SELECT id FROM users WHERE username = $1
      `,
        [username]
      );

      if (findUserResult.rows.length === 0) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const newMemberId = findUserResult.rows[0].id;

      // Check if user is already a member
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

      // Add new member
      await client.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [groupId, newMemberId, role]
      );

      // Get complete member information
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

  // Remove a member from the group
  async removeGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.userId;
      const userId = req.user.id;

      // Verify user removing is owner, admin, or removing themselves
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

        // Check member role to remove
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

        // Admins cannot remove owner or other admins
        if (
          currentUserRole === "admin" &&
          (memberRole === "owner" || memberRole === "admin")
        ) {
          res
            .status(403)
            .json({ error: "No tienes permisos para eliminar a este miembro" });
          return;
        }

        // Cannot remove owner
        if (memberRole === "owner") {
          res
            .status(403)
            .json({ error: "No se puede eliminar al propietario del grupo" });
          return;
        }
      }

      // Remove member
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

  // Update member role
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.userId;
      const userId = req.user.id;
      const { role } = req.body;

      // Validate role
      if (!["admin", "member"].includes(role)) {
        res.status(400).json({ error: "Rol no válido" });
        return;
      }

      // Cannot change own role
      if (memberUserId === userId) {
        res
          .status(403)
          .json({ error: "No puedes cambiar tus propios permisos" });
        return;
      }

      // Get group info and verify it exists
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

      // Cannot change owner role
      if (memberUserId === groupResult.rows[0].owner_id) {
        res
          .status(403)
          .json({ error: "No se puede cambiar el rol del propietario" });
        return;
      }

      // Verify current user role in group
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

      // Only owners and admins can change roles
      if (currentUserRole !== "owner" && currentUserRole !== "admin") {
        res
          .status(403)
          .json({ error: "No tienes permisos para cambiar roles" });
        return;
      }

      // Get current role of member to modify
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

      // Admins cannot change role of other admins
      if (currentUserRole === "admin" && memberCurrentRole === "admin") {
        res.status(403).json({
          error:
            "Los administradores no pueden modificar el rol de otros administradores",
        });
        return;
      }

      // Update role
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

      // Get complete member information
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

  // Invite user by email
  async inviteUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "El email es obligatorio" });
        return;
      }

      // Verify user inviting is a member
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

      // Only owners and admins can invite
      const role = memberCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        res
          .status(403)
          .json({ error: "No tienes permisos para invitar usuarios" });
        return;
      }

      // Verify group exists
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

      // Find user by email
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

      // Check if user is already a member
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

      // Add user as member with 'member' role
      await pool.query(
        `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'member')
      `,
        [groupId, invitedUserId]
      );

      res.json({ message: "Usuario invitado correctamente" });
    } catch (error) {
      console.error("Error al invitar usuario:", error);
      res.status(500).json({ error: "Error al procesar la invitación" });
    }
  }

  // Search users to add to group
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const groupId = req.params.id;
      const userId = req.user.id;

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          error: "La consulta de búsqueda debe tener al menos 2 caracteres",
        });
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

      if (!memberCheckResult.rows[0].is_member) {
        res.status(403).json({ error: "No tienes acceso a este grupo" });
        return;
      }

      // Get IDs of users who are already members
      const existingMembersResult = await pool.query(
        `
        SELECT user_id FROM group_members WHERE group_id = $1
      `,
        [groupId]
      );

      const existingMemberIds = existingMembersResult.rows.map(
        (row) => row.user_id
      );

      // Search users matching query who are not members
      // email is excluded from SELECT to protect user PII
      const searchResult = await pool.query(
        `
        SELECT id, username, profile_image
        FROM users
        WHERE username ILIKE $1
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

  // Leave group
  async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user.id;

      // Verify user is a member
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

      // Check if user is owner
      const role = memberCheckResult.rows[0].role;
      if (role === "owner") {
        res.status(400).json({
          error:
            "Eres el propietario del grupo. Transfiere la propiedad antes de abandonar o elimina el grupo.",
        });
        return;
      }

      // Remove user from group
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

  // Transfer group ownership
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

      // Verify current user is owner
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

      // Verify new owner is a member
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

        // Update owner in user_groups table
        await client.query(
          `
          UPDATE user_groups
          SET owner_id = $1
          WHERE id = $2
        `,
          [newOwnerId, groupId]
        );

        // Update old owner role to 'admin'
        await client.query(
          `
          UPDATE group_members
          SET role = 'admin'
          WHERE group_id = $1 AND user_id = $2
        `,
          [groupId, userId]
        );

        // Update new owner role to 'owner'
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
