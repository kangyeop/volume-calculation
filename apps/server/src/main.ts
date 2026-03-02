import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from './app.module';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
