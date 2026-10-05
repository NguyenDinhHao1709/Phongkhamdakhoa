import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lich_su_goi_kham')
export class LichSuGoiKham {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'luot_tiep_nhan_id' })
  luotTiepNhanId: number;

  @Column({ name: 'nguoi_thuc_hien_id', nullable: true })
  nguoiThucHienId: number;

  @Column({ name: 'loai_goi', length: 20 })
  loaiGoi: string;

  @Column({ name: 'lan_goi', type: 'smallint' })
  lanGoi: number;

  @Column({ name: 'ket_qua', length: 30, default: 'cho_benh_nhan' })
  ketQua: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;

  @CreateDateColumn({ name: 'thoi_gian_goi' })
  thoiGianGoi: Date;
}
