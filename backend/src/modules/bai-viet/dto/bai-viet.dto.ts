import { IsNotEmpty, IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { TrangThaiBaiViet } from '../entities/bai-viet.entity';

export class CreateBaiVietDto {
  @IsNotEmpty({ message: 'Tiêu đề bài viết không được để trống' })
  @IsString()
  @MaxLength(255)
  tieuDe: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tomTat?: string;

  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  anhDaiDien?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  chuyenKhoa?: string;

  @IsOptional()
  @IsEnum(TrangThaiBaiViet)
  trangThai?: TrangThaiBaiViet;
}

export class UpdateBaiVietDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tieuDe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tomTat?: string;

  @IsOptional()
  @IsString()
  noiDung?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  anhDaiDien?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  chuyenKhoa?: string;

  @IsOptional()
  @IsEnum(TrangThaiBaiViet)
  trangThai?: TrangThaiBaiViet;
}

export class PheDuyetBaiVietDto {
  @IsNotEmpty({ message: 'Vui lòng chọn trạng thái phê duyệt' })
  @IsEnum([TrangThaiBaiViet.XUAT_BAN, TrangThaiBaiViet.TU_CHOI, TrangThaiBaiViet.AN])
  trangThai: TrangThaiBaiViet;

  @IsOptional()
  @IsString()
  lyDoTuChoi?: string;
}

export class QueryBaiVietDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  chuyenKhoa?: string;

  @IsOptional()
  @IsString()
  trangThai?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

