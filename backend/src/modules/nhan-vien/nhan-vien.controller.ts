import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NhanVienService } from './nhan-vien.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Nhân sự & Bác sĩ Public')
@Controller('nhan-vien')
export class NhanVienController {
  constructor(private readonly nhanVienService: NhanVienService) {}

  @Public()
  @Get('bac-si-public')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ & chuyên khoa từ CSDL (Public)' })
  getDanhSachBacSiPublic(@Query('search') search?: string) {
    return this.nhanVienService.getDanhSachBacSiPublic(search);
  }
}

