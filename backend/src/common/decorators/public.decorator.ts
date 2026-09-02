import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorator đánh dấu route không cần xác thực JWT.
 * @example @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

