import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenhNhanController } from './benh-nhan.controller';
import { BenhNhanService } from './benh-nhan.service';
import { BenhNhan } from './entities/benh-nhan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BenhNhan])],
  controllers: [BenhNhanController],
  providers: [BenhNhanService],
  exports: [BenhNhanService, TypeOrmModule],
})
export class BenhNhanModule {}
