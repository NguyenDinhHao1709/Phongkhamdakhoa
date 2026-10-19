import { Controller, Post, Get, Body, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayosService } from './payos.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('PayOS - Cổng thanh toán ngân hàng phòng khám')
@Controller('payos')
export class PayosController {
  constructor(private readonly payosService: PayosService) {}

  @Post('tao-link/:lichHenId')
  @ApiOperation({ summary: 'Tạo mã VietQR động PayOS kết nối trực tiếp tài khoản ngân hàng phòng khám' })
  taoLinkThanhToan(@Param('lichHenId', ParseIntPipe) lichHenId: number) {
    return this.payosService.taoLinkThanhToanLichHen(lichHenId);
  }

  @Get('kiem-tra/:orderCode')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán đơn hàng PayOS' })
  kiemTraDonHang(@Param('orderCode', ParseIntPipe) orderCode: number) {
    return this.payosService.kiemTraTrangThaiDonHang(orderCode);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook nhận thông báo tiền đã vào tài khoản ngân hàng từ PayOS' })
  nhanWebhook(@Body() body: any) {
    return this.payosService.xuLyWebhook(body);
  }
}

