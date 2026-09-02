import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { BenhNhan } from '../../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';

export enum TrangThaiLichHen {
  CHO_THANH_TOAN = 'cho_thanh_toan',
  CHO_XAC_NHAN   = 'cho_xac_nhan',
  DA_XAC_NHAN    = 'da_xac_nhan',
  DA_HUY         = 'da_huy',
  HOAN_THANH     = 'hoan_thanh',
  VANG_MAT       = 'vang_mat',
}

@Entity('lich_hen')
export class LichHen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_lich_hen', length: 20, unique: true })
  maLichHen: string;

  @Column({ name: 'benh_nhan_id' })
  benhNhanId: number;

  @Column({ name: 'bac_si_id', nullable: true })
  bacSiId: number;

  @Column({ name: 'phong_kham_id', nullable: true })
  phongKhamId: number;

  @Column({ name: 'ngay_hen', type: 'date' })
  ngayHen: string;

  @Column({ name: 'gio_hen', type: 'time' })
  gioHen: string;

  @Column({ name: 'hinh_thuc', type: 'enum', enum: ['truc_tiep', 'truc_tuyen'], default: 'truc_tiep' })
  hinhThuc: string;

  @Column({ name: 'ly_do_kham', type: 'text', nullable: true })
  lyDoKham: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiLichHen,
    default: TrangThaiLichHen.CHO_XAC_NHAN,
  })
  trangThai: TrangThaiLichHen;

  @Column({ name: 'nguon_dat', type: 'enum', enum: ['benh_nhan_tu_dat', 'tiep_tan_dat', 'bac_si_dat'], nullable: true })
  nguonDat: string;

  @Column({ name: 'dat_boi_nhan_vien_id', nullable: true })
  datBoiNhanVienId: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @Column({ name: 'phien_ban', type: 'int', default: 0 })
  phienBan: number;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @Column({ name: 'cap_nhat_luc', type: 'datetime', nullable: true })
  capNhatLuc: Date;

  // Relations
  @ManyToOne(() => BenhNhan)
  @JoinColumn({ name: 'benh_nhan_id' })
  benhNhan: BenhNhan;

  @ManyToOne(() => BacSi)
  @JoinColumn({ name: 'bac_si_id' })
  bacSi: BacSi;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'dat_boi_nhan_vien_id' })
  datBoiNhanVien: NhanVien;
}

