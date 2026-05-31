// backend/src/__tests__/emailScheduler.test.ts
jest.mock('../models/reminder', () => ({
  Reminder: {
    findRemindersForEmailNotification: jest.fn(),
  },
}));
jest.mock('../services/emailService', () => ({
  emailService: { sendReminderEmail: jest.fn() },
}));
jest.mock('../config/logger', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, logger: mockLogger, default: mockLogger };
});

import { Reminder } from '../models/reminder';
import { emailService } from '../services/emailService';
import { emailSchedulerService } from '../services/emailSchedulerService';
import logger from '../config/logger';

const MockReminder = Reminder as jest.Mocked<typeof Reminder>;
const mockEmail = emailService as jest.Mocked<typeof emailService>;

describe('emailSchedulerService.scheduleEmails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs reminderId (not userId) when email send fails', async () => {
    const fakeReminder = {
      id: 'reminder-id-123',
      userId: 'user-id-456',
      title: 'Test',
      description: '',
      dateTime: new Date(),
    };
    MockReminder.findRemindersForEmailNotification = jest.fn().mockResolvedValue([fakeReminder]);
    mockEmail.sendReminderEmail = jest.fn().mockRejectedValue(new Error('SMTP error'));

    await emailSchedulerService.scheduleEmails();

    const loggerError = (logger as jest.Mocked<typeof logger>).error as jest.Mock;
    expect(loggerError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reminderId: 'reminder-id-123' })
    );
    // Must NOT log userId as the reminder identifier
    expect(loggerError).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reminderId: 'user-id-456' })
    );
  });

  it('calls sendReminderEmail for each pending reminder', async () => {
    MockReminder.findRemindersForEmailNotification = jest.fn().mockResolvedValue([
      { id: 'r1', userId: 'u1', title: 'T1', description: '', dateTime: new Date() },
      { id: 'r2', userId: 'u2', title: 'T2', description: '', dateTime: new Date() },
    ]);
    mockEmail.sendReminderEmail = jest.fn().mockResolvedValue(true);

    await emailSchedulerService.scheduleEmails();

    expect(mockEmail.sendReminderEmail).toHaveBeenCalledTimes(2);
  });
});
