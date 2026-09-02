import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Trợ lý AI & Khai báo triệu chứng')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('goi-y-chuyen-khoa')
  @ApiOperation({ summary: 'Khai báo triệu chứng & Nhận gợi ý chuyên khoa (Public)' })
  goiYChuyenKhoa(@Body() body: { trieuChung: string }) {
    return this.aiService.goiYChuyenKhoa(body.trieuChung);
  }
}

