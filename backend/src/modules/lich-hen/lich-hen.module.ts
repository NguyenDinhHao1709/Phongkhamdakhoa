import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LichHenController } from './lich-hen.controller';
import { LichHenService } from './lich-hen.service';
import { LichHen } from './entities/lich-hen.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';
import { CaLamViec } from '../nhan-vien/entities/ca-lam-viec.entity';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LichHen, BacSi, NhanVien, LichLamViec, CaLamViec]),
    ThongBaoModule,
  ],
  controllers: [LichHenController],
  providers: [LichHenService],
  exports: [LichHenService, TypeOrmModule],
})
export class LichHenModule {}
