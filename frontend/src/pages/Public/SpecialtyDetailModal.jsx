import { X, Building2, MapPin, CheckCircle2, Stethoscope, Calendar, Activity, Info, ShieldCheck, Sparkles } from 'lucide-react';

export default function SpecialtyDetailModal({ specialty, onClose, onBooking }) {
  if (!specialty) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div 
        className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-blue-800 text-white p-6 sm:p-7 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white flex-shrink-0 shadow-inner">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 border border-white/30 text-[11px] font-semibold text-blue-100">
                <MapPin className="h-3.5 w-3.5" />
                <span>{specialty.phong} • {specialty.tang || 'Khu Chuyên Khoa'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {specialty.title}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
                {specialty.shortDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 text-gray-800 flex-1 divide-y divide-slate-100">
          {/* PHẦN 1: KHOA NÀY LÀ GÌ? */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-primary-700 flex items-center justify-center font-bold">
                <Info className="h-4 w-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                1. Khoa này là gì?
              </h3>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 text-xs sm:text-sm text-gray-700 leading-relaxed">
              {specialty.laGi}
            </div>
          </div>

          {/* PHẦN 2: LÀM VỀ NHỮNG LĨNH VỰC GÌ? */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                2. Khoa làm về những lĩnh vực gì?
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {specialty.linhVuc?.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:bg-slate-50/50 transition-all space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-primary-700 font-bold text-xs sm:text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{item.nhom}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-6">
                    {item.chiTiet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* PHẦN 3: TRANG THIẾT BỊ CHUYÊN MÔN NỔI BẬT */}
          {specialty.trangThietBi && specialty.trangThietBi.length > 0 && (
            <div className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  3. Trang thiết bị & Máy móc chuyên dụng
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {specialty.trangThietBi.map((tb, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                    <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{tb}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHẦN 4: ĐỐI TƯỢNG BỆNH NHÂN / KHI NÀO NÊN ĐẾN KHÁM */}
          {specialty.doiTuong && (
            <div className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  4. Khi nào bạn nên đến khám tại khoa này?
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                {specialty.doiTuong}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-gray-400" />
            Khám chữa bệnh đúng tuyến, hỗ trợ BHYT toàn diện
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer w-full sm:w-auto"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onClose();
                if (onBooking) onBooking(specialty.title);
              }}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
            >
              <Calendar className="h-4 w-4" />
              Đặt lịch khám khoa này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

