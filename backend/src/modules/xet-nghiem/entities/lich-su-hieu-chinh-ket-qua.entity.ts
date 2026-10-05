import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lich_su_hieu_chinh_ket_qua')
export class LichSuHieuChinhKetQua {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ket_qua_id' })
  ketQuaId: number;

  @Column({ name: 'chi_dinh_id' })
  chiDinhId: number;

  @Column({ name: 'phien_ban', type: 'int' })
  phienBan: number;

  @Column({ name: 'nhan_xet_cu', type: 'text', nullable: true })
  nhanXetCu: string;

  @Column({ name: 'nhan_xet_moi', type: 'text', nullable: true })
  nhanXetMoi: string;

  @Column({ name: 'ly_do', type: 'text' })
  lyDo: string;

  @Column({ name: 'nguoi_hieu_chinh_id', nullable: true })
  nguoiHieuChinhId: number;

  @CreateDateColumn({ name: 'thoi_gian_hieu_chinh' })
  thoiGianHieuChinh: Date;
}
