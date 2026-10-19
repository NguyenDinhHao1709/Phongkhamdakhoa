import { useState, useEffect } from 'react';
import { User, Key, CheckCircle, AlertCircle, Stethoscope, Loader2 } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { VAI_TRO_LABEL } from '../../../utils/constants';
import { apiGet, apiPost } from '../../../services/api';

const formatDateVN = (val) => {
  if (!val) return 'Chưa cập nhật';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const [y, m, d] = val.trim().split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(val);
  if (isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleDateString('vi-VN');
};

export default function ThongTinCaNhanPage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState({ oldPass: '', newPass: '', confirmPass: '' });

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setFetchingProfile(true);
      try {
        const res = await apiGet('/auth/me');
        const data = res?.data || res;
        if (mounted && data) {
          setProfile(data);
          if (user) {
            setUser({
              ...user,
              hoTen: data.hoTen || user.hoTen,
              anhDaiDien: data.anhDaiDien ?? user.anhDaiDien,
              chucVu: data.chucVu || user.chucVu,
            });
          }
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ cá nhân:', err);
      } finally {
        if (mounted) setFetchingProfile(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

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

  const nv = profile?.nhanVien || {};
  const bs = profile?.bacSi || {};
  const ktv = profile?.kyThuatVien || {};
  const vaiTro = profile?.vaiTro || user?.vaiTro;
  const tenDangNhap = profile?.tenDangNhap || user?.tenDangNhap || '';
  const safeUserHoTen =
    user?.hoTen && !(user.hoTen.toLowerCase() === 'admin' && tenDangNhap.toLowerCase() !== 'admin')
      ? user.hoTen
      : '';
  const hoTen =
    nv?.hoTen ||
    profile?.hoTen ||
    safeUserHoTen ||
    (vaiTro === 'giam_doc' ? 'Ban Giám đốc' : tenDangNhap);
  const rawAvatar = nv?.anhDaiDien || profile?.anhDaiDien || user?.anhDaiDien || '';
  const avatarUrl = rawAvatar
    ? rawAvatar.startsWith('http')
      ? rawAvatar
      : `http://localhost:5000${rawAvatar}`
    : '';
  const maNhanVien =
    profile?.maNhanVien ||
    (nv?.id ? `NV${String(nv.id).padStart(5, '0')}` : user?.nhanVienId ? `NV${String(user.nhanVienId).padStart(5, '0')}` : 'Chưa cấp mã');

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

      {fetchingProfile ? (
        <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          <span className="text-sm font-medium">Đang tải thông tin hồ sơ nhân sự từ hệ thống...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Avatar & Role */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={hoTen}
                className="h-28 w-28 rounded-full object-cover mx-auto border-2 border-primary-200 shadow-sm bg-gray-50"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto text-3xl font-extrabold shadow-inner">
                {hoTen?.[0]?.toUpperCase() || tenDangNhap?.[0]?.toUpperCase() || 'NV'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{hoTen}</h2>
              {tenDangNhap && tenDangNhap !== hoTen && (
                <p className="text-xs text-gray-500 mt-0.5">@{tenDangNhap}</p>
              )}
              <p className="text-xs font-medium text-primary-700 bg-primary-50 px-3 py-1 rounded-full inline-block mt-2 border border-primary-200">
                {VAI_TRO_LABEL[nv?.chucVu] || VAI_TRO_LABEL[vaiTro] || nv?.chucVu || profile?.tenVaiTro || 'Nhân viên y tế'}
              </p>
            </div>
            <div className="text-xs text-gray-500 pt-3 border-t border-gray-100 space-y-1.5">
              <p>
                Mã định danh: <strong className="text-gray-800">{maNhanVien}</strong>
              </p>
              <p>
                Trạng thái:{' '}
                {profile?.trangThai === 'khoa' ? (
                  <span className="text-red-600 font-bold">● Đang tạm khóa</span>
                ) : (
                  <span className="text-emerald-600 font-bold">● Đang làm việc</span>
                )}
              </p>
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
                  <p className="text-xs text-gray-500">Họ và tên</p>
                  <p className="font-semibold text-gray-900">{hoTen}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tên đăng nhập</p>
                  <p className="font-semibold text-gray-900">{tenDangNhap}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email công vụ</p>
                  <p className="font-semibold text-gray-900">{nv?.email || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Số điện thoại</p>
                  <p className="font-semibold text-gray-900">{nv?.soDienThoai || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ngày sinh</p>
                  <p className="font-semibold text-gray-900">{formatDateVN(nv?.ngaySinh)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Giới tính</p>
                  <p className="font-semibold text-gray-900">
                    {nv?.gioiTinh === 'nam' ? 'Nam' : nv?.gioiTinh === 'nu' ? 'Nữ' : nv?.gioiTinh || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Số CMND / CCCD</p>
                  <p className="font-semibold text-gray-900">{nv?.soCmnd || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ngày vào làm</p>
                  <p className="font-semibold text-gray-900">{formatDateVN(nv?.ngayVaoLam)}</p>
                </div>
              </div>
            </div>

            {vaiTro === 'bac_si' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Stethoscope className="h-5 w-5 text-primary-600" /> Hồ sơ Chuyên môn Bác sĩ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Chuyên khoa đăng ký</p>
                    <p className="font-semibold text-primary-700">{bs?.chuyenKhoa || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Học hàm / Học vị (Bằng cấp)</p>
                    <p className="font-semibold text-gray-900">{bs?.bangCap || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Số Chứng chỉ hành nghề (CCHN)</p>
                    <p className="font-semibold text-gray-900">{bs?.soChungChiHanhNghe || 'Chưa cập nhật'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Mô tả giới thiệu chuyên môn</p>
                    <p className="font-medium text-gray-800 whitespace-pre-line">
                      {bs?.moTa || 'Chưa cập nhật mô tả giới thiệu'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {vaiTro === 'ky_thuat_vien' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Stethoscope className="h-5 w-5 text-primary-600" /> Hồ sơ Chuyên môn Kỹ thuật viên
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Chuyên môn / Bộ phận</p>
                    <p className="font-semibold text-primary-700">{ktv?.chuyenMon || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>
            )}


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
      )}
    </div>
  );
}
