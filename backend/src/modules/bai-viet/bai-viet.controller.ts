import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { BaiVietService } from './bai-viet.service';
import { CreateBaiVietDto, UpdateBaiVietDto, PheDuyetBaiVietDto, QueryBaiVietDto } from './dto/bai-viet.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bài Viết & Cẩm Nang Y Khoa')
@Controller('bai-viet')
export class BaiVietController {
  constructor(private readonly baiVietService: BaiVietService) {}

  // ─── PUBLIC APIS (KHÔNG CẦN ĐĂNG NHẬP) ───────────────────────
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Lấy danh sách bài viết đã xuất bản cho trang chủ' })
  getPublicBaiViets(@Query() query: QueryBaiVietDto) {
    return this.baiVietService.getPublicBaiViets(query);
  }

  @Public()
  @Get('public/:idOrSlug')
  @ApiOperation({ summary: 'Xem chi tiết bài viết công khai theo ID hoặc Slug' })
  getPublicBaiVietDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.baiVietService.getPublicBaiVietDetail(idOrSlug);
  }

  // ─── UPLOAD ẢNH BÀI VIẾT (BÁC SĨ & BAN GIÁM ĐỐC) ──────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/bai-viet';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `baiviet-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i)) {
          return cb(new BadRequestException('Chỉ chấp nhận file hình ảnh (JPG, PNG, WEBP, GIF)'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tải file ảnh bài viết y khoa lên máy chủ' })
  uploadBaiVietImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file hình ảnh hợp lệ');
    }
    const url = `/uploads/bai-viet/${file.filename}`;
    return {
      url,
      fileName: file.filename,
      size: file.size,
    };
  }

  // ─── NỘI BỘ APIS (BÁC SĨ VÀ BAN GIÁM ĐỐC) ────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Get('noi-bo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách bài viết nội bộ (Bác sĩ, Ban Giám Đốc)' })
  getNoiBoBaiViets(@CurrentUser() user: any, @Query() query: QueryBaiVietDto) {
    return this.baiVietService.getNoiBoBaiViets(user, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soạn bài viết mới (Bác sĩ, Ban Giám Đốc)' })
  createBaiViet(@Body() dto: CreateBaiVietDto, @CurrentUser() user: any) {
    return this.baiVietService.createBaiViet(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật nội dung bài viết' })
  updateBaiViet(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBaiVietDto,
    @CurrentUser() user: any,
  ) {
    return this.baiVietService.updateBaiViet(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Patch(':id/gui-duyet')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bác sĩ gửi duyệt bài viết lên Ban Giám Đốc' })
  guiDuyetBaiViet(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.baiVietService.guiDuyetBaiViet(id, user);
  }

  // ─── CHỈ BAN GIÁM ĐỐC DUYỆT & XUẤT BẢN BÀI VIẾT ─────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ban_giam_doc')
  @Patch(':id/phe-duyet')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chỉ Ban Giám Đốc phê duyệt, xuất bản hoặc trả về bài viết' })
  pheDuyetBaiViet(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PheDuyetBaiVietDto,
    @CurrentUser() user: any,
  ) {
    return this.baiVietService.pheDuyetBaiViet(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('bac_si', 'ban_giam_doc')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa hoặc tạm ẩn bài viết (Bác sĩ xóa bài mình, Ban Giám Đốc quản lý)' })
  xoaBaiViet(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.baiVietService.xoaBaiViet(id, user);
  }
}

