import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, Min, Max, IsOptional, IsString, IsBoolean, IsArray,
} from 'class-validator';

export class TaoDanhGiaDto {
  @ApiPropertyOptional({ description: 'ID Lịch hẹn cần đánh giá' })
  @IsOptional()
  @IsInt()
  lichHenId?: number;

  @ApiPropertyOptional({ description: 'ID Lượt tiếp nhận cần đánh giá' })
  @IsOptional()
  @IsInt()
  luotTiepNhanId?: number;

  @ApiProperty({ description: 'Điểm đánh giá Bác sĩ khám (1-5 sao)', default: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  diemBacSi: number;

  @ApiPropertyOptional({ description: 'Điểm đánh giá dịch vụ CLS/Xét nghiệm (1-5 sao)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  diemCls?: number;

  @ApiProperty({ description: 'Điểm đánh giá Tiếp đón & CSVC (1-5 sao)', default: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  diemTiepDon: number;

  @ApiPropertyOptional({ description: 'Các tiêu chí hài lòng nhanh', type: [String] })
  @IsOptional()
  @IsArray()
  tieuChiHaiLong?: string[];

  @ApiPropertyOptional({ description: 'Ý kiến nhận xét / lời nhắn đóng góp' })
  @IsOptional()
  @IsString()
  nhanXet?: string;

  @ApiPropertyOptional({ description: 'Đánh giá ẩn danh (không hiện tên bệnh nhân)', default: false })
  @IsOptional()
  @IsBoolean()
  anDanh?: boolean;
}

export class PhanHoiGiamDocDto {
  @ApiProperty({ description: 'Nội dung phản hồi / chỉ đạo của Giám Đốc' })
  @IsString()
  phanHoiGiamDoc: string;
}

