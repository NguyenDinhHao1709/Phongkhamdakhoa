import {
  Controller, Get, Patch, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThongBaoService } from './thong-bao.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('🔔 Thông Báo Hệ Thống')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('thong-bao')
export class ThongBaoController {
  constructor(private readonly service: ThongBaoService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo và số lượng chưa đọc' })
  layDanhSach(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.service.layDanhSach(user.id, limit ? Number(limit) : 20);
  }

  @Patch(':id/doc')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  danhDauDaDoc(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.danhDauDaDoc(id, user.id);
  }

  @Patch('doc-tat-ca')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  danhDauTatCaDaDoc(@CurrentUser() user: any) {
    return this.service.danhDauTatCaDaDoc(user.id);
  }
}
