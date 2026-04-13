/**
 * GroupMemberController Tests
 *
 * Casos cubiertos:
 * getGroupMembers: lista normal, no miembro → 403, error BD
 * addGroupMember: happy (owner añade member), username ausente → 400, rol inválido → 400,
 *   solicitante es member → 403, admin intenta añadir admin → 403,
 *   usuario destino no existe → 404, ya es miembro → 400, error BD → ROLLBACK
 * removeGroupMember: auto-eliminación, admin intenta quitar owner → 403, miembro no encontrado → 404
 * leaveGroup: member abandona, owner intenta salir → 400, no es miembro → 403
 * transferOwnership: happy (con transacción), newOwnerId ausente → 400,
 *   grupo no encontrado → 404, no es owner → 403, nuevo owner no es miembro → 400, error BD → ROLLBACK
 * searchUsers: sin email (seguridad), query corta → 400, no miembro → 403
 * updateMemberRole: happy (owner degrada admin), rol inválido → 400,
 *   cambia propio rol → 403, admin intenta cambiar otro admin → 403
 */

import { Request, Response, NextFunction } from 'express';
import { GroupMemberController } from '../controllers/usergroup/GroupMemberController';

jest.mock('../database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

const OWNER_ID = 'owner-user-id';
const MEMBER_ID = 'member-user-id';
const GROUP_ID = 'group-id-abc';

const makeMockClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

const makeReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: { id: GROUP_ID },
  query: {},
  user: { id: OWNER_ID, email: 'owner@example.com' },
  ...overrides,
});

