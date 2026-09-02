import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy user hiện tại từ request (sau khi JwtAuthGuard xác thực).
 * @example @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

