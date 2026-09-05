import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NhanVien } from './nhan-vien.entity';
import { CaLamViec } from './ca-lam-viec.entity';

@Entity('lich_lam_viec')
export class LichLamViec {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nhan_vien_id' })
  nhanVienId: number;

  @Column({ name: 'ca_lam_viec_id' })
  caLamViecId: number;

  @Column({ name: 'ngay_lam', type: 'date' })
  ngayLam: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: NhanVien;

  @ManyToOne(() => CaLamViec)
  @JoinColumn({ name: 'ca_lam_viec_id' })
  caLamViec: CaLamViec;
}

