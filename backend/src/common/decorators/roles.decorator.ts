import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * Decorator gắn danh sách vai trò được phép truy cập route.
 * @example @Roles('bac_si', 'tiep_tan')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

