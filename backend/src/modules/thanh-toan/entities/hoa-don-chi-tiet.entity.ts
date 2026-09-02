import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { HoaDon } from './hoa-don.entity';

@Entity('hoa_don_chi_tiet')
export class HoaDonChiTiet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'hoa_don_id' })
  hoaDonId: number;

  @ManyToOne(() => HoaDon, (hd) => hd.chiTiet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hoa_don_id' })
  hoaDon: HoaDon;

  @Column({ name: 'loai_phi' })
  loaiPhi: string; // kham_benh, xet_nghiem, thuoc, cdha, tam_ung, khac

  @Column({ name: 'mo_ta', length: 200, nullable: true })
  moTa: string;

  @Column({ name: 'so_luong', default: 1 })
  soLuong: number;

  @Column({ name: 'don_gia', type: 'decimal', precision: 12, scale: 2 })
  donGia: number;

  @Column({ name: 'thanh_tien', type: 'decimal', precision: 12, scale: 2 })
  thanhTien: number;
}

