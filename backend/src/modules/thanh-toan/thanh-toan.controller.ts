import {
  Controller, Get, Post, Patch, Param, Query, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThanhToanService } from './thanh-toan.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Thu ngân & Thanh toán')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('phamVi') phamVi?: string,
  ) {
    return this.thanhToanService.getThongKeThuNgan(user, { range, tuNgay, denNgay, phamVi });
  }

  @Get('danh-sach-thu-ngan')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên thu ngân để bàn giao ca trực (loại trừ chính mình)' })
  getDanhSachThuNgan(@CurrentUser('id') currentUserId: number) {
    return this.thanhToanService.getDanhSachThuNgan(currentUserId);
  }

  @Get('phieu-chi-hoat-dong')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách phiếu chi hoạt động OPEX' })
  getDanhSachPhieuChiHoatDong(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiChi') loaiChi?: string,
    @Query('search') search?: string,
  ) {
    return this.thanhToanService.getDanhSachPhieuChiHoatDong({ tuNgay, denNgay, loaiChi, search });
  }

  @Post('phieu-chi-hoat-dong')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lập phiếu chi hoạt động OPEX mới' })
  taoPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Body() dto: {
      loaiChi: string;
      khoanChi: string;
      nguoiNhan: string;
      soTien: number;
      phuongThucChi?: string;
      chungTuGoc?: string;
      ghiChu?: string;
    },
  ) {
    return this.thanhToanService.taoPhieuChiHoatDong(userId || 1, dto);
  }

  @Get(':id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc', 'benh_nhan')
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
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'benh_nhan')
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

  @Patch('hoa-don/:id/lua-chon-thuoc')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'benh_nhan')
  @ApiOperation({ summary: 'Chọn mua thuốc tại bệnh viện hoặc mua ngoài trước khi thanh toán' })
  capNhatLuaChonThuoc(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai' },
  ) {
    return this.thanhToanService.capNhatLuaChonThuocHoaDon(id, body.luaChonMua);
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

  @Patch(['hoa-don/:id/huy', ':id/huy'])
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Hủy hóa đơn & hoàn tiền viện phí' })
  huyHoaDon(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: { lyDoHuy: string; ghiChu?: string },
  ) {
    return this.thanhToanService.huyHoaDon(id, userId || 1, dto);
  }

  @Post('chot-ca')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Chốt ca trực & kiểm kê két tiền mặt' })
  thucHienChotCa(
    @CurrentUser('id') userId: number,
    @Body() dto: {
      thoiGianBatDau: string;
      thoiGianKetThuc: string;
      tienMatThucTe: number;
      chiTietMenhGia?: any;
      nguoiNhanCaId?: number;
      ghiChu?: string;
    },
  ) {
    return this.thanhToanService.thucHienChotCa(userId || 1, dto);
  }

  @Get('chot-ca/lich-su')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy lịch sử các lần chốt ca' })
  getLichSuChotCa() {
    return this.thanhToanService.getLichSuChotCa();
  }

  @Get('chot-ca/ca-hien-tai')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy thông tin ca trực hiện tại và bàn giao ca đang chờ tiếp nhận' })
  getCaTrucHienTai(@CurrentUser('id') userId: number) {
    return this.thanhToanService.getCaTrucHienTai(userId);
  }

  @Post('chot-ca/:id/xac-nhan-nhan-ca')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Xác nhận tiếp nhận bàn giao ca và mở ca trực mới' })
  xacNhanNhanCa(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.thanhToanService.xacNhanNhanCa(id, userId);
  }

  @Get('chot-ca/:id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy chi tiết chốt ca để in biên bản bàn giao' })
  getChiTietChotCa(@Param('id', ParseIntPipe) id: number) {
    return this.thanhToanService.getChiTietChotCa(id);
  }
}
