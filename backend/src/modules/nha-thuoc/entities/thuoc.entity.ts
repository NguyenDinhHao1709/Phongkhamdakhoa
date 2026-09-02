import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
} from 'typeorm';
import { LoThuoc } from './lo-thuoc.entity';

@Entity('thuoc')
export class Thuoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_thuoc', length: 20, unique: true })
  maThuoc: string;

  @Column({ name: 'ten_thuoc', length: 200 })
  tenThuoc: string;

  @Column({ name: 'ten_hoat_chat', length: 200, nullable: true })
  tenHoatChat: string;

  @Column({ name: 'loai_thuoc_id', nullable: true })
  loaiThuocId: number;

  @Column({ name: 'don_vi_tinh', length: 30 })
  donViTinh: string;

  @Column({ name: 'ham_luong', length: 50, nullable: true })
  hamLuong: string;

  @Column({ name: 'duong_dung', length: 100, nullable: true })
  duongDung: string;

  @Column({ name: 'gia_ban', type: 'decimal', precision: 12, scale: 2, default: 0 })
  giaBan: number;

  @Column({ name: 'ton_kho_tong', default: 0 })
  tonKhoTong: number;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;

  @Column({ name: 'trang_thai', default: 'con_hang' })
  trangThai: string;

  @OneToMany(() => LoThuoc, (lo) => lo.thuoc)
  loThuocList: LoThuoc[];
}

