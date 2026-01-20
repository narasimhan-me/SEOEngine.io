import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
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

export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder
): Promise<INestApplication> {
  let moduleBuilder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CaptchaService)
    .useClass(CaptchaServiceStub);

  if (override) {
    moduleBuilder = override(moduleBuilder);
  }

  const moduleFixture: TestingModule = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
