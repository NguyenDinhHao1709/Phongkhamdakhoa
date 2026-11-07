// Danh mục quyền hạn chuẩn của hệ thống & bộ quyền mặc định cho từng vai trò.
// - Được seed tự động khi khởi động (chỉ thêm quyền còn thiếu, không ghi đè cấu hình Admin).
// - Dùng cho chức năng "Khôi phục quyền chuẩn mặc định" tại trang Phân quyền.

export const NHOM_CHUC_NANG_ORDER = [
  'Tiếp nhận & Điều phối',
  'Khám bệnh & Lâm sàng',
  'Cận lâm sàng & Xét nghiệm',
  'Dược & Kho thuốc',
  'Tài chính & Thu ngân',
  'Truyền thông & Y khoa',
  'Hành chính, Nhân sự & Office',
  'Điều hành & Ban Giám Đốc',
  'Quản trị hệ thống',
];

const [TN, KB, CLS, DUOC, TC, TT, HC, DH, QT] = NHOM_CHUC_NANG_ORDER;

export const DEFAULT_PERMISSIONS: { maQuyen: string; tenQuyen: string; nhomChucNang: string }[] = [
  // 1. Tiếp nhận & Điều phối
  { maQuyen: 'tiep_nhan.goi_so', tenQuyen: 'Gọi số thứ tự & điều phối hàng đợi phòng khám', nhomChucNang: TN },
  { maQuyen: 'benh_nhan.xem', tenQuyen: 'Xem danh sách & tra cứu hồ sơ hành chính bệnh nhân', nhomChucNang: TN },
  { maQuyen: 'benh_nhan.them', tenQuyen: 'Tiếp nhận mới & cập nhật thông tin bệnh nhân', nhomChucNang: TN },
  { maQuyen: 'lich_hen.xem', tenQuyen: 'Xem danh sách lịch hẹn khám bệnh', nhomChucNang: TN },
  { maQuyen: 'lich_hen.duyet', tenQuyen: 'Xác nhận, điều phối hoặc hủy lịch hẹn khám', nhomChucNang: TN },
  { maQuyen: 'ai_triage.phan_luong', tenQuyen: 'Sử dụng Trợ lý AI phân luồng triệu chứng & cấp cứu', nhomChucNang: TN },
  { maQuyen: 'tiep_nhan.thong_ke', tenQuyen: 'Xem báo cáo thống kê tiếp đón & khách hàng', nhomChucNang: TN },

  // 2. Khám bệnh & Lâm sàng
  { maQuyen: 'kham_benh.kham', tenQuyen: 'Thực hiện khám lâm sàng, chẩn đoán & kê đơn thuốc', nhomChucNang: KB },
  { maQuyen: 'kham_benh.truc_tuyen', tenQuyen: 'Tư vấn khám từ xa (Telemedicine) & lịch trực tuyến', nhomChucNang: KB },
  { maQuyen: 'kham_benh.xem_lich_su', tenQuyen: 'Tra cứu Hồ sơ bệnh án điện tử (EMR) & tiền sử bệnh', nhomChucNang: KB },
  { maQuyen: 'chi_dinh.tao', tenQuyen: 'Tạo phiếu chỉ định Xét nghiệm & Chẩn đoán hình ảnh', nhomChucNang: KB },
  { maQuyen: 'kham_benh.thong_ke', tenQuyen: 'Xem báo cáo thống kê ca khám & hiệu suất lâm sàng', nhomChucNang: KB },

  // 3. Cận lâm sàng & Xét nghiệm
  { maQuyen: 'xet_nghiem.xem', tenQuyen: 'Tiếp nhận mẫu bệnh phẩm & danh sách chỉ định CLS', nhomChucNang: CLS },
  { maQuyen: 'xet_nghiem.nhap_kq', tenQuyen: 'Nhập kết quả xét nghiệm, tải ảnh CĐHA & trả kết quả', nhomChucNang: CLS },
  { maQuyen: 'xet_nghiem.thong_ke', tenQuyen: 'Xem thống kê hoạt động cận lâm sàng & xét nghiệm', nhomChucNang: CLS },

  // 4. Dược & Kho thuốc
  { maQuyen: 'thuoc.xem', tenQuyen: 'Xem danh mục thuốc, lô hạn dùng & tồn kho', nhomChucNang: DUOC },
  { maQuyen: 'thuoc.xuat_kho', tenQuyen: 'Cấp phát thuốc theo đơn & xuất kho dược', nhomChucNang: DUOC },
  { maQuyen: 'thuoc.nhap_kho', tenQuyen: 'Lập đơn mua hàng (PO) & nhập thuốc từ nhà cung cấp', nhomChucNang: DUOC },
  { maQuyen: 'thuoc.thong_ke', tenQuyen: 'Xem báo cáo xuất nhập tồn & dự báo nhu cầu dược', nhomChucNang: DUOC },

  // 5. Tài chính & Thu ngân
  { maQuyen: 'hoa_don.xem', tenQuyen: 'Xem danh sách hóa đơn & biên lai viện phí (AR)', nhomChucNang: TC },
  { maQuyen: 'hoa_don.thanh_toan', tenQuyen: 'Thu viện phí, thanh toán QR PayOS & hoàn phí', nhomChucNang: TC },
  { maQuyen: 'hoa_don.chi_tra_ncc', tenQuyen: 'Quản lý sổ chi trả nhà cung cấp & chi phí (AP/OPEX)', nhomChucNang: TC },
  { maQuyen: 'hoa_don.chot_ca', tenQuyen: 'Báo cáo sổ quỹ, đối soát & chốt ca thu ngân', nhomChucNang: TC },

  // 6. Truyền thông & Y khoa
  { maQuyen: 'bai_viet.soan_thao', tenQuyen: 'Soạn thảo bài viết y khoa, tải ảnh & gửi duyệt', nhomChucNang: TT },
  { maQuyen: 'bai_viet.phe_duyet', tenQuyen: 'Kiểm duyệt, xuất bản, tạm ẩn & xóa bài viết y khoa', nhomChucNang: TT },

  // 7. Hành chính, Nhân sự & Office
  { maQuyen: 'office.truy_cap', tenQuyen: 'Sử dụng Không gian làm việc số (Office Chat & Tài liệu)', nhomChucNang: HC },
  { maQuyen: 'lich_truc.xem', tenQuyen: 'Xem lịch làm việc & ca trực cá nhân', nhomChucNang: HC },
  { maQuyen: 'cham_cong.ca_nhan', tenQuyen: 'Chấm công nhận diện khuôn mặt AI cá nhân', nhomChucNang: HC },
  { maQuyen: 'don_tu.gui', tenQuyen: 'Gửi đơn xin nghỉ phép, đổi ca & đề xuất lên Giám đốc', nhomChucNang: HC },

  // 8. Điều hành & Ban Giám Đốc
  { maQuyen: 'dieu_hanh.dashboard', tenQuyen: 'Xem Dashboard điều hành tổng quan bệnh viện', nhomChucNang: DH },
  { maQuyen: 'dieu_hanh.bang_gia', tenQuyen: 'Quản lý & phê duyệt bảng giá dịch vụ y tế', nhomChucNang: DH },
  { maQuyen: 'bao_cao.doanh_thu', tenQuyen: 'Xem báo cáo tài chính toàn diện bệnh viện (P&L)', nhomChucNang: DH },
  { maQuyen: 'dieu_hanh.bao_cao_bo_phan', tenQuyen: 'Xem báo cáo các bộ phận & ban hành chỉ đạo', nhomChucNang: DH },
  { maQuyen: 'dieu_hanh.du_bao_ai', tenQuyen: 'Xem dự báo lưu lượng bệnh nhân & doanh thu (AI/ML)', nhomChucNang: DH },
  { maQuyen: 'lich_truc.phan_ca', tenQuyen: 'Xếp lịch phân ca làm việc toàn phòng khám', nhomChucNang: DH },
  { maQuyen: 'cham_cong.quan_ly', tenQuyen: 'Quản lý dữ liệu chấm công toàn viện & duyệt giải trình', nhomChucNang: DH },
  { maQuyen: 'dieu_hanh.tra_cuu', tenQuyen: 'Tra cứu tổng hợp hồ sơ bệnh nhân & bệnh án toàn viện', nhomChucNang: DH },
  { maQuyen: 'don_tu.phe_duyet', tenQuyen: 'Phê duyệt / Từ chối đơn từ & yêu cầu của nhân viên', nhomChucNang: DH },

  // 9. Quản trị hệ thống
  { maQuyen: 'he_thong.tong_quan', tenQuyen: 'Xem tổng quan kỹ thuật & giám sát tải hệ thống', nhomChucNang: QT },
  { maQuyen: 'he_thong.nhan_vien', tenQuyen: 'Quản lý hồ sơ nhân sự, bác sĩ & tài khoản nội bộ', nhomChucNang: QT },
  { maQuyen: 'he_thong.benh_nhan', tenQuyen: 'Quản lý danh sách tài khoản bệnh nhân', nhomChucNang: QT },
  { maQuyen: 'he_thong.phan_quyen', tenQuyen: 'Quản lý Vai trò & Ma trận Phân quyền hệ thống', nhomChucNang: QT },
  { maQuyen: 'he_thong.danh_muc', tenQuyen: 'Cấu hình Danh mục dùng chung, Thông tin BV & Bảo mật', nhomChucNang: QT },
  { maQuyen: 'he_thong.sao_luu', tenQuyen: 'Sao lưu, khôi phục & trích xuất Cơ sở dữ liệu', nhomChucNang: QT },
  { maQuyen: 'he_thong.nhat_ky', tenQuyen: 'Xem Nhật ký kiểm toán hệ thống (System Audit Logs)', nhomChucNang: QT },
  { maQuyen: 'he_thong.cai_dat_cham_cong', tenQuyen: 'Cấu hình AI nhận diện khuôn mặt & WiFi/IP chấm công', nhomChucNang: QT },
];

