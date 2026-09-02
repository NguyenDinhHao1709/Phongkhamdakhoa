import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Thuoc } from './thuoc.entity';

@Entity('lo_thuoc')
export class LoThuoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'thuoc_id' })
  thuocId: number;

  @ManyToOne(() => Thuoc, (t) => t.loThuocList)
  @JoinColumn({ name: 'thuoc_id' })
  thuoc: Thuoc;

  @Column({ name: 'ma_lo', length: 50 })
  maLo: string;

  @Column({ name: 'ngay_san_xuat', type: 'date', nullable: true })
  ngaySanXuat: Date;

  @Column({ name: 'ngay_het_han', type: 'date' })
  ngayHetHan: Date;

  @Column({ name: 'so_luong_nhap' })
  soLuongNhap: number;

  @Column({ name: 'so_luong_ton', default: 0 })
  soLuongTon: number;

  @Column({ name: 'gia_nhap', type: 'decimal', precision: 12, scale: 2, nullable: true })
  giaNhap: number;

  @Column({ name: 'nha_cung_cap', length: 200, nullable: true })
  nhaCungCap: string;

  @Column({ name: 'trang_thai', default: 'con_hang' })
  trangThai: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}

