import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ChamCongController } from './cham-cong.controller';
import { ChamCongService } from './cham-cong.service';
import { ChamCong } from './entities/cham-cong.entity';
import { CaiDatHeThong } from './entities/cai-dat-he-thong.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NhatKyHeThong } from '../quan-ly/entities/nhat-ky-he-thong.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChamCong, CaiDatHeThong, NhanVien, NhatKyHeThong]),
    HttpModule,
  ],
  controllers: [ChamCongController],
  providers: [ChamCongService],
  exports: [ChamCongService],
})
export class ChamCongModule {}
