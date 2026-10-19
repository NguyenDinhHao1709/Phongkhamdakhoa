import {
  Injectable, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChamCong } from './entities/cham-cong.entity';
import { CaiDatHeThong } from './entities/cai-dat-he-thong.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { NhatKyHeThong, LoaiNhatKy } from '../quan-ly/entities/nhat-ky-he-thong.entity';

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:5001';
const CHAM_CONG_KEY = 'CHAM_CONG_CONFIG';

@Injectable()
export class ChamCongService {
  constructor(
    @InjectRepository(ChamCong)
    private chamCongRepo: Repository<ChamCong>,
    @InjectRepository(CaiDatHeThong)
    private caiDatRepo: Repository<CaiDatHeThong>,
    @InjectRepository(NhanVien)
    private nhanVienRepo: Repository<NhanVien>,
    @InjectRepository(NhatKyHeThong)
    private nhatKyRepo: Repository<NhatKyHeThong>,
    private httpService: HttpService,
    private dataSource: DataSource,
  ) {}

  // ─── Lấy Nhân viên theo User ID đang đăng nhập ──────────────────────────────

  async layNhanVienTheoUserId(userId: number): Promise<NhanVien> {
    const nv = await this.nhanVienRepo.findOneBy({ nguoiDungId: userId });
    if (!nv) {
      throw new BadRequestException('Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong hệ thống');
    }
    return nv;
  }

  // ─── Lấy ảnh mẫu nhân viên (chỉ Admin mới có quyền cập nhật ảnh) ─────────────

  async layAnhMauNhanVien(nv: NhanVien): Promise<string> {
    if (!nv.anhDaiDien) {
      throw new BadRequestException(
        'Hồ sơ của bạn chưa có ảnh khuôn mặt mẫu trong hệ thống. Vui lòng liên hệ Quản trị viên (Admin) để cập nhật ảnh nhận diện trước khi chấm công.',
      );
    }

    const cleanRel = nv.anhDaiDien.replace(/^\/+/, '');
    const fullPath = path.join(process.cwd(), cleanRel);
    if (!fs.existsSync(fullPath)) {
      throw new BadRequestException(
        'Không tìm thấy file ảnh khuôn mặt mẫu trên máy chủ. Vui lòng liên hệ Quản trị viên (Admin) để cập nhật lại ảnh nhận diện.',
      );
    }

    return fullPath;
  }

  // ─── Lấy lịch phân ca của nhân viên hôm nay ────────────────────────────────

