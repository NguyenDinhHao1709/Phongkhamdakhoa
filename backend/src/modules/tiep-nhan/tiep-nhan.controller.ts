import {
  Controller, Get, Post, Patch, Body, Param,
  Query, ParseIntPipe, UseGuards, Res,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import {
  TiepNhanService,
  TaoTiepNhanDto, TiepNhanTaiQuayDto, GhiSinhHieuDto, DieuPhoiPhongDto, CapNhatTrangThaiTiepNhanDto,
} from './tiep-nhan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Quyen } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Tiếp nhận')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tiep-nhan')
export class TiepNhanController {
  constructor(private readonly service: TiepNhanService) {}

  @Public()
  @Get('man-hinh-tv')
  @ApiOperation({ summary: 'Dữ liệu phát sóng Màn hình TV gọi số sảnh chờ trung tâm' })
  getManHinhTV() {
    return this.service.getManHinhTVSanhCho();
  }

  @Public()
  @Get('tts')
  @ApiOperation({ summary: 'Phát âm thanh giọng đọc tiếng Việt chuẩn MP3 cho màn hình TV' })
  streamTts(@Query('text') text: string, @Res() res: any) {
    return this.service.streamVietnameseTts(text, res);
  }

  @Post(':id/goi-loa')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Phát loa gọi số thứ tự bệnh nhân vào phòng khám' })
  @Quyen('tiep_nhan.goi_so', 'kham_benh.kham')
  goiSoLoa(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.goiSoLoa(id, user);
  }

  @Patch(':id/uu-tien')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Đổi đối tượng ưu tiên của lượt khám (vd. chuyển cấp cứu)' })
  @Quyen('tiep_nhan.goi_so', 'kham_benh.kham')
  capNhatUuTien(
    @Param('id', ParseIntPipe) id: number,
    @Body('doiTuongUuTien') doiTuongUuTien: string | null,
    @Body('lyDo') lyDo: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.service.capNhatUuTien(id, doiTuongUuTien, lyDo, user);
  }

  @Post(':id/qua-luot')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Gọi mà bệnh nhân vắng mặt: qua lượt, xếp cuối hàng chờ' })
  @Quyen('tiep_nhan.goi_so', 'kham_benh.kham')
  quaLuot(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.quaLuot(id, user);
  }

  @Get('hang-doi')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien')
  @ApiOperation({ summary: 'Hàng đợi bệnh nhân chờ khám hôm nay' })
  @Quyen('tiep_nhan.goi_so', 'kham_benh.kham')
  hangDoi(@Query('phongKhamId') phongKhamId?: number, @CurrentUser() user?: any) {
    return this.service.hangDoi(phongKhamId ? +phongKhamId : undefined, user);
  }

  @Get('phieu-kham-benh-nhan')
  @Roles('benh_nhan', 'tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Lấy thông tin phiếu khám và hàng đợi thời gian thực của bệnh nhân' })
  getPhieuKhamBenhNhan(@CurrentUser() user: any) {
    return this.service.getPhieuKhamBenhNhan(user);
  }

  @Post('telehealth/upload')
  @Roles('bac_si', 'benh_nhan')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // Tối đa 50MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          return cb(new BadRequestException('Chỉ chấp nhận file video'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải video gửi trong chat khám trực tuyến lên Cloudinary' })
  uploadTelehealthVideo(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadTelehealthVideo(file);
  }

  @Post()
  @Roles('tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Check-in lịch hẹn tại quầy' })
  @Quyen('benh_nhan.them')
  create(@Body() dto: TaoTiepNhanDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Post('tai-quay')
  @Roles('tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Tiếp nhận bệnh nhân đến khám trực tiếp tại quầy' })
  @Quyen('benh_nhan.them')
  createTaiQuay(@Body() dto: TiepNhanTaiQuayDto, @CurrentUser() user: any) {
    return this.service.createTaiQuay(dto, user.id);
  }

  @Post(':id/sinh-hieu')
  @Roles('tiep_tan', 'bac_si', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Ghi sinh hiệu ban đầu' })
  @Quyen('benh_nhan.them', 'tiep_nhan.goi_so', 'kham_benh.kham')
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
  @Quyen('benh_nhan.them', 'tiep_nhan.goi_so', 'kham_benh.kham')
  xemSinhHieu(@Param('id', ParseIntPipe) id: number) {
    return this.service.xemSinhHieu(id);
  }

  @Patch(':id/phong-kham')
  @Roles('tiep_tan', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Điều phối bệnh nhân vào phòng khám' })
  @Quyen('tiep_nhan.goi_so')
  dieuPhoiPhong(@Param('id', ParseIntPipe) id: number, @Body() dto: DieuPhoiPhongDto) {
    return this.service.dieuPhoiPhong(id, dto);
  }

  @Patch(':id/trang-thai')
  @Roles('tiep_tan', 'bac_si')
  @ApiOperation({ summary: 'Cập nhật trạng thái lượt tiếp nhận' })
  @Quyen('tiep_nhan.goi_so', 'kham_benh.kham')
  capNhatTrangThai(@Param('id', ParseIntPipe) id: number, @Body() dto: CapNhatTrangThaiTiepNhanDto, @CurrentUser() user: any) {
    return this.service.capNhatTrangThai(id, dto, user);
  }

  // ─── BÁO CÁO & DASHBOARD TIẾP ĐÓN ───────────────────────────
  @Get('bao-cao/thong-ke')
  @Roles('tiep_tan', 'ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Thống kê tổng quan KPI và biểu đồ lưu lượng tiếp đón' })
  @Quyen('tiep_nhan.thong_ke')
  getThongKeBaoCao(
    @Query('khoangThoiGian') khoangThoiGian?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.service.getThongKeBaoCao({ khoangThoiGian, tuNgay, denNgay });
  }

  @Get('bao-cao/danh-sach')
  @Roles('tiep_tan', 'ban_giam_doc', 'quan_tri_vien', 'quan_tri_vien_cap_cao')
  @ApiOperation({ summary: 'Danh sách chi tiết lượt tiếp đón có tìm kiếm & bộ lọc' })
  @Quyen('tiep_nhan.thong_ke')
  getDanhSachBaoCao(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('phongKhamId') phongKhamId?: number,
    @Query('trangThai') trangThai?: string,
    @Query('loaiTiepNhan') loaiTiepNhan?: string,
    @Query('khoangThoiGian') khoangThoiGian?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    return this.service.getDanhSachBaoCao({
      page,
      limit,
      search,
      phongKhamId: phongKhamId ? +phongKhamId : undefined,
      trangThai,
      loaiTiepNhan,
      khoangThoiGian,
      tuNgay,
      denNgay,
    });
  }
}
