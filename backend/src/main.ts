import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3001';
  const origins = corsOrigin.includes(',') ? corsOrigin.split(',').map((o) => o.trim()) : corsOrigin;
  app.enableCors({ origin: origins });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
