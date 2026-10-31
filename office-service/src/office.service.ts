import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OfficeGateway } from './office.gateway';

export const HOSPITAL_STICKERS = [
  { id: 'stk_ok_sep', code: '👍 Đã nhận chỉ đạo!', label: 'Đã nhận chỉ đạo', emoji: '🫡', color: '#10b981', category: 'Công việc' },
  { id: 'stk_khan_cap', code: '🚨 Hỗ trợ khẩn cấp!', label: 'Hỗ trợ khẩn cấp', emoji: '🚑', color: '#ef4444', category: 'Y tế' },
  { id: 'stk_hoi_chan', code: '🩺 Mời hội chẩn ca này', label: 'Mời hội chẩn', emoji: '🩺', color: '#3b82f6', category: 'Y tế' },
  { id: 'stk_co_kq_cls', code: '🧪 Đã có kết quả Xét nghiệm!', label: 'Đã có KQ CLS', emoji: '🔬', color: '#8b5cf6', category: 'Y tế' },
  { id: 'stk_xong_don', code: '💊 Đã chuẩn bị xong đơn thuốc', label: 'Xong đơn thuốc', emoji: '💊', color: '#06b6d4', category: 'Y tế' },
  { id: 'stk_da_thu_tien', code: '💳 Bệnh nhân đã hoàn tất viện phí', label: 'Đã thu viện phí', emoji: '✅', color: '#14b8a6', category: 'Y tế' },
  { id: 'stk_cam_on', code: '❤️ Cảm ơn đồng nghiệp nhé!', label: 'Cảm ơn nhiều', emoji: '❤️', color: '#ec4899', category: 'Công việc' },
  { id: 'stk_hop_ngay', code: '📹 Vào phòng họp giao ban nhé!', label: 'Họp giao ban', emoji: '📢', color: '#f59e0b', category: 'Công việc' },
  { id: 'stk_chuc_mung', code: '🎉 Tuyệt vời quá ekip ơi!', label: 'Tuyệt vời', emoji: '🎉', color: '#eab308', category: 'Công việc' },
  { id: 'stk_nghi_trua', code: '🍱 Nghỉ trưa thôi mọi người!', label: 'Nghỉ trưa', emoji: '☕', color: '#f97316', category: 'Đời sống' },
  { id: 'stk_ca_truc', code: '🌙 Bàn giao ca trực an toàn nhé', label: 'Bàn giao ca', emoji: '🏥', color: '#6366f1', category: 'Y tế' },
  { id: 'stk_like', code: '💯 Chuẩn xác 100%', label: 'Chuẩn xác', emoji: '💯', color: '#22c55e', category: 'Công việc' },
];

@Injectable()
export class OfficeService implements OnModuleInit {
  private readonly logger = new Logger(OfficeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateway: OfficeGateway,
  ) {}

  async onModuleInit() {
    await this.initSchemaAndSeed();
  }

