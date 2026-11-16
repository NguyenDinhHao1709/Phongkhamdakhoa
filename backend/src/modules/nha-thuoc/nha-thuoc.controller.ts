import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NhaThuocService } from './nha-thuoc.service';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Nhà thuốc & Dược sĩ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nha-thuoc')
export class NhaThuocController {
  constructor(private readonly nhaThuocService: NhaThuocService) {}

  @Get('thuoc')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh mục thuốc & kho tồn' })
  @Quyen('thuoc.xem', 'kham_benh.kham')
  getDanhSachThuoc(@Query('search') search?: string) {
    return this.nhaThuocService.getDanhSachThuoc(search);
  }

  @Post('thuoc')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm thuốc mới vào danh mục' })
  @Quyen('thuoc.nhap_kho')
  taoThuoc(@Body() body: any) {
    return this.nhaThuocService.taoThuoc(body);
  }

  @Patch('thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật thông tin thuốc' })
  @Quyen('thuoc.nhap_kho')
  capNhatThuoc(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.nhaThuocService.capNhatThuoc(id, body);
  }

  @Patch('thuoc/:id/ngung-kinh-doanh')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ngừng kinh doanh thuốc, giữ nguyên lịch sử kho' })
  @Quyen('thuoc.nhap_kho')
  ngungKinhDoanhThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.ngungKinhDoanhThuoc(id);
  }

  @Delete('thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa thuốc khỏi danh mục' })
  @Quyen('thuoc.nhap_kho')
  xoaThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.xoaThuoc(id);
  }

  @Get('don-thuoc')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'thu_ngan', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh sách đơn thuốc cần cấp phát' })
  @Quyen('thuoc.xuat_kho', 'kham_benh.kham', 'hoa_don.thanh_toan', 'hoa_don.xem')
  getDanhSachDonThuoc(
    @Query('trangThai') trangThai?: string,
    @Query('search') search?: string,
    @Query('benhAnKhamId') benhAnKhamId?: number,
  ) {
    return this.nhaThuocService.getDanhSachDonThuoc({ trangThai, search, benhAnKhamId });
  }

  @Get('don-thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'thu_ngan', 'bac_si')
  @ApiOperation({ summary: 'Xem chi tiết đơn thuốc & lô FEFO' })
  @Quyen('thuoc.xuat_kho', 'kham_benh.kham', 'hoa_don.thanh_toan', 'hoa_don.xem')
  getChiTietDonThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.getChiTietDonThuoc(id);
  }

  @Post('don-thuoc/:id/cap-phat')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xác nhận cấp phát & trừ kho FEFO' })
  @Quyen('thuoc.xuat_kho')
  capPhatDonThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.capPhatDonThuoc(id);
  }

  @Patch('don-thuoc/:id/lua-chon-mua')
  @Roles('thu_ngan', 'tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'benh_nhan')
  @ApiOperation({ summary: 'Ghi nhận bệnh nhân mua thuốc tại bệnh viện hoặc mua ngoài' })
  @Quyen('hoa_don.thanh_toan', 'benh_nhan.them')
  capNhatLuaChonMua(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { luaChonMua: 'mua_tai_benh_vien' | 'mua_ngoai' },
  ) {
    return this.nhaThuocService.capNhatLuaChonMua(id, body.luaChonMua);
  }

  @Post('don-thuoc')
  @Roles('bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Bác sĩ tạo đơn thuốc điện tử' })
  @Quyen('kham_benh.kham')
  taoDonThuoc(@Body() body: any) {
    return this.nhaThuocService.taoDonThuoc(body);
  }

  @Get('thong-ke')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thống kê & Báo cáo kho thuốc có bộ lọc' })
  @Quyen('thuoc.thong_ke')
  getThongKeNhaThuoc(
    @Query('khoangThoiGian') khoangThoiGian?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('trangThai') trangThai?: string,
    @Query('duongDung') duongDung?: string,
  ) {
    return this.nhaThuocService.getThongKeNhaThuoc({ khoangThoiGian, tuNgay, denNgay, trangThai, duongDung });
  }

  @Get('mua-hang')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc', 'thu_ngan')
  @Quyen('thuoc.nhap_kho', 'thuoc.thong_ke', 'hoa_don.chi_tra_ncc', 'don_tu.phe_duyet')
  getMuaHang(@Query('trangThai') trangThai?: string, @Query('trangThaiChiTra') trangThaiChiTra?: string) {
    return this.nhaThuocService.getMuaHang(trangThai, trangThaiChiTra);
  }

  @Post('mua-hang/nha-cung-cap')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  taoNhaCungCap(@Body() body: any) {
    return this.nhaThuocService.taoNhaCungCap(body);
  }

  @Patch('mua-hang/nha-cung-cap/:id')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  capNhatNhaCungCap(@Param('id') id: string, @Body() body: any) {
    return this.nhaThuocService.capNhatNhaCungCap(Number(id), body);
  }

  @Delete('mua-hang/nha-cung-cap/:id')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  ngungHopTacNhaCungCap(@Param('id') id: string) {
    return this.nhaThuocService.ngungHopTacNhaCungCap(Number(id));
  }

  @Get('mua-hang/nha-cung-cap')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  getNhaCungCap() {
    return this.nhaThuocService.getNhaCungCap();
  }

  @Post('mua-hang/nha-cung-cap/:id/bang-gia')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  capNhatBangGia(@Param('id') id: string, @Body() body: any) {
    return this.nhaThuocService.capNhatBangGiaNhaCungCap(Number(id), body);
  }

  @Delete('mua-hang/nha-cung-cap/:id/bang-gia')
  @Roles('nhan_vien_nha_thuoc', 'nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  xoaBangGia(@Param('id') id: string) {
    return this.nhaThuocService.xoaBangGiaNhaCungCap(Number(id));
  }

  @Post('mua-hang/yeu-cau')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  taoYeuCauNhap(@CurrentUser('id') userId: number, @Body() body: any) {
    return this.nhaThuocService.taoYeuCauNhap({ ...body, nguoiLapId: userId || 1 });
  }

  @Patch('mua-hang/yeu-cau/:id/duyet')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('don_tu.phe_duyet')
  duyetYeuCauNhap(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number, @Body() body: { duyet: boolean; lyDo?: string }) {
    return this.nhaThuocService.duyetYeuCauNhap(id, body.duyet, body.lyDo, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/bao-gia')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  capNhatBaoGia(@Param('id', ParseIntPipe) id: number, @Body() body: { chiTiet: any[] }) {
    return this.nhaThuocService.capNhatBaoGia(id, body.chiTiet);
  }

  @Patch('mua-hang/yeu-cau/:id/dat-hang')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  datHangNhaCungCap(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.datHangNhaCungCap(id);
  }

  @Patch('mua-hang/yeu-cau/:id/tiep-nhan')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('thuoc.nhap_kho')
  tiepNhanHang(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { chiTiet: any[]; ketQuaKiemNhan?: string; bienBanTraHang?: string },
  ) {
    return this.nhaThuocService.tiepNhanHang(id, { ...body, nguoiKiemNhanId: userId || 1 });
  }

  @Patch('mua-hang/yeu-cau/:id/de-nghi-chi')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Kế toán / Thu ngân gửi đề xuất chi tiền mua thuốc tới Ban Giám Đốc' })
  @Quyen('hoa_don.chi_tra_ncc')
  deNghiChiTra(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { soHoaDonNcc: string; ngayHoaDonNcc?: string; phuongThucChi?: string; soChungTuChi: string; ghiChu?: string },
  ) {
    return this.nhaThuocService.deNghiChiTra(id, body, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/duyet-chi')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc phê duyệt hoặc từ chối đề xuất chi tiền mua thuốc NCC' })
  @Quyen('don_tu.phe_duyet')
  duyetChiTra(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { duyet: boolean; lyDo?: string },
  ) {
    return this.nhaThuocService.duyetChiTra(id, body.duyet, body.lyDo, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/chi-tra')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('hoa_don.chi_tra_ncc')
  chiTraNhaCungCap(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { soTien?: number; phuongThucChi?: string; soChungTuChi?: string; soHoaDonNcc?: string; ngayHoaDonNcc?: string; ghiChu?: string },
  ) {
    return this.nhaThuocService.chiTraNhaCungCap(id, body, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/huy-chi')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân hủy đề xuất chi trả mua thuốc khi chưa xuất quỹ' })
  @Quyen('hoa_don.chi_tra_ncc')
  huyChiTraNhaCungCap(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lyDo?: string },
  ) {
    return this.nhaThuocService.huyChiTraNhaCungCap(id, body?.lyDo, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/yeu-cau-huy')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân lập đơn yêu cầu Giám đốc duyệt hủy chi trả mua thuốc đã xuất quỹ' })
  @Quyen('hoa_don.chi_tra_ncc')
  yeuCauHuyChiTra(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lyDo: string },
  ) {
    return this.nhaThuocService.yeuCauHuyChiTra(id, body?.lyDo, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/duyet-huy')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc phê duyệt hoặc từ chối đơn yêu cầu hủy chi trả mua thuốc' })
  @Quyen('don_tu.phe_duyet')
  duyetHuyChiTra(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { duyet: boolean; lyDo?: string },
  ) {
    return this.nhaThuocService.duyetHuyChiTra(id, body?.duyet, body?.lyDo, userId || 1);
  }

  @Patch('mua-hang/yeu-cau/:id/xac-nhan-hoan-quy')
  @Roles('thu_ngan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thu ngân xác nhận tiền hoàn về quỹ sau khi Giám đốc đã duyệt hủy chi trả mua thuốc' })
  @Quyen('hoa_don.chi_tra_ncc')
  xacNhanHoanQuyChiTra(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.nhaThuocService.xacNhanHoanQuyChiTra(id, userId || 1);
  }

  @Get('du-bao-nhu-cau')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Dự báo nhu cầu thuốc ML (Holt-Winters) và cảnh báo điểm đặt hàng lại' })
  @Quyen('thuoc.thong_ke', 'thuoc.nhap_kho', 'dieu_hanh.du_bao_ai')
  getDuBaoNhuCauThuoc(@Query('horizonDays') horizonDays?: number) {
    // Giá trị lạ (NaN, âm, quá lớn) → dùng mặc định 14 ngày thay vì trả dự báo NaN
    const soNgay = Math.round(Number(horizonDays));
    return this.nhaThuocService.getDuBaoNhuCauThuoc(soNgay >= 1 && soNgay <= 180 ? soNgay : 14);
  }
}
