import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import './config/stripe.config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  // DeoScoreProcessor and other workers are started via OnModuleInit hooks.

  // Keep process alive; Render/PM2 will manage lifecycle.
  // Optionally handle graceful shutdown.
  const shutdown = async () => {
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // eslint-disable-next-line no-console
  console.log('Worker application context initialized.');

  // Log runtime feature flags for observability (worker runtime)
  const runtimeFlags = {
    NODE_ENV: process.env.NODE_ENV ?? 'undefined',
    REDIS_PREFIX: process.env.REDIS_PREFIX ?? 'engineo',
    ENABLE_CRON: process.env.ENABLE_CRON ?? 'undefined',
    ENABLE_QUEUE_EVENTS: process.env.ENABLE_QUEUE_EVENTS ?? 'undefined',
    ENABLE_QUEUE_SCHEDULERS: process.env.ENABLE_QUEUE_SCHEDULERS ?? 'undefined',
  };
  // eslint-disable-next-line no-console
  console.log('[Runtime] worker startup', runtimeFlags);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap worker context', err);
  process.exit(1);
});
