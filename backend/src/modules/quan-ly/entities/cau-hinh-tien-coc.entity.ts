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

  /** Số lịch hẹn tối đa của 1 bác sĩ mỗi buổi (chừa khung trống để bù giờ); null = không giới hạn. Dùng giá trị của dòng truc_tiep */
  @Column({ name: 'so_lich_hen_toi_da_moi_buoi', type: 'int', nullable: true })
  soLichHenToiDaMoiBuoi: number;

  /** Mã cơ sở KCB BHYT của phòng khám (dòng truc_tiep); trống = không kiểm tra tuyến */
  @Column({ name: 'ma_co_so_kcb', length: 10, nullable: true })
  maCoSoKcb: string;

  /** % mức hưởng BHYT áp dụng khi khám trái tuyến (thẻ đăng ký nơi khác, không cấp cứu) */
  @Column({ name: 'ty_le_bhyt_trai_tuyen', type: 'int', default: 0 })
  tyLeBhytTraiTuyen: number;

  /** Chi phí một lần khám đúng tuyến thấp hơn mức này thì BHYT chi trả 100% (theo quy định: 15% lương cơ sở) */
  @Column({ name: 'nguong_bhyt_toan_bo', type: 'int', nullable: true })
  nguongBhytToanBo: number | null;

  @Column({ name: 'ap_dung_tu_dong', type: 'boolean', default: true })
  apDungTuDong: boolean;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;

  @Column({ name: 'ghi_chu_hoan_coc', type: 'text', nullable: true })
  ghiChuHoanCoc: string;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}
