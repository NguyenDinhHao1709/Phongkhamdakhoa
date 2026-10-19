import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('yeu_cau_nhap_kho')
export class YeuCauNhapKho {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_yeu_cau', length: 30, unique: true })
  maYeuCau: string;

  @Column({ name: 'nguoi_lap_id' })
  nguoiLapId: number;

  @Column({ name: 'trang_thai', length: 40, default: 'cho_duyet' })
  trangThai: string;

  @Column({ name: 'tong_du_toan', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongDuToan: number;

  @Column({ name: 'tong_thuc_te', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongThucTe: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @Column({ name: 'ly_do_tu_choi', type: 'text', nullable: true })
  lyDoTuChoi: string;

  @Column({ name: 'nguoi_duyet_id', nullable: true })
  nguoiDuyetId: number;

  @Column({ name: 'ngay_duyet', type: 'datetime', nullable: true })
  ngayDuyet: Date;

  @Column({ name: 'nguoi_chi_tra_id', nullable: true })
  nguoiChiTraId: number;

  @Column({ name: 'ngay_chi_tra', type: 'datetime', nullable: true })
  ngayChiTra: Date;

  @Column({ name: 'trang_thai_chi_tra', length: 30, default: 'chua_chi' })
  trangThaiChiTra: string;

  @Column({ name: 'so_tien_chi_tra', type: 'decimal', precision: 14, scale: 2, default: 0 })
  soTienChiTra: number;

  @Column({ name: 'phuong_thuc_chi', length: 30, nullable: true })
  phuongThucChi: string;

  @Column({ name: 'so_chung_tu_chi', length: 50, nullable: true })
  soChungTuChi: string;

  @Column({ name: 'so_hoa_don_ncc', length: 100, nullable: true })
  soHoaDonNcc: string;

  @Column({ name: 'ngay_hoa_don_ncc', type: 'date', nullable: true })
  ngayHoaDonNcc: Date;

  @Column({ name: 'bien_ban_tra_hang', type: 'text', nullable: true })
  bienBanTraHang: string;

  @Column({ name: 'ket_qua_kiem_nhan', length: 40, nullable: true })
  ketQuaKiemNhan: string;

  @Column({ name: 'nguoi_kiem_nhan_id', nullable: true })
  nguoiKiemNhanId: number;

  @Column({ name: 'ngay_kiem_nhan', type: 'datetime', nullable: true })
  ngayKiemNhan: Date;

  @Column({ name: 'ghi_chu_chi', type: 'text', nullable: true })
  ghiChuChi: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}