  async timLichLamViecHomNay(nhanVienId: number, ngay: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT llv.id, llv.ca_lam_viec_id, ca.ten_ca, ca.gio_bat_dau, ca.gio_ket_thuc
       FROM lich_lam_viec llv
       JOIN ca_lam_viec ca ON ca.id = llv.ca_lam_viec_id
       WHERE llv.nhan_vien_id = ? AND llv.ngay_lam = ?
       ORDER BY ca.gio_bat_dau ASC`,
      [nhanVienId, ngay],
    );
  }

  // ─── Cấu hình WiFi ─────────────────────────────────────────────────────────

  async layCauHinhChamCong(): Promise<{ bat_buoc_wifi: boolean; danh_sach_ip: string[] }> {
    const row = await this.caiDatRepo.findOneBy({ khoaCaiDat: CHAM_CONG_KEY });
    return row?.giaTri ?? { bat_buoc_wifi: false, danh_sach_ip: [] };
  }

  async capNhatCauHinhChamCong(giaTri: { bat_buoc_wifi: boolean; danh_sach_ip: string[] }) {
    let row = await this.caiDatRepo.findOneBy({ khoaCaiDat: CHAM_CONG_KEY });
    if (!row) {
      row = this.caiDatRepo.create({ khoaCaiDat: CHAM_CONG_KEY, giaTri, ghiChu: 'Cấu hình chấm công' });
    } else {
      row.giaTri = giaTri;
    }
    const savedRow = await this.caiDatRepo.save(row);
    try {
      const log = this.nhatKyRepo.create({
        tenNguoiDung: 'admin',
        vaiTro: 'quan_tri_vien',
        hanhDong: 'CAI_DAT_CHAM_CONG',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Cập nhật cấu hình chấm công WiFi: Bắt buộc WiFi = ${giaTri.bat_buoc_wifi ? 'Có' : 'Không'}, ${giaTri.danh_sach_ip?.length || 0} IP được phép`,
        diaChiIp: '127.0.0.1',
        userAgent: 'Trình duyệt hệ thống',
      });
      await this.nhatKyRepo.save(log);
    } catch (err) {}
    return savedRow;
  }

  // ─── Kiểm tra IP mạng hợp lệ ──────────────────────────────────────────────

  getLanIp(): string {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const net of ifaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  private normalizeIp(ip: string): string {
    if (!ip) return '';
    let res = ip.trim();
    if (res.startsWith('::ffff:')) res = res.slice(7);
    if (res === '::1') return '127.0.0.1';
    return res;
  }

  async kiemTraIpHopLe(clientIp: string): Promise<{ hopLe: boolean; ip: string; lyDo?: string }> {
    const cfg = await this.layCauHinhChamCong();
    const rawIp = clientIp || '127.0.0.1';
    const normClient = this.normalizeIp(rawIp);
    const lanIp = this.getLanIp();
    const isLocal = normClient === '127.0.0.1' || rawIp === '::1';
    const clientDisplayIp = isLocal && lanIp ? lanIp : normClient;

    if (!cfg.bat_buoc_wifi) {
      return { hopLe: true, ip: clientDisplayIp };
    }

    const whitelist = (cfg.danh_sach_ip || []).map((x: string) => this.normalizeIp(x));
    const hopLe = whitelist.includes(normClient) || whitelist.includes(rawIp) || (isLocal && (whitelist.includes('127.0.0.1') || (lanIp && whitelist.includes(lanIp))));

    return {
      hopLe,
      ip: clientDisplayIp,
      lyDo: hopLe ? undefined : `IP [${clientDisplayIp}] không thuộc danh sách WiFi phòng khám được phép chấm công`,
    };
  }

  // ─── Gọi Python ML xác thực khuôn mặt & Live Presence ───────────────────────

  async xacThucKhuonMat(params: {
    frameBase64: string;
    refImagePath: string;
    framesB64?: string[];
  }): Promise<{ hopLe: boolean; doKhop: number; liveness: boolean; lyDo?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${PYTHON_ML_URL}/verify-face`,
          {
            frame_base64: params.frameBase64,
            ref_image_path: params.refImagePath,
            frames_b64: params.framesB64 && params.framesB64.length >= 2 ? params.framesB64 : null,
          },
          { timeout: 25000 },
        ),
      );
      const data = response.data;
      const verified = data.verified === true;
      const liveness = data.liveness === true;
      const doKhop = data.similarity_percent ?? Math.round((data.similarity || 0) * 100);

      return {
        hopLe: verified && liveness,
        doKhop,
        liveness,
        lyDo: verified && liveness
          ? undefined
          : !liveness
          ? (data.reason || 'Không phát hiện khuôn mặt hợp lệ trước camera')
          : (data.reason || `Độ khớp khuôn mặt đạt ${doKhop}%, chưa đạt yêu cầu ~70%`),
      };
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message;
      throw new BadRequestException('Lỗi dịch vụ phân tích khuôn mặt (Python ML): ' + msg);
    }
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────

  async checkIn(userId: number, clientIp: string, frameBase64: string, framesB64?: string[]) {
    const nv = await this.layNhanVienTheoUserId(userId);

    const now = new Date();
    const ngayCham = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const gioVao = now.toTimeString().slice(0, 8);

    // 1. Phải xem hôm nay có lịch làm việc không
    const shifts = await this.timLichLamViecHomNay(nv.id, ngayCham);
    if (!shifts || shifts.length === 0) {
      throw new BadRequestException('Hôm nay bạn không có lịch phân ca làm việc nên không thể chấm công.');
    }

    // 2. Kiểm tra WiFi
    const ipCheck = await this.kiemTraIpHopLe(clientIp);
    if (!ipCheck.hopLe) throw new ForbiddenException(ipCheck.lyDo);

    // 3. Đã check-in chưa
    const existing = await this.chamCongRepo.findOneBy({ nhanVienId: nv.id, ngayCham });
    if (existing?.gioVao) {
      throw new BadRequestException(`Bạn đã check-in ngày hôm nay lúc ${existing.gioVao}`);
    }

    // 4. Lấy ảnh mẫu nhân viên (chỉ Admin mới có quyền cập nhật)
    const refPath = await this.layAnhMauNhanVien(nv);

    // 5. Xác thực khuôn mặt (ngưỡng ~70%, thực thể sống)
    const faceCheck = await this.xacThucKhuonMat({
      frameBase64,
      refImagePath: refPath,
      framesB64,
    });
    if (!faceCheck.hopLe) throw new BadRequestException(faceCheck.lyDo);
    const doKhop = faceCheck.doKhop;

    // 6. Tính trạng thái: Đi muộn dựa trên ca sớm nhất trong ngày
    const caSomNhat = shifts[0];
    const [hBD, mBD] = (caSomNhat.gio_bat_dau || '08:00:00').split(':').map(Number);
    const [hVao, mVao] = gioVao.split(':').map(Number);
    const diffMinutes = (hVao * 60 + mVao) - (hBD * 60 + mBD);
    const trangThai = diffMinutes > 15 ? 'di_muon' : 'dung_gio';

    const anhFilename = await this.luuAnhChamCong(frameBase64, nv.id, 'in');
    const moTaCa = shifts.length > 1
      ? `Lịch làm ${shifts.length} ca: ${shifts.map(s => s.ten_ca).join(', ')}`
      : `Ca: ${caSomNhat.ten_ca} (${caSomNhat.gio_bat_dau.slice(0, 5)} - ${caSomNhat.gio_ket_thuc.slice(0, 5)})`;

    const record = existing ?? this.chamCongRepo.create({ nhanVienId: nv.id, ngayCham });
    record.gioVao = gioVao;
    record.caLamViecId = caSomNhat.ca_lam_viec_id;
    record.anhCheckin = anhFilename;
    record.ipChamCong = ipCheck.ip;
    record.doKhop = doKhop;
    record.trangThai = trangThai;
    record.ghiChu = moTaCa;

    await this.chamCongRepo.save(record);

    try {
      const userObj = await this.dataSource.query('SELECT ten_dang_nhap FROM nguoi_dung WHERE id = ?', [userId]);
      const log = this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: userObj?.[0]?.ten_dang_nhap || `nv_${nv.id}`,
        vaiTro: nv.chucVu?.toLowerCase().includes('bác') ? 'bac_si' : 'nhan_vien',
        hanhDong: 'CHECKIN_CHAM_CONG',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Nhân viên "${nv.hoTen}" check-in ca làm việc lúc ${gioVao} (${trangThai === 'di_muon' ? 'Đi muộn' : 'Đúng giờ'}, độ khớp khuôn mặt ${doKhop}%)`,
        diaChiIp: ipCheck.ip || '127.0.0.1',
        userAgent: 'Hệ thống nhận diện AI Face',
      });
      await this.nhatKyRepo.save(log);
    } catch (logErr) {
      console.error('Lỗi ghi nhật ký check-in:', logErr);
    }

    return {
      success: true,
      gioVao,
      trangThai,
      doKhop,
      thongBao: `Check-in thành công! (${moTaCa})`,
    };
  }

  // ─── Check-out ───────────────────────────────────────────────────────────────

  async checkOut(userId: number, clientIp: string, frameBase64: string, framesB64?: string[]) {
    const nv = await this.layNhanVienTheoUserId(userId);

    const now = new Date();
    const ngayCham = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const gioRa = now.toTimeString().slice(0, 8);

    // 1. Phải xem hôm nay có lịch làm việc không
    const shifts = await this.timLichLamViecHomNay(nv.id, ngayCham);
    if (!shifts || shifts.length === 0) {
      throw new BadRequestException('Hôm nay bạn không có lịch phân ca làm việc.');
    }

    // 2. Phải check-in trước
    const record = await this.chamCongRepo.findOneBy({ nhanVienId: nv.id, ngayCham });
    if (!record?.gioVao) {
      throw new BadRequestException('Bạn chưa check-in hôm nay. Vui lòng check-in vào ca trước.');
    }
    if (record.gioRa) {
      throw new BadRequestException(`Bạn đã check-out ngày hôm nay lúc ${record.gioRa}`);
    }

    // 3. Kiểm tra WiFi
    const ipCheck = await this.kiemTraIpHopLe(clientIp);
    if (!ipCheck.hopLe) throw new ForbiddenException(ipCheck.lyDo);

    // 4. Lấy ảnh mẫu (chỉ Admin mới có quyền cập nhật)
    const refPath = await this.layAnhMauNhanVien(nv);

    // 5. Xác thực khuôn mặt
    const faceCheck = await this.xacThucKhuonMat({
      frameBase64,
      refImagePath: refPath,
      framesB64,
    });
    if (!faceCheck.hopLe) throw new BadRequestException(faceCheck.lyDo);

    // 6. Tính thời gian về so với ca muộn nhất
    const gioKetThucMuonNhat = shifts.reduce(
      (max, s) => (s.gio_ket_thuc > max ? s.gio_ket_thuc : max),
      shifts[0].gio_ket_thuc,
    );
    const [hKT, mKT] = gioKetThucMuonNhat.split(':').map(Number);
    const [hRa, mRa] = gioRa.split(':').map(Number);
    const diffOutMinutes = (hKT * 60 + mKT) - (hRa * 60 + mRa);

    let extraNote = '';
    if (diffOutMinutes > 15) {
      extraNote = ` (Về sớm ${diffOutMinutes} phút so với ca kết thúc lúc ${gioKetThucMuonNhat.slice(0, 5)})`;
    }

    const anhFilename = await this.luuAnhChamCong(frameBase64, nv.id, 'out');
    record.gioRa = gioRa;
    record.anhCheckout = anhFilename;
    if (extraNote) {
      record.ghiChu = (record.ghiChu ? record.ghiChu + ' | ' : '') + extraNote.trim();
    }

    await this.chamCongRepo.save(record);

    try {
      const userObj = await this.dataSource.query('SELECT ten_dang_nhap FROM nguoi_dung WHERE id = ?', [userId]);
      const log = this.nhatKyRepo.create({
        nguoiDungId: userId,
        tenNguoiDung: userObj?.[0]?.ten_dang_nhap || `nv_${nv.id}`,
        vaiTro: nv.chucVu?.toLowerCase().includes('bác') ? 'bac_si' : 'nhan_vien',
        hanhDong: 'CHECKOUT_CHAM_CONG',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `Nhân viên "${nv.hoTen}" check-out ca làm việc lúc ${gioRa} (độ khớp ${faceCheck.doKhop}%)${extraNote}`,
        diaChiIp: ipCheck.ip || '127.0.0.1',
        userAgent: 'Hệ thống nhận diện AI Face',
      });
      await this.nhatKyRepo.save(log);
    } catch (logErr) {
      console.error('Lỗi ghi nhật ký check-out:', logErr);
    }

    return {
      success: true,
      gioRa,
      doKhop: faceCheck.doKhop,
      thongBao: 'Check-out hoàn tất ca làm việc thành công!',
    };
  }

  // ─── Trạng thái hôm nay ─────────────────────────────────────────────────────

  async trangThaiHomNay(userId: number) {
    const nv = await this.nhanVienRepo.findOneBy({ nguoiDungId: userId });
    if (!nv) return null;

    const now = new Date();
    const ngayCham = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const chamCong = await this.chamCongRepo.findOne({
      where: { nhanVienId: nv.id, ngayCham },
      relations: ['caLamViec'],
    });

    const shifts = await this.timLichLamViecHomNay(nv.id, ngayCham);

    return {
      ...chamCong,
      coAnhMau: !!nv.anhDaiDien,
      coLichHomNay: shifts.length > 0,
      soCaHomNay: shifts.length,
      danhSachCa: shifts,
    };
  }

  // ─── Lịch sử cá nhân ────────────────────────────────────────────────────────

  async layLichSuCaNhan(userId: number, tuNgay?: string, denNgay?: string) {
    const nv = await this.nhanVienRepo.findOneBy({ nguoiDungId: userId });
    if (!nv) return [];

    const qb = this.chamCongRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.caLamViec', 'ca')
      .where('cc.nhan_vien_id = :id', { id: nv.id })
      .orderBy('cc.ngay_cham', 'DESC');

    if (tuNgay) qb.andWhere('cc.ngay_cham >= :tuNgay', { tuNgay });
    if (denNgay) qb.andWhere('cc.ngay_cham <= :denNgay', { denNgay });

    if (tuNgay || denNgay) {
      qb.limit(100);
    } else {
      qb.limit(30);
    }

    return qb.getMany();
  }

  // ─── Lịch sử toàn bộ (Admin / Ban giám đốc) ──────────────────────────────────

  async layLichSuToanBo(ngay?: string, nhanVienId?: number, tuNgay?: string, denNgay?: string) {
    const qb = this.chamCongRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.nhanVien', 'nv')
      .leftJoinAndSelect('cc.caLamViec', 'ca')
      .orderBy('cc.ngay_cham', 'DESC')
      .addOrderBy('nv.ho_ten', 'ASC')
      .limit(500);

    if (ngay) {
      qb.andWhere('cc.ngay_cham = :ngay', { ngay });
    } else {
      if (tuNgay) qb.andWhere('cc.ngay_cham >= :tuNgay', { tuNgay });
      if (denNgay) qb.andWhere('cc.ngay_cham <= :denNgay', { denNgay });
    }
    if (nhanVienId) qb.andWhere('cc.nhan_vien_id = :id', { id: nhanVienId });

    return qb.getMany();
  }

  // ─── Chấm công thủ công (Ban Giám đốc & Quản trị viên) ────────────────────────
  async chamCongThuCong(data: {
    nhanVienId: number;
    ngayCham: string;
    gioVao?: string;
    gioRa?: string;
    caLamViecId?: number;
    trangThai?: string;
    ghiChu?: string;
    nguoiThucHien?: string;
  }) {
    const nv = await this.nhanVienRepo.findOneBy({ id: data.nhanVienId });
    if (!nv) {
      throw new BadRequestException(`Không tìm thấy nhân viên ID ${data.nhanVienId}`);
    }

    if (!data.ngayCham) {
      throw new BadRequestException('Vui lòng chọn ngày chấm công');
    }

    let record = await this.chamCongRepo.findOneBy({
      nhanVienId: data.nhanVienId,
      ngayCham: data.ngayCham,
    });

    if (!record) {
      record = this.chamCongRepo.create({
        nhanVienId: data.nhanVienId,
        ngayCham: data.ngayCham,
      });
    }

    if (data.gioVao) record.gioVao = data.gioVao.length === 5 ? `${data.gioVao}:00` : data.gioVao;
    if (data.gioRa) record.gioRa = data.gioRa.length === 5 ? `${data.gioRa}:00` : data.gioRa;
    if (data.caLamViecId) record.caLamViecId = data.caLamViecId;
    if (data.trangThai) record.trangThai = data.trangThai;

    const nguoiTh = data.nguoiThucHien || 'Giám đốc';
    const noteLyDo = data.ghiChu ? ` - Lý do: ${data.ghiChu}` : '';
    const saved = await this.chamCongRepo.save(record);

    try {
      const log = this.nhatKyRepo.create({
        tenNguoiDung: 'giamdoc',
        vaiTro: 'ban_giam_doc',
        hanhDong: 'CHAM_CONG_THU_CONG',
        loaiNhatKy: LoaiNhatKy.INFO,
        moTa: `${nguoiTh} thực hiện chấm công thủ công cho nhân viên "${nv.hoTen}" ngày ${data.ngayCham} (${data.gioVao ? `Vào: ${data.gioVao}` : ''}${data.gioRa ? `, Ra: ${data.gioRa}` : ''})${noteLyDo}`,
        diaChiIp: '127.0.0.1',
        userAgent: 'Trình duyệt hệ thống',
      });
      await this.nhatKyRepo.save(log);
    } catch (err) {}

    return {
      success: true,
      message: 'Chấm công thủ công thành công',
      data: saved,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async luuAnhChamCong(base64: string, nhanVienId: number, loai: 'in' | 'out'): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'cham-cong');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `cc_${nhanVienId}_${loai}_${Date.now()}.jpg`;
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(data, 'base64'));
    return `/uploads/cham-cong/${filename}`;
  }
}
