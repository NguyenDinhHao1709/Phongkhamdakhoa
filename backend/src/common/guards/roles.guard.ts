import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không yêu cầu role cụ thể → chỉ cần đăng nhập
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException({ code: 'KHONG_CO_QUYEN', message: 'Không có quyền truy cập' });

    const hasRole = requiredRoles.includes(user.vai_tro) ||
                    requiredRoles.includes(user.ma_vai_tro);

    if (!hasRole) {
      throw new ForbiddenException({
        code: 'KHONG_CO_QUYEN',
        message: `Chức năng này yêu cầu vai trò: ${requiredRoles.join(', ')}`,
      });
    }
    return true;
  }
}

