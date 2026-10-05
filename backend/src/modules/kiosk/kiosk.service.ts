import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LuotTiepNhan, TrangThaiTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { LichHen, TrangThaiLichHen } from '../lich-hen/entities/lich-hen.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { BacSi } from '../nhan-vien/entities/bac-si.entity';

export interface KioskDangKyMoiDto {
  hoTen: string;
  soDienThoai: string;
  namSinh?: string;
  gioiTinh?: string;
  trieuChung?: string;
  chuyenKhoa?: string;
}

@Injectable()
export class KioskService {
  constructor(
    @InjectRepository(LuotTiepNhan)
    private readonly luotRepo: Repository<LuotTiepNhan>,
    @InjectRepository(LichHen)
    private readonly lichHenRepo: Repository<LichHen>,
    @InjectRepository(BenhNhan)
    private readonly benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(BacSi)
    private readonly bacSiRepo: Repository<BacSi>,
  ) {}

  /**
   * 1. Tra cứu lịch hẹn tại Kiosk bằng SĐT hoặc Mã Lịch Hẹn
   */
  async traCuuLichHen(search: string) {
    const term = (search || '').trim();
    if (!term) {
      throw new BadRequestException('Vui lòng nhập Số điện thoại hoặc Mã lịch hẹn để tra cứu.');
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Tìm lịch hẹn hôm nay (ưu tiên hôm nay, nếu không có tìm lịch hẹn gần nhất)
    const qb = this.lichHenRepo
      .createQueryBuilder('lh')
      .leftJoinAndSelect('lh.benhNhan', 'bn')
      .leftJoinAndSelect('lh.bacSi', 'bs')
      .leftJoinAndSelect('bs.nhanVien', 'nv')
      .where('(bn.soDienThoai = :search OR lh.maLichHen = :search)', { search: term })
      .andWhere('lh.trangThai NOT IN (:...cancelled)', { cancelled: ['da_huy', 'tu_choi'] })
      .orderBy('lh.ngayHen', 'DESC')
      .addOrderBy('lh.gioHen', 'ASC');

    const list = await qb.getMany();

    if (!list || list.length === 0) {
      return {
        success: false,
        message: 'Không tìm thấy lịch hẹn phù hợp với thông tin đã nhập.',
        data: [],
      };
    }

    // Tra cứu thông tin phòng khám cho từng lịch hẹn
    const result = await Promise.all(
      list.map(async (lh) => {
        let phongKhamInfo = {
          tenPhong: 'Phòng 101 - Khám Nội Tổng Quát',
          viTri: 'Tầng 1 - Khu Tiếp Nhận A',
          chuyenKhoa: 'Nội Tổng Quát',
        };

        if (lh.phongKhamId) {
          const pkRows = await this.luotRepo.manager.query(
            `SELECT ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ? LIMIT 1`,
            [lh.phongKhamId],
          );
          if (pkRows && pkRows.length > 0) {
            phongKhamInfo = {
              tenPhong: pkRows[0].ten_phong,
              viTri: pkRows[0].vi_tri,
              chuyenKhoa: pkRows[0].chuyen_khoa || 'Chuyên Khoa',
            };
          }
        }

        // Kiểm tra xem đã lấy số thứ tự hôm nay chưa
        const existingLuot = await this.luotRepo.findOne({
          where: { lichHenId: lh.id },
        });

        const isToday = String(lh.ngayHen).slice(0, 10) === today;

        return {
          id: lh.id,
          maLichHen: lh.maLichHen,
          ngayHen: lh.ngayHen,
          gioHen: lh.gioHen,
          lyDoKham: lh.lyDoKham,
          trangThai: lh.trangThai,
          isToday,
          daCheckIn: !!existingLuot,
          maSoThuTu: existingLuot ? existingLuot.maSoThuTu : null,
          benhNhan: {
            id: lh.benhNhan?.id,
            hoTen: lh.benhNhan?.hoTen,
            soDienThoai: lh.benhNhan?.soDienThoai,
          },
          bacSi: {
            id: lh.bacSi?.id,
            hoTen: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ chuyên khoa',
            chuyenKhoa: lh.bacSi?.chuyenKhoa,
          },
          phongKham: phongKhamInfo,
        };
      }),
    );

    return {
      success: true,
      message: `Tìm thấy ${result.length} lịch hẹn.`,
      data: result,
    };
  }

  /**
   * 2. Bệnh nhân bấm Check-in tại Kiosk -> Sinh STT thật & đưa vào hàng đợi
   */
  async checkInLichHen(lichHenId: number) {
    const lh = await this.lichHenRepo.findOne({
      where: { id: lichHenId },
      relations: ['benhNhan', 'bacSi', 'bacSi.nhanVien'],
    });

    if (!lh) {
      throw new NotFoundException('Không tìm thấy thông tin lịch hẹn.');
    }

    // Kiểm tra nếu đã check-in trước đó thì in lại vé cũ
    const existingLuot = await this.luotRepo.findOne({
      where: { lichHenId: lh.id },
    });

    let phongKhamInfo = {
      id: lh.phongKhamId || 1,
      tenPhong: 'Phòng 101 - Khám Nội Tổng Quát',
      viTri: 'Tầng 1 - Khu Tiếp Nhận A',
      chuyenKhoa: 'Nội Tổng Quát',
    };

    if (lh.phongKhamId) {
      const pkRows = await this.luotRepo.manager.query(
        `SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ? LIMIT 1`,
        [lh.phongKhamId],
      );
      if (pkRows && pkRows.length > 0) {
        phongKhamInfo = {
          id: pkRows[0].id,
          tenPhong: pkRows[0].ten_phong,
          viTri: pkRows[0].vi_tri,
          chuyenKhoa: pkRows[0].chuyen_khoa || 'Chuyên Khoa',
        };
      }
    }

    if (existingLuot) {
      // Đếm số người đang chờ phía trước trong cùng phòng khám
      const soNguoiDangDoi = await this.luotRepo
        .createQueryBuilder('ltn')
        .where('ltn.phongKhamId = :pkId', { pkId: phongKhamInfo.id })
        .andWhere('ltn.trangThai = :st', { st: TrangThaiTiepNhan.CHO_KHAM })
        .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
        .andWhere('ltn.id < :curId', { curId: existingLuot.id })
        .getCount();

      return {
        success: true,
        message: 'Bệnh nhân đã lấy số trước đó. Đang in lại vé STT.',
        ticket: {
          maSoThuTu: existingLuot.maSoThuTu,
          hoTen: lh.benhNhan?.hoTen,
          soDienThoai: lh.benhNhan?.soDienThoai,
          tenPhong: phongKhamInfo.tenPhong,
          viTri: phongKhamInfo.viTri,
          chuyenKhoa: phongKhamInfo.chuyenKhoa,
          bacSi: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách phòng khám',
          gioDangKy: new Date(existingLuot.thoiGianDen).toLocaleTimeString('vi-VN'),
          loai: 'Đã đặt hẹn trước (Trực tuyến)',
          soNguoiDangDoi,
          qrCode: `CHECKIN:${existingLuot.maSoThuTu}:${lh.maLichHen}`,
        },
      };
    }

    // Tính STT tăng dần hôm nay cho nhóm ưu tiên có lịch hẹn (Loại A)
    const todayCount = await this.luotRepo
      .createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    const sttNumber = todayCount + 1;
    const maSoThuTu = `A${String(sttNumber).padStart(3, '0')}`;

    const newLuot = this.luotRepo.create({
      maSoThuTu,
      benhNhanId: lh.benhNhanId,
      lichHenId: lh.id,
      phongKhamId: phongKhamInfo.id,
      bacSiId: lh.bacSiId || undefined,
      thoiGianDen: new Date(),
      trangThai: TrangThaiTiepNhan.CHO_KHAM,
      ghiChu: `Check-in tự động Kiosk lúc ${new Date().toLocaleTimeString('vi-VN')}. Lịch hẹn: ${lh.maLichHen}`,
    });

    const savedLuot = await this.luotRepo.save(newLuot);

    // Ghi nhận mã checkin vào ghi chú của lịch hẹn
    await this.lichHenRepo.update(lh.id, {
      ghiChu: `${lh.ghiChu || ''} [ĐÃ_CHECKIN_KIOSK: ${maSoThuTu}]`.trim(),
    });

    // Số người đang chờ phía trước
    const soNguoiDangDoi = await this.luotRepo
      .createQueryBuilder('ltn')
      .where('ltn.phongKhamId = :pkId', { pkId: phongKhamInfo.id })
      .andWhere('ltn.trangThai = :st', { st: TrangThaiTiepNhan.CHO_KHAM })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere('ltn.id < :curId', { curId: savedLuot.id })
      .getCount();

    return {
      success: true,
      message: 'Check-in thành công! Chúc bạn buổi khám thuận lợi.',
      ticket: {
        maSoThuTu,
        hoTen: lh.benhNhan?.hoTen,
        soDienThoai: lh.benhNhan?.soDienThoai,
        tenPhong: phongKhamInfo.tenPhong,
        viTri: phongKhamInfo.viTri,
        chuyenKhoa: phongKhamInfo.chuyenKhoa,
        bacSi: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách phòng khám',
        gioDangKy: new Date().toLocaleTimeString('vi-VN'),
        loai: 'Đã đặt hẹn trước (Trực tuyến)',
        soNguoiDangDoi,
        qrCode: `CHECKIN:${maSoThuTu}:${lh.maLichHen}`,
      },
    };
  }

  /**
   * 3. Đăng ký mới tại Kiosk (Phân luồng chuyên khoa thông minh)
   */
  async dangKyMoiTaiKiosk(dto: KioskDangKyMoiDto) {
    const hoTen = (dto.hoTen || '').trim();
    const soDienThoai = (dto.soDienThoai || '').trim();

    if (!hoTen || !soDienThoai) {
      throw new BadRequestException('Vui lòng cung cấp Họ tên và Số điện thoại.');
    }

    // 1. Tìm hoặc tạo hồ sơ bệnh nhân
    let benhNhan = await this.benhNhanRepo.findOne({
      where: { soDienThoai },
    });

    if (!benhNhan) {
      const maBenhNhan = `BN${Date.now().toString().slice(-6)}`;
      const birthYear = dto.namSinh ? parseInt(dto.namSinh, 10) : 1990;
      const ngaySinh = `${birthYear}-01-01`;

      benhNhan = this.benhNhanRepo.create({
        maBenhNhan,
        hoTen,
        soDienThoai,
        ngaySinh,
        gioiTinh: dto.gioiTinh === 'nu' ? 'nu' : 'nam',
        diaChi: 'Đăng ký tại Kiosk phòng khám',
      });
      benhNhan = await this.benhNhanRepo.save(benhNhan);
    }

    // 2. Phân luồng phòng khám theo triệu chứng hoặc chuyên khoa
    const tc = `${dto.trieuChung || ''} ${dto.chuyenKhoa || ''}`.toLowerCase();
    let targetRoomId = 1;
    let targetSpecialty = 'Nội tổng quát';

    if (tc.includes('ngực') || tc.includes('tim') || tc.includes('huyết áp') || tc.includes('khó thở') || tc.includes('mạch')) {
      targetRoomId = 2;
      targetSpecialty = 'Tim mạch';
    } else if (tc.includes('bé') || tc.includes('trẻ') || tc.includes('nhi') || tc.includes('sốt mọc răng')) {
      targetRoomId = 3;
      targetSpecialty = 'Nhi khoa';
    } else if (tc.includes('mắt') || tc.includes('thị lực') || tc.includes('đau mắt') || tc.includes('cận thị')) {
      targetRoomId = 4;
      targetSpecialty = 'Chuyên Khoa Mắt';
    }

    // Lấy thông tin phòng khám thực tế từ DB
    const pkRows = await this.luotRepo.manager.query(
      `SELECT id, ten_phong, vi_tri, chuyen_khoa FROM phong_kham WHERE id = ? LIMIT 1`,
      [targetRoomId],
    );

    const phongKhamInfo = pkRows && pkRows.length > 0
      ? pkRows[0]
      : { id: targetRoomId, ten_phong: 'Phòng 101 - Khám Nội Tổng Quát', vi_tri: 'Tầng 1 - Khu A', chuyen_khoa: targetSpecialty };

    // Tìm bác sĩ đang trực ở chuyên khoa này
    const doctors = await this.bacSiRepo.find({
      relations: ['nhanVien'],
    });
    const matchedDoctor = doctors.find((d) => (d.chuyenKhoa || '').toLowerCase().includes(targetSpecialty.toLowerCase())) || doctors[0];

    // 3. Sinh số thứ tự cho bệnh nhân vãng lai (Loại B)
    const todayCount = await this.luotRepo
      .createQueryBuilder('ltn')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .getCount();

    const sttNumber = todayCount + 1;
    const maSoThuTu = `B${String(sttNumber).padStart(3, '0')}`;

    const newLuot = this.luotRepo.create({
      maSoThuTu,
      benhNhanId: benhNhan.id,
      lichHenId: undefined,
      phongKhamId: phongKhamInfo.id,
      bacSiId: matchedDoctor?.id,
      thoiGianDen: new Date(),
      trangThai: TrangThaiTiepNhan.CHO_KHAM,
      ghiChu: `[Kiosk tự động] Đăng ký mới. Triệu chứng: ${dto.trieuChung || 'Khám lâm sàng'}`,
    });

    const savedLuot = await this.luotRepo.save(newLuot);

    // Đếm số người đang chờ trong phòng
    const soNguoiDangDoi = await this.luotRepo
      .createQueryBuilder('ltn')
      .where('ltn.phongKhamId = :pkId', { pkId: phongKhamInfo.id })
      .andWhere('ltn.trangThai = :st', { st: TrangThaiTiepNhan.CHO_KHAM })
      .andWhere('DATE(ltn.thoiGianDen) = CURDATE()')
      .andWhere('ltn.id < :curId', { curId: savedLuot.id })
      .getCount();

    return {
      success: true,
      message: 'Đăng ký thành công! Đang in phiếu số thứ tự tiếp nhận.',
      ticket: {
        maSoThuTu,
        hoTen: benhNhan.hoTen,
        soDienThoai: benhNhan.soDienThoai,
        tenPhong: phongKhamInfo.ten_phong,
        viTri: phongKhamInfo.vi_tri,
        chuyenKhoa: phongKhamInfo.chuyen_khoa,
        trieuChung: dto.trieuChung || 'Khám sức khỏe tổng quát',
        bacSi: matchedDoctor?.nhanVien?.hoTen || 'Bác sĩ trực chuyên khoa',
        gioDangKy: new Date().toLocaleTimeString('vi-VN'),
        loai: 'Tiếp nhận trực tiếp tại quầy Kiosk',
        soNguoiDangDoi,
        qrCode: `KIOSK_WALKIN:${maSoThuTu}:${benhNhan.id}`,
      },
    };
  }

  /**
   * 4. Bảng trạng thái phòng khám Live cho Kiosk
   */
  async getPhongKhamLive() {
    const rooms = await this.luotRepo.manager.query(
      `SELECT pk.id, pk.ten_phong as tenPhong, pk.vi_tri as viTri, pk.chuyen_khoa as chuyenKhoa, pk.trang_thai as trangThai
       FROM phong_kham pk
       WHERE pk.trang_thai = 'hoat_dong'
       ORDER BY pk.id ASC`,
    );

    // Đếm số người đang chờ ở từng phòng hôm nay
    const queueCounts = await this.luotRepo.manager.query(
      `SELECT phong_kham_id as phongKhamId, COUNT(*) as count
       FROM luot_tiep_nhan
       WHERE trang_thai IN ('cho_kham', 'dang_kham') AND DATE(thoi_gian_den) = CURDATE()
       GROUP BY phong_kham_id`,
    );

    const countMap = new Map<number, number>();
    queueCounts.forEach((r: any) => {
      countMap.set(Number(r.phongKhamId), Number(r.count));
    });

    const result = rooms.map((room: any) => ({
      id: room.id,
      tenPhong: room.tenPhong,
      viTri: room.viTri,
      chuyenKhoa: room.chuyenKhoa,
      soNguoiDangCho: countMap.get(room.id) || 0,
    }));

    return {
      success: true,
      data: result,
    };
  }
}
