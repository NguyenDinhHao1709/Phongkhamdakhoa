import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY, QUYEN_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MemoryCacheService } from '../cache/memory-cache.service';

/** Khóa cache quyền của 1 vai trò — xóa bằng invalidatePrefix(QUYEN_CACHE_PREFIX) khi Admin đổi ma trận */
export const QUYEN_CACHE_PREFIX = 'quyen-vt:';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
    private cache: MemoryCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    const requiredQuyen = this.reflector.getAllAndOverride<string[]>(QUYEN_KEY, targets);

    // Không yêu cầu gì → chỉ cần đăng nhập
    if (!requiredRoles?.length && !requiredQuyen?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException({ code: 'KHONG_CO_QUYEN', message: 'Không có quyền truy cập' });

    if (requiredRoles?.length && !requiredRoles.includes(user.vai_tro) && !requiredRoles.includes(user.ma_vai_tro)) {
      throw new ForbiddenException({
        code: 'KHONG_CO_QUYEN',
        message: `Chức năng này yêu cầu vai trò: ${requiredRoles.join(', ')}`,
      });
    }

    // Ma trận phân quyền chỉ áp cho nhân sự nội bộ; Super Admin gốc luôn toàn quyền
    if (!requiredQuyen?.length || user.loaiTaiKhoan === 'benh_nhan' || user.ma_vai_tro === 'benh_nhan'
      || user.ma_vai_tro === 'quan_tri_vien_cap_cao') {
      return true;
    }

    const quyenCuaVaiTro = await this.cache.getOrSet<string[]>(`${QUYEN_CACHE_PREFIX}${user.vaiTroId}`, 30_000, async () => {
      const rows: { ma: string }[] = await this.dataSource.query(
        `SELECT q.ma_quyen AS ma FROM vai_tro_quyen_han vq
           JOIN quyen_han q ON q.id = vq.quyen_han_id
          WHERE vq.vai_tro_id = ?`,
        [user.vaiTroId],
      );
      return rows.map(r => r.ma);
    });

    if (!requiredQuyen.some(ma => quyenCuaVaiTro.includes(ma))) {
      throw new ForbiddenException({
        code: 'KHONG_CO_QUYEN',
        message: 'Vai trò của bạn chưa được cấp quyền dùng chức năng này. Liên hệ Quản trị viên.',
      });
    }
    return true;
  }
}
