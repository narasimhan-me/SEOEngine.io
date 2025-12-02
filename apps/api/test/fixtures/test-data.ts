import { testPrisma } from '../utils/test-db';
import * as bcrypt from 'bcrypt';

export async function createTestUser(overrides: Partial<{ email: string; password: string; name: string }> = {}) {
  const passwordHash = await bcrypt.hash(overrides.password ?? 'testpassword123', 10);
  return testPrisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      passwordHash,
      name: overrides.name ?? 'Test User',
    },
  });
}

export async function createTestProject(userId: string, overrides: Partial<{ name: string; domain: string; connectedType: 'website' | 'shopify' }> = {}) {
  return testPrisma.project.create({
    data: {
      userId,
      name: overrides.name ?? 'Test Project',
      domain: overrides.domain ?? 'https://example.com',
      connectedType: overrides.connectedType ?? 'website',
    },
  });
}
