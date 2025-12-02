import { testPrisma } from '../utils/test-db';
import * as bcrypt from 'bcrypt';

export async function createTestUser(
  overrides: Partial<{ email: string; password: string; name: string }> = {},
) {
  const password = overrides.password ?? 'testpassword123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await testPrisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: overrides.name ?? 'Test User',
    },
  });

  return { user, rawPassword: password };
}

export async function createTestProject(
  userId: string,
  overrides: Partial<{ name: string; domain: string }> = {},
) {
  return testPrisma.project.create({
    data: {
      userId,
      name: overrides.name ?? 'Test Project',
      domain: overrides.domain ?? null,
    },
  });
}
