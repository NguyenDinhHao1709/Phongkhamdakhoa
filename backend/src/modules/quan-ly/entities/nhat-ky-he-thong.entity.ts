import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, BeforeInsert } from 'typeorm';
import { ipHienTai, userAgentHienTai } from '../../../common/request-context';

export enum LoaiNhatKy {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

@Entity('nhat_ky_he_thong')
export class NhatKyHeThong {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'nguoi_dung_id', type: 'int', nullable: true })
  nguoiDungId: number;

  @Column({ name: 'ten_nguoi_dung', length: 100 })
  tenNguoiDung: string;

  @Column({ name: 'vai_tro', length: 50 })
  vaiTro: string;

  @Index()
  @Column({ name: 'hanh_dong', length: 100 })
  hanhDong: string;

  @Index()
  @Column({
    name: 'loai_nhat_ky',
    length: 20,
    default: LoaiNhatKy.INFO,
  })
  loaiNhatKy: LoaiNhatKy;

  @Column({ name: 'mo_ta', type: 'text' })
  moTa: string;

  @Column({ name: 'dia_chi_ip', length: 50, nullable: true })
  diaChiIp: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string;

  /**
   * Điền IP / trình duyệt thật của request đang xử lý. Nhiều chỗ ghi nhật ký trong service không có req
   * nên trước đây ghi cứng '127.0.0.1' (và cột có mặc định 127.0.0.1) → không truy được ai làm từ đâu.
   * Ngoài request (tác vụ nền) thì để trống thay vì ghi một IP không có thật.
   */
  @BeforeInsert()
  dienNguCanhRequest() {
    if (!this.diaChiIp || this.diaChiIp === '127.0.0.1') this.diaChiIp = ipHienTai() as string;
    if (!this.userAgent || this.userAgent === 'Trình duyệt hệ thống') {
      this.userAgent = (userAgentHienTai() ?? this.userAgent ?? null) as string;
    }
  }

  @Index()
  @CreateDateColumn({ name: 'thoi_gian' })
  thoiGian: Date;
}

