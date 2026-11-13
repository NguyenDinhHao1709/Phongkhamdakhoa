import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*', credentials: true });

  // Chỉ backend (gửi kèm x-internal-key) được gọi service này; /health mở để Render kiểm tra
  const internalKey = process.env.AI_INTERNAL_KEY;
  if (!internalKey) console.warn('⚠️ AI_INTERNAL_KEY chưa đặt — AI Microservice đang mở cho mọi nguồn gọi');
  app.use((req, res, next) => {
    if (!internalKey || req.path === '/api/ai/health' || req.headers['x-internal-key'] === internalKey) return next();
    res.status(401).json({ success: false, message: 'Unauthorized' });
  });

  const config = new DocumentBuilder()
    .setTitle('Phòng Khám AI & Clinical RAG Microservice')
    .setDescription('Standalone AI Microservice (Gemini LLM, RAG, Clinical Triage & ML Gateway)')
    .setVersion('2.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5002;
  await app.listen(port);
  console.log(`🤖 AI Microservice đang chạy tại: http://localhost:${port}/api/ai`);
  console.log(`📖 AI Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();

