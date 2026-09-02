import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';

@Entity('bac_si')
export class BacSi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nhan_vien_id', unique: true })
  nhanVienId: number;

  @Column({ name: 'chuyen_khoa', length: 100 })
  chuyenKhoa: string;

  @Column({ name: 'bang_cap', length: 100, nullable: true })
  bangCap: string;

  @Column({ name: 'so_chung_chi_hanh_nghe', length: 50, nullable: true, unique: true })
  soChungChiHanhNghe: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: NhanVien;
}

