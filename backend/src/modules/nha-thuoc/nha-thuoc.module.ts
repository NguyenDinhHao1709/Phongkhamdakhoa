import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Thuoc } from './entities/thuoc.entity';
import { LoThuoc } from './entities/lo-thuoc.entity';
import { DonThuoc } from './entities/don-thuoc.entity';
import { DonThuocChiTiet } from './entities/don-thuoc-chi-tiet.entity';
import { NhaThuocService } from './nha-thuoc.service';
import { NhaThuocController } from './nha-thuoc.controller';

import { BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { NhaCungCap } from './entities/nha-cung-cap.entity';
import { YeuCauNhapKho } from './entities/yeu-cau-nhap-kho.entity';
import { YeuCauNhapKhoChiTiet } from './entities/yeu-cau-nhap-kho-chi-tiet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Thuoc,
      LoThuoc,
      DonThuoc,
      DonThuocChiTiet,
      BenhAnKham,
      HoaDon,
      BenhNhan,
      NhaCungCap,
      YeuCauNhapKho,
      YeuCauNhapKhoChiTiet,
    ]),
  ],
  controllers: [NhaThuocController],
  providers: [NhaThuocService],
  exports: [NhaThuocService],
})
export class NhaThuocModule {}