  private async initSchemaAndSeed() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS office_phong_chat (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ten_phong VARCHAR(200) NULL,
          mo_ta VARCHAR(500) NULL,
          loai ENUM('rieng_tu', 'nhom') NOT NULL DEFAULT 'nhom',
          ma_nhom VARCHAR(50) NULL,
          anh_dai_dien VARCHAR(500) NULL,
          nguoi_tao_id INT NULL,
          tin_nhan_ghim_id INT NULL,
          tao_luc DATETIME DEFAULT CURRENT_TIMESTAMP,
          cap_nhat_luc DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_office_loai (loai),
          INDEX idx_office_cap_nhat (cap_nhat_luc)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS office_thanh_vien (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phong_chat_id INT NOT NULL,
          nguoi_dung_id INT NOT NULL,
          vai_tro ENUM('truong_nhom', 'thanh_vien') NOT NULL DEFAULT 'thanh_vien',
          da_doc_den_tin_id INT NOT NULL DEFAULT 0,
          tham_gia_luc DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_phong_user (phong_chat_id, nguoi_dung_id),
          INDEX idx_tv_user (nguoi_dung_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS office_tin_nhan (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phong_chat_id INT NOT NULL,
          nguoi_gui_id INT NOT NULL,
          loai ENUM('van_ban', 'hinh_anh', 'tep_tin', 'nhan_dan', 'the_benh_nhan', 'he_thong') NOT NULL DEFAULT 'van_ban',
          noi_dung TEXT NULL,
          tep_dinh_kem TEXT NULL,
          tra_loi_id INT NULL,
          mentions TEXT NULL,
          da_ghim TINYINT(1) NOT NULL DEFAULT 0,
          da_thu_hoi TINYINT(1) NOT NULL DEFAULT 0,
          tao_luc DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tn_phong (phong_chat_id, id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS office_cam_xuc (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tin_nhan_id INT NOT NULL,
          nguoi_dung_id INT NOT NULL,
          emoji VARCHAR(32) NOT NULL,
          tao_luc DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_cx_msg_user_emoji (tin_nhan_id, nguoi_dung_id, emoji),
          INDEX idx_cx_msg (tin_nhan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      const existingRooms: any[] = await this.dataSource.query(
        'SELECT COUNT(*) as cnt FROM office_phong_chat',
      );
      try {
        await this.dataSource.query(`ALTER TABLE office_tin_nhan ADD COLUMN xoa_boi_ids TEXT NULL`);
      } catch {
        // Column already exists
      }
      if (Number(existingRooms[0]?.cnt || 0) === 0) {
        await this.seedDefaultHospitalWorkspace();
      }
      await this.dataSource.query(`DELETE FROM office_tin_nhan WHERE loai = 'the_benh_nhan'`);
      await this.dataSource.query(`
        DELETE t1 FROM office_tin_nhan t1
        INNER JOIN office_tin_nhan t2
          ON t1.phong_chat_id = t2.phong_chat_id
         AND t1.nguoi_gui_id = t2.nguoi_gui_id
         AND t1.loai = t2.loai
         AND t1.noi_dung = t2.noi_dung
         AND t1.loai IN ('tep_tin', 'hinh_anh')
         AND t1.id > t2.id
         AND ABS(TIMESTAMPDIFF(SECOND, t1.tao_luc, t2.tao_luc)) <= 60
      `);
      this.logger.log('✅ Office database schema & default channels verified');
    } catch (err: any) {
      this.logger.error('Lỗi khởi tạo schema Office:', err.message);
    }
  }

  private isDeletedForUser(rawJson: string | null | undefined, userId: number): boolean {
    if (!rawJson) return false;
    try {
      const arr = JSON.parse(rawJson);
      return Array.isArray(arr) && arr.map(Number).includes(Number(userId));
    } catch {
      return false;
    }
  }

  private async getAllStaffRaw(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(`
      SELECT
        u.id,
        u.ten_dang_nhap AS tenDangNhap,
        u.loai_tai_khoan AS loaiTaiKhoan,
        vt.ma_vai_tro AS maVaiTro,
        vt.ten_vai_tro AS tenVaiTro,
        nv.ho_ten AS hoTenNv,
        nv.chuc_vu AS chucVu,
        nv.so_dien_thoai AS soDienThoai,
        nv.email,
        nv.anh_dai_dien AS anhDaiDien,
        bs.chuyen_khoa AS chuyenKhoa,
        bs.bang_cap AS bangCap
      FROM nguoi_dung u
      LEFT JOIN vai_tro vt ON u.vai_tro_id = vt.id
      LEFT JOIN nhan_vien nv ON nv.nguoi_dung_id = u.id
      LEFT JOIN bac_si bs ON bs.nhan_vien_id = nv.id
      WHERE u.trang_thai = 'hoat_dong'
        AND (u.loai_tai_khoan = 'noi_bo' OR vt.ma_vai_tro != 'benh_nhan')
      ORDER BY
        CASE vt.ma_vai_tro
          WHEN 'ban_giam_doc' THEN 1
          WHEN 'quan_tri_vien_cap_cao' THEN 2
          WHEN 'quan_tri_vien' THEN 2
          WHEN 'bac_si' THEN 3
          WHEN 'ky_thuat_vien' THEN 4
          WHEN 'nhan_vien_nha_thuoc' THEN 5
          WHEN 'thu_ngan' THEN 6
          WHEN 'tiep_tan' THEN 7
          ELSE 8
        END,
        u.id ASC
    `);

    const onlineSet = new Set(this.gateway.getOnlineUserIds());

    return rows.map((r) => {
      let displayName = r.hoTenNv;
      if (!displayName || displayName.trim() === '') {
        if (r.maVaiTro === 'quan_tri_vien_cap_cao' || r.maVaiTro === 'quan_tri_vien') {
          displayName = 'Quản Trị Viên Cấp Cao (Admin)';
        } else if (r.maVaiTro === 'ban_giam_doc') {
          displayName = 'Ban Giám Đốc';
        } else {
          displayName = r.tenDangNhap;
        }
      }

      let department = r.tenVaiTro || 'Nội bộ';
      if (r.maVaiTro === 'ban_giam_doc') department = 'Ban Giám Đốc Điều Hành';
      else if (r.maVaiTro?.includes('quan_tri')) department = 'Quản Trị & CNTT';
      else if (r.maVaiTro === 'bac_si') department = r.chuyenKhoa ? `Khoa ${r.chuyenKhoa}` : 'Khối Lâm Sàng (Bác Sĩ)';
      else if (r.maVaiTro === 'ky_thuat_vien') department = 'Khoa Xét Nghiệm & CĐHA';
      else if (r.maVaiTro === 'nhan_vien_nha_thuoc') department = 'Khoa Dược & Nhà Thuốc';
      else if (r.maVaiTro === 'thu_ngan') department = 'Phòng Tài Chính - Thu Ngân';
      else if (r.maVaiTro === 'tiep_tan') department = 'Quầy Tiếp Đón & CSKH';

      return {
        id: Number(r.id),
        tenDangNhap: r.tenDangNhap,
        hoTen: displayName,
        maVaiTro: r.maVaiTro || 'noi_bo',
        tenVaiTro: r.tenVaiTro || 'Nhân sự nội bộ',
        chucVu: r.chucVu || r.tenVaiTro || 'Nhân viên',
        khoaPhong: department,
        chuyenKhoa: r.chuyenKhoa || null,
        soDienThoai: r.soDienThoai || null,
        email: r.email || null,
        anhDaiDien: r.anhDaiDien || null,
        online: onlineSet.has(Number(r.id)),
      };
    });
  }

  private async seedDefaultHospitalWorkspace() {
    const staff = await this.getAllStaffRaw();
    if (staff.length === 0) return;

    const giamDoc = staff.find((s) => s.maVaiTro === 'ban_giam_doc') || staff[0];
    const admin = staff.find((s) => s.maVaiTro?.includes('quan_tri')) || staff[0];
    const bacSi = staff.find((s) => s.maVaiTro === 'bac_si') || staff[0];
    const tiepTan = staff.find((s) => s.maVaiTro === 'tiep_tan') || staff[0];
    const ktv = staff.find((s) => s.maVaiTro === 'ky_thuat_vien') || staff[0];
    const duocSi = staff.find((s) => s.maVaiTro === 'nhan_vien_nha_thuoc') || staff[0];
    const thuNgan = staff.find((s) => s.maVaiTro === 'thu_ngan') || staff[0];

    // 1. Nhóm Toàn thể Phòng khám
    const r1: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (ten_phong, mo_ta, loai, ma_nhom, nguoi_tao_id)
       VALUES (?, ?, 'nhom', 'TOAN_VIEN', ?)`,
      [
        '🏥 Giao Ban Toàn Phòng Khám',
        'Kênh thông báo điều hành chung từ Ban Giám Đốc, Admin và toàn thể các Khoa/Phòng',
        giamDoc.id,
      ],
    );
    const room1Id = r1.insertId;
    for (const s of staff) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, ?)`,
        [room1Id, s.id, s.id === giamDoc.id || s.id === admin.id ? 'truong_nhom' : 'thanh_vien'],
      );
    }

    const m1: any = await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung, mentions, da_ghim)
       VALUES (?, ?, 'van_ban', ?, ?, 1)`,
      [
        room1Id,
        giamDoc.id,
        '📌 [THÔNG BÁO ĐIỀU HÀNH] Chào toàn thể anh chị em! Kể từ tuần này, mọi trao đổi hội chẩn nhanh, điều phối thuốc và hỗ trợ viện phí sẽ thực hiện trực tiếp trên MediCare AI Office. @Tất cả chú ý trực ca đúng giờ nhé!',
        JSON.stringify(['ALL']),
      ],
    );
    await this.dataSource.query(
      `UPDATE office_phong_chat SET tin_nhan_ghim_id = ? WHERE id = ?`,
      [m1.insertId, room1Id],
    );

    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung, tra_loi_id)
       VALUES (?, ?, 'van_ban', ?, ?)`,
      [
        room1Id,
        bacSi.id,
        'Dạ rõ thưa Giám đốc! Khối lâm sàng đã sẵn sàng phối hợp cùng phòng Xét nghiệm và Nhà thuốc ạ.',
        m1.insertId,
      ],
    );

    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung, tep_dinh_kem)
       VALUES (?, ?, 'nhan_dan', ?, ?)`,
      [
        room1Id,
        admin.id,
        '👍 Đã nhận chỉ đạo!',
        JSON.stringify(HOSPITAL_STICKERS[0]),
      ],
    );

    // Thả cảm xúc mẫu
    for (const s of staff.slice(0, 5)) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_cam_xuc (tin_nhan_id, nguoi_dung_id, emoji) VALUES (?, ?, '❤️')`,
        [m1.insertId, s.id],
      );
    }

    // 2. Nhóm Hội chẩn Lâm sàng & Xét nghiệm CLS
    const r2: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (ten_phong, mo_ta, loai, ma_nhom, nguoi_tao_id)
       VALUES (?, ?, 'nhom', 'HOI_CHAN_CLS', ?)`,
      [
        '🩺 Hội Chẩn Bác Sĩ & Cận Lâm Sàng',
        'Trao đổi chuyên môn bác sĩ khám bệnh, ưu tiên mẫu xét nghiệm máu, siêu âm, X-Quang',
        bacSi.id,
      ],
    );
    const room2Id = r2.insertId;
    const clinicalMembers = staff.filter((s) =>
      ['ban_giam_doc', 'quan_tri_vien_cap_cao', 'quan_tri_vien', 'bac_si', 'ky_thuat_vien'].includes(s.maVaiTro),
    );
    for (const s of clinicalMembers.length > 0 ? clinicalMembers : staff) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, ?)`,
        [room2Id, s.id, s.id === bacSi.id ? 'truong_nhom' : 'thanh_vien'],
      );
    }

    const m2: any = await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung)
       VALUES (?, ?, 'van_ban', ?)`,
      [
        room2Id,
        bacSi.id,
        `Nhờ phòng Xét nghiệm (@${ktv.hoTen}) ưu tiên chạy sớm công thức máu và sinh hóa cho ca bệnh nhân lượt khám #1801 giúp mình nhé!`,
      ],
    );
    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung, tra_loi_id)
       VALUES (?, ?, 'van_ban', ?, ?)`,
      [
        room2Id,
        ktv.id,
        'Dạ Bác sĩ, mẫu máu đã lấy xong và đang chạy máy tự động, 10 phút nữa em đẩy kết quả lên EMR ạ!',
        m2.insertId,
      ],
    );
    await this.dataSource.query(
      `INSERT IGNORE INTO office_cam_xuc (tin_nhan_id, nguoi_dung_id, emoji) VALUES (?, ?, '👍')`,
      [m2.insertId, ktv.id],
    );

    // 3. Nhóm Điều phối Đơn thuốc & Thu ngân Viện phí
    const r3: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (ten_phong, mo_ta, loai, ma_nhom, nguoi_tao_id)
       VALUES (?, ?, 'nhom', 'DUOC_THU_NGAN', ?)`,
      [
        '💊 Điều Phối Nhà Thuốc & Viện Phí',
        'Phối hợp kiểm tra tồn kho thuốc, duyệt toa thuốc, đối soát hóa đơn và hoàn tiền lịch hẹn',
        duocSi.id,
      ],
    );
    const room3Id = r3.insertId;
    for (const s of staff) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, ?)`,
        [room3Id, s.id, s.id === duocSi.id || s.id === thuNgan.id ? 'truong_nhom' : 'thanh_vien'],
      );
    }

    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung)
       VALUES (?, ?, 'van_ban', ?)`,
      [
        room3Id,
        thuNgan.id,
        'Quầy Thu ngân đã xác nhận thanh toán viện phí 800.000đ cho ca khám #1801. Nhờ Nhà thuốc chuẩn bị cấp phát thuốc cho bệnh nhân nhé!',
      ],
    );
    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung)
       VALUES (?, ?, 'van_ban', ?)`,
      [
        room3Id,
        duocSi.id,
        'Nhà thuốc đã nhận thông tin và soạn đủ đơn thuốc cho bệnh nhân rồi ạ!',
      ],
    );

    // 4. Nhóm Tiếp đón & Điều phối Sảnh
    const r4: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (ten_phong, mo_ta, loai, ma_nhom, nguoi_tao_id)
       VALUES (?, ?, 'nhom', 'TIEP_DON_SANH', ?)`,
      [
        '🛎️ Tiếp Đón & Điều Phối Sảnh Chờ',
        'Hỗ trợ khách đặt lịch hẹn, phân luồng Kiosk và điều tiết hàng đợi các buồng khám',
        tiepTan.id,
      ],
    );
    const room4Id = r4.insertId;
    for (const s of staff) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, ?)`,
        [room4Id, s.id, s.id === tiepTan.id ? 'truong_nhom' : 'thanh_vien'],
      );
    }
    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung)
       VALUES (?, ?, 'van_ban', ?)`,
      [
        room4Id,
        tiepTan.id,
        'Sáng nay sảnh tiếp đón đã check-in Kiosk thuận lợi, các buồng khám Nội tổng quát & Tim mạch đang hoạt động ổn định.',
      ],
    );
  }

  private async ensureUserInDefaultRooms(userId: number) {
    if (!userId) return;
    const defaultRooms: any[] = await this.dataSource.query(
      `SELECT id FROM office_phong_chat WHERE ma_nhom IN ('TOAN_VIEN', 'DUOC_THU_NGAN', 'TIEP_DON_SANH')`,
    );
    for (const r of defaultRooms) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, 'thanh_vien')`,
        [r.id, userId],
      );
    }
  }

  async getWorkspaceInit(userId: number) {
    await this.ensureUserInDefaultRooms(userId);
    const staffDirectory = await this.getAllStaffRaw();
    const staffMap = new Map<number, any>();
    staffDirectory.forEach((s) => staffMap.set(s.id, s));

    const currentUser = staffMap.get(Number(userId)) || {
      id: Number(userId),
      hoTen: 'Nhân sự Phòng khám',
      chucVu: 'Nội bộ',
      khoaPhong: 'Phòng khám Đa khoa',
      online: true,
    };

    const rawRooms: any[] = await this.dataSource.query(
      `SELECT
         p.*,
         tv.vai_tro AS myRole,
         tv.da_doc_den_tin_id AS myLastReadId
       FROM office_phong_chat p
       INNER JOIN office_thanh_vien tv ON tv.phong_chat_id = p.id AND tv.nguoi_dung_id = ?
       ORDER BY p.cap_nhat_luc DESC, p.id ASC`,
      [userId],
    );

    const rooms = [];
    for (const r of rawRooms) {
      const memberRows: any[] = await this.dataSource.query(
        `SELECT nguoi_dung_id AS userId, vai_tro AS vaiTro, da_doc_den_tin_id AS lastReadId
         FROM office_thanh_vien
         WHERE phong_chat_id = ?`,
        [r.id],
      );

      const members = memberRows.map((m) => {
        const profile = staffMap.get(Number(m.userId)) || {
          id: Number(m.userId),
          hoTen: `Nhân sự #${m.userId}`,
          chucVu: 'Nhân viên',
          khoaPhong: 'Nội bộ',
          online: false,
        };
        return {
          ...profile,
          vaiTroNhom: m.vaiTro,
          lastReadId: Number(m.lastReadId || 0),
        };
      });

      const lastMsgRows: any[] = await this.dataSource.query(
        `SELECT id, nguoi_gui_id AS nguoiGuiId, loai, noi_dung AS noiDung, da_thu_hoi AS daThuHoi, xoa_boi_ids AS xoaBoiIds, tao_luc AS taoLuc
         FROM office_tin_nhan
         WHERE phong_chat_id = ?
         ORDER BY id DESC
         LIMIT 20`,
        [r.id],
      );
      const lastMsgRaw =
        lastMsgRows.find((m) => !this.isDeletedForUser(m.xoaBoiIds, userId)) || null;
      const lastSender = lastMsgRaw ? staffMap.get(Number(lastMsgRaw.nguoiGuiId)) : null;

      const unreadRows: any[] = await this.dataSource.query(
        `SELECT COUNT(*) AS cnt
         FROM office_tin_nhan
         WHERE phong_chat_id = ? AND id > ? AND nguoi_gui_id != ? AND da_thu_hoi = 0`,
        [r.id, Number(r.myLastReadId || 0), userId],
      );

      let displayTitle = r.ten_phong;
      let directPartner = null;
      if (r.loai === 'rieng_tu') {
        directPartner = members.find((m) => m.id !== Number(userId)) || members[0];
        displayTitle = directPartner?.hoTen || 'Trò chuyện riêng';
      }

      rooms.push({
        id: Number(r.id),
        tenPhong: displayTitle,
        moTa: r.mo_ta || (directPartner ? `${directPartner.chucVu} • ${directPartner.khoaPhong}` : ''),
        loai: r.loai,
        maNhom: r.ma_nhom,
        anhDaiDien: r.loai === 'rieng_tu' ? directPartner?.anhDaiDien : r.anh_dai_dien,
        directPartner,
        soThanhVien: members.length,
        members,
        tinNhanGhimId: r.tin_nhan_ghim_id ? Number(r.tin_nhan_ghim_id) : null,
        unreadCount: Number(unreadRows[0]?.cnt || 0),
        lastMessage: lastMsgRaw
          ? {
              id: Number(lastMsgRaw.id),
              nguoiGuiId: Number(lastMsgRaw.nguoiGuiId),
              tenNguoiGui: lastSender?.hoTen || 'Đồng nghiệp',
              loai: lastMsgRaw.loai,
              noiDung: lastMsgRaw.daThuHoi
                ? 'Tin nhắn đã được thu hồi'
                : lastMsgRaw.loai === 'hinh_anh'
                ? '[Hình ảnh]'
                : lastMsgRaw.loai === 'tep_tin'
                ? '[Tệp đính kèm]'
                : lastMsgRaw.loai === 'nhan_dan'
                ? `[Nhãn dán] ${lastMsgRaw.noiDung || ''}`
                : lastMsgRaw.loai === 'the_benh_nhan'
                ? `[Hồ sơ Bệnh nhân] ${lastMsgRaw.noiDung || ''}`
                : lastMsgRaw.noiDung,
              taoLuc: lastMsgRaw.taoLuc,
            }
          : null,
        capNhatLuc: r.cap_nhat_luc,
      });
    }

    return {
      currentUser,
      staffDirectory,
      rooms,
      stickers: HOSPITAL_STICKERS,
    };
  }

  async getRoomMessages(roomId: number, userId: number) {
    const staffDirectory = await this.getAllStaffRaw();
    const staffMap = new Map<number, any>();
    staffDirectory.forEach((s) => staffMap.set(s.id, s));

    const roomRows: any[] = await this.dataSource.query(
      `SELECT * FROM office_phong_chat WHERE id = ? LIMIT 1`,
      [roomId],
    );
    if (roomRows.length === 0) {
      throw new NotFoundException('Không tìm thấy phòng trò chuyện');
    }
    const room = roomRows[0];

    // Đảm bảo user có trong phòng
    await this.dataSource.query(
      `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, 'thanh_vien')`,
      [roomId, userId],
    );

    const allRoomMessages: any[] = await this.dataSource.query(
      `SELECT * FROM office_tin_nhan WHERE phong_chat_id = ? ORDER BY id ASC LIMIT 300`,
      [roomId],
    );
    const rawMessages = allRoomMessages.filter(
      (m) => !this.isDeletedForUser(m.xoa_boi_ids, userId),
    );

    const msgIds = rawMessages.map((m) => Number(m.id));
    let reactionsByMsg = new Map<number, any[]>();
    if (msgIds.length > 0) {
      const cxRows: any[] = await this.dataSource.query(
        `SELECT tin_nhan_id AS tinNhanId, nguoi_dung_id AS userId, emoji
         FROM office_cam_xuc
         WHERE tin_nhan_id IN (${msgIds.join(',')})`,
      );
      cxRows.forEach((cx) => {
        const mid = Number(cx.tinNhanId);
        if (!reactionsByMsg.has(mid)) reactionsByMsg.set(mid, []);
        const u = staffMap.get(Number(cx.userId));
        reactionsByMsg.get(mid)!.push({
          userId: Number(cx.userId),
          hoTen: u?.hoTen || 'Đồng nghiệp',
          emoji: cx.emoji,
        });
      });
    }

    // Cập nhật đã đọc đến tin nhắn mới nhất
    const latestMsgId = msgIds.length > 0 ? msgIds[msgIds.length - 1] : 0;
    if (latestMsgId > 0) {
      await this.dataSource.query(
        `UPDATE office_thanh_vien SET da_doc_den_tin_id = GREATEST(da_doc_den_tin_id, ?)
         WHERE phong_chat_id = ? AND nguoi_dung_id = ?`,
        [latestMsgId, roomId, userId],
      );
    }

    const memberRows: any[] = await this.dataSource.query(
      `SELECT nguoi_dung_id AS userId, vai_tro AS vaiTro, da_doc_den_tin_id AS lastReadId
       FROM office_thanh_vien
       WHERE phong_chat_id = ?`,
      [roomId],
    );

    const msgMap = new Map<number, any>();
    rawMessages.forEach((m) => msgMap.set(Number(m.id), m));

    const messages = rawMessages.map((m) => {
      const mid = Number(m.id);
      const sender = staffMap.get(Number(m.nguoi_gui_id)) || {
        id: Number(m.nguoi_gui_id),
        hoTen: `Nhân sự #${m.nguoi_gui_id}`,
        chucVu: 'Nhân viên',
        khoaPhong: 'Nội bộ',
      };

      let parsedAttachment = null;
      if (m.tep_dinh_kem) {
        try {
          parsedAttachment = JSON.parse(m.tep_dinh_kem);
        } catch {
          parsedAttachment = { url: m.tep_dinh_kem };
        }
      }

      let parsedMentions: any[] = [];
      if (m.mentions) {
        try {
          parsedMentions = JSON.parse(m.mentions);
        } catch {}
      }

      let replyTo = null;
      if (m.tra_loi_id && msgMap.has(Number(m.tra_loi_id))) {
        const parent = msgMap.get(Number(m.tra_loi_id));
        const parentSender = staffMap.get(Number(parent.nguoi_gui_id));
        replyTo = {
          id: Number(parent.id),
          nguoiGuiId: Number(parent.nguoi_gui_id),
          tenNguoiGui: parentSender?.hoTen || 'Đồng nghiệp',
          loai: parent.loai,
          noiDung: parent.da_thu_hoi
            ? 'Tin nhắn đã được thu hồi'
            : parent.noi_dung || '[Đính kèm]',
        };
      }

      const seenBy = memberRows
        .filter((mem) => Number(mem.userId) !== Number(m.nguoi_gui_id) && Number(mem.lastReadId) >= mid)
        .map((mem) => {
          const p = staffMap.get(Number(mem.userId));
          return {
            id: Number(mem.userId),
            hoTen: p?.hoTen || 'Đồng nghiệp',
            anhDaiDien: p?.anhDaiDien || null,
          };
        });

      return {
        id: mid,
        phongChatId: Number(m.phong_chat_id),
        nguoiGuiId: Number(m.nguoi_gui_id),
        nguoiGui: sender,
        loai: m.loai,
        noiDung: m.da_thu_hoi ? 'Tin nhắn đã được thu hồi' : m.noi_dung,
        tepDinhKem: m.da_thu_hoi ? null : parsedAttachment,
        traLoi: replyTo,
        mentions: parsedMentions,
        daGhim: Boolean(m.da_ghim),
        daThuHoi: Boolean(m.da_thu_hoi),
        reactions: reactionsByMsg.get(mid) || [],
        seenBy,
        taoLuc: m.tao_luc,
      };
    });

    const pinnedMessages = messages.filter((m) => m.daGhim && !m.daThuHoi);
    const sharedImages = messages.filter((m) => m.loai === 'hinh_anh' && !m.daThuHoi);
    const sharedFiles = messages.filter((m) => m.loai === 'tep_tin' && !m.daThuHoi);
    const sharedPatients = messages.filter((m) => m.loai === 'the_benh_nhan' && !m.daThuHoi);

    return {
      roomId: Number(room.id),
      tinNhanGhimId: room.tin_nhan_ghim_id ? Number(room.tin_nhan_ghim_id) : null,
      messages,
      pinnedMessages,
      sharedImages,
      sharedFiles,
      sharedPatients,
    };
  }

  async openOrCreateDirectRoom(userId: number, targetUserId: number) {
    if (!userId || !targetUserId || Number(userId) === Number(targetUserId)) {
      throw new BadRequestException('Người nhận không hợp lệ');
    }

    const existing: any[] = await this.dataSource.query(
      `SELECT p.id
       FROM office_phong_chat p
       INNER JOIN office_thanh_vien tv1 ON tv1.phong_chat_id = p.id AND tv1.nguoi_dung_id = ?
       INNER JOIN office_thanh_vien tv2 ON tv2.phong_chat_id = p.id AND tv2.nguoi_dung_id = ?
       WHERE p.loai = 'rieng_tu'
       LIMIT 1`,
      [userId, targetUserId],
    );

    if (existing.length > 0) {
      return { roomId: Number(existing[0].id), isNew: false };
    }

    const res: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (loai, nguoi_tao_id) VALUES ('rieng_tu', ?)`,
      [userId],
    );
    const newRoomId = Number(res.insertId);

    await this.dataSource.query(
      `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro)
       VALUES (?, ?, 'thanh_vien'), (?, ?, 'thanh_vien')`,
      [newRoomId, userId, newRoomId, targetUserId],
    );

    this.gateway.notifyUsers([Number(userId), Number(targetUserId)], 'office:room_updated', {
      roomId: newRoomId,
    });

    return { roomId: newRoomId, isNew: true };
  }

  async createGroupRoom(
    userId: number,
    dto: { tenPhong: string; moTa?: string; memberIds: number[] },
  ) {
    if (!dto?.tenPhong || !dto.tenPhong.trim()) {
      throw new BadRequestException('Vui lòng nhập tên nhóm trò chuyện');
    }

    const uniqueMembers = Array.from(
      new Set([Number(userId), ...(dto.memberIds || []).map((id) => Number(id)).filter(Boolean)]),
    );

    const res: any = await this.dataSource.query(
      `INSERT INTO office_phong_chat (ten_phong, mo_ta, loai, nguoi_tao_id)
       VALUES (?, ?, 'nhom', ?)`,
      [dto.tenPhong.trim(), dto.moTa?.trim() || 'Nhóm phối hợp công việc nội bộ', userId],
    );
    const roomId = Number(res.insertId);

    for (const mid of uniqueMembers) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro)
         VALUES (?, ?, ?)`,
        [roomId, mid, mid === Number(userId) ? 'truong_nhom' : 'thanh_vien'],
      );
    }

    await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung)
       VALUES (?, ?, 'he_thong', ?)`,
      [roomId, userId, `Nhóm "${dto.tenPhong.trim()}" đã được khởi tạo với ${uniqueMembers.length} thành viên.`],
    );

    this.gateway.notifyUsers(uniqueMembers, 'office:room_updated', { roomId });
    return { roomId, tenPhong: dto.tenPhong.trim(), soThanhVien: uniqueMembers.length };
  }

  async addMembersToRoom(roomId: number, userId: number, memberIds: number[]) {
    const cleanIds = (memberIds || []).map((id) => Number(id)).filter(Boolean);
    for (const mid of cleanIds) {
      await this.dataSource.query(
        `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro)
         VALUES (?, ?, 'thanh_vien')`,
        [roomId, mid],
      );
    }

    await this.dataSource.query(
      `UPDATE office_phong_chat SET cap_nhat_luc = NOW() WHERE id = ?`,
      [roomId],
    );

    const allMembers: any[] = await this.dataSource.query(
      `SELECT nguoi_dung_id AS uid FROM office_thanh_vien WHERE phong_chat_id = ?`,
      [roomId],
    );
    this.gateway.notifyUsers(
      allMembers.map((m) => Number(m.uid)),
      'office:room_updated',
      { roomId },
    );

    return { roomId, addedCount: cleanIds.length };
  }

  async sendMessage(
    roomId: number,
    userId: number,
    dto: {
      loai?: 'van_ban' | 'hinh_anh' | 'tep_tin' | 'nhan_dan' | 'the_benh_nhan';
      noiDung?: string;
      tepDinhKem?: any;
      traLoiId?: number | null;
      mentions?: any[];
    },
  ) {
    const loai = dto.loai || 'van_ban';
    const noiDung = (dto.noiDung || '').trim();

    if (!noiDung && !dto.tepDinhKem) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    await this.dataSource.query(
      `INSERT IGNORE INTO office_thanh_vien (phong_chat_id, nguoi_dung_id, vai_tro) VALUES (?, ?, 'thanh_vien')`,
      [roomId, userId],
    );

    const tepJson = dto.tepDinhKem
      ? typeof dto.tepDinhKem === 'string'
        ? dto.tepDinhKem
        : JSON.stringify(dto.tepDinhKem)
      : null;

    const mentionsJson = Array.isArray(dto.mentions) && dto.mentions.length > 0
      ? JSON.stringify(dto.mentions)
      : null;

    const res: any = await this.dataSource.query(
      `INSERT INTO office_tin_nhan (phong_chat_id, nguoi_gui_id, loai, noi_dung, tep_dinh_kem, tra_loi_id, mentions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roomId, userId, loai, noiDung, tepJson, dto.traLoiId || null, mentionsJson],
    );
    const msgId = Number(res.insertId);

    await this.dataSource.query(
      `UPDATE office_phong_chat SET cap_nhat_luc = NOW() WHERE id = ?`,
      [roomId],
    );

    await this.dataSource.query(
      `UPDATE office_thanh_vien SET da_doc_den_tin_id = ? WHERE phong_chat_id = ? AND nguoi_dung_id = ?`,
      [msgId, roomId, userId],
    );

    const staff = await this.getAllStaffRaw();
    const sender = staff.find((s) => s.id === Number(userId)) || {
      id: Number(userId),
      hoTen: 'Đồng nghiệp',
      chucVu: 'Nhân viên',
      khoaPhong: 'Nội bộ',
    };

    let replyTo = null;
    if (dto.traLoiId) {
      const parentRows: any[] = await this.dataSource.query(
        `SELECT id, nguoi_gui_id, loai, noi_dung FROM office_tin_nhan WHERE id = ? LIMIT 1`,
        [dto.traLoiId],
      );
      if (parentRows.length > 0) {
        const p = parentRows[0];
        const pSender = staff.find((s) => s.id === Number(p.nguoi_gui_id));
        replyTo = {
          id: Number(p.id),
          nguoiGuiId: Number(p.nguoi_gui_id),
          tenNguoiGui: pSender?.hoTen || 'Đồng nghiệp',
          loai: p.loai,
          noiDung: p.noi_dung,
        };
      }
    }

    const messagePayload = {
      id: msgId,
      phongChatId: Number(roomId),
      nguoiGuiId: Number(userId),
      nguoiGui: sender,
      loai,
      noiDung,
      tepDinhKem: dto.tepDinhKem || null,
      traLoi: replyTo,
      mentions: dto.mentions || [],
      daGhim: false,
      daThuHoi: false,
      reactions: [],
      seenBy: [],
      taoLuc: new Date().toISOString(),
    };

    this.gateway.broadcastToRoom(Number(roomId), 'office:new_message', messagePayload);

    const memberRows: any[] = await this.dataSource.query(
      `SELECT nguoi_dung_id AS uid FROM office_thanh_vien WHERE phong_chat_id = ?`,
      [roomId],
    );
    this.gateway.notifyUsers(
      memberRows.map((m) => Number(m.uid)),
      'office:new_message_notification',
      messagePayload,
    );

    return messagePayload;
  }

  async toggleReaction(messageId: number, userId: number, emoji: string) {
    const msgRows: any[] = await this.dataSource.query(
      `SELECT id, phong_chat_id AS roomId FROM office_tin_nhan WHERE id = ? LIMIT 1`,
      [messageId],
    );
    if (msgRows.length === 0) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }
    const roomId = Number(msgRows[0].roomId);

    const existing: any[] = await this.dataSource.query(
      `SELECT id FROM office_cam_xuc WHERE tin_nhan_id = ? AND nguoi_dung_id = ? AND emoji = ? LIMIT 1`,
      [messageId, userId, emoji],
    );

    if (existing.length > 0) {
      await this.dataSource.query(`DELETE FROM office_cam_xuc WHERE id = ?`, [existing[0].id]);
    } else {
      await this.dataSource.query(
        `INSERT INTO office_cam_xuc (tin_nhan_id, nguoi_dung_id, emoji) VALUES (?, ?, ?)`,
        [messageId, userId, emoji],
      );
    }

    const staff = await this.getAllStaffRaw();
    const staffMap = new Map(staff.map((s) => [s.id, s]));
    const cxRows: any[] = await this.dataSource.query(
      `SELECT nguoi_dung_id AS userId, emoji FROM office_cam_xuc WHERE tin_nhan_id = ?`,
      [messageId],
    );

    const reactions = cxRows.map((cx) => ({
      userId: Number(cx.userId),
      hoTen: staffMap.get(Number(cx.userId))?.hoTen || 'Đồng nghiệp',
      emoji: cx.emoji,
    }));

    const payload = { roomId, messageId: Number(messageId), reactions };
    this.gateway.broadcastToRoom(roomId, 'office:reaction', payload);
    return payload;
  }

  async togglePinMessage(roomId: number, userId: number, messageId: number) {
    const msgRows: any[] = await this.dataSource.query(
      `SELECT id, da_ghim AS daGhim FROM office_tin_nhan WHERE id = ? AND phong_chat_id = ? LIMIT 1`,
      [messageId, roomId],
    );
    if (msgRows.length === 0) {
      throw new NotFoundException('Không tìm thấy tin nhắn trong phòng này');
    }

    const nextPin = msgRows[0].daGhim ? 0 : 1;
    await this.dataSource.query(
      `UPDATE office_tin_nhan SET da_ghim = ? WHERE id = ?`,
      [nextPin, messageId],
    );

    await this.dataSource.query(
      `UPDATE office_phong_chat SET tin_nhan_ghim_id = ? WHERE id = ?`,
      [nextPin ? messageId : null, roomId],
    );

    const payload = { roomId: Number(roomId), messageId: Number(messageId), daGhim: Boolean(nextPin) };
    this.gateway.broadcastToRoom(Number(roomId), 'office:pin_updated', payload);
    return payload;
  }

  async recallMessage(messageId: number, userId: number, mode?: string) {
    const msgRows: any[] = await this.dataSource.query(
      `SELECT id, phong_chat_id AS roomId, nguoi_gui_id AS senderId, tao_luc AS taoLuc,
              xoa_boi_ids AS xoaBoiIds,
              TIMESTAMPDIFF(SECOND, tao_luc, NOW()) AS elapsedSeconds
       FROM office_tin_nhan
       WHERE id = ?
       LIMIT 1`,
      [messageId],
    );
    if (msgRows.length === 0) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const msg = msgRows[0];
    const RECALL_LIMIT_SECONDS = 15 * 60; // 15 phút
    const isSender = Number(msg.senderId) === Number(userId);
    const withinRecallLimit = Number(msg.elapsedSeconds) <= RECALL_LIMIT_SECONDS;

    // Nếu người dùng bấm "Thu hồi" nhưng đã quá 15 phút hoặc không phải người gửi
    if (mode === 'recall') {
      if (!isSender || !withinRecallLimit) {
        throw new BadRequestException('Không thể thu hồi');
      }

      await this.dataSource.query(
        `UPDATE office_tin_nhan SET da_thu_hoi = 1, da_ghim = 0 WHERE id = ?`,
        [messageId],
      );

      const payload = {
        roomId: Number(msg.roomId),
        messageId: Number(messageId),
        action: 'recalled',
      };
      this.gateway.broadcastToRoom(Number(msg.roomId), 'office:message_recalled', payload);
      return payload;
    }

    // Nếu bấm "Xóa ở phía tôi" (mode === 'delete_for_me') HOẶC tin nhắn đã quá 15 phút -> chỉ ẩn bên phía người xóa (giống Messenger)
    if (mode === 'delete_for_me' || !withinRecallLimit || !isSender) {
      let deletedUsers: number[] = [];
      if (msg.xoaBoiIds) {
        try {
          const parsed = JSON.parse(msg.xoaBoiIds);
          if (Array.isArray(parsed)) deletedUsers = parsed.map(Number);
        } catch {}
      }
      if (!deletedUsers.includes(Number(userId))) {
        deletedUsers.push(Number(userId));
      }

      await this.dataSource.query(
        `UPDATE office_tin_nhan SET xoa_boi_ids = ? WHERE id = ?`,
        [JSON.stringify(deletedUsers), messageId],
      );

      return {
        roomId: Number(msg.roomId),
        messageId: Number(messageId),
        action: 'deleted_for_me',
      };
    }

    // Mặc định trong 15 phút của chính người gửi -> thu hồi với mọi người
    await this.dataSource.query(
      `UPDATE office_tin_nhan SET da_thu_hoi = 1, da_ghim = 0 WHERE id = ?`,
      [messageId],
    );

    const payload = {
      roomId: Number(msg.roomId),
      messageId: Number(messageId),
      action: 'recalled',
    };
    this.gateway.broadcastToRoom(Number(msg.roomId), 'office:message_recalled', payload);
    return payload;
  }

  async markRoomRead(roomId: number, userId: number) {
    const latestRows: any[] = await this.dataSource.query(
      `SELECT MAX(id) AS maxId FROM office_tin_nhan WHERE phong_chat_id = ?`,
      [roomId],
    );
    const maxId = Number(latestRows[0]?.maxId || 0);
    if (maxId > 0) {
      await this.dataSource.query(
        `UPDATE office_thanh_vien SET da_doc_den_tin_id = GREATEST(da_doc_den_tin_id, ?)
         WHERE phong_chat_id = ? AND nguoi_dung_id = ?`,
        [maxId, roomId, userId],
      );
      this.gateway.broadcastToRoom(Number(roomId), 'office:seen', {
        roomId: Number(roomId),
        userId: Number(userId),
        lastReadId: maxId,
      });
    }
    return { roomId: Number(roomId), lastReadId: maxId };
  }

  async searchPatientsForCard(keyword?: string) {
    const q = `%${(keyword || '').trim()}%`;
    const rows: any[] = await this.dataSource.query(
      `SELECT
         bn.id,
         bn.ma_benh_nhan AS maBenhNhan,
         bn.ho_ten AS hoTen,
         bn.ngay_sinh AS ngaySinh,
         bn.gioi_tinh AS gioiTinh,
         bn.so_dien_thoai AS soDienThoai,
         ltn.id AS luotTiepNhanId,
         ltn.ma_so_thu_tu AS maSoThuTu,
         ltn.chuyen_khoa AS chuyenKhoa,
         ltn.trang_thai AS trangThai
       FROM benh_nhan bn
       LEFT JOIN luot_tiep_nhan ltn ON ltn.id = (
         SELECT id FROM luot_tiep_nhan WHERE benh_nhan_id = bn.id ORDER BY id DESC LIMIT 1
       )
       WHERE bn.ho_ten LIKE ? OR bn.ma_benh_nhan LIKE ? OR bn.so_dien_thoai LIKE ?
       ORDER BY bn.id DESC
       LIMIT 15`,
      [q, q, q],
    );
    return rows;
  }
}

