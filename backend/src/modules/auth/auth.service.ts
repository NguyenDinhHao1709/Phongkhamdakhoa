import {
  Injectable, UnauthorizedException, BadRequestException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NguoiDung, TrangThaiNguoiDung, LoaiTaiKhoan } from './entities/nguoi-dung.entity';
import { VaiTro } from './entities/vai-tro.entity';
import { MaXacThucOtp, LoaiOtp } from './entities/ma-xac-thuc-otp.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { NhanVien } from '../nhan-vien/entities/nhan-vien.entity';
import { comparePassword, hashPassword } from '../../common/utils/hash.util';
import { MaGeneratorService } from '../../common/utils/ma-generator.util';
import { LoginDto, SendOtpDto, VerifyOtpDto, RegisterPatientDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(NguoiDung) private nguoiDungRepo: Repository<NguoiDung>,
    @InjectRepository(VaiTro)    private vaiTroRepo: Repository<VaiTro>,
    @InjectRepository(MaXacThucOtp) private otpRepo: Repository<MaXacThucOtp>,
    @InjectRepository(BenhNhan) private benhNhanRepo: Repository<BenhNhan>,
    private jwtService: JwtService,
    private config: ConfigService,
    private dataSource: DataSource,
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get('MAIL_HOST'),
      port: config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  // ─── ĐĂNG KÝ BỆNH NHÂN TỰ DO ──────────────────────────────
  async registerPatient(dto: RegisterPatientDto) {
    const username = (dto.tenDangNhap || dto.email || '').trim().toLowerCase();
    const existingUser = await this.nguoiDungRepo.findOne({
      where: [{ tenDangNhap: username }],
    });
    if (existingUser) {
      throw new ConflictException({ code: 'USERNAME_EXISTS', message: 'Email đăng ký này đã tồn tại trong hệ thống' });
    }

    const role = await this.vaiTroRepo.findOne({ where: { maVaiTro: 'benh_nhan' } });
    if (!role) {
      throw new BadRequestException('Chưa cấu hình vai trò Bệnh nhân trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(dto.matKhau, 10);

    const newUser = this.nguoiDungRepo.create({
      tenDangNhap: username,
      matKhauHash: hashedPassword,
      vaiTroId: role.id,
      loaiTaiKhoan: LoaiTaiKhoan.BENH_NHAN,
      trangThai: TrangThaiNguoiDung.HOAT_DONG,
      emailDaXacThuc: true as any,
    });
    const savedUser = await this.nguoiDungRepo.save(newUser);
    savedUser.vaiTro = role;

    const bnCount = await this.benhNhanRepo.count();
    const newPatient = this.benhNhanRepo.create({
      maBenhNhan: MaGeneratorService.generateMaBenhNhan(bnCount + 1),
      nguoiDungId: savedUser.id,
      hoTen: dto.hoTen,
      soDienThoai: dto.soDienThoai,
      email: dto.email,
      gioiTinh: dto.gioiTinh as any,
      ngaySinh: dto.ngaySinh,
    });
    await this.benhNhanRepo.save(newPatient);

    const tokens = await this.taoTokens(savedUser);
    return {
      message: 'Đăng ký tài khoản thành công',
      data: {
        user: {
          id: savedUser.id,
          tenDangNhap: savedUser.tenDangNhap,
          hoTen: newPatient.hoTen,
          email: newPatient.email,
          vaiTro: role.maVaiTro,
          loaiTaiKhoan: savedUser.loaiTaiKhoan,
          benhNhanId: newPatient.id,
        },
        ...tokens,
      },
    };
  }

  // ─── ĐĂNG NHẬP ────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const input = dto.tenDangNhap.trim();

    const nguoiDung = await this.nguoiDungRepo
      .createQueryBuilder('nd')
      .leftJoinAndSelect('nd.vaiTro', 'vt')
      .leftJoin('nhan_vien', 'nv', 'nv.nguoi_dung_id = nd.id')
      .leftJoin('benh_nhan', 'bn', 'bn.nguoi_dung_id = nd.id')
      .where(
        'nd.ten_dang_nhap = :input OR nv.email = :input OR nv.so_dien_thoai = :input OR bn.email = :input OR bn.so_dien_thoai = :input',
        { input },
      )
      .getOne();

    if (!nguoiDung) {
      throw new UnauthorizedException({ code: 'DANG_NHAP_THAT_BAI', message: 'Tên đăng nhập, email hoặc mật khẩu không đúng' });
    }

    if (nguoiDung.trangThai === TrangThaiNguoiDung.KHOA) {
      throw new UnauthorizedException({ code: 'TAI_KHOAN_BI_KHOA', message: 'Tài khoản đã bị khóa. Liên hệ quản trị viên.' });
    }

    if (nguoiDung.trangThai === TrangThaiNguoiDung.CHO_XAC_THUC) {
      throw new UnauthorizedException({ code: 'CHUA_XAC_THUC_EMAIL', message: 'Vui lòng xác thực email trước khi đăng nhập' });
    }

    const matKhauDung = await comparePassword(dto.matKhau, nguoiDung.matKhauHash);
    if (!matKhauDung) {
      throw new UnauthorizedException({ code: 'DANG_NHAP_THAT_BAI', message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    // Cập nhật lần đăng nhập cuối
    await this.nguoiDungRepo.update(nguoiDung.id, { lanDangNhapCuoi: new Date() });

    let benhNhanId = null;
    let hoTen = nguoiDung.tenDangNhap;

    if (nguoiDung.vaiTro?.maVaiTro === 'benh_nhan' || nguoiDung.loaiTaiKhoan === LoaiTaiKhoan.BENH_NHAN) {
      const bn = await this.benhNhanRepo.findOne({ where: { nguoiDungId: nguoiDung.id } });
      if (bn) {
        benhNhanId = bn.id;
        if (bn.hoTen) hoTen = bn.hoTen;
      }
    } else {
      const nv = await this.dataSource.getRepository(NhanVien).findOne({ where: { nguoiDungId: nguoiDung.id } });
      if (nv && nv.hoTen) hoTen = nv.hoTen;
    }

    const tokens = await this.taoTokens(nguoiDung);

    return {
      data: {
        user: {
          id: nguoiDung.id,
          tenDangNhap: nguoiDung.tenDangNhap,
          hoTen,
          vaiTro: nguoiDung.vaiTro?.maVaiTro,
          tenVaiTro: nguoiDung.vaiTro?.tenVaiTro,
          loaiTaiKhoan: nguoiDung.loaiTaiKhoan,
          benhNhanId,
        },
        ...tokens,
      },
      message: 'Đăng nhập thành công',
    };
  }

  // ─── GỬI OTP ──────────────────────────────────────────────────
  async sendOtp(dto: SendOtpDto) {
    const loai = LoaiOtp.DANG_KY;

    // Vô hiệu hóa OTP cũ chưa dùng
    await this.otpRepo.update(
      { email: dto.email, loai, daSuDung: false as any },
      { daSuDung: true as any },
    );

    const maOtp = MaGeneratorService.generateOtp();
    const hetHanPhut = this.config.get<number>('OTP_EXPIRES_MINUTES', 10);
    const hetHanLuc = new Date(Date.now() + hetHanPhut * 60 * 1000);

    await this.otpRepo.save({ email: dto.email, maOtp, loai, hetHanLuc });

    // Gửi email
    try {
      await this.mailer.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: dto.email,
        subject: 'Mã xác thực OTP - Phòng Khám Đa Khoa',
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #2563EB; margin-bottom: 8px;">Mã xác thực của bạn</h2>
            <p style="color: #6B7280;">Sử dụng mã OTP bên dưới để xác thực. Mã có hiệu lực trong ${hetHanPhut} phút.</p>
            <div style="background: #EFF6FF; border: 2px solid #BFDBFE; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1D4ED8;">${maOtp}</span>
            </div>
            <p style="color: #9CA3AF; font-size: 13px;">Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('[SendOTP] Lỗi gửi email:', err.message);
      // Không throw — vẫn trả về thành công để tránh lộ thông tin
    }

    return { message: `Mã OTP đã được gửi đến ${dto.email}` };
  }

  // ─── XÁC THỰC OTP ─────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.otpRepo.findOne({
      where: {
        email: dto.email,
        daSuDung: false as any,
        hetHanLuc: MoreThan(new Date()),
      },
      order: { taoLuc: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException({ code: 'OTP_HET_HAN', message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
    }

    // Giới hạn 5 lần thử
    if (otp.soLanThu >= 5) {
      await this.otpRepo.update(otp.id, { daSuDung: true as any });
      throw new BadRequestException({ code: 'OTP_QUA_NHIEU_LAN_THU', message: 'Đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.' });
    }

    if (otp.maOtp !== dto.maOtp) {
      await this.otpRepo.update(otp.id, { soLanThu: otp.soLanThu + 1 });
      throw new BadRequestException({ code: 'OTP_SAI', message: 'Mã OTP không đúng' });
    }

    // Đánh dấu đã dùng
    await this.otpRepo.update(otp.id, { daSuDung: true as any });

    // Nếu là xác thực đăng ký — kích hoạt tài khoản
    if (otp.loai === LoaiOtp.DANG_KY) {
      await this.nguoiDungRepo.update(
        { tenDangNhap: dto.email },
        { emailDaXacThuc: true as any, trangThai: TrangThaiNguoiDung.HOAT_DONG },
      );
    }

    return { message: 'Xác thực OTP thành công' };
  }

  // ─── LÀM MỚI TOKEN ────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const nguoiDung = await this.nguoiDungRepo.findOne({
        where: { id: payload.sub },
        relations: ['vaiTro'],
      });

      if (!nguoiDung || nguoiDung.trangThai !== TrangThaiNguoiDung.HOAT_DONG) {
        throw new UnauthorizedException({ code: 'TOKEN_KHONG_HOP_LE', message: 'Phiên đăng nhập không hợp lệ' });
      }

      const tokens = await this.taoTokens(nguoiDung);
      return { data: tokens, message: 'Làm mới token thành công' };
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_HET_HAN', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
  }

  // ─── HELPER: TẠO JWT TOKENS ───────────────────────────────────
  private async taoTokens(nguoiDung: NguoiDung) {
    const payload: JwtPayload = {
      sub: nguoiDung.id,
      tenDangNhap: nguoiDung.tenDangNhap,
      vaiTroId: nguoiDung.vaiTroId,
      maVaiTro: nguoiDung.vaiTro?.maVaiTro || '',
      loaiTaiKhoan: nguoiDung.loaiTaiKhoan,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

