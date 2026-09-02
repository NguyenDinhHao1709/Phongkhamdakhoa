import { useState } from 'react';
import { User, Key, CheckCircle, AlertCircle } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { VAI_TRO_LABEL } from '../../../utils/constants';
import { apiPost } from '../../../services/api';

export default function ThongTinCaNhanPage() {
  const { user } = useAuthStore();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState({ oldPass: '', newPass: '', confirmPass: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (passData.newPass !== passData.confirmPass) {
      setErrorMsg('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
      return;
    }

    if (passData.newPass.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/auth/change-password', {
        matKhauHienTai: passData.oldPass,
        matKhauMoi: passData.newPass,
      });
      setSuccessMsg('Đã cập nhật mật khẩu tài khoản nhân viên thành công!');
      setPassData({ oldPass: '', newPass: '', confirmPass: '' });
    } catch (err) {
      console.error('Lỗi đổi mật khẩu:', err);
      setErrorMsg(err?.error?.message || err?.message || 'Mật khẩu hiện tại không chính xác!');
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200 animate-fade-in font-medium">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 animate-fade-in font-medium">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
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
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={passData.newPass}
                  onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                  placeholder="Nhập mật khẩu mới (>= 6 ký tự)"
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={passData.confirmPass}
                  onChange={(e) => setPassData({ ...passData, confirmPass: e.target.value })}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full p-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <MedButton
                type="submit"
                variant="primary"
                size="sm"
                loading={loading}
                leftIcon={<Key className="h-4 w-4" />}
              >
                Cập nhật mật khẩu
              </MedButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
