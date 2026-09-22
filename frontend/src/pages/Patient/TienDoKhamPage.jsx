import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Ticket, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  MapPin, 
  User, 
  Activity, 
  Timer, 
  Calendar, 
  Layers, 
  Stethoscope, 
  Info, 
  Bell, 
  AlertTriangle, 
  FlaskConical,
  Pill,
  CreditCard,
  FileText,
  Star,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import DanhGiaCaKhamModal from '../../components/Appointment/DanhGiaCaKhamModal';

export default function TienDoKhamPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'dynamic-routing'
  
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [isAllCompleted, setIsAllCompleted] = useState(false);
  const [completedVisit, setCompletedVisit] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Thông tin phiếu khám STT
  const [ticketData, setTicketData] = useState({
    soThuTu: '',
    maYTe: user?.benhNhanId ? `BN${String(user.benhNhanId).padStart(6, '0')}` : 'BN000001',
    hoTen: user?.hoTen || 'Bệnh nhân',
    thoiGianLaySo: '',
    phongKham: 'Phòng 101 - Khám Nội Tổng Quát',
    bacSi: 'BS. CKI Trần Văn Nam',
    soDangGoi: '-',
    soNguoiPhiaTruoc: 0,
    uocTinhPhut: 0,
    trangThai: 'cho_kham',
    dsChiDinh: [],
    hasCls: false,
    donThuoc: null,
    hoaDon: null,
    chanDoanXacDinh: null,
  });

  const [progressSteps, setProgressSteps] = useState(null);

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/tiep-nhan/phieu-kham-benh-nhan');
      if (res?.data?.isAllCompleted) {
        setIsAllCompleted(true);
        setHasActiveTicket(false);
        setCompletedVisit(res.data.completedVisit);
      } else if (res?.data?.ticket) {
        setIsAllCompleted(false);
        setHasActiveTicket(true);
        const t = res.data.ticket;
        const q = res.data.queue || {};
        setTicketData({
          soThuTu: t.soThuTu || '',
          maYTe: t.maYTe || (user?.benhNhanId ? `BN${String(user.benhNhanId).padStart(6, '0')}` : 'BN000001'),
          hoTen: t.hoTen || user?.hoTen || 'Bệnh nhân',
          thoiGianLaySo: t.thoiGianLaySo || 'Vừa xong',
          phongKham: t.phongKham || 'Phòng 101 - Khám Nội Tổng Quát',
          bacSi: t.bacSi || 'BS. CKI Trần Văn Nam',
          soDangGoi: q.soDangGoi || '-',
          soNguoiPhiaTruoc: q.soNguoiPhiaTruoc ?? 0,
          uocTinhPhut: q.uocTinhPhut ?? 0,
          trangThai: t.trangThai || 'cho_kham',
          dsChiDinh: t.dsChiDinh || [],
          hasCls: t.hasCls || false,
          donThuoc: t.donThuoc || null,
          hoaDon: t.hoaDon || null,
          chanDoanXacDinh: t.chanDoanXacDinh || null,
        });
        if (res.data.progress) {
          setProgressSteps(res.data.progress);
        }
      } else {
        setIsAllCompleted(false);
        setHasActiveTicket(false);
      }
    } catch (err) {
      console.warn('Lấy dữ liệu hàng đợi từ server:', err?.message);
      setIsAllCompleted(false);
      setHasActiveTicket(false);
    } finally {
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 15000); // Đồng bộ thời gian thực mỗi 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = () => {
    fetchQueueData();
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

  const hasCls = (ticketData?.dsChiDinh && ticketData.dsChiDinh.length > 0) || ticketData?.hasCls;
  const isCompleted = ticketData?.trangThai === 'hoan_thanh';
  const isDaCoKqCls =
    ticketData?.trangThai === 'da_co_kq_cls' ||
    (hasCls &&
      ticketData?.dsChiDinh?.length > 0 &&
      ticketData.dsChiDinh.every((d) => d.trangThai === 'co_ket_qua') &&
      !isCompleted);
  const isDangCls =
    ticketData?.trangThai === 'dang_cls' ||
    (hasCls && !isDaCoKqCls && !isCompleted);
  const isDangKham = ticketData?.trangThai === 'dang_kham' && !hasCls;
  const isMyTurn =
    (ticketData?.soDangGoi === ticketData?.soThuTu || isDangKham) &&
    !isCompleted &&
    !isDangCls &&
    !isDaCoKqCls &&
    ticketData?.trangThai !== 'da_huy';
  const isNearTurn =
    (ticketData?.soNguoiPhiaTruoc ?? 999) <= 1 &&
    !isMyTurn &&
    !isCompleted &&
    !isDangCls &&
    !isDaCoKqCls &&
    ticketData?.trangThai === 'cho_kham';

  const isPaid = !ticketData?.hoaDon || ticketData.hoaDon.trangThai === 'da_thanh_toan' || Number(ticketData.hoaDon.thucThu || 0) === 0;
  const isMedDispensed = !ticketData?.donThuoc || ticketData.donThuoc.trangThai === 'da_cap_phat' || (ticketData.donThuoc.chiTiet && ticketData.donThuoc.chiTiet.length === 0) || ticketData.donThuoc.soLuongMon === 0;
  const isFullyFinished = isAllCompleted || (hasActiveTicket && isCompleted && isPaid && isMedDispensed);

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Tiêu đề */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex h-2 w-2 rounded-full ${isFullyFinished ? 'bg-green-600' : isCompleted ? 'bg-green-600' : 'bg-green-500 animate-pulse'}`} />
            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
              {isFullyFinished ? 'Quy trình khám hoàn tất' : isCompleted ? 'Khám bệnh hoàn tất' : isDangCls ? 'Đang thực hiện Cận lâm sàng' : isDaCoKqCls ? 'Đã có kết quả CLS' : 'Theo dõi trực tuyến'}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Số Thứ Tự & Tiến Trình Khám Bệnh
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isFullyFinished ? 'Bạn đã hoàn tất đầy đủ mọi bước khám chữa bệnh hôm nay' : 'Cập nhật trạng thái hàng đợi và lộ trình thực hiện dịch vụ theo thời gian thực'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-xs text-gray-400 hidden sm:block">
            Đồng bộ lúc: <span className="font-medium text-gray-700">{lastRefreshed}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Cập nhật hàng đợi
          </button>
        </div>
      </div>

      {isFullyFinished ? (
        /* TRƯỜNG HỢP 1: ĐÃ HOÀN TẤT TOÀN BỘ CÁC BƯỚC */
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-6 animate-fade-in my-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Quy trình khám hoàn tất
            </span>
            <h2 className="text-2xl font-bold text-gray-900 pt-1">
              Bạn đã hoàn tất toàn bộ quy trình khám bệnh!
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-lg mx-auto">
              Bạn đã hoàn thành đầy đủ 5 bước: <strong>Đăng ký & tiếp nhận</strong>, <strong>Khám lâm sàng</strong>, <strong>Cận lâm sàng</strong>, <strong>Thanh toán viện phí</strong> và <strong>Nhận thuốc tại Nhà thuốc</strong>.
            </p>
          </div>

          {/* Hộp tóm tắt lượt khám */}
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-left text-xs space-y-2.5 text-gray-700">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
              <span className="text-gray-500">Bệnh nhân:</span>
              <span className="font-bold text-gray-900">{completedVisit?.hoTen || ticketData.hoTen || user?.hoTen}</span>
            </div>
            {(completedVisit?.soThuTu || ticketData.soThuTu) && (
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-gray-500">Số thứ tự đã khám:</span>
                <span className="font-mono font-bold text-emerald-800">{completedVisit?.soThuTu || ticketData.soThuTu}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
              <span className="text-gray-500">Bác sĩ phụ trách:</span>
              <span className="font-medium text-gray-800">{completedVisit?.bacSi || ticketData.bacSi}</span>
            </div>
            {(completedVisit?.chanDoanXacDinh || ticketData.chanDoanXacDinh) && (
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-gray-500">Chẩn đoán xác định:</span>
                <span className="font-bold text-gray-900">{completedVisit?.chanDoanXacDinh || ticketData.chanDoanXacDinh}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 text-emerald-800 font-semibold">
              <span>Trạng thái:</span>
              <span>✓ Đã thanh toán viện phí & Đã nhận thuốc</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Hồ sơ y tế, đơn thuốc điện tử, kết quả xét nghiệm và hóa đơn viện phí đã được lưu trữ an toàn trong Hồ sơ y tế cá nhân (EMR) của bạn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Star className="h-4 w-4 fill-white text-white" /> Đánh giá ca khám vừa xong
            </button>
            <button
              type="button"
              onClick={() => navigate('/benh-nhan/ho-so-y-te')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <FileText className="h-4 w-4" /> Mở Hồ sơ y tế chi tiết (EMR) & In phiếu
            </button>
            <button
              type="button"
              onClick={() => navigate('/benh-nhan/dat-lich')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Calendar className="h-4 w-4" /> Đặt lịch khám mới
            </button>
          </div>
        </div>
      ) : !hasActiveTicket && !loading ? (
        /* TRƯỜNG HỢP 2: KHÔNG CÓ LƯỢT KHÁM HÔM NAY */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5 my-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Ticket className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">Hôm nay bạn chưa có lượt khám nào</h2>
            <p className="text-sm text-gray-500">
              Quý khách có thể lấy số thứ tự trực tiếp tại Kiosk lễ tân phòng khám hoặc đặt lịch khám trực tuyến.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/benh-nhan/dat-lich')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Calendar className="h-4 w-4" /> Đặt lịch khám ngay
            </button>
          </div>
        </div>
      ) : (
        /* TRƯỜNG HỢP 3: ĐANG CÓ LƯỢT KHÁM DIỄN RA */
        <>
          {/* Cảnh báo đến lượt / Chuẩn bị đến lượt / CLS */}
          {isDaCoKqCls ? (
            <div className="bg-blue-600 text-white rounded-xl p-4.5 shadow-md flex items-start gap-3.5 animate-fade-in">
              <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5 text-blue-200" />
              <div>
                <h3 className="font-bold text-base">🔬 ĐÃ CÓ ĐẦY ĐỦ KẾT QUẢ CẬN LÂM SÀNG!</h3>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  Phòng xét nghiệm đã hoàn tất kết quả và gửi về cho bác sĩ. Quý khách vui lòng quay lại <strong>{ticketData.phongKham}</strong> để bác sĩ đọc kết quả, tư vấn và kê đơn điều trị.
                </p>
              </div>
            </div>
      ) : isDangCls ? (
        <div className="bg-purple-700 text-white rounded-xl p-4.5 shadow-md flex items-start gap-3.5 animate-fade-in">
          <FlaskConical className="h-6 w-6 shrink-0 mt-0.5 text-purple-200" />
          <div>
            <h3 className="font-bold text-base">📋 BÁC SĨ ĐÃ CHỈ ĐỊNH CẬN LÂM SÀNG ({ticketData.dsChiDinh?.length || 1} dịch vụ)</h3>
            <p className="text-xs text-purple-100 mt-1 leading-relaxed">
              Quý khách vui lòng di chuyển đến các phòng xét nghiệm / chẩn đoán hình ảnh theo hướng dẫn ở <strong>Bước 3</strong> bên dưới để thực hiện dịch vụ.
            </p>
          </div>
        </div>
      ) : isMyTurn ? (
        <div className="bg-emerald-600 text-white rounded-xl p-4.5 shadow-md flex items-start gap-3.5 animate-pulse">
          <Bell className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-base">🔔 ĐÃ ĐẾN LƯỢT KHÁM CỦA BẠN (SỐ {ticketData.soThuTu})!</h3>
            <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
              Bác sĩ đang mời bạn vào <strong>{ticketData.phongKham}</strong>. Quý khách vui lòng vào phòng khám ngay.
            </p>
          </div>
        </div>
      ) : isNearTurn ? (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950 text-sm">⚠️ Chuẩn bị đến lượt khám của bạn!</h4>
            <p>
              Bác sĩ đang khám số <strong>{ticketData.soDangGoi}</strong>. Bạn là số <strong>{ticketData.soThuTu}</strong> (chỉ còn {ticketData.soNguoiPhiaTruoc} người).
              Vui lòng có mặt trước cửa <strong>{ticketData.phongKham}</strong> để sẵn sàng khi được gọi tên.
            </p>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab('ticket')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'ticket'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Ticket className="h-4 w-4" />
          Phiếu Khám & Hàng Đợi
        </button>

        <button
          onClick={() => setActiveTab('dynamic-routing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'dynamic-routing'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          Lộ Trình Cận Lâm Sàng
          <span className="text-green-700 bg-green-50 border border-green-200 text-xs font-medium px-2 py-0.5 rounded">
            Giảm 18 phút chờ
          </span>
        </button>
      </div>

      {activeTab === 'ticket' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* CỘT TRÁI: PHIẾU KHÁM ĐIỆN TỬ */}
          <div className="lg:col-span-1">
            <div className={`bg-white rounded-xl border-2 p-5 space-y-4 ${isCompleted ? 'border-green-600' : 'border-blue-600'}`}>
              {/* Header phiếu */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-blue-600">
                    Phòng Khám Đa Khoa
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm">PHIẾU KHÁM ĐIỆN TỬ</h3>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                  isCompleted 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {isCompleted ? 'Đã hoàn thành' : 'Hợp lệ'}
                </span>
              </div>

              {/* Số thứ tự lớn */}
              <div className={`rounded-xl p-4 text-center border ${isCompleted ? 'bg-green-50/50 border-green-200' : 'bg-blue-50 border-blue-100'}`}>
                <span className="text-xs font-medium uppercase tracking-wider text-blue-600">
                  Số thứ tự của bạn
                </span>
                <div className={`text-6xl font-bold font-mono tracking-wider my-2 ${isCompleted ? 'text-green-700' : 'text-blue-700'}`}>
                  {ticketData.soThuTu}
                </div>
                <span className="inline-block bg-white text-gray-500 text-xs font-medium px-3 py-0.5 rounded border border-blue-200">
                  Mã y tế: {ticketData.maYTe}
                </span>
              </div>

              {/* Thông tin bệnh nhân & phòng khám */}
              <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" /> Bệnh nhân:
                  </span>
                  <span className="font-semibold text-gray-900">{ticketData.hoTen}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" /> Phòng khám:
                  </span>
                  <span className="font-medium text-gray-800 text-right max-w-[140px]">{ticketData.phongKham}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-gray-400" /> Bác sĩ trực:
                  </span>
                  <span className="font-medium text-gray-800">{ticketData.bacSi}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" /> Giờ cấp số:
                  </span>
                  <span className="font-medium text-gray-700">{ticketData.thoiGianLaySo}</span>
                </div>
              </div>

              {/* Lời dặn tiếp đón */}
              <div className={`p-3 rounded-lg border text-center text-xs leading-relaxed ${
                isCompleted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {isCompleted 
                  ? 'Quý khách đã hoàn tất lượt khám. Chúc quý khách nhiều sức khỏe!'
                  : 'Vui lòng theo dõi số thứ tự hiển thị tại bảng điện tử trước cửa phòng khám khi được gọi tên.'
                }
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TRẠNG THÁI HÀNG ĐỢI & TIẾN ĐỘ */}
          <div className="lg:col-span-2 space-y-5">
            {/* Thẻ trạng thái hàng đợi */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Trạng Thái Hàng Đợi Trực Tiếp
                </h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium border border-gray-200">
                  {ticketData.phongKham}
                </span>
              </div>

              {/* 3 chỉ số chính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Đang phục vụ số
                  </span>
                  <div className="text-3xl font-bold text-blue-700 my-1 font-mono">
                    {ticketData.soDangGoi}
                  </div>
                  <span className="text-xs text-gray-500">
                    {isCompleted ? 'Lượt khám của phòng' : 'Bệnh nhân đang trong phòng'}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Số người trước bạn
                  </span>
                  <div className="text-3xl font-bold text-amber-700 my-1 font-mono">
                    {isCompleted ? 0 : ticketData.soNguoiPhiaTruoc}
                  </div>
                  <span className="text-xs text-amber-600 font-medium">
                    {isCompleted ? 'Đã hoàn thành khám' : ticketData.soNguoiPhiaTruoc === 0 ? 'Đang đến lượt bạn' : 'Chuẩn bị đến lượt'}
                  </span>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                    Ước tính thời gian chờ
                  </span>
                  <div className="text-3xl font-bold text-green-700 my-1 font-mono">
                    {isCompleted ? '0 phút' : `~${ticketData.uocTinhPhut} phút`}
                  </div>
                  <span className="text-xs text-green-600">
                    {isCompleted ? 'Đã xong toàn bộ' : 'Dựa theo nhịp khám thực tế'}
                  </span>
                </div>
              </div>

              {/* Quy trình khám bệnh 4 bước */}
              <div className="pt-1">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
                  Quy trình khám bệnh trong ngày của bạn
                </h3>
                
                <div className="space-y-3">
                  {/* Bước 1 - Hoàn thành */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="h-8 w-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900">1. Đăng ký & Tiếp nhận</h4>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          Đã hoàn thành
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Đã tiếp nhận và cấp số thứ tự vào phòng khám chuyên khoa ({ticketData.thoiGianLaySo}).
                      </p>
                    </div>
                  </div>

                  {/* Bước 2 - Khám lâm sàng ban đầu */}
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isCompleted || isDangCls || isDaCoKqCls
                      ? 'bg-gray-50 border-gray-200'
                      : isDangKham || isMyTurn
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className={`h-8 w-8 rounded-lg text-white flex items-center justify-center shrink-0 ${
                      isCompleted || isDangCls || isDaCoKqCls
                        ? 'bg-green-600'
                        : isDangKham || isMyTurn
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                    }`}>
                      {isCompleted || isDangCls || isDaCoKqCls ? <CheckCircle2 className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold ${
                          isCompleted || isDangCls || isDaCoKqCls
                            ? 'text-gray-900'
                            : isDangKham || isMyTurn
                            ? 'text-emerald-950'
                            : 'text-blue-900'
                        }`}>
                          2. Khám lâm sàng ban đầu
                        </h4>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          isCompleted || isDangCls || isDaCoKqCls
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : isDangKham || isMyTurn
                            ? 'text-emerald-700 bg-white border-emerald-300'
                            : 'text-blue-700 bg-white border-blue-200'
                        }`}>
                          {isCompleted || isDangCls || isDaCoKqCls
                            ? 'Đã hoàn thành'
                            : isDangKham || isMyTurn
                            ? 'Đang khám trong phòng'
                            : ticketData.soNguoiPhiaTruoc === 0
                            ? 'Đang gọi tên vào phòng'
                            : 'Đang chờ gọi tên'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isCompleted || isDangCls || isDaCoKqCls
                          ? 'text-gray-600'
                          : isDangKham || isMyTurn
                          ? 'text-emerald-800 font-medium'
                          : 'text-blue-700'
                      }`}>
                        {isCompleted
                          ? `Bác sĩ đã hoàn tất khám lâm sàng và chẩn đoán bệnh án tại ${ticketData.phongKham}.`
                          : isDangKham || isMyTurn
                          ? `Bác sĩ đang khám cho bạn (${ticketData.soThuTu}) tại ${ticketData.phongKham}.`
                          : (isDangCls || isDaCoKqCls)
                          ? `Đã hoàn tất khám lâm sàng ban đầu tại ${ticketData.phongKham}.`
                          : ticketData.soNguoiPhiaTruoc === 0
                          ? `Đến lượt bạn! Bác sĩ đang gọi số ${ticketData.soThuTu} vào ${ticketData.phongKham}.`
                          : `Bác sĩ đang khám bệnh nhân số ${ticketData.soDangGoi}. Bạn là số ${ticketData.soThuTu} (còn ${ticketData.soNguoiPhiaTruoc} người phía trước).`}
                      </p>
                    </div>
                  </div>

                  {/* Bước 3 - Cận lâm sàng */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-gray-50 border-gray-200'
                      : isDaCoKqCls
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-300/30 shadow-xs'
                      : isDangCls
                      ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-300/30 shadow-xs'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold shrink-0 ${
                      isCompleted || isDaCoKqCls
                        ? 'bg-green-600 text-white'
                        : isDangCls
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted || isDaCoKqCls ? <CheckCircle2 className="h-5 w-5" /> : '3'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold ${
                          isDangCls ? 'text-purple-950 font-bold' : isDaCoKqCls ? 'text-blue-950 font-bold' : 'text-gray-900'
                        }`}>
                          3. Thực hiện Cận lâm sàng (Nếu có)
                        </h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                          isCompleted
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : isDaCoKqCls
                            ? 'text-blue-800 bg-blue-100 border-blue-300'
                            : isDangCls
                            ? 'text-purple-800 bg-purple-100 border-purple-300 animate-pulse'
                            : 'text-gray-500 bg-white border-gray-200'
                        }`}>
                          {isCompleted
                            ? 'Đã hoàn thành'
                            : isDaCoKqCls
                            ? `✓ Đã có đủ KQ (${ticketData.dsChiDinh?.length || 1})`
                            : isDangCls
                            ? `Đang thực hiện (${ticketData.dsChiDinh?.filter(d => d.trangThai === 'co_ket_qua').length || 0}/${ticketData.dsChiDinh?.length || 1})`
                            : 'Theo chỉ định của bác sĩ'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {isCompleted
                          ? 'Đã hoàn tất các chỉ định cận lâm sàng.'
                          : isDaCoKqCls
                          ? `Đã có đầy đủ kết quả ${ticketData.dsChiDinh?.length || ''} dịch vụ cận lâm sàng gửi về phòng khám của bác sĩ.`
                          : isDangCls
                          ? `Bác sĩ đã chỉ định ${ticketData.dsChiDinh?.length || ''} dịch vụ. Vui lòng di chuyển đến các phòng xét nghiệm / CĐHA theo danh sách bên dưới:`
                          : 'Hệ thống tự động điều phối bạn qua các phòng xét nghiệm / siêu âm vắng nhất để giảm thời gian chờ.'}
                      </p>

                      {/* Danh sách các dịch vụ CLS được chỉ định thực tế */}
                      {hasCls && ticketData.dsChiDinh && ticketData.dsChiDinh.length > 0 && (
                        <div className="mt-3 space-y-2 pt-2.5 border-t border-purple-200/60">
                          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Danh sách dịch vụ được chỉ định ({ticketData.dsChiDinh.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ticketData.dsChiDinh.map((dv) => {
                              const isDone = dv.trangThai === 'co_ket_qua';
                              return (
                                <div
                                  key={dv.id}
                                  className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                                    isDone
                                      ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                                      : dv.trangThai === 'dang_xu_ly'
                                      ? 'bg-blue-50/80 border-blue-300'
                                      : 'bg-white border-purple-200 shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="font-bold text-gray-900 block">{dv.tenDichVu}</span>
                                      <span className="text-[11px] text-gray-500">Mã: {dv.maDichVu || 'CLS'}</span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        isDone
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : dv.trangThai === 'dang_xu_ly'
                                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {isDone
                                        ? '✓ Có kết quả'
                                        : dv.trangThai === 'dang_xu_ly'
                                        ? 'Đang phân tích'
                                        : 'Chờ lấy mẫu'}
                                    </span>
                                  </div>
                                  {isDone && dv.giaTri && (
                                    <div className="mt-1 pt-1 border-t border-emerald-200/80 text-emerald-950 font-medium">
                                      Kết quả: <span className="font-bold text-sm text-emerald-900">{dv.giaTri}</span> {dv.donVi || ''}
                                      {dv.nhanXet && (
                                        <span className="text-[11px] text-emerald-700 block italic mt-0.5">
                                          Nhận xét: {dv.nhanXet}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bước 4 - Kết luận, Đơn thuốc & Viện phí */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : isDaCoKqCls
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300/30 shadow-xs'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold shrink-0 ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isDaCoKqCls
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : '4'}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold ${isCompleted ? 'text-green-950 font-bold' : isDaCoKqCls ? 'text-emerald-950 font-bold' : 'text-gray-900'}`}>
                          4. Kết luận khám, Đơn thuốc & Thanh toán viện phí
                        </h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                          isCompleted
                            ? 'text-green-700 bg-white border-green-300'
                            : isDaCoKqCls
                            ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                            : 'text-gray-400 bg-white border-gray-200'
                        }`}>
                          {isCompleted ? 'Đã hoàn thành' : isDaCoKqCls ? 'Sẵn sàng vào gặp bác sĩ' : 'Chưa bắt đầu'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {isCompleted
                          ? 'Bác sĩ đã hoàn tất kết luận bệnh án, kê đơn thuốc điều trị và gửi hóa đơn viện phí sang quầy thu ngân.'
                          : isDaCoKqCls
                          ? `Bác sĩ đang tiếp nhận kết quả cận lâm sàng của bạn. Quý khách vui lòng có mặt tại ${ticketData.phongKham} khi được gọi tên.`
                          : 'Bác sĩ đưa ra kết luận bệnh án, tư vấn phác đồ và cấp đơn thuốc điện tử.'}
                      </p>

                      {/* Khi đã hoàn thành ca khám, hiển thị chi tiết Đơn thuốc & Viện phí */}
                      {isCompleted && (
                        <div className="space-y-3 pt-2 border-t border-emerald-200">
                          {/* Chẩn đoán */}
                          {ticketData.chanDoanXacDinh && (
                            <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs">
                              <span className="font-semibold text-emerald-800">Chẩn đoán xác định (ICD-10): </span>
                              <span className="font-bold text-gray-900">{ticketData.chanDoanXacDinh}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Thẻ Đơn thuốc */}
                            <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                  <Pill className="h-4 w-4 text-blue-600" />
                                  Đơn thuốc điện tử {ticketData.donThuoc?.maDonThuoc ? `(#${ticketData.donThuoc.maDonThuoc})` : ''}
                                </span>
                                {ticketData.donThuoc?.trangThai === 'da_cap_phat' ? (
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ Đã nhận thuốc
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Chờ lấy thuốc tại Nhà thuốc
                                  </span>
                                )}
                              </div>

                              {ticketData.donThuoc?.chiTiet && ticketData.donThuoc.chiTiet.length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  {ticketData.donThuoc.chiTiet.map((ct, idx) => (
                                    <div key={idx} className="text-xs flex justify-between border-b border-gray-50 pb-1">
                                      <div>
                                        <span className="font-semibold text-gray-800">{ct.tenThuoc}</span>
                                        <div className="text-[11px] text-gray-500">{ct.lieuDung || 'Theo chỉ định'}</div>
                                      </div>
                                      <span className="font-bold text-blue-600 shrink-0">x{ct.soLuong} {ct.donViTinh}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">Đơn thuốc ngoại trú không kê thêm dược phẩm.</p>
                              )}
                            </div>

                            {/* Thẻ Viện phí */}
                            <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                  <CreditCard className="h-4 w-4 text-emerald-600" />
                                  Biên lai viện phí {ticketData.hoaDon?.maHoaDon ? `(#${ticketData.hoaDon.maHoaDon})` : ''}
                                </span>
                                {ticketData.hoaDon?.trangThai === 'da_thanh_toan' ? (
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ Đã thanh toán
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                                    Chờ thanh toán tại Quầy thu ngân
                                  </span>
                                )}
                              </div>

                              {ticketData.hoaDon ? (
                                <div className="space-y-2 text-xs pt-1">
                                  {ticketData.hoaDon.chiTiet && ticketData.hoaDon.chiTiet.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border-b border-gray-100 pb-2">
                                      {ticketData.hoaDon.chiTiet.map((ct, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-[11px] bg-gray-50/70 p-1.5 rounded">
                                          <div className="pr-2">
                                            <div className="font-semibold text-gray-800">{ct.moTa}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">
                                              SL: {ct.soLuong} × {formatCurrency(ct.donGia)}
                                            </div>
                                          </div>
                                          <span className="font-bold text-gray-900 font-mono shrink-0">
                                            {formatCurrency(ct.thanhTien)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="space-y-1 pt-1">
                                    <div className="flex justify-between text-gray-600">
                                      <span>Tổng viện phí:</span>
                                      <span className="font-semibold">{formatCurrency(ticketData.hoaDon.tongTien)}</span>
                                    </div>
                                    {ticketData.hoaDon.soTienGiam > 0 && (
                                      <div className="flex justify-between text-emerald-700">
                                        <span>Khấu trừ BHYT:</span>
                                        <span className="font-semibold">- {formatCurrency(ticketData.hoaDon.soTienGiam)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200 text-sm">
                                      <span>Thực thu:</span>
                                      <span className="text-emerald-700 font-mono">{formatCurrency(ticketData.hoaDon.thucThu)}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">Đang tổng hợp viện phí tại quầy thu ngân.</p>
                              )}
                            </div>
                          </div>

                          {/* Nút hành động */}
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate('/benh-nhan/ho-so-y-te')}
                              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            >
                              <FileText className="h-3.5 w-3.5" /> Mở Hồ sơ y tế chi tiết (EMR) & In phiếu
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner chuyển sang Lộ trình tối ưu */}
            <div className="bg-white border border-blue-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-blue-600">
                  Điều Hướng Cận Lâm Sàng Thông Minh
                </span>
                <h4 className="text-sm font-semibold text-gray-900">
                  Tự động sắp xếp phòng khám vắng nhất để tiết kiệm thời gian
                </h4>
                <p className="text-xs text-gray-500">
                  Giúp bạn hoàn thành các chỉ định siêu âm, xét nghiệm sớm hơn 18 phút so với thứ tự thông thường.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('dynamic-routing')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                Xem lộ trình khám <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: LỘ TRÌNH ĐIỀU HƯỚNG CẬN LÂM SÀNG TỐI ƯU */
        <div className="space-y-5">
          {/* Header giải thích cơ chế */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Phân Luồng Thời Gian Thực
                </span>
                <h2 className="text-xl font-semibold text-gray-900 mt-1">
                  Lộ Trình Khám & Cận Lâm Sàng Tối Ưu
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Dựa vào số lượng bệnh nhân thực tế đang chờ tại các khoa phòng, hệ thống tự động chỉ dẫn bạn vào phòng có thời gian chờ ngắn nhất trước.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center sm:text-right shrink-0">
                <div className="text-xs text-green-700 font-medium uppercase">Tiết kiệm dự kiến</div>
                <div className="text-2xl font-bold text-green-700 font-mono">~18 phút</div>
                <div className="text-[11px] text-green-600">Giảm 40% thời gian chờ đợi</div>
              </div>
            </div>

            {/* Thông báo phân tích */}
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Chỉ dẫn từ hệ thống tiếp đón:</strong> {routingPlan.lyDoToiUu}
              </div>
            </div>
          </div>

          {/* Danh sách các chặng */}
          <div className="space-y-3">
            {routingPlan.loTrinh.map((buoc, idx) => (
              <div 
                key={idx}
                className={`bg-white p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  buoc.trangThai === 'uu_tien_ngay'
                    ? 'border-blue-500 ring-1 ring-blue-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-semibold text-base shrink-0 ${
                    buoc.trangThai === 'uu_tien_ngay'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {buoc.buoc}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900">{buoc.tenPhong}</h4>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        buoc.trangThai === 'uu_tien_ngay'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {buoc.badge}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-blue-600">{buoc.dichVu}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" /> {buoc.ghiChu}
                    </p>
                  </div>
                </div>

                {/* Thống kê tải phòng */}
                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 self-stretch md:self-auto justify-between md:justify-end">
                  <div className="text-center px-3">
                    <div className="text-[11px] text-gray-500 font-medium">Bệnh nhân đang chờ</div>
                    <div className={`text-base font-bold font-mono ${
                      buoc.soNguoiCho <= 1 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {buoc.soNguoiCho} người
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200" />

                  <div className="text-center px-3">
                    <div className="text-[11px] text-gray-500 font-medium">Thời gian thực hiện</div>
                    <div className="text-base font-semibold text-gray-800 font-mono">
                      {buoc.thoiGianUocTinh}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* So sánh thời gian chờ */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              So Sánh Thời Gian Chờ Khám Dự Kiến
            </h4>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>Thứ tự truyền thống (Dồn ứ tại phòng xét nghiệm trước)</span>
                  <span className="text-gray-800 font-semibold">{routingPlan.soSanh.truyenThong} phút</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span className="text-blue-600 font-semibold">Lộ trình tối ưu (Chuyển sang phòng siêu âm vắng trước)</span>
                  <span className="text-blue-600 font-semibold">{routingPlan.soSanh.dieuHuongToiUu} phút</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal Đánh Giá Trải Nghiệm Ca Khám */}
      <DanhGiaCaKhamModal
        isOpen={reviewModalOpen}
        appointment={
          completedVisit?.lichHenId
            ? {
                id: completedVisit.lichHenId,
                maLichHen: completedVisit.soThuTu ? `Lượt #${completedVisit.soThuTu}` : 'Lượt khám',
                ngayHen: 'Hôm nay',
                bacSi: { nhanVien: { hoTen: completedVisit.bacSi } },
              }
            : ticketData?.lichHenId
            ? {
                id: ticketData.lichHenId,
                maLichHen: ticketData.soThuTu ? `Lượt #${ticketData.soThuTu}` : 'Lượt khám',
                ngayHen: 'Hôm nay',
                bacSi: { nhanVien: { hoTen: ticketData.bacSi } },
              }
            : null
        }
        onClose={() => setReviewModalOpen(false)}
        onSuccess={fetchQueueData}
      />
    </div>
  );
}
