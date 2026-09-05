import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ca_lam_viec')
export class CaLamViec {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ten_ca', length: 50 })
  tenCa: string;

  @Column({ name: 'gio_bat_dau', type: 'time' })
  gioBatDau: string;

  @Column({ name: 'gio_ket_thuc', type: 'time' })
  gioKetThuc: string;
}
