import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XetNghiemController } from './xet-nghiem.controller';
import { XetNghiemService } from './xet-nghiem.service';
import { DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem } from './entities/xet-nghiem.entity';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem]),
    ThongBaoModule,
  ],
  controllers: [XetNghiemController],
  providers: [XetNghiemService],
  exports: [XetNghiemService, TypeOrmModule],
})
export class XetNghiemModule {}

