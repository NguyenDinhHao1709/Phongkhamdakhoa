import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Aes256Transformer } from '../aes-256.transformer';

@Entity('benh_nhan')
export class BenhNhan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_benh_nhan', length: 20 })
  maBenhNhan: string;

  @Column({ name: 'nguoi_dung_id', nullable: true })
  nguoiDungId: number;

  @Column({ name: 'ho_ten', length: 100 })
  hoTen: string;

  @Column({ name: 'ngay_sinh', type: 'date', nullable: true })
  ngaySinh: string;

  @Column({ name: 'gioi_tinh', nullable: true })
  gioiTinh: string;

  @Column({ name: 'nhom_mau', nullable: true })
  nhomMau: string;

  @Column({ name: 'di_ung', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  diUng: string;

  @Column({ name: 'tien_su_benh', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  tienSuBenh: string;
}

@Entity('ho_so_benh_an')
export class HoSoBenhAn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_ho_so', length: 20 })
  maHoSo: string;

  @Column({ name: 'benh_nhan_id' })
  benhNhanId: number;
}

@Entity('benh_an_kham')
export class BenhAnKham {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ho_so_benh_an_id' })
  hoSoBenhAnId: number;

  @Column({ name: 'luot_tiep_nhan_id', nullable: true })
  luotTiepNhanId: number | null;

  @Column({ name: 'bac_si_id' })
  bacSiId: number;

  @CreateDateColumn({ name: 'ngay_kham' })
  ngayKham: Date;

  @Column({ name: 'trieu_chung', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  trieuChung: string;

  @Column({ name: 'chan_doan_so_bo', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  chanDoanSoBo: string;

  @Column({ name: 'chan_doan_xac_dinh', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  chanDoanXacDinh: string;

  @Column({ name: 'phuong_phap_dieu_tri', type: 'text', nullable: true, transformer: new Aes256Transformer() })
  phuongPhapDieuTri: string;

  @Column({ name: 'tai_kham', type: 'date', nullable: true })
  taiKham: string;
}

@Entity('sinh_hieu')
export class SinhHieu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'luot_tiep_nhan_id' })
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

  @Column({ name: 'spo2', type: 'decimal', precision: 4, scale: 1, nullable: true })
  spo2: number;
}

@Entity('luot_tiep_nhan')
export class LuotTiepNhan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'thoi_gian_den', type: 'datetime' })
  thoiGianDen: Date;

  @Column({ name: 'trang_thai', nullable: true })
  trangThai: string;
}

// Biểu phí khám & tiền cọc do Ban Giám Đốc cấu hình (backend quản lý, ai-service chỉ đọc)
@Entity('cau_hinh_tien_coc')
export class CauHinhTienCoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'loai_hinh_thuc', length: 50 })
  loaiHinhThuc: string;

  @Column({ name: 'phi_kham_mac_dinh', type: 'decimal', precision: 12, scale: 2 })
  phiKhamMacDinh: number;

  @Column({ name: 'phan_tram_coc', type: 'int' })
  phanTramCoc: number;

  @Column({ name: 'so_tien_coc', type: 'decimal', precision: 12, scale: 2 })
  soTienCoc: number;

  @Column({ name: 'thoi_gian_huy_hoan_coc_gio', type: 'int' })
  thoiGianHuyHoanCocGio: number;

  @Column({ name: 'phan_tram_hoan_coc', type: 'int' })
  phanTramHoanCoc: number;
}

// Cache câu trả lời AI (triage) — cũng là dữ liệu huấn luyện bộ phân loại chuyên khoa
@Entity('ai_cau_tra_loi_cache')
export class AiCauTraLoiCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'khoa_cache', length: 255 })
  khoaCache: string;

  @Column({ name: 'cau_hoi_goc', type: 'text' })
  cauHoiGoc: string;

  @Column({ name: 'ket_qua', type: 'json' })
  ketQua: any;

  @Column({ name: 'ma_khoa', length: 20, nullable: true })
  maKhoa: string | null;

  @Column({ name: 'so_lan_dung', type: 'int', default: 0 })
  soLanDung: number;

  @Column({ name: 'ngay_cap_nhat', type: 'datetime', insert: false, update: false })
  ngayCapNhat: Date;
}

