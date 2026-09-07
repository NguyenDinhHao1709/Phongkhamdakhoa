import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Calendar, Clock, Stethoscope, CheckCircle, AlertCircle, User,
  HeartPulse, ShieldAlert, CreditCard, Video, Building2, Wifi, MapPin,
  X, Phone, Mail, UserCheck, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';

const SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

const CHUYEN_KHOA_LIST = [
  'Nội tổng quát',
  'Ngoại khoa',
  'Nhi khoa',
  'Tai Mũi Họng',
  'Tim mạch',
  'Cơ Xương Khớp',
  'Răng Hàm Mặt',
  'Mắt',
  'Chẩn đoán hình ảnh & Xét nghiệm',
];

export default function PublicDatLichModal({
  isOpen = true,
  onClose,
  initialHinhThuc = 'truc_tiep',
  initialDoctor = null
}) {
  const navigate = useNavigate();
  const [hinhThuc, setHinhThuc] = useState(initialHinhThuc);
  const [bacSiList, setBacSiList] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('08:00');
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Ràng buộc ngày: Tối đa 30 ngày từ hôm nay
  const today = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      hoTen: '',
      soDienThoai: '',
      email: '',
      ngaySinh: '',
      gioiTinh: 'nam',
      chuyenKhoa: initialDoctor?.chuyenKhoa || '',
      bacSiId: initialDoctor?.id ? String(initialDoctor.id) : '',
      ngayHen: today,
      lyDoKham: '',
    },
  });

  const selectedChuyenKhoa = watch('chuyenKhoa');
  const selectedNgayHen = watch('ngayHen');

  useEffect(() => {
    if (initialHinhThuc) setHinhThuc(initialHinhThuc);
  }, [initialHinhThuc]);

  useEffect(() => {
    fetchBacSi();
  }, []);

  const fetchBacSi = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) setBacSiList(res.data);
    } catch (err) {
      console.error('Lỗi tải danh sách bác sĩ:', err);
    }
  };

  const filteredBacSi = selectedChuyenKhoa
    ? bacSiList.filter((bs) => (bs.chuyenKhoa || '').toLowerCase().includes(selectedChuyenKhoa.toLowerCase()))
    : bacSiList;

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMsg('');

    // Kiểm tra giờ hẹn tối thiểu trước 4 tiếng
    const now = new Date();
    const bookingDateTime = new Date(`${data.ngayHen}T${selectedSlot}:00`);
    const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 4) {
      setErrorMsg('Theo quy định, bạn phải đặt lịch hẹn trước giờ khám tối thiểu 4 tiếng.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        hoTen: data.hoTen.trim(),
        soDienThoai: data.soDienThoai.trim(),
        email: data.email?.trim() || undefined,
        ngaySinh: data.ngaySinh || undefined,
        gioiTinh: data.gioiTinh || undefined,
        bacSiId: data.bacSiId ? Number(data.bacSiId) : undefined,
        ngayHen: data.ngayHen,
        gioHen: selectedSlot,
        hinhThuc: hinhThuc,
        lyDoKham: (data.chuyenKhoa ? `[Chuyên khoa: ${data.chuyenKhoa}] ` : '') + (data.lyDoKham || ''),
      };

      const res = await apiPost('/lich-hen/dat-lich-khach', payload);
      setBookingSuccess({
        ...res.data,
        hoTen: data.hoTen,
        soDienThoai: data.soDienThoai,
        ngayHen: data.ngayHen,
        gioHen: selectedSlot,
        hinhThuc: hinhThuc,
        chuyenKhoa: data.chuyenKhoa,
        bacSiName: bacSiList.find((b) => String(b.id) === String(data.bacSiId))?.hoTen || 'Bác sĩ theo phân công chuyên khoa',
      });
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lịch khám');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-bold">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Đặt lịch khám nhanh (Dành cho khách vãng lai)
              </h2>
              <p className="text-xs text-gray-500">
                Không bắt buộc đăng nhập trước — Giữ chỗ khám & Nhận mã hẹn tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {bookingSuccess ? (
            /* MÀN HÌNH ĐẶT LỊCH THÀNH CÔNG */
            <div className="space-y-6 py-4 text-center animate-fade-in">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-success-main border-2 border-success-main/30">
                <CheckCircle className="h-10 w-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-success-main bg-success-light px-3 py-1 rounded-full border border-success-main/20">
                  Đặt lịch thành công
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-3">
                  Cảm ơn quý khách {bookingSuccess.hoTen}!
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mã lịch hẹn của quý khách đã được tạo thành công trên hệ thống.
                </p>
              </div>

              {/* Chi tiết lịch hẹn */}
              <div className="max-w-md mx-auto rounded-2xl bg-gray-50 p-5 border border-gray-200 text-left space-y-3 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-500">Mã lịch hẹn:</span>
                  <span className="font-mono font-extrabold text-lg text-primary-700">
                    {bookingSuccess.maLichHen || 'LH2026'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Hình thức khám:</span>
                  <span className="font-bold text-gray-900">
                    {bookingSuccess.hinhThuc === 'truc_tuyen'
                      ? '🎥 Khám tư vấn Online (Telehealth)'
                      : '🏥 Khám trực tiếp tại phòng khám'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Thời gian khám:</span>
                  <span className="font-bold text-gray-900">
                    {bookingSuccess.gioHen} ngày {bookingSuccess.ngayHen}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Bác sĩ phụ trách:</span>
                  <span className="font-medium text-gray-800">{bookingSuccess.bacSiName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số điện thoại:</span>
                  <span className="font-medium text-gray-800">{bookingSuccess.soDienThoai}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-semibold">Tạm ứng xác nhận (1/5):</span>
                  <span className="font-extrabold text-primary-700 text-base">40.000 đ</span>
                </div>
              </div>

              {/* Hướng dẫn tiếp theo */}
              <div className="max-w-md mx-auto rounded-xl bg-blue-50 p-4 border border-blue-200 text-xs text-blue-900 text-left space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-sm text-blue-950">
                  <ShieldAlert className="h-4 w-4 text-primary-600" /> Hướng dẫn tiếp theo:
                </p>
                {bookingSuccess.hinhThuc === 'truc_tuyen' ? (
                  <p>
                    • Bác sĩ sẽ gọi tư vấn trực tuyến qua hệ thống tại đúng giờ hẹn. Bạn có thể đăng ký tài khoản bằng số điện thoại <strong>{bookingSuccess.soDienThoai}</strong> để nhận đơn thuốc điện tử và hồ sơ bệnh án.
                  </p>
                ) : (
                  <p>
                    • Quý khách vui lòng có mặt trước giờ khám 15 phút tại Quầy Tiếp Đón (123 Đường Y Học, Q1, TP.HCM), đọc <strong>Mã lịch hẹn</strong> hoặc <strong>Số điện thoại</strong> để nhân viên tiếp đón đo sinh hiệu.
                  </p>
                )}
                <p>• Chính sách hoàn cọc: Hủy trước 2 tiếng được hoàn lại 100% số tiền tạm ứng qua cổng thanh toán.</p>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <MedButton
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    navigate('/register');
                  }}
                  leftIcon={<UserCheck className="h-4 w-4" />}
                >
                  Tạo tài khoản để theo dõi lịch
                </MedButton>
                <MedButton variant="secondary" size="md" onClick={onClose}>
                  Đóng cửa sổ
                </MedButton>
              </div>
            </div>
          ) : (
            /* FORM ĐẶT LỊCH CHO KHÁCH CHƯA CÓ TÀI KHOẢN */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* ─── CHỌN HÌNH THỨC: TRỰC TIẾP VS TƯ VẤN ONLINE ─── */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  1. Chọn Hình thức khám bệnh:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setHinhThuc('truc_tiep')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                      hinhThuc === 'truc_tiep'
                        ? 'bg-blue-50/80 border-blue-600 shadow-sm ring-2 ring-blue-200'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2.5 rounded-xl ${hinhThuc === 'truc_tiep' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      {hinhThuc === 'truc_tiep' && (
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Đã chọn
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">🏥 Khám trực tiếp tại phòng khám</h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Khám lâm sàng với bác sĩ chuyên khoa, đo sinh hiệu và xét nghiệm tại cơ sở phòng khám.
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[11px] text-blue-700 font-medium">
                      <MapPin className="h-3 w-3" /> 123 Đường Y Học, Q.1, TP.HCM
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHinhThuc('truc_tuyen')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col justify-between ${
                      hinhThuc === 'truc_tuyen'
                        ? 'bg-purple-50/80 border-purple-600 shadow-sm ring-2 ring-purple-200'
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2.5 rounded-xl ${hinhThuc === 'truc_tuyen' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}>
                        <Video className="h-5 w-5" />
                      </div>
                      {hinhThuc === 'truc_tuyen' && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Đã chọn
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">🎥 Khám tư vấn Online (Telehealth)</h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Bác sĩ gọi Video Call từ xa, chẩn đoán triệu chứng, tư vấn điều trị và gửi đơn thuốc điện tử.
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[11px] text-purple-700 font-medium">
                      <Wifi className="h-3 w-3" /> Cuộc gọi Video WebRTC trực tiếp
                    </div>
                  </button>
                </div>
              </div>

              {/* ─── THÔNG TIN KHÁCH HÀNG ─── */}
              <div className="rounded-2xl bg-gray-50/80 p-4 border border-gray-200 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary-600" /> 2. Thông tin bệnh nhân:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Họ và tên bệnh nhân *
                    </label>
                    <input
                      type="text"
                      {...register('hoTen', { required: true })}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      type="tel"
                      {...register('soDienThoai', { required: true })}
                      placeholder="0912345678"
                      className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email nhận xác nhận
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        {...register('ngaySinh')}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Giới tính
                      </label>
                      <select
                        {...register('gioiTinh')}
                        className="w-full rounded-xl border border-gray-300 p-2.5 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="nam">Nam</option>
                        <option value="nu">Nữ</option>
                        <option value="khac">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── CHỌN CHUYÊN KHOA & BÁC SĨ ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <HeartPulse className="h-3.5 w-3.5 text-primary-600" /> 3. Chuyên khoa khám *
                  </label>
                  <select
                    {...register('chuyenKhoa')}
                    onChange={(e) => {
                      setValue('chuyenKhoa', e.target.value);
                      setValue('bacSiId', '');
                    }}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">-- Tất cả Chuyên khoa --</option>
                    {CHUYEN_KHOA_LIST.map((ck) => (
                      <option key={ck} value={ck}>{ck}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5 text-primary-600" /> 4. Chọn Bác sĩ (Tùy chọn)
                  </label>
                  <select
                    {...register('bacSiId')}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">-- Khám với Bác sĩ trực phòng khám --</option>
                    {filteredBacSi.map((bs) => (
                      <option key={bs.id} value={bs.id}>
                        {bs.hoTen} ({bs.chuyenKhoa || 'Đa khoa'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─── CHỌN NGÀY VÀ GIỜ HẸN ─── */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-600" /> 5. Chọn Ngày khám * (Đặt trước tối đa 30 ngày)
                </label>
                <input
                  type="date"
                  min={today}
                  max={maxDate}
                  {...register('ngayHen', { required: true })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary-600" /> 6. Khung giờ khám * (Tối thiểu trước 4 tiếng)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {SLOTS.map((slot) => {
                    const isToday = selectedNgayHen === today;
                    const slotTime = new Date(`${today}T${slot}:00`);
                    const isLessThan4Hours = isToday && (slotTime.getTime() - new Date().getTime()) < (4 * 3600 * 1000);

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isLessThan4Hours}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                          isLessThan4Hours
                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed line-through'
                            : selectedSlot === slot
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-300'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── LÝ DO KHÁM ─── */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  7. Triệu chứng / Lý do khám *
                </label>
                <textarea
                  rows={2}
                  {...register('lyDoKham', { required: true })}
                  placeholder="Mô tả triệu chứng sức khỏe hiện tại của bạn..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              {/* Ràng buộc tạm ứng */}
              <div className="rounded-2xl bg-primary-50/70 p-4 border border-primary-200 text-xs text-gray-700 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-gray-900 border-b border-primary-200/80 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary-600" /> Tạm ứng phí giữ lịch khám (1/5):
                  </span>
                  <span className="text-primary-700 font-extrabold text-sm">40.000 đ</span>
                </div>
                <p>• Phí khám niêm yết: <strong>200.000 đ</strong>. Tạm ứng <strong>40.000 đ</strong> để xác nhận lịch hẹn.</p>
                <p>• <strong>Hủy lịch trước &gt; 2 tiếng:</strong> Tự động hoàn lại 100% tiền cọc (40.000đ). Hủy dưới 2 tiếng hoặc không đến khám sẽ không được hoàn cọc.</p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs text-danger-700 border border-danger-200 animate-fade-in">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger-main" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nút gửi */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <MedButton type="button" variant="secondary" onClick={onClose}>
                  Hủy bỏ
                </MedButton>
                <MedButton
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  leftIcon={hinhThuc === 'truc_tuyen' ? <Video className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                  className={hinhThuc === 'truc_tuyen' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {hinhThuc === 'truc_tuyen'
                    ? 'Xác nhận Đặt khám Tư vấn Online'
                    : 'Xác nhận Đặt khám Trực tiếp'}
                </MedButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

