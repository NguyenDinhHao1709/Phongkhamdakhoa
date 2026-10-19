import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { X, Camera, Trash2, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../services/api';

export function EditNhanVienModal({ isOpen, onClose, onSubmit, nhanVienId }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const avatarInputRef = useRef(null);
  
  const { data: nvData, isSuccess } = useQuery({
    queryKey: ['nhanVienDetail', nhanVienId],
    queryFn: () => apiGet(`/quan-ly/nhan-vien/${nhanVienId}`),
    enabled: !!nhanVienId && isOpen,
  });

  const toLocalDateInput = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const DEFAULT_CHUYEN_KHOA = [
    'Nội tổng quát',
    'Nội tổng quát & Tim mạch',
    'Ngoại khoa',
    'Nhi khoa',
    'Tai Mũi Họng',
    'Tim mạch',
    'Cơ Xương Khớp',
    'Răng Hàm Mặt',
    'Mắt',
    'Sản Phụ khoa',
    'Da liễu',
    'Chẩn đoán hình ảnh & Xét nghiệm',
    'Khác',
  ];

  useEffect(() => {
    if (isSuccess && nvData?.data) {
      const d = nvData.data;
      const bs = d.bacSi || {};
      const ktv = d.kyThuatVien || {};
      reset({
        hoTen: d.hoTen || '',
        email: d.email || '',
        soDienThoai: d.soDienThoai || '',
        ngaySinh: toLocalDateInput(d.ngaySinh),
        gioiTinh: d.gioiTinh || '',
        soCmnd: d.soCmnd || '',
        ngayVaoLam: toLocalDateInput(d.ngayVaoLam),
        anhDaiDien: d.anhDaiDien || '',
        chuyenKhoa: bs.chuyenKhoa || d.chuyenKhoa || '',
        bangCap: bs.bangCap || d.bangCap || '',
        soChungChiHanhNghe: bs.soChungChiHanhNghe || d.soChungChiHanhNghe || '',
        moTaBacSi: bs.moTa || d.moTa || '',
        chuyenMon: ktv.chuyenMon || d.chuyenMon || '',
      });
      setAvatarMsg(null);
    }
  }, [isSuccess, nvData, reset]);

  const maVaiTro = nvData?.data?.nguoiDung?.vaiTro?.maVaiTro;
  const currentChuyenKhoa = nvData?.data?.bacSi?.chuyenKhoa || nvData?.data?.chuyenKhoa || '';

  if (!isOpen) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadingAvatar(true);
    setAvatarMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiPost(`/quan-ly/upload-avatar?nhanVienId=${nhanVienId}`, formData);
      if (res.data) {
        setValue('anhDaiDien', res.data, { shouldDirty: true });
        setAvatarMsg({
          type: 'success',
          text: 'Khuôn mặt hợp lệ và không trùng lặp! Bấm "Lưu thay đổi" để áp dụng vào hệ thống.',
        });
      }
    } catch (err) {
      const errDetail = err?.message || err?.error?.message || err?.detail || 'Lỗi khi tải hoặc xác thực ảnh khuôn mặt';
      setAvatarMsg({
        type: 'error',
        text: errDetail,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submitForm = (data) => {
    onSubmit({ id: nhanVienId, data });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Cập nhật thông tin nhân sự</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {nvData?.data ? (
          <form id="edit-employee-form" onSubmit={handleSubmit(submitForm)} className="space-y-6">
            {/* Thông tin cá nhân */}
            <div>
              <h4 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Thông tin cá nhân</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                  <input {...register('hoTen', { required: true })} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" {...register('email')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input {...register('soDienThoai')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]} {...register('ngaySinh')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select {...register('gioiTinh')} className="w-full rounded-md border-gray-300 p-2 border">
                    <option value="">-- Chọn --</option>
                    <option value="nam">Nam</option>
                    <option value="nu">Nữ</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số CMND/CCCD</label>
                  <input {...register('soCmnd')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]} {...register('ngayVaoLam')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>

                {/* Khu vực ảnh đại diện / khuôn mặt mẫu */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Ảnh nhận diện khuôn mặt (Chấm công)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Ảnh mẫu sinh trắc học để nhân viên chấm công bằng khuôn mặt. Hệ thống tự động phân tích và đối soát để tránh trùng khuôn mặt với nhân viên khác trong phòng khám.
                  </p>

                  <div className="flex items-start gap-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    {watch('anhDaiDien') ? (
                      <div className="relative group flex-shrink-0">
                        <img
                          src={watch('anhDaiDien').startsWith('http') ? watch('anhDaiDien') : `http://localhost:5000${watch('anhDaiDien')}`}
                          alt="Avatar nhân viên"
                          className="w-24 h-24 rounded-xl object-cover border-2 border-primary-200 shadow-sm bg-white"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                        <User className="w-8 h-8 mb-1 text-gray-300" />
                        <span className="text-[11px] text-center font-medium">Chưa có ảnh</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={uploadingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition shadow-sm disabled:opacity-50"
                        >
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                              <span>Đang đối soát khuôn mặt...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5 text-primary-600" />
                              <span>{watch('anhDaiDien') ? 'Sửa / Đổi ảnh' : '+ Tải ảnh đại diện mẫu'}</span>
                            </>
                          )}
                        </button>

                        {watch('anhDaiDien') && (
                          <button
                            type="button"
                            disabled={uploadingAvatar}
                            onClick={() => {
                              setValue('anhDaiDien', '', { shouldDirty: true });
                              setAvatarMsg({ type: 'info', text: 'Đã gỡ ảnh mẫu. Bấm "Lưu thay đổi" để áp dụng.' });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition shadow-sm disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Xóa ảnh</span>
                          </button>
                        )}
                      </div>

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />

                      {avatarMsg && (
                        <div
                          className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                            avatarMsg.type === 'error'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : avatarMsg.type === 'success'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {avatarMsg.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />}
                          {avatarMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />}
                          <span className="flex-1 font-medium leading-relaxed">{avatarMsg.text}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500">
                        * Định dạng: JPG, PNG. Ảnh chụp trực diện rõ mặt, không che mặt hoặc ngược sáng.
                      </p>
                    </div>
                  </div>
                  <input type="hidden" {...register('anhDaiDien')} />
                </div>
              </div>
            </div>

            {/* Thông tin chuyên môn (Dynamic) */}
            {maVaiTro === 'bac_si' && (
              <div>
                <h4 className="text-sm font-semibold text-medical-teal uppercase tracking-wider mb-3">Chuyên môn Bác sĩ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên khoa *</label>
                    <select {...register('chuyenKhoa', { required: true })} className="w-full rounded-md border-gray-300 p-2 border">
                      <option value="">-- Chọn Chuyên khoa --</option>
                      {currentChuyenKhoa && !DEFAULT_CHUYEN_KHOA.includes(currentChuyenKhoa) && (
                        <option value={currentChuyenKhoa}>{currentChuyenKhoa}</option>
                      )}
                      {DEFAULT_CHUYEN_KHOA.map((ck) => (
                        <option key={ck} value={ck}>{ck}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bằng cấp</label>
                    <input {...register('bangCap')} className="w-full rounded-md border-gray-300 p-2 border" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số Chứng chỉ hành nghề</label>
                    <input {...register('soChungChiHanhNghe')} className="w-full rounded-md border-gray-300 p-2 border" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả giới thiệu</label>
                    <textarea {...register('moTaBacSi')} rows={3} className="w-full rounded-md border-gray-300 p-2 border" />
                  </div>
                </div>
              </div>
            )}

            {maVaiTro === 'ky_thuat_vien' && (
              <div>
                <h4 className="text-sm font-semibold text-medical-teal uppercase tracking-wider mb-3">Chuyên môn Kỹ thuật viên</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên môn / Bộ phận</label>
                  <input {...register('chuyenMon')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
              </div>
            )}
          </form>
          ) : ( <div className="p-4 text-center">Đang tải dữ liệu...</div> )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <MedButton variant="outline" onClick={onClose}>Hủy</MedButton>
          <MedButton form="edit-employee-form" type="submit">Lưu thay đổi</MedButton>
        </div>
      </div>
    </div>
  );
}

