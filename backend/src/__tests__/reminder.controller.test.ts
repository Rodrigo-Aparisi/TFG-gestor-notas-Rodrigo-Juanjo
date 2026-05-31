/**
 * Reminder Controller Tests
 *
 * Tests for reminder CRUD operations: getReminders, createReminder,
 * updateReminderStatus, deleteReminder.
 */

import { Request, Response, NextFunction } from 'express';
import { reminderController } from '../controllers/reminderController';
import { BadRequestError } from '../errors/AppError';

jest.mock('../models/reminder', () => ({
  Reminder: {
    find: jest.fn(),
    findWithStatus: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    search: jest.fn(),
    findRemindersForEmailNotification: jest.fn(),
  },
}));

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Reminder } from '../models/reminder';
const MockReminder = Reminder as jest.Mocked<typeof Reminder>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authReq(body = {}, params = {}, query = {}): Partial<Request> {
  return {
    body,
    params,
    query,
    user: { id: 'u-1', email: 'u@test.com' },
  } as unknown as Partial<Request>;
}

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockNext(): jest.Mock {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// getReminders
// ---------------------------------------------------------------------------

describe('reminderController.getReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next with BadRequestError 400 when startDate is invalid', async () => {
    const req = authReq({}, {}, { startDate: 'not-a-date', endDate: '2024-01-31' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.getReminders(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
  });

  it('calls next with BadRequestError 400 when endDate is invalid', async () => {
    const req = authReq({}, {}, { startDate: '2024-01-01', endDate: 'not-a-date' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.getReminders(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
  });

  it('returns 200 with reminders array when dates are valid', async () => {
    const fakeReminders = [
      { id: 'r-1', title: 'Test', hasTime: true },
      { id: 'r-2', title: 'Test 2', hasTime: false },
    ];
    MockReminder.findWithStatus.mockResolvedValue(fakeReminders as any);

    const req = authReq({}, {}, { startDate: '2024-01-01', endDate: '2024-01-31' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.getReminders(req as Request, res as Response, next as NextFunction);

    expect(MockReminder.findWithStatus).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      reminders: fakeReminders.map(r => ({ ...r, hasTime: r.hasTime === true })),
    });
  });
});

// ---------------------------------------------------------------------------
// createReminder
// ---------------------------------------------------------------------------

describe('reminderController.createReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next with BadRequestError 400 when title is missing', async () => {
    const req = authReq({ dateTime: '2024-06-01T10:00:00Z' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.createReminder(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
  });

  it('calls next with BadRequestError 400 when dateTime is missing', async () => {
    const req = authReq({ title: 'My Reminder' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.createReminder(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
  });

  it('returns 201 when title and dateTime are provided', async () => {
    const fakeReminder = {
      id: 'r-1',
      title: 'My Reminder',
      dateTime: new Date('2024-06-01T10:00:00Z'),
    };
    MockReminder.create.mockResolvedValue(fakeReminder as any);

    const req = authReq({ title: 'My Reminder', dateTime: '2024-06-01T10:00:00Z' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.createReminder(req as Request, res as Response, next as NextFunction);

    expect(MockReminder.create).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ reminder: fakeReminder });
  });
});

// ---------------------------------------------------------------------------
// updateReminderStatus
// ---------------------------------------------------------------------------

describe('reminderController.updateReminderStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next with BadRequestError 400 when statusId is missing', async () => {
    const req = authReq({}, { id: 'r-1' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.updateReminderStatus(
      req as Request,
      res as Response,
      next as NextFunction
    );

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
  });

  it('returns 200 with updated reminder when statusId is valid', async () => {
    const fakeReminder = { id: 'r-1', title: 'Test', statusId: 2 };
    MockReminder.findOneAndUpdate.mockResolvedValue(fakeReminder as any);

    const req = authReq({ statusId: 2 }, { id: 'r-1' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.updateReminderStatus(
      req as Request,
      res as Response,
      next as NextFunction
    );

    expect(MockReminder.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ reminder: fakeReminder });
  });
});

// ---------------------------------------------------------------------------
// deleteReminder
// ---------------------------------------------------------------------------

describe('reminderController.deleteReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and calls findOneAndDelete with the correct id', async () => {
    const fakeReminder = { id: 'r-42', title: 'To delete' };
    MockReminder.findOneAndDelete.mockResolvedValue(fakeReminder as any);

    const req = authReq({}, { id: 'r-42' });
    const res = mockRes();
    const next = mockNext();

    await reminderController.deleteReminder(req as Request, res as Response, next as NextFunction);

    expect(MockReminder.findOneAndDelete).toHaveBeenCalledTimes(1);
    expect(MockReminder.findOneAndDelete).toHaveBeenCalledWith({ id: 'r-42', userId: 'u-1' });
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Recordatorio eliminado' });
  });
});
