import {
  Controller, Post, Get, Put, Body, Request, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChamCongService } from './cham-cong.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('cham-cong')
@UseGuards(JwtAuthGuard)
export class ChamCongController {
  constructor(private readonly chamCongService: ChamCongService) {}

  // ─── 1. Check-in ────────────────────────────────────────────────────────────
  @Post('check-in')
  async checkIn(
    @Request() req,
    @Body() body: { frameBase64: string; framesB64?: string[] },
  ) {
    if (!body.frameBase64) throw new BadRequestException('Thiếu dữ liệu khuôn mặt');

    const userId = req.user.id;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || req.ip;

    return this.chamCongService.checkIn(userId, clientIp, body.frameBase64, body.framesB64);
  }

  // ─── 2. Check-out ───────────────────────────────────────────────────────────
  @Post('check-out')
  async checkOut(
    @Request() req,
    @Body() body: { frameBase64: string; framesB64?: string[] },
  ) {
    if (!body.frameBase64) throw new BadRequestException('Thiếu dữ liệu khuôn mặt');

    const userId = req.user.id;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || req.ip;

    return this.chamCongService.checkOut(userId, clientIp, body.frameBase64, body.framesB64);
  }

  // ─── 3. Trạng thái hôm nay ──────────────────────────────────────────────────
  @Get('trang-thai-hom-nay')
  async trangThaiHomNay(@Request() req) {
    const userId = req.user.id;
    return this.chamCongService.trangThaiHomNay(userId);
  }

  // ─── 4. Lịch sử cá nhân ─────────────────────────────────────────────────────
  @Get('lich-su')
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
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || req.ip || '127.0.0.1';
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
  @UseGuards(RolesGuard)
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
  async layCauHinh() {
    return this.chamCongService.layCauHinhChamCong();
  }

  @Put('cau-hinh')
  @UseGuards(RolesGuard)
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
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
  @UseGuards(RolesGuard)
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
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
  @UseGuards(RolesGuard)
  @Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
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
    });
  }
}
