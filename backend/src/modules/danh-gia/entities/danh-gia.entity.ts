import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToOne,
} from 'typeorm';
import { LichHen } from '../../lich-hen/entities/lich-hen.entity';
import { BenhNhan } from '../../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../../nhan-vien/entities/bac-si.entity';

@Entity('danh_gia_ca_kham')
export class DanhGiaCaKham {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'lich_hen_id', nullable: true })
  lichHenId: number;

  @Column({ name: 'luot_tiep_nhan_id', nullable: true })
  luotTiepNhanId: number;

  @Column({ name: 'benh_nhan_id' })
  benhNhanId: number;

  @Column({ name: 'bac_si_id' })
  bacSiId: number;

  @Column({ name: 'diem_bac_si', type: 'tinyint', default: 5 })
  diemBacSi: number;

  @Column({ name: 'diem_cls', type: 'tinyint', nullable: true })
  diemCls: number;

  @Column({ name: 'diem_tiep_don', type: 'tinyint', default: 5 })
  diemTiepDon: number;

  @Column({ name: 'diem_trung_binh', type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  diemTrungBinh: number;

  @Column({ name: 'tieu_chi_hai_long', type: 'json', nullable: true })
  tieuChiHaiLong: string[];

  @Column({ name: 'nhan_xet', type: 'text', nullable: true })
  nhanXet: string;

  @Column({ name: 'an_danh', type: 'boolean', default: false })
  anDanh: boolean;

  @Column({ name: 'phan_hoi_giam_doc', type: 'text', nullable: true })
  phanHoiGiamDoc: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;

  @OneToOne(() => LichHen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lich_hen_id' })
  lichHen: LichHen;

  @ManyToOne(() => BenhNhan)
  @JoinColumn({ name: 'benh_nhan_id' })
  benhNhan: BenhNhan;

  @ManyToOne(() => BacSi)
  @JoinColumn({ name: 'bac_si_id' })
  bacSi: BacSi;
}

