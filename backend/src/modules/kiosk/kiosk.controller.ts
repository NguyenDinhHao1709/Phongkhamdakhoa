import { Controller, Get, Post, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KioskService, KioskDangKyMoiDto } from './kiosk.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Kiosk Tiếp Nhận Tự Động')
@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Public()
  @Get('tra-cuu')
  @ApiOperation({ summary: 'Kiosk tra cứu lịch hẹn đã đặt trước bằng SĐT hoặc Mã lịch hẹn (Public)' })
  traCuuLichHen(@Query('search') search: string) {
    return this.kioskService.traCuuLichHen(search);
  }

  @Public()
  @Post('check-in')
  @ApiOperation({ summary: 'Kiosk check-in lịch hẹn & in phiếu số thứ tự tiếp nhận (Public)' })
  checkInLichHen(@Body('lichHenId') lichHenId: number) {
    return this.kioskService.checkInLichHen(Number(lichHenId));
  }

  @Public()
  @Post('dang-ky-moi')
  @ApiOperation({ summary: 'Kiosk đăng ký khám bệnh mới & phân luồng chuyên khoa thông minh (Public)' })
  dangKyMoi(@Body() dto: KioskDangKyMoiDto) {
    return this.kioskService.dangKyMoiTaiKiosk(dto);
  }

  @Public()
  @Get('phong-kham-live')
  @ApiOperation({ summary: 'Bảng theo dõi số lượng bệnh nhân đang chờ theo từng phòng khám (Public)' })
  getPhongKhamLive() {
    return this.kioskService.getPhongKhamLive();
  }
}
