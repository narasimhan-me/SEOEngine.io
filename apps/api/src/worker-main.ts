import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap worker context', err);
  process.exit(1);
});
