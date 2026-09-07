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

  @Get('thong-ke-thu-ngan')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Báo cáo thống kê doanh thu thu ngân' })
  getThongKeThuNgan(
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.thanhToanService.getThongKeThuNgan({ range, tuNgay, denNgay });
  }

  @Get(':id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn' })
  getChiTiet(@Param('id', ParseIntPipe) id: number) {
    return this.thanhToanService.getChiTietHoaDon(id);
  }

  @Get('hoa-don/luot-kham/:luotId')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'bac_si')
  @ApiOperation({ summary: 'Lấy hoặc tính tổng viện phí trọn gói theo lượt tiếp nhận' })
  layHoaDonTheoLuot(@Param('luotId', ParseIntPipe) luotId: number) {
    return this.thanhToanService.taoHoacCapNhatTuLuotKham(luotId);
  }

  @Post(['hoa-don', 'luot-tiep-nhan/:luotTiepNhanId'])
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo hoặc cập nhật hóa đơn từ lượt khám' })
  taoHoaDonTuLuotKham(
    @Param('luotTiepNhanId') luotTiepNhanId?: string,
    @Body() body?: { luotKhamId?: number; apDungBhyt?: boolean; tyLeBhyt?: number },
  ) {
    const id = luotTiepNhanId ? Number(luotTiepNhanId) : Number(body?.luotKhamId);
    return this.thanhToanService.taoHoacCapNhatTuLuotKham(id, body?.apDungBhyt);
  }

  @Patch([':id/xac-nhan', 'hoa-don/:id/xac-nhan'])
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xác nhận thu tiền hóa đơn' })
  xacNhanThanhToan(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: { phuongThucThanhToan?: string; phuongThuc?: string; soTienGiam?: number; soTienNhan?: number; ghiChu?: string; apDungBhyt?: boolean },
  ) {
    return this.thanhToanService.xacNhanThanhToan(id, userId || 1, {
      phuongThucThanhToan: dto.phuongThucThanhToan || dto.phuongThuc || 'tien_mat',
      soTienGiam: dto.soTienGiam,
      ghiChu: dto.ghiChu,
      apDungBhyt: dto.apDungBhyt,
    });
  }

  @Post('vnpay/tao-url')
  @Roles('thu_ngan', 'benh_nhan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay Sandbox' })
  taoUrlVNPay(@Body() body: { hoaDonId: number; soTien?: number; nganHang?: string }) {
    return this.thanhToanService.taoUrlVNPay(body.hoaDonId, body.soTien, body.nganHang);
  }

  @Get('vnpay/callback')
  @ApiOperation({ summary: 'Webhook IPN callback tiếp nhận kết quả thanh toán từ VNPay' })
  callbackVNPay(@Query() query: Record<string, string>) {
    return this.thanhToanService.callbackVNPay(query);
  }

  @Get('in-hoa-don/:id')
  @Roles('thu_ngan', 'quan_tri_vien', 'benh_nhan')
  @ApiOperation({ summary: 'Lấy dữ liệu in biên lai tài chính song ngữ' })
  inHoaDon(@Param('id', ParseIntPipe) id: number) {
    return this.thanhToanService.getInHoaDon(id);
  }
}

