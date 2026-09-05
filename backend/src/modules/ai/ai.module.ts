import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LuotTiepNhan, SinhHieu } from '../tiep-nhan/entities/tiep-nhan.entity';
import { ChiDinhCanLamSang, KetQuaXetNghiem } from '../xet-nghiem/entities/xet-nghiem.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { HoSoBenhAn, BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';
import { DonThuocChiTiet } from '../nha-thuoc/entities/don-thuoc-chi-tiet.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // 30s timeout cho ML computation
      maxRedirects: 3,
    }),
    TypeOrmModule.forFeature([
      LuotTiepNhan,
      SinhHieu,
      ChiDinhCanLamSang,
      KetQuaXetNghiem,
      BenhNhan,
      HoSoBenhAn,
      BenhAnKham,
      DonThuoc,
      DonThuocChiTiet,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
