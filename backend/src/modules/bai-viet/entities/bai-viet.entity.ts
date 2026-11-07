import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NguoiDung } from '../../auth/entities/nguoi-dung.entity';

export enum TrangThaiBaiViet {
  NHAP = 'nhap',
  CHO_DUYET = 'cho_duyet',
  XUAT_BAN = 'xuat_ban',
  TU_CHOI = 'tu_choi',
  AN = 'an',
}

@Entity('bai_viet')
export class BaiViet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tieu_de', length: 255 })
  tieuDe: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ name: 'tom_tat', length: 500, nullable: true })
  tomTat: string;

  @Column({ name: 'noi_dung', type: 'longtext', nullable: true })
  noiDung: string;

  @Column({ name: 'anh_dai_dien', length: 500, nullable: true })
  anhDaiDien: string;

  @Column({ name: 'chuyen_khoa', length: 100, nullable: true })
  chuyenKhoa: string;

  @Column({ name: 'tac_gia_id', nullable: true })
  tacGiaId: number;

  @ManyToOne(() => NguoiDung, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tac_gia_id' })
  tacGia: NguoiDung;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: TrangThaiBaiViet,
    default: TrangThaiBaiViet.NHAP,
  })
  trangThai: TrangThaiBaiViet;

  @Column({ name: 'ly_do_tu_choi', type: 'text', nullable: true })
  lyDoTuChoi: string;

  @Column({ name: 'nguoi_duyet_id', nullable: true })
  nguoiDuyetId: number;

  @ManyToOne(() => NguoiDung, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nguoi_duyet_id' })
  nguoiDuyet: NguoiDung;

  @Column({ name: 'luot_xem', type: 'int', default: 0 })
  luotXem: number;

  @Column({ name: 'xuat_ban_luc', type: 'datetime', nullable: true })
  xuatBanLuc: Date;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}

