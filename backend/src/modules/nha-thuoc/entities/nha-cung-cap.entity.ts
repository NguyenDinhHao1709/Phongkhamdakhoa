import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nha_cung_cap')
export class NhaCungCap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_nha_cung_cap', length: 30, unique: true })
  maNhaCungCap: string;

  @Column({ name: 'ten_nha_cung_cap', length: 200 })
  tenNhaCungCap: string;

  @Column({ name: 'ma_so_thue', length: 30, nullable: true })
  maSoThue: string;

  @Column({ name: 'nguoi_lien_he', length: 120, nullable: true })
  nguoiLienHe: string;

  @Column({ name: 'so_dien_thoai', length: 30, nullable: true })
  soDienThoai: string;

  @Column({ name: 'email', length: 120, nullable: true })
  email: string;

  @Column({ name: 'dia_chi', length: 300, nullable: true })
  diaChi: string;

  @Column({ name: 'dieu_khoan_thanh_toan', length: 200, nullable: true })
  dieuKhoanThanhToan: string;

  @Column({ name: 'trang_thai', length: 30, default: 'dang_hop_tac' })
  trangThai: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}
