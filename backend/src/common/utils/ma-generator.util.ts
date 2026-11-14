import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';

/**
 * Tạo mã tự động theo định dạng PREFIX + số thứ tự padding.
 * VD: BN000001, LH20260001, HD20260001
 */
@Injectable()
export class MaGeneratorService {
  /**
   * Tạo mã lịch hẹn: LH20260001
   */
  static generateMaLichHen(soThuTu: number): string {
    const year = new Date().getFullYear();
    return `LH${year}${String(soThuTu).padStart(4, '0')}`;
  }

  /**
   * Tạo mã lượt tiếp nhận: TN20260001
   */
  static generateMaTiepNhan(soThuTu: number): string {
    const year = new Date().getFullYear();
    return `TN${year}${String(soThuTu).padStart(4, '0')}`;
  }

  /**
   * Tạo mã hóa đơn: HD20260001
   */
  static generateMaHoaDon(soThuTu: number): string {
    const year = new Date().getFullYear();
    return `HD${year}${String(soThuTu).padStart(4, '0')}`;
  }

  /**
   * Tạo mã đơn thuốc: DT20260001
   */
  static generateMaDonThuoc(soThuTu: number): string {
    const year = new Date().getFullYear();
    return `DT${year}${String(soThuTu).padStart(4, '0')}`;
  }

  /**
   * Tạo OTP 6 số ngẫu nhiên
   */
  static generateOtp(): string {
    return String(randomInt(100000, 1000000));
  }

  /**
   * Tạo số thứ tự hàng đợi trong ngày: A001, A002...
   */
  static generateSoThuTu(soThuTu: number): string {
    return `A${String(soThuTu).padStart(3, '0')}`;
  }
}

