import { useState, useEffect } from 'react';
import {
  Calendar, Clock, AlertCircle, Stethoscope, CheckCircle2,
  X, Building2, ChevronRight, Check, RefreshCw, AlertTriangle, Search, Video
} from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { formatDate } from '../../utils/formatDate';

export default function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onSuccess
}) {
  const [newDate, setNewDate] = useState('');
  const [hinhThuc, setHinhThuc] = useState(appointment?.hinhThuc || 'truc_tiep');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsOnDate, setDoctorsOnDate] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchDoctor, setSearchDoctor] = useState('');

  // Tính ngày min (hôm nay + 2 ngày) và max (hôm nay + 7 ngày) giống như khi đặt lịch mới
  const today = new Date();
  const minDateObj = new Date(today);
  minDateObj.setDate(minDateObj.getDate() + 2); // Tối thiểu 2 ngày
  const minDate = minDateObj.toISOString().split('T')[0];

  const maxDateObj = new Date(today);
  maxDateObj.setDate(maxDateObj.getDate() + 7); // Tối đa 7 ngày
  const maxDate = maxDateObj.toISOString().split('T')[0];

  // Khởi tạo ngày và hình thức khi mở modal
  useEffect(() => {
    if (isOpen && appointment) {
      setErrorMsg('');
      setSelectedDoctor(null);
      setSelectedSlot('');
      setReason('');
      setSearchDoctor('');
      setHinhThuc(appointment.hinhThuc || 'truc_tiep');
      // Gợi ý ngày hẹn cũ nếu nằm trong khung 2-7 ngày, ngược lại lấy minDate
      const oldDate = appointment.ngayHen ? String(appointment.ngayHen).substring(0, 10) : '';
      if (oldDate && oldDate >= minDate && oldDate <= maxDate) {
        setNewDate(oldDate);
      } else {
        setNewDate(minDate);
      }
    }
  }, [isOpen, appointment]);

  // Tải danh sách bác sĩ trực khi đổi ngày
  useEffect(() => {
    if (!isOpen || !newDate || !appointment) return;

    let isMounted = true;
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      setErrorMsg('');
      try {
        const chuyenKhoa = appointment.chuyenKhoa || appointment.bacSi?.chuyenKhoa || '';
        const res = await apiGet('/lich-hen/bac-si-ca-trong', {
          ngay: newDate,
          chuyenKhoa,
        });

        if (!isMounted) return;
        const docs = res.data || [];
        setDoctorsOnDate(docs);

        // Nếu bác sĩ cũ vẫn trực ngày này thì ưu tiên chọn, nếu không thì null
        const currentDocId = appointment.bacSiId || appointment.bacSi?.id;
        const matched = docs.find((d) => Number(d.id) === Number(currentDocId));
        if (matched) {
          setSelectedDoctor(matched);
        } else {
          setSelectedDoctor(null);
        }
        setSelectedSlot('');
      } catch (err) {
        console.error('Lỗi tải bác sĩ trực:', err);
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    };

    fetchDoctors();
    return () => { isMounted = false; };
  }, [isOpen, newDate, appointment]);

  if (!isOpen || !appointment) return null;

  const currentDoctorName = appointment.bacSi?.nhanVien?.hoTen || appointment.bacSi?.hoTen || 'Đang chờ phân công';

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    if (selectedDoctor?.id !== doc.id) {
      setSelectedSlot('');
    }
    setErrorMsg('');
  };

  const handleSelectSlot = (slot) => {
    if (!slot.conTrong) return;
    setSelectedSlot(slot.gio);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setErrorMsg('Vui lòng chọn ngày khám mới.');
      return;
    }
    if (!selectedDoctor) {
      setErrorMsg('Vui lòng chọn một bác sĩ khám.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Vui lòng chọn khung giờ khám còn trống.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        ngayHen: newDate,
        gioHen: selectedSlot,
        bacSiId: selectedDoctor.id,
        hinhThuc: hinhThuc,
        lyDoKham: reason.trim() ? `${appointment.lyDoKham || ''} [Lý do đổi lịch: ${reason.trim()}]`.trim() : undefined,
      };

      const res = await apiPatch(`/lich-hen/${appointment.id}/chinh-sua`, payload);
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đổi lịch hẹn.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-4 sm:my-6 animate-fade-in flex flex-col">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-primary-600 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">Đổi & Chỉnh Sửa Lịch Khám</h2>
              <p className="text-xs text-blue-100">
                Mã lịch hẹn: <span className="font-mono font-bold text-white">{appointment.maLichHen}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-100 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thông tin lịch khám hiện tại & Quy định 24h */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-gray-500">Lịch khám hiện tại:</span>
              <span className="font-bold text-gray-900">
                {appointment.gioHen} • Ngày {formatDate(appointment.ngayHen)}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-gray-500">Hình thức hiện tại:</span>
              <span className="font-semibold text-purple-700">
                {appointment.hinhThuc === 'truc_tuyen' ? '💻 Tư vấn Online (Telehealth Video Call)' : '🏥 Khám trực tiếp tại phòng khám'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <span className="text-gray-500">Bác sĩ phụ trách:</span>
              <span className="font-semibold text-blue-700">{currentDoctorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 pt-0.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Khoản tạm ứng 40.000đ được bảo lưu nguyên vẹn sang lịch hẹn mới.</span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-700 border border-red-200 animate-fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Chọn Hình Thức Khám */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-blue-600" />
                  <span>1. Chọn Hình Thức Khám *</span>
                </span>
                <span className="text-[11px] text-gray-500 font-normal">
                  Có thể đổi giữa Khám tại chỗ và Khám Online
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setHinhThuc('truc_tiep')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    hinhThuc === 'truc_tiep'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${hinhThuc === 'truc_tiep' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span>Khám trực tiếp tại PK</span>
                      {hinhThuc === 'truc_tiep' && (
                        <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-semibold">Đang chọn</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Đến trực tiếp cơ sở phòng khám (123 Đường Y Học)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHinhThuc('truc_tuyen')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    hinhThuc === 'truc_tuyen'
                      ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-300'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Video className={`h-5 w-5 mt-0.5 flex-shrink-0 ${hinhThuc === 'truc_tuyen' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <span>Tư vấn Online (Telehealth)</span>
                      {hinhThuc === 'truc_tuyen' && (
                        <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-semibold">Đang chọn</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Bác sĩ gọi Video trực tuyến từ xa qua hệ thống</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Bước 2: Chọn Ngày Khám Mới */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>2. Chọn Ngày Khám Mới *</span>
                </span>
                <span className="text-[11px] font-normal text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Từ 2 đến 7 ngày (tính từ hôm nay)
                </span>
              </label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-gray-900 font-semibold font-mono"
              />
            </div>

            {/* Bước 3: Danh sách bác sĩ trực ngày đó */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <span>3. Chọn Bác Sĩ Trực Ngày {newDate ? formatDate(newDate) : ''} *</span>
                </label>
                <span className="text-xs text-gray-500">
                  {doctorsOnDate.length > 0 ? `${doctorsOnDate.length} bác sĩ trực` : ''}
                </span>
              </div>

              {loadingDoctors ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-gray-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-xs">Đang kiểm tra lịch trực bác sĩ...</p>
                </div>
              ) : doctorsOnDate.length === 0 ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center text-amber-900 text-xs">
                  Không có bác sĩ trực chuyên khoa này vào ngày {formatDate(newDate)}. Vui lòng chọn ngày khác.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchDoctor}
                      onChange={(e) => setSearchDoctor(e.target.value)}
                      placeholder="Tìm kiếm theo tên bác sĩ..."
                      className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 font-medium"
                    />
                    {searchDoctor && (
                      <button
                        type="button"
                        onClick={() => setSearchDoctor('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white max-h-56 overflow-y-auto">
                    {doctorsOnDate.filter((doc) => {
                      if (!searchDoctor.trim()) return true;
                      const term = searchDoctor.toLowerCase().trim();
                      return doc.hoTen?.toLowerCase().includes(term) || doc.chuyenKhoa?.toLowerCase().includes(term);
                    }).length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">
                        Không tìm thấy bác sĩ nào phù hợp với từ khóa "{searchDoctor}".
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Bác Sĩ</th>
                            <th className="py-2.5 px-3">Khoa</th>
                            <th className="py-2.5 px-3 text-right w-20">Chọn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {doctorsOnDate
                            .filter((doc) => {
                              if (!searchDoctor.trim()) return true;
                              const term = searchDoctor.toLowerCase().trim();
                              return doc.hoTen?.toLowerCase().includes(term) || doc.chuyenKhoa?.toLowerCase().includes(term);
                            })
                            .map((doc) => {
                              const isSelected = String(selectedDoctor?.id) === String(doc.id);
                              return (
                                <tr
                                  key={doc.id}
                                  onClick={() => handleSelectDoctor(doc)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-gray-900 text-xs">{doc.hoTen}</div>
                                    <div className="text-[10px] text-gray-500">{doc.bangCap || 'Bác sĩ chuyên khoa'}</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-700">
                                    {doc.chuyenKhoa}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectDoctor(doc);
                                      }}
                                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        isSelected
                                          ? 'bg-blue-600 text-white'
                                          : 'border border-blue-600 text-blue-700 hover:bg-blue-50'
                                      }`}
                                    >
                                      {isSelected ? 'Đã chọn' : 'Chọn'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bước 3: Chọn giờ khám của bác sĩ đã chọn */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>3. Chọn Giờ Khám Mới {selectedDoctor ? `(${selectedDoctor.hoTen})` : ''} *</span>
              </label>

              {!selectedDoctor ? (
                <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 p-4 text-center text-xs text-gray-500">
                  Vui lòng chọn bác sĩ ở Bước 2 để hiển thị các khung giờ khám khả dụng.
                </div>
              ) : (
                <div className="rounded-2xl border border-blue-200 bg-white p-4 space-y-3">
                  {/* Ca Sáng */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Ca Sáng (08:00 - 11:00)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
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
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                                  : isAvailable
                                  ? 'bg-blue-50/60 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                  : 'bg-slate-100 text-slate-400 line-through opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {slot.gio}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Ca Chiều */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Ca Chiều (13:30 - 16:30)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
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
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                                  : isAvailable
                                  ? 'bg-blue-50/60 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                  : 'bg-slate-100 text-slate-400 line-through opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {slot.gio}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lý do đổi lịch */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lý do đổi lịch (Tùy chọn)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Trùng lịch công tác, việc bận đột xuất..."
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedSlot || !selectedDoctor}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Xác Nhận Đổi Sang {selectedSlot || '__:__'} ({formatDate(newDate)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
