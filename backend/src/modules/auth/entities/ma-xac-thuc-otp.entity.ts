import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum LoaiOtp {
  DANG_KY = 'dang_ky',
  QUEN_MAT_KHAU = 'quen_mat_khau',
  XAC_THUC_KHAC = 'xac_thuc_khac',
}

@Entity('ma_xac_thuc_otp')
export class MaXacThucOtp {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 100 })
  email: string;

  @Column({ name: 'ma_otp', length: 10 })
  maOtp: string;

  @Column({ type: 'enum', enum: LoaiOtp, default: LoaiOtp.DANG_KY })
  loai: LoaiOtp;

  @Column({ name: 'het_han_luc', type: 'datetime' })
  hetHanLuc: Date;

  @Column({ name: 'da_su_dung', type: 'tinyint', default: 0 })
  daSuDung: boolean;

  @Column({ name: 'so_lan_thu', type: 'tinyint', default: 0 })
  soLanThu: number;

  @CreateDateColumn({ name: 'tao_luc' })
  taoLuc: Date;
}

