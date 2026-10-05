import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { YeuCauNhapKho } from './yeu-cau-nhap-kho.entity';
import { Thuoc } from './thuoc.entity';
import { NhaCungCap } from './nha-cung-cap.entity';

@Entity('yeu_cau_nhap_kho_chi_tiet')
export class YeuCauNhapKhoChiTiet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'yeu_cau_id' })
  yeuCauId: number;

  @ManyToOne(() => YeuCauNhapKho, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'yeu_cau_id' })
  yeuCau: YeuCauNhapKho;

  @Column({ name: 'thuoc_id', nullable: true })
  thuocId: number;

  @ManyToOne(() => Thuoc)
  @JoinColumn({ name: 'thuoc_id' })
  thuoc: Thuoc;

  @Column({ name: 'nha_cung_cap_id', nullable: true })
  nhaCungCapId: number;

  @ManyToOne(() => NhaCungCap)
  @JoinColumn({ name: 'nha_cung_cap_id' })
  nhaCungCap: NhaCungCap;

  @Column({ name: 'so_luong_dat', default: 0 })
  soLuongDat: number;

  @Column({ name: 'so_luong_giao', default: 0 })
  soLuongGiao: number;

  @Column({ name: 'so_luong_dat_chat_luong', default: 0 })
  soLuongDatChatLuong: number;

  @Column({ name: 'so_luong_hong', default: 0 })
  soLuongHong: number;

  @Column({ name: 'so_luong_thieu', default: 0 })
  soLuongThieu: number;

  @Column({ name: 'don_gia_bao', type: 'decimal', precision: 12, scale: 2, default: 0 })
  donGiaBao: number;

  @Column({ name: 'don_gia_chon', type: 'decimal', precision: 12, scale: 2, default: 0 })
  donGiaChon: number;

  @Column({ name: 'bao_gia_so_sanh', type: 'json', nullable: true })
  baoGiaSoSanh: Array<{ nhaCungCapId: number; donGia: number }>;

  @Column({ name: 'ma_lo', length: 50, nullable: true })
  maLo: string;

  @Column({ name: 'ngay_het_han', type: 'date', nullable: true })
  ngayHetHan: Date;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string;
}