const NHAN_SU_CHUNG = ['office.truy_cap', 'lich_truc.xem', 'cham_cong.ca_nhan', 'don_tu.gui'];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  tiep_tan: [
    'tiep_nhan.goi_so', 'benh_nhan.xem', 'benh_nhan.them', 'lich_hen.xem', 'lich_hen.duyet',
    'ai_triage.phan_luong', 'tiep_nhan.thong_ke', ...NHAN_SU_CHUNG,
  ],
  bac_si: [
    'benh_nhan.xem', 'lich_hen.xem', 'kham_benh.kham', 'kham_benh.truc_tuyen', 'kham_benh.xem_lich_su',
    'chi_dinh.tao', 'kham_benh.thong_ke', 'bai_viet.soan_thao', ...NHAN_SU_CHUNG,
  ],
  ky_thuat_vien: ['benh_nhan.xem', 'xet_nghiem.xem', 'xet_nghiem.nhap_kq', 'xet_nghiem.thong_ke', ...NHAN_SU_CHUNG],
  nhan_vien_nha_thuoc: ['thuoc.xem', 'thuoc.xuat_kho', 'thuoc.nhap_kho', 'thuoc.thong_ke', ...NHAN_SU_CHUNG],
  thu_ngan: ['benh_nhan.xem', 'hoa_don.xem', 'hoa_don.thanh_toan', 'hoa_don.chi_tra_ncc', 'hoa_don.chot_ca', ...NHAN_SU_CHUNG],
  ban_giam_doc: [
    'benh_nhan.xem', 'lich_hen.xem', 'kham_benh.xem_lich_su', 'xet_nghiem.xem', 'thuoc.xem', 'hoa_don.xem',
    'bai_viet.soan_thao', 'bai_viet.phe_duyet', 'office.truy_cap',
    'dieu_hanh.dashboard', 'dieu_hanh.bang_gia', 'bao_cao.doanh_thu', 'dieu_hanh.bao_cao_bo_phan',
    'dieu_hanh.du_bao_ai', 'lich_truc.phan_ca', 'cham_cong.quan_ly', 'dieu_hanh.tra_cuu', 'don_tu.phe_duyet',
  ],
  quan_tri_vien: [
    'office.truy_cap', 'he_thong.tong_quan', 'he_thong.nhan_vien', 'he_thong.benh_nhan', 'he_thong.phan_quyen',
    'he_thong.danh_muc', 'he_thong.sao_luu', 'he_thong.nhat_ky', 'he_thong.cai_dat_cham_cong',
  ],
};
// Nhà thuốc dùng chung bộ quyền dược
DEFAULT_ROLE_PERMISSIONS.nha_thuoc = DEFAULT_ROLE_PERMISSIONS.nhan_vien_nha_thuoc;

