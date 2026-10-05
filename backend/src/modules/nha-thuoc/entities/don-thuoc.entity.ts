import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { BacSi } from '../../nhan-vien/entities/bac-si.entity';
import { DonThuocChiTiet } from './don-thuoc-chi-tiet.entity';

@Entity('don_thuoc')
export class DonThuoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_don_thuoc', length: 20, unique: true })
  maDonThuoc: string;

  @Column({ name: 'benh_an_kham_id' })
  benhAnKhamId: number;

  @Column({ name: 'bac_si_ke_id' })
  bacSiKeId: number;

  @ManyToOne(() => BacSi)
  @JoinColumn({ name: 'bac_si_ke_id' })
  bacSiKe: BacSi;

  @CreateDateColumn({ name: 'ngay_ke' })
  ngayKe: Date;

  @Column({ name: 'trang_thai', default: 'cho_duyet' })
  trangThai: string;

  @Column({ name: 'lua_chon_mua', length: 30, default: 'chua_chon' })
  luaChonMua: string;

  @Column({ name: 'ma_phieu_nhan_thuoc', length: 30, nullable: true })
  maPhieuNhanThuoc: string;

  @Column({ name: 'ngay_cap_phat', nullable: true })
  ngayCapPhat: Date;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @OneToMany(() => DonThuocChiTiet, (ct) => ct.donThuoc, { cascade: true })
  chiTiet: DonThuocChiTiet[];
}
