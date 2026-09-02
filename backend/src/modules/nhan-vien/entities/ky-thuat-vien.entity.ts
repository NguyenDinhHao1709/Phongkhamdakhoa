import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToOne, JoinColumn
} from 'typeorm';
import { NhanVien } from './nhan-vien.entity';

@Entity('ky_thuat_vien')
export class KyThuatVien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nhan_vien_id', unique: true })
  nhanVienId: number;

  @Column({ name: 'chuyen_mon', length: 100, nullable: true })
  chuyenMon: string;

  @OneToOne(() => NhanVien)
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: NhanVien;
}

