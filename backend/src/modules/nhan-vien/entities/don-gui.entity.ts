import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NhanVien } from './nhan-vien.entity';

export enum TrangThaiDonGui {
  CHO_XU_LY = 'cho_xu_ly',
  DA_XU_LY = 'da_xu_ly',
  TU_CHOI = 'tu_choi',
  DA_HUY = 'da_huy',
}

@Entity('don_gui')
export class DonGui {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nguoi_gui_id' })
  nguoiGuiId: number;

  @Column({ name: 'loai_don', length: 100 })
  loaiDon: string;

  @Column({ name: 'noi_dung', type: 'text' })
  noiDung: string;

  @Column({ name: 'file_dinh_kem', length: 500, nullable: true })
  fileDinhKem: string;

  @CreateDateColumn({ name: 'ngay_gui' })
  ngayGui: Date;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiDonGui,
    default: TrangThaiDonGui.CHO_XU_LY,
  })
  trangThai: TrangThaiDonGui;

  @Column({ name: 'ghi_chu_xu_ly', type: 'text', nullable: true })
  ghiChuXuLy: string;

  @Column({ name: 'ngay_xu_ly', type: 'datetime', nullable: true })
  ngayXuLy: Date;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'nguoi_gui_id' })
  nguoiGui: NhanVien;
}
