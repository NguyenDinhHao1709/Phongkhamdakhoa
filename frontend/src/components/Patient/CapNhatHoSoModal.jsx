import { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, MapPin, Calendar, Activity,
  AlertTriangle, Save, ShieldCheck, HeartPulse
} from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function CapNhatHoSoModal({ isOpen, onClose, benhNhanId, onSuccess }) {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    hoTen: '',
    ngaySinh: '',
    gioiTinh: 'nam',
    soDienThoai: '',
    soCmnd: '',
    soBhyt: '',
    email: '',
    diaChi: '',
    nhomMau: '',
    diUng: '',
    tienSuBenh: '',
    ngheNghiep: '',
    nguoiThanLienHe: '',
    sdtNguoiThan: '',
  });

  useEffect(() => {
    if (isOpen && benhNhanId) {
      fetchPatientData();
    }
  }, [isOpen, benhNhanId]);

  const fetchPatientData = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiGet(`/benh-nhan/${benhNhanId}`);
      const data = res?.data || res;
      if (data) {
        setFormData({
          hoTen: data.hoTen || user?.hoTen || '',
          ngaySinh: data.ngaySinh ? data.ngaySinh.split('T')[0] : '',
          gioiTinh: data.gioiTinh || 'nam',
          soDienThoai: data.soDienThoai || user?.soDienThoai || '',
          soCmnd: data.soCmnd || '',
          soBhyt: data.soBhyt || data.soBHYT || '',
          email: data.email || user?.email || '',
          diaChi: data.diaChi || '',
          nhomMau: data.nhomMau || '',
          diUng: data.diUng || '',
          tienSuBenh: data.tienSuBenh || '',
          ngheNghiep: data.ngheNghiep || '',
          nguoiThanLienHe: data.nguoiThanLienHe || '',
          sdtNguoiThan: data.sdtNguoiThan || '',
        });
      }
    } catch (err) {
      console.error('Lỗi nạp thông tin bệnh nhân:', err);
      setErrorMsg('Không thể tải thông tin hồ sơ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hoTen?.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Làm sạch payload: biến chuỗi rỗng '' thành null
    const cleanedPayload = {};
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      cleanedPayload[key] = (typeof val === 'string' && val.trim() === '') ? null : val;
    });

    try {
      await apiPatch(`/benh-nhan/${benhNhanId}`, cleanedPayload);

      // Cập nhật tên trong authStore nếu có thay đổi
      if (cleanedPayload.hoTen && user) {
        setUser({ ...user, hoTen: cleanedPayload.hoTen });
      }

      setSuccessMsg('Cập nhật thông tin hồ sơ cá nhân thành công!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Lỗi cập nhật hồ sơ bệnh nhân:', err);
      setErrorMsg(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-indigo-800 p-5 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Cập Nhật Thông Tin Cá Nhân
              </h3>
              <p className="text-xs text-blue-100">
                Chỉnh sửa hồ sơ thông tin hành chính, BHYT & chỉ số y tế của bạn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi / thành công */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Form */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang nạp hồ sơ bệnh nhân...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
            {/* Nhóm 1: Thông tin hành chính cơ bản */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="w-4 h-4" />
                <span>1. Thông tin hành chính</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hoTen}
                    onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                    placeholder="Nguyễn Văn A..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    placeholder="0901234567..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={formData.ngaySinh}
                    onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={formData.gioiTinh}
                    onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium bg-white"
                  >
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    value={formData.soCmnd}
                    onChange={(e) => setFormData({ ...formData, soCmnd: e.target.value })}
                    placeholder="12 chữ số căn cước..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ thường trú
                </label>
                <input
                  type="text"
                  value={formData.diaChi}
                  onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            {/* Nhóm 2: BHYT & Chỉ số y tế */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Thẻ Bảo Hiểm Y Tế & Nhóm Máu</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã số thẻ BHYT (nếu có)
                  </label>
                  <input
                    type="text"
                    value={formData.soBhyt}
                    onChange={(e) => setFormData({ ...formData, soBhyt: e.target.value.toUpperCase() })}
                    placeholder="15 ký tự (VD: DN4791234567890)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-mono uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nhập mã số thẻ BHYT để được tiếp nhận hưởng quyền lợi bảo hiểm khi đến khám.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhóm máu
                  </label>
                  <select
                    value={formData.nhomMau}
                    onChange={(e) => setFormData({ ...formData, nhomMau: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium bg-white"
                  >
                    <option value="">-- Chưa xác định / Chưa cập nhật --</option>
                    <option value="A">Nhóm máu A</option>
                    <option value="B">Nhóm máu B</option>
                    <option value="AB">Nhóm máu AB</option>
                    <option value="O">Nhóm máu O</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-red-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Tiền sử dị ứng (Thuốc, Thức ăn...)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.diUng}
                    onChange={(e) => setFormData({ ...formData, diUng: e.target.value })}
                    placeholder="Ví dụ: Dị ứng Penicillin, Hải sản... (Để trống nếu không có)"
                    className="w-full px-3 py-2 rounded-xl border border-red-200 bg-red-50/30 focus:outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-100 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tiền sử bệnh lý bản thân
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tienSuBenh}
                    onChange={(e) => setFormData({ ...formData, tienSuBenh: e.target.value })}
                    placeholder="Tiểu đường, cao huyết áp, hen phế quản... (nếu có)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm 3: Thông tin người thân liên hệ khẩn cấp */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Phone className="w-4 h-4" />
                <span>3. Liên hệ người thân (Khẩn cấp)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Họ tên người thân
                  </label>
                  <input
                    type="text"
                    value={formData.nguoiThanLienHe}
                    onChange={(e) => setFormData({ ...formData, nguoiThanLienHe: e.target.value })}
                    placeholder="Bố/Mẹ/Vợ/Chồng..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số điện thoại người thân
                  </label>
                  <input
                    type="text"
                    value={formData.sdtNguoiThan}
                    onChange={(e) => setFormData({ ...formData, sdtNguoiThan: e.target.value })}
                    placeholder="0987654321..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

