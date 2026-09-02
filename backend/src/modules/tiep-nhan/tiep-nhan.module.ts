import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiepNhanController } from './tiep-nhan.controller';
import { TiepNhanService } from './tiep-nhan.service';
import { QueueGateway } from './queue.gateway';
import { LuotTiepNhan, SinhHieu } from './entities/tiep-nhan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LuotTiepNhan, SinhHieu])],
  controllers: [TiepNhanController],
  providers: [TiepNhanService, QueueGateway],
  exports: [TiepNhanService, QueueGateway, TypeOrmModule],
})
export class TiepNhanModule {}

