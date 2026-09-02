import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NguoiDung } from './entities/nguoi-dung.entity';
import { VaiTro } from './entities/vai-tro.entity';
import { QuyenHan } from './entities/quyen-han.entity';
import { VaiTroQuyenHan } from './entities/vai-tro-quyen-han.entity';
import { MaXacThucOtp } from './entities/ma-xac-thuc-otp.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NguoiDung, VaiTro, QuyenHan, VaiTroQuyenHan, MaXacThucOtp, BenhNhan]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, TypeOrmModule],
})
export class AuthModule {}

