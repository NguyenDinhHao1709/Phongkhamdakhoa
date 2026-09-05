import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { VaiTro } from '../auth/entities/vai-tro.entity';
import { QuyenHan } from '../auth/entities/quyen-han.entity';
import { VaiTroQuyenHan } from '../auth/entities/vai-tro-quyen-han.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { KyThuatVien } from '../nhan-vien/entities/ky-thuat-vien.entity';
import { DonGui } from '../nhan-vien/entities/don-gui.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { CaLamViec } from '../nhan-vien/entities/ca-lam-viec.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { HoaDonChiTiet } from '../thanh-toan/entities/hoa-don-chi-tiet.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { QuanLyController } from './quan-ly.controller';
import { QuanLyService } from './quan-ly.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NguoiDung,
      VaiTro,
      QuyenHan,
      VaiTroQuyenHan,
      NhanVien,
      BacSi,
      KyThuatVien,
      DonGui,
      LichLamViec,
      CaLamViec,
      BenhNhan,
      LuotTiepNhan,
      BenhAnKham,
      HoaDon,
      HoaDonChiTiet,
      ChiDinhCanLamSang,
      DonThuoc,
    ]),
  ],
  controllers: [QuanLyController],
  providers: [QuanLyService],
  exports: [QuanLyService],
})
export class QuanLyModule {}
