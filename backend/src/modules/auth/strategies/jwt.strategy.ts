import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MemoryCacheService } from '../../../common/cache/memory-cache.service';

export interface JwtPayload {
  sub: number;           // nguoi_dung.id
  tenDangNhap: string;
  vaiTroId: number;
  maVaiTro: string;      // 'bac_si', 'tiep_tan', ...
  loaiTaiKhoan: string;  // 'noi_bo' | 'benh_nhan'
  tv?: number;           // phiên bản token — tăng khi đăng xuất / đổi mật khẩu
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    private cache: MemoryCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const nd = await this.cache.getOrSet(`tv:${payload.sub}`, 30_000, async () => {
      const [row] = await this.dataSource.query(
        'SELECT phien_ban_token AS tv, trang_thai AS tt FROM nguoi_dung WHERE id = ?',
        [payload.sub],
      );
      return row ?? null;
    });
    if (!nd || nd.tt === 'khoa' || Number(nd.tv) !== (payload.tv ?? 0)) {
      throw new UnauthorizedException({ code: 'TOKEN_DA_THU_HOI', message: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.' });
    }
    return {
      id: payload.sub,
      sub: payload.sub,
      userId: payload.sub,
      tenDangNhap: payload.tenDangNhap,
      vaiTroId: payload.vaiTroId,
      vai_tro: payload.maVaiTro,   // field dùng trong RolesGuard
      ma_vai_tro: payload.maVaiTro,
      maVaiTro: payload.maVaiTro,
      loaiTaiKhoan: payload.loaiTaiKhoan,
    };
  }
}

