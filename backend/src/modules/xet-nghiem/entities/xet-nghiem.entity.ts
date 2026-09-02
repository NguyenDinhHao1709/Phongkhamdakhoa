import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

// ─── DANH MỤC DỊCH VỤ XÉT NGHIỆM ──────────────────────────
@Entity('dich_vu_xet_nghiem')
export class DichVuXetNghiem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_dich_vu', length: 20, unique: true })
  maDichVu: string;

  @Column({ name: 'ten_dich_vu', length: 200 })
  tenDichVu: string;

  @Column({ type: 'enum', enum: ['xet_nghiem', 'cdha', 'khac'], default: 'xet_nghiem' })
  loai: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gia: number;

  @Column({ name: 'don_vi_ket_qua', length: 50, nullable: true })
  donViKetQua: string;

  @Column({ name: 'gia_tri_binh_thuong', length: 200, nullable: true })
  giaTriBinhThuong: string;

  @Column({ type: 'text', nullable: true })
  moTa: string;

  @Column({ name: 'trang_thai', type: 'enum', enum: ['hoat_dong', 'ngung'], default: 'hoat_dong' })
  trangThai: string;
}

// ─── CHỈ ĐỊNH CẬN LÂM SÀNG ─────────────────────────────────
export enum TrangThaiChiDinh {
  CHO_LAY_MAU  = 'cho_lay_mau',
  DANG_LAY_MAU = 'dang_lay_mau',
  DANG_XU_LY   = 'dang_xu_ly',
  CO_KET_QUA   = 'co_ket_qua',
  HUY          = 'huy',
}

@Entity('chi_dinh_can_lam_sang')
export class ChiDinhCanLamSang {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'benh_an_kham_id' })
  benhAnKhamId: number;

  @Column({ name: 'dich_vu_xet_nghiem_id' })
  dichVuXetNghiemId: number;

  @Column({ name: 'bac_si_chi_dinh_id' })
  bacSiChiDinhId: number;

  @Column({ name: 'ky_thuat_vien_id', nullable: true })
  kyThuatVienId: number;

  @Column({ name: 'ghi_chu_chi_dinh', type: 'text', nullable: true })
  ghiChuChiDinh: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiChiDinh,
    default: TrangThaiChiDinh.CHO_LAY_MAU,
  })
  trangThai: TrangThaiChiDinh;

  @CreateDateColumn({ name: 'thoi_gian_chi_dinh' })
  thoiGianChiDinh: Date;

  @Column({ name: 'thoi_gian_lay_mau', type: 'datetime', nullable: true })
  thoiGianLayMau: Date;

  @Column({ name: 'thoi_gian_co_ket_qua', type: 'datetime', nullable: true })
  thoiGianCoKetQua: Date;

  // Relations
  @ManyToOne(() => DichVuXetNghiem)
  @JoinColumn({ name: 'dich_vu_xet_nghiem_id' })
  dichVu: DichVuXetNghiem;
}

// ─── KẾT QUẢ XÉT NGHIỆM ────────────────────────────────────
@Entity('ket_qua_xet_nghiem')
export class KetQuaXetNghiem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chi_dinh_id', unique: true })
  chiDinhId: number;

  @Column({ name: 'gia_tri', type: 'text', nullable: true })
  giaTri: string;

  @Column({ name: 'don_vi', length: 50, nullable: true })
  donVi: string;

  @Column({ name: 'nhan_xet', type: 'text', nullable: true })
  nhanXet: string;

  @Column({ name: 'file_dinh_kem', length: 500, nullable: true })
  fileDinhKem: string;

  @Column({ name: 'nhap_boi_id', nullable: true })
  nhapBoiId: number;

  @CreateDateColumn({ name: 'thoi_gian_nhap' })
  thoiGianNhap: Date;

  @Column({ name: 'da_gui_bac_si', type: 'tinyint', default: 0 })
  daGuiBacSi: boolean;

  @OneToOne(() => ChiDinhCanLamSang)
  @JoinColumn({ name: 'chi_dinh_id' })
  chiDinh: ChiDinhCanLamSang;
}

