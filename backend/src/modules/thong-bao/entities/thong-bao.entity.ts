import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('thong_bao')
export class ThongBao {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'nguoi_nhan_id' })
  nguoiNhanId: number;

  @Column({ name: 'tieu_de', length: 200 })
  tieuDe: string;

  @Column({ name: 'noi_dung', type: 'text', nullable: true })
  noiDung: string;

  @Column({ length: 50 })
  loai: string;

  @Column({ name: 'doi_tuong_bang', length: 50, nullable: true })
  doiTuongBang: string;

  @Column({ name: 'doi_tuong_id', nullable: true })
  doiTuongId: number;

  @Column({ name: 'da_doc', type: 'tinyint', default: 0 })
  daDoc: boolean;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}
