import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KioskService } from './kiosk.service';
import { KioskController } from './kiosk.controller';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { LichHen } from '../lich-hen/entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LuotTiepNhan,
      LichHen,
      BenhNhan,
      BacSi,
    ]),
  ],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
