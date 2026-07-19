import 'reflect-metadata';
import { NestFactory, NestApplication } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // All controllers live under /api (matches the ingress prefix + frontend proxy).
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Served same-origin behind nginx in production; permissive here for the SPA
  // dev server and direct probes.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Issue Tracker API')
    .setDescription('NestJS + Prisma REST backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Probe path per colossus.stack.json: /api/docs
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
