import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { VaiTroQuyenHan } from './vai-tro-quyen-han.entity';

@Entity('quyen_han')
export class QuyenHan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_quyen', length: 100, unique: true })
  maQuyen: string;

  @Column({ name: 'ten_quyen', length: 150 })
  tenQuyen: string;

  @Column({ name: 'nhom_chuc_nang', length: 100, nullable: true })
  nhomChucNang: string;

  @OneToMany(() => VaiTroQuyenHan, (vtqh) => vtqh.quyenHan)
  vaiTros: VaiTroQuyenHan[];
}

