import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  XetNghiemService,
  TaoChiDinhDto, CapNhatTrangThaiChiDinhDto,
  NhapKetQuaDto, TimKiemChiDinhDto,
} from './xet-nghiem.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Xét nghiệm & CLS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('xet-nghiem')
export class XetNghiemController {
  constructor(private readonly service: XetNghiemService) {}

  // ─── UPLOAD FILE / ẢNH KẾT QUẢ XÉT NGHIỆM ─────────────────
  @Post('upload')
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `kqxn-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload file / ảnh kết quả xét nghiệm (X-Quang, siêu âm, tài liệu...)' })
  uploadFileKQXN(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh hoặc tài liệu kết quả');
    }
    const fileUrl = `/uploads/${file.filename}`;
    return {
      message: 'Upload file kết quả thành công',
      data: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
      },
    };
  }

  // ─── DANH MỤC DỊCH VỤ ─────────────────────────────────────
  @Get('dich-vu')
  @Roles('bac_si', 'ky_thuat_vien', 'tiep_tan')
  @ApiOperation({ summary: 'Danh mục dịch vụ xét nghiệm / CĐHA' })
  danhMucDichVu(@Query('loai') loai?: string) {
    return this.service.danhMucDichVu(loai);
  }

  // ─── BÁC SĨ CHỈ ĐỊNH ──────────────────────────────────────
  @Post('chi-dinh')
  @Roles('bac_si')
  @ApiOperation({ summary: 'Bác sĩ chỉ định xét nghiệm / CĐHA' })
  taoChiDinh(@Body() dto: TaoChiDinhDto, @CurrentUser() user: any) {
    return this.service.taoChiDinh(user.id, dto);
  }

  // ─── DANH SÁCH CHỈ ĐỊNH (KTV view) ─────────────────────────
  @Get(['', 'chi-dinh', 'danh-sach-cho'])
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Danh sách chỉ định xét nghiệm (lọc theo trạng thái)' })
  danhSachChiDinh(@Query() dto: TimKiemChiDinhDto) {
    return this.service.danhSachChiDinh(dto);
  }


  // ─── CHI TIẾT 1 CHỈ ĐỊNH ──────────────────────────────────
  @Get('chi-dinh/:id')
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Chi tiết chỉ định + kết quả (nếu có)' })
  chiTietChiDinh(@Param('id', ParseIntPipe) id: number) {
    return this.service.chiTietChiDinh(id);
  }

  // ─── CẬP NHẬT TRẠNG THÁI ──────────────────────────────────
  @Patch('chi-dinh/:id/trang-thai')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'KTV cập nhật trạng thái (lấy mẫu → xử lý → có kết quả)' })
  capNhatTrangThai(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapNhatTrangThaiChiDinhDto,
    @CurrentUser() user: any,
  ) {
    return this.service.capNhatTrangThaiChiDinh(id, dto, user.id);
  }

  // ─── NHẬP KẾT QUẢ ──────────────────────────────────────────
  @Post(['chi-dinh/:id/ket-qua', 'ket-qua/:id'])
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'KTV nhập kết quả xét nghiệm' })
  nhapKetQua(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: NhapKetQuaDto,
    @CurrentUser() user: any,
  ) {
    return this.service.nhapKetQua(id, dto, user.id);
  }

  // ─── GỬI CHO BÁC SĨ ───────────────────────────────────────
  @Patch('chi-dinh/:id/gui-bac-si')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đánh dấu đã gửi kết quả cho bác sĩ' })
  guiKetQuaChoBacSi(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.guiKetQuaChoBacSi(id);
  }

  // ─── XEM TOÀN BỘ KQ CỦA 1 PHIẾU KHÁM ─────────────────────
  @Get('benh-an-kham/:benhAnKhamId')
  @Roles('bac_si', 'ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tất cả chỉ định + kết quả XN của 1 phiếu khám' })
  ketQuaTheoBenhAnKham(@Param('benhAnKhamId', ParseIntPipe) id: number) {
    return this.service.ketQuaTheoBenhAnKham(id);
  }

  // ─── UC 47: THỐNG KÊ BÁO CÁO XÉT NGHIỆM ──────────────────
  @Get('thong-ke')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Báo cáo thống kê hoạt động xét nghiệm / CĐHA' })
  getThongKeXetNghiem(
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.service.getThongKeXetNghiem({ range, tuNgay, denNgay });
  }
}

