import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NhanVienService } from './nhan-vien.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Nhân sự & Đơn từ nội bộ')
@Controller('nhan-vien')
export class NhanVienController {
  constructor(private readonly nhanVienService: NhanVienService) {}

  @Public()
  @Get('bac-si-public')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ & chuyên khoa từ CSDL (Public)' })
  getDanhSachBacSiPublic(@Query('search') search?: string) {
    return this.nhanVienService.getDanhSachBacSiPublic(search);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('ho-so-ca-nhan')
  @ApiOperation({ summary: 'Xem hồ sơ cá nhân nhân viên đang đăng nhập' })
  getHoSoCaNhan(@CurrentUser() user: any) {
    return this.nhanVienService.getHoSoCaNhan(user.id || user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('ho-so-ca-nhan')
  @ApiOperation({ summary: 'Cập nhật số điện thoại và địa chỉ liên lạc của nhân viên' })
  updateHoSoCaNhan(@CurrentUser() user: any, @Body() body: { soDienThoai?: string; diaChi?: string }) {
    return this.nhanVienService.updateHoSoCaNhan(user.id || user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('don-tu')
  @ApiOperation({ summary: 'Nhân viên gửi đơn xin nghỉ phép / đề xuất' })
  taoDonTu(@CurrentUser() user: any, @Body() body: any) {
    return this.nhanVienService.taoDonTu(user.id || user.userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiBearerAuth()
  @Get('don-tu/danh-sach')
  @ApiOperation({ summary: 'Ban giám đốc xem danh sách các đơn từ cần xét duyệt' })
  getDanhSachDonTu(@Query('trangThai') trangThai?: string) {
    return this.nhanVienService.getDanhSachDonTu(trangThai);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiBearerAuth()
  @Patch('don-tu/:id/duyet')
  @ApiOperation({ summary: 'Ban giám đốc phê duyệt hoặc từ chối đơn' })
  duyetDonTu(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.nhanVienService.duyetDonTu(id, body);
  }
}

