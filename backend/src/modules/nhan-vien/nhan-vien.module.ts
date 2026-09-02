import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NhanVien } from './entities/nhan-vien.entity';
import { BacSi } from './entities/bac-si.entity';
import { KyThuatVien } from './entities/ky-thuat-vien.entity';
import { NhanVienService } from './nhan-vien.service';
import { NhanVienController } from './nhan-vien.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NhanVien, BacSi, KyThuatVien])],
  controllers: [NhanVienController],
  providers: [NhanVienService],
  exports: [NhanVienService, TypeOrmModule],
})
export class NhanVienModule {}
