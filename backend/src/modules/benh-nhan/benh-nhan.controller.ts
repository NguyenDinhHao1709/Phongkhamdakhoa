import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BenhNhanService } from './benh-nhan.service';
import { TaoBenhNhanDto, CapNhatBenhNhanDto, TimKiemBenhNhanDto } from './dto/benh-nhan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bệnh nhân')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('benh-nhan')
export class BenhNhanController {
  constructor(private readonly service: BenhNhanService) {}

  @Get()
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tìm kiếm danh sách bệnh nhân' })
  findAll(@Query() dto: TimKiemBenhNhanDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'benh_nhan')
  @ApiOperation({ summary: 'Xem chi tiết bệnh nhân' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get('ma/:ma')
  @Roles('tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Tìm bệnh nhân theo mã (BN000001)' })
  findByMa(@Param('ma') ma: string) {
    return this.service.findByMa(ma);
  }

  @Post()
  @Roles('tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Tạo hồ sơ bệnh nhân mới' })
  create(@Body() dto: TaoBenhNhanDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('tiep_tan', 'quan_tri_vien')
  @ApiOperation({ summary: 'Cập nhật thông tin bệnh nhân' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CapNhatBenhNhanDto) {
    return this.service.update(id, dto);
  }
}

