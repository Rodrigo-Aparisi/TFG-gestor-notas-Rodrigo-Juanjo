import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../errors/AppError";

/**
 * Controller for Group Member operations
 * Handles member management, invitations, and ownership transfers
 */
export class GroupMemberController {
  // Get group members
  async getGroupMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;

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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
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
      next(error);
    }
  }

  // Add a member to the group
  async addGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const groupId = req.params.id;
      const userId = req.user!.id;
      const { username, role = "member" } = req.body;

      if (!username) {
        return next(new BadRequestError("El nombre de usuario es obligatorio"));
      }

      if (!["admin", "member"].includes(role)) {
        return next(new BadRequestError("Rol no válido"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      const currentUserRole = roleCheckResult.rows[0].role;
      if (currentUserRole !== "owner" && currentUserRole !== "admin") {
        return next(new ForbiddenError("No tienes permisos para añadir miembros"));
      }

      // Only owner can add admins
      if (role === "admin" && currentUserRole !== "owner") {
        return next(new ForbiddenError("Solo el propietario puede añadir administradores"));
      }

      // Find user by username
      const findUserResult = await client.query(
        `
        SELECT id FROM users WHERE username = $1
      `,
        [username]
      );

      if (findUserResult.rows.length === 0) {
        return next(new NotFoundError("Usuario no encontrado"));
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
        return next(new BadRequestError("El usuario ya es miembro del grupo"));
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
      next(error);
    } finally {
      client.release();
    }
  }

  // Remove a member from the group
  async removeGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.userId;
      const userId = req.user!.id;

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
          return next(new ForbiddenError("No tienes acceso a este grupo"));
        }

        const currentUserRole = roleCheckResult.rows[0].role;
        if (currentUserRole !== "owner" && currentUserRole !== "admin") {
          return next(new ForbiddenError("No tienes permisos para eliminar miembros"));
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
          return next(new NotFoundError("Miembro no encontrado"));
        }

        const memberRole = memberRoleResult.rows[0].role;

        // Admins cannot remove owner or other admins
        if (
          currentUserRole === "admin" &&
          (memberRole === "owner" || memberRole === "admin")
        ) {
          return next(new ForbiddenError("No tienes permisos para eliminar a este miembro"));
        }

        // Cannot remove owner
        if (memberRole === "owner") {
          return next(new ForbiddenError("No se puede eliminar al propietario del grupo"));
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
        return next(new NotFoundError("Miembro no encontrado"));
      }

      res.json({ message: "Miembro eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  }

  // Update member role
  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.userId;
      const userId = req.user!.id;
      const { role } = req.body;

      // Validate role
      if (!["admin", "member"].includes(role)) {
        return next(new BadRequestError("Rol no válido"));
      }

      // Cannot change own role
      if (memberUserId === userId) {
        return next(new ForbiddenError("No puedes cambiar tus propios permisos"));
      }

      // Get group info and verify it exists
      const groupResult = await pool.query(
        `
      SELECT owner_id FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return next(new NotFoundError("Grupo no encontrado"));
      }

      // Cannot change owner role
      if (memberUserId === groupResult.rows[0].owner_id) {
        return next(new ForbiddenError("No se puede cambiar el rol del propietario"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      const currentUserRole = currentUserRoleResult.rows[0].role;

      // Only owners and admins can change roles
      if (currentUserRole !== "owner" && currentUserRole !== "admin") {
        return next(new ForbiddenError("No tienes permisos para cambiar roles"));
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
        return next(new NotFoundError("Miembro no encontrado"));
      }

      const memberCurrentRole = memberRoleResult.rows[0].role;

      // Admins cannot change role of other admins
      if (currentUserRole === "admin" && memberCurrentRole === "admin") {
        return next(new ForbiddenError("Los administradores no pueden modificar el rol de otros administradores"));
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
        return next(new NotFoundError("Miembro no encontrado"));
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
      next(error);
    }
  }

  // Invite user by email
  async inviteUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
      const { email } = req.body;

      if (!email) {
        return next(new BadRequestError("El email es obligatorio"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
      }

      // Only owners and admins can invite
      const role = memberCheckResult.rows[0].role;
      if (role !== "owner" && role !== "admin") {
        return next(new ForbiddenError("No tienes permisos para invitar usuarios"));
      }

      // Verify group exists
      const groupResult = await pool.query(
        `
        SELECT name FROM user_groups WHERE id = $1
      `,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return next(new NotFoundError("Grupo no encontrado"));
      }

      // Find user by email
      const userResult = await pool.query(
        `
        SELECT id FROM users WHERE email = $1
      `,
        [email]
      );

      if (userResult.rows.length === 0) {
        return next(new NotFoundError("Usuario no encontrado"));
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
        return next(new BadRequestError("El usuario ya es miembro del grupo"));
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
      next(error);
    }
  }

  // Search users to add to group
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      const groupId = req.params.id;
      const userId = req.user!.id;

      if (!query || query.trim().length < 2) {
        return next(new BadRequestError("La consulta de búsqueda debe tener al menos 2 caracteres"));
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
        return next(new ForbiddenError("No tienes acceso a este grupo"));
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
      next(error);
    }
  }

  // Leave group
  async leaveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;

      // Verify user is a member
      const memberCheckResult = await pool.query(
        `
        SELECT role FROM group_members
        WHERE group_id = $1 AND user_id = $2
      `,
        [groupId, userId]
      );

      if (memberCheckResult.rows.length === 0) {
        return next(new ForbiddenError("No eres miembro de este grupo"));
      }

      // Check if user is owner
      const role = memberCheckResult.rows[0].role;
      if (role === "owner") {
        return next(new BadRequestError(
          "Eres el propietario del grupo. Transfiere la propiedad antes de abandonar o elimina el grupo."
        ));
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
      next(error);
    }
  }

  // Transfer group ownership
  // B4.7: All validation queries are moved inside the transaction to avoid race conditions
  async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    const client = await pool.connect();
    try {
      const groupId = req.params.id;
      const userId = req.user!.id;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        return next(new BadRequestError("El ID del nuevo propietario es obligatorio"));
      }

      await client.query("BEGIN");

      // Validate current ownership and new owner membership atomically (FOR UPDATE locks the group row)
      const groupResult = await client.query(
        `SELECT owner_id FROM user_groups WHERE id = $1 FOR UPDATE`,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return next(new NotFoundError("Grupo no encontrado"));
      }

      if (groupResult.rows[0].owner_id !== userId) {
        await client.query("ROLLBACK");
        return next(new ForbiddenError("Solo el propietario puede transferir la propiedad"));
      }

      // Verify new owner is a member (inside transaction)
      const newOwnerCheckResult = await client.query(
        `
        SELECT EXISTS(
          SELECT 1 FROM group_members
          WHERE group_id = $1 AND user_id = $2
        ) as is_member
      `,
        [groupId, newOwnerId]
      );

      if (!newOwnerCheckResult.rows[0].is_member) {
        await client.query("ROLLBACK");
        return next(new BadRequestError("El nuevo propietario debe ser miembro del grupo"));
      }

      // Update owner in user_groups table
      await client.query(
        `UPDATE user_groups SET owner_id = $1 WHERE id = $2`,
        [newOwnerId, groupId]
      );

      // Update old owner role to 'admin'
      await client.query(
        `UPDATE group_members SET role = 'admin' WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );

      // Update new owner role to 'owner'
      await client.query(
        `UPDATE group_members SET role = 'owner' WHERE group_id = $1 AND user_id = $2`,
        [groupId, newOwnerId]
      );

      await client.query("COMMIT");

      res.json({ message: "Propiedad del grupo transferida correctamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      next(error);
    } finally {
      client.release();
    }
  }
}
