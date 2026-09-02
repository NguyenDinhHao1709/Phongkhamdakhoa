import {
  Controller, Get, Post, Patch, Param, Query, Body, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThanhToanService } from './thanh-toan.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Thu ngân & Thanh toán')
@ApiBearerAuth()
@Controller('thanh-toan')
export class ThanhToanController {
  constructor(private readonly thanhToanService: ThanhToanService) {}

  @Get('danh-sach')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  getDanhSach(
    @Query('trangThai') trangThai?: string,
    @Query('search') search?: string,
  ) {
    return this.thanhToanService.getDanhSachHoaDon({ trangThai, search });
  }

  @Get(':id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn' })
  getChiTiet(@Param('id', ParseIntPipe) id: number) {
    return this.thanhToanService.getChiTietHoaDon(id);
  }

  @Post('luot-tiep-nhan/:luotTiepNhanId')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo hoặc cập nhật hóa đơn từ lượt tiếp nhận' })
  taoHoaDonTuLuotKham(@Param('luotTiepNhanId', ParseIntPipe) luotTiepNhanId: number) {
    return this.thanhToanService.taoHoacCapNhatTuLuotKham(luotTiepNhanId);
  }

  @Patch(':id/xac-nhan')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xác nhận thu tiền hóa đơn' })
  xacNhanThanhToan(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: { phuongThucThanhToan: string; soTienGiam?: number; ghiChu?: string },
  ) {
    return this.thanhToanService.xacNhanThanhToan(id, userId, dto);
  }
}

