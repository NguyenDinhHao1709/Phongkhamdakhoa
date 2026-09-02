import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NhaThuocService } from './nha-thuoc.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Nhà thuốc & Dược sĩ')
@ApiBearerAuth()
@Controller('nha-thuoc')
export class NhaThuocController {
  constructor(private readonly nhaThuocService: NhaThuocService) {}

  @Get('thuoc')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh mục thuốc & kho tồn' })
  getDanhSachThuoc(@Query('search') search?: string) {
    return this.nhaThuocService.getDanhSachThuoc(search);
  }

  @Post('thuoc')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thêm thuốc mới vào danh mục' })
  taoThuoc(@Body() body: any) {
    return this.nhaThuocService.taoThuoc(body);
  }

  @Patch('thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Cập nhật thông tin thuốc' })
  capNhatThuoc(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.nhaThuocService.capNhatThuoc(id, body);
  }

  @Delete('thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xóa thuốc khỏi danh mục' })
  xoaThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.xoaThuoc(id);
  }

  @Get('don-thuoc')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'thu_ngan', 'bac_si')
  @ApiOperation({ summary: 'Lấy danh sách đơn thuốc cần cấp phát' })
  getDanhSachDonThuoc(
    @Query('trangThai') trangThai?: string,
    @Query('search') search?: string,
    @Query('benhAnKhamId') benhAnKhamId?: number,
  ) {
    return this.nhaThuocService.getDanhSachDonThuoc({ trangThai, search, benhAnKhamId });
  }

  @Get('don-thuoc/:id')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'thu_ngan', 'bac_si')
  @ApiOperation({ summary: 'Xem chi tiết đơn thuốc & lô FEFO' })
  getChiTietDonThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.getChiTietDonThuoc(id);
  }

  @Post('don-thuoc/:id/cap-phat')
  @Roles('nhan_vien_nha_thuoc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Xác nhận cấp phát & trừ kho FEFO' })
  capPhatDonThuoc(@Param('id', ParseIntPipe) id: number) {
    return this.nhaThuocService.capPhatDonThuoc(id);
  }

  @Post('don-thuoc')
  @Roles('bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Bác sĩ tạo đơn thuốc điện tử' })
  taoDonThuoc(@Body() body: any) {
    return this.nhaThuocService.taoDonThuoc(body);
  }
}

