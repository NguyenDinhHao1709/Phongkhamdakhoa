import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsInt, IsPositive, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class TaoLichHenDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  benhNhanId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hoTen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  soDienThoai?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  bacSiId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  phongKhamId?: number;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  ngayHen: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  gioHen: string;

  @ApiPropertyOptional({ enum: ['truc_tiep', 'truc_tuyen'], default: 'truc_tiep' })
  @IsOptional()
  @IsEnum(['truc_tiep', 'truc_tuyen'])
  hinhThuc?: string = 'truc_tiep';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lyDoKham?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ghiChu?: string;
}

export class CapNhatTrangThaiLichHenDto {
  @ApiProperty({ enum: ['cho_xac_nhan', 'da_xac_nhan', 'da_huy', 'hoan_thanh', 'vang_mat'] })
  @IsEnum(['cho_xac_nhan', 'da_xac_nhan', 'da_huy', 'hoan_thanh', 'vang_mat'])
  trangThai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ghiChu?: string;

  @ApiProperty({ description: 'Optimistic lock version — lấy từ GET trước khi UPDATE' })
  @IsInt()
  @Min(0)
  phienBan: number;
}

export class TimKiemLichHenDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  ngay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  bacSiId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trangThai?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  limit?: number = 20;
}

export class LaySlotTrongDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  bacSiId: number;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  ngay: string;
}

