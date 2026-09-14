import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum LoaiNhatKy {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

@Entity('nhat_ky_he_thong')
export class NhatKyHeThong {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'nguoi_dung_id', type: 'int', nullable: true })
  nguoiDungId: number;

  @Column({ name: 'ten_nguoi_dung', length: 100 })
  tenNguoiDung: string;

  @Column({ name: 'vai_tro', length: 50 })
  vaiTro: string;

  @Index()
  @Column({ name: 'hanh_dong', length: 100 })
  hanhDong: string;

  @Index()
  @Column({
    name: 'loai_nhat_ky',
    length: 20,
    default: LoaiNhatKy.INFO,
  })
  loaiNhatKy: LoaiNhatKy;

  @Column({ name: 'mo_ta', type: 'text' })
  moTa: string;

  @Column({ name: 'dia_chi_ip', length: 50, nullable: true, default: '127.0.0.1' })
  diaChiIp: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string;

  @Index()
  @CreateDateColumn({ name: 'thoi_gian' })
  thoiGian: Date;
}

