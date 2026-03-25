import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3001';
  const origins = corsOrigin.includes(',') ? corsOrigin.split(',').map((o) => o.trim()) : corsOrigin;
  app.enableCors({ origin: origins });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Homescope API')
    .setDescription('서울/경기 부동산 탐색 서비스 API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Admin-API-Key', in: 'header' }, 'admin-key')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
