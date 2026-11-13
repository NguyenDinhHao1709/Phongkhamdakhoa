import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  LuotTiepNhan,
  SinhHieu,
  ChiDinhCanLamSang,
  KetQuaXetNghiem,
  DichVuXetNghiem,
  BenhNhan,
  HoSoBenhAn,
  BenhAnKham,
  DonThuoc,
  DonThuocChiTiet,
  Thuoc,
  BacSi,
  NhanVien,
  CauHinhTienCoc,
  AiCauTraLoiCache,
  AiChatTinNhan,
} from './entities/clinical.entities';

const ENTITIES = [
  AiCauTraLoiCache,
  AiChatTinNhan,
  LuotTiepNhan,
  SinhHieu,
  ChiDinhCanLamSang,
  KetQuaXetNghiem,
  DichVuXetNghiem,
  BenhNhan,
  HoSoBenhAn,
  BenhAnKham,
  DonThuoc,
  DonThuocChiTiet,
  Thuoc,
  BacSi,
  NhanVien,
  CauHinhTienCoc,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'phong_kham'),
        entities: ENTITIES,
        synchronize: false,
        logging: false,
        timezone: '+07:00',
        charset: 'utf8mb4',
        extra: { connectionLimit: 5 },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AppModule {}

