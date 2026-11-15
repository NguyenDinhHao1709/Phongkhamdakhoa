import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { LichHenModule } from '../lich-hen/lich-hen.module';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { CauHinhTienCoc } from '../quan-ly/entities/cau-hinh-tien-coc.entity';
import { HoaDon } from '../thanh-toan/entities/hoa-don.entity';
import { ThanhToanModule } from '../thanh-toan/thanh-toan.module';
import { ThongBaoModule } from '../thong-bao/thong-bao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LichHen, CauHinhTienCoc, HoaDon]),
    LichHenModule,
    ThanhToanModule,
    ThongBaoModule,
  ],
  controllers: [PayosController],
  providers: [PayosService],
  exports: [PayosService],
})
export class PayosModule {}

