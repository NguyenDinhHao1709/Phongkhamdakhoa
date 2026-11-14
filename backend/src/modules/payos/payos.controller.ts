import { Controller, Post, Get, Body, Param, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayosService } from './payos.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { assertBenhNhanSoHuu } from '../../common/utils/benh-nhan-so-huu.util';

@ApiTags('PayOS - Cổng thanh toán ngân hàng phòng khám')
@UseGuards(JwtAuthGuard)
@Controller('payos')
export class PayosController {
  constructor(
    private readonly payosService: PayosService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('tao-link/:lichHenId')
  @ApiOperation({ summary: 'Tạo mã VietQR động PayOS kết nối trực tiếp tài khoản ngân hàng phòng khám' })
  async taoLinkThanhToan(@Param('lichHenId', ParseIntPipe) lichHenId: number, @CurrentUser() user: any) {
    await assertBenhNhanSoHuu(this.dataSource, user, 'lich_hen', lichHenId);
    return this.payosService.taoLinkThanhToanLichHen(lichHenId);
  }

  @Get('kiem-tra/:orderCode')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán đơn hàng PayOS' })
  kiemTraDonHang(@Param('orderCode', ParseIntPipe) orderCode: number) {
    return this.payosService.kiemTraTrangThaiDonHang(orderCode);
  }

  @Get('kiem-tra-lich-hen/:lichHenId')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán và đồng bộ theo ID lịch hẹn' })
  async kiemTraTheoLichHen(@Param('lichHenId', ParseIntPipe) lichHenId: number, @CurrentUser() user: any) {
    await assertBenhNhanSoHuu(this.dataSource, user, 'lich_hen', lichHenId);
    return this.payosService.kiemTraTheoLichHen(lichHenId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook nhận thông báo tiền đã vào tài khoản ngân hàng từ PayOS' })
  nhanWebhook(@Body() body: any) {
    return this.payosService.xuLyWebhook(body);
  }
}

