import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';

@Entity('chot_ca_thu_ngan')
export class ChotCaThuNgan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_chot_ca', unique: true, length: 30 })
  maChotCa: string;

  @Column({ name: 'thu_ngan_id' })
  thuNganId: number;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'thu_ngan_id' })
  thuNgan: NhanVien;

  @Column({ name: 'nguoi_nhan_ca_id', nullable: true })
  nguoiNhanCaId: number;

  @ManyToOne(() => NhanVien, { nullable: true })
  @JoinColumn({ name: 'nguoi_nhan_ca_id' })
  nguoiNhanCa: NhanVien;

  @Column({ name: 'thoi_gian_bat_dau', type: 'datetime' })
  thoiGianBatDau: Date;

  @Column({ name: 'thoi_gian_ket_thuc', type: 'datetime' })
  thoiGianKetThuc: Date;

  @Column({ name: 'tien_mat_he_thong', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tienMatHeThong: number;

  @Column({ name: 'tien_mat_thuc_te', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tienMatThucTe: number;

  @Column({ name: 'chenh_lech', type: 'decimal', precision: 14, scale: 2, default: 0 })
  chenhLech: number;

  @Column({ name: 'chi_tiet_menh_gia', type: 'json', nullable: true })
  chiTietMenhGia: any;

  @Column({ name: 'tong_thu_chuyen_khoan', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongThuChuyenKhoan: number;

  @Column({ name: 'tong_chi_tien_mat', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongChiTienMat: number;

  @Column({ name: 'tong_thuc_thu', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongThucThu: number;

  @Column({ name: 'tong_thuc_chi', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongThucChi: number;

  @Column({ name: 'so_luong_phieu_thu', default: 0 })
  soLuongPhieuThu: number;

  @Column({ name: 'so_luong_phieu_chi', default: 0 })
  soLuongPhieuChi: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['da_chot', 'da_ban_giao', 'da_nhan_ca'],
    default: 'da_chot',
  })
  trangThai: string;

  @Column({ name: 'thoi_gian_nhan_ca', type: 'datetime', nullable: true })
  thoiGianNhanCa: Date;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}

