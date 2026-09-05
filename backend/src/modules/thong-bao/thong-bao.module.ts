import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThongBao } from './entities/thong-bao.entity';
import { ThongBaoService } from './thong-bao.service';
import { ThongBaoController } from './thong-bao.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ThongBao])],
  controllers: [ThongBaoController],
  providers: [ThongBaoService],
  exports: [ThongBaoService, TypeOrmModule],
})
export class ThongBaoModule {}
