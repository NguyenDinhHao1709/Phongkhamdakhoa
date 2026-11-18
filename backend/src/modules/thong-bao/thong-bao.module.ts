import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThongBao } from './entities/thong-bao.entity';
import { ThongBaoService } from './thong-bao.service';
import { ThongBaoController } from './thong-bao.controller';
import { ZaloZnsService } from './zalo-zns.service';
import { ZaloZnsController } from './zalo-zns.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ThongBao])],
  controllers: [ThongBaoController, ZaloZnsController],
  providers: [ThongBaoService, ZaloZnsService],
  exports: [ThongBaoService, ZaloZnsService, TypeOrmModule],
})
export class ThongBaoModule {}
