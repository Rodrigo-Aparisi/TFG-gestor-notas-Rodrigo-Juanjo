/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas
 */

import { registerSchema, loginSchema, changePasswordSchema } from '../validation/schemas/user.schema';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas/note.schema';
import { createGroupSchema, addGroupMemberSchema } from '../validation/schemas/group.schema';
import { createReminderSchema } from '../validation/schemas/reminder.schema';

describe('User Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate a correct registration', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123', // No uppercase
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('mayúscula');
      }
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PASSWORD123', // No lowercase
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PasswordABC', // No number
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Pass1', // Too short
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        username: 'testuser',
        email: 'not-an-email',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const invalidData = {
        username: 'test@user!',
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject username shorter than 3 characters', () => {
      const invalidData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate a correct login (any password length)', () => {
      const validData = {
        email: 'test@example.com',
        password: 'abc123', // Short password OK for login (existing users)
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate password change with strong new password', () => {
      const validData = {
        currentPassword: 'oldpassword', // Old password can be weak
        newPassword: 'NewPassword123', // New must be strong
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject weak new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword',
        newPassword: 'weak', // Too weak
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Note Validation Schemas', () => {
  describe('createNoteSchema', () => {
    it('should validate a correct note', () => {
      const validData = {
        title: 'My Note',
        content: 'Note content here',
      };

      const result = createNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
        content: 'Note content',
      };

      const result = createNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject title with dangerous HTML', () => {
      const invalidData = {
        title: '<script>alert("xss")</script>',
        content: 'Content',
      };

      const result = createNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject content with javascript: protocol', () => {
      const invalidData = {
        title: 'Title',
        content: 'Click <a href="javascript:alert(1)">here</a>',
      };

      const result = createNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept note with images array (URLs)', () => {
      const validData = {
        title: 'Note with images',
        content: 'Content',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.png'],
      };

      const result = createNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid image URLs', () => {
      const invalidData = {
        title: 'Note with bad images',
        content: 'Content',
        images: ['not-a-url', 'also-not-a-url'],
      };

      const result = createNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateNoteSchema', () => {
    it('should validate partial update (only title)', () => {
      const validData = {
        title: 'Updated Title',
      };

      const result = updateNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate partial update (only content)', () => {
      const validData = {
        content: 'Updated content',
      };

      const result = updateNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Group Validation Schemas', () => {
  describe('createGroupSchema', () => {
    it('should validate a correct group', () => {
      const validData = {
        name: 'My Group',
        description: 'Group description',
        color: '#ff5500',
      };

      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty group name', () => {
      const invalidData = {
        name: '',
        description: 'Description',
      };

      const result = createGroupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept group without color (optional)', () => {
      const validData = {
        name: 'My Group',
        description: 'Description',
      };

      const result = createGroupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('addGroupMemberSchema', () => {
    it('should validate adding member with valid role', () => {
      const validData = {
        username: 'newmember',
        role: 'member',
      };

      const result = addGroupMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate adding admin', () => {
      const validData = {
        username: 'newadmin',
        role: 'admin',
      };

      const result = addGroupMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const invalidData = {
        username: 'someuser',
        role: 'superadmin', // Invalid role
      };

      const result = addGroupMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid username characters', () => {
      const invalidData = {
        username: 'user@invalid!',
        role: 'member',
      };

      const result = addGroupMemberSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Reminder Validation Schemas', () => {
  describe('createReminderSchema', () => {
    it('should validate a correct reminder', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      const validData = {
        title: 'My Reminder',
        description: 'Reminder description',
        dateTime: futureDate,
        hasTime: true,
        sendEmail: false,
      };

      const result = createReminderSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const invalidData = {
        title: '',
        description: 'Description',
        dateTime: futureDate,
      };

      const result = createReminderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject past date', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const invalidData = {
        title: 'Reminder',
        description: 'Description',
        dateTime: pastDate,
      };

      const result = createReminderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should use default values for optional boolean fields', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const validData = {
        title: 'Reminder',
        description: 'Description',
        dateTime: futureDate,
      };

      const result = createReminderSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasTime).toBe(true);
        expect(result.data.sendEmail).toBe(false);
      }
    });
  });
});
