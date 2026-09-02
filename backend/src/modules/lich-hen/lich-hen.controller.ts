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

@ApiTags('Lịch hẹn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lich-hen')
export class LichHenController {
  constructor(private readonly service: LichHenService) {}

  @Get()
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Danh sách lịch hẹn (lọc theo ngày, bác sĩ, trạng thái)' })
  findAll(@Query() dto: TimKiemLichHenDto) {
    return this.service.findAll(dto);
  }

  @Get('cua-toi')
  @Roles('benh_nhan', 'tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn cá nhân của bệnh nhân đang đăng nhập' })
  layLichHenCuaToi(@CurrentUser() user: any) {
    return this.service.layLichHenCuaToi(user.id);
  }

  @Get('slot-trong')
  @Roles('tiep_tan', 'bac_si', 'benh_nhan')
  @ApiOperation({ summary: 'Lấy danh sách slot giờ còn trống của bác sĩ' })
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
    return this.service.create(dto, user.id, user.vai_tro);
  }

  @Patch(':id/huy')
  @Roles('benh_nhan')
  @ApiOperation({ summary: 'Bệnh nhân hủy lịch hẹn (Có kiểm tra ranh giới 2 tiếng & Hoàn cọc 1/5)' })
  huyLichHen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.service.huyLichHenBoiBenhNhan(id, user.id);
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
}

