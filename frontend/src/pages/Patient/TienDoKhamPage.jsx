import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Ticket, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  MapPin, 
  User, 
  Activity, 
  Timer,
  Building2,
  Calendar,
  Layers,
  FileText,
  Stethoscope,
  Info,
  QrCode
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function TienDoKhamPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'dynamic-routing'
  
  // Thông tin phiếu khám STT
  const [ticketData, setTicketData] = useState({
    soThuTu: 'A1594',
    maYTe: user?.benhNhanId ? `BN${String(user.benhNhanId).padStart(6, '0')}` : 'BN000108',
    hoTen: user?.hoTen || 'Nguyễn Đình Hảo',
    thoiGianLaySo: '08:15 - Hôm nay',
    phongKham: 'Phòng 101 - Khám Nội Tổng Quát',
    bacSi: 'BS. CKI Trần Văn Nam',
    soDangGoi: 'A1592',
    soNguoiPhiaTruoc: 2,
    uocTinhPhut: 12,
  });

  // Tải thông tin từ localStorage nếu vừa lấy ở Kiosk
  useEffect(() => {
    try {
      const savedTicket = localStorage.getItem('kiosk_last_ticket');
      if (savedTicket) {
        const parsed = JSON.parse(savedTicket);
        setTicketData((prev) => ({
          ...prev,
          soThuTu: parsed.soThuTu || prev.soThuTu,
          hoTen: parsed.hoTen || prev.hoTen,
          thoiGianLaySo: parsed.gioIn || prev.thoiGianLaySo,
          phongKham: parsed.phongKham || prev.phongKham,
          bacSi: parsed.bacSi || prev.bacSi,
        }));
      }
    } catch (e) {
      console.warn('Cannot read kiosk ticket:', e);
    }
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      setLoading(false);
    }, 400);
  };

  // Lộ trình điều phối cận lâm sàng thông minh (Min-Wait Routing)
  const routingPlan = {
    tongTietKiemPhut: 18,
    lyDoToiUu: 'Hệ thống nhận thấy Phòng Xét nghiệm máu hiện đang có 5 bệnh nhân chờ. Lộ trình đã tự động sắp xếp bạn thực hiện Siêu âm tại Phòng 202 trước (hiện chỉ có 1 người chờ) để giảm thiểu tối đa thời gian chờ đợi.',
    loTrinh: [
      {
        buoc: 1,
        tenPhong: 'Phòng 202 - Siêu Âm Màu 4D & Doppler',
        dichVu: 'Siêu âm ổ bụng tổng quát',
        soNguoiCho: 1,
        thoiGianUocTinh: '5 - 7 phút',
        trangThai: 'uu_tien_ngay',
        badge: 'Ưu tiên thực hiện trước (Phòng trống)',
        ghiChu: 'Tầng 2 - Cửa phía Đông',
      },
      {
        buoc: 2,
        tenPhong: 'Phòng 201 - Trung Tâm Xét Nghiệm Hóa Sinh',
        dichVu: 'Lấy mẫu máu & Nước tiểu 10 thông số',
        soNguoiCho: 3,
        thoiGianUocTinh: '8 - 10 phút',
        trangThai: 'buoc_tiep_theo',
        badge: 'Chặng tiếp theo',
        ghiChu: 'Tầng 2 - Hành lang giữa',
      },
      {
        buoc: 3,
        tenPhong: 'Phòng 101 - Khám Nội Tổng Quát',
        dichVu: 'Bác sĩ đọc kết luận kết quả và kê đơn điều trị',
        soNguoiCho: 0,
        thoiGianUocTinh: '5 phút',
        trangThai: 've_phong_ban_dau',
        badge: 'Kết luận & Nhận toa',
        ghiChu: 'Tầng 1 - Phòng khám ban đầu',
      },
    ],
    soSanh: {
      truyenThong: 45, // phút nếu khám tuần tự cố định
      dieuHuongToiUu: 27, // phút theo phân luồng tự động
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ─── THANH TIÊU ĐỀ Y TẾ TRANG NHÃ ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Theo Dõi Trực Ca Khám Bệnh Trực Tuyến
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Số Thứ Tự & Tiến Trình Khám Bệnh
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cập nhật trạng thái hàng đợi và lộ trình thực hiện dịch vụ theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-400 hidden sm:block">
            Đồng bộ lúc: <span className="font-semibold text-slate-700">{lastRefreshed}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm transition-colors border border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Cập nhật hàng đợi
          </button>
        </div>
      </div>

      {/* ─── TABS ĐIỀU HƯỚNG GIAO DIỆN ───────────────────────── */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'ticket'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ticket className="h-4 w-4" />
          Phiếu Khám Điện Tử & Hàng Đợi Trực Tiếp
        </button>

        <button
          onClick={() => setActiveTab('dynamic-routing')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'dynamic-routing'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="h-4 w-4 text-blue-600" />
          Lộ Trình Cận Lâm Sàng Tối Ưu
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
            Giảm 18 phút chờ
          </span>
        </button>
      </div>

      {activeTab === 'ticket' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI: PHIẾU KHÁM ĐIỆN TỬ Y TẾ (E-TICKET) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 border-2 border-blue-600 shadow-md relative overflow-hidden text-slate-900 space-y-5">
              {/* Header phiếu */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Phòng Khám Đa Khoa
                  </span>
                  <h3 className="font-bold text-base text-slate-900">PHIẾU KHÁM ĐIỆN TỬ</h3>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Hợp lệ
                </span>
              </div>

              {/* Số thứ tự lớn */}
              <div className="bg-blue-50/70 rounded-2xl p-5 text-center border border-blue-150">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Số thứ tự của bạn
                </span>
                <div className="text-5xl font-black text-blue-700 font-mono tracking-wider my-1">
                  {ticketData.soThuTu}
                </div>
                <span className="inline-block bg-white text-slate-600 text-xs font-semibold px-3 py-0.5 rounded-md border border-blue-200">
                  Mã y tế: {ticketData.maYTe}
                </span>
              </div>

              {/* Thông tin bệnh nhân & phòng khám */}
              <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Bệnh nhân:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{ticketData.hoTen}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Phòng khám:
                  </span>
                  <span className="font-semibold text-slate-800">{ticketData.phongKham}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" /> Bác sĩ trực:
                  </span>
                  <span className="font-semibold text-slate-800">{ticketData.bacSi}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Giờ cấp số:
                  </span>
                  <span className="font-semibold text-slate-700">{ticketData.thoiGianLaySo}</span>
                </div>
              </div>

              {/* Lời dặn tiếp đón */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center text-xs text-amber-900 leading-relaxed">
                Vui lòng theo dõi số thứ tự hiển thị tại bảng điện tử trước cửa phòng khám khi được gọi tên.
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TRẠNG THÁI HÀNG ĐỢI & TIẾN ĐỘ TRỰC CA */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thẻ trạng thái hàng đợi thời gian thực */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Trạng Thái Hàng Đợi Trực Tiếp
                </h2>
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200">
                  {ticketData.phongKham}
                </span>
              </div>

              {/* 3 chỉ số chính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Đang phục vụ số
                  </span>
                  <div className="text-3xl font-black text-blue-700 my-1 font-mono">
                    {ticketData.soDangGoi}
                  </div>
                  <span className="text-xs text-slate-500">Bệnh nhân đang trong phòng</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    Số người trước bạn
                  </span>
                  <div className="text-3xl font-black text-amber-900 my-1 font-mono">
                    {ticketData.soNguoiPhiaTruoc}
                  </div>
                  <span className="text-xs text-amber-700 font-semibold">Chuẩn bị đến lượt</span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Ước tính thời gian chờ
                  </span>
                  <div className="text-3xl font-black text-emerald-900 my-1 font-mono">
                    ~{ticketData.uocTinhPhut} phút
                  </div>
                  <span className="text-xs text-emerald-700">Dựa theo nhịp khám thực tế</span>
                </div>
              </div>

              {/* Quy trình khám bệnh 4 bước */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Quy trình khám bệnh trong ngày của bạn
                </h3>
                
                <div className="space-y-4">
                  {/* Bước 1 */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">1. Đăng ký & Tiếp nhận</h4>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Đã hoàn thành
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Đã tiếp nhận và cấp số thứ tự vào phòng khám chuyên khoa.
                      </p>
                    </div>
                  </div>

                  {/* Bước 2 */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <Timer className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-blue-950">2. Khám lâm sàng ban đầu</h4>
                        <span className="text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                          Đang chờ gọi tên
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Bác sĩ đang khám bệnh nhân số A1592. Bạn là số A1594 (còn 2 người phía trước).
                      </p>
                    </div>
                  </div>

                  {/* Bước 3 */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">3. Thực hiện Cận lâm sàng (Nếu có)</h4>
                        <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Theo chỉ định của bác sĩ
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hệ thống sẽ tự động đề xuất lộ trình phòng khám vắng nhất để bạn không phải xếp hàng lâu.
                      </p>
                    </div>
                  </div>

                  {/* Bước 4 */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                      4
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">4. Kết luận & Nhận đơn thuốc</h4>
                        <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Chưa bắt đầu
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Bác sĩ đưa ra kết luận bệnh án, tư vấn phác đồ và cấp đơn thuốc điện tử.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner chuyển sang Lộ trình tối ưu */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Điều Hướng Cận Lâm Sàng Thông Minh
                </span>
                <h4 className="text-base font-bold text-white">
                  Tự động sắp xếp phòng khám vắng nhất để tiết kiệm thời gian
                </h4>
                <p className="text-xs text-slate-300">
                  Giúp bạn hoàn thành các chỉ định siêu âm, xét nghiệm sớm hơn 18 phút so với thứ tự thông thường.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('dynamic-routing')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                Xem lộ trình khám <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: LỘ TRÌNH ĐIỀU HƯỚNG CẬN LÂM SÀNG TỐI ƯU */
        <div className="space-y-6">
          {/* Header giải thích cơ chế */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Phân Luồng Thời Gian Thực
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Lộ Trình Khám & Cận Lâm Sàng Tối Ưu
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Dựa vào số lượng bệnh nhân thực tế đang chờ tại các khoa phòng, hệ thống tự động chỉ dẫn bạn vào phòng có thời gian chờ ngắn nhất trước.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center sm:text-right shrink-0">
                <div className="text-xs text-emerald-800 font-semibold uppercase">Tiết kiệm dự kiến</div>
                <div className="text-2xl font-black text-emerald-700 font-mono">~18 phút</div>
                <div className="text-[11px] text-emerald-600">Giảm 40% thời gian chờ đợi</div>
              </div>
            </div>

            {/* Thông báo phân tích */}
            <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Chỉ dẫn từ hệ thống tiếp đón:</strong> {routingPlan.lyDoToiUu}
              </div>
            </div>
          </div>

          {/* Danh sách các chặng thực hiện dịch vụ */}
          <div className="space-y-4">
            {routingPlan.loTrinh.map((buoc, idx) => (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  buoc.trangThai === 'uu_tien_ngay'
                    ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                    buoc.trangThai === 'uu_tien_ngay'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {buoc.buoc}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900">{buoc.tenPhong}</h4>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        buoc.trangThai === 'uu_tien_ngay'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {buoc.badge}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-blue-700">{buoc.dichVu}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> {buoc.ghiChu}
                    </p>
                  </div>
                </div>

                {/* Thống kê tải phòng */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 self-stretch md:self-auto justify-between md:justify-end">
                  <div className="text-center px-3">
                    <div className="text-[11px] text-slate-500 font-medium">Bệnh nhân đang chờ</div>
                    <div className={`text-base font-black font-mono ${
                      buoc.soNguoiCho <= 1 ? 'text-emerald-700' : 'text-slate-900'
                    }`}>
                      {buoc.soNguoiCho} người
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200" />

                  <div className="text-center px-3">
                    <div className="text-[11px] text-slate-500 font-medium">Thời gian thực hiện</div>
                    <div className="text-base font-bold text-slate-800 font-mono">
                      {buoc.thoiGianUocTinh}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Biểu đồ so sánh thời gian chờ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              So Sánh Thời Gian Chờ Khám Dự Kiến
            </h4>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Thứ tự truyền thống (Dồn ứ tại phòng xét nghiệm trước)</span>
                  <span className="text-slate-800 font-bold">{routingPlan.soSanh.truyenThong} phút</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span className="text-blue-700 font-bold">Lộ trình tối ưu (Chuyển sang phòng siêu âm vắng trước)</span>
                  <span className="text-blue-700 font-bold">{routingPlan.soSanh.dieuHuongToiUu} phút</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
