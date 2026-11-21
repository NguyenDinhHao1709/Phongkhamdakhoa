import {
  Controller, Get, Post, Patch, Param, Query, Body, ParseIntPipe, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThanhToanService } from './thanh-toan.service';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { assertBenhNhanSoHuu } from '../../common/utils/benh-nhan-so-huu.util';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class XacNhanThanhToanDto {
  @IsOptional() @IsString() phuongThucThanhToan?: string;
  @IsOptional() @IsString() phuongThuc?: string;
  @IsOptional() @IsNumber() @Min(0) soTienGiam?: number;
  @IsOptional() @IsNumber() soTienNhan?: number;
  @IsOptional() @IsString() ghiChu?: string;
  @IsOptional() @IsBoolean() apDungBhyt?: boolean;
}

@ApiTags('Thu ngân & Thanh toán')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('thanh-toan')
export class ThanhToanController {
  constructor(
    private readonly thanhToanService: ThanhToanService,
    private readonly dataSource: DataSource,
  ) {}

  private soHuu(user: any, hoaDonId: number) {
    return assertBenhNhanSoHuu(this.dataSource, user, 'hoa_don', hoaDonId);
  }

  @Get('danh-sach')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  @Quyen('hoa_don.xem', 'hoa_don.chot_ca', 'bao_cao.doanh_thu')
  getDanhSach(
    @Query('trangThai') trangThai?: string,
    @Query('search') search?: string,
  ) {
    return this.thanhToanService.getDanhSachHoaDon({ trangThai, search });
  }

  @Get('thong-ke-thu-ngan')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Báo cáo thống kê doanh thu thu ngân' })
  @Quyen('hoa_don.xem', 'hoa_don.chot_ca', 'bao_cao.doanh_thu')
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
  @Quyen('hoa_don.xem', 'hoa_don.chot_ca', 'bao_cao.doanh_thu')
  getDanhSachThuNgan(@CurrentUser('id') currentUserId: number) {
    return this.thanhToanService.getDanhSachThuNgan(currentUserId);
  }

  @Get('phieu-chi-hoat-dong')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách phiếu chi hoạt động OPEX' })
  @Quyen('hoa_don.chi_tra_ncc', 'don_tu.phe_duyet', 'bao_cao.doanh_thu')
  getDanhSachPhieuChiHoatDong(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiChi') loaiChi?: string,
    @Query('trangThai') trangThai?: string,
    @Query('search') search?: string,
  ) {
    return this.thanhToanService.getDanhSachPhieuChiHoatDong({ tuNgay, denNgay, loaiChi, trangThai, search });
  }

  @Post('phieu-chi-hoat-dong')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lập phiếu chi hoạt động OPEX mới' })
  @Quyen('hoa_don.chi_tra_ncc')
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

