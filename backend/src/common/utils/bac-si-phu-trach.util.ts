import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BacSi } from '../../modules/nhan-vien/entities/bac-si.entity';

/** Hồ sơ bác sĩ của tài khoản đang đăng nhập (null nếu không phải bác sĩ) */
export function bacSiCuaUser(manager: EntityManager, user: any) {
  const nguoiDungId = user?.id || user?.userId;
  if (!nguoiDungId) return Promise.resolve(null);
  return manager.findOne(BacSi, { where: { nhanVien: { nguoiDungId } } });
}

/**
 * Bác sĩ chỉ thao tác trên lượt / phiếu khám của mình (chống IDOR giữa các bác sĩ).
 * Vai trò khác (lễ tân, quản trị) không bị giới hạn ở đây — quyền của họ do @Roles quyết định.
 */
export async function assertBacSiPhuTrach(manager: EntityManager, user: any, bacSiId?: number | null) {
  if (user?.vai_tro !== 'bac_si') return;
  const bs = await bacSiCuaUser(manager, user);
  if (!bs || bs.id !== bacSiId) {
    throw new ForbiddenException({ code: 'KHONG_PHAI_BAC_SI_PHU_TRACH', message: 'Bạn không phải bác sĩ phụ trách lượt khám này.' });
  }
}
