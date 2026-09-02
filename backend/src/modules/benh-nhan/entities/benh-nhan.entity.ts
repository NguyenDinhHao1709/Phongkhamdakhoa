import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

@Entity('benh_nhan')
export class BenhNhan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_benh_nhan', length: 20, unique: true })
  maBenhNhan: string;

  @Column({ name: 'nguoi_dung_id', nullable: true, unique: true })
  nguoiDungId: number;

  @Column({ name: 'ho_ten', length: 100 })
  hoTen: string;

  @Column({ name: 'ngay_sinh', type: 'date', nullable: true })
  ngaySinh: string;

  @Column({
    name: 'gioi_tinh',
    type: 'enum',
    enum: ['nam', 'nu', 'khac'],
    nullable: true,
  })
  gioiTinh: string;

  @Column({ name: 'so_cmnd', length: 20, nullable: true, unique: true })
  soCmnd: string;

  @Column({ name: 'so_dien_thoai', length: 15, nullable: true })
  soDienThoai: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ name: 'dia_chi', type: 'text', nullable: true })
  diaChi: string;

  @Column({
    name: 'nhom_mau',
    type: 'enum',
    enum: ['A', 'B', 'AB', 'O'],
    nullable: true,
  })
  nhomMau: string;

  @Column({ name: 'di_ung', type: 'text', nullable: true })
  diUng: string;

  @Column({ name: 'tien_su_benh', type: 'text', nullable: true })
  tienSuBenh: string;

  @Column({ name: 'nghe_nghiep', length: 100, nullable: true })
  ngheNghiep: string;

  @Column({ name: 'nguoi_than_lien_he', length: 100, nullable: true })
  nguoiThanLienHe: string;

  @Column({ name: 'sdt_nguoi_than', length: 15, nullable: true })
  sdtNguoiThan: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'nguoi_dung_id' })
  nguoiDung: NguoiDung;
}

