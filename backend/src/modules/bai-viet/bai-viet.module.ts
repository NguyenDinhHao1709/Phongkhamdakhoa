import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaiViet } from './entities/bai-viet.entity';
import { BaiVietService } from './bai-viet.service';
import { BaiVietController } from './bai-viet.controller';
import { MemoryCacheModule } from '../../common/cache/memory-cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([BaiViet]), MemoryCacheModule],
  controllers: [BaiVietController],
  providers: [BaiVietService],
  exports: [BaiVietService],
})
export class BaiVietModule {}

