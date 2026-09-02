import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HoSoBenhAnController } from './ho-so-benh-an.controller';
import { HoSoBenhAnService } from './ho-so-benh-an.service';
import { HoSoBenhAn, BenhAnKham } from './entities/ho-so-benh-an.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HoSoBenhAn, BenhAnKham])],
  controllers: [HoSoBenhAnController],
  providers: [HoSoBenhAnService],
  exports: [HoSoBenhAnService, TypeOrmModule],
})
export class HoSoBenhAnModule {}

