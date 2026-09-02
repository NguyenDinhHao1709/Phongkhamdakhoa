import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { DonThuoc } from './don-thuoc.entity';
import { Thuoc } from './thuoc.entity';
import { LoThuoc } from './lo-thuoc.entity';

@Entity('don_thuoc_chi_tiet')
export class DonThuocChiTiet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'don_thuoc_id' })
  donThuocId: number;

  @ManyToOne(() => DonThuoc, (dt) => dt.chiTiet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'don_thuoc_id' })
  donThuoc: DonThuoc;

  @Column({ name: 'thuoc_id' })
  thuocId: number;

  @ManyToOne(() => Thuoc)
  @JoinColumn({ name: 'thuoc_id' })
  thuoc: Thuoc;

  @Column({ name: 'lo_thuoc_id', nullable: true })
  loThuocId: number;

  @ManyToOne(() => LoThuoc)
  @JoinColumn({ name: 'lo_thuoc_id' })
  loThuoc: LoThuoc;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'lieu_dung', length: 200, nullable: true })
  lieuDung: string;

  @Column({ name: 'so_ngay_dung', nullable: true })
  soNgayDung: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;
}

