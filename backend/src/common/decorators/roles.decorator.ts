import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * Decorator gắn danh sách vai trò được phép truy cập route.
 * @example @Roles('bac_si', 'tiep_tan')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const QUYEN_KEY = 'quyen';
/**
 * Gắn mã quyền (ma trận Phân quyền) cần có để gọi route — đủ 1 trong các mã là qua.
 * Chỉ áp cho tài khoản nội bộ; Quản trị viên cấp cao luôn qua. Dùng kèm @Roles.
 * @example @Quyen('hoa_don.thanh_toan')
 */
export const Quyen = (...maQuyens: string[]) => SetMetadata(QUYEN_KEY, maQuyens);
