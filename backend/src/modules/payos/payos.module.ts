import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { LichHenModule } from '../lich-hen/lich-hen.module';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { CauHinhTienCoc } from '../quan-ly/entities/cau-hinh-tien-coc.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LichHen, CauHinhTienCoc]),
    LichHenModule,
  ],
  controllers: [PayosController],
  providers: [PayosService],
  exports: [PayosService],
})
export class PayosModule {}

