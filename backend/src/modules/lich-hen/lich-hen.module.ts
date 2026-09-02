import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LichHenController } from './lich-hen.controller';
import { LichHenService } from './lich-hen.service';
import { LichHen } from './entities/lich-hen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LichHen])],
  controllers: [LichHenController],
  providers: [LichHenService],
  exports: [LichHenService, TypeOrmModule],
})
export class LichHenModule {}

