/**
 * USERS-TESTS: Integration tests for Users Service
 *
 * Tests:
 * - Find user by ID
 * - Find user by email
 * - Password exclusion from responses
 *
 * NOTE: These tests require a test database to be configured.
 */
import { UsersService } from '../../../src/users/users.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('UsersService (integration)', () => {
  let usersService: UsersService;
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    usersService = new UsersService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `users-test-${Date.now()}@example.com`,
        password: 'hashed-password-secret',
        name: 'Users Test User',
      },
    });
  });

  describe('Find By ID', () => {
    it('should find user by ID', async () => {
      const user = await usersService.findById(testUser.id);

      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
      expect(user.name).toBe('Users Test User');
    });

    it('should exclude password from response', async () => {
      const user = await usersService.findById(testUser.id);

      expect((user as any).password).toBeUndefined();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(usersService.findById('non-existent-id')).rejects.toThrow(
        'User not found'
      );
    });

    it('should return all non-sensitive user fields', async () => {
      // Create user with all fields
      const fullUser = await testPrisma.user.create({
        data: {
          email: `full-user-${Date.now()}@example.com`,
          password: 'secret',
          name: 'Full User',
          avatarUrl: 'https://example.com/avatar.png',
          timezone: 'America/New_York',
          locale: 'en-US',
          organizationName: 'Test Org',
          accountRole: 'OWNER',
        },
      });

      const user = await usersService.findById(fullUser.id);

      expect(user.name).toBe('Full User');
      expect(user.avatarUrl).toBe('https://example.com/avatar.png');
      expect(user.timezone).toBe('America/New_York');
      expect(user.locale).toBe('en-US');
      expect(user.organizationName).toBe('Test Org');
      expect(user.accountRole).toBe('OWNER');
    });
  });

  describe('Find By Email', () => {
    it('should find user by email', async () => {
      const user = await usersService.findByEmail(testUser.email);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe(testUser.email);
    });

    it('should exclude password from response', async () => {
      const user = await usersService.findByEmail(testUser.email);

      expect((user as any)?.password).toBeUndefined();
    });

    it('should return null for non-existent email', async () => {
      const user = await usersService.findByEmail('non-existent@example.com');

      expect(user).toBeNull();
    });

    it('should handle case-sensitive email lookup', async () => {
      // Email lookup is typically case-sensitive in database
      const user = await usersService.findByEmail(testUser.email.toUpperCase());

      // Depending on DB collation, this may or may not find the user
      // The important thing is it doesn't throw
      expect(user === null || user?.id === testUser.id).toBe(true);
    });
  });

  describe('Multiple Users', () => {
    it('should find correct user among multiple', async () => {
      // Create additional users
      const user2 = await testPrisma.user.create({
        data: {
          email: `user2-${Date.now()}@example.com`,
          password: 'secret',
          name: 'User 2',
        },
      });

      const user3 = await testPrisma.user.create({
        data: {
          email: `user3-${Date.now()}@example.com`,
          password: 'secret',
          name: 'User 3',
        },
      });

      const foundUser2 = await usersService.findById(user2.id);
      const foundUser3 = await usersService.findByEmail(user3.email);

      expect(foundUser2.name).toBe('User 2');
      expect(foundUser3?.name).toBe('User 3');
    });
  });
});
