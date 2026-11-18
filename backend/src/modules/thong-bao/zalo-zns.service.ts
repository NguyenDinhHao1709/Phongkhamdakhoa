import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { voiKhoaDb } from '../../common/utils/db-sequence.util';

/** Loại tin ZNS; mỗi loại ứng với 1 mẫu (template) đã được Zalo duyệt, ID khai báo qua biến môi trường */
export type LoaiTinZns = 'nhac_lich' | 'xac_nhan_lich' | 'co_ket_qua';

const BIEN_TEMPLATE: Record<LoaiTinZns, string> = {
  nhac_lich: 'ZNS_TEMPLATE_NHAC_LICH',
  xac_nhan_lich: 'ZNS_TEMPLATE_XAC_NHAN_LICH',
  co_ket_qua: 'ZNS_TEMPLATE_CO_KET_QUA',
};

// Zalo giới hạn độ dài mỗi tham số mẫu (phần lớn kiểu tham số tối đa 30 ký tự)
const DO_DAI_THAM_SO = 30;
// Mã lỗi ZNS khi access token sai/hết hạn → làm mới token rồi gửi lại 1 lần
const LOI_TOKEN = new Set([-124]);

export interface KetQuaGuiZns {
  ok: boolean;
  /** Không gửi vì chưa cấu hình / thiếu số điện thoại / đã gửi trước đó */
  boQua?: string;
  msgId?: string;
  maLoi?: number;
  loi?: string;
}

interface GuiZnsInput {
  loai: LoaiTinZns;
  soDienThoai?: string | null;
  thamSo: Record<string, string | number | null | undefined>;
  lichHenId?: number | null;
  benhNhanId?: number | null;
  /** Đã có tin gửi thành công cùng khóa → không gửi nữa (vd `nhac_lich:123`) */
  khoaChongTrung?: string;
}

/**
 * Gửi tin Zalo Notification Service (ZNS) tới số điện thoại bệnh nhân.
 * Chỉ dùng SQL thô với 2 bảng zalo_oa_token / lich_su_gui_zalo: backend chưa chạy migration thì
 * mọi lời gọi trả về lỗi đã ghi log, không làm hỏng luồng đặt lịch / email.
 */
@Injectable()
export class ZaloZnsService {
  private readonly logger = new Logger('ZaloZNS');

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  private env(key: string) {
    return (this.config.get<string>(key) || '').trim();
  }

  templateId(loai: LoaiTinZns) {
    return this.env(BIEN_TEMPLATE[loai]);
  }

  daCauHinh() {
    return Boolean(this.env('ZALO_APP_ID') && this.env('ZALO_APP_SECRET'));
  }

  /** 0901234567 / +84901234567 → 84901234567; số không hợp lệ → null */
  static chuanHoaSdt(so?: string | null): string | null {
    const d = String(so || '').replace(/\D/g, '');
    if (/^0\d{9}$/.test(d)) return `84${d.slice(1)}`;
    if (/^84\d{9}$/.test(d)) return d;
    return null;
  }

  // ─── TOKEN OA ────────────────────────────────────────────────

  private async docToken(): Promise<{ access_token: string | null; refresh_token: string | null; het_han: Date | null } | null> {
    const rows: any[] = await this.dataSource.query('SELECT access_token, refresh_token, het_han FROM zalo_oa_token WHERE id = 1');
    return rows[0] || null;
  }

  private conHan(row: { access_token: string | null; het_han: Date | null } | null) {
    return Boolean(row?.access_token && row.het_han && new Date(row.het_han).getTime() - Date.now() > 5 * 60_000);
  }

  /**
   * Access token còn hạn thì dùng luôn; hết hạn thì làm mới trong khóa DB.
   * `tokenLoi`: token vừa bị Zalo từ chối — chỉ làm mới nếu instance khác chưa làm mới thay.
   */
  private async layAccessToken(tokenLoi?: string): Promise<string> {
    const truoc = await this.docToken();
    if (!tokenLoi && this.conHan(truoc)) return truoc!.access_token!;

    // Refresh token dùng 1 lần: 2 instance cùng làm mới thì instance sau làm hỏng token → bắt buộc khóa
    return voiKhoaDb(this.dataSource, 'zalo:oa_token', async () => {
      const row = await this.docToken();
      const daDoiToken = tokenLoi && row?.access_token && row.access_token !== tokenLoi;
      if ((!tokenLoi || daDoiToken) && this.conHan(row)) return row!.access_token!;
      return this.lamMoiToken(row?.refresh_token || this.env('ZALO_OA_REFRESH_TOKEN'));
    }, 20);
  }

