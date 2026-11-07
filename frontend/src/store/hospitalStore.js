import { create } from 'zustand';
import { apiGet } from '../services/api';

const DEFAULT_HOSPITAL_INFO = {
  tenBenhVien: 'PHÒNG KHÁM ĐA KHOA',
  slogan: 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO',
  moTa: 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.',
  soGiayPhep: '08922/BYT-GPHĐ',
  diaChi: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  tongDai: '1900 8888',
  gioLamViec: '07:00 – 20:00 (Thứ 2 - CN)',
  email: 'hotro@phongkhamdakhoa.vn',
  tieuDeCapCuu: 'CẤP CỨU 24/24',
  hotlineCapCuu: '1900 8888',
  khauHieuCapCuu: 'Luôn sẵn sàng tiếp nhận & xử trí y tế',
  dichVuNoiBat: [
    'Khám bệnh Nội tổng quát & Tim mạch',
    'Khám Tai Mũi Họng & Nội soi',
    'Khám Nhi khoa & Dinh dưỡng',
    'Chẩn đoán hình ảnh & Xét nghiệm Laser',
    'Khám tư vấn từ xa (Telehealth)',
  ],
  banQuyen: '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.',
  chinhSachBaoMat: {
    tieuDeTrang: 'Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Y Tế Cá Nhân',
    ngayCapNhat: '05/11/2026',
    moTaMoDau: 'Phòng khám cam kết bảo vệ tuyệt đối thông tin sức khỏe, hồ sơ bệnh án điện tử (EMR) và quyền riêng tư của mọi bệnh nhân theo chuẩn Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh.',
    tieuChuanTuanThu: [
      'Nghị định 13/2023/NĐ-CP',
      'Luật Khám bệnh, chữa bệnh 2023',
      'Thông tư 54/2017/TT-BYT',
      'Mã hóa AES-256 & TLS 1.3',
    ],
    camKetCotLoi: [
      {
        tieuDe: 'Bảo mật Bệnh án Điện tử (EMR)',
        moTa: 'Dữ liệu chẩn đoán, toa thuốc và cận lâm sàng được lưu trữ phân quyền nghiêm ngặt theo đúng mã định danh y tế.',
      },
      {
        tieuDe: 'Không chia sẻ thương mại',
        moTa: 'Cam kết không cung cấp, mua bán hoặc tiết lộ thông tin bệnh nhân cho bất kỳ bên thứ ba vì mục đích tiếp thị.',
      },
      {
        tieuDe: 'Quyền làm chủ dữ liệu',
        moTa: 'Người bệnh có quyền tra cứu, trích xuất lịch sử khám bệnh hoặc yêu cầu cập nhật, thu hồi thông tin theo luật định.',
      },
    ],
    danhSachDieuKhoan: [
      {
        id: 'muc-dich-thu-thap',
        tieuDe: '1. Mục đích và Phạm vi Thu thập Dữ liệu',
        noiDung: 'Chúng tôi chỉ thu thập các dữ liệu cần thiết phục vụ trực tiếp cho công tác khám chữa bệnh, chăm sóc sức khỏe và quản lý tài chính y tế hợp pháp.',
        danhSachChiTiet: [
          'Họ và tên, ngày sinh, giới tính, số CCCD/Định danh cá nhân, số thẻ BHYT.',
          'Số điện thoại liên hệ, địa chỉ cư trú, thông tin thân nhân trong trường hợp khẩn cấp.',
          'Tiền sử bệnh lý, tiền sử dị ứng thuốc, triệu chứng lâm sàng và chỉ số sinh tồn.',
          'Kết quả chẩn đoán hình ảnh, xét nghiệm cận lâm sàng, hồ sơ toa thuốc và lịch sử phẫu thuật/thủ thuật.',
        ],
      },
      {
        id: 'pham-vi-su-dung',
        tieuDe: '2. Phạm vi Sử dụng Thông tin',
        noiDung: 'Thông tin cá nhân và dữ liệu y tế chỉ được sử dụng trong phạm vi quy định nhằm mang lại trải nghiệm khám chữa bệnh an toàn nhất.',
        danhSachChiTiet: [
          'Chỉ định chẩn đoán, kê đơn thuốc và theo dõi tiến trình hồi phục của bệnh nhân.',
          'Xác nhận lịch hẹn khám, nhắc lịch tái khám và gửi kết quả cận lâm sàng qua kênh liên lạc được người bệnh chấp thuận.',
          'Thực hiện giám định chi phí khám chữa bệnh BHYT và nghĩa vụ báo cáo y tế thống kê theo quy định của Bộ Y Tế.',
          'Phục vụ nghiên cứu khoa học y tế khi và chỉ khi dữ liệu đã được mã hóa, khử định danh hoàn toàn (anonymized).',
        ],
      },
      {
        id: 'an-toan-bao-mat',
        tieuDe: '3. Biện pháp An toàn và Bảo vệ Kỹ thuật',
        noiDung: 'Hệ thống ERP y tế áp dụng kiến trúc an toàn thông tin đa lớp nhằm phòng chống truy cập trái phép, rò rỉ hay mất mát dữ liệu.',
        danhSachChiTiet: [
          'Toàn bộ dữ liệu truyền tải giữa trình duyệt, Kiosk và máy chủ được mã hóa qua giao thức HTTPS / TLS 1.3.',
          'Dữ liệu bệnh án lưu trữ trong CSDL được bảo vệ bằng cơ chế phân quyền RBAC và mã hóa cột nhạy cảm.',
          'Mọi thao tác xem, sửa, in phiếu của nhân viên y tế đều được ghi nhật ký hệ thống (Audit Log) chống chối bỏ.',
          'Sao lưu dự phòng tự động định kỳ, cách ly môi trường và kiểm tra rà soát lỗ hổng bảo mật liên tục.',
        ],
      },
      {
        id: 'quyen-cua-nguoi-benh',
        tieuDe: '4. Quyền của Người bệnh đối với Dữ liệu Cá nhân',
        noiDung: 'Theo Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh, quý người bệnh có toàn quyền đối với dữ liệu cá nhân của mình.',
        danhSachChiTiet: [
          'Quyền được biết rõ loại dữ liệu y tế được thu thập và cách thức xử lý.',
          'Quyền tra cứu, trích xuất tóm tắt hồ sơ bệnh án hoặc tải kết quả xét nghiệm qua tài khoản cá nhân.',
          'Quyền yêu cầu chỉnh sửa thông tin hành chính khi có sự sai lệch hoặc cập nhật.',
          'Quyền khiếu nại, phản ánh hoặc yêu cầu tạm ngưng nhận thông báo tiếp thị, chăm sóc qua tin nhắn/email.',
        ],
      },
      {
        id: 'thoi-gian-luu-tru',
        tieuDe: '5. Thời hạn Lưu trữ Hồ sơ Y tế',
        noiDung: 'Thời hạn lưu trữ hồ sơ bệnh án được thực hiện nghiêm ngặt theo Điều 69 Luật Khám bệnh, chữa bệnh 2023 và quy định của Bộ Y Tế (tối thiểu 10 năm đối với bệnh án ngoại trú, 20 năm đối với nội trú/tai nạn và lưu vĩnh viễn theo chỉ định pháp luật đặc biệt). Sau thời hạn luật định, dữ liệu được hủy hoặc khử định danh theo quy trình tiêu hủy an toàn.',
      },
    ],
    thongTinLienHeBaoMat: {
      donViPhuTrach: 'Ban Bảo Vệ Dữ Liệu Cá Nhân & Phòng Công Nghệ Thông Tin',
      email: 'dpo@phongkhamdakhoa.vn',
      hotline: '1900 8888 (Nhánh 4)',
      diaChiTiepNhan: 'Phòng Tiếp Dân & Pháp Chế Y Tế - Tầng 1, Khu A',
    },
  },
};

