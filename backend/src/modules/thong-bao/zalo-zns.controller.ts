import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoaiTinZns, ZaloZnsService } from './zalo-zns.service';

class DatRefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class GuiThuZnsDto {
  @IsString()
  @IsNotEmpty()
  soDienThoai: string;

  @IsIn(['nhac_lich', 'xac_nhan_lich', 'co_ket_qua'])
  loai: LoaiTinZns;
}

@ApiTags('🔔 Thông Báo Hệ Thống')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('quan_tri_vien', 'quan_tri_vien_cap_cao')
@Controller('thong-bao/zalo')
export class ZaloZnsController {
  constructor(private readonly zns: ZaloZnsService) {}

  @Get('trang-thai')
  @ApiOperation({ summary: 'Trạng thái cấu hình Zalo ZNS (app, token OA, template)' })
  trangThai() {
    return this.zns.trangThai();
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhập refresh token của Zalo OA (lấy từ công cụ API Explorer của Zalo)' })
  async datToken(@Body() dto: DatRefreshTokenDto) {
    try {
      return { data: await this.zns.datRefreshToken(dto.refreshToken), message: 'Đã lưu và kiểm tra token Zalo OA' };
    } catch (e: any) {
      throw new BadRequestException({ code: 'ZALO_TOKEN_LOI', message: e?.message || 'Token không hợp lệ' });
    }
  }

  @Post('gui-thu')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi thử 1 tin ZNS với dữ liệu mẫu (ở chế độ development chỉ tới được số quản trị viên OA)' })
  async guiThu(@Body() dto: GuiThuZnsDto) {
    const thamSo =
      dto.loai === 'co_ket_qua'
        ? { ten_benh_nhan: 'Nguyễn Văn A', ngay_kham: '20/11/2026', dich_vu: 'Công thức máu' }
        : { ten_benh_nhan: 'Nguyễn Văn A', ma_lich_hen: 'LH-THU', ngay_hen: '20/11/2026', gio_hen: '08:00', bac_si: 'BS Demo', dia_diem: 'Phòng 101' };
    const kq = await this.zns.gui({ loai: dto.loai, soDienThoai: dto.soDienThoai, thamSo });
    if (!kq.ok) {
      throw new BadRequestException({ code: 'ZNS_GUI_LOI', message: kq.boQua ? `Không gửi: ${kq.boQua}` : `Zalo lỗi ${kq.maLoi ?? ''}: ${kq.loi}` });
    }
    return { data: kq, message: 'Đã gửi tin thử' };
  }

  @Get('lich-su')
  @ApiOperation({ summary: 'Lịch sử tin Zalo đã gửi (mới nhất trước)' })
  lichSu(@Query('limit') limit?: string) {
    return this.zns.lichSu(Number(limit) || 50);
  }
}
