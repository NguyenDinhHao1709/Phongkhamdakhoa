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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenDangNhap?: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  gioiTinh: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  ngaySinh: string;
}

// ─── DTO ĐỔI MẬT KHẨU ────────────────────────────────────
export class DoiMatKhauDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  matKhauHienTai: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  matKhauMoi: string;
}

// ─── DTO QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU VIA OTP ─────────
export class QuenMatKhauSendOtpDto {
  @ApiProperty({ example: 'nguyenvanA@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class DatLaiMatKhauDto {
  @ApiProperty({ example: 'nguyenvanA@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  maOtp: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  matKhauMoi: string;
}
