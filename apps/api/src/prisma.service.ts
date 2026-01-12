import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    // In test mode, prefer DATABASE_URL_TEST, otherwise use DATABASE_URL
    const dbUrl =
      process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error(
        'DATABASE_URL or DATABASE_URL_TEST must be set',
      );
    }
    const pool = new Pool({
      connectionString: dbUrl,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
