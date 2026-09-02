import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../auth/entities/vai-tro.entity';
import { QuyenHan } from '../auth/entities/quyen-han.entity';
import { VaiTroQuyenHan } from '../auth/entities/vai-tro-quyen-han.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { KyThuatVien } from '../nhan-vien/entities/ky-thuat-vien.entity';
import { QuanLyController } from './quan-ly.controller';
import { QuanLyService } from './quan-ly.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NguoiDung, VaiTro, QuyenHan, VaiTroQuyenHan, NhanVien, BacSi, KyThuatVien]),
  ],
  controllers: [QuanLyController],
  providers: [QuanLyService],
})
export class QuanLyModule {}
