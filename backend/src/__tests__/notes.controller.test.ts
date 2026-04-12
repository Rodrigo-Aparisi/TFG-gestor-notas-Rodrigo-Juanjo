/**
 * Notes Controller Tests
 *
 * Tests for note CRUD operations: create, read, update, delete
 */

import { Request, Response, NextFunction } from 'express';
import { NoteCrudController } from '../controllers/note/NoteCrudController';

// Mock the database
jest.mock('../database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Import mocked pool
import { pool } from '../database';
const mockPool = pool as jest.Mocked<typeof pool>;

// Test data factories (inline to avoid bcrypt loading issues)
interface TestNote {
  id: string;
  title: string;
  content: string;
  user_id: string;
  images: string[];
  is_pinned: boolean;
  is_marked: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const createTestNote = (overrides: Partial<TestNote> = {}): TestNote => ({
  id: 'test-note-id-123',
  title: 'Test Note Title',
  content: 'Test note content here',
  user_id: 'test-user-id-123',
  images: [],
  is_pinned: false,
  is_marked: false,
  is_deleted: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

interface CreateNoteRequest {
  title: string;
  content: string;
  images?: string[];
}

const createNoteRequest = (overrides: Partial<CreateNoteRequest> = {}): CreateNoteRequest => ({
  title: 'New Test Note',
  content: 'This is test note content',
  images: [],
  ...overrides,
});

describe('Notes Controller', () => {
  let controller: NoteCrudController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new NoteCrudController();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'test-user-id-123', email: 'test@example.com' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      const noteData = createNoteRequest();
      mockReq.body = noteData;

      const mockNote = createTestNote({
        title: noteData.title,
        content: noteData.content,
      });

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNote],
        rowCount: 1,
      });

      await controller.createNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Nota creada exitosamente',
          note: expect.objectContaining({
            title: noteData.title,
          }),
        })
      );
    });

    it('should call next with error when title is missing', async () => {
      mockReq.body = { content: 'Content without title' };

      await controller.createNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should call next with error when title is empty', async () => {
      mockReq.body = { title: '   ', content: 'Some content' };

      await controller.createNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('should process list markers in content', async () => {
      const noteData = {
        title: 'List Note',
        content: '- Item 1\n* Item 2\n1. Numbered item',
      };
      mockReq.body = noteData;

      const mockNote = createTestNote(noteData);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNote],
        rowCount: 1,
      });

      await controller.createNote(mockReq as Request, mockRes as Response, mockNext);

      // Verify query was called with processed content
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          noteData.title,
          expect.stringContaining('• Item 1'), // Dash converted to bullet
        ])
      );
    });

    it('should call next with error on database error', async () => {
      mockReq.body = createNoteRequest();

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await controller.createNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getNotes', () => {
    it('should get all notes for user with pagination', async () => {
      const mockNotes = [
        createTestNote({ id: 'note-1', title: 'Note 1' }),
        createTestNote({ id: 'note-2', title: 'Note 2' }),
      ];

      // Mock settings query
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ default_note_sort: 'date', default_note_sort_direction: 'desc' }],
          rowCount: 1,
        })
        // Mock count query
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
          rowCount: 1,
        })
        // Mock notes query
        .mockResolvedValueOnce({
          rows: mockNotes,
          rowCount: 2,
        });

      await controller.getNotes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({ title: 'Note 1' }),
            expect.objectContaining({ title: 'Note 2' }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            totalNotes: 2,
          }),
        })
      );
    });

    it('should respect page and limit parameters', async () => {
      mockReq.query = { page: '2', limit: '10' };

      // Mock settings query
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        // Mock count query
        .mockResolvedValueOnce({
          rows: [{ count: '25' }],
          rowCount: 1,
        })
        // Mock notes query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      await controller.getNotes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            limit: 10,
            totalNotes: 25,
            totalPages: 3,
          }),
        })
      );
    });

    it('should disable pagination when paginate=false', async () => {
      mockReq.query = { paginate: 'false' };

      // Mock settings query
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        // Mock count query
        .mockResolvedValueOnce({
          rows: [{ count: '100' }],
          rowCount: 1,
        })
        // Mock notes query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      await controller.getNotes(mockReq as Request, mockRes as Response, mockNext);

      // Verify the query was called without LIMIT/OFFSET
      const queries = (mockPool.query as jest.Mock).mock.calls;
      const notesQuery = queries[2][0];
      expect(notesQuery).not.toContain('LIMIT');
    });

    it('should enforce maximum limit of 100', async () => {
      mockReq.query = { limit: '500' };

      // Mock settings query
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        // Mock count query
        .mockResolvedValueOnce({
          rows: [{ count: '10' }],
          rowCount: 1,
        })
        // Mock notes query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

      await controller.getNotes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            limit: 100, // Should be capped at 100
          }),
        })
      );
    });
  });

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const noteId = 'note-123';
      mockReq.params = { id: noteId };
      mockReq.body = { title: 'Updated Title', content: 'Updated content' };

      const existingNote = createTestNote({ id: noteId });
      const updatedNote = createTestNote({
        id: noteId,
        title: 'Updated Title',
        content: 'Updated content',
      });

      // Mock SELECT to check note exists
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [existingNote],
          rowCount: 1,
        })
        // Mock UPDATE
        .mockResolvedValueOnce({
          rows: [updatedNote],
          rowCount: 1,
        });

      await controller.updateNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Nota actualizada exitosamente',
          note: expect.objectContaining({
            title: 'Updated Title',
          }),
        })
      );
    });

    it('should call next with NotFoundError when note not found', async () => {
      mockReq.params = { id: 'non-existent-id' };
      mockReq.body = { title: 'Title' };

      // Mock SELECT returns no rows
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await controller.updateNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('deleteNote (soft delete)', () => {
    it('should soft delete a note successfully', async () => {
      const noteId = 'note-to-delete';
      mockReq.params = { id: noteId };

      // Note is NOT in trash yet
      const existingNote = createTestNote({
        id: noteId,
        is_deleted: false,
      });

      // Mock SELECT to check note exists and is_deleted status
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [existingNote],
          rowCount: 1,
        })
        // Mock UPDATE to move to trash
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

      await controller.deleteNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Nota movida a la papelera',
        })
      );
    });

    it('should permanently delete a note that is already in trash', async () => {
      const noteId = 'note-in-trash';
      mockReq.params = { id: noteId };

      // Note IS already in trash
      const trashedNote = createTestNote({
        id: noteId,
        is_deleted: true,
      });

      // Mock SELECT - note is already in trash
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [trashedNote],
          rowCount: 1,
        })
        // Mock DELETE
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

      await controller.deleteNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Nota eliminada permanentemente',
        })
      );
    });

    it('should call next with NotFoundError when note not found', async () => {
      mockReq.params = { id: 'non-existent-id' };

      // Mock SELECT returns no rows
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await controller.deleteNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('restoreNote', () => {
    it('should restore a deleted note successfully', async () => {
      const noteId = 'deleted-note';
      mockReq.params = { id: noteId };

      const restoredNote = createTestNote({
        id: noteId,
        is_deleted: false,
        deleted_at: null,
      });

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [restoredNote],
        rowCount: 1,
      });

      await controller.restoreNote(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Nota restaurada exitosamente',
          note: expect.objectContaining({
            is_deleted: false,
          }),
        })
      );
    });
  });

  describe('getTrashNotes', () => {
    it('should return deleted notes for user', async () => {
      const deletedNotes = [
        createTestNote({ id: 'deleted-1', is_deleted: true }),
        createTestNote({ id: 'deleted-2', is_deleted: true }),
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: deletedNotes,
        rowCount: 2,
      });

      await controller.getTrashNotes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({ id: 'deleted-1' }),
            expect.objectContaining({ id: 'deleted-2' }),
          ]),
        })
      );
    });
  });

  describe('togglePin', () => {
    it('should toggle pin status successfully', async () => {
      const noteId = 'note-to-pin';
      mockReq.params = { id: noteId };

      const existingNote = createTestNote({ id: noteId, is_pinned: false });
      const pinnedNote = createTestNote({ id: noteId, is_pinned: true });

      // Mock SELECT to check note exists
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [existingNote],
          rowCount: 1,
        })
        // Mock UPDATE to toggle pin
        .mockResolvedValueOnce({
          rows: [pinnedNote],
          rowCount: 1,
        });

      await controller.togglePin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          note: expect.objectContaining({
            is_pinned: true,
          }),
        })
      );
    });

    it('should call next with NotFoundError when note not found', async () => {
      mockReq.params = { id: 'non-existent-id' };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await controller.togglePin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('toggleMark', () => {
    it('should toggle mark status successfully', async () => {
      const noteId = 'note-to-mark';
      mockReq.params = { id: noteId };

      const existingNote = createTestNote({ id: noteId, is_marked: false });
      const markedNote = createTestNote({ id: noteId, is_marked: true });

      // Mock SELECT to check note exists
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [existingNote],
          rowCount: 1,
        })
        // Mock UPDATE to toggle mark
        .mockResolvedValueOnce({
          rows: [markedNote],
          rowCount: 1,
        });

      await controller.toggleMark(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          note: expect.objectContaining({
            is_marked: true,
          }),
        })
      );
    });

    it('should call next with NotFoundError when note not found', async () => {
      mockReq.params = { id: 'non-existent-id' };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await controller.toggleMark(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });
});
