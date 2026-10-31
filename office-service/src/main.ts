import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ extended: true, limit: '30mb' }));

  app.useStaticAssets(join(__dirname, '../../backend/uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('MediCare Digital Office Microservice')
    .setDescription('Internal Realtime Messaging, Department Channels, File Sharing & Collaboration Service (Port 5003)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5003;
  await app.listen(port);
  console.log(`🏢 Office Microservice đang chạy tại: http://localhost:${port}/api/office`);
  console.log(`📖 Office Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();

