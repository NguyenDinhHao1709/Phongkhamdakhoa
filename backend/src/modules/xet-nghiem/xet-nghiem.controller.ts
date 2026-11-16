import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { basename, join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import {
  XetNghiemService,
  TaoChiDinhDto, CapNhatTrangThaiChiDinhDto,
  NhapKetQuaDto, TimKiemChiDinhDto,
  HieuChinhKetQuaDto,
} from './xet-nghiem.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { chiChoPhepDuoi, DUOI_ANH } from '../../common/utils/upload-filter.util';

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
      fileFilter: chiChoPhepDuoi([...DUOI_ANH, 'pdf'], 'Chỉ chấp nhận ảnh (JPG, PNG, WEBP, GIF) hoặc PDF'),
    }),
  )
  @ApiOperation({ summary: 'Upload file / ảnh kết quả xét nghiệm (X-Quang, siêu âm, tài liệu...)' })
  @Quyen('xet_nghiem.nhap_kq', 'kham_benh.kham')
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

  @Delete('upload/:filename')
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Xóa file kết quả xét nghiệm đã tải lên' })
  @Quyen('xet_nghiem.nhap_kq', 'kham_benh.kham')
  xoaFileKQXN(@Param('filename') filename: string) {
    const safeFilename = basename(filename);
    if (!safeFilename || safeFilename !== filename || !safeFilename.startsWith('kqxn-')) {
      throw new BadRequestException('Tên file kết quả không hợp lệ');
    }

    const filePath = join(process.cwd(), 'uploads', safeFilename);
    if (existsSync(filePath)) unlinkSync(filePath);
    return { message: 'Đã xóa file kết quả' };
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
  @Quyen('chi_dinh.tao')
  taoChiDinh(@Body() dto: TaoChiDinhDto, @CurrentUser() user: any) {
    return this.service.taoChiDinh(user.id, dto);
  }

  // ─── DANH SÁCH CHỈ ĐỊNH (KTV view) ─────────────────────────
  @Get(['', 'chi-dinh', 'danh-sach-cho'])
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Danh sách chỉ định xét nghiệm (lọc theo trạng thái)' })
  @Quyen('xet_nghiem.xem', 'xet_nghiem.nhap_kq', 'chi_dinh.tao', 'kham_benh.kham')
  danhSachChiDinh(@Query() dto: TimKiemChiDinhDto) {
    return this.service.danhSachChiDinh(dto);
  }


  // ─── CHI TIẾT 1 CHỈ ĐỊNH ──────────────────────────────────
  @Get('chi-dinh/:id')
  @Roles('ky_thuat_vien', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Chi tiết chỉ định + kết quả (nếu có)' })
  @Quyen('xet_nghiem.xem', 'xet_nghiem.nhap_kq', 'chi_dinh.tao', 'kham_benh.kham')
  chiTietChiDinh(@Param('id', ParseIntPipe) id: number) {
    return this.service.chiTietChiDinh(id);
  }

  // ─── CẬP NHẬT TRẠNG THÁI ──────────────────────────────────
  @Patch('chi-dinh/:id/trang-thai')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'KTV cập nhật trạng thái (lấy mẫu → xử lý → có kết quả)' })
  @Quyen('xet_nghiem.xem', 'xet_nghiem.nhap_kq')
  capNhatTrangThai(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapNhatTrangThaiChiDinhDto,
    @CurrentUser() user: any,
  ) {
    return this.service.capNhatTrangThaiChiDinh(id, dto, user.id);
  }

  // ─── HỦY CHỈ ĐỊNH (Bác sĩ hủy khi chưa lấy mẫu) ───────────
  @Delete('chi-dinh/:id')
  @Roles('bac_si', 'ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Bác sĩ hủy chỉ định cận lâm sàng khi còn chờ lấy mẫu' })
  @Quyen('chi_dinh.tao', 'xet_nghiem.nhap_kq')
  huyChiDinh(@Param('id', ParseIntPipe) id: number) {
    return this.service.huyChiDinh(id);
  }

  // ─── NHẬP KẾT QUẢ ──────────────────────────────────────────
  @Post(['chi-dinh/:id/ket-qua', 'ket-qua/:id'])
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'KTV nhập kết quả xét nghiệm' })
  @Quyen('xet_nghiem.nhap_kq')
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
  @Quyen('xet_nghiem.nhap_kq')
  guiKetQuaChoBacSi(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.guiKetQuaChoBacSi(id);
  }

  @Patch('chi-dinh/:id/hieu-chinh')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Hiệu chỉnh nhận xét sau khi đã gửi kết quả cho bác sĩ' })
  @Quyen('xet_nghiem.nhap_kq')
  hieuChinhNhanXet(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HieuChinhKetQuaDto,
    @CurrentUser() user: any,
  ) {
    return this.service.hieuChinhNhanXet(id, dto, user.id);
  }

  // ─── XEM TOÀN BỘ KQ CỦA 1 PHIẾU KHÁM ─────────────────────
  @Get('benh-an-kham/:benhAnKhamId')
  @Roles('bac_si', 'ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tất cả chỉ định + kết quả XN của 1 phiếu khám' })
  @Quyen('kham_benh.kham', 'kham_benh.xem_lich_su', 'xet_nghiem.xem')
  ketQuaTheoBenhAnKham(@Param('benhAnKhamId', ParseIntPipe) id: number) {
    return this.service.ketQuaTheoBenhAnKham(id);
  }

  // ─── UC 47: THỐNG KÊ BÁO CÁO XÉT NGHIỆM ──────────────────
  @Get('thong-ke')
  @Roles('ky_thuat_vien', 'quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc')
  @ApiOperation({ summary: 'Báo cáo thống kê hoạt động xét nghiệm / CĐHA' })
  @Quyen('xet_nghiem.thong_ke', 'bao_cao.doanh_thu', 'dieu_hanh.bao_cao_bo_phan')
  getThongKeXetNghiem(
    @CurrentUser() user: any,
    @Query('range') range?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.service.getThongKeXetNghiem(user, { range, tuNgay, denNgay });
  }
}
