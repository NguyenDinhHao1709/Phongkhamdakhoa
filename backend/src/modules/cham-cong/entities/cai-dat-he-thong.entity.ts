import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('cai_dat_he_thong')
export class CaiDatHeThong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'khoa_cai_dat', length: 100, unique: true })
  khoaCaiDat: string;

  @Column({ name: 'gia_tri', type: 'json' })
  giaTri: any;

  @Column({ name: 'ghi_chu', length: 255, nullable: true })
  ghiChu: string;

  @UpdateDateColumn({ name: 'cap_nhat_luc' })
  capNhatLuc: Date;
}
