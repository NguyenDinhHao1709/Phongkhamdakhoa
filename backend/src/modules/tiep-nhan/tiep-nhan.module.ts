import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiepNhanController } from './tiep-nhan.controller';
import { TiepNhanService } from './tiep-nhan.service';
import { QueueGateway } from './queue.gateway';
import { LuotTiepNhan, SinhHieu } from './entities/tiep-nhan.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';
import { LichLamViec } from '../nhan-vien/entities/lich-lam-viec.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LuotTiepNhan, SinhHieu, LichHen, BacSi, BenhNhan, LichLamViec])],
  controllers: [TiepNhanController],
  providers: [TiepNhanService, QueueGateway],
  exports: [TiepNhanService, QueueGateway, TypeOrmModule],
})
export class TiepNhanModule {}
