import { useState, useEffect } from 'react';
import {
  Star, X, CheckCircle2, ShieldCheck, MessageSquare,
  Sparkles, Heart, Stethoscope, FlaskConical, Building2, AlertCircle
} from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';

const STAR_DESCRIPTIONS = {
  1: 'Rất thất vọng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng & Tuyệt vời',
};

const SUGGESTED_TAGS = [
  'Bác sĩ tận tâm, chu đáo',
  'Giải thích bệnh rõ ràng, dễ hiểu',
  'Kê đơn hợp lý, dặn dò kỹ',
  'Kỹ thuật viên thao tác nhẹ nhàng',
  'Lễ tân tiếp đón nhiệt tình',
  'Thủ tục nhanh gọn, không chờ lâu',
  'Cơ sở vật chất sạch đẹp, hiện đại',
];

export default function DanhGiaCaKhamModal({ isOpen, onClose, appointment, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [daDanhGia, setDaDanhGia] = useState(false);
  const [existingData, setExistingData] = useState(null);

  // Form states
  const [diemBacSi, setDiemBacSi] = useState(5);
  const [hoverBacSi, setHoverBacSi] = useState(0);

  const [hasCls, setHasCls] = useState(false);
  const [diemCls, setDiemCls] = useState(5);
  const [hoverCls, setHoverCls] = useState(0);

  const [diemTiepDon, setDiemTiepDon] = useState(5);
  const [hoverTiepDon, setHoverTiepDon] = useState(0);

  const [selectedTags, setSelectedTags] = useState(['Bác sĩ tận tâm, chu đáo', 'Giải thích bệnh rõ ràng, dễ hiểu']);
  const [nhanXet, setNhanXet] = useState('');
  const [anDanh, setAnDanh] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tải thông tin đánh giá nếu đã có
  useEffect(() => {
    const targetLichHenId = appointment?.lichHenId || appointment?.id;
    if (!isOpen || !targetLichHenId) return;
    let isMounted = true;
    setFetchingExisting(true);
    setErrorMsg('');
    setSuccessMsg('');

    apiGet(`/danh-gia/lich-hen/${targetLichHenId}`)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.daDanhGia && res?.data?.data) {
          setDaDanhGia(true);
          const d = res.data.data;
          setExistingData(d);
          setDiemBacSi(d.diemBacSi || 5);
          if (d.diemCls) {
            setHasCls(true);
            setDiemCls(d.diemCls);
          }
          setDiemTiepDon(d.diemTiepDon || 5);
          setSelectedTags(d.tieuChiHaiLong || []);
          setNhanXet(d.nhanXet || '');
          setAnDanh(Boolean(d.anDanh));
        } else {
          setDaDanhGia(false);
          setExistingData(null);
          // Mặc định cho ca khám mới
          setDiemBacSi(5);
          setDiemCls(5);
          setDiemTiepDon(5);
          setHasCls(Boolean(appointment.ghiChu?.includes('CLS') || appointment.lichSuKham?.dsChiDinh?.length > 0));
        }
      })
      .catch((err) => {
        console.warn('Lỗi kiểm tra đánh giá cũ:', err);
      })
      .finally(() => {
        if (isMounted) setFetchingExisting(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, appointment?.id]);

  if (!isOpen || !appointment) return null;

  const toggleTag = (tag) => {
    if (daDanhGia) return;
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (daDanhGia) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        lichHenId: appointment.lichHenId || appointment.id,
        luotTiepNhanId: appointment.luotTiepNhanId || undefined,
        diemBacSi,
        diemCls: hasCls ? diemCls : undefined,
        diemTiepDon,
        tieuChiHaiLong: selectedTags,
        nhanXet: nhanXet.trim() || undefined,
        anDanh,
      };

      const res = await apiPost('/danh-gia', payload);
      setSuccessMsg(res?.message || 'Cảm ơn bạn đã gửi đánh giá trải nghiệm khám bệnh!');
      setDaDanhGia(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err?.error?.message || err?.message || err?.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (score, setScore, hoverScore, setHoverScore, disabled = false) => {
    const current = hoverScore || score;
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setScore(star)}
            onMouseEnter={() => !disabled && setHoverScore(star)}
            onMouseLeave={() => !disabled && setHoverScore(0)}
            className={`p-1 rounded-lg transition-transform ${disabled ? 'cursor-default' : 'hover:scale-110 active:scale-95'}`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= current
                  ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-amber-700 ml-2 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          {STAR_DESCRIPTIONS[current] || ''}
        </span>
      </div>
    );
  };

  const tenBacSi = appointment.bacSi?.nhanVien?.hoTen || appointment.tenBacSi || 'Bác sĩ phụ trách';
  const chuyenKhoa = appointment.bacSi?.chuyenKhoa || appointment.chuyenKhoa || 'Đa khoa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-primary-700 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> Đánh giá trải nghiệm khám bệnh
          </div>
          <h2 className="text-xl font-black text-white">
            {daDanhGia ? 'Xem Lại Đánh Giá Ca Khám' : 'Cảm Nhận Của Bạn Về Buổi Khám'}
          </h2>
          <p className="text-blue-100 text-xs mt-1">
            Ý kiến đóng góp quý báu của bạn giúp Bác sĩ, Nhân viên và Ban Giám Đốc nâng cao chất lượng điều trị.
          </p>

          {/* Box thông tin ca khám */}
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-blue-200">Mã lịch hẹn:</span>{' '}
              <strong className="text-white font-mono">{appointment.maLichHen}</strong>
            </div>
            <div>
              <span className="text-blue-200">Bác sĩ:</span>{' '}
              <strong className="text-white">{tenBacSi}</strong> ({chuyenKhoa})
            </div>
            <div>
              <span className="text-blue-200">Ngày khám:</span>{' '}
              <strong className="text-white">{appointment.ngayHen}</strong>
            </div>
          </div>
        </div>

        {/* Nội dung Form */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {fetchingExisting ? (
            <div className="py-12 text-center text-gray-500">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-primary-600 border-t-transparent mx-auto mb-2"></div>
              Đang tải thông tin đánh giá...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {daDanhGia && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Ca khám này đã được ghi nhận đánh giá vào hệ thống. Cảm ơn phản hồi quý báu của bạn!
                  </span>
                </div>
              )}

              {/* 1. ĐÁNH GIÁ BÁC SĨ KHÁM */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary-600" />
                    1. Bác sĩ trực tiếp thăm khám ({tenBacSi}):
                  </label>
                  <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    Chuyên môn & Thái độ
                  </span>
                </div>
                {renderStars(diemBacSi, setDiemBacSi, hoverBacSi, setHoverBacSi, daDanhGia)}
              </div>

              {/* 2. ĐÁNH GIÁ CẬN LÂM SÀNG (XÉT NGHIỆM / CĐHA) */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-purple-600" />
                    2. Dịch vụ Xét nghiệm & Chẩn đoán hình ảnh:
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCls}
                      disabled={daDanhGia}
                      onChange={(e) => setHasCls(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Có thực hiện CLS</span>
                  </label>
                </div>
                {hasCls ? (
                  renderStars(diemCls, setDiemCls, hoverCls, setHoverCls, daDanhGia)
                ) : (
                  <p className="text-xs text-gray-400 italic">Ca khám không chỉ định cận lâm sàng (bỏ qua tiêu chí này).</p>
                )}
              </div>

              {/* 3. ĐÁNH GIÁ TIẾP ĐÓN & THỦ TỤC */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    3. Khâu Tiếp đón, Lễ tân & Cơ sở vật chất:
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Chỉ dẫn & Tiện nghi
                  </span>
                </div>
                {renderStars(diemTiepDon, setDiemTiepDon, hoverTiepDon, setHoverTiepDon, daDanhGia)}
              </div>

              {/* 4. CHỌN TIÊU CHÍ HÀI LÒNG NHANH */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-500" /> Điều bạn ấn tượng nhất trong buổi khám:
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTED_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        disabled={daDanhGia}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        } ${daDanhGia ? 'cursor-default' : ''}`}
                      >
                        {active ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. NHẬN XÉT CHI TIẾT & LỜI NHẮN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  Ý kiến đóng góp hoặc Lời cảm ơn gửi tới Bác sĩ & Phòng khám:
                </label>
                <textarea
                  value={nhanXet}
                  disabled={daDanhGia}
                  onChange={(e) => setNhanXet(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn (ví dụ: Bác sĩ tư vấn rất tận tâm, thuốc uống đỡ nhiều, phòng khám sạch sẽ...)"
                  rows={3}
                  className="w-full text-xs p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-600"
                ></textarea>
              </div>

              {/* Phản hồi từ Giám Đốc (nếu có) */}
              {existingData?.phanHoiGiamDoc && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Phản hồi từ Ban Giám Đốc phòng khám:
                  </span>
                  <p className="text-amber-800 italic">"{existingData.phanHoiGiamDoc}"</p>
                </div>
              )}

              {/* 6. TÙY CHỌN ẨN DANH */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anDanh}
                    disabled={daDanhGia}
                    onChange={(e) => setAnDanh(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span>Đánh giá ẩn danh (không hiển thị họ tên của bạn trên hệ thống)</span>
                </label>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {daDanhGia ? 'Đóng' : 'Để sau'}
                </button>

                {!daDanhGia && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Gửi Đánh Giá Ca Khám
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

