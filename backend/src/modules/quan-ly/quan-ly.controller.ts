import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { QuanLyService } from './quan-ly.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quản lý & Ban Giám Đốc')
@Controller('quan-ly')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuanLyController {
  constructor(private readonly quanLyService: QuanLyService) {}

  // ─── UC 17: DASHBOARD TỔNG QUAN BAN GIÁM ĐỐC ─────────────
  @Get('dashboard-stats')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Chỉ số hoạt động tổng quan KPI của phòng khám' })
  getDashboardStats(
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.quanLyService.getDashboardStats({ range, tuNgay, denNgay });
  }

  // ─── UC 18: BÁO CÁO TÀI CHÍNH VÀ DOANH THU ──────────────
  @Get('bao-cao-tai-chinh')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Báo cáo doanh thu chi tiết, lọc theo ngày và loại phí' })
  getBaoCaoTaiChinh(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiPhi') loaiPhi?: string,
    @Query('phuongThuc') phuongThuc?: string,
  ) {
    return this.quanLyService.getBaoCaoTaiChinh({ tuNgay, denNgay, loaiPhi, phuongThuc });
  }

  // ─── UC 22: PHÊ DUYỆT YÊU CẦU / ĐƠN TỪ NHÂN VIÊN ────────
  @Get('don-tu')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Danh sách đơn từ / yêu cầu của nhân viên cấp dưới' })
  getDanhSachDonTu(@Query('trangThai') trangThai?: string) {
    return this.quanLyService.getDanhSachDonTu({ trangThai });
  }

  @Patch('don-tu/:id/duyet')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Phê duyệt hoặc từ chối đơn yêu cầu' })
  duyetDonTu(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { action: 'duyet' | 'tu_choi'; ghiChuXuLy?: string },
  ) {
    return this.quanLyService.duyetDonTu(id, dto.action, dto.ghiChuXuLy);
  }

  // Nhân viên các bộ phận gửi đơn
  @Post('don-tu')
  @ApiOperation({ summary: 'Nhân viên tạo đơn gửi Giám Đốc' })
  taoDonTu(
    @CurrentUser('id') userId: number,
    @Body() dto: { loaiDon: string; noiDung: string; fileDinhKem?: string },
  ) {
    return this.quanLyService.taoDonTu(userId, dto);
  }

  // ─── UC 21: TRA CỨU HỒ SƠ TỔNG HỢP ───────────────────────
  @Get('tra-cuu')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tra cứu tổng hợp hồ sơ nhân sự và hồ sơ bệnh án' })
  traCuuTongHop(@Query('keyword') keyword: string) {
    return this.quanLyService.traCuuTongHop(keyword);
  }

  // ─── UC 20: XẾP LỊCH LÀM VIỆC & PHÂN CA ──────────────────
  @Get('lich-lam-viec')
  @ApiOperation({ summary: 'Xem lịch làm việc phân ca' })
  getLichLamViec(@Query('weekStart') weekStart?: string) {
    return this.quanLyService.getLichLamViec(weekStart);
  }

  @Post('lich-lam-viec')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lưu phân ca làm việc cho nhân viên' })
  xepLichLamViec(@Body() body: any) {
    const list = Array.isArray(body) ? body : [body];
    return this.quanLyService.xepLichLamViec(list);
  }

  @Delete('lich-lam-viec/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa ca trực' })
  xoaLichLamViec(@Param('id', ParseIntPipe) id: number) {
    return this.quanLyService.xoaLichPhanCa(id);
  }

  // ─── QUẢN LÝ NHÂN SỰ & TÀI KHOẢN (CŨ) ────────────────────
  @Get('nhan-vien')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhân viên y tế' })
  getDanhSachNhanVien() {
    return this.quanLyService.getDanhSachNhanVien();
  }

  @Post('nhan-vien')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  taoNhanVien(@Body() body: any) {
    return this.quanLyService.taoNhanVienMoi(body);
  }

  @Get('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy chi tiết nhân viên' })
  getChiTiet(@Param('id') id: string) {
    return this.quanLyService.getChiTietNhanVien(+id);
  }

  @Patch('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  capNhatNhanVien(@Param('id') id: string, @Body() body: any) {
    return this.quanLyService.capNhatNhanVien(+id, body);
  }

  @Delete('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa nhân viên' })
  xoaNhanVien(@Param('id') id: string) {
    return this.quanLyService.xoaNhanVien(+id);
  }

  @Patch('nhan-vien/:id/mat-khau')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  async datLaiMatKhau(
    @Param('id') nguoiDungId: number,
    @Body('matKhauMoi') matKhauMoi: string,
  ) {
    return this.quanLyService.datLaiMatKhau(nguoiDungId, matKhauMoi);
  }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File không hợp lệ');
    return {
      message: 'Upload thành công',
      data: `/uploads/avatars/${file.filename}`
    };
  }

  @Patch('nhan-vien/:id/trang-thai')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản nhân viên' })
  doiTrangThai(@Param('id') id: string, @Body('trangThai') trangThai: any) {
    return this.quanLyService.doiTrangThaiTaiKhoan(+id, trangThai);
  }

  @Get('phan-quyen')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy ma trận phân quyền (Vai trò x Quyền hạn)' })
  getPhanQuyenData() {
    return this.quanLyService.getPhanQuyenData();
  }

  @Patch('phan-quyen/:vaiTroId')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật danh sách quyền cho 1 vai trò' })
  capNhatPhanQuyen(
    @Param('vaiTroId') vaiTroId: string,
    @Body('quyenHanIds') quyenHanIds: number[]
  ) {
    return this.quanLyService.capNhatPhanQuyen(+vaiTroId, quyenHanIds);
  }
}
