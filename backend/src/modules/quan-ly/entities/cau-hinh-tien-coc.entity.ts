import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('cau_hinh_tien_coc')
export class CauHinhTienCoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'loai_hinh_thuc', length: 50, unique: true })
  loaiHinhThuc: string;

  @Column({ name: 'ten_hinh_thuc', length: 200 })
  tenHinhThuc: string;

  @Column({ name: 'phi_kham_mac_dinh', type: 'decimal', precision: 12, scale: 2, default: 200000 })
  phiKhamMacDinh: number;

  @Column({ name: 'phan_tram_coc', type: 'int', default: 20 })
  phanTramCoc: number;

  @Column({ name: 'so_tien_coc', type: 'decimal', precision: 12, scale: 2, default: 40000 })
  soTienCoc: number;

  @Column({ name: 'thoi_gian_huy_hoan_coc_gio', type: 'int', default: 2 })
  thoiGianHuyHoanCocGio: number;

  @Column({ name: 'phan_tram_hoan_coc', type: 'int', default: 100 })
  phanTramHoanCoc: number;

  @Column({ name: 'cho_phep_dat_truoc_ngay_min', type: 'int', default: 1 })
  choPhepDatTruocNgayMin: number;

  @Column({ name: 'cho_phep_dat_truoc_ngay_max', type: 'int', default: 30 })
  choPhepDatTruocNgayMax: number;

  @Column({ name: 'ap_dung_tu_dong', type: 'boolean', default: true })
  apDungTuDong: boolean;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;

  @Column({ name: 'ghi_chu_hoan_coc', type: 'text', nullable: true })
  ghiChuHoanCoc: string;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}
