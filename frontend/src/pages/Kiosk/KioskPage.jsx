import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, QrCode, Phone, CalendarCheck, UserPlus, CheckCircle2,
  Printer, ArrowLeft, Clock, MapPin, RefreshCw, AlertCircle, Building2,
  ChevronRight, ArrowRight, User, HeartPulse, FileText
} from 'lucide-react';
import { apiPost, apiGet } from '../../services/api';

export default function KioskPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('home'); // 'home' | 'dat_truoc' | 'dang_ky_moi' | 've_stt'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Đặt trước
  const [searchPhoneOrCode, setSearchPhoneOrCode] = useState('');

  // Form Đăng ký mới
  const [formData, setFormData] = useState({
    hoTen: '',
    soDienThoai: '',
    namSinh: '1990',
    gioiTinh: 'nam',
    trieuChung: '',
  });

  // Dữ liệu vé sau khi lấy STT thành công
  const [ticketData, setTicketData] = useState(null);
  const [countdown, setCountdown] = useState(20);

  // Tự động đếm lùi quay về trang chủ Kiosk sau khi in vé
  useEffect(() => {
    let timer;
    if (mode === 've_stt') {
      setCountdown(20);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleResetHome();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  const handleResetHome = () => {
    setMode('home');
    setSearchPhoneOrCode('');
    setFormData({ hoTen: '', soDienThoai: '', namSinh: '1990', gioiTinh: 'nam', trieuChung: '' });
    setErrorMsg('');
    setTicketData(null);
  };

  // 1. Xác nhận lịch hẹn đã đặt trước
  const handleCheckInLichHen = async (e) => {
    e.preventDefault();
    if (!searchPhoneOrCode.trim()) {
      setErrorMsg('Vui lòng nhập Số điện thoại hoặc Mã lịch hẹn.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const generatedTicketNumber = `A${Math.floor(1500 + Math.random() * 200)}`;
      const nowTime = new Date().toLocaleTimeString('vi-VN');

      let tenBn = 'Nguyễn Đình Hảo';
      let sdt = searchPhoneOrCode.trim();

      try {
        const res = await apiGet(`/lich-hen?search=${encodeURIComponent(sdt)}`);
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
        if (list.length > 0 && list[0]?.benhNhan?.hoTen) {
          tenBn = list[0].benhNhan.hoTen;
        }
      } catch (err) {
        console.warn('Tra cuu lich hen:', err);
      }

      const newTicket = {
        maSoThuTu: generatedTicketNumber,
        hoTen: tenBn,
        soDienThoai: sdt,
        tenPhong: 'Phòng 101 - Khám Nội Tổng Quát',
        viTri: 'Tầng 1 - Khu Tiếp Nhận A',
        bacSi: 'BS. CKI Trần Văn Nam',
        gioDangKy: nowTime,
        loai: 'Đã đặt hẹn trước (Trực tuyến)',
        chuyenKhoa: 'Nội Tổng Quát',
      };

      setTicketData(newTicket);
      try {
        localStorage.setItem('kiosk_last_ticket', JSON.stringify({
          soThuTu: newTicket.maSoThuTu,
          hoTen: newTicket.hoTen,
          gioIn: newTicket.gioDangKy,
          phongKham: newTicket.tenPhong,
          bacSi: newTicket.bacSi,
        }));
      } catch (e) {
        console.warn(e);
      }

      setMode('ve_stt');
    } catch (err) {
      console.error('Lỗi check-in Kiosk:', err);
      setErrorMsg('Không tìm thấy thông tin lịch hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Đăng ký mới tại chỗ với Phân luồng tiếp nhận chuyên khoa
  const handleDangKyMoiAI = async (e) => {
    e.preventDefault();
    if (!formData.hoTen.trim() || !formData.soDienThoai.trim()) {
      setErrorMsg('Vui lòng điền Họ tên và Số điện thoại.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      let phongChonId = 1;
      let tenPhongChon = 'Phòng 101 - Khám Nội Tổng Quát';
      let viTriChon = 'Tầng 1 - Khu A';
      let chuyenKhoaGoiY = 'Nội Tổng Quát';
      const tc = (formData.trieuChung || '').toLowerCase();

      if (tc.includes('ngực') || tc.includes('tim') || tc.includes('huyết áp') || tc.includes('khó thở')) {
        phongChonId = 2;
        tenPhongChon = 'Phòng 102 - Khám Tim Mạch & Huyết Áp';
        viTriChon = 'Tầng 1 - Khu A';
        chuyenKhoaGoiY = 'Chuyên Khoa Tim Mạch';
      } else if (tc.includes('bé') || tc.includes('trẻ') || tc.includes('sốt') || tc.includes('ho') || tc.includes('nhi')) {
        phongChonId = 3;
        tenPhongChon = 'Phòng 103 - Khám Nhi Khoa & TMH';
        viTriChon = 'Tầng 1 - Khu B';
        chuyenKhoaGoiY = 'Chuyên Khoa Nhi';
      } else if (tc.includes('mắt') || tc.includes('thị lực') || tc.includes('đau mắt')) {
        phongChonId = 4;
        tenPhongChon = 'Phòng 104 - Chuyên Khoa Mắt';
        viTriChon = 'Tầng 1 - Khu B';
        chuyenKhoaGoiY = 'Chuyên Khoa Mắt';
      }

      const generatedTicketNumber = `A${Math.floor(1500 + Math.random() * 200)}`;
      const nowTime = new Date().toLocaleTimeString('vi-VN');

      const newTicket = {
        maSoThuTu: generatedTicketNumber,
        hoTen: formData.hoTen.trim(),
        soDienThoai: formData.soDienThoai.trim(),
        tenPhong: tenPhongChon,
        viTri: viTriChon,
        chuyenKhoa: chuyenKhoaGoiY,
        trieuChung: formData.trieuChung,
        gioDangKy: nowTime,
        loai: 'Tiếp nhận trực tiếp tại quầy',
        bacSi: 'Bác sĩ trực chuyên khoa',
      };

      setTicketData(newTicket);
      try {
        localStorage.setItem('kiosk_last_ticket', JSON.stringify({
          soThuTu: newTicket.maSoThuTu,
          hoTen: newTicket.hoTen,
          gioIn: newTicket.gioDangKy,
          phongKham: newTicket.tenPhong,
          bacSi: 'BS. CKI Trần Văn Nam',
        }));
      } catch (e) {
        console.warn(e);
      }

      setMode('ve_stt');
    } catch (err) {
      console.error('Lỗi đăng ký Kiosk:', err);
      setErrorMsg('Hệ thống bận. Vui lòng liên hệ nhân viên tiếp đón tại quầy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none">
      {/* ─── KIOSK HEADER: CHUẨN Y TẾ TRẮNG SẠCH ──────────────── */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  Hệ Thống Y Tế Tiếp Đón Tự Động
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                PHÒNG KHÁM ĐA KHOA
              </h1>
              <p className="text-xs text-slate-500">
                Quầy Tự Phục Vụ Tiếp Nhận Bệnh Nhân & Cấp Số Thứ Tự
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-lg font-bold text-slate-800 font-mono">
                <Clock className="w-4 h-4 text-blue-600" />
                {new Date().toLocaleTimeString('vi-VN')}
              </div>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>

            {mode !== 'home' && (
              <button
                onClick={handleResetHome}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors border border-slate-300"
              >
                <ArrowLeft className="w-4 h-4" /> Về Màn Hình Chính
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── KIOSK MAIN VIEWPORT ─────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        {/* VIEW 1: LỰA CHỌN PHÂN LUỒNG TIẾP ĐÓN */}
        {mode === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                Chào Mừng Quý Khách Đến Khám Bệnh
              </h2>
              <p className="text-slate-600 text-base max-w-2xl mx-auto">
                Vui lòng chạm chọn một trong hai phương thức tiếp đón bên dưới để nhận số thứ tự vào phòng khám:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Lựa chọn 1: Đã đặt trước */}
              <button
                onClick={() => { setMode('dat_truoc'); setErrorMsg(''); }}
                className="bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-blue-500 rounded-3xl p-8 text-left transition-all shadow-sm hover:shadow-md group flex flex-col justify-between h-80"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors mb-6 shadow-sm">
                    <CalendarCheck className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                    Tiếp đón ưu tiên
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2 group-hover:text-blue-700 transition-colors">
                    ĐÃ ĐẶT LỊCH TRƯỚC
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Dành cho bệnh nhân đã đăng ký qua Website hoặc Tổng đài. Nhập Số điện thoại để xác nhận và nhận phiếu khám ngay.
                  </p>
                </div>

                <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                  Chạm để nhận số thứ tự <ChevronRight className="w-5 h-5 ml-1" />
                </div>
              </button>

              {/* Lựa chọn 2: Đăng ký mới */}
              <button
                onClick={() => { setMode('dang_ky_moi'); setErrorMsg(''); }}
                className="bg-white hover:bg-emerald-50/40 border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-8 text-left transition-all shadow-sm hover:shadow-md group flex flex-col justify-between h-80"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors mb-6 shadow-sm">
                    <UserPlus className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    Khám trực tiếp trong ngày
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2 group-hover:text-emerald-700 transition-colors">
                    ĐĂNG KÝ KHÁM MỚI
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Dành cho bệnh nhân đến khám lần đầu hoặc chưa đặt hẹn. Hệ thống tự động phân loại chuyên khoa theo triệu chứng.
                  </p>
                </div>

                <div className="flex items-center text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                  Đăng ký tiếp nhận ngay <ChevronRight className="w-5 h-5 ml-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: TRA CỨU & CHECK-IN LỊCH ĐÃ ĐẶT */}
        {mode === 'dat_truoc' && (
          <div className="max-w-xl w-full mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-lg space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2">
                <CalendarCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                Xác Nhận Lịch Hẹn Đã Đặt
              </h3>
              <p className="text-sm text-slate-500">
                Vui lòng nhập Số điện thoại đã dùng để đặt lịch khám
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCheckInLichHen} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Số điện thoại đăng ký
                </label>
                <input
                  type="tel"
                  autoFocus
                  required
                  value={searchPhoneOrCode}
                  onChange={(e) => setSearchPhoneOrCode(e.target.value)}
                  placeholder="Ví dụ: 0354162165"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none text-xl font-bold font-mono tracking-wider"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleResetHome}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base transition-colors"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Xác Nhận & Lấy Số ➔'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: ĐĂNG KÝ KHÁM MỚI VÀ PHÂN LUỒNG CHUYÊN KHOA */}
        {mode === 'dang_ky_moi' && (
          <div className="max-w-2xl w-full mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-lg space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
                <UserPlus className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                Đăng Ký Khám Bệnh Mới
              </h3>
              <p className="text-sm text-slate-500">
                Điền thông tin và lý do khám để hệ thống điều phối vào phòng khám chuyên khoa phù hợp
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDangKyMoiAI} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Họ và tên bệnh nhân *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hoTen}
                    onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-sm font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Năm sinh
                  </label>
                  <input
                    type="number"
                    value={formData.namSinh}
                    onChange={(e) => setFormData({ ...formData, namSinh: e.target.value })}
                    placeholder="1990"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-sm font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Giới tính
                  </label>
                  <select
                    value={formData.gioiTinh}
                    onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-sm font-semibold"
                  >
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase flex items-center justify-between">
                  <span>Lý do khám / Triệu chứng ban đầu</span>
                  <span className="text-[11px] text-blue-600 font-normal">Tự động phân luồng chuyên khoa</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.trieuChung}
                  onChange={(e) => setFormData({ ...formData, trieuChung: e.target.value })}
                  placeholder="Ví dụ: Đau tức ngực trái khó thở, hoặc Bé sốt 38.5 độ kèm ho..."
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleResetHome}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Xác Nhận & Nhận Số ➔'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 4: PHIẾU KHÁM BỆNH ĐIỆN TỬ CHUẨN Y TẾ */}
        {mode === 've_stt' && ticketData && (
          <div className="max-w-md w-full mx-auto bg-white text-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 space-y-6 text-center animate-fadeIn">
            {/* Header phiếu */}
            <div className="border-b border-dashed border-slate-300 pb-4 space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                ✓ Tiếp Nhận Khám Bệnh Thành Công
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                PHIẾU KHÁM BỆNH
              </h3>
              <p className="text-xs text-slate-500">
                Phòng Khám Đa Khoa • Quầy Tiếp Đón Kiosk 01
              </p>
            </div>

            {/* Khung số thứ tự lớn */}
            <div className="bg-blue-50/70 p-6 rounded-2xl border border-blue-200 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                SỐ THỨ TỰ CỦA QUÝ KHÁCH
              </p>
              <p className="text-6xl font-black text-blue-700 font-mono tracking-wider my-2">
                {ticketData.maSoThuTu}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                Thời gian cấp số: {ticketData.gioDangKy}
              </p>
            </div>

            {/* Chi tiết tiếp nhận */}
            <div className="space-y-2.5 text-left bg-slate-50 p-4 rounded-2xl text-xs border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900 text-sm">{ticketData.hoTen}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Chuyên khoa:</span>
                <span className="font-semibold text-blue-700">{ticketData.chuyenKhoa}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Nơi khám:</span>
                <span className="font-bold text-slate-800">{ticketData.tenPhong}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Vị trí phòng:</span>
                <span className="font-semibold text-slate-800">{ticketData.viTri || 'Tầng 1'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức:</span>
                <span className="font-medium text-slate-700">{ticketData.loai}</span>
              </div>
            </div>

            {/* Hướng dẫn bệnh nhân */}
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-center leading-relaxed">
              Quý khách vui lòng đến trước cửa phòng khám và theo dõi số thứ tự trên màn hình điện tử.
            </div>

            {/* Nút hành động */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => navigate('/benh-nhan/so-thu-tu')}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors uppercase tracking-wider"
              >
                <HeartPulse className="w-4 h-4" />
                Theo Dõi Tiến Độ Khám Trên Điện Thoại ➔
              </button>

              <button
                onClick={() => window.print()}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors"
              >
                <Printer className="w-4 h-4" /> In Phiếu Ra Giấy
              </button>

              <button
                onClick={handleResetHome}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold transition-colors"
              >
                Hoàn tất (Tự về màn hình chính sau {countdown}s)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── KIOSK FOOTER ────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        Phòng Khám Đa Khoa • Hệ thống tiếp nhận và cấp số thứ tự điện tử tự động
      </footer>
    </div>
  );
}
