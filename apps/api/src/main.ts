// Load environment variables BEFORE any other imports that depend on them
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import './config/stripe.config';
import { assertTestEnv } from './config/test-env-guard';

async function bootstrap() {
  // In test mode, assert that we are connected to a safe test database
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.ENGINEO_ENV === 'test'
  ) {
    assertTestEnv('api-bootstrap');
  }

  // Stripe requires raw body for webhook signature verification
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Enable CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'https://staging.engineo.ai',
    'https://app.engineo.ai',
    'https://engineo.ai',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global exception filter for standardized JSON error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  // Use RENDER_EXTERNAL_URL if available (Render deployment), otherwise show localhost
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  console.log(`🚀 SEOEngine API is running on: ${baseUrl}`);

  // Log runtime feature flags for observability (API runtime)
  const runtimeFlags = {
    NODE_ENV: process.env.NODE_ENV ?? 'undefined',
    REDIS_PREFIX: process.env.REDIS_PREFIX ?? 'engineo',
    ENABLE_CRON: process.env.ENABLE_CRON ?? 'undefined',
    ENABLE_QUEUE_EVENTS: process.env.ENABLE_QUEUE_EVENTS ?? 'undefined',
    ENABLE_QUEUE_SCHEDULERS: process.env.ENABLE_QUEUE_SCHEDULERS ?? 'undefined',
  };
  // eslint-disable-next-line no-console
  console.log('[Runtime] api startup', runtimeFlags);
}

bootstrap();
