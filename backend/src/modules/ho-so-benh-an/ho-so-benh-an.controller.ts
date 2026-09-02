import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  HoSoBenhAnService,
  TaoBenhAnKhamDto, CapNhatBenhAnKhamDto, KetThucKhamDto,
} from './ho-so-benh-an.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Hồ sơ bệnh án')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ho-so-benh-an')
export class HoSoBenhAnController {
  constructor(private readonly service: HoSoBenhAnService) {}

  @Get('lich-su/:benhNhanId')
  @Roles('bac_si', 'tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Lịch sử khám của bệnh nhân' })
  lichSuKham(@Param('benhNhanId', ParseIntPipe) benhNhanId: number) {
    return this.service.lichSuKham(benhNhanId);
  }

  @Post('benh-an-kham/:benhNhanId')
  @Roles('bac_si')
  @ApiOperation({ summary: 'Bác sĩ tạo phiếu khám mới' })
  taoBenhAnKham(
    @Param('benhNhanId', ParseIntPipe) benhNhanId: number,
    @Body() dto: TaoBenhAnKhamDto,
    @CurrentUser() user: any,
  ) {
    return this.service.taoBenhAnKham(user.id, benhNhanId, dto);
  }

  @Get('benh-an-kham/:id')
  @Roles('bac_si', 'tiep_tan')
  @ApiOperation({ summary: 'Chi tiết phiếu khám' })
  chiTietBenhAnKham(@Param('id', ParseIntPipe) id: number) {
    return this.service.chiTietBenhAnKham(id);
  }

  @Patch('benh-an-kham/:id')
  @Roles('bac_si')
  @ApiOperation({ summary: 'Cập nhật phiếu khám (đang khám)' })
  capNhatBenhAnKham(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapNhatBenhAnKhamDto,
  ) {
    return this.service.capNhatBenhAnKham(id, dto);
  }

  @Patch('benh-an-kham/:id/ket-thuc')
  @Roles('bac_si')
  @ApiOperation({ summary: 'Kết thúc khám — chuyển trạng thái hoàn thành' })
  ketThucKham(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KetThucKhamDto,
  ) {
    return this.service.ketThucKham(id, dto);
  }

  @Get('thong-ke-bac-si')
  @Roles('bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thống kê & Báo cáo hiệu suất lâm sàng của Bác sĩ' })
  thongKeBacSi(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('hinhThuc') hinhThuc?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.service.getThongKeBacSi(user.id, { range, hinhThuc, tuNgay, denNgay });
  }
}

