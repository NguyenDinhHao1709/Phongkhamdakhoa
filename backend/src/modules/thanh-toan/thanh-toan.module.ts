import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HoaDon } from './entities/hoa-don.entity';
import { HoaDonChiTiet } from './entities/hoa-don-chi-tiet.entity';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { ThanhToanService } from './thanh-toan.service';
import { ThanhToanController } from './thanh-toan.controller';

import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HoaDon,
      HoaDonChiTiet,
      LuotTiepNhan,
      NhanVien,
      BenhAnKham,
      ChiDinhCanLamSang,
      DonThuoc,
    ]),
  ],
  controllers: [ThanhToanController],
  providers: [ThanhToanService],
  exports: [ThanhToanService],
})
export class ThanhToanModule {}
