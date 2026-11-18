import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { QuanLyService } from './quan-ly.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { chiChoPhepDuoi, DUOI_ANH } from '../../common/utils/upload-filter.util';

@ApiTags('Quản lý & Ban Giám Đốc')
@Controller('quan-ly')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuanLyController {
  constructor(private readonly quanLyService: QuanLyService) {}

  // ─── ADMIN: TỔNG QUAN HỆ THỐNG KỸ THUẬT (IT / SYSTEM) ─────────
  @Get('system-overview')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thông số kỹ thuật hệ thống, server, database, số lượng người dùng' })
  @Quyen('he_thong.tong_quan')
  getSystemOverview() {
    return this.quanLyService.getSystemOverview();
  }

  // ─── ADMIN: DANH MỤC DÙNG CHUNG (MASTER DATA) ─────────────────
  @Get('danh-muc-tong-hop')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy toàn bộ danh mục dùng chung (Khoa phòng ban, phòng khám)' })
  @Quyen('he_thong.danh_muc')
  getDanhMucTongHop() {
    return this.quanLyService.getDanhMucTongHop();
  }

  @Post('phong-ban')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm mới Khoa / Phòng ban' })
  @Quyen('he_thong.danh_muc')
  taoPhongBan(@Body() dto: { tenPhongBan: string; moTa?: string }, @CurrentUser('id') userId: number) {
    return this.quanLyService.taoPhongBan(dto, userId);
  }

  @Put('phong-ban/:id')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật Khoa / Phòng ban' })
  @Quyen('he_thong.danh_muc')
  capNhatPhongBan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { tenPhongBan: string; moTa?: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.capNhatPhongBan(id, dto, userId);
  }

  @Delete('phong-ban/:id')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa Khoa / Phòng ban' })
  @Quyen('he_thong.danh_muc')
  xoaPhongBan(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.quanLyService.xoaPhongBan(id, userId);
  }

  @Post('phong-kham')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm mới Phòng khám thực tế' })
  @Quyen('he_thong.danh_muc')
  taoPhongKham(
    @Body() dto: { tenPhong: string; viTri?: string; chuyenKhoa?: string; trangThai?: string; phongBanId?: number },
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.taoPhongKham(dto, userId);
  }

  @Put('phong-kham/:id')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật Phòng khám thực tế' })
  @Quyen('he_thong.danh_muc')
  capNhatPhongKham(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { tenPhong: string; viTri?: string; chuyenKhoa?: string; trangThai?: string; phongBanId?: number },
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.capNhatPhongKham(id, dto, userId);
  }

  @Patch('phong-kham/:id/trang-thai')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đổi trạng thái hoạt động phòng khám' })
  @Quyen('he_thong.danh_muc')
  doiTrangThaiPhongKham(
    @Param('id', ParseIntPipe) id: number,
    @Body('trangThai') trangThai: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.doiTrangThaiPhongKham(id, trangThai, userId);
  }

  @Delete('phong-kham/:id')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa Phòng khám thực tế' })
  @Quyen('he_thong.danh_muc')
  xoaPhongKham(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.quanLyService.xoaPhongKham(id, userId);
  }

  // ─── ADMIN & PUBLIC: THÔNG TIN BỆNH VIỆN / CƠ SỞ Y TẾ ─────────
  @Public()
  @Get('thong-tin-benh-vien')
  @ApiOperation({ summary: 'Lấy thông tin cơ sở khám chữa bệnh & liên hệ (Công khai)' })
  getThongTinBenhVien() {
    return this.quanLyService.getThongTinBenhVien();
  }

  @Put('thong-tin-benh-vien')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật thông tin bệnh viện & liên hệ' })
  @Quyen('he_thong.danh_muc')
  capNhatThongTinBenhVien(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.quanLyService.capNhatThongTinBenhVien(dto, userId);
  }

  // ─── ADMIN & PUBLIC: DANH MỤC CHUYÊN KHOA Y TẾ ──────────────
  @Public()
  @Get('danh-muc-chuyen-khoa')
  @ApiOperation({ summary: 'Lấy danh mục chuyên khoa y tế dùng chung (Công khai)' })
  getDanhMucChuyenKhoa() {
    return this.quanLyService.getDanhMucChuyenKhoa();
  }

  @Put('danh-muc-chuyen-khoa')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật danh mục chuyên khoa y tế' })
  @Quyen('he_thong.danh_muc')
  capNhatDanhMucChuyenKhoa(@Body() dto: any[], @CurrentUser('id') userId: number) {
    return this.quanLyService.capNhatDanhMucChuyenKhoa(dto, userId);
  }

  // ─── ADMIN & PUBLIC: DANH MỤC DƯỢC & ĐƠN VỊ TÍNH ─────────────
  @Public()
  @Get('danh-muc-duoc')
  @ApiOperation({ summary: 'Lấy danh mục dược, đơn vị tính và nhóm thuốc (Công khai)' })
  getDanhMucDuoc() {
    return this.quanLyService.getDanhMucDuoc();
  }

  @Put('danh-muc-duoc')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật danh mục dược dùng chung' })
  @Quyen('he_thong.danh_muc')
  capNhatDanhMucDuoc(@Body() dto: any, @CurrentUser('id') userId: number) {
    return this.quanLyService.capNhatDanhMucDuoc(dto, userId);
  }

  // ─── ADMIN: THÔNG SỐ CƠ SỞ DỮ LIỆU & BACKUP ─────────────────
  @Get('backup-info')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xem thông số bảng dữ liệu và trạng thái sao lưu database' })
  @Quyen('he_thong.sao_luu')
  getBackupInfo() {
    return this.quanLyService.getDatabaseBackupInfo();
  }

  @Get('export-sql-dump')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tải xuống tệp sao lưu dữ liệu toàn diện định dạng .SQL' })
  @Quyen('he_thong.sao_luu')
  async exportSqlDump(@Res() res: Response) {
    const sql = await this.quanLyService.exportSqlDump();
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `phong_kham_backup_${timestamp}.sql`;

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(sql);
  }

  // ─── ADMIN: NHẬT KÝ HỆ THỐNG (SYSTEM AUDIT LOG) ───────────────
  @Get('nhat-ky')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy danh sách nhật ký kiểm toán hệ thống có phân trang & bộ lọc' })
  @Quyen('he_thong.nhat_ky')
  getDanhSachNhatKy(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('loaiNhatKy') loaiNhatKy?: string,
    @Query('hanhDong') hanhDong?: string,
    @Query('search') search?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiNguoiDung') loaiNguoiDung?: string,
  ) {
    return this.quanLyService.getDanhSachNhatKy({
      page,
      limit,
      loaiNhatKy,
      hanhDong,
      search,
      tuNgay,
      denNgay,
      loaiNguoiDung,
    });
  }

  // Mọi người dùng đã đăng nhập: báo lại việc xuất file (file Excel/CSV tạo ở trình duyệt).
  // Nội dung nhật ký do AuditLogInterceptor ghi (hành động XUAT_FILE, kèm tên file & trang).
  @Post('nhat-ky/xuat-file')
  @ApiOperation({ summary: 'Ghi nhận thao tác xuất file dữ liệu' })
  ghiNhanXuatFile() {
    return { ok: true };
  }

  @Get('nhat-ky/thong-ke')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy thống kê số liệu nhật ký hệ thống' })
  @Quyen('he_thong.nhat_ky')
  getThongKeNhatKy() {
    return this.quanLyService.getThongKeNhatKy();
  }

  @Post('nhat-ky')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ghi thêm bản ghi nhật ký kiểm toán' })
  @Quyen('he_thong.nhat_ky')
  ghiLogAudit(
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.quanLyService.ghiLog({
      nguoiDungId: user?.id,
      tenNguoiDung: user?.tenDangNhap || body.tenNguoiDung || 'admin',
      vaiTro: user?.vaiTro || body.vaiTro || 'quan_tri_vien',
      hanhDong: body.hanhDong || 'THAO_TAC_HE_THONG',
      loaiNhatKy: body.loaiNhatKy,
      moTa: body.moTa || 'Thao tác hệ thống',
      // Không nhận IP từ body (client tự khai được); entity nhật ký tự điền IP thật của request
    });
  }

  // ─── UC 17: DASHBOARD TỔNG QUAN BAN GIÁM ĐỐC ─────────────
  @Get('dashboard-stats')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Chỉ số hoạt động tổng quan KPI của phòng khám' })
  @Quyen('dieu_hanh.dashboard', 'he_thong.tong_quan')
  getDashboardStats(
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.quanLyService.getDashboardStats({ range, tuNgay, denNgay });
  }

  // ─── UC 18: BÁO CÁO TÀI CHÍNH VÀ DOANH THU ──────────────
  @Get('bao-cao-tai-chinh')
  @Roles('ban_giam_doc')
  @ApiOperation({ summary: 'Báo cáo doanh thu chi tiết, lọc theo ngày và loại phí' })
  @Quyen('bao_cao.doanh_thu')
  getBaoCaoTaiChinh(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiPhi') loaiPhi?: string,
    @Query('phuongThuc') phuongThuc?: string,
  ) {
    return this.quanLyService.getBaoCaoTaiChinh({ tuNgay, denNgay, loaiPhi, phuongThuc });
  }

  // ─── UC BÁO CÁO TOÀN DIỆN BAN GIÁM ĐỐC (LÂM SÀNG, CLS, DƯỢC, PHÒNG/GIƯỜNG) ─────────
  @Get('bao-cao-toan-dien')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Báo cáo toàn diện phòng khám cho Ban Giám Đốc' })
  @Quyen('bao_cao.doanh_thu')
  getBaoCaoToanDien(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('phuongThuc') phuongThuc?: string,
  ) {
    return this.quanLyService.getBaoCaoToanDien({ tuNgay, denNgay, phuongThuc });
  }

  // ─── UC 22: PHÊ DUYỆT YÊU CẦU / ĐƠN TỪ NHÂN VIÊN ────────
  @Get('don-tu')
  @Roles('ban_giam_doc')
  @ApiOperation({ summary: 'Danh sách đơn từ / yêu cầu của nhân viên cấp dưới' })
  @Quyen('don_tu.phe_duyet')
  getDanhSachDonTu(
    @Query('trangThai') trangThai?: string,
    @Query('vaiTro') vaiTro?: string,
    @Query('chucVu') chucVu?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('loaiDon') loaiDon?: string,
  ) {
    return this.quanLyService.getDanhSachDonTu({
      trangThai,
      vaiTro: vaiTro || chucVu,
      tuNgay,
      denNgay,
      loaiDon,
    });
  }

  @Patch('don-tu/:id/duyet')
  @Roles('ban_giam_doc')
  @ApiOperation({ summary: 'Phê duyệt hoặc từ chối đơn yêu cầu' })
  @Quyen('don_tu.phe_duyet')
  duyetDonTu(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { action: 'duyet' | 'tu_choi'; ghiChuXuLy?: string },
  ) {
    return this.quanLyService.duyetDonTu(id, dto.action, dto.ghiChuXuLy);
  }

  // Nhân viên các bộ phận gửi đơn
  @Post('don-tu')
  @ApiOperation({ summary: 'Nhân viên tạo đơn gửi Giám Đốc' })
  @Quyen('don_tu.gui')
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
  @Quyen('dieu_hanh.tra_cuu')
  traCuuTongHop(@Query('keyword') keyword: string) {
    return this.quanLyService.traCuuTongHop(keyword);
  }

  // ─── UC 20: XẾP LỊCH LÀM VIỆC & PHÂN CA ──────────────────
  @Get('lich-lam-viec')
  @ApiOperation({ summary: 'Xem lịch làm việc phân ca' })
  @Quyen('lich_truc.xem', 'lich_truc.phan_ca')
  getLichLamViec(@Query('weekStart') weekStart?: string) {
    return this.quanLyService.getLichLamViec(weekStart);
  }

  @Post('ca-lam-viec')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm ca làm việc (giờ ca, thời lượng mỗi lượt khám)' })
  @Quyen('lich_truc.phan_ca')
  themCaLamViec(@Body() body: any) {
    return this.quanLyService.luuCaLamViec(body);
  }

  @Put('ca-lam-viec/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Sửa giờ / thời lượng lượt khám của ca làm việc' })
  @Quyen('lich_truc.phan_ca')
  suaCaLamViec(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.quanLyService.luuCaLamViec(body, id);
  }

  @Delete('ca-lam-viec/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa ca làm việc chưa được sử dụng' })
  @Quyen('lich_truc.phan_ca')
  xoaCaLamViec(@Param('id', ParseIntPipe) id: number) {
    return this.quanLyService.xoaCaLamViec(id);
  }

  @Post('lich-lam-viec')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lưu phân ca làm việc cho nhân viên' })
  @Quyen('lich_truc.phan_ca')
  xepLichLamViec(@Body() body: any) {
    const list = Array.isArray(body) ? body : [body];
    return this.quanLyService.xepLichLamViec(list);
  }

  @Patch('lich-lam-viec/khung-online')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cấu hình khung tư vấn online trên ca trực của bác sĩ' })
  @Quyen('lich_truc.phan_ca')
  capNhatKhungOnline(@Body() body: { ids: number[]; onlineTu?: string | null; onlineDen?: string | null }) {
    return this.quanLyService.capNhatKhungOnline(body);
  }

  @Delete('lich-lam-viec/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa ca trực' })
  @Quyen('lich_truc.phan_ca')
  xoaLichLamViec(@Param('id', ParseIntPipe) id: number) {
    return this.quanLyService.xoaLichPhanCa(id);
  }

  @Post('phan-ca-tu-dong/de-xuat')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đề xuất lịch trực tuần theo dự báo bệnh nhân, ràng buộc lao động và công bằng (chưa lưu)' })
  @Quyen('lich_truc.phan_ca')
  deXuatPhanCa(@Body() body: any) {
    return this.quanLyService.deXuatPhanCa(body);
  }

  @Post('phan-ca-tu-dong/ap-dung')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lưu lịch trực tuần đã đề xuất' })
  @Quyen('lich_truc.phan_ca')
  apDungPhanCa(@Body() body: any) {
    return this.quanLyService.apDungPhanCa(body);
  }

  // ─── QUẢN LÝ NHÂN SỰ & TÀI KHOẢN (CŨ) ────────────────────
  @Get('nhan-vien')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhân viên y tế' })
  @Quyen('he_thong.nhan_vien', 'cham_cong.quan_ly', 'lich_truc.phan_ca')
  getDanhSachNhanVien() {
    return this.quanLyService.getDanhSachNhanVien();
  }

  @Post('nhan-vien')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  @Quyen('he_thong.nhan_vien')
  taoNhanVien(@Body() body: any) {
    return this.quanLyService.taoNhanVienMoi(body);
  }

  @Get('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy chi tiết nhân viên' })
  @Quyen('he_thong.nhan_vien', 'cham_cong.quan_ly', 'lich_truc.phan_ca')
  getChiTiet(@Param('id') id: string) {
    return this.quanLyService.getChiTietNhanVien(+id);
  }

  @Patch('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  @Quyen('he_thong.nhan_vien')
  capNhatNhanVien(@Param('id') id: string, @Body() body: any) {
    return this.quanLyService.capNhatNhanVien(+id, body);
  }

  @Delete('nhan-vien/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa nhân viên' })
  @Quyen('he_thong.nhan_vien')
  xoaNhanVien(@Param('id') id: string) {
    return this.quanLyService.xoaNhanVien(+id);
  }

  @Patch('nhan-vien/:id/mat-khau')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  @Quyen('he_thong.nhan_vien')
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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: chiChoPhepDuoi(DUOI_ANH, 'Ảnh đại diện phải là JPG, PNG, WEBP hoặc GIF'),
  }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Query('nhanVienId') nhanVienId?: string,
  ) {
    if (!file) throw new BadRequestException('File không hợp lệ');
    const nvId = nhanVienId ? parseInt(nhanVienId) : undefined;
    return this.quanLyService.kiemTraVaLuuAvatar(file, nvId);
  }

  @Patch('nhan-vien/:id/trang-thai')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản nhân viên' })
  @Quyen('he_thong.nhan_vien')
  doiTrangThai(@Param('id') id: string, @Body('trangThai') trangThai: any) {
    return this.quanLyService.doiTrangThaiTaiKhoan(+id, trangThai);
  }

  // ─── ADMIN: QUẢN LÝ TÀI KHOẢN BỆNH NHÂN ───────────────────────
  @Get('tai-khoan-benh-nhan')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ & tài khoản bệnh nhân kèm thống kê' })
  @Quyen('he_thong.benh_nhan')
  getDanhSachTaiKhoanBenhNhan(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('trangThai') trangThai?: string,
    @Query('coTaiKhoan') coTaiKhoan?: string,
  ) {
    return this.quanLyService.getDanhSachTaiKhoanBenhNhan({ page, limit, search, trangThai, coTaiKhoan });
  }

  @Post('tai-khoan-benh-nhan')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo hồ sơ và tài khoản bệnh nhân mới' })
  @Quyen('he_thong.benh_nhan')
  taoTaiKhoanBenhNhan(@Body() body: any) {
    return this.quanLyService.taoTaiKhoanBenhNhan(body);
  }

  @Post('tai-khoan-benh-nhan/:id/cap-tai-khoan')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cấp tài khoản đăng nhập trực tuyến cho bệnh nhân chưa có tài khoản' })
  @Quyen('he_thong.benh_nhan')
  capTaiKhoanChoBenhNhan(
    @Param('id', ParseIntPipe) benhNhanId: number,
    @Body() body: { tenDangNhap: string; matKhau: string },
  ) {
    return this.quanLyService.capTaiKhoanChoBenhNhan(benhNhanId, body);
  }

  @Patch('tai-khoan-benh-nhan/:id/mat-khau')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản bệnh nhân' })
  @Quyen('he_thong.benh_nhan')
  datLaiMatKhauBenhNhan(
    @Param('id', ParseIntPipe) nguoiDungId: number,
    @Body('matKhauMoi') matKhauMoi: string,
  ) {
    return this.quanLyService.datLaiMatKhau(nguoiDungId, matKhauMoi);
  }

  @Patch('tai-khoan-benh-nhan/:id/trang-thai')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản bệnh nhân' })
  @Quyen('he_thong.benh_nhan')
  doiTrangThaiTaiKhoanBenhNhan(
    @Param('id', ParseIntPipe) nguoiDungId: number,
    @Body('trangThai') trangThai: any,
  ) {
    return this.quanLyService.doiTrangThaiTaiKhoan(nguoiDungId, trangThai);
  }

  @Delete('tai-khoan-benh-nhan/:id')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa hồ sơ và tài khoản bệnh nhân' })
  @Quyen('he_thong.benh_nhan')
  xoaTaiKhoanBenhNhan(@Param('id', ParseIntPipe) id: number) {
    return this.quanLyService.xoaTaiKhoanBenhNhan(id);
  }

  @Get('phan-quyen')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy ma trận phân quyền (Vai trò x Quyền hạn)' })
  @Quyen('he_thong.phan_quyen')
  getPhanQuyenData() {
    return this.quanLyService.getPhanQuyenData();
  }

  @Patch('phan-quyen/:vaiTroId')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật danh sách quyền cho 1 vai trò' })
  @Quyen('he_thong.phan_quyen')
  capNhatPhanQuyen(
    @Param('vaiTroId') vaiTroId: string,
    @Body('quyenHanIds') quyenHanIds: number[],
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.capNhatPhanQuyen(+vaiTroId, quyenHanIds, userId);
  }

  @Post('phan-quyen/:vaiTroId/mac-dinh')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Khôi phục bộ quyền chuẩn mặc định cho vai trò' })
  @Quyen('he_thong.phan_quyen')
  khoiPhucQuyenMacDinh(@Param('vaiTroId', ParseIntPipe) vaiTroId: number, @CurrentUser('id') userId: number) {
    return this.quanLyService.khoiPhucQuyenMacDinh(vaiTroId, userId);
  }

  @Patch('vai-tro/:vaiTroId')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật tên hiển thị & mô tả nhiệm vụ của vai trò' })
  @Quyen('he_thong.phan_quyen')
  capNhatThongTinVaiTro(
    @Param('vaiTroId', ParseIntPipe) vaiTroId: number,
    @Body() dto: { tenVaiTro?: string; moTa?: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.capNhatThongTinVaiTro(vaiTroId, dto, userId);
  }

  @Post('quyen-han')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm quyền hạn / chức năng mới vào danh mục' })
  @Quyen('he_thong.phan_quyen')
  taoQuyenHan(
    @Body() dto: { maQuyen: string; tenQuyen: string; nhomChucNang: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.quanLyService.taoQuyenHan(dto, userId);
  }

  // ─── BÁO CÁO CÁC BỘ PHẬN GỬI BAN GIÁM ĐỐC ─────────────────────
  @Post('bao-cao-bo-phan')
  @ApiOperation({ summary: 'Nhân viên, Bác sĩ lập và gửi báo cáo chuyên môn lên Ban Giám Đốc' })
  taoBaoCaoBoPhan(
    @CurrentUser('id') userId: number,
    @Body() body: {
      boPhan: string;
      tieuDe: string;
      kyBaoCao?: string;
      soLieuSnapshot?: any;
      noiDung?: string;
      kienNghi?: string;
    },
  ) {
    return this.quanLyService.taoBaoCaoBoPhan(userId, body);
  }

  @Get('bao-cao-bo-phan')
  @ApiOperation({ summary: 'Lấy danh sách báo cáo các bộ phận gửi Ban Giám Đốc' })
  layDanhSachBaoCaoBoPhan(
    @Query('boPhan') boPhan?: string,
    @Query('trangThai') trangThai?: string,
  ) {
    return this.quanLyService.layDanhSachBaoCaoBoPhan(boPhan, trangThai);
  }

  @Get('bao-cao-bo-phan/:id')
  @ApiOperation({ summary: 'Xem chi tiết 1 báo cáo bộ phận' })
  layChiTietBaoCaoBoPhan(@Param('id', ParseIntPipe) id: number) {
    return this.quanLyService.layChiTietBaoCaoBoPhan(id);
  }

  @Patch('bao-cao-bo-phan/:id/chi-dao')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc ghi nhận và nhập ý kiến chỉ đạo báo cáo' })
  @Quyen('dieu_hanh.bao_cao_bo_phan')
  chiDaoBaoCaoBoPhan(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { yKien?: string; yKienGiamDoc?: string },
  ) {
    const yKien = body.yKien || body.yKienGiamDoc || '';
    return this.quanLyService.chiDaoBaoCaoBoPhan(id, userId, yKien);
  }

  // ─── BẢNG GIÁ DỊCH VỤ KHÁM CHỮA BỆNH & CẬN LÂM SÀNG ─────────

  @Public()
  @Get('bang-gia-public')
  @ApiOperation({ summary: 'Công khai bảng giá dịch vụ cho bệnh nhân và khách vãng lai tra cứu' })
  getBangGiaPublic(
    @Query('loai') loai?: string,
    @Query('tuKhoa') tuKhoa?: string,
  ) {
    return this.quanLyService.getBangGiaPublic({ loai, tuKhoa });
  }

  @Get('dich-vu-kham-chua-benh')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc / Quản trị viên xem toàn bộ danh mục & bảng giá dịch vụ (kèm thống kê KPI)' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  getDanhSachDichVuQuanLy(
    @Query('loai') loai?: string,
    @Query('trangThai') trangThai?: string,
    @Query('tuKhoa') tuKhoa?: string,
  ) {
    return this.quanLyService.getDanhSachDichVuQuanLy({ loai, trangThai, tuKhoa });
  }

  @Post('dich-vu-kham-chua-benh')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc thêm dịch vụ / kỹ thuật khám chữa bệnh mới vào bảng giá' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  taoDichVuKhamChuaBenh(
    @CurrentUser('id') userId: number,
    @Body() dto: {
      maDichVu: string;
      tenDichVu: string;
      loai: string;
      gia: number;
      donViKetQua?: string;
      giaTriBinhThuong?: string;
      boPhanThucHien?: string;
      mauBenhPham?: string;
      moTa?: string;
      trangThai?: string;
    },
  ) {
    return this.quanLyService.taoDichVuKhamChuaBenh(userId, dto);
  }

  @Patch('dich-vu-kham-chua-benh/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc điều chỉnh đơn giá hoặc thông tin dịch vụ' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  capNhatDichVuKhamChuaBenh(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.quanLyService.capNhatDichVuKhamChuaBenh(id, userId, dto);
  }

  @Patch('dich-vu-kham-chua-benh/:id/trang-thai')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Kích hoạt hoặc tạm ngừng dịch vụ' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  toggleTrangThaiDichVu(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('trangThai') trangThai?: string,
  ) {
    return this.quanLyService.toggleTrangThaiDichVu(id, userId, trangThai);
  }

  @Delete('dich-vu-kham-chua-benh/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa dịch vụ khỏi bảng giá' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  xoaDichVuKhamChuaBenh(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quanLyService.xoaDichVuKhamChuaBenh(id, userId);
  }

  // ─── QUẢN LÝ TIỀN CỌC & CHÍNH SÁCH ĐẶT LỊCH TRƯỚC ─────────

  @Public()
  @Get('cau-hinh-tien-coc')
  @ApiOperation({ summary: 'Lấy cấu hình biểu phí tiền cọc công khai khi đặt lịch (Public)' })
  getCauHinhTienCocPublic() {
    return this.quanLyService.getCauHinhTienCocPublic();
  }

  @Patch('cau-hinh-tien-coc/:id')
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ban Giám Đốc điều chỉnh mức tiền cọc, phần trăm tạm ứng và thời gian hoàn cọc' })
  @Quyen('dieu_hanh.bang_gia', 'he_thong.danh_muc')
  capNhatCauHinhTienCoc(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.quanLyService.capNhatCauHinhTienCoc(id, userId, dto);
  }
}
