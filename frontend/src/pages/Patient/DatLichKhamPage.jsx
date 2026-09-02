import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, Stethoscope, CheckCircle, AlertCircle, User, HeartPulse, ShieldAlert, CreditCard } from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import useAuthStore from '../../store/authStore';

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

export default function DatLichKhamPage() {
  const { user } = useAuthStore();
  const [bacSiList, setBacSiList] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('08:00');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ràng buộc ngày: Tối đa 30 ngày từ hôm nay
  const today = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDate = maxDateObj.toISOString().split('T')[0];

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      chuyenKhoa: '',
      bacSiId: '',
      ngayHen: today,
      lyDoKham: '',
    },
  });

  const selectedChuyenKhoa = watch('chuyenKhoa');
  const selectedNgayHen = watch('ngayHen');

  useEffect(() => {
    fetchBacSi();
  }, []);

  const fetchBacSi = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) {
        setBacSiList(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Lọc danh sách Bác sĩ theo Chuyên khoa đã chọn
  const filteredBacSi = selectedChuyenKhoa
    ? bacSiList.filter((bs) => (bs.chuyenKhoa || '').toLowerCase().includes(selectedChuyenKhoa.toLowerCase()))
    : bacSiList;

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validation: Kiểm tra giờ hẹn tối thiểu trước 4 tiếng
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
        benhNhanId: user?.benhNhanId || 1,
        bacSiId: data.bacSiId ? Number(data.bacSiId) : null,
        ngayHen: data.ngayHen,
        gioHen: selectedSlot,
        lyDoKham: (data.chuyenKhoa ? `[Chuyên khoa: ${data.chuyenKhoa}] ` : '') + (data.lyDoKham || ''),
      };

      const res = await apiPost('/lich-hen', payload);
      setSuccessMsg('Đặt lịch khám thành công! Mã lịch hẹn của bạn là: ' + (res.data?.maLichHen || 'LH2026') + '. Vui lòng tạm ứng 40.000đ (1/5 phí khám) để xác nhận lịch.');
      reset({
        chuyenKhoa: '',
        bacSiId: '',
        ngayHen: today,
        lyDoKham: '',
      });
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lịch khám');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Đặt lịch khám trực tuyến</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chọn chuyên khoa, bác sĩ và khung giờ khám chủ động cho bạn (Đặt trước 4 tiếng - 30 ngày)
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-light p-4 text-sm text-success-main border border-success-main/30 animate-fade-in">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-success-main" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-danger-50 p-4 text-sm text-danger-700 border border-danger-200 animate-fade-in">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-danger-main" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
        {/* Bước 1: Chọn Chuyên khoa & Chọn Bác sĩ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="h-4 w-4 text-primary-600" /> 1. Chọn Chuyên khoa khám *
            </label>
            <select
              {...register('chuyenKhoa')}
              onChange={(e) => {
                setValue('chuyenKhoa', e.target.value);
                setValue('bacSiId', ''); // Reset chọn bác sĩ khi đổi chuyên khoa
              }}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm bg-white focus:ring-2 focus:ring-primary-500 font-medium text-gray-900"
            >
              <option value="">-- Tất cả Chuyên khoa --</option>
              {CHUYEN_KHOA_LIST.map((ck) => (
                <option key={ck} value={ck}>
                  {ck}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary-600" /> 2. Chọn Bác sĩ (Tùy chọn)
            </label>
            <select
              {...register('bacSiId')}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm bg-white focus:ring-2 focus:ring-primary-500 font-medium text-gray-900"
            >
              <option value="">
                -- Khám với Bác sĩ bất kỳ {selectedChuyenKhoa ? `(${selectedChuyenKhoa})` : ''} --
              </option>
              {filteredBacSi.map((bs) => (
                <option key={bs.id} value={bs.id}>
                  {bs.hoTen} ({bs.chuyenKhoa || 'Đa khoa'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bước 2: Chọn Ngày khám (Min: Hôm nay, Max: 30 ngày) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary-600" /> 3. Chọn Ngày khám * (Giới hạn trong 30 ngày)
          </label>
          <input
            type="date"
            min={today}
            max={maxDate}
            {...register('ngayHen', { required: true })}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-primary-500 font-medium text-gray-900"
          />
        </div>

        {/* Bước 3: Chọn Khung giờ khám */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-600" /> 4. Chọn Khung giờ khám khả dụng *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {SLOTS.map((slot) => {
              // Check if slot is less than 4 hours for today
              const isToday = selectedNgayHen === today;
              const slotTime = new Date(`${today}T${slot}:00`);
              const isLessThan4Hours = isToday && (slotTime.getTime() - new Date().getTime()) < (4 * 3600 * 1000);

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isLessThan4Hours}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                    isLessThan4Hours
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      : selectedSlot === slot
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm ring-2 ring-primary-300'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">* Khung giờ gạch ngang không thể đặt do dưới 4 tiếng so với giờ hiện tại.</p>
        </div>

        {/* Lý do khám */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Lý do khám / Triệu chứng gặp phải *
          </label>
          <textarea
            rows={3}
            {...register('lyDoKham', { required: true })}
            placeholder="Mô tả ngắn gọn sức khỏe hiện tại của bạn..."
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        {/* Quy định Tạm ứng 1/5 & Ranh giới Hủy 2 tiếng */}
        <div className="rounded-2xl bg-primary-50/70 p-5 border border-primary-200 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-primary-200/80 pb-2">
            <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-primary-600" /> Tạm ứng phí khám để xác nhận (1/5):
            </span>
            <span className="text-primary-700 font-extrabold text-base">40.000 đ</span>
          </div>
          <div className="space-y-1.5 text-gray-700 leading-relaxed">
            <p>• Phí khám niêm yết: <strong>200.000 đ</strong>. Yêu cầu tạm ứng <strong>40.000 đ (1/5)</strong> để hoàn tất giữ chỗ.</p>
            <p>• <strong>Giới hạn thời gian đặt:</strong> Cho phép đặt trước tối đa 30 ngày và tối thiểu trước 4 tiếng.</p>
            <p className="flex items-start gap-1 text-primary-900 font-medium">
              <ShieldAlert className="h-4 w-4 text-primary-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Ranh giới Hủy lịch 2 tiếng:</strong> Nếu bạn hủy lịch hẹn trước giờ khám <strong>trên 2 tiếng</strong>, hệ thống tự động hoàn tiền 100% tạm ứng (40.000đ) qua VNPay/MoMo. Hủy dưới 2 tiếng hoặc không đến khám sẽ không được hoàn cọc theo quy định.
              </span>
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <MedButton
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            leftIcon={<Calendar className="h-5 w-5" />}
          >
            Xác nhận & Thanh toán Tạm ứng (40.000đ)
          </MedButton>
        </div>
      </form>
    </div>
  );
}
