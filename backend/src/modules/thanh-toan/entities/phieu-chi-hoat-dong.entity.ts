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
    type: 'enum',
    enum: ['dien_nuoc', 'rac_y_te', 'van_phong_pham', 'vat_tu_tieu_hao', 'sua_chua_tb', 'tiep_khach', 'khac'],
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

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}

