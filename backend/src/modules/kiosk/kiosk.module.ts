import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KioskService } from './kiosk.service';
import { KioskController } from './kiosk.controller';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { TiepNhanModule } from '../tiep-nhan/tiep-nhan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LuotTiepNhan,
      LichHen,
    ]),
    TiepNhanModule,
  ],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
