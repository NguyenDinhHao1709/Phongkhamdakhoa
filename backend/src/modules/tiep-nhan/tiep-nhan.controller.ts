import {
  Controller, Get, Post, Patch, Body, Param,
  Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  TiepNhanService,
  TaoTiepNhanDto, GhiSinhHieuDto, DieuPhoiPhongDto, CapNhatTrangThaiTiepNhanDto,
} from './tiep-nhan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tiếp nhận')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tiep-nhan')
export class TiepNhanController {
  constructor(private readonly service: TiepNhanService) {}

  @Get('hang-doi')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Hàng đợi bệnh nhân chờ khám hôm nay' })
  hangDoi(@Query('phongKhamId') phongKhamId?: number) {
    return this.service.hangDoi(phongKhamId ? +phongKhamId : undefined);
  }

  @Post()
  @Roles('tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tạo lượt tiếp nhận mới' })
  create(@Body() dto: TaoTiepNhanDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/sinh-hieu')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ghi sinh hiệu ban đầu' })
  ghiSinhHieu(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GhiSinhHieuDto,
    @CurrentUser() user: any,
  ) {
    return this.service.ghiSinhHieu(id, dto, user.id);
  }

  @Get(':id/sinh-hieu')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Xem sinh hiệu của lượt tiếp nhận' })
  xemSinhHieu(@Param('id', ParseIntPipe) id: number) {
    return this.service.xemSinhHieu(id);
  }

  @Patch(':id/phong-kham')
  @Roles('tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Điều phối bệnh nhân vào phòng khám' })
  dieuPhoiPhong(@Param('id', ParseIntPipe) id: number, @Body() dto: DieuPhoiPhongDto) {
    return this.service.dieuPhoiPhong(id, dto);
  }

  @Patch(':id/trang-thai')
  @Roles('tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Cập nhật trạng thái lượt tiếp nhận' })
  capNhatTrangThai(@Param('id', ParseIntPipe) id: number, @Body() dto: CapNhatTrangThaiTiepNhanDto) {
    return this.service.capNhatTrangThai(id, dto);
  }
}

