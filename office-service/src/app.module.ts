import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';
import { OfficeGateway } from './office.gateway';
import { createVnTimezoneDataSource } from './common/vn-session-timezone.util';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'phong_kham'),
        synchronize: false,
        logging: false,
        timezone: '+07:00',
        charset: 'utf8mb4',
        extra: {
          connectionLimit: 40,
          queueLimit: 1000,
          waitForConnections: true,
          connectTimeout: 15000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        },
      }),
      inject: [ConfigService],
      dataSourceFactory: (options) => createVnTimezoneDataSource(options!),
    }),
  ],
  controllers: [OfficeController],
  providers: [OfficeService, OfficeGateway],
})
export class AppModule {}

