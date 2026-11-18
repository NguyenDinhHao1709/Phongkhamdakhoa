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

  /** Thời lượng mỗi lượt khám (phút) — sinh khung giờ đặt lịch trong ca */
  @Column({ name: 'thoi_luong_phut', type: 'smallint', default: 60 })
  thoiLuongPhut: number;
}

