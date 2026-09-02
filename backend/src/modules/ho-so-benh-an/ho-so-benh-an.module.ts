import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HoSoBenhAnController } from './ho-so-benh-an.controller';
import { HoSoBenhAnService } from './ho-so-benh-an.service';
import { HoSoBenhAn, BenhAnKham } from './entities/ho-so-benh-an.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HoSoBenhAn, BenhAnKham, NhanVien, BacSi])],
  controllers: [HoSoBenhAnController],
  providers: [HoSoBenhAnService],
  exports: [HoSoBenhAnService, TypeOrmModule],
})
export class HoSoBenhAnModule {}

