import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../services/api';

export function AddNhanVienModal({ isOpen, onClose, onSubmit }) {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm();
  
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet('/quan-ly/phan-quyen')
  });

  const rawVaiTros = rolesData?.data?.vaiTros || [];
  const vaiTros = rawVaiTros.filter(
    (r) => r.maVaiTro !== 'quan_tri_vien' && r.maVaiTro !== 'quan_tri_vien_cap_cao'
  );
  const selectedVaiTroId = watch('vaiTroId');
  const selectedRole = vaiTros.find(r => String(r.id) === String(selectedVaiTroId));

  if (!isOpen) return null;

  const submitForm = (data) => {
    onSubmit(data);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Thêm nhân sự mới</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="add-employee-form" onSubmit={handleSubmit(submitForm)} className="space-y-6">
            {/* Thông tin tài khoản */}
            <div>
              <h4 className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Thông tin tài khoản</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập *</label>
                  <input {...register('tenDangNhap', { required: true })} className="w-full rounded-md border-gray-300 p-2 border focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                  <input type="password" {...register('matKhau', { required: true })} className="w-full rounded-md border-gray-300 p-2 border focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò hệ thống *</label>
                  <select {...register('vaiTroId', { required: true })} className="w-full rounded-md border-gray-300 p-2 border focus:ring-primary-500 focus:border-primary-500">
                    <option value="">-- Chọn vai trò --</option>
                    {vaiTros.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.tenVaiTro}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]} {...register('ngayVaoLam')} className="w-full rounded-md border-gray-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện</label>
                  {watch('anhDaiDien') && (
                    <img src={watch('anhDaiDien').startsWith('http') ? watch('anhDaiDien') : `http://localhost:5000${watch('anhDaiDien')}`} alt="Avatar" className="w-16 h-16 rounded-full object-cover mb-2 border" />
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await apiPost('/quan-ly/upload-avatar', formData);
                      if (res.data) {
                        setValue('anhDaiDien', res.data);
                        alert('Upload ảnh thành công');
                      }
                    } catch (err) {
                      alert('Lỗi upload ảnh: ' + (err.error?.message || err.message || 'Lỗi không xác định'));
                    }
                  }} className="w-full rounded-md border-gray-300 p-1.5 border text-sm" />
                  <input type="hidden" {...register('anhDaiDien')} />
                </div>
              </div>
            </div>

            {/* Thông tin chuyên môn (Dynamic) */}
            {selectedRole?.maVaiTro === 'bac_si' && (
              <div>
                <h4 className="text-sm font-semibold text-medical-teal uppercase tracking-wider mb-3">Chuyên môn Bác sĩ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên khoa *</label>
                    <select {...register('chuyenKhoa', { required: true })} className="w-full rounded-md border-gray-300 p-2 border">
                      <option value="">-- Chọn Chuyên khoa --</option>
                      <option value="Nội tổng quát">Nội tổng quát</option>
                      <option value="Ngoại khoa">Ngoại khoa</option>
                      <option value="Nhi khoa">Nhi khoa</option>
                      <option value="Tai Mũi Họng">Tai Mũi Họng</option>
                      <option value="Tim mạch">Tim mạch</option>
                      <option value="Cơ Xương Khớp">Cơ Xương Khớp</option>
                      <option value="Răng Hàm Mặt">Răng Hàm Mặt</option>
                      <option value="Mắt">Mắt</option>
                      <option value="Chẩn đoán hình ảnh & Xét nghiệm">Chẩn đoán hình ảnh & Xét nghiệm</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bằng cấp</label>
                    <input {...register('bangCap')} className="w-full rounded-md border-gray-300 p-2 border" placeholder="VD: Thạc sĩ, BS.CKI..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số Chứng chỉ hành nghề</label>
                    <input {...register('soChungChiHanhNghe')} className="w-full rounded-md border-gray-300 p-2 border" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả giới thiệu</label>
                    <textarea {...register('moTaBacSi')} rows={3} className="w-full rounded-md border-gray-300 p-2 border" placeholder="Giới thiệu chuyên môn của bác sĩ..." />
                  </div>
                </div>
              </div>
            )}

            {selectedRole?.maVaiTro === 'ky_thuat_vien' && (
              <div>
                <h4 className="text-sm font-semibold text-medical-teal uppercase tracking-wider mb-3">Chuyên môn Kỹ thuật viên</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên môn / Bộ phận</label>
                  <input {...register('chuyenMon')} className="w-full rounded-md border-gray-300 p-2 border" placeholder="VD: Xét nghiệm Huyết học, Siêu âm..." />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <MedButton variant="outline" onClick={onClose}>Hủy</MedButton>
          <MedButton form="add-employee-form" type="submit">Thêm nhân sự</MedButton>
        </div>
      </div>
    </div>
  );
}

