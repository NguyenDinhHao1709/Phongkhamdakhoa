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
import { DanhGiaCaKham } from '../danh-gia/entities/danh-gia.entity';
import { LichSuGoiKham } from './entities/lich-su-goi-kham.entity';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';
import { ThanhToanModule } from '../thanh-toan/thanh-toan.module';
import { ThongBaoRealtimeSubscriber } from '../thong-bao/thong-bao-realtime.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([LuotTiepNhan, SinhHieu, LichHen, BacSi, BenhNhan, LichLamViec, DanhGiaCaKham, LichSuGoiKham]),
    ThongBaoModule,
    ThanhToanModule,
  ],
  controllers: [TiepNhanController],
  // ThongBaoRealtimeSubscriber đặt ở đây vì cần QueueGateway (ThongBaoModule không import được TiepNhanModule do vòng lặp)
  providers: [TiepNhanService, QueueGateway, ThongBaoRealtimeSubscriber],
  exports: [TiepNhanService, QueueGateway, TypeOrmModule],
})
export class TiepNhanModule {}
