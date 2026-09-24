import {
  Controller, Post, Get, Patch, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DanhGiaService } from './danh-gia.service';
import { TaoDanhGiaDto, PhanHoiGiamDocDto } from './dto/danh-gia.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Đánh giá chất lượng & CSAT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('danh-gia')
export class DanhGiaController {
  constructor(private readonly danhGiaService: DanhGiaService) {}

  @Post()
  @Roles('benh_nhan')
  @ApiOperation({ summary: 'Bệnh nhân gửi đánh giá ca khám hoàn thành' })
  taoDanhGia(@CurrentUser() user: any, @Body() dto: TaoDanhGiaDto) {
    return this.danhGiaService.taoDanhGia(user.id, dto);
  }

  @Get('lich-hen/:id')
  @Roles('benh_nhan', 'bac_si', 'ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'tiep_tan', 'dieu_duong', 'thu_ngan')
  @ApiOperation({ summary: 'Xem đánh giá của một ca khám' })
  layDanhGiaTheoLichHen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.danhGiaService.layDanhGiaTheoLichHen(id, user.id);
  }

  @Get('bac-si')
  @Roles('bac_si', 'ban_giam_doc', 'quan_tri_vien')
  @ApiOperation({ summary: 'Bác sĩ xem chỉ số hài lòng CSAT và danh sách phản hồi của bệnh nhân' })
  thongKeDanhGiaBacSi(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.danhGiaService.thongKeDanhGiaBacSi(user, { range, tuNgay, denNgay });
  }

  @Get('giam-doc')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Giám Đốc xem chỉ số CSAT toàn viện, BXH bác sĩ & cảnh báo phản hồi thấp' })
  thongKeDanhGiaGiamDoc(
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.danhGiaService.thongKeDanhGiaGiamDoc({ range, tuNgay, denNgay });
  }

  @Patch(':id/phan-hoi')
  @Roles('ban_giam_doc', 'quan_tri_vien')
  @ApiOperation({ summary: 'Giám Đốc phản hồi / ghi chú vào đánh giá của bệnh nhân' })
  phanHoiDanhGia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PhanHoiGiamDocDto,
  ) {
    return this.danhGiaService.phanHoiDanhGia(id, dto);
  }
}

