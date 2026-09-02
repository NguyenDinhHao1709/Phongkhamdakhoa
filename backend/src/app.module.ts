import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { NhanVienModule } from './modules/nhan-vien/nhan-vien.module';
import { BenhNhanModule } from './modules/benh-nhan/benh-nhan.module';
import { LichHenModule } from './modules/lich-hen/lich-hen.module';
import { TiepNhanModule } from './modules/tiep-nhan/tiep-nhan.module';
import { HoSoBenhAnModule } from './modules/ho-so-benh-an/ho-so-benh-an.module';
import { XetNghiemModule } from './modules/xet-nghiem/xet-nghiem.module';
import { QuanLyModule } from './modules/quan-ly/quan-ly.module';

import { ThanhToanModule } from './modules/thanh-toan/thanh-toan.module';
import { NhaThuocModule } from './modules/nha-thuoc/nha-thuoc.module';
import { AiModule } from './modules/ai/ai.module';

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
        autoLoadEntities: true,
        logging: config.get('NODE_ENV') === 'development',
        timezone: '+07:00',
        charset: 'utf8mb4',
        extra: { connectionLimit: 10 },
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    NhanVienModule,
    BenhNhanModule,
    LichHenModule,
    TiepNhanModule,
    HoSoBenhAnModule,   // Sprint 3
    XetNghiemModule,     // Sprint 3
    QuanLyModule,       // Admin
    ThanhToanModule,    // Sprint 4
    NhaThuocModule,     // Sprint 4
    AiModule,           // Sprint 5 (Public AI)
  ],
})
export class AppModule {}
