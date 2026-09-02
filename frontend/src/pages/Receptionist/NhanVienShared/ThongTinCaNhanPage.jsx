import { useState } from 'react';
import { User, Phone, Mail, Shield, Calendar, Key, CheckCircle, Stethoscope } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { VAI_TRO_LABEL } from '../../../utils/constants';

export default function ThongTinCaNhanPage() {
  const { user } = useAuthStore();
  const [successMsg, setSuccessMsg] = useState('');
  const [passData, setPassData] = useState({ oldPass: '', newPass: '', confirmPass: '' });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirmPass) {
      alert('Mật khẩu mới không trùng khớp!');
      return;
    }
    setSuccessMsg('Đã cập nhật mật khẩu tài khoản nhân viên thành công!');
    setPassData({ oldPass: '', newPass: '', confirmPass: '' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hồ sơ Cá nhân Nhân viên</h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý thông tin tài khoản, chức danh chuyên môn và mật khẩu bảo mật
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-light p-4 text-sm text-success-main border border-success-main/30 animate-fade-in">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Avatar & Role */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto text-3xl font-extrabold shadow-inner">
            {user?.tenDangNhap?.[0]?.toUpperCase() || 'NV'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.tenDangNhap}</h2>
            <p className="text-xs font-medium text-primary-700 bg-primary-50 px-3 py-1 rounded-full inline-block mt-1 border border-primary-200">
              {VAI_TRO_LABEL[user?.vaiTro] || user?.vaiTro || 'Nhân viên y tế'}
            </p>
          </div>
          <div className="text-xs text-gray-500 pt-3 border-t border-gray-100 space-y-1">
            <p>Mã định danh: <strong>NV2026001</strong></p>
            <p>Trạng thái: <span className="text-emerald-600 font-bold">● Đang làm việc</span></p>
          </div>
        </div>

        {/* Thông tin Chi tiết & Đổi mật khẩu */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="h-5 w-5 text-primary-600" /> Thông tin Hành chính Nhân sự
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Tên đăng nhập</p>
                <p className="font-semibold text-gray-900">{user?.tenDangNhap}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Loại tài khoản</p>
                <p className="font-semibold text-gray-900">{user?.loaiTaiKhoan || 'Nhân viên hệ thống'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email công vụ</p>
                <p className="font-semibold text-gray-900">{user?.tenDangNhap}@phongkham.vn</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phòng ban / Bộ phận</p>
                <p className="font-semibold text-gray-900">Quầy Tiếp tân & Điều phối</p>
              </div>
            </div>
          </div>

          {/* Form Đổi mật khẩu */}
          <form onSubmit={handleChangePassword} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="h-5 w-5 text-primary-600" /> Đổi mật khẩu tài khoản
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={passData.oldPass}
                  onChange={(e) => setPassData({ ...passData, oldPass: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={passData.newPass}
                  onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={passData.confirmPass}
                  onChange={(e) => setPassData({ ...passData, confirmPass: e.target.value })}
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <MedButton type="submit" variant="primary" size="sm" leftIcon={<Key className="h-4 w-4" />}>
                Cập nhật mật khẩu
              </MedButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

