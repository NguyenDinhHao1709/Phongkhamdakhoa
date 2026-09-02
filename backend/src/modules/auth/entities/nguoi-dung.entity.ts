import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { VaiTro } from './vai-tro.entity';

export enum TrangThaiNguoiDung {
  HOAT_DONG = 'hoat_dong',
  KHOA = 'khoa',
  CHO_XAC_THUC = 'cho_xac_thuc',
}

export enum LoaiTaiKhoan {
  NOI_BO = 'noi_bo',
  BENH_NHAN = 'benh_nhan',
}

@Entity('nguoi_dung')
export class NguoiDung {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ten_dang_nhap', length: 100, unique: true })
  tenDangNhap: string;

  @Column({ name: 'mat_khau_hash', length: 255 })
  matKhauHash: string;

  @Column({ name: 'vai_tro_id' })
  vaiTroId: number;

  @Column({
    name: 'loai_tai_khoan',
    type: 'enum',
    enum: LoaiTaiKhoan,
    default: LoaiTaiKhoan.NOI_BO,
  })
  loaiTaiKhoan: LoaiTaiKhoan;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiNguoiDung,
    default: TrangThaiNguoiDung.CHO_XAC_THUC,
  })
  trangThai: TrangThaiNguoiDung;

  @Column({ name: 'email_da_xac_thuc', type: 'tinyint', default: 0 })
  emailDaXacThuc: boolean;

  @Column({ name: 'lan_dang_nhap_cuoi', type: 'datetime', nullable: true })
  lanDangNhapCuoi: Date;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;

  // Relations
  @ManyToOne(() => VaiTro, (vt) => vt.nguoiDungs)
  @JoinColumn({ name: 'vai_tro_id' })
  vaiTro: VaiTro;
}

