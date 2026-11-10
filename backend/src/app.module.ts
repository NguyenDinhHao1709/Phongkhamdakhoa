import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { MemoryCacheModule } from './common/cache/memory-cache.module';
import { createVnTimezoneDataSource } from './common/utils/vn-session-timezone.util';
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
import { ThongBaoModule } from './modules/thong-bao/thong-bao.module';
import { DanhGiaModule } from './modules/danh-gia/danh-gia.module';
import { KioskModule } from './modules/kiosk/kiosk.module';
import { ChamCongModule } from './modules/cham-cong/cham-cong.module';
import { PayosModule } from './modules/payos/payos.module';
import { OfficeModule } from './modules/office/office.module';
import { BaiVietModule } from './modules/bai-viet/bai-viet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'backend/.env'] }),
    MemoryCacheModule,

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
        logging: config.get('DB_LOGGING') === 'true' ? true : ['error'],
        timezone: '+07:00',
        charset: 'utf8mb4',
        extra: {
          connectionLimit: Number(config.get('DB_POOL_LIMIT', 120)),
          queueLimit: 2000,
          waitForConnections: true,
          connectTimeout: 15000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          dateStrings: ['DATE'],
        },
      }),
      inject: [ConfigService],
      dataSourceFactory: (options) => createVnTimezoneDataSource(options!),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          tls: config.get('REDIS_TLS') === 'true' ? {} : undefined,
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
    ThongBaoModule,     // Realtime & In-app Notifications
    DanhGiaModule,      // Đánh giá chất lượng ca khám & CSAT
    KioskModule,        // Kiosk Tiếp nhận tự động
    ChamCongModule,     // Chấm công khuôn mặt
    PayosModule,        // Cổng thanh toán VietQR ngân hàng phòng khám PayOS
    OfficeModule,       // MediCare Digital Office Gateway (Microservice :5003)
    BaiVietModule,      // Cẩm nang y khoa & Bài viết giáo dục sức khỏe
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Tạo các chỉ mục gộp (Composite Indexes) cho các bảng truy vấn tần suất cao (kiểm tra trước để không báo lỗi Duplicate)
    const indexDefs: Array<{ table: string; name: string; columns: string }> = [
      { table: 'lich_hen', name: 'idx_lh_ngay_tt_bs', columns: '(ngay_hen, trang_thai, bac_si_id)' },
      { table: 'lich_lam_viec', name: 'idx_llv_ngay_nv', columns: '(ngay_lam, nhan_vien_id)' },
      { table: 'luot_tiep_nhan', name: 'idx_ltn_ngay_tt', columns: '(thoi_gian_den, trang_thai, phong_kham_id)' },
      { table: 'hoa_don', name: 'idx_hd_ma_tt', columns: '(ma_hoa_don, trang_thai)' },
      { table: 'thong_bao', name: 'idx_tb_nguoi_nhan_doc', columns: '(nguoi_nhan_id, da_doc)' },
    ];
    for (const idx of indexDefs) {
      try {
        const exists: any[] = await this.dataSource.query(
          `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
          [idx.table, idx.name],
        );
        if (!exists || exists.length === 0) {
          await this.dataSource.query(`CREATE INDEX ${idx.name} ON ${idx.table} ${idx.columns}`);
        }
      } catch {}
    }

    this.logger.log('⚡ High-Concurrency DB Pool (120 connections) & Composite Indexes verified');
  }
}
