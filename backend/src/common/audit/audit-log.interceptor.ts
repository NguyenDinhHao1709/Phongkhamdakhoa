import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import { LoaiNhatKy, NhatKyHeThong } from '../../modules/quan-ly/entities/nhat-ky-he-thong.entity';
import {
  AUDIT_AUTH_ACTIONS, AUDIT_EXPORT_ROUTE, AUDIT_PATIENT_ALLOWED, AUDIT_SKIP, auditActionCode,
} from './audit-log.config';

/** Ngữ cảnh 1 request: đánh dấu nếu code nghiệp vụ đã tự ghi nhật ký (tránh ghi trùng) */
export const auditContext = new AsyncLocalStorage<{ daGhiLog: boolean }>();

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Tự động ghi nhật ký mọi thao tác thêm/sửa/xóa của nhân viên, bác sĩ, giám đốc, admin;
 * bệnh nhân chỉ ghi các thao tác trong AUDIT_PATIENT_ALLOWED. Tên thao tác lấy từ @ApiOperation summary.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  constructor(private readonly dataSource: DataSource, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const route: string = String(req.route?.path || req.path || '').replace(/^\/api/, '').replace(/\/$/, '') || '/';
    if (!MUTATING.has(req.method) || AUDIT_SKIP.some((re) => re.test(route))) return next.handle();

    const summary: string = this.reflector.get('swagger/apiOperation', context.getHandler())?.summary || '';
    const store = { daGhiLog: false };
    return new Observable((subscriber) =>
      auditContext.run(store, () =>
        next.handle().pipe(
          tap({
            next: (res) => this.ghi(req, route, summary, store, true, res),
            error: (err) => this.ghi(req, route, summary, store, false, err),
          }),
        ).subscribe(subscriber),
      ),
    );
  }

  private ghi(req: any, route: string, summary: string, store: { daGhiLog: boolean }, ok: boolean, result: any) {
    if (store.daGhiLog) return; // code nghiệp vụ đã ghi nhật ký chi tiết cho request này
    const entry = this.taoBanGhi(req, route, summary, ok, result);
    if (!entry) return;
    // Ghi ngầm: lỗi ghi log không ảnh hưởng thao tác chính
    this.dataSource.getRepository(NhatKyHeThong).insert(entry)
      .catch((e) => this.logger.warn(`Không ghi được nhật ký ${route}: ${e.message}`));
  }

  private taoBanGhi(req: any, route: string, summary: string, ok: boolean, result: any): Partial<NhatKyHeThong> | null {
    const module = route.split('/')[1] || '';
    const rawMsg = ok ? '' : result?.response?.message || result?.message || 'Lỗi không xác định';
    const loiMsg = Array.isArray(rawMsg) ? rawMsg.join('; ') : String(rawMsg);
    const status = ok ? 200 : Number(result?.status || result?.getStatus?.() || 500);
    const base = {
      diaChiIp: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 50) || null,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 255) || null,
    };

    // Đăng nhập: chưa có req.user → lấy người dùng từ kết quả, hoặc tên đăng nhập đã thử khi thất bại
    if (route === '/auth/login') {
      const user = result?.data?.user || result?.user;
      return ok
        ? { ...base, nguoiDungId: user?.id, tenNguoiDung: user?.tenDangNhap || req.body?.tenDangNhap, vaiTro: user?.vaiTro || 'chua_xac_dinh',
            hanhDong: 'DANG_NHAP_THANH_CONG', loaiNhatKy: LoaiNhatKy.INFO, moTa: 'Đăng nhập hệ thống thành công' }
        : { ...base, nguoiDungId: null, tenNguoiDung: String(req.body?.tenDangNhap || 'không rõ').slice(0, 100), vaiTro: 'chua_xac_dinh',
            hanhDong: 'DANG_NHAP_THAT_BAI', loaiNhatKy: LoaiNhatKy.SECURITY, moTa: `Đăng nhập thất bại: ${loiMsg}` };
    }

    const user = req.user;
    const vaiTro: string = user?.maVaiTro || user?.vai_tro || 'chua_xac_dinh';
    const laBenhNhan = vaiTro === 'benh_nhan' || user?.loaiTaiKhoan === 'benh_nhan';
    const congKhaiTheoEmail = !user && /^\/auth\/(forgot-password-otp|reset-password)$/.test(route);
    if (!user && !congKhaiTheoEmail) return null; // khách vãng lai, webhook, kiosk
    if (laBenhNhan && !AUDIT_PATIENT_ALLOWED.some((re) => re.test(route))) return null;

    const laXuatFile = route === AUDIT_EXPORT_ROUTE;
    const hanhDong = laXuatFile ? 'XUAT_FILE' : AUDIT_AUTH_ACTIONS[route] || auditActionCode(module);
    const thaoTac = laXuatFile
      ? `Xuất file "${String(req.body?.tenFile || '').slice(0, 150)}"${req.body?.trang ? ` tại ${String(req.body.trang).slice(0, 100)}` : ''}`
      : summary || `${req.method} ${route}`;
    const loaiNhatKy = ok ? LoaiNhatKy.INFO
      : status === 401 || status === 403 ? LoaiNhatKy.SECURITY
        : status >= 500 ? LoaiNhatKy.ERROR : LoaiNhatKy.WARNING;

    return {
      ...base,
      nguoiDungId: user?.id || null,
      tenNguoiDung: String(user?.tenDangNhap || req.body?.email || 'không rõ').slice(0, 100),
      vaiTro,
      hanhDong,
      loaiNhatKy,
      // Định dạng: "<thao tác> · <kết quả> · <METHOD đường dẫn thật>" (trang Nhật ký lấy phần đầu làm cột Thao tác)
      moTa: [thaoTac, ok ? null : `Thất bại: ${loiMsg}`, `${req.method} ${req.originalUrl || route}`].filter(Boolean).join(' · '),
    };
  }
}