export const useHospitalStore = create((set, get) => ({
  hospitalInfo: DEFAULT_HOSPITAL_INFO,
  isLoaded: false,
  isLoading: false,

  fetchHospitalInfo: async (force = false) => {
    if (get().isLoaded && !force) return get().hospitalInfo;
    set({ isLoading: true });
    try {
      const res = await apiGet('/quan-ly/thong-tin-benh-vien');
      if (res?.data) {
        const merged = {
          ...DEFAULT_HOSPITAL_INFO,
          ...res.data,
          dichVuNoiBat: Array.isArray(res.data.dichVuNoiBat) && res.data.dichVuNoiBat.length > 0
            ? res.data.dichVuNoiBat
            : DEFAULT_HOSPITAL_INFO.dichVuNoiBat,
          chinhSachBaoMat: {
            ...DEFAULT_HOSPITAL_INFO.chinhSachBaoMat,
            ...(res.data.chinhSachBaoMat || {}),
          },
        };
        set({ hospitalInfo: merged, isLoaded: true, isLoading: false });
        return merged;
      }
    } catch (e) {
      console.warn('Không thể tải thông tin bệnh viện từ máy chủ, dùng cấu hình mặc định:', e);
    }
    set({ isLoaded: true, isLoading: false });
    return get().hospitalInfo;
  },

  setHospitalInfo: (newInfo) => {
    set((state) => ({
      hospitalInfo: {
        ...state.hospitalInfo,
        ...newInfo,
      },
      isLoaded: true,
    }));
  },
}));

export default useHospitalStore;

