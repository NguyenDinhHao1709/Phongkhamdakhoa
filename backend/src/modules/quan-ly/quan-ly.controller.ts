import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { QuanLyService } from './quan-ly.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Quản lý & Admin')
@Controller('quan-ly')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
// Chỉ cho phép admin và giám đốc vào các API này
@Roles('quan_tri_vien', 'quan_tri_vien_cap_cao', 'ban_giam_doc') 
export class QuanLyController {
  constructor(private readonly quanLyService: QuanLyService) {}

  @Get('nhan-vien')
  @ApiOperation({ summary: 'Lấy danh sách tất cả nhân viên y tế' })
  getDanhSachNhanVien() {
    return this.quanLyService.getDanhSachNhanVien();
  }

  @Post('nhan-vien')
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  taoNhanVien(@Body() body: any) {
    return this.quanLyService.taoNhanVienMoi(body);
  }

  @Get('nhan-vien/:id')
  @ApiOperation({ summary: 'Lấy chi tiết nhân viên' })
  getChiTiet(@Param('id') id: string) {
    return this.quanLyService.getChiTietNhanVien(+id);
  }

  @Patch('nhan-vien/:id')
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  capNhatNhanVien(@Param('id') id: string, @Body() body: any) {
    return this.quanLyService.capNhatNhanVien(+id, body);
  }

  @Delete('nhan-vien/:id')
  @ApiOperation({ summary: 'Xóa nhân viên' })
  xoaNhanVien(@Param('id') id: string) {
    return this.quanLyService.xoaNhanVien(+id);
  }

  @Patch('nhan-vien/:id/mat-khau')
  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  async datLaiMatKhau(
    @Param('id') nguoiDungId: number,
    @Body('matKhauMoi') matKhauMoi: string,
  ) {
    return this.quanLyService.datLaiMatKhau(nguoiDungId, matKhauMoi);
  }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File không hợp lệ');
    return {
      message: 'Upload thành công',
      data: `/uploads/avatars/${file.filename}`
    };
  }

  @Patch('nhan-vien/:id/trang-thai')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản nhân viên' })
  doiTrangThai(@Param('id') id: string, @Body('trangThai') trangThai: any) {
    // id here was also nguoiDungId in previous logic!
    return this.quanLyService.doiTrangThaiTaiKhoan(+id, trangThai);
  }

  @Get('phan-quyen')
  @ApiOperation({ summary: 'Lấy ma trận phân quyền (Vai trò x Quyền hạn)' })
  getPhanQuyenData() {
    return this.quanLyService.getPhanQuyenData();
  }

  @Patch('phan-quyen/:vaiTroId')
  @ApiOperation({ summary: 'Cập nhật danh sách quyền cho 1 vai trò' })
  capNhatPhanQuyen(
    @Param('vaiTroId') vaiTroId: string,
    @Body('quyenHanIds') quyenHanIds: number[]
  ) {
    return this.quanLyService.capNhatPhanQuyen(+vaiTroId, quyenHanIds);
  }
}

