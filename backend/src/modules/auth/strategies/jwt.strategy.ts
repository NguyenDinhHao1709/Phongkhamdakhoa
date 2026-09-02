import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;           // nguoi_dung.id
  tenDangNhap: string;
  vaiTroId: number;
  maVaiTro: string;      // 'bac_si', 'tiep_tan', ...
  loaiTaiKhoan: string;  // 'noi_bo' | 'benh_nhan'
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      tenDangNhap: payload.tenDangNhap,
      vaiTroId: payload.vaiTroId,
      vai_tro: payload.maVaiTro,   // field dùng trong RolesGuard
      loaiTaiKhoan: payload.loaiTaiKhoan,
    };
  }
}

