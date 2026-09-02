import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
  IsEmail, MaxLength, IsInt, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class TaoBenhNhanDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100)
  hoTen: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  ngaySinh?: string;

  @ApiPropertyOptional({ enum: ['nam', 'nu', 'khac'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(['nam', 'nu', 'khac'])
  gioiTinh?: string;

  @ApiPropertyOptional({ example: '012345678901' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(20)
  soCmnd?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(15)
  soDienThoai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diaChi?: string;

  @ApiPropertyOptional({ enum: ['A', 'B', 'AB', 'O'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(['A', 'B', 'AB', 'O'])
  nhomMau?: string;

  @ApiPropertyOptional({ example: 'Penicillin' })
  @IsOptional()
  @IsString()
  diUng?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tienSuBenh?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ngheNghiep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nguoiThanLienHe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sdtNguoiThan?: string;
}

export class CapNhatBenhNhanDto extends PartialType(TaoBenhNhanDto) {}

export class TimKiemBenhNhanDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên, mã BN, CMND, SĐT' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Từ ngày đăng ký (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  tuNgay?: string;

  @ApiPropertyOptional({ description: 'Đến ngày đăng ký (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  denNgay?: string;

  @ApiPropertyOptional({ enum: ['nam', 'nu', 'khac'] })
  @IsOptional()
  @IsString()
  gioiTinh?: string;

  @ApiPropertyOptional({ enum: ['nhi', 'truong_thanh', 'cao_tuoi'] })
  @IsOptional()
  @IsString()
  doTuoi?: string;

  @ApiPropertyOptional({ description: 'Lọc bệnh nhân có tiền sử dị ứng' })
  @IsOptional()
  @IsString()
  coDiUng?: string;

  @ApiPropertyOptional({ description: 'Lọc bệnh nhân chưa hoàn thiện hồ sơ' })
  @IsOptional()
  @IsString()
  chuaHoanThien?: string;

  @ApiPropertyOptional({ description: 'Lọc bệnh nhân mới đăng ký hôm nay' })
  @IsOptional()
  @IsString()
  moiDangKyHomNay?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