const makeRes = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('GroupMemberController', () => {
  let controller: GroupMemberController;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new GroupMemberController();
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // ─── getGroupMembers ───────────────────────────────────────────────────────

  describe('getGroupMembers', () => {
    it('devuelve la lista de miembros cuando el usuario pertenece al grupo', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      const members = [
        { id: 'm1', user_id: OWNER_ID, username: 'owner', role: 'owner' },
        { id: 'm2', user_id: MEMBER_ID, username: 'member', role: 'member' },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ is_member: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: members, rowCount: 2 });

      await controller.getGroupMembers(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith({ members });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('llama a next(403) cuando el usuario no es miembro', async () => {
      const req = makeReq({ user: { id: 'outsider-id', email: 'out@example.com' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ is_member: false }], rowCount: 1 });

      await controller.getGroupMembers(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('llama a next(error) ante fallo de BD', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

      await controller.getGroupMembers(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── addGroupMember ────────────────────────────────────────────────────────

  describe('addGroupMember', () => {
    it('añade un miembro exitosamente (owner añade member)', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { username: 'newmember', role: 'member' } }) as Request;
      const res = makeRes() as Response;

      const newMember = { id: 'nm1', user_id: 'new-user-id', username: 'newmember', role: 'member' };

      client.query
        .mockResolvedValueOnce({ rows: [] })                                      // BEGIN
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })        // rol del solicitante
        .mockResolvedValueOnce({ rows: [{ id: 'new-user-id' }], rowCount: 1 })    // usuario encontrado
        .mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 })        // no es miembro aún
        .mockResolvedValueOnce({ rows: [{ id: 'nm1' }], rowCount: 1 })            // INSERT
        .mockResolvedValueOnce({ rows: [newMember], rowCount: 1 })                // datos del miembro
        .mockResolvedValueOnce({ rows: [] });                                     // COMMIT

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ member: newMember })
      );
      expect(client.release).toHaveBeenCalled();
    });

    it('llama a next(400) cuando falta el username', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { role: 'member' } }) as Request;
      const res = makeRes() as Response;

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('llama a next(400) para rol inválido', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { username: 'someone', role: 'superadmin' } }) as Request;
      const res = makeRes() as Response;

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('llama a next(403) cuando el solicitante tiene rol member', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({
        body: { username: 'someone', role: 'member' },
        user: { id: MEMBER_ID, email: 'member@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ role: 'member' }], rowCount: 1 });

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('llama a next(403) cuando admin intenta añadir otro admin', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({
        body: { username: 'someone', role: 'admin' },
        user: { id: 'admin-id', email: 'admin@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 });

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('llama a next(404) cuando el usuario destino no existe', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { username: 'ghost', role: 'member' } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('llama a next(400) cuando el usuario ya es miembro', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { username: 'existingmember', role: 'member' } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: MEMBER_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('hace ROLLBACK y llama a next(error) ante fallo de BD', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { username: 'someone', role: 'member' } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB crash'));

      await controller.addGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(client.release).toHaveBeenCalled();
    });
  });

  // ─── removeGroupMember ────────────────────────────────────────────────────

  describe('removeGroupMember', () => {
    it('permite a un usuario eliminarse a sí mismo del grupo', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: MEMBER_ID },
        user: { id: MEMBER_ID, email: 'member@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ group_id: GROUP_ID, user_id: MEMBER_ID }],
        rowCount: 1,
      });

      await controller.removeGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('eliminado') })
      );
    });

    it('llama a next(403) cuando admin intenta quitar al owner', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: OWNER_ID },
        user: { id: 'admin-id', email: 'admin@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 });

      await controller.removeGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('llama a next(404) cuando el miembro no existe en el grupo', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: 'non-existent-user' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.removeGroupMember(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  // ─── leaveGroup ───────────────────────────────────────────────────────────

  describe('leaveGroup', () => {
    it('permite a un miembro abandonar el grupo', async () => {
      const req = makeReq({ user: { id: MEMBER_ID, email: 'member@example.com' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ role: 'member' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await controller.leaveGroup(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('abandonado') })
      );
    });

    it('llama a next(400) cuando el owner intenta salir (debe transferir antes)', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 });

      await controller.leaveGroup(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('llama a next(403) cuando el usuario no es miembro', async () => {
      const req = makeReq({ user: { id: 'outsider-id', email: 'out@example.com' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.leaveGroup(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  // ─── transferOwnership ────────────────────────────────────────────────────

  describe('transferOwnership', () => {
    it('transfiere la propiedad del grupo exitosamente', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { newOwnerId: MEMBER_ID } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })                                          // BEGIN
        .mockResolvedValueOnce({ rows: [{ owner_id: OWNER_ID }], rowCount: 1 })       // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ is_member: true }], rowCount: 1 })          // nuevo owner es miembro
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })                             // UPDATE user_groups
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })                             // UPDATE viejo owner → admin
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })                             // UPDATE nuevo owner → owner
        .mockResolvedValueOnce({ rows: [] });                                         // COMMIT

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('transferida') })
      );
      expect(client.release).toHaveBeenCalled();
    });

    it('llama a next(400) cuando falta newOwnerId', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: {} }) as Request;
      const res = makeRes() as Response;

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('llama a next(404) cuando el grupo no existe', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { newOwnerId: MEMBER_ID } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('llama a next(403) cuando el solicitante no es el owner', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({
        body: { newOwnerId: 'someone' },
        user: { id: 'impostor-id', email: 'imp@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ owner_id: OWNER_ID }], rowCount: 1 }); // owner real != solicitante

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('llama a next(400) cuando el nuevo owner no es miembro del grupo', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { newOwnerId: 'outsider-id' } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ owner_id: OWNER_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ is_member: false }], rowCount: 1 });

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('hace ROLLBACK y llama a next(error) ante fallo inesperado de BD', async () => {
      const client = makeMockClient();
      (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

      const req = makeReq({ body: { newOwnerId: MEMBER_ID } }) as Request;
      const res = makeRes() as Response;

      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Deadlock detected'));

      await controller.transferOwnership(req, res, mockNext as unknown as NextFunction);

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(client.release).toHaveBeenCalled();
    });
  });

  // ─── updateMemberRole ─────────────────────────────────────────────────────

  describe('updateMemberRole', () => {
    it('actualiza el rol exitosamente (owner degrada admin a member)', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: 'admin-id' },
        body: { role: 'member' },
      }) as Request;
      const res = makeRes() as Response;

      const updatedMember = { id: 'm1', user_id: 'admin-id', username: 'formeradmin', role: 'member' };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ owner_id: OWNER_ID }], rowCount: 1 }) // grupo existe
        .mockResolvedValueOnce({ rows: [{ role: 'owner' }], rowCount: 1 })      // rol del solicitante
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 })      // rol actual del target
        .mockResolvedValueOnce({ rows: [{ id: 'm1' }], rowCount: 1 })           // UPDATE
        .mockResolvedValueOnce({ rows: [updatedMember], rowCount: 1 });         // datos actualizados

      await controller.updateMemberRole(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('actualizado') })
      );
    });

    it('llama a next(400) para rol inválido', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: MEMBER_ID },
        body: { role: 'superuser' },
      }) as Request;
      const res = makeRes() as Response;

      await controller.updateMemberRole(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('llama a next(403) cuando el usuario intenta cambiar su propio rol', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: OWNER_ID }, // mismo que req.user.id
        body: { role: 'member' },
      }) as Request;
      const res = makeRes() as Response;

      await controller.updateMemberRole(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('llama a next(403) cuando admin intenta cambiar el rol de otro admin', async () => {
      const req = makeReq({
        params: { id: GROUP_ID, userId: 'admin2-id' },
        body: { role: 'member' },
        user: { id: 'admin1-id', email: 'admin1@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ owner_id: OWNER_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 }) // solicitante es admin
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 }); // target también admin

      await controller.updateMemberRole(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });
});
