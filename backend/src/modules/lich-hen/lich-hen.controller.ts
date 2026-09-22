import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LichHenService } from './lich-hen.service';
import {
  TaoLichHenDto, CapNhatTrangThaiLichHenDto,
  TimKiemLichHenDto, LaySlotTrongDto,
} from './dto/lich-hen.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Lịch hẹn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lich-hen')
export class LichHenController {
  constructor(private readonly service: LichHenService) {}

  @Public()
  @Post('dat-lich-khach')
  @ApiOperation({ summary: 'Khách chưa có tài khoản đặt lịch khám trực tiếp hoặc online (Public)' })
  datLichKhach(@Body() dto: TaoLichHenDto) {
    return this.service.create(dto, undefined, 'benh_nhan');
  }

  @Get()
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Danh sách lịch hẹn (lọc theo ngày, bác sĩ, trạng thái)' })
  findAll(@Query() dto: TimKiemLichHenDto, @CurrentUser() user: any) {
    return this.service.findAll(dto, user);
  }

  @Get('cua-toi')
  @Roles('benh_nhan', 'tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn cá nhân của bệnh nhân đang đăng nhập' })
  layLichHenCuaToi(@CurrentUser() user: any) {
    return this.service.layLichHenCuaToi(user.id);
  }

  @Get('benh-nhan/my-appointments')
  @Roles('benh_nhan', 'tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn cá nhân (alias my-appointments)' })
  layLichHenMyAppointments(@CurrentUser() user: any) {
    return this.service.layLichHenCuaToi(user.id);
  }

  @Public()
  @Get('bac-si-ca-trong')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ trực và ca khám còn trống theo chuyên khoa & ngày (Public)' })
  layBacSiVaCaTrong(
    @Query('chuyenKhoa') chuyenKhoa?: string,
    @Query('ngay') ngay?: string,
  ) {
    return this.service.layBacSiVaCaTrong(chuyenKhoa, ngay);
  }

  @Public()
  @Get('slot-trong')
  @ApiOperation({ summary: 'Lấy danh sách slot giờ còn trống của bác sĩ (Public)' })
  laySlotTrong(@Query() dto: LaySlotTrongDto) {
    return this.service.laySlotTrong(dto);
  }

  @Get(':id')
  @Roles('tiep_tan', 'bac_si', 'benh_nhan')
  @ApiOperation({ summary: 'Chi tiết lịch hẹn' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('tiep_tan', 'bac_si', 'benh_nhan')
  @ApiOperation({ summary: 'Tạo lịch hẹn mới' })
  create(@Body() dto: TaoLichHenDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.id, user?.vai_tro || 'benh_nhan');
  }

  @Patch(':id/huy')
  @Roles('benh_nhan', 'tiep_tan', 'quan_tri_vien', 'bac_si')
  @ApiOperation({ summary: 'Bệnh nhân hủy lịch hẹn (Có kiểm tra ranh giới 2 tiếng & Hoàn cọc 1/5)' })
  huyLichHen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.service.huyLichHenBoiBenhNhan(id, user.id);
  }

  @Post(':id/bac-si-huy-ca')
  @Roles('bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Bác sĩ gửi yêu cầu hủy ca khám (Bắt buộc nhập lý do, trước tối thiểu 1 ngày, trình Giám đốc duyệt)' })
  bacSiYeuCauHuyCa(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lyDo: string },
    @CurrentUser() user: any,
  ) {
    return this.service.bacSiYeuCauHuyCa(id, body?.lyDo, user);
  }

  @Patch(':id/trang-thai')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Cập nhật trạng thái lịch hẹn (có Optimistic Lock)' })
  capNhatTrangThai(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapNhatTrangThaiLichHenDto,
  ) {
    return this.service.capNhatTrangThai(id, dto);
  }

  @Post(':id/xac-nhan-thanh-toan')
  @Roles('benh_nhan', 'tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Xác nhận thanh toán — tự động phân công bác sĩ nếu bệnh nhân chưa chọn' })
  xacNhanSauThanhToan(@Param('id', ParseIntPipe) id: number) {
    return this.service.xacNhanSauThanhToan(id);
  }

  @Post(':id/tu-dong-phan-cong')
  @Roles('tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Tự động tìm và phân công bác sĩ còn lịch trống' })
  tuDongPhanCong(@Param('id', ParseIntPipe) id: number) {
    return this.service.tuDongPhanCong(id);
  }

  @Post('nhac-lich-tu-dong')
  @Roles('tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Kích hoạt quét và gửi email nhắc lịch hẹn tự động trong 24h tới' })
  guiNhacLichTuDong() {
    return this.service.guiNhacLichTuDong();
  }
}
