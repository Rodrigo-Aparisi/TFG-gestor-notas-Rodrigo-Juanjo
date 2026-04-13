/**
 * NoteSharingController Tests
 *
 * Casos cubiertos:
 * shareNote: happy path (nueva), actualiza si ya existía, campos faltantes, nota no propia,
 *   usuario no encontrado, compartir consigo mismo, error de BD
 * getSharedNotes: lista normal, lista vacía, error de BD
 * updateSharedNote: con permiso (edita), sin permiso → 403, sin campos → 400,
 *   nota no encontrada tras update → 404
 * updateSharedNotePermissions: happy path, usuario destino no encontrado, no es owner
 * searchUsers: resultados sin email (seguridad), query muy corta, query ausente,
 *   sin resultados, error de BD
 */

import { Request, Response, NextFunction } from 'express';
import { NoteSharingController } from '../controllers/note/NoteSharingController';

jest.mock('../database', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

const OWNER_ID = 'owner-user-id';
const OTHER_USER_ID = 'other-user-id';
const NOTE_ID = 'note-id-abc';

const makeReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  user: { id: OWNER_ID, email: 'owner@example.com' },
  ...overrides,
});

const makeRes = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('NoteSharingController', () => {
  let controller: NoteSharingController;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new NoteSharingController();
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // ─── shareNote ─────────────────────────────────────────────────────────────

  describe('shareNote', () => {
    it('comparte la nota exitosamente (nuevo share)', async () => {
      const req = makeReq({
        body: { noteId: NOTE_ID, username: 'targetuser', canEdit: false, includeImages: true },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 })   // nota existe y es del owner
        .mockResolvedValueOnce({ rows: [{ id: OTHER_USER_ID }], rowCount: 1 }) // usuario destino
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })                   // no existe share previo
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });                  // INSERT

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('actualiza permisos si ya estaba compartida', async () => {
      const req = makeReq({
        body: { noteId: NOTE_ID, username: 'targetuser', canEdit: true },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: OTHER_USER_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ note_id: NOTE_ID }], rowCount: 1 }) // share ya existe
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });                     // UPDATE

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('llama a next(400) cuando falta username', async () => {
      const req = makeReq({ body: { noteId: NOTE_ID } }) as Request;
      const res = makeRes() as Response;

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('llama a next(404) cuando la nota no pertenece al usuario', async () => {
      const req = makeReq({
        body: { noteId: NOTE_ID, username: 'targetuser' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('llama a next(404) cuando el usuario destino no existe', async () => {
      const req = makeReq({
        body: { noteId: NOTE_ID, username: 'unknownuser' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('llama a next(400) cuando se intenta compartir consigo mismo', async () => {
      const req = makeReq({
        body: { noteId: NOTE_ID, username: 'myself' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: NOTE_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: OWNER_ID }], rowCount: 1 }); // mismo ID

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('llama a next(error) ante fallo de BD', async () => {
      const req = makeReq({ body: { noteId: NOTE_ID, username: 'targetuser' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

      await controller.shareNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── getSharedNotes ────────────────────────────────────────────────────────

  describe('getSharedNotes', () => {
    it('devuelve la lista de notas compartidas con el usuario', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      const sharedNotes = [
        { id: 'n1', title: 'Nota 1', shared_by: 'alice', can_edit: false },
        { id: 'n2', title: 'Nota 2', shared_by: 'bob', can_edit: true },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: sharedNotes, rowCount: 2 });

      await controller.getSharedNotes(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ sharedNotes })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('devuelve array vacío cuando no hay notas compartidas', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.getSharedNotes(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ sharedNotes: [] })
      );
    });

    it('llama a next(error) ante fallo de BD', async () => {
      const req = makeReq() as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await controller.getSharedNotes(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── updateSharedNote ─────────────────────────────────────────────────────

  describe('updateSharedNote', () => {
    it('edita la nota cuando el usuario tiene permiso can_edit', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: { title: 'Nuevo título', content: 'Nuevo contenido' },
        user: { id: OTHER_USER_ID, email: 'other@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 }) // tiene can_edit
        .mockResolvedValueOnce({ rows: [{ id: NOTE_ID, title: 'Nuevo título' }], rowCount: 1 }); // UPDATE

      await controller.updateSharedNote(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('llama a next(403) cuando el usuario no tiene permiso de edición', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: { title: 'Intento hackeo' },
        user: { id: OTHER_USER_ID, email: 'other@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.updateSharedNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('llama a next(400) cuando no hay campos que actualizar', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: {},
        user: { id: OTHER_USER_ID, email: 'other@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 });

      await controller.updateSharedNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('llama a next(404) cuando la nota no se encuentra tras el UPDATE', async () => {
      const req = makeReq({
        params: { id: 'non-existent-id' },
        body: { title: 'Título' },
        user: { id: OTHER_USER_ID, email: 'other@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE sin filas

      await controller.updateSharedNote(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  // ─── searchUsers ──────────────────────────────────────────────────────────
  // Seguridad: el campo email NO debe aparecer en la respuesta (PII)

  describe('searchUsers', () => {
    it('devuelve usuarios sin campo email (protección PII)', async () => {
      const req = makeReq({ query: { query: 'ali' } }) as Request;
      const res = makeRes() as Response;

      const users = [
        { id: 'u1', username: 'alice' },
        { id: 'u2', username: 'alicia' },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: users, rowCount: 2 });

      await controller.searchUsers(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith({ users });

      const returnedUsers: { id: string; username: string; email?: string }[] =
        (res.json as jest.Mock).mock.calls[0][0].users;
      returnedUsers.forEach(u => {
        expect(u.email).toBeUndefined();
      });
    });

    it('llama a next(400) cuando la query tiene menos de 2 caracteres', async () => {
      const req = makeReq({ query: { query: 'a' } }) as Request;
      const res = makeRes() as Response;

      await controller.searchUsers(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('llama a next(400) cuando la query está ausente', async () => {
      const req = makeReq({ query: {} }) as Request;
      const res = makeRes() as Response;

      await controller.searchUsers(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('devuelve array vacío cuando ningún usuario coincide', async () => {
      const req = makeReq({ query: { query: 'zzzzzz' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.searchUsers(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith({ users: [] });
    });

    it('llama a next(error) ante fallo de BD', async () => {
      const req = makeReq({ query: { query: 'alice' } }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB failure'));

      await controller.searchUsers(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── updateSharedNotePermissions ──────────────────────────────────────────

  describe('updateSharedNotePermissions', () => {
    it('actualiza permisos cuando el solicitante es el owner', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: { username: 'targetuser', canEdit: true, includeImages: false },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: OTHER_USER_ID }], rowCount: 1 }) // usuario encontrado
        .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 })              // es el owner
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });                     // UPDATE

      await controller.updateSharedNotePermissions(req, res, mockNext as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('actualizados') })
      );
    });

    it('llama a next(404) cuando el usuario destino no existe', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: { username: 'nobody', canEdit: true },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await controller.updateSharedNotePermissions(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('llama a next(403) cuando el solicitante no es el owner', async () => {
      const req = makeReq({
        params: { id: NOTE_ID },
        body: { username: 'targetuser', canEdit: false },
        user: { id: 'impersonator-id', email: 'imp@example.com' },
      }) as Request;
      const res = makeRes() as Response;

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: OTHER_USER_ID }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no es el owner

      await controller.updateSharedNotePermissions(req, res, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });
});
