import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

@Entity('nhan_vien')
export class NhanVien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nguoi_dung_id', unique: true })
  nguoiDungId: number;

  @Column({ name: 'ho_ten', length: 100 })
  hoTen: string;

  @Column({ name: 'ngay_sinh', type: 'date', nullable: true })
  ngaySinh: string;

  @Column({ name: 'gioi_tinh', type: 'enum', enum: ['nam', 'nu', 'khac'], nullable: true })
  gioiTinh: string;

  @Column({ name: 'so_cmnd', length: 20, nullable: true, unique: true })
  soCmnd: string;

  @Column({ name: 'so_dien_thoai', length: 15, nullable: true })
  soDienThoai: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ name: 'dia_chi', type: 'text', nullable: true })
  diaChi: string;

  @Column({ name: 'chuc_vu', length: 100, nullable: true })
  chucVu: string;

  @Column({ name: 'phong_ban_id', nullable: true })
  phongBanId: number;

  @Column({ name: 'ngay_vao_lam', type: 'date', nullable: true })
  ngayVaoLam: string;

  @Column({ name: 'anh_dai_dien', length: 500, nullable: true })
  anhDaiDien: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'nguoi_dung_id' })
  nguoiDung: NguoiDung;
}

