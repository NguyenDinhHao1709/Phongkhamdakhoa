import { useState, useEffect, useMemo } from 'react';
import {
  Layers, Building2, DoorOpen, Search, RefreshCw, CheckCircle2,
  AlertCircle, Plus, Edit2, Trash2, X, Filter, Stethoscope,
  MapPin, ShieldAlert, Activity, Users, Info, Building, PhoneCall,
  Clock, ShieldCheck, Mail, HeartPulse, Save, Sparkles, Eye, Pill, Tag, RotateCcw, ExternalLink, FileText, ChevronUp, ChevronDown
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../services/api';
import useHospitalStore from '../../store/hospitalStore';

const STATUS_LABELS = {
  hoat_dong: { label: 'Đang hoạt động', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20' },
  bao_tri:   { label: 'Tạm bảo trì',   color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20' },
  dong_cua:  { label: 'Đóng cửa / Ngừng', color: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20' },
};

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
    nhanHero: 'QUY CHUẨN AN TOÀN & BẢO VỆ DỮ LIỆU Y TẾ',
    tieuDeMucLienHe: 'Đơn Vị Phụ Trách & Tiếp Nhận Yêu Cầu Dữ Liệu Cá Nhân',
    moTaMucLienHe: 'Mọi thắc mắc, phản ánh liên quan đến chính sách bảo mật hoặc yêu cầu thực thi quyền của chủ thể dữ liệu (trích xuất sao y bệnh án, khiếu nại, cải chính thông tin), xin vui lòng liên hệ:',
    hoTroTieuDe: 'Hỗ Trợ Quyền Riêng Tư 24/7',
    hoTroMoTa: 'Người bệnh có quyền gửi yêu cầu giải trình, cập nhật hoặc thu hồi dữ liệu bất cứ lúc nào.',
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

export default function DanhMucDungChungPage() {
  const [activeTab, setActiveTab] = useState('phong_ban'); // 'phong_ban' | 'phong_kham' | 'thong_tin_benh_vien'
  const [data, setData] = useState({ phongBans: [], phongKhams: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKhoa, setFilterKhoa] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Toasts & feedback
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal State: Khoa / Phòng Ban
  const [modalPhongBan, setModalPhongBan] = useState({ open: false, mode: 'create', data: null });
  const [pbForm, setPbForm] = useState({ tenPhongBan: '', moTa: '' });
  const [pbSubmitting, setPbSubmitting] = useState(false);

  // Modal State: Phòng Khám Thực Tế
  const [modalPhongKham, setModalPhongKham] = useState({ open: false, mode: 'create', data: null });
  const [pkForm, setPkForm] = useState({
    tenPhong: '',
    viTri: '',
    chuyenKhoa: '',
    trangThai: 'hoat_dong',
    phongBanId: '',
  });
  const [pkSubmitting, setPkSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, item: null, loading: false });

  // Tab 3: Thông Tin Bệnh Viện State
  const [hospitalInfo, setHospitalInfo] = useState(DEFAULT_HOSPITAL_INFO);
  const [dichVuText, setDichVuText] = useState('');
  const [savingHospital, setSavingHospital] = useState(false);
  const [loadingHospital, setLoadingHospital] = useState(false);

  // Tab: Chuyên Khoa Y Tế State
  const [chuyenKhoas, setChuyenKhoas] = useState([]);
  const [modalChuyenKhoa, setModalChuyenKhoa] = useState({ open: false, mode: 'create', data: null });
  const [ckForm, setCkForm] = useState({ ma: '', ten: '', moTa: '', trangThai: 'hoat_dong' });
  const [savingCK, setSavingCK] = useState(false);

  // Tab: Dược & Đơn Vị Tính State
  const [duocConfig, setDuocConfig] = useState({ donViTinh: [], duongDung: [], nhomDuocLy: [] });
  const [newDvt, setNewDvt] = useState('');
  const [newDuongDung, setNewDuongDung] = useState('');
  const [modalNhomDuoc, setModalNhomDuoc] = useState({ open: false, mode: 'create', data: null });
  const [nhomDuocForm, setNhomDuocForm] = useState({ ten: '', moTa: '' });
  const [savingDuoc, setSavingDuoc] = useState(false);

  // Tab: Mẫu Lời Dặn Bác Sĩ State

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDanhMuc = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/quan-ly/danh-muc-tong-hop');
      const d = res?.data || res;
      setData({
        phongBans: d.phongBans || [],
        phongKhams: d.phongKhams || [],
      });
    } catch (err) {
      console.error('Lỗi tải danh mục dùng chung:', err);
      showToast('error', 'Không thể tải dữ liệu danh mục dùng chung');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalInfo = async () => {
    setLoadingHospital(true);
    try {
      const res = await apiGet('/quan-ly/thong-tin-benh-vien');
      const info = res?.data || res || DEFAULT_HOSPITAL_INFO;
      // Gộp sâu chinhSachBaoMat để dữ liệu đã lưu trước đây vẫn có các trường mặc định mới
      const merged = {
        ...DEFAULT_HOSPITAL_INFO,
        ...info,
        chinhSachBaoMat: { ...DEFAULT_HOSPITAL_INFO.chinhSachBaoMat, ...(info.chinhSachBaoMat || {}) },
      };
      setHospitalInfo(merged);
      setDichVuText(Array.isArray(merged.dichVuNoiBat) ? merged.dichVuNoiBat.join('\n') : '');
    } catch (err) {
      console.error('Lỗi tải thông tin bệnh viện:', err);
    } finally {
      setLoadingHospital(false);
    }
  };

    const fetchChuyenKhoas = async () => {
    try {
      const res = await apiGet('/quan-ly/danh-muc-chuyen-khoa');
      const d = res?.data || res;
      if (Array.isArray(d)) setChuyenKhoas(d);
    } catch (err) {
      console.error('Lỗi tải danh mục chuyên khoa:', err);
    }
  };

  const fetchDanhMucDuoc = async () => {
    try {
      const res = await apiGet('/quan-ly/danh-muc-duoc');
      const d = res?.data || res;
      if (d) setDuocConfig(d);
    } catch (err) {
      console.error('Lỗi tải danh mục dược:', err);
    }
  };

  useEffect(() => {
    fetchDanhMuc();
    fetchHospitalInfo();
    fetchChuyenKhoas();
    fetchDanhMucDuoc();
  }, []);

  // ─── CHUYÊN KHOA Y TẾ ACTIONS ─────────────────────────────────
  const handleOpenCreateCK = () => {
    setCkForm({ ma: '', ten: '', moTa: '', trangThai: 'hoat_dong' });
    setModalChuyenKhoa({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditCK = (ck) => {
    setCkForm({
      ma: ck.ma || '',
      ten: ck.ten || '',
      moTa: ck.moTa || '',
      trangThai: ck.trangThai || 'hoat_dong',
    });
    setModalChuyenKhoa({ open: true, mode: 'edit', data: ck });
  };

  const handleSubmitCK = async (e) => {
    e.preventDefault();
    if (!ckForm.ten.trim()) {
      showToast('error', 'Vui lòng nhập tên chuyên khoa');
      return;
    }
    setSavingCK(true);
    try {
      let nextList = [];
      if (modalChuyenKhoa.mode === 'create') {
        const newId = ckForm.ma ? ckForm.ma.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'ck_' + Date.now();
        const newItem = {
          id: newId,
          ma: ckForm.ma.trim() || `CK_${Date.now().toString().slice(-4)}`,
          ten: ckForm.ten.trim(),
          moTa: ckForm.moTa.trim(),
          trangThai: ckForm.trangThai,
          icon: 'Stethoscope',
        };
        nextList = [...chuyenKhoas, newItem];
      } else {
        nextList = chuyenKhoas.map(ck =>
          ck.id === modalChuyenKhoa.data.id
            ? { ...ck, ma: ckForm.ma.trim(), ten: ckForm.ten.trim(), moTa: ckForm.moTa.trim(), trangThai: ckForm.trangThai }
            : ck
        );
      }
      await apiPut('/quan-ly/danh-muc-chuyen-khoa', nextList);
      setChuyenKhoas(nextList);
      showToast('success', modalChuyenKhoa.mode === 'create' ? 'Thêm chuyên khoa mới thành công!' : 'Cập nhật chuyên khoa thành công!');
      setModalChuyenKhoa({ open: false, mode: 'create', data: null });
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi lưu chuyên khoa');
    } finally {
      setSavingCK(false);
    }
  };

  const handleDeleteCK = async (ck) => {
    if (!window.confirm(`Xóa chuyên khoa "${ck.ten}" khỏi danh mục dùng chung?`)) return;
    const nextList = chuyenKhoas.filter(item => item.id !== ck.id);
    try {
      await apiPut('/quan-ly/danh-muc-chuyen-khoa', nextList);
      setChuyenKhoas(nextList);
      showToast('success', `Đã xóa chuyên khoa "${ck.ten}"`);
    } catch (err) {
      showToast('error', 'Không thể xóa chuyên khoa');
    }
  };

  const handleToggleStatusCK = async (ck) => {
    const nextStatus = ck.trangThai === 'hoat_dong' ? 'tam_ngung' : 'hoat_dong';
    const nextList = chuyenKhoas.map(item => item.id === ck.id ? { ...item, trangThai: nextStatus } : item);
    try {
      await apiPut('/quan-ly/danh-muc-chuyen-khoa', nextList);
      setChuyenKhoas(nextList);
      showToast('success', `Đã chuyển "${ck.ten}" sang trạng thái ${nextStatus === 'hoat_dong' ? 'Đang tiếp nhận' : 'Tạm ngưng'}`);
    } catch (err) {
      showToast('error', 'Lỗi cập nhật trạng thái chuyên khoa');
    }
  };

  const handleResetDefaultCK = async () => {
    if (!window.confirm('Khôi phục danh mục Chuyên khoa y tế về bộ chuẩn mặc định Bộ Y Tế?')) return;
    const defaultData = [
      { id: 'noi_tong_quat', ma: 'CK_NTQ', ten: 'Nội Tổng Quát', moTa: 'Tiếp nhận, khám và điều trị các bệnh lý nội khoa người lớn', trangThai: 'hoat_dong', icon: 'Stethoscope' },
      { id: 'nhi_khoa', ma: 'CK_NK', ten: 'Nhi Khoa', moTa: 'Khám chữa bệnh, tư vấn dinh dưỡng và chăm sóc sức khỏe trẻ em', trangThai: 'hoat_dong', icon: 'Baby' },
      { id: 'tim_mach', ma: 'CK_TM', ten: 'Tim Mạch', moTa: 'Chẩn đoán, điều trị tăng huyết áp, rối loạn nhịp tim và bệnh mạch vành', trangThai: 'hoat_dong', icon: 'HeartPulse' },
      { id: 'tai_mui_hong', ma: 'CK_TMH', ten: 'Tai Mũi Họng', moTa: 'Khám và nội soi điều trị viêm họng, viêm amidan, xoang mũi', trangThai: 'hoat_dong', icon: 'Ear' },
      { id: 'da_lieu', ma: 'CK_DL', ten: 'Da Liễu', moTa: 'Khám và chăm sóc điều trị các bệnh da mạn tính, dị ứng và thẩm mỹ', trangThai: 'hoat_dong', icon: 'Sparkles' },
      { id: 'san_phu_khoa', ma: 'CK_SPK', ten: 'Sản Phụ Khoa', moTa: 'Chăm sóc sức khỏe phụ nữ, khám thai kỳ và phụ khoa định kỳ', trangThai: 'hoat_dong', icon: 'HeartHandshake' },
      { id: 'can_lam_sang', ma: 'CK_CLS', ten: 'Cận Lâm Sàng & Xét Nghiệm', moTa: 'Chẩn đoán hình ảnh X-Quang, siêu âm và phân tích sinh hóa y khoa', trangThai: 'hoat_dong', icon: 'FlaskConical' },
    ];
    try {
      await apiPut('/quan-ly/danh-muc-chuyen-khoa', defaultData);
      setChuyenKhoas(defaultData);
      showToast('success', 'Đã khôi phục danh mục chuyên khoa chuẩn mặc định!');
    } catch (err) {
      showToast('error', 'Lỗi khôi phục chuyên khoa');
    }
  };

  // ─── DƯỢC & ĐƠN VỊ TÍNH ACTIONS ───────────────────────────────
  const handleAddDvt = () => {
    if (!newDvt.trim()) return;
    const val = newDvt.trim();
    if (duocConfig.donViTinh.includes(val)) {
      showToast('error', 'Đơn vị tính này đã tồn tại');
      return;
    }
    const next = { ...duocConfig, donViTinh: [...duocConfig.donViTinh, val] };
    setDuocConfig(next);
    setNewDvt('');
  };

  const handleRemoveDvt = (item) => {
    const next = { ...duocConfig, donViTinh: duocConfig.donViTinh.filter(d => d !== item) };
    setDuocConfig(next);
  };

  const handleAddDuongDung = () => {
    if (!newDuongDung.trim()) return;
    const val = newDuongDung.trim();
    if (duocConfig.duongDung.includes(val)) {
      showToast('error', 'Đường dùng này đã tồn tại');
      return;
    }
    const next = { ...duocConfig, duongDung: [...duocConfig.duongDung, val] };
    setDuocConfig(next);
    setNewDuongDung('');
  };

  const handleRemoveDuongDung = (item) => {
    const next = { ...duocConfig, duongDung: duocConfig.duongDung.filter(d => d !== item) };
    setDuocConfig(next);
  };

  const handleOpenCreateNhomDuoc = () => {
    setNhomDuocForm({ ten: '', moTa: '' });
    setModalNhomDuoc({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditNhomDuoc = (nd) => {
    setNhomDuocForm({ ten: nd.ten || '', moTa: nd.moTa || '' });
    setModalNhomDuoc({ open: true, mode: 'edit', data: nd });
  };

  const handleSubmitNhomDuoc = (e) => {
    e.preventDefault();
    if (!nhomDuocForm.ten.trim()) {
      showToast('error', 'Vui lòng nhập tên nhóm dược lý');
      return;
    }
    let nextList = [];
    if (modalNhomDuoc.mode === 'create') {
      const newId = 'nd_' + Date.now();
      nextList = [...(duocConfig.nhomDuocLy || []), { id: newId, ten: nhomDuocForm.ten.trim(), moTa: nhomDuocForm.moTa.trim() }];
    } else {
      nextList = (duocConfig.nhomDuocLy || []).map(nd =>
        nd.id === modalNhomDuoc.data.id ? { ...nd, ten: nhomDuocForm.ten.trim(), moTa: nhomDuocForm.moTa.trim() } : nd
      );
    }
    setDuocConfig({ ...duocConfig, nhomDuocLy: nextList });
    setModalNhomDuoc({ open: false, mode: 'create', data: null });
  };

  const handleDeleteNhomDuoc = (nd) => {
    const nextList = (duocConfig.nhomDuocLy || []).filter(item => item.id !== nd.id);
    setDuocConfig({ ...duocConfig, nhomDuocLy: nextList });
  };

  const handleSaveDuocConfig = async () => {
    setSavingDuoc(true);
    try {
      await apiPut('/quan-ly/danh-muc-duoc', duocConfig);
      showToast('success', 'Lưu danh mục dược & đơn vị tính thành công!');
    } catch (err) {
      showToast('error', 'Không thể lưu danh mục dược');
    } finally {
      setSavingDuoc(false);
    }
  };

  // ─── KHOA / PHÒNG BAN ACTIONS ─────────────────────────────────
  const handleOpenCreatePB = () => {
    setPbForm({ tenPhongBan: '', moTa: '' });
    setModalPhongBan({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditPB = (pb) => {
    setPbForm({ tenPhongBan: pb.ten_phong_ban || '', moTa: pb.moTa || pb.mo_ta || '' });
    setModalPhongBan({ open: true, mode: 'edit', data: pb });
  };

  const handleSubmitPB = async (e) => {
    e.preventDefault();
    if (!pbForm.tenPhongBan.trim()) {
      showToast('error', 'Vui lòng nhập tên khoa / phòng ban');
      return;
    }
    setPbSubmitting(true);
    try {
      if (modalPhongBan.mode === 'create') {
        await apiPost('/quan-ly/phong-ban', {
          tenPhongBan: pbForm.tenPhongBan.trim(),
          moTa: pbForm.moTa.trim(),
        });
        showToast('success', 'Thêm mới khoa / phòng ban thành công!');
      } else {
        await apiPut(`/quan-ly/phong-ban/${modalPhongBan.data.id}`, {
          tenPhongBan: pbForm.tenPhongBan.trim(),
          moTa: pbForm.moTa.trim(),
        });
        showToast('success', 'Cập nhật khoa / phòng ban thành công!');
      }
      setModalPhongBan({ open: false, mode: 'create', data: null });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu phòng ban');
    } finally {
      setPbSubmitting(false);
    }
  };

  // ─── PHÒNG KHÁM THỰC TẾ ACTIONS ───────────────────────────────
  const handleOpenCreatePK = () => {
    setPkForm({
      tenPhong: '',
      viTri: 'Tầng 1 - Khu A',
      chuyenKhoa: 'Nội tổng quát',
      trangThai: 'hoat_dong',
      phongBanId: data.phongBans[0]?.id || '',
    });
    setModalPhongKham({ open: true, mode: 'create', data: null });
  };

  const handleOpenEditPK = (pk) => {
    setPkForm({
      tenPhong: pk.ten_phong || '',
      viTri: pk.vi_tri || '',
      chuyenKhoa: pk.chuyen_khoa || '',
      trangThai: pk.trang_thai || 'hoat_dong',
      phongBanId: pk.phong_ban_id || '',
    });
    setModalPhongKham({ open: true, mode: 'edit', data: pk });
  };

  const handleSubmitPK = async (e) => {
    e.preventDefault();
    if (!pkForm.tenPhong.trim()) {
      showToast('error', 'Vui lòng nhập tên phòng khám');
      return;
    }
    setPkSubmitting(true);
    try {
      const payload = {
        tenPhong: pkForm.tenPhong.trim(),
        viTri: pkForm.viTri.trim(),
        chuyenKhoa: pkForm.chuyenKhoa.trim(),
        trangThai: pkForm.trangThai,
        phongBanId: pkForm.phongBanId ? Number(pkForm.phongBanId) : null,
      };

      if (modalPhongKham.mode === 'create') {
        await apiPost('/quan-ly/phong-kham', payload);
        showToast('success', 'Thêm mới phòng khám thành công!');
      } else {
        await apiPut(`/quan-ly/phong-kham/${modalPhongKham.data.id}`, payload);
        showToast('success', 'Cập nhật thông tin phòng khám thành công!');
      }
      setModalPhongKham({ open: false, mode: 'create', data: null });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu phòng khám');
    } finally {
      setPkSubmitting(false);
    }
  };

  const handleQuickTogglePKStatus = async (pk) => {
    const nextStatus = pk.trang_thai === 'hoat_dong' ? 'bao_tri' : 'hoat_dong';
    try {
      await apiPatch(`/quan-ly/phong-kham/${pk.id}/trang-thai`, { trangThai: nextStatus });
      showToast('success', `Đã chuyển phòng "${pk.ten_phong}" sang trạng thái ${STATUS_LABELS[nextStatus].label}`);
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Không thể đổi trạng thái phòng');
    }
  };

  // ─── DELETE ACTION (GENERIC) ──────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      if (deleteModal.type === 'phong_ban') {
        await apiDelete(`/quan-ly/phong-ban/${deleteModal.item.id}`);
        showToast('success', `Đã xóa khoa / phòng ban "${deleteModal.item.ten_phong_ban}"`);
      } else {
        const res = await apiDelete(`/quan-ly/phong-kham/${deleteModal.item.id}`);
        showToast('success', res?.message || `Đã xử lý xóa phòng khám "${deleteModal.item.ten_phong}"`);
      }
      setDeleteModal({ open: false, type: null, item: null, loading: false });
      fetchDanhMuc();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Không thể xóa mục đã chọn');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ─── THÔNG TIN BỆNH VIỆN SUBMIT ──────────────────────────────
  const policy = hospitalInfo.chinhSachBaoMat || {};
  const updatePolicy = (patch) => setHospitalInfo({ ...hospitalInfo, chinhSachBaoMat: { ...policy, ...patch } });
  const updatePolicyItem = (key, idx, patch) =>
    updatePolicy({ [key]: (policy[key] || []).map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const removePolicyItem = (key, idx) => updatePolicy({ [key]: (policy[key] || []).filter((_, i) => i !== idx) });
  const moveDieuKhoan = (idx, dir) => {
    const list = [...(policy.danhSachDieuKhoan || [])];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    updatePolicy({ danhSachDieuKhoan: list });
  };

  const handleSaveHospitalInfo = async (e) => {
    e.preventDefault();
    setSavingHospital(true);
    try {
      const dvList = dichVuText
        .split('\n')
        .map(s => s.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(Boolean);

      const payload = {
        ...hospitalInfo,
        dichVuNoiBat: dvList,
        chinhSachBaoMat: {
          ...policy,
          tieuChuanTuanThu: (policy.tieuChuanTuanThu || []).map(b => b.trim()).filter(Boolean),
          danhSachDieuKhoan: (policy.danhSachDieuKhoan || []).map((dk, i) => ({
            ...dk,
            id: dk.id || `dieu-khoan-${i + 1}`,
            danhSachChiTiet: (dk.danhSachChiTiet || []).map(x => x.trim()).filter(Boolean),
          })),
        },
      };

      await apiPut('/quan-ly/thong-tin-benh-vien', payload);
      useHospitalStore.getState().setHospitalInfo(payload);
      showToast('success', 'Đã lưu cấu hình thông tin bệnh viện thành công! Header & Footer toàn hệ thống đã được cập nhật.');
      fetchHospitalInfo();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi lưu thông tin bệnh viện');
    } finally {
      setSavingHospital(false);
    }
  };

  // ─── FILTERED DATA ────────────────────────────────────────────
  const filteredPhongBans = useMemo(() => {
    return data.phongBans.filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.ten_phong_ban?.toLowerCase().includes(term) ||
        p.mo_ta?.toLowerCase().includes(term) ||
        String(p.id).includes(term)
      );
    });
  }, [data.phongBans, searchTerm]);

  const filteredPhongKhams = useMemo(() => {
    return data.phongKhams.filter(p => {
      const matchSearch = !searchTerm ||
        p.ten_phong?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.chuyen_khoa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vi_tri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ten_phong_ban?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchKhoa = filterKhoa === 'all' || String(p.phong_ban_id) === String(filterKhoa);
      const matchStatus = filterStatus === 'all' || p.trang_thai === filterStatus;

      return matchSearch && matchKhoa && matchStatus;
    });
  }, [data.phongKhams, searchTerm, filterKhoa, filterStatus]);

  const filteredChuyenKhoas = useMemo(() => {
    return (chuyenKhoas || []).filter(ck => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        ck.ten?.toLowerCase().includes(term) ||
        ck.ma?.toLowerCase().includes(term) ||
        ck.moTa?.toLowerCase().includes(term)
      );
    });
  }, [chuyenKhoas, searchTerm]);

  const tabs = [
    { id: 'phong_ban', label: 'Khoa / Phòng Ban', icon: Building2, count: data.phongBans?.length || 0 },
    { id: 'phong_kham', label: 'Phòng Khám Thực Tế', icon: DoorOpen, count: data.phongKhams?.length || 0 },
    { id: 'chuyen_khoa', label: 'Chuyên Khoa Y Tế', icon: Stethoscope, count: chuyenKhoas?.length || 0 },
    { id: 'danh_muc_duoc', label: 'Dược & Đơn Vị Tính', icon: Pill, badge: `${duocConfig.donViTinh?.length || 0} ĐVT` },
    { id: 'thong_tin_benh_vien', label: 'Thông Tin Bệnh Viện', icon: Building, badge: 'Footer & Liên hệ' },
    { id: 'chinh_sach_bao_mat', label: 'Chính Sách & Bảo Mật Dữ Liệu', icon: ShieldCheck, badge: 'NĐ 13 / EMR' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in max-w-7xl mx-auto">
      {/* Toast Notice */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 transition-all animate-bounce-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold mb-1.5">
            <Layers className="h-3 w-3" /> MASTER DATA MANAGEMENT
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 leading-tight">Quản Lý Danh Mục Dùng Chung</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Quản trị cơ cấu phòng khám: Chuyên khoa, buồng khám thực tế, cấu hình dịch vụ và thông tin pháp lý, bảo mật dữ liệu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => { fetchDanhMuc(); fetchHospitalInfo(); fetchChuyenKhoas(); fetchDanhMucDuoc(); }}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>

          {activeTab === 'phong_ban' && (
            <button
              onClick={handleOpenCreatePB}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thêm Khoa / Phòng Ban
            </button>
          )}

          {activeTab === 'phong_kham' && (
            <button
              onClick={handleOpenCreatePK}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thêm Phòng Khám
            </button>
          )}

          {activeTab === 'chuyen_khoa' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResetDefaultCK}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-gray-200"
                title="Khôi phục danh mục chuyên khoa theo chuẩn Bộ Y Tế"
              >
                <RotateCcw className="h-3.5 w-3.5 text-gray-600" />
                <span>Chuẩn BYT</span>
              </button>
              <button
                onClick={handleOpenCreateCK}
                className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Thêm Chuyên Khoa
              </button>
            </div>
          )}

          {activeTab === 'danh_muc_duoc' && (
            <button
              onClick={handleSaveDuocConfig}
              disabled={savingDuoc}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{savingDuoc ? 'Đang lưu...' : 'Lưu Danh Mục Dược'}</span>
            </button>
          )}

          {activeTab === 'chinh_sach_bao_mat' && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/chinh-sach-bao-mat"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Xem Trang Công Khai</span>
              </a>
              <button
                onClick={handleSaveHospitalInfo}
                disabled={savingHospital}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{savingHospital ? 'Đang lưu...' : 'Lưu Chính Sách'}</span>
              </button>
            </div>
          )}

          {activeTab === 'thong_tin_benh_vien' && (
            <button
              onClick={handleSaveHospitalInfo}
              disabled={savingHospital}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{savingHospital ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation — Cuộn ngang mượt trên điện thoại, hiển thị lưới gọn gàng trên PC */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto lg:flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-[13px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-50/70 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-700'}`}>
                  {tab.count}
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1 & TAB 2 CONTROLS ───────────────────────────────── */}
      {(activeTab === 'phong_ban' || activeTab === 'phong_kham' || activeTab === 'chuyen_khoa') && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
              activeTab === 'phong_ban'
                ? 'Tìm tên khoa, phòng ban, mô tả...'
                : activeTab === 'phong_kham'
                ? 'Tìm tên phòng, chuyên khoa, vị trí...'
                : 'Tìm mã, tên hoặc mô tả chuyên khoa...'
            }
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          {activeTab === 'phong_kham' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterKhoa}
                onChange={(e) => setFilterKhoa(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tất cả Khoa / Phòng ban</option>
                {data.phongBans.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.ten_phong_ban}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="hoat_dong">Đang hoạt động</option>
                <option value="bao_tri">Tạm bảo trì</option>
                <option value="dong_cua">Đóng cửa</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT ─────────────────────────────────────────── */}
      {activeTab === 'thong_tin_benh_vien' ? (
        /* ─── TAB 3: THÔNG TIN BỆNH VIỆN & CƠ SỞ Y TẾ ────────────── */
        <div className="space-y-6">
          <form onSubmit={handleSaveHospitalInfo} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Form nhập liệu cấu hình (7 cột) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Định danh & Giấy phép */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary-600 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Nhận Diện Cơ Sở Y Tế & Pháp Lý</h3>
                    <p className="text-xs text-gray-500">Tên thương hiệu, giấy phép hoạt động và khẩu hiệu</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tên Cơ Sở Khám Chữa Bệnh / Phòng Khám <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={hospitalInfo.tenBenhVien || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, tenBenhVien: e.target.value })}
                        placeholder="Ví dụ: PHÒNG KHÁM ĐA KHOA..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Khẩu Hiệu / Tiêu Đề Phụ (Dưới logo navbar)
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.slogan || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, slogan: e.target.value })}
                        placeholder="Ví dụ: TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-primary-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Giới Thiệu Ngắn / Khẩu Hiệu Hoạt Động
                    </label>
                    <textarea
                      rows={2}
                      value={hospitalInfo.moTa || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, moTa: e.target.value })}
                      placeholder="Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt..."
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Số Giấy Phép Hoạt Động Y Tế
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.soGiayPhep || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, soGiayPhep: e.target.value })}
                        placeholder="Ví dụ: Giấy phép hoạt động số 08922/BYT-GPHĐ"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Bản Quyền / Footer Copyright
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.banQuyen || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, banQuyen: e.target.value })}
                        placeholder="© 2026 Hệ Thống Quản Lý Phòng Khám..."
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Thông tin liên hệ & Đón tiếp */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Thông Tin Liên Hệ & Đón Tiếp Bệnh Nhân</h3>
                    <p className="text-xs text-gray-500">Trụ sở phòng khám, tổng đài và khung giờ hoạt động</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      Địa Chỉ Trụ Sở Khám Bệnh <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalInfo.diaChi || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, diaChi: e.target.value })}
                      placeholder="123 Nguyễn Văn Cừ, Quận 5, TP.HCM"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        Số Tổng Đài CSKH
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.tongDai || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, tongDai: e.target.value })}
                        placeholder="1900 8888"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Giờ Tiếp Đón Khám
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.gioLamViec || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, gioLamViec: e.target.value })}
                        placeholder="07:00 – 20:00 (Thứ 2 - CN)"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-purple-500" />
                        Email CSKH
                      </label>
                      <input
                        type="email"
                        value={hospitalInfo.email || ''}
                        onChange={(e) => setHospitalInfo({ ...hospitalInfo, email: e.target.value })}
                        placeholder="hotro@phongkhamdakhoa.vn"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Đường Dây Nóng Khẩn Cấp (Cấp Cứu 24/24) */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Đường Dây Nóng Khẩn Cấp (Cấp Cứu 24/24)</h3>
                    <p className="text-xs text-gray-500">Khối thông tin nổi bật xử trí tình huống khẩn cấp</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu Đề Khối Cấp Cứu
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.tieuDeCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, tieuDeCapCuu: e.target.value })}
                      placeholder="CẤP CỨU 24/24"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Số Hotline Cấp Cứu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalInfo.hotlineCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, hotlineCapCuu: e.target.value })}
                      placeholder="1900 8888"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-black text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Khẩu Hiệu / Ghi Chú Túc Trực
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.khauHieuCapCuu || ''}
                      onChange={(e) => setHospitalInfo({ ...hospitalInfo, khauHieuCapCuu: e.target.value })}
                      placeholder="Luôn sẵn sàng tiếp nhận & xử trí y tế"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Dịch vụ nổi bật ở Footer */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Danh Mục Dịch Vụ Nổi Bật (Footer)</h3>
                    <p className="text-xs text-gray-500">Mỗi dòng là một dịch vụ y tế hiển thị trong danh sách footer</p>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={5}
                    value={dichVuText}
                    onChange={(e) => setDichVuText(e.target.value)}
                    placeholder="Khám bệnh Nội tổng quát & Tim mạch&#10;Khám Tai Mũi Họng & Nội soi&#10;Khám Nhi khoa & Dinh dưỡng&#10;Chẩn đoán hình ảnh & Xét nghiệm Laser&#10;Khám tư vấn từ xa (Telehealth)"
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Nhập mỗi dịch vụ trên một dòng riêng. Hệ thống tự động chuyển đổi thành danh sách gạch đầu dòng ở chân trang.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingHospital}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingHospital ? 'Đang lưu hệ thống...' : 'Lưu Thay Đổi Thông Tin Bệnh Viện'}</span>
                </button>
              </div>
            </div>

            {/* Cột phải: Xem trước trực quan (Live Preview - 5 cột) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-primary-600" />
                    Xem Trước Giao Diện Chân Trang (Live Preview)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Khớp 100% Trang Chủ
                  </span>
                </div>
                {/* Simulated Header Preview */}
                <div className="mb-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    1. Xem trước Thanh Điều Hướng (Navbar Header):
                  </span>
                  <div className="rounded-2xl bg-white border border-gray-200 p-3 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shrink-0">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 tracking-tight leading-none uppercase">
                          {hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}
                        </span>
                        <span className="text-[9px] font-bold text-primary-700 tracking-wider uppercase mt-1">
                          {hospitalInfo.slogan || 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 hidden sm:block text-right">
                      <span>Hotline: <strong className="text-primary-700 font-bold">{hospitalInfo.tongDai || '1900 8888'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    2. Xem trước Chân Trang (Footer):
                  </span>
                  {/* Simulated Footer Box */}
                  <div className="rounded-2xl bg-slate-900 text-slate-400 p-6 shadow-inner text-xs space-y-6 border border-slate-800">
                  <div className="space-y-6">
                    {/* Cột 1: Tên & Giấy phép */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white font-black text-sm">
                        <Stethoscope className="h-4 w-4 text-primary-400" />
                        <span>{hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {hospitalInfo.moTa || 'Cơ sở khám chữa bệnh đa khoa kỹ thuật cao...'}
                      </p>
                      <p className="text-emerald-400 text-[11px] font-semibold">
                        {hospitalInfo.soGiayPhep || 'Giấy phép hoạt động số 08922/BYT-GPHĐ'}
                      </p>
                    </div>

                    {/* Cột 2: Thông tin liên hệ */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Thông Tin Liên Hệ</h4>
                      <ul className="space-y-1.5 text-slate-400 text-[11px]">
                        <li className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                          <span>{hospitalInfo.diaChi || '123 Nguyễn Văn Cừ, Quận 5, TP.HCM'}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>Tổng đài: <strong className="text-white">{hospitalInfo.tongDai || '1900 8888'}</strong></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span>Giờ làm: {hospitalInfo.gioLamViec || '07:00 – 20:00 (Thứ 2 - CN)'}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Cột 3: Dịch vụ nổi bật */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Dịch Vụ Nổi Bật</h4>
                      <ul className="space-y-1 text-slate-400 text-[11px]">
                        {(dichVuText ? dichVuText.split('\n').filter(Boolean) : hospitalInfo.dichVuNoiBat || []).map((dv, idx) => (
                          <li key={idx} className="line-clamp-1">• {dv.replace(/^[•\-\*]\s*/, '')}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Cột 4: Đường dây nóng */}
                    <div className="pt-2 border-t border-slate-800">
                      <h4 className="text-white font-bold text-xs mb-2">Đường Dây Nóng Khẩn Cấp</h4>
                      <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1">
                        <p className="text-slate-300 font-bold text-[10px] uppercase">
                          {hospitalInfo.tieuDeCapCuu || 'CẤP CỨU 24/24'}
                        </p>
                        <p className="text-xl font-black text-emerald-400 tracking-wide">
                          {hospitalInfo.hotlineCapCuu || '1900 8888'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {hospitalInfo.khauHieuCapCuu || 'Luôn sẵn sàng tiếp nhận & xử trí y tế'}
                        </p>
                      </div>
                    </div>

                    {/* Copyright line */}
                    <div className="pt-4 border-t border-slate-800 text-center text-slate-500 text-[10px]">
                      {hospitalInfo.banQuyen || '© 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      ) : activeTab === 'chinh_sach_bao_mat' ? (
        /* ─── TAB: CHÍNH SÁCH BẢO MẬT & BẢO VỆ DỮ LIỆU Y TẾ ───────── */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-950">Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Y Tế Cá Nhân</p>
                <p className="text-emerald-700 mt-0.5">
                  Quy chuẩn tuân thủ <b>Nghị định 13/2023/NĐ-CP</b>, <b>Luật Khám bệnh, chữa bệnh 2023</b> và tiêu chuẩn mã hóa bệnh án điện tử (EMR).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <a
                href="/chinh-sach-bao-mat"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem Trang Công Khai</span>
              </a>
              <button
                type="button"
                onClick={handleSaveHospitalInfo}
                disabled={savingHospital}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingHospital ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveHospitalInfo} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái (7 cột): Cấu hình chung & DPO */}
            <div className="lg:col-span-7 space-y-5">
              {/* Box 1: Định Danh & Mô Tả Cam Kết */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Định Danh Văn Bản & Cam Kết Mở Đầu</h3>
                    <p className="text-xs text-gray-500">Thông tin xuất bản công khai trên website</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tiêu Đề Trang Chính Sách <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.chinhSachBaoMat?.tieuDeTrang || ''}
                        onChange={(e) => setHospitalInfo({
                          ...hospitalInfo,
                          chinhSachBaoMat: {
                            ...(hospitalInfo.chinhSachBaoMat || {}),
                            tieuDeTrang: e.target.value,
                          }
                        })}
                        placeholder="Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Y Tế Cá Nhân"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ngày Cập Nhật
                      </label>
                      <input
                        type="text"
                        value={hospitalInfo.chinhSachBaoMat?.ngayCapNhat || ''}
                        onChange={(e) => setHospitalInfo({
                          ...hospitalInfo,
                          chinhSachBaoMat: {
                            ...(hospitalInfo.chinhSachBaoMat || {}),
                            ngayCapNhat: e.target.value,
                          }
                        })}
                        placeholder="05/11/2026"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nhãn Đầu Trang
                    </label>
                    <input
                      type="text"
                      value={policy.nhanHero || ''}
                      onChange={(e) => updatePolicy({ nhanHero: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Đoạn Mô Tả Cam Kết Mở Đầu <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={hospitalInfo.chinhSachBaoMat?.moTaMoDau || ''}
                      onChange={(e) => setHospitalInfo({
                        ...hospitalInfo,
                        chinhSachBaoMat: {
                          ...(hospitalInfo.chinhSachBaoMat || {}),
                          moTaMoDau: e.target.value,
                        }
                      })}
                      placeholder="Cam kết bảo vệ tuyệt đối thông tin sức khỏe của phòng khám..."
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tiêu Chuẩn Pháp Lý & Kỹ Thuật Tuân Thủ
                    </label>
                    <div className="space-y-2">
                      {(policy.tieuChuanTuanThu || []).map((badge, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={badge}
                            onChange={(e) => updatePolicy({ tieuChuanTuanThu: policy.tieuChuanTuanThu.map((b, i) => (i === idx ? e.target.value : b)) })}
                            className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => updatePolicy({ tieuChuanTuanThu: policy.tieuChuanTuanThu.filter((_, i) => i !== idx) })}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updatePolicy({ tieuChuanTuanThu: [...(policy.tieuChuanTuanThu || []), ''] })}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm tiêu chuẩn
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Thông Tin Cán Bộ / Ban Bảo Vệ Dữ Liệu (DPO) */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Đầu Mối Tiếp Nhận Khiếu Nại & Bảo Vệ Dữ Liệu (DPO)</h3>
                    <p className="text-xs text-gray-500">Người bệnh có thể liên hệ trực tiếp để tra cứu hoặc yêu cầu bảo mật</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Đơn Vị Phụ Trách Dữ Liệu Cá Nhân
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.chinhSachBaoMat?.thongTinLienHeBaoMat?.donViPhuTrach || ''}
                      onChange={(e) => setHospitalInfo({
                        ...hospitalInfo,
                        chinhSachBaoMat: {
                          ...(hospitalInfo.chinhSachBaoMat || {}),
                          thongTinLienHeBaoMat: {
                            ...((hospitalInfo.chinhSachBaoMat || {}).thongTinLienHeBaoMat || {}),
                            donViPhuTrach: e.target.value,
                          }
                        }
                      })}
                      placeholder="Ban Bảo Vệ Dữ Liệu Cá Nhân & Phòng Công Nghệ Thông Tin"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email Liên Hệ DPO
                    </label>
                    <input
                      type="email"
                      value={hospitalInfo.chinhSachBaoMat?.thongTinLienHeBaoMat?.email || ''}
                      onChange={(e) => setHospitalInfo({
                        ...hospitalInfo,
                        chinhSachBaoMat: {
                          ...(hospitalInfo.chinhSachBaoMat || {}),
                          thongTinLienHeBaoMat: {
                            ...((hospitalInfo.chinhSachBaoMat || {}).thongTinLienHeBaoMat || {}),
                            email: e.target.value,
                          }
                        }
                      })}
                      placeholder="dpo@phongkhamdakhoa.vn"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Hotline Tiếp Nhận
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.chinhSachBaoMat?.thongTinLienHeBaoMat?.hotline || ''}
                      onChange={(e) => setHospitalInfo({
                        ...hospitalInfo,
                        chinhSachBaoMat: {
                          ...(hospitalInfo.chinhSachBaoMat || {}),
                          thongTinLienHeBaoMat: {
                            ...((hospitalInfo.chinhSachBaoMat || {}).thongTinLienHeBaoMat || {}),
                            hotline: e.target.value,
                          }
                        }
                      })}
                      placeholder="1900 8888 (Nhánh 4)"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Địa Chỉ Tiếp Nhận Trực Tiếp
                    </label>
                    <input
                      type="text"
                      value={hospitalInfo.chinhSachBaoMat?.thongTinLienHeBaoMat?.diaChiTiepNhan || ''}
                      onChange={(e) => setHospitalInfo({
                        ...hospitalInfo,
                        chinhSachBaoMat: {
                          ...(hospitalInfo.chinhSachBaoMat || {}),
                          thongTinLienHeBaoMat: {
                            ...((hospitalInfo.chinhSachBaoMat || {}).thongTinLienHeBaoMat || {}),
                            diaChiTiepNhan: e.target.value,
                          }
                        }
                      })}
                      placeholder="Phòng Tiếp Dân & Pháp Chế Y Tế - Tầng 1, Khu A"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu Đề Mục Liên Hệ (cuối trang công khai)
                    </label>
                    <input
                      type="text"
                      value={policy.tieuDeMucLienHe || ''}
                      onChange={(e) => updatePolicy({ tieuDeMucLienHe: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Đoạn Dẫn Mục Liên Hệ
                    </label>
                    <textarea
                      rows={3}
                      value={policy.moTaMucLienHe || ''}
                      onChange={(e) => updatePolicy({ moTaMucLienHe: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu Đề Hộp Hỗ Trợ (cột trái trang công khai)
                    </label>
                    <input
                      type="text"
                      value={policy.hoTroTieuDe || ''}
                      onChange={(e) => updatePolicy({ hoTroTieuDe: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nội Dung Hộp Hỗ Trợ
                    </label>
                    <textarea
                      rows={2}
                      value={policy.hoTroMoTa || ''}
                      onChange={(e) => updatePolicy({ hoTroMoTa: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải (5 cột): 3 Cam kết cốt lõi & Các điều khoản pháp lý */}
            <div className="lg:col-span-5 space-y-5">
              {/* Box 3: 3 Cam Kết Cốt Lõi */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                    3 Cam Kết Cốt Lõi Quyền Riêng Tư
                  </h4>
                </div>

                {(policy.camKetCotLoi || []).map((ck, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <input
                      type="text"
                      value={ck.tieuDe || ''}
                      onChange={(e) => updatePolicyItem('camKetCotLoi', idx, { tieuDe: e.target.value })}
                      placeholder="Tiêu đề cam kết"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                    <textarea
                      rows={3}
                      value={ck.moTa || ''}
                      onChange={(e) => updatePolicyItem('camKetCotLoi', idx, { moTa: e.target.value })}
                      placeholder="Mô tả cam kết"
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Box 4: Danh Mục 5 Điều Khoản Chi Tiết */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary-600" />
                    <span>Điều Khoản Chi Tiết</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {(policy.danhSachDieuKhoan || []).length} Điều khoản
                  </span>
                </div>

                <div className="space-y-3">
                  {(policy.danhSachDieuKhoan || []).map((dk, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={dk.tieuDe || ''}
                          onChange={(e) => updatePolicyItem('danhSachDieuKhoan', idx, { tieuDe: e.target.value })}
                          placeholder="Tiêu đề điều khoản"
                          className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                        />
                        <button type="button" onClick={() => moveDieuKhoan(idx, -1)} disabled={idx === 0} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-30">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveDieuKhoan(idx, 1)} disabled={idx === (policy.danhSachDieuKhoan || []).length - 1} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-30">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => removePolicyItem('danhSachDieuKhoan', idx)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={dk.noiDung || ''}
                        onChange={(e) => updatePolicyItem('danhSachDieuKhoan', idx, { noiDung: e.target.value })}
                        placeholder="Nội dung điều khoản"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed resize-none"
                      />
                      <textarea
                        rows={3}
                        value={(dk.danhSachChiTiet || []).join('\n')}
                        onChange={(e) => updatePolicyItem('danhSachDieuKhoan', idx, { danhSachChiTiet: e.target.value.split('\n') })}
                        placeholder="Các gạch đầu dòng chi tiết (mỗi dòng một ý, có thể để trống)"
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed resize-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updatePolicy({ danhSachDieuKhoan: [...(policy.danhSachDieuKhoan || []), { id: `dieu-khoan-${Date.now()}`, tieuDe: '', noiDung: '', danhSachChiTiet: [] }] })}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm điều khoản
                  </button>
                </div>

                <div className="pt-2">
                  <a
                    href="/chinh-sach-bao-mat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Toàn Văn Chính Sách Công Khai</span>
                  </a>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : activeTab === 'chuyen_khoa' ? (
        /* ─── TAB: CHUYÊN KHOA Y TẾ ────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary-600" />
              <span className="font-medium">
                Chuyên khoa y tế dùng chung cho: <b>Đặt lịch khám bệnh nhân</b>, <b>Cẩm nang bài viết y khoa</b>, <b>Phân loại buồng khám</b> & <b>Báo cáo</b>.
              </span>
            </div>
            <span className="font-semibold text-slate-500">
              Tổng số: <b>{filteredChuyenKhoas.length}</b> chuyên khoa
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Mã CK</th>
                  <th className="px-6 py-3.5">Tên Chuyên Khoa</th>
                  <th className="px-6 py-3.5">Mô Tả Chức Năng Y Khoa</th>
                  <th className="px-6 py-3.5 text-center">Phòng Khám Thực Tế</th>
                  <th className="px-6 py-3.5 text-center">Trạng Thái</th>
                  <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredChuyenKhoas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 text-sm">
                      Không tìm thấy chuyên khoa nào phù hợp với từ khóa tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredChuyenKhoas.map((ck) => {
                    const matchRoomCount = data.phongKhams.filter(pk =>
                      pk.chuyen_khoa?.toLowerCase() === ck.ten?.toLowerCase() ||
                      pk.ten_phong?.toLowerCase().includes(ck.ten?.toLowerCase())
                    ).length;
                    const isActive = ck.trangThai === 'hoat_dong';
                    return (
                      <tr key={ck.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500 text-xs font-bold">
                          <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-slate-700">
                            {ck.ma || ck.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <span className="text-sm">{ck.ten}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 max-w-md">
                          {ck.moTa || <span className="text-gray-400 italic">Chưa có mô tả chi tiết</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <DoorOpen className="w-3 h-3" />
                            {matchRoomCount} buồng khám
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatusCK(ck)}
                            title="Nhấp để chuyển đổi trạng thái"
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActive ? 'Đang tiếp nhận' : 'Tạm ngưng'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCK(ck)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                              title="Chỉnh sửa chuyên khoa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCK(ck)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa chuyên khoa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'danh_muc_duoc' ? (
        /* ─── TAB: DƯỢC & ĐƠN VỊ TÍNH ──────────────────────────────── */
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Các danh mục Đơn vị tính và Đường dùng thuốc này được nạp tự động vào <b>Kho Dược</b>, <b>Kê Đơn Thuốc Bác Sĩ</b> và <b>Hóa Đơn Thuốc</b>. Sau khi chỉnh sửa, nhớ nhấn nút <b>"Lưu Danh Mục Dược"</b> ở góc trên bên phải.
              </span>
            </div>
            <button
              onClick={handleSaveDuocConfig}
              disabled={savingDuoc}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap self-end sm:self-auto"
            >
              {savingDuoc ? 'Đang lưu...' : 'Lưu Danh Mục Dược'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Đơn Vị Tính */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Đơn Vị Tính Thuốc & Vật Tư</h3>
                    <p className="text-xs text-gray-500">Đơn vị phân phối và đóng gói thuốc</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {duocConfig.donViTinh?.length || 0} ĐVT
                </span>
              </div>

              {/* Add form */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDvt}
                  onChange={(e) => setNewDvt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDvt(); } }}
                  placeholder="Nhập ĐVT mới (ví dụ: Hộp, Vỉ, Viên, Ống, Lọ...)"
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddDvt}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm ĐVT
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(duocConfig.donViTinh || []).map((dvt, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold hover:border-slate-300 transition-colors"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{dvt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDvt(dvt)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-0.5 transition-colors cursor-pointer"
                      title="Xóa đơn vị tính"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Box 2: Đường Dùng */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Đường Dùng Y Khoa Chuẩn</h3>
                    <p className="text-xs text-gray-500">Đường đưa thuốc vào cơ thể theo chuẩn BYT</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {duocConfig.duongDung?.length || 0} đường dùng
                </span>
              </div>

              {/* Add form */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDuongDung}
                  onChange={(e) => setNewDuongDung(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDuongDung(); } }}
                  placeholder="Nhập đường dùng mới (ví dụ: Uống, Tiêm bắp, Nhỏ mắt...)"
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddDuongDung}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Đường Dùng
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(duocConfig.duongDung || []).map((dd, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold hover:border-slate-300 transition-colors"
                  >
                    <Activity className="w-3 h-3 text-slate-400" />
                    <span>{dd}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDuongDung(dd)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-0.5 transition-colors cursor-pointer"
                      title="Xóa đường dùng"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Box 3: Nhóm Dược Lý & Phân Loại Thuốc */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Nhóm Dược Lý & Danh Mục Phân Loại</h3>
                <p className="text-xs text-gray-500 mt-0.5">Phân nhóm dược học để quản lý danh mục thuốc và cảnh báo tương tác</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateNhomDuoc}
                className="px-3.5 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Nhóm Dược
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3.5">Mã / ID</th>
                    <th className="px-6 py-3.5">Tên Nhóm Dược Lý</th>
                    <th className="px-6 py-3.5">Mô Tả / Đặc Tính Trị Liệu</th>
                    <th className="px-6 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(!duocConfig.nhomDuocLy || duocConfig.nhomDuocLy.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-400 text-sm">
                        Chưa có nhóm dược lý nào được tạo.
                      </td>
                    </tr>
                  ) : (
                    duocConfig.nhomDuocLy.map((nd) => (
                      <tr key={nd.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs font-semibold">
                          #{nd.id}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-gray-900 text-sm">
                          {nd.ten}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-600">
                          {nd.moTa || <span className="text-gray-400 italic">Chưa có mô tả</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditNhomDuoc(nd)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                              title="Sửa nhóm dược"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNhomDuoc(nd)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nhóm dược"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ─── TAB 1 & TAB 2 MAIN TABLES ───────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="font-medium">Đang tải danh mục dữ liệu...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ─── TAB 1: KHOA / PHÒNG BAN ──────────────────────────── */}
              {activeTab === 'phong_ban' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Tên Khoa / Phòng Ban</th>
                      <th className="px-6 py-3.5">Mô Tả Chức Năng</th>
                      <th className="px-6 py-3.5 text-center">Nhân Sự Trực Thuộc</th>
                      <th className="px-6 py-3.5 text-center">Phòng Khám Thuộc Khoa</th>
                      <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPhongBans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                          Không tìm thấy khoa / phòng ban nào phù hợp với tìm kiếm
                        </td>
                      </tr>
                    ) : (
                      filteredPhongBans.map((pb) => (
                        <tr key={pb.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono text-gray-500 text-xs font-semibold">#{pb.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                              <span>{pb.ten_phong_ban}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs max-w-md">
                            {pb.mo_ta || <span className="text-gray-400 italic">Chưa có mô tả chức năng</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-3 h-3" /> {pb.so_nhan_su || 0} nhân sự
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <DoorOpen className="w-3 h-3" /> {pb.so_phong_kham || 0} phòng
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditPB(pb)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Chỉnh sửa khoa / phòng ban"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ open: true, type: 'phong_ban', item: pb, loading: false })}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa khoa / phòng ban"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ─── TAB 2: PHÒNG KHÁM THỰC TẾ ────────────────────────── */}
              {activeTab === 'phong_kham' && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Tên Phòng Khám</th>
                      <th className="px-6 py-3.5">Chuyên Khoa</th>
                      <th className="px-6 py-3.5">Vị Trí Tầng / Khu</th>
                      <th className="px-6 py-3.5">Khoa Trực Thuộc</th>
                      <th className="px-6 py-3.5 text-center">Trạng Thái</th>
                      <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPhongKhams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                          Không tìm thấy phòng khám thực tế nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredPhongKhams.map((pk) => {
                        const st = STATUS_LABELS[pk.trang_thai] || STATUS_LABELS.hoat_dong;
                        return (
                          <tr key={pk.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono text-gray-500 text-xs font-semibold">#{pk.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                <DoorOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span>{pk.ten_phong}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                <Stethoscope className="w-3 h-3 text-primary-600" />
                                {pk.chuyen_khoa || 'Khám chung'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span>{pk.vi_tri || 'Tầng 1'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                              {pk.ten_phong_ban || <span className="text-gray-400 italic">Chưa liên kết</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleQuickTogglePKStatus(pk)}
                                title="Nhấp để đổi trạng thái nhanh"
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${st.color}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {st.label}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditPK(pk)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                  title="Chỉnh sửa thông tin phòng khám"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteModal({ open: true, type: 'phong_kham', item: pk, loading: false })}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Xóa phòng khám"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: KHOA / PHÒNG BAN (CREATE / EDIT) ───────────────── */}
      {modalPhongBan.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalPhongBan.mode === 'create' ? 'Thêm Mới Khoa / Phòng Ban' : 'Chỉnh Sửa Khoa / Phòng Ban'}
                </h3>
              </div>
              <button
                onClick={() => setModalPhongBan({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPB} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Khoa / Phòng Ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa Răng Hàm Mặt, Phòng Vật Tư Y Tế..."
                  value={pbForm.tenPhongBan}
                  onChange={(e) => setPbForm({ ...pbForm, tenPhongBan: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô Tả Chức Năng & Nhiệm Vụ
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chức năng chuyên môn của khoa phòng..."
                  value={pbForm.moTa}
                  onChange={(e) => setPbForm({ ...pbForm, moTa: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalPhongBan({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pbSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {pbSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalPhongBan.mode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PHÒNG KHÁM THỰC TẾ (CREATE / EDIT) ─────────────── */}
      {modalPhongKham.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalPhongKham.mode === 'create' ? 'Thêm Mới Phòng Khám Thực Tế' : 'Chỉnh Sửa Phòng Khám'}
                </h3>
              </div>
              <button
                onClick={() => setModalPhongKham({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPK} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Phòng Khám <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng 105 - Khám Mắt & Đo Khúc Xạ"
                  value={pkForm.tenPhong}
                  onChange={(e) => setPkForm({ ...pkForm, tenPhong: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Chuyên Khoa Phụ Trách
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nội khoa, Mắt, Tai Mũi Họng..."
                    value={pkForm.chuyenKhoa}
                    onChange={(e) => setPkForm({ ...pkForm, chuyenKhoa: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vị Trí Tầng / Khu
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tầng 1 - Khu B"
                    value={pkForm.viTri}
                    onChange={(e) => setPkForm({ ...pkForm, viTri: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Khoa / Phòng Ban Trực Thuộc
                  </label>
                  <select
                    value={pkForm.phongBanId}
                    onChange={(e) => setPkForm({ ...pkForm, phongBanId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">-- Chưa gắn khoa phòng --</option>
                    {data.phongBans.map(pb => (
                      <option key={pb.id} value={pb.id}>{pb.ten_phong_ban}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Trạng Thái Hoạt Động
                  </label>
                  <select
                    value={pkForm.trangThai}
                    onChange={(e) => setPkForm({ ...pkForm, trangThai: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="hoat_dong">Đang hoạt động</option>
                    <option value="bao_tri">Tạm bảo trì</option>
                    <option value="dong_cua">Đóng cửa / Ngừng</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalPhongKham({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pkSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {pkSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalPhongKham.mode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CHUYÊN KHOA Y TẾ (CREATE / EDIT) ─────────────── */}
      {modalChuyenKhoa.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalChuyenKhoa.mode === 'create' ? 'Thêm Mới Chuyên Khoa Y Tế' : 'Chỉnh Sửa Chuyên Khoa'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalChuyenKhoa({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCK} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mã Chuyên Khoa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ckForm.ma}
                  onChange={(e) => setCkForm({ ...ckForm, ma: e.target.value })}
                  placeholder="Ví dụ: CK_NTQ, CK_TM, CK_NK..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Chuyên Khoa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ckForm.ten}
                  onChange={(e) => setCkForm({ ...ckForm, ten: e.target.value })}
                  placeholder="Ví dụ: Nội Tổng Quát, Tim Mạch, Nhi Khoa..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô Tả Chức Năng Y Khoa
                </label>
                <textarea
                  rows={3}
                  value={ckForm.moTa}
                  onChange={(e) => setCkForm({ ...ckForm, moTa: e.target.value })}
                  placeholder="Mô tả phạm vi khám và tiếp nhận bệnh..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trạng Thái Tiếp Nhận
                </label>
                <select
                  value={ckForm.trangThai}
                  onChange={(e) => setCkForm({ ...ckForm, trangThai: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="hoat_dong">Đang tiếp nhận khám</option>
                  <option value="tam_ngung">Tạm ngưng tiếp nhận</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalChuyenKhoa({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingCK}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingCK && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalChuyenKhoa.mode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: NHÓM DƯỢC LÝ ───────────────────────────────────── */}
      {modalNhomDuoc.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {modalNhomDuoc.mode === 'create' ? 'Thêm Nhóm Dược Lý' : 'Chỉnh Sửa Nhóm Dược Lý'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNhomDuoc({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNhomDuoc} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên Nhóm Dược Lý <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nhomDuocForm.ten}
                  onChange={(e) => setNhomDuocForm({ ...nhomDuocForm, ten: e.target.value })}
                  placeholder="Ví dụ: Kháng sinh, Hạ sốt & Giảm đau, Vitamin..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô Tả / Chỉ Định Chính
                </label>
                <textarea
                  rows={3}
                  value={nhomDuocForm.moTa}
                  onChange={(e) => setNhomDuocForm({ ...nhomDuocForm, moTa: e.target.value })}
                  placeholder="Mô tả nhóm thuốc..."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalNhomDuoc({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  {modalNhomDuoc.mode === 'create' ? 'Thêm vào danh sách' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRM DELETE ──────────────────────────────────── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-center text-lg font-bold text-gray-900">
              Xác Nhận Xóa Dữ Liệu?
            </h3>

            <p className="text-center text-sm text-gray-500 mt-2">
              Bạn có chắc chắn muốn xóa {deleteModal.type === 'phong_ban' ? 'khoa / phòng ban' : 'phòng khám'}{' '}
              <span className="font-bold text-gray-900">
                "{deleteModal.type === 'phong_ban' ? deleteModal.item?.ten_phong_ban : deleteModal.item?.ten_phong}"
              </span>
              ?
            </p>

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                {deleteModal.type === 'phong_ban'
                  ? 'Nếu khoa phòng đang có nhân viên hoặc phòng khám trực thuộc, hệ thống sẽ ngăn chặn việc xóa trực tiếp để bảo vệ dữ liệu.'
                  : 'Nếu phòng khám đã phát sinh lượt khám hoặc lịch hẹn thực tế, hệ thống sẽ tự động chuyển sang trạng thái "Đóng cửa" để bảo toàn hồ sơ bệnh án.'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, type: null, item: null, loading: false })}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModal.loading}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {deleteModal.loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
