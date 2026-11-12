import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { BenhNhan } from '../../benh-nhan/entities/benh-nhan.entity';
import { LichHen } from '../../lich-hen/entities/lich-hen.entity';
import { BacSi } from '../../nhan-vien/entities/bac-si.entity';
import { NhanVien } from '../../nhan-vien/entities/nhan-vien.entity';

export enum TrangThaiTiepNhan {
  CHO_KHAM     = 'cho_kham',
  DANG_KHAM    = 'dang_kham',
  DANG_CLS     = 'dang_cls',
  DA_CO_KQ_CLS = 'da_co_kq_cls',
  CHO_THANH_TOAN = 'cho_thanh_toan',
  HOAN_THANH   = 'hoan_thanh',
  DA_HUY       = 'da_huy',
}

// ──────────────────────────────────────────────
@Entity('sinh_hieu')
export class SinhHieu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'luot_tiep_nhan_id', unique: true })
  luotTiepNhanId: number;

  @Column({ name: 'chieu_cao_cm', type: 'decimal', precision: 5, scale: 2, nullable: true })
  chieuCaoCm: number;

  @Column({ name: 'can_nang_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  canNangKg: number;

  @Column({ name: 'nhiet_do_c', type: 'decimal', precision: 4, scale: 1, nullable: true })
  nhietDoC: number;

  @Column({ name: 'huyet_ap_tam_thu', type: 'smallint', nullable: true })
  huyetApTamThu: number;

  @Column({ name: 'huyet_ap_tam_truong', type: 'smallint', nullable: true })
  huyetApTamTruong: number;

  @Column({ name: 'nhip_tim', type: 'smallint', nullable: true })
  nhipTim: number;

  @Column({ name: 'nhip_tho', type: 'smallint', nullable: true })
  nhipTho: number;

  @Column({ name: 'spo2', type: 'decimal', precision: 4, scale: 1, nullable: true })
  spo2: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @Column({ name: 'do_luc', type: 'datetime' })
  doLuc: Date;

  @Column({ name: 'do_boi_id', nullable: true })
  doBoiId: number;

  @OneToOne('LuotTiepNhan', (ltn: any) => ltn.sinhHieu)
  @JoinColumn({ name: 'luot_tiep_nhan_id' })
  luotTiepNhan: any;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'do_boi_id' })
  doBoi: NhanVien;
}

// ──────────────────────────────────────────────
@Entity('luot_tiep_nhan')
export class LuotTiepNhan {
  @PrimaryGeneratedColumn()
  id: number;

  // Số thứ tự reset mỗi ngày: unique theo (ngày đến, số thứ tự) ở DB (uq_ngay_stt)
  @Column({ name: 'ma_so_thu_tu', length: 20 })
  maSoThuTu: string;

  @Column({ name: 'benh_nhan_id' })
  benhNhanId: number;

  @Column({ name: 'lich_hen_id', nullable: true })
  lichHenId: number;

  @Column({ name: 'tiep_tan_id', nullable: true })
  tiepTanId: number;

  @Column({ name: 'phong_kham_id', nullable: true })
  phongKhamId: number;

  @Column({ name: 'bac_si_id', nullable: true })
  bacSiId: number;

  @Column({ name: 'chuyen_khoa', length: 100, nullable: true })
  chuyenKhoa: string;

  @Column({ name: 'loai_luot', length: 30, default: 'luot_chinh' })
  loaiLuot: string;

  @Column({ name: 'ly_do_tao_luot', length: 255, nullable: true })
  lyDoTaoLuot: string;

  @Column({ name: 'luot_goc_id', nullable: true })
  luotGocId: number;

  /** Đối tượng ưu tiên theo luật do lễ tân chọn (cap_cuu, phu_nu_co_thai, ...); tuổi được hệ thống tự nhận */
  @Column({ name: 'doi_tuong_uu_tien', length: 30, nullable: true })
  doiTuongUuTien: string;

  /** Lần gần nhất gọi mà bệnh nhân vắng mặt (qua lượt): xếp cuối hàng chờ tính từ thời điểm này */
  @Column({ name: 'qua_luot_luc', type: 'datetime', nullable: true })
  quaLuotLuc: Date;

  @Column({ name: 'so_lan_qua_luot', type: 'tinyint', default: 0 })
  soLanQuaLuot: number;

  @Column({ name: 'thoi_gian_den', type: 'datetime' })
  thoiGianDen: Date;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiTiepNhan,
    default: TrangThaiTiepNhan.CHO_KHAM,
  })
  trangThai: TrangThaiTiepNhan;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  // Relations
  @ManyToOne(() => BenhNhan)
  @JoinColumn({ name: 'benh_nhan_id' })
  benhNhan: BenhNhan;

  @ManyToOne(() => LichHen)
  @JoinColumn({ name: 'lich_hen_id' })
  lichHen: LichHen;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'tiep_tan_id' })
  tiepTan: NhanVien;

  @ManyToOne(() => BacSi)
  @JoinColumn({ name: 'bac_si_id' })
  bacSi: BacSi;

  @OneToOne(() => SinhHieu, (sh) => sh.luotTiepNhan)
  sinhHieu: SinhHieu;
}
