import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { VaiTro } from './vai-tro.entity';
import { QuyenHan } from './quyen-han.entity';

@Entity('vai_tro_quyen_han')
export class VaiTroQuyenHan {
  @PrimaryColumn({ name: 'vai_tro_id' })
  vaiTroId: number;

  @PrimaryColumn({ name: 'quyen_han_id' })
  quyenHanId: number;

  @ManyToOne(() => VaiTro, (vt) => vt.quyenHans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vai_tro_id' })
  vaiTro: VaiTro;

  @ManyToOne(() => QuyenHan, (qh) => qh.vaiTros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quyen_han_id' })
  quyenHan: QuyenHan;
}