@Entity('dich_vu_xet_nghiem')
export class DichVuXetNghiem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_dich_vu', length: 20 })
  maDichVu: string;

  @Column({ name: 'ten_dich_vu', length: 200 })
  tenDichVu: string;

  @Column({ default: 'xet_nghiem' })
  loai: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gia: number;

  @Column({ name: 'don_vi_ket_qua', length: 50, nullable: true })
  donViKetQua: string;

  @Column({ name: 'gia_tri_binh_thuong', length: 200, nullable: true })
  giaTriBinhThuong: string;

  @Column({ name: 'trang_thai', default: 'hoat_dong' })
  trangThai: string;
}

@Entity('chi_dinh_can_lam_sang')
export class ChiDinhCanLamSang {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'benh_an_kham_id' })
  benhAnKhamId: number;

  @Column({ name: 'dich_vu_xet_nghiem_id' })
  dichVuXetNghiemId: number;

  @Column({ name: 'trang_thai', default: 'cho_lay_mau' })
  trangThai: string;

  @CreateDateColumn({ name: 'thoi_gian_chi_dinh' })
  thoiGianChiDinh: Date;

  @Column({ name: 'thoi_gian_lay_mau', type: 'datetime', nullable: true })
  thoiGianLayMau: Date;

  @Column({ name: 'thoi_gian_co_ket_qua', type: 'datetime', nullable: true })
  thoiGianCoKetQua: Date;

  @ManyToOne(() => DichVuXetNghiem)
  @JoinColumn({ name: 'dich_vu_xet_nghiem_id' })
  dichVu: DichVuXetNghiem;
}

@Entity('ket_qua_xet_nghiem')
export class KetQuaXetNghiem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chi_dinh_id' })
  chiDinhId: number;

  @Column({ name: 'gia_tri', type: 'text', nullable: true })
  giaTri: string;

  @Column({ name: 'don_vi', length: 50, nullable: true })
  donVi: string;

  @Column({ name: 'nhan_xet', type: 'text', nullable: true })
  nhanXet: string;
}

@Entity('thuoc')
export class Thuoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_thuoc', length: 20 })
  maThuoc: string;

  @Column({ name: 'ten_thuoc', length: 200 })
  tenThuoc: string;

  @Column({ name: 'ten_hoat_chat', length: 200, nullable: true })
  tenHoatChat: string;

  @Column({ name: 'don_vi_tinh', length: 30 })
  donViTinh: string;

  @Column({ name: 'ham_luong', length: 50, nullable: true })
  hamLuong: string;

  @Column({ name: 'duong_dung', length: 100, nullable: true })
  duongDung: string;

  @Column({ name: 'gia_ban', type: 'decimal', precision: 12, scale: 2, default: 0 })
  giaBan: number;

  @Column({ name: 'ton_kho_tong', default: 0 })
  tonKhoTong: number;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;
}

@Entity('don_thuoc')
export class DonThuoc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'benh_an_kham_id' })
  benhAnKhamId: number;

  @CreateDateColumn({ name: 'ngay_ke' })
  ngayKe: Date;

  @OneToMany(() => DonThuocChiTiet, (ct) => ct.donThuoc)
  chiTiet: DonThuocChiTiet[];
}

@Entity('don_thuoc_chi_tiet')
export class DonThuocChiTiet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'don_thuoc_id' })
  donThuocId: number;

  @ManyToOne(() => DonThuoc, (dt) => dt.chiTiet)
  @JoinColumn({ name: 'don_thuoc_id' })
  donThuoc: DonThuoc;

  @Column({ name: 'thuoc_id' })
  thuocId: number;

  @ManyToOne(() => Thuoc)
  @JoinColumn({ name: 'thuoc_id' })
  thuoc: Thuoc;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'lieu_dung', length: 200, nullable: true })
  lieuDung: string;

  @Column({ name: 'so_ngay_dung', nullable: true })
  soNgayDung: number;
}

@Entity('nhan_vien')
export class NhanVien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ho_ten', length: 100 })
  hoTen: string;
}

@Entity('bac_si')
export class BacSi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nhan_vien_id' })
  nhanVienId: number;

  @Column({ name: 'chuyen_khoa', length: 100 })
  chuyenKhoa: string;

  @Column({ name: 'bang_cap', length: 100, nullable: true })
  bangCap: string;

  @ManyToOne(() => NhanVien)
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: NhanVien;
}

