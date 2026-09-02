import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XetNghiemController } from './xet-nghiem.controller';
import { XetNghiemService } from './xet-nghiem.service';
import { DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem } from './entities/xet-nghiem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DichVuXetNghiem, ChiDinhCanLamSang, KetQuaXetNghiem])],
  controllers: [XetNghiemController],
  providers: [XetNghiemService],
  exports: [XetNghiemService, TypeOrmModule],
})
export class XetNghiemModule {}

