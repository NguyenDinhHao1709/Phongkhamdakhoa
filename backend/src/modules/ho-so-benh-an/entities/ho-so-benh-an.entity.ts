import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, OneToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BenhNhan } from '../../benh-nhan/entities/benh-nhan.entity';

export enum TrangThaiHoSo {
  HOAT_DONG = 'hoat_dong',
  LUU_TRU   = 'luu_tru',
}

@Entity('ho_so_benh_an')
export class HoSoBenhAn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_ho_so', length: 20, unique: true })
  maHoSo: string;

  @Column({ name: 'benh_nhan_id', unique: true })
  benhNhanId: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiHoSo,
    default: TrangThaiHoSo.HOAT_DONG,
  })
  trangThai: TrangThaiHoSo;

  @Column({ name: 'ghi_chu_tong_quat', type: 'text', nullable: true })
  ghiChuTongQuat: string;

  // Relations
  @OneToOne(() => BenhNhan)
  @JoinColumn({ name: 'benh_nhan_id' })
  benhNhan: BenhNhan;

  @OneToMany(() => BenhAnKham, (bak) => bak.hoSoBenhAn)
  dsBenhAnKham: BenhAnKham[];
}

// ──────────────────────────────────────────────

export enum TrangThaiBenhAnKham {
  DANG_KHAM     = 'dang_kham',
  DA_HOAN_THANH = 'da_hoan_thanh',
}

@Entity('benh_an_kham')
export class BenhAnKham {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ho_so_benh_an_id' })
  hoSoBenhAnId: number;

  @Column({ name: 'luot_tiep_nhan_id' })
  luotTiepNhanId: number;

  @Column({ name: 'bac_si_id' })
  bacSiId: number;

  @CreateDateColumn({ name: 'ngay_kham' })
  ngayKham: Date;

  @Column({ name: 'trieu_chung', type: 'text', nullable: true })
  trieuChung: string;

  @Column({ name: 'chan_doan_so_bo', type: 'text', nullable: true })
  chanDoanSoBo: string;

  @Column({ name: 'chan_doan_xac_dinh', type: 'text', nullable: true })
  chanDoanXacDinh: string;

  @Column({ name: 'ket_qua_kham', type: 'text', nullable: true })
  ketQuaKham: string;

  @Column({ name: 'phuong_phap_dieu_tri', type: 'text', nullable: true })
  phuongPhapDieuTri: string;

  @Column({ name: 'tai_kham', type: 'date', nullable: true })
  taiKham: string;

  @Column({
    name: 'hinh_thuc_kham',
    type: 'enum',
    enum: ['truc_tiep', 'truc_tuyen'],
    nullable: true,
  })
  hinhThucKham: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiBenhAnKham,
    default: TrangThaiBenhAnKham.DANG_KHAM,
  })
  trangThai: TrangThaiBenhAnKham;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  // Relations
  @ManyToOne(() => HoSoBenhAn, (hsba) => hsba.dsBenhAnKham)
  @JoinColumn({ name: 'ho_so_benh_an_id' })
  hoSoBenhAn: HoSoBenhAn;
}