  @Patch('phieu-chi-hoat-dong/:id/duyet')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc phê duyệt hoặc từ chối phiếu chi hoạt động' })
  @Quyen('don_tu.phe_duyet')
  duyetPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { duyet: boolean; lyDo?: string },
  ) {
    return this.thanhToanService.duyetPhieuChiHoatDong(id, body.duyet, body.lyDo, userId || 1);
  }

  @Patch('phieu-chi-hoat-dong/:id/xuat-tien')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân xác nhận xuất tiền quỹ cho phiếu chi hoạt động đã được duyệt' })
  @Quyen('hoa_don.chi_tra_ncc')
  xuatTienPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.thanhToanService.xuatTienPhieuChiHoatDong(id, userId || 1);
  }

  @Patch('phieu-chi-hoat-dong/:id/huy-truc-tiep')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân hủy trực tiếp phiếu chi khi chưa xuất quỹ' })
  @Quyen('hoa_don.chi_tra_ncc')
  huyTrucTiepPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lyDo?: string },
  ) {
    return this.thanhToanService.huyTrucTiepPhieuChiHoatDong(id, body?.lyDo, userId || 1);
  }

  @Patch('phieu-chi-hoat-dong/:id/yeu-cau-huy')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân lập đơn yêu cầu Giám đốc phê duyệt hủy phiếu chi đã xuất quỹ' })
  @Quyen('hoa_don.chi_tra_ncc')
  yeuCauHuyPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lyDo: string },
  ) {
    return this.thanhToanService.yeuCauHuyPhieuChiHoatDong(id, body?.lyDo, userId || 1);
  }

  @Patch('phieu-chi-hoat-dong/:id/duyet-huy')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc phê duyệt hoặc từ chối đơn yêu cầu hủy phiếu chi' })
  @Quyen('don_tu.phe_duyet')
  duyetHuyPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { duyet: boolean; lyDo?: string },
  ) {
    return this.thanhToanService.duyetHuyPhieuChiHoatDong(id, body?.duyet, body?.lyDo, userId || 1);
  }

  @Patch('phieu-chi-hoat-dong/:id/xac-nhan-hoan-quy')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân xác nhận tiền hoàn về quỹ sau khi Giám đốc đã duyệt hủy' })
  @Quyen('hoa_don.chi_tra_ncc')
  xacNhanHoanQuyPhieuChiHoatDong(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.thanhToanService.xacNhanHoanQuyPhieuChiHoatDong(id, userId || 1);
  }

  @Get(':id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc', 'benh_nhan')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn' })
  @Quyen('hoa_don.xem', 'hoa_don.thanh_toan', 'bao_cao.doanh_thu')
  async getChiTiet(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    await this.soHuu(user, id);
    return this.thanhToanService.getChiTietHoaDon(id);
  }

  @Get('hoa-don/luot-kham/:luotId')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'bac_si')
  @ApiOperation({ summary: 'Lấy hoặc tính tổng viện phí trọn gói theo lượt tiếp nhận' })
  @Quyen('hoa_don.xem', 'hoa_don.thanh_toan', 'benh_nhan.them', 'kham_benh.kham')
  layHoaDonTheoLuot(@Param('luotId', ParseIntPipe) luotId: number) {
    return this.thanhToanService.taoHoacCapNhatTuLuotKham(luotId);
  }

  @Post(['hoa-don', 'luot-tiep-nhan/:luotTiepNhanId'])
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo hoặc cập nhật hóa đơn từ lượt khám' })
  @Quyen('hoa_don.thanh_toan', 'benh_nhan.them')
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
  @Quyen('hoa_don.thanh_toan')
  xacNhanThanhToan(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: XacNhanThanhToanDto,
  ) {
    return this.thanhToanService.xacNhanThanhToan(id, userId || 1, {
      phuongThucThanhToan: dto.phuongThucThanhToan || dto.phuongThuc || 'tien_mat',
      soTienGiam: dto.soTienGiam,
      ghiChu: dto.ghiChu,
      apDungBhyt: dto.apDungBhyt,
    });
  }

  @Patch('hoa-don/:id/thu-tam-ung')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu tạm ứng (thu ngân nhập, ≥ số phải thu) / phí CLS (đúng số trên phiếu) tại quầy' })
  @Quyen('hoa_don.thanh_toan')
  thuTamUng(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: { soTien?: number; phuongThucThanhToan?: string },
  ) {
    return this.thanhToanService.thuTamUng(id, userId, dto);
  }

  @Patch('hoa-don/:id/lua-chon-thuoc')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'benh_nhan')
  @ApiOperation({ summary: 'Chọn mua thuốc tại bệnh viện hoặc mua ngoài trước khi thanh toán' })
  @Quyen('hoa_don.thanh_toan', 'benh_nhan.them')
  async capNhatLuaChonThuoc(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai' },
    @CurrentUser() user: any,
  ) {
    await this.soHuu(user, id);
    // Bệnh nhân chỉ được xác nhận một lần qua xac-nhan-lua-chon; đổi lại phải nhờ thu ngân
    if (user?.vai_tro === 'benh_nhan') {
      throw new ForbiddenException('Vui lòng xác nhận lựa chọn trên màn hình thanh toán hoặc liên hệ quầy thu ngân');
    }
    return this.thanhToanService.capNhatLuaChonThuocHoaDon(id, body.luaChonMua);
  }

  @Patch('hoa-don/:id/xac-nhan-lua-chon')
  @Roles('benh_nhan')
  @ApiOperation({ summary: 'Bệnh nhân xác nhận một lần: chuyển khoản / tại quầy và mua thuốc tại phòng khám / mua ngoài' })
  async xacNhanLuaChon(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { luaChonThanhToan: string; luaChonMua?: 'mua_tai_benh_vien' | 'mua_ngoai' },
    @CurrentUser() user: any,
  ) {
    await this.soHuu(user, id);
    return this.thanhToanService.xacNhanLuaChonBenhNhan(id, body);
  }

  @Get('in-hoa-don/:id')
  @Roles('thu_ngan', 'quan_tri_vien', 'benh_nhan')
  @ApiOperation({ summary: 'Lấy dữ liệu in biên lai tài chính song ngữ' })
  @Quyen('hoa_don.xem', 'hoa_don.thanh_toan')
  async inHoaDon(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    await this.soHuu(user, id);
    return this.thanhToanService.getInHoaDon(id);
  }

  @Patch(['hoa-don/:id/huy', ':id/huy'])
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Hủy hóa đơn & hoàn tiền viện phí' })
  @Quyen('hoa_don.thanh_toan')
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
  @Quyen('hoa_don.chot_ca')
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
  @Quyen('hoa_don.chot_ca', 'hoa_don.xem')
  getLichSuChotCa() {
    return this.thanhToanService.getLichSuChotCa();
  }

  @Get('chot-ca/ca-hien-tai')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy thông tin ca trực hiện tại và bàn giao ca đang chờ tiếp nhận' })
  @Quyen('hoa_don.chot_ca', 'hoa_don.thanh_toan', 'hoa_don.xem')
  getCaTrucHienTai(@CurrentUser('id') userId: number) {
    return this.thanhToanService.getCaTrucHienTai(userId);
  }

  @Post('chot-ca/:id/xac-nhan-nhan-ca')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Xác nhận tiếp nhận bàn giao ca và mở ca trực mới' })
  @Quyen('hoa_don.chot_ca', 'hoa_don.thanh_toan', 'hoa_don.xem')
  xacNhanNhanCa(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.thanhToanService.xacNhanNhanCa(id, userId);
  }

  @Get('chot-ca/xem-truoc')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Xem trước tiền mặt hệ thống của ca trực trước khi chốt' })
  @Quyen('hoa_don.chot_ca')
  xemTruocChotCa(
    @CurrentUser('id') userId: number,
    @Query('tu') tu: string,
    @Query('den') den: string,
  ) {
    return this.thanhToanService.xemTruocChotCa(userId, tu, den);
  }

  @Get('chot-ca/:id')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy chi tiết chốt ca để in biên bản bàn giao' })
  @Quyen('hoa_don.chot_ca', 'hoa_don.xem')
  getChiTietChotCa(@Param('id', ParseIntPipe) id: number) {
    return this.thanhToanService.getChiTietChotCa(id);
  }
}