  private async lamMoiToken(refreshToken: string): Promise<string> {
    if (!refreshToken) {
      throw new Error('Chưa có refresh token của Zalo OA (nhập ở API /thong-bao/zalo/token hoặc biến ZALO_OA_REFRESH_TOKEN)');
    }
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      app_id: this.env('ZALO_APP_ID'),
      grant_type: 'refresh_token',
    });
    const { data } = await axios.post('https://oauth.zaloapp.com/v4/oa/access_token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: this.env('ZALO_APP_SECRET') },
      timeout: 10_000,
    });
    if (!data?.access_token) {
      throw new Error(`Zalo từ chối làm mới token: ${data?.error_description || data?.error_name || data?.message || JSON.stringify(data)}`);
    }
    const hetHan = new Date(Date.now() + Number(data.expires_in || 90_000) * 1000);
    await this.dataSource.query(
      `INSERT INTO zalo_oa_token (id, access_token, refresh_token, het_han) VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), het_han = VALUES(het_han)`,
      [data.access_token, data.refresh_token || refreshToken, hetHan],
    );
    this.logger.log(`Đã làm mới access token Zalo OA, hết hạn ${hetHan.toISOString()}`);
    return data.access_token;
  }

  /** Quản trị nhập refresh token lấy từ công cụ của Zalo; làm mới ngay để kiểm tra token hợp lệ */
  async datRefreshToken(refreshToken: string) {
    if (!this.daCauHinh()) throw new Error('Chưa cấu hình ZALO_APP_ID / ZALO_APP_SECRET');
    return voiKhoaDb(this.dataSource, 'zalo:oa_token', () => this.lamMoiToken(refreshToken.trim()), 20).then(() => this.trangThai());
  }

  async trangThai() {
    let token: Awaited<ReturnType<ZaloZnsService['docToken']>> = null;
    let loiBang: string | null = null;
    try {
      token = await this.docToken();
    } catch (e: any) {
      loiBang = `Chưa chạy migration 20261123_thong_bao_zalo_zns.sql (${e?.message})`;
    }
    return {
      daCauHinhApp: this.daCauHinh(),
      cheDo: this.env('ZNS_MODE') === 'development' ? 'development' : 'production',
      coRefreshToken: Boolean(token?.refresh_token || this.env('ZALO_OA_REFRESH_TOKEN')),
      accessTokenHetHan: token?.het_han || null,
      templates: Object.fromEntries((Object.keys(BIEN_TEMPLATE) as LoaiTinZns[]).map((l) => [l, this.templateId(l) || null])),
      loi: loiBang,
    };
  }

  // ─── GỬI TIN ─────────────────────────────────────────────────

  private async goiApiGui(accessToken: string, payload: Record<string, any>) {
    const { data } = await axios.post('https://business.openapi.zalo.me/message/template', payload, {
      headers: { 'Content-Type': 'application/json', access_token: accessToken },
      timeout: 10_000,
    });
    return data as { error: number; message?: string; data?: { msg_id?: string } };
  }

  async gui(input: GuiZnsInput): Promise<KetQuaGuiZns> {
    const templateId = this.templateId(input.loai);
    if (!this.daCauHinh() || !templateId) return { ok: false, boQua: 'chua_cau_hinh' };
    const phone = ZaloZnsService.chuanHoaSdt(input.soDienThoai);
    if (!phone) return { ok: false, boQua: 'khong_co_so_dien_thoai' };

    try {
      if (input.khoaChongTrung) {
        const [daGui]: any[] = await this.dataSource.query(
          `SELECT id FROM lich_su_gui_zalo WHERE khoa_chong_trung = ? AND trang_thai = 'thanh_cong' LIMIT 1`,
          [input.khoaChongTrung],
        );
        if (daGui) return { ok: true, boQua: 'da_gui_truoc_do' };
      }

      const templateData = Object.fromEntries(
        Object.entries(input.thamSo).map(([k, v]) => [k, String(v ?? '').trim().slice(0, DO_DAI_THAM_SO) || '-']),
      );
      const payload: Record<string, any> = {
        phone,
        template_id: templateId,
        template_data: templateData,
        tracking_id: `${input.loai}_${input.lichHenId || input.benhNhanId || 0}_${Date.now()}`.slice(0, 48),
      };
      // Chế độ development: chỉ gửi được tới số của quản trị viên OA/app, không tính phí — dùng khi demo
      if (this.env('ZNS_MODE') === 'development') payload.mode = 'development';

      let token = await this.layAccessToken();
      let res = await this.goiApiGui(token, payload);
      if (LOI_TOKEN.has(res?.error)) {
        token = await this.layAccessToken(token);
        res = await this.goiApiGui(token, payload);
      }

      const ok = res?.error === 0;
      const kq: KetQuaGuiZns = ok
        ? { ok, msgId: res.data?.msg_id }
        : { ok, maLoi: res?.error, loi: res?.message || 'Zalo trả lỗi không rõ' };
      await this.ghiLichSu(input, phone, templateId, kq);
      if (!ok) this.logger.warn(`Gửi ZNS ${input.loai} tới ${phone} lỗi ${kq.maLoi}: ${kq.loi}`);
      return kq;
    } catch (e: any) {
      const kq: KetQuaGuiZns = { ok: false, loi: e?.message || String(e) };
      await this.ghiLichSu(input, phone, templateId, kq).catch(() => {});
      this.logger.warn(`Gửi ZNS ${input.loai} tới ${phone} thất bại: ${kq.loi}`);
      return kq;
    }
  }

  private ghiLichSu(input: GuiZnsInput, phone: string, templateId: string, kq: KetQuaGuiZns) {
    return this.dataSource.query(
      `INSERT INTO lich_su_gui_zalo
        (loai, khoa_chong_trung, lich_hen_id, benh_nhan_id, so_dien_thoai, template_id, trang_thai, ma_loi, thong_bao_loi, msg_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.loai,
        input.khoaChongTrung || null,
        input.lichHenId || null,
        input.benhNhanId || null,
        phone,
        templateId,
        kq.ok ? 'thanh_cong' : 'that_bai',
        kq.maLoi ?? null,
        kq.loi ? kq.loi.slice(0, 255) : null,
        kq.msgId || null,
      ],
    );
  }

  /**
   * Tin về lịch hẹn (nhắc lịch / xác nhận). Tham số mẫu ZNS cần khai báo đúng tên:
   * ten_benh_nhan, ma_lich_hen, ngay_hen (dd/mm/yyyy), gio_hen, bac_si, dia_diem
   */
  async guiTheoLichHen(loai: 'nhac_lich' | 'xac_nhan_lich', lh: any): Promise<KetQuaGuiZns> {
    if (!this.daCauHinh() || !this.templateId(loai)) return { ok: false, boQua: 'chua_cau_hinh' };
    let diaDiem = 'Khám trực tuyến';
    if (lh.hinhThuc !== 'truc_tuyen') {
      const [pk]: any[] = lh.phongKhamId
        ? await this.dataSource.query('SELECT ten_phong FROM phong_kham WHERE id = ?', [lh.phongKhamId]).catch(() => [])
        : [];
      diaDiem = pk?.ten_phong || 'Phòng khám';
    }
    const [y, m, d] = String(lh.ngayHen || '').slice(0, 10).split('-');
    return this.gui({
      loai,
      soDienThoai: lh.benhNhan?.soDienThoai,
      lichHenId: lh.id,
      benhNhanId: lh.benhNhanId,
      khoaChongTrung: `${loai}:${lh.id}`,
      thamSo: {
        ten_benh_nhan: lh.benhNhan?.hoTen || 'Quý khách',
        ma_lich_hen: lh.maLichHen,
        ngay_hen: d ? `${d}/${m}/${y}` : '',
        gio_hen: String(lh.gioHen || '').slice(0, 5),
        bac_si: lh.bacSi?.nhanVien?.hoTen || 'Phòng khám phân công',
        dia_diem: diaDiem,
      },
    });
  }

  async lichSu(limit = 50) {
    return this.dataSource.query(
      `SELECT l.*, bn.ho_ten AS ten_benh_nhan FROM lich_su_gui_zalo l
       LEFT JOIN benh_nhan bn ON bn.id = l.benh_nhan_id
       ORDER BY l.id DESC LIMIT ?`,
      [Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
  }
}
