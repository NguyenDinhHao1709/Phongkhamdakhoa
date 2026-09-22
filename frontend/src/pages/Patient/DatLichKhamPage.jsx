import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Calendar, Clock, CheckCircle, AlertCircle, User, Users,
  HeartPulse, ShieldAlert, CreditCard, Video, Building2, Wifi, MapPin,
  X, Timer, AlertTriangle, UserCheck, Stethoscope, ChevronRight, Check
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import useAuthStore from '../../store/authStore';
import AppointmentTicketModal from '../../components/Appointment/AppointmentTicketModal';

const CHUYEN_KHOA_LIST = [
  'Nội tổng quát & Tim mạch',
  'Ngoại khoa',
  'Nhi khoa',
  'Tai Mũi Họng',
  'Cơ Xương Khớp & PHCN',
  'Da Liễu & Thẩm Mỹ',
  'Chẩn đoán hình ảnh & Xét nghiệm',
];

const PAYMENT_SECONDS = 10 * 60; // 10 phút

// ─── Countdown Modal Thanh Toán ─────────────────────────────────────────
function PaymentCountdownModal({ lichHenId, maLichHen, onPaid, onCancelled, onPaymentError }) {
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_SECONDS);
  const intervalRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          if (!cancelledRef.current) {
            cancelledRef.current = true;
            handleAutoCancel();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleAutoCancel = async () => {
    try {
      await apiPatch(`/lich-hen/${lichHenId}/huy`, { lyDoHuy: 'Hết thời gian thanh toán (10 phút)' });
    } catch {
      // ignore
    }
    onCancelled();
  };

  const handlePay = async () => {
    clearInterval(intervalRef.current);
    cancelledRef.current = true;
    try {
      await onPaid();
    } catch (err) {
      cancelledRef.current = false;
      onPaymentError(err);
    }
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const pct = (secondsLeft / PAYMENT_SECONDS) * 100;
  const isUrgent = secondsLeft <= 120; // 2 phút cuối

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Xác nhận thanh toán tạm ứng</h2>
            <p className="text-xs text-gray-500">Mã lịch hẹn: <span className="font-mono font-semibold text-blue-600">{maLichHen}</span></p>
          </div>
        </div>

        {/* Countdown */}
        <div className={`rounded-xl p-5 mb-5 text-center ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`text-xs font-semibold mb-2 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
            <Timer className="inline h-3.5 w-3.5 mr-1" />
            Thời gian còn lại để thanh toán giữ chỗ
          </p>
          <p className={`text-5xl font-bold font-mono tabular-nums ${isUrgent ? 'text-red-600' : 'text-blue-700'}`}>
            {mins}:{secs}
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isUrgent && (
            <p className="mt-2 text-xs text-red-600 font-medium">⚠ Sắp hết giờ — lịch hẹn sẽ bị hủy tự động!</p>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
          <span className="text-sm text-gray-600">Tạm ứng phí khám (1/5):</span>
          <span className="text-lg font-bold text-blue-700">40.000 đ</span>
        </div>

        <p className="text-xs text-gray-500 mb-4 text-center">
          Nếu không thanh toán trong {mins}:{secs}, lịch hẹn sẽ <strong className="text-red-600">tự động bị hủy</strong> và bạn cần đặt lại.
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handlePay}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Thanh toán ngay — 40.000đ (VNPay / MoMo)
          </button>
          <button
            onClick={handleAutoCancel}
            className="w-full bg-white hover:bg-gray-50 text-gray-500 py-2.5 rounded-xl text-sm border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            Hủy lịch hẹn
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component: Đặt Lịch Khám ─────────────────────────────────────
export default function DatLichKhamPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHinhThuc = searchParams.get('hinhThuc') === 'truc_tuyen' ? 'truc_tuyen' : 'truc_tiep';
  const [hinhThuc, setHinhThuc] = useState(initialHinhThuc);

  const initialDoiTuong = searchParams.get('doiTuong') === 'nguoi_khac' ? 'nguoi_khac' : 'cho_toi';
  const [doiTuong, setDoiTuong] = useState(initialDoiTuong);

  // Quy định: Đặt trước từ 2 đến 7 ngày tính từ ngày hiện tại
  const today = new Date();
  const minDateObj = new Date(today);
  minDateObj.setDate(minDateObj.getDate() + 2); // Tối thiểu 2 ngày
  const minDate = minDateObj.toISOString().split('T')[0];

  const maxDateObj = new Date(today);
  maxDateObj.setDate(maxDateObj.getDate() + 7); // Tối đa 7 ngày
  const maxDate = maxDateObj.toISOString().split('T')[0];

  const [myAppointments, setMyAppointments] = useState([]);
  const [doctorsOnDate, setDoctorsOnDate] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal thanh toán & Modal phiếu hẹn khám sau khi thanh toán
  const [paymentModal, setPaymentModal] = useState(null);
  const [ticketModalData, setTicketModalData] = useState({ isOpen: false, appointment: null });
  const [paidMsg, setPaidMsg] = useState('');
  const [cancelledMsg, setCancelledMsg] = useState('');

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      hoTenNguoiKham: '',
      soDienThoaiNguoiKham: '',
      ngaySinhNguoiKham: '',
      gioiTinhNguoiKham: 'nam',
      moiQuanHe: 'Bố/Mẹ',
      chuyenKhoa: CHUYEN_KHOA_LIST[0],
      bacSiId: '',
      ngayHen: minDate, // mặc định ngày sớm nhất (hôm nay + 2 ngày)
      lyDoKham: '',
    },
  });

  const selectedChuyenKhoa = watch('chuyenKhoa');
  const selectedNgayHen = watch('ngayHen');
  const selectedBacSiId = watch('bacSiId');

  useEffect(() => {
    const dt = searchParams.get('doiTuong');
    if (dt) setDoiTuong(dt === 'nguoi_khac' ? 'nguoi_khac' : 'cho_toi');
  }, [searchParams]);

  useEffect(() => {
    const ck = searchParams.get('chuyenKhoa');
    if (ck) {
      const match = CHUYEN_KHOA_LIST.find(
        (c) => c.toLowerCase().includes(ck.toLowerCase()) || ck.toLowerCase().includes(c.toLowerCase())
      );
      if (match) setValue('chuyenKhoa', match);
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = async () => {
    try {
      const resMine = await apiGet('/lich-hen/cua-toi');
      if (resMine.data) setMyAppointments(resMine.data);
    } catch (err) {
      console.error('Lỗi tải lịch hẹn cá nhân:', err);
    }
  };

  // ─── TỰ ĐỘNG TẢI DANH SÁCH BÁC SĨ TRỰC VÀ CA TRỐNG KHI THAY ĐỔI KHOA HOẶC NGÀY ───
  useEffect(() => {
    if (!selectedChuyenKhoa || !selectedNgayHen) return;

    let isMounted = true;
    const fetchDoctorsAndSlots = async () => {
      setLoadingDoctors(true);
      try {
        const res = await apiGet('/lich-hen/bac-si-ca-trong', {
          chuyenKhoa: selectedChuyenKhoa,
          ngay: selectedNgayHen,
        });
        if (!isMounted) return;

        const doctors = res.data || [];
        setDoctorsOnDate(doctors);

        // Nếu bác sĩ hiện tại không có trong danh sách hoặc không có slot trống
        if (doctors.length > 0) {
          // Nếu chưa chọn bác sĩ hoặc bác sĩ đã chọn không nằm trong danh sách mới
          const currentDoc = doctors.find((d) => String(d.id) === String(selectedBacSiId));
          if (currentDoc) {
            setSelectedDoctor(currentDoc);
            // Kiểm tra slot hiện tại còn trống không
            const slotObj = currentDoc.slots.find((s) => s.gio === selectedSlot && s.conTrong);
            if (!slotObj) {
              const firstAvailable = currentDoc.slots.find((s) => s.conTrong);
              setSelectedSlot(firstAvailable ? firstAvailable.gio : '');
            }
          } else {
            // Mặc định chọn bác sĩ đầu tiên có ca trống
            const firstAvailableDoc = doctors.find((d) => d.soSlotTrong > 0) || doctors[0];
            setSelectedDoctor(firstAvailableDoc);
            setValue('bacSiId', firstAvailableDoc ? String(firstAvailableDoc.id) : '');
            const firstSlot = firstAvailableDoc?.slots.find((s) => s.conTrong);
            setSelectedSlot(firstSlot ? firstSlot.gio : '');
          }
        } else {
          setSelectedDoctor(null);
          setValue('bacSiId', '');
          setSelectedSlot('');
        }
      } catch (err) {
        console.error('Lỗi tải bác sĩ trực:', err);
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    };

    fetchDoctorsAndSlots();
    return () => { isMounted = false; };
  }, [selectedChuyenKhoa, selectedNgayHen]);

  const handleSelectHinhThuc = (type) => {
    setHinhThuc(type);
    const params = new URLSearchParams(searchParams);
    params.set('hinhThuc', type);
    setSearchParams(params);
  };

  const handleSelectDoiTuong = (type) => {
    setDoiTuong(type);
    const params = new URLSearchParams(searchParams);
    params.set('doiTuong', type);
    setSearchParams(params);
  };

  // Chọn bác sĩ và slot trống
  const handleSelectDoctorSlot = (doctor, slot) => {
    if (!slot.conTrong) return;
    setSelectedDoctor(doctor);
    setValue('bacSiId', String(doctor.id));
    setSelectedSlot(slot.gio);
    setErrorMsg('');
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMsg('');
    setPaidMsg('');
    setCancelledMsg('');

    if (!selectedSlot) {
      setErrorMsg('Vui lòng chọn một ca khám/khung giờ còn trống của bác sĩ.');
      setSubmitting(false);
      return;
    }

    if (doiTuong === 'nguoi_khac') {
      if (!data.hoTenNguoiKham?.trim()) {
        setErrorMsg('Vui lòng nhập Họ và tên người đi khám');
        setSubmitting(false);
        return;
      }
      if (!data.soDienThoaiNguoiKham?.trim()) {
        setErrorMsg('Vui lòng nhập Số điện thoại liên hệ của người đi khám');
        setSubmitting(false);
        return;
      }
    }

    try {
      const isBookingForOther = doiTuong === 'nguoi_khac';
      const payload = {
        benhNhanId: user?.benhNhanId || 1,
        datChoNguoiKhac: isBookingForOther,
        hoTen: isBookingForOther ? data.hoTenNguoiKham?.trim() : undefined,
        soDienThoai: isBookingForOther ? data.soDienThoaiNguoiKham?.trim() : undefined,
        ngaySinh: (isBookingForOther && data.ngaySinhNguoiKham) ? data.ngaySinhNguoiKham : undefined,
        gioiTinh: isBookingForOther ? data.gioiTinhNguoiKham || 'nam' : undefined,
        moiQuanHe: isBookingForOther ? data.moiQuanHe || 'Người thân' : undefined,
        chuyenKhoa: data.chuyenKhoa,
        bacSiId: data.bacSiId ? Number(data.bacSiId) : undefined,
        ngayHen: data.ngayHen,
        gioHen: selectedSlot,
        hinhThuc: hinhThuc,
        lyDoKham: isBookingForOther
          ? `[Khám cho: ${data.hoTenNguoiKham} - Quan hệ: ${data.moiQuanHe || 'Người thân'}] ${data.lyDoKham || ''}`.trim()
          : data.lyDoKham || '',
      };

      const res = await apiPost('/lich-hen', payload);
      const lichHenId = res.data?.id || res.data?.lichHenId;
      const maLichHen = res.data?.maLichHen || 'LH2026';

      // Mở modal đếm ngược thanh toán
      setPaymentModal({ lichHenId, maLichHen });
      fetchMyAppointments();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lịch khám');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Modal Đếm Ngược Thanh Toán Tạm Ứng ── */}
      {paymentModal && (
        <PaymentCountdownModal
          lichHenId={paymentModal.lichHenId}
          maLichHen={paymentModal.maLichHen}
          onPaid={async () => {
            const res = await apiPost(`/lich-hen/${paymentModal.lichHenId}/xac-nhan-thanh-toan`);
            setPaymentModal(null);
            // Mở modal Phiếu Hẹn Khám Điện Tử có QR code
            setTicketModalData({
              isOpen: true,
              appointment: res.data || {
                id: paymentModal.lichHenId,
                maLichHen: paymentModal.maLichHen,
                soThuTu: res.data?.soThuTu || 'A001',
                ngayHen: selectedNgayHen,
                gioHen: selectedSlot,
                chuyenKhoa: selectedChuyenKhoa,
                bacSi: selectedDoctor,
                phongKham: selectedDoctor?.phongKham,
                benhNhan: { hoTen: user?.hoTen || 'Bệnh nhân' },
              },
            });
            fetchMyAppointments();
          }}
          onPaymentError={(err) => setErrorMsg(err?.error?.message || err?.message || 'Không thể xác nhận thanh toán')}
          onCancelled={() => {
            setPaymentModal(null);
            setCancelledMsg(`⚠ Lịch hẹn ${paymentModal.maLichHen} đã bị hủy do hết thời gian thanh toán (10 phút). Vui lòng đặt lịch lại.`);
          }}
        />
      )}

      {/* ── Modal Phiếu Hẹn Khám Điện Tử (Có STT, Phòng, Giờ, Mã QR) ── */}
      <AppointmentTicketModal
        isOpen={ticketModalData.isOpen}
        appointment={ticketModalData.appointment}
        onClose={() => setTicketModalData({ isOpen: false, appointment: null })}
        onViewAllAppointments={() => navigate('/benh-nhan/lich-hen')}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Tiêu đề & Quy định nổi bật */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Đặt Lịch Khám Bệnh Trực Tuyến
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Quy trình phân luồng thông minh: Chọn khoa → Chọn ngày → Chọn ca trống của bác sĩ trực.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Đặt trước từ 2 đến 7 ngày</span>
            </div>
          </div>
        </div>

        {/* ─── CHỌN ĐỐI TƯỢNG ĐẶT LỊCH: CHO TÔI VS CHO NGƯỜI KHÁC ─── */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-gray-200">
          <button
            type="button"
            onClick={() => handleSelectDoiTuong('cho_toi')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              doiTuong === 'cho_toi'
                ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <User className="h-4 w-4 text-blue-600" />
            <span>Đặt lịch cho tôi</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectDoiTuong('nguoi_khac')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              doiTuong === 'nguoi_khac'
                ? 'bg-white text-emerald-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span>Đặt lịch cho người thân (Đặt hộ)</span>
          </button>
        </div>

        {/* Thông báo hủy / hết hạn */}
        {cancelledMsg && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-700 border border-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{cancelledMsg}</span>
          </div>
        )}

        {/* ─── HÌNH THỨC KHÁM: TRỰC TIẾP VS TELEHEALTH ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => handleSelectHinhThuc('truc_tiep')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              hinhThuc === 'truc_tiep' ? 'bg-blue-50/70 border-blue-600 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${hinhThuc === 'truc_tiep' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                <Building2 className="h-5 w-5" />
              </div>
              {hinhThuc === 'truc_tiep' && (
                <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Đang chọn
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Khám trực tiếp tại phòng khám</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Khám lâm sàng tại phòng khám, đo sinh hiệu và thực hiện xét nghiệm/siêu âm cận lâm sàng.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>123 Đường Y Học, Quận 1, TP.HCM</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectHinhThuc('truc_tuyen')}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              hinhThuc === 'truc_tuyen' ? 'bg-blue-50/70 border-blue-600 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${hinhThuc === 'truc_tuyen' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                <Video className="h-5 w-5" />
              </div>
              {hinhThuc === 'truc_tuyen' && (
                <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Đang chọn
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Khám tư vấn Online (Telehealth)</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Bác sĩ gọi Video trực tuyến từ xa, tư vấn phác đồ điều trị và cấp đơn thuốc điện tử tại nhà.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <Wifi className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Phòng khám ảo qua Video Call WebRTC</span>
            </div>
          </button>
        </div>

        {/* Lỗi submit */}
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-700 border border-red-200 animate-fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form Đặt Lịch */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6 shadow-2xs">
          {/* THÔNG TIN NGƯỜI ĐƯỢC ĐẶT LỊCH (KHI ĐẶT CHO NGƯỜI THÂN) */}
          {doiTuong === 'nguoi_khac' && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-200/80 pb-2.5">
                <Users className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Thông tin cá nhân người đi khám</h3>
                  <p className="text-xs text-emerald-700">Vui lòng cung cấp chính xác để phòng khám cấp số thứ tự và lập hồ sơ bệnh án</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Họ và tên người đi khám *
                  </label>
                  <input
                    type="text"
                    {...register('hoTenNguoiKham')}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="tel"
                    {...register('soDienThoaiNguoiKham')}
                    placeholder="VD: 0912345678"
                    className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Ngày sinh (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    {...register('ngaySinhNguoiKham')}
                    className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Giới tính
                  </label>
                  <select
                    {...register('gioiTinhNguoiKham')}
                    className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Mối quan hệ với người đi khám *
                  </label>
                  <select
                    {...register('moiQuanHe')}
                    className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="Bố/Mẹ">Bố / Mẹ</option>
                    <option value="Vợ/Chồng">Vợ / Chồng</option>
                    <option value="Con cái">Con cái</option>
                    <option value="Anh/Chị/Em">Anh / Chị / Em</option>
                    <option value="Họ hàng">Họ hàng / Người thân khác</option>
                    <option value="Bạn bè">Bạn bè / Đồng nghiệp</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── BƯỚC 1: CHỌN CHUYÊN KHOA & BƯỚC 2: CHỌN NGÀY KHÁM ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bước 1: Chọn Chuyên Khoa */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-blue-600" />
                <span>1. Chọn Chuyên Khoa Khám *</span>
              </label>
              <select
                {...register('chuyenKhoa', { required: true })}
                required
                className="w-full rounded-xl border border-gray-300 p-3 text-sm bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-semibold"
              >
                {CHUYEN_KHOA_LIST.map((ck) => (
                  <option key={ck} value={ck}>{ck}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Lọc bác sĩ thuộc chuyên khoa mũi nhọn
              </p>
            </div>

            {/* Bước 2: Chọn Ngày Khám (2 - 7 ngày) */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>2. Chọn Ngày Khám *</span>
                </span>
                <span className="text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Đặt trước 2 - 7 ngày
                </span>
              </label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                {...register('ngayHen', { required: true })}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-semibold font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Thời gian khả dụng: từ {minDate} đến {maxDate}
              </p>
            </div>
          </div>

          {/* ─── BƯỚC 3: BÁC SĨ ĐANG TRỰC & KHUNG GIỜ/CA TRỐNG ─── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <span>3. Bác Sĩ Đang Trực & Chọn Ca Khám Còn Trống *</span>
              </label>
              <span className="text-xs text-gray-500">
                Ca sáng (08:00 - 11:00) • Ca chiều (13:30 - 16:30)
              </span>
            </div>

            {loadingDoctors ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center text-gray-500">
                <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto mb-2.5"></div>
                <p className="text-xs font-semibold">Đang kiểm tra lịch trực bác sĩ và các ca trống trong ngày {selectedNgayHen}...</p>
              </div>
            ) : doctorsOnDate.length === 0 ? (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center text-amber-900 space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-sm font-bold">Chưa có lịch trực cho chuyên khoa {selectedChuyenKhoa} vào ngày {selectedNgayHen}</p>
                <p className="text-xs text-amber-800">
                  Quý khách vui lòng chọn ngày khám khác trong khoảng từ 2 đến 7 ngày tới, hoặc chọn chuyên khoa khác.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {doctorsOnDate.map((doc) => {
                  const isCurrentDoctorSelected = String(selectedDoctor?.id) === String(doc.id);
                  const morningSlots = doc.slots.filter((s) => s.ca === 'sang');
                  const afternoonSlots = doc.slots.filter((s) => s.ca === 'chieu');

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-2xl p-5 border-2 transition-all ${
                        isCurrentDoctorSelected
                          ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Doctor Profile Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 font-black text-sm flex-shrink-0 overflow-hidden">
                            {doc.anhDaiDien ? (
                              <img
                                src={doc.anhDaiDien.startsWith('http') ? doc.anhDaiDien : `http://localhost:5000${doc.anhDaiDien}`}
                                alt={doc.hoTen}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              doc.hoTen?.charAt(0) || 'BS'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-gray-900 text-sm">{doc.hoTen}</h4>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang trực
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {doc.bangCap || 'Bác sĩ chuyên khoa'} • {doc.chuyenKhoa}
                            </p>
                            {doc.phongKham && (
                              <p className="text-[11px] font-semibold text-blue-700 mt-0.5 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{doc.phongKham.tenPhong} ({doc.phongKham.viTri})</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right sm:text-right">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            {doc.soSlotTrong} ca khám còn trống
                          </span>
                        </div>
                      </div>

                      {/* Lưới các ca khám của bác sĩ */}
                      <div className="pt-3.5 space-y-3">
                        {/* Ca Sáng */}
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                            Ca Sáng (08:00 - 11:00)
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {morningSlots.map((slot) => {
                              const isSelected = isCurrentDoctorSelected && selectedSlot === slot.gio;
                              const isAvailable = slot.conTrong;

                              return (
                                <button
                                  key={slot.gio}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => handleSelectDoctorSlot(doc, slot)}
                                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm scale-105 ring-2 ring-blue-300 cursor-pointer'
                                      : isAvailable
                                      ? 'bg-white text-blue-700 border border-blue-300 hover:border-blue-600 hover:bg-blue-50 shadow-2xs hover:shadow-xs cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-45 cursor-not-allowed'
                                  }`}
                                  title={isAvailable ? `Chọn ca khám lúc ${slot.gio}` : 'Ca này đã kín lịch hoặc ngoài giờ trực'}
                                >
                                  <span>{slot.gio}</span>
                                  {isAvailable ? (
                                    <span className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                                      {isSelected ? '✓ Đang chọn' : 'Còn trống'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-normal">
                                      {slot.daDat ? 'Đã kín' : 'Ngoài ca'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Ca Chiều */}
                        <div>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                            Ca Chiều (13:30 - 16:30)
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {afternoonSlots.map((slot) => {
                              const isSelected = isCurrentDoctorSelected && selectedSlot === slot.gio;
                              const isAvailable = slot.conTrong;

                              return (
                                <button
                                  key={slot.gio}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => handleSelectDoctorSlot(doc, slot)}
                                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm scale-105 ring-2 ring-blue-300 cursor-pointer'
                                      : isAvailable
                                      ? 'bg-white text-blue-700 border border-blue-300 hover:border-blue-600 hover:bg-blue-50 shadow-2xs hover:shadow-xs cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-45 cursor-not-allowed'
                                  }`}
                                  title={isAvailable ? `Chọn ca khám lúc ${slot.gio}` : 'Ca này đã kín lịch hoặc ngoài giờ trực'}
                                >
                                  <span>{slot.gio}</span>
                                  {isAvailable ? (
                                    <span className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                                      {isSelected ? '✓ Đang chọn' : 'Còn trống'}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-normal">
                                      {slot.daDat ? 'Đã kín' : 'Ngoài ca'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── BƯỚC 4: LÝ DO KHÁM ─── */}
          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              4. Lý do khám / Triệu chứng gặp phải *
            </label>
            <textarea
              rows={3}
              {...register('lyDoKham', { required: true })}
              placeholder="Mô tả ngắn gọn sức khỏe hiện tại của bạn hoặc nhu cầu thăm khám..."
              className="w-full rounded-2xl border border-gray-300 p-3.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ─── BẢNG QUY ĐỊNH & CHI PHÍ TẠM ỨNG ─── */}
          <div className="rounded-2xl bg-blue-50/80 p-5 border border-blue-200 space-y-2.5 text-xs text-gray-700">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-600" /> Tạm ứng giữ chỗ (1/5 phí khám):
              </span>
              <span className="text-blue-700 font-black text-lg">40.000 đ</span>
            </div>
            <div className="space-y-1.5 leading-relaxed">
              <p>• Phí khám niêm yết: <strong>200.000 đ</strong>. Quý khách thanh toán tạm ứng <strong>40.000 đ</strong> để xác nhận giữ ca khám.</p>
              <p>• <strong>Quy định đặt trước:</strong> Áp dụng đặt trước <strong>từ 2 đến 7 ngày</strong> tính từ ngày hiện tại.</p>
              <p>• <strong>Quy định hủy lịch:</strong> Phải hủy <strong>trước ngày khám ít nhất 1 ngày (24 tiếng)</strong> để được <strong>hoàn trả 100%</strong> tiền tạm ứng 40.000đ qua VNPay/MoMo.</p>
              <p className="flex items-start gap-1 text-blue-900 font-medium">
                <ShieldAlert className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Sau khi thanh toán thành công, hệ thống sẽ cấp ngay <strong>Phiếu hẹn khám điện tử kèm Mã QR Code</strong> và số thứ tự (STT) tiếp nhận.</span>
              </p>
            </div>
          </div>

          {/* NÚT XÁC NHẬN ĐẶT LỊCH */}
          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {hinhThuc === 'truc_tuyen' ? <Video className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            {submitting
              ? 'Đang khởi tạo lịch hẹn...'
              : !selectedSlot
              ? 'Vui lòng chọn 1 ca khám còn trống ở trên'
              : `Xác nhận & Tạm ứng 40.000đ [${selectedSlot} ngày ${selectedNgayHen}]`}
          </button>
        </form>
      </div>
    </>
  );
}
