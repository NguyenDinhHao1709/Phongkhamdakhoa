import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Calendar, Clock, CheckCircle, AlertCircle, User, Users,
  HeartPulse, ShieldAlert, CreditCard, Video, Building2, Wifi, MapPin,
  X, Timer, AlertTriangle, UserCheck, Stethoscope, ChevronRight, Check, Search
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import useAuthStore from '../../store/authStore';
import AppointmentTicketModal from '../../components/Appointment/AppointmentTicketModal';
import PaymentCountdownModal from '../../components/Appointment/PaymentCountdownModal';

const CHUYEN_KHOA_LIST = [
  'Nội tổng quát & Tim mạch',
  'Ngoại khoa',
  'Nhi khoa',
  'Tai Mũi Họng',
  'Cơ Xương Khớp & PHCN',
  'Da Liễu & Thẩm Mỹ',
  'Chẩn đoán hình ảnh & Xét nghiệm',
];

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
  const [searchDoctor, setSearchDoctor] = useState('');

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

        setDoctorsOnDate(doctors);

        if (doctors.length > 0) {
          const currentDoc = doctors.find((d) => String(d.id) === String(selectedBacSiId));
          if (currentDoc) {
            setSelectedDoctor(currentDoc);
            const slotObj = currentDoc.slots.find((s) => s.gio === selectedSlot && s.conTrong);
            if (!slotObj) {
              setSelectedSlot('');
            }
          } else {
            // Chưa chọn bác sĩ cụ thể, để bệnh nhân chủ động chọn từ danh sách
            setSelectedDoctor(null);
            setValue('bacSiId', '');
            setSelectedSlot('');
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

  // Chọn bác sĩ
  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setValue('bacSiId', String(doctor.id));
    // Nếu đổi bác sĩ khác, reset slot khám đã chọn
    if (selectedDoctor?.id !== doctor.id) {
      setSelectedSlot('');
    }
    setErrorMsg('');
  };

  // Chọn slot khám
  const handleSelectSlot = (slot) => {
    if (!slot.conTrong) return;
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

      // Mở modal đếm ngược thanh toán (200k nếu online, 40k nếu trực tiếp)
      setPaymentModal({
        lichHenId,
        maLichHen,
        soTien: hinhThuc === 'truc_tuyen' ? 200000 : 40000,
        isTelehealth: hinhThuc === 'truc_tuyen',
      });
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
          soTien={paymentModal.soTien || (hinhThuc === 'truc_tuyen' ? 200000 : 40000)}
          title={
            (paymentModal.isTelehealth ?? (hinhThuc === 'truc_tuyen'))
              ? 'Thanh toán phí tư vấn trực tuyến (Telehealth)'
              : 'Xác nhận thanh toán tạm ứng giữ chỗ'
          }
          isTelehealth={paymentModal.isTelehealth ?? (hinhThuc === 'truc_tuyen')}
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
            setCancelledMsg(`⚠ Lịch hẹn ${paymentModal.maLichHen} đã bị hủy do hết thời gian thanh toán (15 phút). Vui lòng đặt lịch lại.`);
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
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                Đặt Lịch Khám Bệnh Trực Tuyến
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                Chọn chuyên khoa → Chọn ngày → Chọn ca của bác sĩ trực.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] sm:text-xs font-bold w-fit">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              <span>Đặt trước 2 đến 7 ngày</span>
            </div>
          </div>
        </div>

        {/* ─── CHỌN ĐỐI TƯỢNG ĐẶT LỊCH: CHO TÔI VS CHO NGƯỜI KHÁC ─── */}
        <div className="bg-gray-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl flex items-center gap-1 sm:gap-1.5 border border-gray-200">
          <button
            type="button"
            onClick={() => handleSelectDoiTuong('cho_toi')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              doiTuong === 'cho_toi'
                ? 'bg-white text-blue-700 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
            <span>Đặt cho tôi</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectDoiTuong('nguoi_khac')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              doiTuong === 'nguoi_khac'
                ? 'bg-white text-emerald-700 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            <span>Đặt cho người thân</span>
          </button>
        </div>

        {/* Thông báo hủy / hết hạn */}
        {cancelledMsg && (
          <div className="flex items-start gap-2.5 rounded-xl sm:rounded-2xl bg-red-50 p-3 sm:p-4 text-xs sm:text-sm text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{cancelledMsg}</span>
          </div>
        )}

        {/* ─── HÌNH THỨC KHÁM: TRỰC TIẾP VS TELEHEALTH ─── */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
          <button
            type="button"
            onClick={() => handleSelectHinhThuc('truc_tiep')}
            className={`relative p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 sm:gap-3 cursor-pointer ${
              hinhThuc === 'truc_tiep' ? 'bg-blue-50/70 border-blue-600 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${hinhThuc === 'truc_tiep' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              {hinhThuc === 'truc_tiep' && (
                <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-white px-1.5 sm:px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden xs:inline">Đang chọn</span>
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">Khám trực tiếp</h3>
              <p className="hidden sm:block text-xs text-gray-500 mt-1 leading-relaxed">
                Khám lâm sàng tại phòng khám, đo sinh hiệu và thực hiện xét nghiệm/siêu âm cận lâm sàng.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 font-semibold truncate">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Tại phòng khám</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectHinhThuc('truc_tuyen')}
            className={`relative p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2 sm:gap-3 cursor-pointer ${
              hinhThuc === 'truc_tuyen' ? 'bg-blue-50/70 border-blue-600 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${hinhThuc === 'truc_tuyen' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              {hinhThuc === 'truc_tuyen' && (
                <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-white px-1.5 sm:px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden xs:inline">Đang chọn</span>
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">Tư vấn Online</h3>
              <p className="hidden sm:block text-xs text-gray-500 mt-1 leading-relaxed">
                Bác sĩ gọi Video trực tuyến từ xa, tư vấn phác đồ điều trị và cấp đơn thuốc điện tử tại nhà.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 font-semibold truncate">
              <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">Video Telehealth</span>
            </div>
          </button>
        </div>

        {/* Lỗi submit */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 rounded-xl sm:rounded-2xl bg-red-50 p-3 sm:p-4 text-xs sm:text-sm text-red-700 border border-red-200 animate-fade-in">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Form Đặt Lịch */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-3.5 sm:p-6 space-y-4 sm:space-y-6 shadow-2xs">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Bước 1: Chọn Chuyên Khoa */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-blue-600" />
                <span>1. Chọn Chuyên Khoa *</span>
              </label>
              <select
                {...register('chuyenKhoa', { required: true })}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 sm:p-3 text-xs sm:text-sm bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-semibold"
              >
                {CHUYEN_KHOA_LIST.map((ck) => (
                  <option key={ck} value={ck}>{ck}</option>
                ))}
              </select>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1">
                Lọc bác sĩ thuộc chuyên khoa mũi nhọn
              </p>
            </div>

            {/* Bước 2: Chọn Ngày Khám (2 - 7 ngày) */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>2. Chọn Ngày Khám *</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Đặt trước 2 - 7 ngày
                </span>
              </label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                {...register('ngayHen', { required: true })}
                className="w-full rounded-xl border border-gray-300 p-2.5 sm:p-3 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-semibold font-mono"
              />
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1">
                Thời gian: từ {minDate} đến {maxDate}
              </p>
            </div>
          </div>

          {/* ─── BƯỚC 3: CHỌN BÁC SĨ TRỰC ─── */}
          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                <span>3. Chọn Bác Sĩ Ngày {selectedNgayHen} *</span>
              </label>
              <span className="text-[11px] sm:text-xs text-gray-500">
                {doctorsOnDate.length > 0 ? `${doctorsOnDate.length} bác sĩ trực` : ''}
              </span>
            </div>

            {loadingDoctors ? (
              <div className="rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8 text-center text-gray-500">
                <div className="h-6 w-6 sm:h-7 sm:w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                <p className="text-xs font-semibold">Đang kiểm tra lịch trực bác sĩ ngày {selectedNgayHen}...</p>
              </div>
            ) : doctorsOnDate.length === 0 ? (
              <div className="rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-6 text-center text-amber-900 space-y-1.5">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 mx-auto" />
                <p className="text-xs sm:text-sm font-bold">Chưa có lịch trực cho chuyên khoa {selectedChuyenKhoa} vào ngày {selectedNgayHen}</p>
                <p className="text-[11px] sm:text-xs text-amber-800">
                  Quý khách vui lòng chọn ngày khám khác trong khoảng từ 2 đến 7 ngày tới, hoặc chọn chuyên khoa khác.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Thanh tìm kiếm tên bác sĩ */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchDoctor}
                    onChange={(e) => setSearchDoctor(e.target.value)}
                    placeholder="Tìm theo tên bác sĩ..."
                    className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 font-medium"
                  />
                  {searchDoctor && (
                    <button
                      type="button"
                      onClick={() => setSearchDoctor('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Danh sách bác sĩ dạng Card/List flexbox responsive - Đảm bảo mép phải không bị khuyết */}
                <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-2xs">
                  {doctorsOnDate.filter((doc) => {
                    if (!searchDoctor.trim()) return true;
                    const term = searchDoctor.toLowerCase().trim();
                    return (
                      doc.hoTen?.toLowerCase().includes(term) ||
                      doc.chuyenKhoa?.toLowerCase().includes(term) ||
                      doc.bangCap?.toLowerCase().includes(term)
                    );
                  }).length === 0 ? (
                    <div className="p-4 sm:p-6 text-center text-xs text-gray-500">
                      Không tìm thấy bác sĩ nào phù hợp với từ khóa "{searchDoctor}".
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {doctorsOnDate
                        .filter((doc) => {
                          if (!searchDoctor.trim()) return true;
                          const term = searchDoctor.toLowerCase().trim();
                          return (
                            doc.hoTen?.toLowerCase().includes(term) ||
                            doc.chuyenKhoa?.toLowerCase().includes(term) ||
                            doc.bangCap?.toLowerCase().includes(term)
                          );
                        })
                        .map((doc) => {
                          const isSelected = String(selectedDoctor?.id) === String(doc.id);

                          return (
                            <div
                              key={doc.id}
                              onClick={() => handleSelectDoctor(doc)}
                              className={`p-2.5 sm:p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/80 font-medium'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Thông tin bác sĩ: Avatar + Họ tên + Chuyên khoa */}
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs shrink-0 overflow-hidden border border-blue-200">
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
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-gray-900 text-xs sm:text-sm truncate flex items-center gap-1.5">
                                    <span className="truncate">{doc.hoTen}</span>
                                    {isSelected && (
                                      <span className="text-[9px] sm:text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                        Đang chọn
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] sm:text-xs text-blue-700 font-medium truncate">
                                    {doc.chuyenKhoa}
                                  </div>
                                  <div className="text-[10px] sm:text-[11px] text-gray-400 truncate">
                                    {doc.bangCap || 'Bác sĩ chuyên khoa'}
                                  </div>
                                </div>
                              </div>

                              {/* Nút Chọn / Đã chọn co giãn an toàn ở mép phải */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDoctor(doc);
                                }}
                                className={`shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-blue-600 text-blue-700 hover:bg-blue-50'
                                }`}
                              >
                                {isSelected ? '✓ Đã chọn' : 'Chọn'}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── BƯỚC 4: CHỌN GIỜ KHÁM CỦA BÁC SĨ ĐÃ CHỌN ─── */}
          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  4. Chọn Giờ Khám {selectedDoctor ? `(${selectedDoctor.hoTen})` : ''} *
                </span>
              </label>
              {selectedDoctor && (
                <span className="text-[11px] sm:text-xs text-gray-500">
                  Sáng: 08:00 - 11:00 • Chiều: 13:30 - 16:30
                </span>
              )}
            </div>

            {!selectedDoctor ? (
              <div className="rounded-xl sm:rounded-2xl bg-blue-50/50 border border-dashed border-blue-200 p-4 sm:p-6 text-center text-slate-600">
                <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-blue-900">
                  Vui lòng chọn một bác sĩ ở Bước 3 để hiển thị các ca khám khả dụng.
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                  Các ca khám sáng & chiều sẽ hiển thị ngay tại đây.
                </p>
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border border-blue-200 bg-white p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs animate-fade-in">
                {/* Doctor mini banner */}
                <div className="flex flex-col xs:flex-row xs:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-800">
                      Bác sĩ: <span className="text-blue-700 font-extrabold">{selectedDoctor.hoTen}</span>
                    </span>
                  </div>
                  {selectedSlot && (
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1 w-fit">
                      <Check className="h-3.5 w-3.5" /> Ca khám: {selectedSlot}
                    </span>
                  )}
                </div>

                {/* Ca Sáng */}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Ca Sáng (08:00 - 11:00)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {selectedDoctor.slots
                      .filter((s) => s.ca === 'sang')
                      .map((slot) => {
                        const isSelected = selectedSlot === slot.gio;
                        const isAvailable = slot.conTrong;

                        return (
                          <button
                            key={slot.gio}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleSelectSlot(slot)}
                            className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm ring-2 ring-blue-300 cursor-pointer'
                                : isAvailable
                                ? 'bg-white text-blue-700 border border-blue-300 hover:border-blue-600 hover:bg-blue-50 shadow-2xs cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-45 cursor-not-allowed'
                            }`}
                            title={isAvailable ? `Chọn ca khám lúc ${slot.gio}` : 'Ca này đã kín lịch hoặc ngoài ca trực'}
                          >
                            <span className="text-xs sm:text-sm font-extrabold">{slot.gio}</span>
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
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Ca Chiều (13:30 - 16:30)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    {selectedDoctor.slots
                      .filter((s) => s.ca === 'chieu')
                      .map((slot) => {
                        const isSelected = selectedSlot === slot.gio;
                        const isAvailable = slot.conTrong;

                        return (
                          <button
                            key={slot.gio}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleSelectSlot(slot)}
                            className={`py-2 px-1.5 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm ring-2 ring-blue-300 cursor-pointer'
                                : isAvailable
                                ? 'bg-white text-blue-700 border border-blue-300 hover:border-blue-600 hover:bg-blue-50 shadow-2xs cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through opacity-45 cursor-not-allowed'
                            }`}
                            title={isAvailable ? `Chọn ca khám lúc ${slot.gio}` : 'Ca này đã kín lịch hoặc ngoài ca trực'}
                          >
                            <span className="text-xs sm:text-sm font-extrabold">{slot.gio}</span>
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
            )}
          </div>

          {/* ─── BƯỚC 5: LÝ DO KHÁM ─── */}
          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5">
              5. Lý do khám / Triệu chứng gặp phải *
            </label>
            <textarea
              rows={2}
              {...register('lyDoKham', { required: true })}
              placeholder="Mô tả ngắn gọn sức khỏe hiện tại hoặc triệu chứng..."
              className="w-full rounded-xl sm:rounded-2xl border border-gray-300 p-2.5 sm:p-3.5 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ─── BẢNG QUY ĐỊNH & CHI PHÍ ─── */}
          {hinhThuc === 'truc_tuyen' ? (
            <div className="rounded-xl sm:rounded-2xl bg-indigo-50/80 p-3.5 sm:p-5 border border-indigo-200 space-y-2 text-xs text-gray-700">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2.5">
                <span className="font-extrabold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-indigo-600" /> Phí tư vấn trực tuyến (Telehealth):
                </span>
                <span className="text-indigo-700 font-black text-base sm:text-lg">200.000 đ</span>
              </div>
              <div className="space-y-1.5 leading-relaxed text-[11px] sm:text-xs">
                <p>• Phí tư vấn online: <strong>200.000 đ</strong> (thanh toán 100% trước khi tham gia cuộc gọi video).</p>
                <p>• <strong>Quy định hủy lịch:</strong> Hủy <strong>trước 24 tiếng</strong> được <strong>hoàn trả 100%</strong> phí tư vấn qua chuyển khoản.</p>
                <p className="flex items-start gap-1 text-indigo-900 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span>Thanh toán thành công sẽ cấp ngay <strong>Phòng khám Video trực tuyến</strong> cùng Bác sĩ đúng giờ hẹn.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl sm:rounded-2xl bg-blue-50/80 p-3.5 sm:p-5 border border-blue-200 space-y-2 text-xs text-gray-700">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
                <span className="font-extrabold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-blue-600" /> Tạm ứng giữ chỗ (1/5 phí):
                </span>
                <span className="text-blue-700 font-black text-base sm:text-lg">40.000 đ</span>
              </div>
              <div className="space-y-1.5 leading-relaxed text-[11px] sm:text-xs">
                <p>• Phí khám niêm yết: <strong>200.000 đ</strong>. Tạm ứng <strong>40.000 đ</strong> để xác nhận giữ chỗ.</p>
                <p>• <strong>Quy định hủy lịch:</strong> Hủy <strong>trước 24 tiếng</strong> được <strong>hoàn trả 100%</strong> tiền tạm ứng qua VNPay/MoMo.</p>
                <p className="flex items-start gap-1 text-blue-900 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Thanh toán thành công sẽ cấp ngay <strong>Phiếu hẹn điện tử kèm Mã QR Code</strong> và số thứ tự khám.</span>
                </p>
              </div>
            </div>
          )}

          {/* NÚT XÁC NHẬN ĐẶT LỊCH */}
          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className={`w-full ${hinhThuc === 'truc_tuyen' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60 text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
          >
            {hinhThuc === 'truc_tuyen' ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />}
            {submitting
              ? 'Đang khởi tạo lịch hẹn...'
              : !selectedSlot
              ? 'Vui lòng chọn 1 ca khám còn trống ở trên'
              : hinhThuc === 'truc_tuyen'
              ? `Xác nhận & Thanh toán 200.000đ [${selectedSlot} ngày ${selectedNgayHen}]`
              : `Xác nhận & Tạm ứng 40.000đ [${selectedSlot} ngày ${selectedNgayHen}]`}
          </button>
        </form>
      </div>
    </>
  );
}
