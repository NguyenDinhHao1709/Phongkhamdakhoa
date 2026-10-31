import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';

@Entity('phieu_chi_hoat_dong')
export class PhieuChiHoatDong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_phieu_chi', unique: true, length: 30 })
  maPhieuChi: string;

  @Column({
    name: 'loai_chi',
    length: 50,
    default: 'khac',
  })
  loaiChi: string;

  @Column({ name: 'khoan_chi', length: 255 })
  khoanChi: string;

  @Column({ name: 'nguoi_nhan', length: 150 })
  nguoiNhan: string;

  @Column({ name: 'so_tien', type: 'decimal', precision: 14, scale: 2, default: 0 })
  soTien: number;

  @Column({
    name: 'phuong_thuc_chi',
    type: 'enum',
    enum: ['tien_mat', 'chuyen_khoan', 'the'],
    default: 'tien_mat',
  })
  phuongThucChi: string;

  @Column({ name: 'ngay_chi', type: 'datetime' })
  ngayChi: Date;

  @Column({ name: 'nguoi_lap_id', nullable: true })
  nguoiLapId: number;

  @ManyToOne(() => NhanVien, { nullable: true })
  @JoinColumn({ name: 'nguoi_lap_id' })
  nguoiLap: NhanVien;

  @Column({ name: 'chung_tu_goc', nullable: true, length: 150 })
  chungTuGoc: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @Column({ name: 'trang_thai', length: 30, default: 'cho_duyet' })
  trangThai: string;

  @Column({ name: 'nguoi_duyet_id', nullable: true })
  nguoiDuyetId: number;

  @ManyToOne(() => NhanVien, { nullable: true })
  @JoinColumn({ name: 'nguoi_duyet_id' })
  nguoiDuyet: NhanVien;

  @Column({ name: 'ngay_duyet', type: 'datetime', nullable: true })
  ngayDuyet: Date;

  @Column({ name: 'ly_do_tu_choi', type: 'text', nullable: true })
  lyDoTuChoi: string;

  @Column({ name: 'nguoi_chi_id', nullable: true })
  nguoiChiId: number;

  @ManyToOne(() => NhanVien, { nullable: true })
  @JoinColumn({ name: 'nguoi_chi_id' })
  nguoiChi: NhanVien;

  @Column({ name: 'ngay_xuat_quy', type: 'datetime', nullable: true })
  ngayXuatQuy: Date;

  @Column({ name: 'ly_do_huy', type: 'text', nullable: true })
  lyDoHuy: string;

  @Column({ name: 'nguoi_yeu_cau_huy_id', nullable: true })
  nguoiYeuCauHuyId: number;

  @Column({ name: 'ngay_yeu_cau_huy', type: 'datetime', nullable: true })
  ngayYeuCauHuy: Date;

  @Column({ name: 'nguoi_duyet_huy_id', nullable: true })
  nguoiDuyetHuyId: number;

  @Column({ name: 'ngay_duyet_huy', type: 'datetime', nullable: true })
  ngayDuyetHuy: Date;

  @Column({ name: 'nguoi_hoan_quy_id', nullable: true })
  nguoiHoanQuyId: number;

  @Column({ name: 'ngay_hoan_quy', type: 'datetime', nullable: true })
  ngayHoanQuy: Date;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}
