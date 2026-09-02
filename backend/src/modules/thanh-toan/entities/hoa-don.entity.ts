import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { BenhNhan } from '../../benh-nhan/entities/benh-nhan.entity';
import { LuotTiepNhan } from '../../tiep-nhan/entities/tiep-nhan.entity';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';
import { HoaDonChiTiet } from './hoa-don-chi-tiet.entity';

@Entity('hoa_don')
export class HoaDon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_hoa_don', length: 20, unique: true })
  maHoaDon: string;

  @Column({ name: 'benh_nhan_id' })
  benhNhanId: number;

  @ManyToOne(() => BenhNhan)
  @JoinColumn({ name: 'benh_nhan_id' })
  benhNhan: BenhNhan;

  @Column({ name: 'luot_tiep_nhan_id', nullable: true })
  luotTiepNhanId: number;

  @ManyToOne(() => LuotTiepNhan)
  @JoinColumn({ name: 'luot_tiep_nhan_id' })
  luotTiepNhan: LuotTiepNhan;

  @Column({ name: 'thu_ngan_id', nullable: true })
  thuNganId: number;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'thu_ngan_id' })
  thuNgan: NhanVien;

  @Column({ name: 'tong_tien', type: 'decimal', precision: 14, scale: 2, default: 0 })
  tongTien: number;

  @Column({ name: 'so_tien_giam', type: 'decimal', precision: 14, scale: 2, default: 0 })
  soTienGiam: number;

  @Column({ name: 'thuc_thu', type: 'decimal', precision: 14, scale: 2, default: 0 })
  thucThu: number;

  @Column({ name: 'phuong_thuc_thanh_toan', nullable: true })
  phuongThucThanhToan: string;

  @Column({ name: 'trang_thai', default: 'cho_thanh_toan' })
  trangThai: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @Column({ name: 'ngay_thanh_toan', type: 'datetime', nullable: true })
  ngayThanhToan: Date;

  @OneToMany(() => HoaDonChiTiet, (ct) => ct.hoaDon, { cascade: true })
  chiTiet: HoaDonChiTiet[];
}
