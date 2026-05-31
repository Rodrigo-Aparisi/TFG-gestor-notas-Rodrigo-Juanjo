// backend/src/__tests__/middleware.upload.test.ts

jest.mock('../utils/pathHelpers', () => ({
  safeDeleteFile: jest.fn(),
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import * as pathHelpers from '../utils/pathHelpers';

let handleMulterError: (err: Error, req: Request, res: Response, next: NextFunction) => void;
let deleteImage: (imageUrl: string) => Promise<void>;

beforeAll(async () => {
  const mod = await import('../middleware/upload');
  handleMulterError = mod.handleMulterError;
  deleteImage = mod.deleteImage;
});

describe('handleMulterError', () => {
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('returns 400 with 25MB message on LIMIT_FILE_SIZE', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    handleMulterError(err, {} as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('25MB') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with generic message on other MulterErrors', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    handleMulterError(err, {} as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with err.message for non-Multer errors', () => {
    const err = new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP');
    handleMulterError(err, {} as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Solo se permiten imágenes JPEG, PNG, GIF y WEBP' });
  });

  it('calls next() when err is null/undefined', () => {
    handleMulterError(null as any, {} as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('deleteImage', () => {
  const mockSafeDelete = pathHelpers.safeDeleteFile as jest.Mock;

  beforeEach(() => {
    mockSafeDelete.mockReset();
  });

  it('calls safeDeleteFile with relative path (no leading slash)', async () => {
    mockSafeDelete.mockResolvedValue(true);
    await deleteImage('/note-images/test-123.jpg');
    expect(mockSafeDelete).toHaveBeenCalledTimes(1);
    const [filePath] = mockSafeDelete.mock.calls[0];
    expect(filePath).toBe('note-images/test-123.jpg');
    expect(filePath).not.toContain('..');
  });

  it('does not throw when safeDeleteFile returns false (unsafe path)', async () => {
    mockSafeDelete.mockResolvedValue(false);
    await expect(deleteImage('../../../etc/passwd')).resolves.not.toThrow();
  });

  it('does not throw when safeDeleteFile rejects', async () => {
    mockSafeDelete.mockRejectedValue(new Error('disk error'));
    await expect(deleteImage('/note-images/x.jpg')).resolves.not.toThrow();
  });
});
