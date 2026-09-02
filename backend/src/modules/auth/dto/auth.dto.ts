import { IsString, IsNotEmpty, MinLength, IsPhoneNumber, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenDangNhap: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  matKhau: string;
}

export class SendOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  maOtp: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ─── DTO ĐĂNG KÝ BỆNH NHÂN ────────────────────────────────
export class RegisterPatientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  tenDangNhap: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  matKhau: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  hoTen: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  soDienThoai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gioiTinh?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ngaySinh?: string;
}
