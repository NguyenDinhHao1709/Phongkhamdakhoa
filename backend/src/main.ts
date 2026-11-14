// Cố định múi giờ Việt Nam (GMT+7) cho toàn bộ tiến trình Backend (Render/Cloud mặc định là UTC)
process.env.TZ = 'Asia/Ho_Chi_Minh';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { loadProtectionMiddleware } from './common/middleware/load-protection.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const isProd = process.env.NODE_ENV === 'production';

  // Header bảo mật; cho phép frontend (domain khác) tải ảnh /uploads, tắt CSP ở dev để Swagger chạy
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProd ? undefined : false,
    }),
  );

  // Kích hoạt lớp bảo vệ chống quá tải, Rate Limiting & Health Check tức thì (/api/health)
  app.use(loadProtectionMiddleware);

  // Tăng giới hạn payload body cho chấm công khuôn mặt & tải ảnh
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Serve uploads folder from both backend/uploads and project root uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    isProd ? configuredOrigins : [...configuredOrigins, 'http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'],
  );
  const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        (!isProd && devOrigin.test(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Loại bỏ field không khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true,          // Tự động chuyển type (string -> number, ...)
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // Swagger (chỉ dev)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Phòng Khám Đa Khoa API')
      .setDescription('API quản lý hệ thống phòng khám - Schema v2')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📖 Swagger: http://localhost:${process.env.PORT || 5000}/api/docs`);
  }

  const port = process.env.PORT || 5000;
  const httpServer = await app.listen(port);
  // Tối ưu HTTP Keep-Alive để tái sử dụng kết nối TCP khi hàng ngàn người truy cập đồng thời
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;
  console.log(`🚀 Server đang chạy: http://localhost:${port}/api`);
  console.log(`🌿 Môi trường: ${process.env.NODE_ENV}`);
}

bootstrap();
