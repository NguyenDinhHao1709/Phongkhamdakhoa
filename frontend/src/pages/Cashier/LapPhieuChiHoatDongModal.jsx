import { useState } from 'react';
import { X, Building2, PlusCircle, CheckCircle2, AlertCircle, FileText, DollarSign } from 'lucide-react';
import { apiPost } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

const LOAI_CHI_OPTIONS = [
  { value: 'dien_nuoc', label: '⚡ Điện, nước, viễn thông, mạng internet' },
  { value: 'rac_thai_y_te', label: '☣️ Xử lý rác thải y tế & môi trường' },
  { value: 'van_phong_pham', label: '📝 Văn phòng phẩm, in ấn hóa đơn chứng từ' },
  { value: 'vat_tu_tieu_hao', label: '🧤 Vật tư y tế tiêu hao, bông băng, găng tay' },
  { value: 'sua_chua_bao_tri', label: '🔧 Sửa chữa máy móc, bảo trì cơ sở hạ tầng' },
  { value: 'khac', label: '💼 Chi phí hoạt động & quản lý khác' },
];

export default function LapPhieuChiHoatDongModal({ onClose, onSuccess, onOpenPrint }) {
  const [formData, setFormData] = useState({
    loaiChi: 'dien_nuoc',
    khoanChi: '',
    nguoiNhan: '',
    soTien: '',
    phuongThucChi: 'tien_mat',
    chungTuGoc: '',
    ghiChu: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.khoanChi.trim()) {
      setErrorMsg('Vui lòng nhập nội dung / tên khoản chi.');
      return;
    }
    if (!formData.nguoiNhan.trim()) {
      setErrorMsg('Vui lòng nhập người hoặc đơn vị nhận tiền.');
      return;
    }
    const amount = Number(formData.soTien);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Số tiền chi phải lớn hơn 0 VNĐ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiPost('/thanh-toan/phieu-chi-hoat-dong', {
        ...formData,
        soTien: amount,
      });
      alert('Đã lập phiếu chi hoạt động thành công!');
      onSuccess?.();
      onClose();
      if (res?.data?.data && onOpenPrint) {
        onOpenPrint({
          ...res.data.data,
          loai: 'phieu_chi',
          loaiChiTiet: 'chi_hoat_dong',
          soChungTu: res.data.data.maPhieuChi,
          doiTuong: res.data.data.nguoiNhan,
          dienGiai: `[Chi vận hành] ${res.data.data.khoanChi}`,
          soTien: res.data.data.soTien,
          phuongThuc: res.data.data.phuongThucChi,
          ngayLap: res.data.data.ngayChi,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lập phiếu chi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-emerald-50/80 border-emerald-100">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Lập Phiếu Chi Hoạt Động & Vận Hành (OPEX)</h3>
              <p className="text-xs text-emerald-700">Ghi nhận chi phí vận hành phòng khám vào sổ quỹ chuẩn ERP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Phân loại chi phí */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Phân loại chi phí <span className="text-red-500">*</span>
            </label>
            <select
              name="loaiChi"
              value={formData.loaiChi}
              onChange={handleChange}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              {LOAI_CHI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tên khoản chi */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Nội dung / Tên khoản chi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="khoanChi"
              value={formData.khoanChi}
              onChange={handleChange}
              placeholder="Vd: Thanh toán tiền điện tháng 10/2026, Thu gom rác y tế quý 4..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Người nhận tiền */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Đơn vị / Người nhận tiền <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nguoiNhan"
                value={formData.nguoiNhan}
                onChange={handleChange}
                placeholder="Vd: Công ty Điện lực, CT Môi trường..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            {/* Số tiền chi */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                4. Số tiền chi (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="soTien"
                min="1000"
                step="1000"
                value={formData.soTien}
                onChange={handleChange}
                placeholder="Vd: 1500000"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
              {Number(formData.soTien) > 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold">
                  = {formatCurrency(formData.soTien)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hình thức chi */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                5. Hình thức thanh toán
              </label>
              <select
                name="phuongThucChi"
                value={formData.phuongThucChi}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                <option value="tien_mat">💵 Tiền mặt tại quỹ phòng khám</option>
                <option value="chuyen_khoan">🏦 Chuyển khoản ngân hàng</option>
              </select>
            </div>

            {/* Chứng từ gốc kèm theo */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                6. Số hóa đơn / Chứng từ gốc
              </label>
              <input
                type="text"
                name="chungTuGoc"
                value={formData.chungTuGoc}
                onChange={handleChange}
                placeholder="Vd: HDGTGT-004523, Biên lai số 12..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              7. Diễn giải chi tiết / Ghi chú
            </label>
            <input
              type="text"
              name="ghiChu"
              value={formData.ghiChu}
              onChange={handleChange}
              placeholder="Ghi chú thêm về nội dung chi..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Đang ghi sổ...' : 'Lập Phiếu Chi & Lưu Sổ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

