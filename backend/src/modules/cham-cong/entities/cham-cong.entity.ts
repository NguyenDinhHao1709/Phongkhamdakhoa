import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';
import { CaLamViec } from '../../nhan-vien/entities/ca-lam-viec.entity';

@Entity('cham_cong')
export class ChamCong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nhan_vien_id' })
  nhanVienId: number;

  @Column({ name: 'ngay_cham', type: 'date' })
  ngayCham: string;

  @Column({ name: 'gio_vao', type: 'time', nullable: true })
  gioVao: string;

  @Column({ name: 'gio_ra', type: 'time', nullable: true })
  gioRa: string;

  @Column({ name: 'ca_lam_viec_id', nullable: true })
  caLamViecId: number;

  @Column({ name: 'anh_checkin', length: 500, nullable: true })
  anhCheckin: string;

  @Column({ name: 'anh_checkout', length: 500, nullable: true })
  anhCheckout: string;

  @Column({ name: 'ip_cham_cong', length: 50, nullable: true })
  ipChamCong: string;

  @Column({ name: 'do_khop', type: 'decimal', precision: 5, scale: 2, nullable: true })
  doKhop: number;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['chua_cham', 'dung_gio', 'di_muon', 've_som', 'nghi_phep'],
    default: 'chua_cham',
  })
  trangThai: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: NhanVien;

  @ManyToOne(() => CaLamViec)
  @JoinColumn({ name: 'ca_lam_viec_id' })
  caLamViec: CaLamViec;
}
