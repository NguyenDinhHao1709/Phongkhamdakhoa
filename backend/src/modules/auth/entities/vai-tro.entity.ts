import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany } from 'typeorm';
import { NguoiDung } from './nguoi-dung.entity';
import { VaiTroQuyenHan } from './vai-tro-quyen-han.entity';

@Entity('vai_tro')
export class VaiTro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ma_vai_tro', length: 50, unique: true })
  maVaiTro: string;

  @Column({ name: 'ten_vai_tro', length: 100 })
  tenVaiTro: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string;

  @Column({ name: 'la_he_thong', type: 'tinyint', default: 0 })
  laHeThong: boolean;

  @OneToMany(() => NguoiDung, (nd) => nd.vaiTro)
  nguoiDungs: NguoiDung[];

  @OneToMany(() => VaiTroQuyenHan, (vtqh) => vtqh.vaiTro)
  quyenHans: VaiTroQuyenHan[];
}

