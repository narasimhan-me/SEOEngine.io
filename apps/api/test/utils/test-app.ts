import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { CaptchaService } from '../../src/captcha/captcha.service';

class CaptchaServiceStub {
  async verify(token: string): Promise<boolean> {
    if (!token) {
      throw new Error('CAPTCHA token is required in tests');
    }
    return true;
  }
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CaptchaService)
    .useClass(CaptchaServiceStub)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
