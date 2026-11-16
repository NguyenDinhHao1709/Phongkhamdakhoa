import {
  Controller, Post, Get, Put, Body, Request, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChamCongService } from './cham-cong.service';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { getClientIp } from '../../common/middleware/load-protection.middleware';

/** Chấm công bắt buộc gửi chuỗi khung hình cho thử thách nháy mắt (chống giả mạo bằng ảnh) */
function layChuoiKhungHinh(body: { framesB64?: string[] }): string[] {
  const frames = body?.framesB64;
  if (!Array.isArray(frames) || frames.length < 8 || frames.length > 30 || frames.some((f) => typeof f !== 'string')) {
    throw new BadRequestException('Phiên bản trang chấm công đã cũ. Vui lòng tải lại trang (Ctrl + F5) rồi thử lại.');
  }
  return frames;
}

@Controller('cham-cong')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChamCongController {
  constructor(private readonly chamCongService: ChamCongService) {}

  // ─── 0. Đánh thức dịch vụ nhận diện khuôn mặt (public: trang chủ gọi để đánh thức sớm, chỉ ping /health) ─
  @Public()
  @Get('warmup')
  warmup() {
    return this.chamCongService.warmupPythonMl();
  }

  // ─── 1. Check-in ────────────────────────────────────────────────────────────
  @Post('check-in')
  @Quyen('cham_cong.ca_nhan')
  async checkIn(
    @Request() req,
    @Body() body: { framesB64: string[] },
  ) {
    const framesB64 = layChuoiKhungHinh(body);

    const userId = req.user.id;
    const clientIp = getClientIp(req);

    return this.chamCongService.checkIn(userId, clientIp, framesB64);
  }

  // ─── 2. Check-out ───────────────────────────────────────────────────────────
  @Post('check-out')
  @Quyen('cham_cong.ca_nhan')
  async checkOut(
    @Request() req,
    @Body() body: { framesB64: string[] },
  ) {
    const framesB64 = layChuoiKhungHinh(body);

    const userId = req.user.id;
    const clientIp = getClientIp(req);

    return this.chamCongService.checkOut(userId, clientIp, framesB64);
  }

  // ─── 3. Trạng thái hôm nay ──────────────────────────────────────────────────
  @Get('trang-thai-hom-nay')
  @Quyen('cham_cong.ca_nhan')
  async trangThaiHomNay(@Request() req) {
    const userId = req.user.id;
    return this.chamCongService.trangThaiHomNay(userId);
  }

  // ─── 4. Lịch sử cá nhân ─────────────────────────────────────────────────────
  @Get('lich-su')
  @Quyen('cham_cong.ca_nhan')
  async lichSu(
    @Request() req,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    const userId = req.user.id;
    return this.chamCongService.layLichSuCaNhan(userId, tuNgay, denNgay);
  }

  // ─── 5. Lấy IP hiện tại của client ──────────────────────────────────────────
  @Get('ip-hien-tai')
  getIpHienTai(@Request() req) {
    const rawIp = getClientIp(req);
    const lanIp = this.chamCongService.getLanIp();
    const isLocalhost = rawIp === '::1' || rawIp === '127.0.0.1' || rawIp === '::ffff:127.0.0.1';
    const displayIp = isLocalhost && lanIp ? lanIp : (rawIp.startsWith('::ffff:') ? rawIp.slice(7) : (rawIp === '::1' ? '127.0.0.1' : rawIp));
    return {
      ip: displayIp,
      rawIp,
      lanIp,
      isLocalhost,
    };
  }

  // ─── 6. Cấu hình WiFi (Admin only) ─────────────────────────────────────────
  @Get('cau-hinh')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('he_thong.cai_dat_cham_cong')
  async layCauHinh() {
    return this.chamCongService.layCauHinhChamCong();
  }

  @Put('cau-hinh')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  @Quyen('he_thong.cai_dat_cham_cong')
  async capNhatCauHinh(
    @Body() body: { bat_buoc_wifi: boolean; danh_sach_ip: string[] },
  ) {
    await this.chamCongService.capNhatCauHinhChamCong({
      bat_buoc_wifi: body.bat_buoc_wifi ?? false,
      danh_sach_ip: body.danh_sach_ip ?? [],
    });
    return { success: true };
  }

  // ─── 7. Lịch sử tất cả nhân viên (Admin/Giám đốc) ──────────────────────────
  @Get('toan-bo')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @Quyen('cham_cong.quan_ly', 'he_thong.cai_dat_cham_cong')
  async tatCa(
    @Query('ngay') ngay?: string,
    @Query('nhanVienId') nhanVienId?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.chamCongService.layLichSuToanBo(
      ngay,
      nhanVienId ? parseInt(nhanVienId) : undefined,
      tuNgay,
      denNgay,
    );
  }

  // ─── 8. Chấm công thủ công (Ban Giám đốc & Quản trị viên) ───────────────────
  @Post('cham-cong-thu-cong')
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @Quyen('cham_cong.quan_ly', 'he_thong.cai_dat_cham_cong')
  async chamCongThuCong(
    @Request() req,
    @Body() body: {
      nhanVienId: number;
      ngayCham: string;
      gioVao?: string;
      gioRa?: string;
      caLamViecId?: number;
      trangThai?: string;
      ghiChu?: string;
    },
  ) {
    if (!body.nhanVienId) throw new BadRequestException('Vui lòng chọn nhân viên');
    if (!body.ngayCham) throw new BadRequestException('Vui lòng chọn ngày chấm công');

    const nguoiThucHien = req.user?.hoTen || req.user?.tenDangNhap || 'Ban Giám Đốc';
    return this.chamCongService.chamCongThuCong({
      ...body,
      nguoiThucHien,
      // Ghi nhật ký đúng người / vai trò / IP thực hiện (trước đây luôn "giamdoc", 127.0.0.1)
      nguoiDungId: req.user?.id,
      tenDangNhap: req.user?.tenDangNhap,
      vaiTro: req.user?.vai_tro,
      diaChiIp: getClientIp(req),
    });
  }
}
