import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([LuotTiepNhan, ChiDinhCanLamSang]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
