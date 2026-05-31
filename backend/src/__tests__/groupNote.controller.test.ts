// backend/src/__tests__/groupNote.controller.test.ts
jest.mock('../database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../utils/urlHelpers', () => ({
  getGroupNoteImageUrl: jest.fn(url => url),
  isGroupNoteImageUrl: jest.fn(() => true),
}));
jest.mock('../middleware/upload', () => ({
  deleteImage: jest.fn().mockResolvedValue(undefined),
  RequestWithFile: {},
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response } from 'express';
import { pool } from '../database';
import { GroupNoteController } from '../controllers/usergroup/GroupNoteController';

const mockPool = pool as jest.Mocked<typeof pool>;
const controller = new GroupNoteController();

function mockRes(): Partial<Response> {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}
function mockNext(): jest.Mock {
  return jest.fn();
}
function authReq(params = {}, body = {}, user = { id: 'u-1' }): Partial<Request> {
  return { params, body, user } as unknown as Partial<Request>;
}

describe('GroupNoteController.getGroupNotes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not a group member', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ is_member: false }] });
    const next = mockNext();

    await controller.getGroupNotes(
      authReq({ id: 'group-1' }) as Request,
      mockRes() as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns group notes when user is a member', async () => {
    const notes = [{ id: 'n1', title: 'Note 1', group_id: 'group-1' }];
    mockPool.query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ is_member: true }] })
      .mockResolvedValueOnce({ rows: notes });

    const res = mockRes();
    await controller.getGroupNotes(
      authReq({ id: 'group-1' }) as Request,
      res as Response,
      mockNext()
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ notes }));
  });
});

describe('GroupNoteController.createGroupNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not a member', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ is_member: false }] });
    const next = mockNext();

    await controller.createGroupNote(
      authReq({ id: 'g-1' }, { title: 'Note' }) as Request,
      mockRes() as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('creates a group note and returns 201', async () => {
    const newNote = { id: 'n-new', title: 'Note', group_id: 'g-1' };
    // createGroupNote runs 3 queries: membership check, INSERT, then username lookup
    mockPool.query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ is_member: true }] })
      .mockResolvedValueOnce({ rows: [newNote] })
      .mockResolvedValueOnce({ rows: [{ username: 'tester' }] });

    const res = mockRes();
    await controller.createGroupNote(
      authReq({ id: 'g-1' }, { title: 'Note', content: 'Content' }) as Request,
      res as Response,
      mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(201);
    // The response note spreads newNote plus created_by_username, so match a superset
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ note: expect.objectContaining(newNote) })
    );
  });
});

describe('GroupNoteController.deleteGroupNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not admin or owner', async () => {
    // First query returns a note owned by someone else (no user_id field -> undefined !== 'u-1'),
    // second query returns the requester's role as plain member.
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ role: 'member' }] });
    const next = mockNext();

    await controller.deleteGroupNote(
      authReq({ id: 'g-1', noteId: 'n-1' }) as Request,
      mockRes() as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
