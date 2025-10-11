import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from '../password.util';

// Mock logger to avoid console output during tests
jest.mock('../../config/logger', () => {
  return {
    __esModule: true,
    default: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  };
});

describe('Password Utility Functions', () => {
  const testPassword = 'TestPassword123!';
  const anotherPassword = 'DifferentPassword456@';

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(testPassword);
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      
      // Bcrypt uses random salts, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should generate bcrypt-formatted hash', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    });

    it('should hash passwords of different lengths', async () => {
      const shortPassword = 'short';
      const longPassword = 'this-is-a-very-long-password-with-many-characters-1234567890';
      
      const shortHash = await hashPassword(shortPassword);
      const longHash = await hashPassword(longPassword);
      
      expect(shortHash).toBeDefined();
      expect(longHash).toBeDefined();
      expect(shortHash).not.toBe(longHash);
    });

    it('should hash passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(specialPassword);
    });

    it('should hash empty string', async () => {
      const emptyPassword = '';
      const hashedPassword = await hashPassword(emptyPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });

    it('should throw error if bcrypt fails', async () => {
      // Mock bcrypt.hash to throw an error
      const mockHash = jest.spyOn(bcrypt, 'hash') as jest.Mock;
      mockHash.mockRejectedValueOnce(new Error('Bcrypt error'));
      
      await expect(hashPassword(testPassword)).rejects.toThrow('Failed to hash password');
      
      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('comparePassword', () => {
    let hashedPassword: string;

    beforeEach(async () => {
      hashedPassword = await hashPassword(testPassword);
    });

    it('should return true for matching password', async () => {
      const isMatch = await comparePassword(testPassword, hashedPassword);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const isMatch = await comparePassword(anotherPassword, hashedPassword);
      
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      const isMatch = await comparePassword('', hashedPassword);
      
      expect(isMatch).toBe(false);
    });

    it('should handle case-sensitive comparison', async () => {
      const upperCasePassword = testPassword.toUpperCase();
      const isMatch = await comparePassword(upperCasePassword, hashedPassword);
      
      expect(isMatch).toBe(false);
    });

    it('should handle passwords with whitespace', async () => {
      const passwordWithSpace = ' ' + testPassword;
      const isMatch = await comparePassword(passwordWithSpace, hashedPassword);
      
      expect(isMatch).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const invalidHash = 'not-a-valid-bcrypt-hash';
      
      // bcrypt.compare returns false for invalid hashes rather than throwing
      const isMatch = await comparePassword(testPassword, invalidHash);
      expect(isMatch).toBe(false);
    });

    it('should throw error if bcrypt compare fails', async () => {
      // Mock bcrypt.compare to throw an error
      const mockCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      mockCompare.mockRejectedValueOnce(new Error('Bcrypt compare error'));
      
      await expect(comparePassword(testPassword, hashedPassword)).rejects.toThrow('Failed to compare password');
      
      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('should work with multiple different passwords', async () => {
      const passwords = [
        'Password1!',
        'AnotherPass2@',
        'ThirdPassword3#',
      ];
      
      for (const pwd of passwords) {
        const hash = await hashPassword(pwd);
        const isMatch = await comparePassword(pwd, hash);
        expect(isMatch).toBe(true);
        
        // Check that other passwords don't match
        const otherPasswords = passwords.filter(p => p !== pwd);
        for (const otherPwd of otherPasswords) {
          const isOtherMatch = await comparePassword(otherPwd, hash);
          expect(isOtherMatch).toBe(false);
        }
      }
    });
  });

  describe('Password Hashing Integration', () => {
    it('should hash and verify password in complete flow', async () => {
      const originalPassword = 'MySecurePassword123!';
      
      // Hash the password
      const hashed = await hashPassword(originalPassword);
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(originalPassword);
      
      // Verify correct password
      const isCorrect = await comparePassword(originalPassword, hashed);
      expect(isCorrect).toBe(true);
      
      // Verify incorrect password
      const isIncorrect = await comparePassword('WrongPassword', hashed);
      expect(isIncorrect).toBe(false);
    });

    it('should handle multiple users with same password', async () => {
      const sharedPassword = 'SharedPassword123!';
      
      const hash1 = await hashPassword(sharedPassword);
      const hash2 = await hashPassword(sharedPassword);
      
      // Hashes should be different due to different salts
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await comparePassword(sharedPassword, hash1)).toBe(true);
      expect(await comparePassword(sharedPassword, hash2)).toBe(true);
    });

    it('should maintain security with repeated hashing', async () => {
      const password = 'TestPassword';
      const hashes = [];
      
      // Generate multiple hashes
      for (let i = 0; i < 5; i++) {
        hashes.push(await hashPassword(password));
      }
      
      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(5);
      
      // All should verify correctly
      for (const hash of hashes) {
        expect(await comparePassword(password, hash)).toBe(true);
      }
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'Pässwörd123!你好';
      
      const hashed = await hashPassword(unicodePassword);
      const isMatch = await comparePassword(unicodePassword, hashed);
      
      expect(isMatch).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(200);
      
      const hashed = await hashPassword(longPassword);
      const isMatch = await comparePassword(longPassword, hashed);
      
      expect(isMatch).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should use sufficient salt rounds (12)', async () => {
      const hashed = await hashPassword(testPassword);
      
      // Bcrypt hash format: $2a$rounds$salt+hash
      // Extract rounds from hash
      const parts = hashed.split('$');
      const rounds = parseInt(parts[2], 10);
      
      expect(rounds).toBe(12);
    });

    it('should not expose original password in hash', async () => {
      const password = 'SecretPassword123';
      const hashed = await hashPassword(password);
      
      expect(hashed).not.toContain(password);
      expect(hashed.toLowerCase()).not.toContain(password.toLowerCase());
    });

    it('should produce hashes of consistent length', async () => {
      const passwords = ['short', 'medium-length-password', 'very-long-password-with-many-characters'];
      const hashes = await Promise.all(passwords.map(pwd => hashPassword(pwd)));
      
      // Bcrypt hashes are always 60 characters
      hashes.forEach(hash => {
        expect(hash.length).toBe(60);
      });
    });
  });
});
