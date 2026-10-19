import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bao_cao_bo_phan')
export class BaoCaoBoPhan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_bao_cao', length: 30, unique: true })
  maBaoCao: string;

  @Column({ name: 'bo_phan', length: 50 })
  boPhan: string; // 'nha_thuoc' | 'bac_si' | 'thu_ngan' | 'tiep_tan' | 'xet_nghiem'

  @Column({ name: 'tieu_de', length: 255 })
  tieuDe: string;

  @Column({ name: 'ky_bao_cao', length: 100 })
  kyBaoCao: string;

  @Column({ name: 'nguoi_gui_id' })
  nguoiGuiId: number;

  @CreateDateColumn({ name: 'ngay_gui' })
  ngayGui: Date;

  @Column({ name: 'so_lieu_snapshot', type: 'json', nullable: true })
  soLieuSnapshot: any;

  @Column({ name: 'noi_dung', type: 'text', nullable: true })
  noiDung: string;

  @Column({ name: 'kien_nghi', type: 'text', nullable: true })
  kienNghi: string;

  @Column({ name: 'trang_thai', length: 30, default: 'cho_xem' })
  trangThai: string; // 'cho_xem' | 'da_chi_dao'

  @Column({ name: 'y_kien_giam_doc', type: 'text', nullable: true })
  yKienGiamDoc: string;

  @Column({ name: 'nguoi_chi_dao_id', nullable: true })
  nguoiChiDaoId: number;

  @Column({ name: 'ngay_chi_dao', type: 'datetime', nullable: true })
  ngayChiDao: Date;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}

