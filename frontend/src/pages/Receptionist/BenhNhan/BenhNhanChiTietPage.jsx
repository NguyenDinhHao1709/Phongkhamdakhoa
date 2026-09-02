import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Activity,
  AlertTriangle, Save, Edit3, ShieldCheck, Clock, FileText, CheckCircle
} from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../../services/api';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { formatDate, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';

export default function BenhNhanChiTietPage({ isCreate = false, isEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(isEdit || isCreate);
  const [patient, setPatient] = useState(null);

  const [formData, setFormData] = useState({
    hoTen: '',
    ngaySinh: '',
    gioiTinh: 'nam',
    soDienThoai: '',
    soCmnd: '',
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
    if (!isCreate && id) {
      fetchPatient();
    }
  }, [id, isCreate]);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/benh-nhan/${id}`);
      if (res.data) {
        setPatient(res.data);
        setFormData({
          hoTen: res.data.hoTen || '',
          ngaySinh: res.data.ngaySinh || '',
          gioiTinh: res.data.gioiTinh || 'nam',
          soDienThoai: res.data.soDienThoai || '',
          soCmnd: res.data.soCmnd || '',
          email: res.data.email || '',
          diaChi: res.data.diaChi || '',
          nhomMau: res.data.nhomMau || '',
          diUng: res.data.diUng || '',
          tienSuBenh: res.data.tienSuBenh || '',
          ngheNghiep: res.data.ngheNghiep || '',
          nguoiThanLienHe: res.data.nguoiThanLienHe || '',
          sdtNguoiThan: res.data.sdtNguoiThan || '',
        });
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải thông tin bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Làm sạch payload: biến chuỗi rỗng '' thành null để tránh lỗi validation API DTO
    const cleanedPayload = {};
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      cleanedPayload[key] = val === '' ? null : val;
    });

    try {
      if (isCreate) {
        const res = await apiPost('/benh-nhan', cleanedPayload);
        alert('Tạo hồ sơ bệnh nhân mới thành công!');
        queryClient.invalidateQueries({ queryKey: ['benh-nhan'] });
        navigate(`/tiep-tan/benh-nhan/${res.data.id}`);
      } else {
        await apiPatch(`/benh-nhan/${id}`, cleanedPayload);
        alert('Cập nhật thông tin bệnh nhân thành công!');
        queryClient.invalidateQueries({ queryKey: ['benh-nhan'] });
        setEditMode(false);
        fetchPatient();
      }
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tiep-tan/benh-nhan')}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            title="Quay lại danh sách bệnh nhân"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isCreate ? 'Tạo Hồ Sơ Bệnh Nhân Mới' : (patient?.hoTen || 'Chi Tiết Bệnh Nhân')}
            </h1>
            {!isCreate && patient && (
              <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-primary-700">{patient.maBenhNhan}</span>
                <span>•</span>
                <span>{tinhTuoi(patient.ngaySinh) ? `${tinhTuoi(patient.ngaySinh)}` : 'Chưa có tuổi'}</span>
                <span>•</span>
                <span>{GIOI_TINH[patient.gioiTinh] || patient.gioiTinh}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCreate && !editMode && (
            <MedButton
              variant="secondary"
              leftIcon={<Edit3 className="h-4 w-4" />}
              onClick={() => setEditMode(true)}
            >
              Chỉnh sửa hồ sơ
            </MedButton>
          )}
          {!isCreate && (
            <MedButton
              variant="primary"
              leftIcon={<Calendar className="h-4 w-4" />}
              onClick={() => navigate('/tiep-tan/tiep-nhan')}
            >
              Tiếp nhận khám ngay
            </MedButton>
          )}
        </div>
      </div>

      {/* Main Content Form / View */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột Trái: Thông tin cá nhân cơ bản */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary-600" /> Thông Tin Hành Chính
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Họ và tên bệnh nhân *</label>
                  {editMode ? (
                    <input
                      type="text"
                      required
                      value={formData.hoTen}
                      onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-bold text-gray-900 text-base">{patient?.hoTen || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Số điện thoại *</label>
                  {editMode ? (
                    <input
                      type="text"
                      required
                      value={formData.soDienThoai}
                      onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900">{patient?.soDienThoai || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ngày sinh *</label>
                  {editMode ? (
                    <input
                      type="date"
                      required
                      value={formData.ngaySinh}
                      onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{formatDate(patient?.ngaySinh)}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Giới tính *</label>
                  {editMode ? (
                    <select
                      value={formData.gioiTinh}
                      onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="nam">Nam</option>
                      <option value="nu">Nữ</option>
                      <option value="khac">Khác</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900">{GIOI_TINH[patient?.gioiTinh] || patient?.gioiTinh || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Số CMND / CCCD</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.soCmnd}
                      onChange={(e) => setFormData({ ...formData, soCmnd: e.target.value })}
                      placeholder="12 chữ số..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-mono text-gray-900">{patient?.soCmnd || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email liên hệ</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="patient@gmail.com..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{patient?.email || '—'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Địa chỉ thường trú</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.diaChi}
                    onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{patient?.diaChi || 'Chưa cập nhật địa chỉ'}</p>
                )}
              </div>
            </div>

            {/* Thông tin tiền sử y tế & Dị ứng */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-600" /> Tiền Sử Y Tế & Dị Ứng
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-semibold text-red-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Tiền sử dị ứng (Thuốc / Thức ăn)
                  </label>
                  {editMode ? (
                    <textarea
                      rows={2}
                      value={formData.diUng}
                      onChange={(e) => setFormData({ ...formData, diUng: e.target.value })}
                      placeholder="Ví dụ: Dị ứng Penicillin, Hải sản..."
                      className="w-full p-2.5 rounded-xl border border-red-200 bg-red-50/30 focus:ring-2 focus:ring-red-500"
                    />
                  ) : patient?.diUng ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
                      <AlertTriangle className="h-4 w-4 text-red-600" /> {patient.diUng}
                    </span>
                  ) : (
                    <p className="text-gray-400 font-normal">Không có tiền sử dị ứng được ghi nhận</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tiền sử bệnh lý bản thân</label>
                  {editMode ? (
                    <textarea
                      rows={2}
                      value={formData.tienSuBenh}
                      onChange={(e) => setFormData({ ...formData, tienSuBenh: e.target.value })}
                      placeholder="Cao huyết áp, tiểu đường..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-800">{patient?.tienSuBenh || 'Chưa ghi nhận tiền sử bệnh lý'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Nhóm máu & Người thân liên hệ */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Chỉ Số Sinh Học
              </h3>

              <div className="text-sm space-y-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nhóm máu</label>
                  {editMode ? (
                    <select
                      value={formData.nhomMau}
                      onChange={(e) => setFormData({ ...formData, nhomMau: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- Chọn nhóm máu --</option>
                      <option value="A">Nhóm máu A</option>
                      <option value="B">Nhóm máu B</option>
                      <option value="AB">Nhóm máu AB</option>
                      <option value="O">Nhóm máu O</option>
                    </select>
                  ) : (
                    <p className="font-bold text-lg text-primary-700">{patient?.nhomMau ? `Nhóm máu ${patient.nhomMau}` : 'Chưa cập nhật'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nghề nghiệp</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.ngheNghiep}
                      onChange={(e) => setFormData({ ...formData, ngheNghiep: e.target.value })}
                      placeholder="Nghề nghiệp..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-800">{patient?.ngheNghiep || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary-600" /> Liên Hệ Khẩn Cấp
              </h3>

              <div className="text-sm space-y-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Họ tên người thân</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.nguoiThanLienHe}
                      onChange={(e) => setFormData({ ...formData, nguoiThanLienHe: e.target.value })}
                      placeholder="Tên người thân..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900">{patient?.nguoiThanLienHe || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SĐT người thân</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.sdtNguoiThan}
                      onChange={(e) => setFormData({ ...formData, sdtNguoiThan: e.target.value })}
                      placeholder="09xxx..."
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="font-mono text-gray-800">{patient?.sdtNguoiThan || '—'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        {editMode && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            {!isCreate && (
              <MedButton
                variant="ghost"
                type="button"
                onClick={() => setEditMode(false)}
              >
                Hủy bỏ
              </MedButton>
            )}
            <MedButton
              variant="primary"
              type="submit"
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isCreate ? 'Tạo hồ sơ bệnh nhân' : 'Lưu thay đổi hồ sơ'}
            </MedButton>
          </div>
        )}
      </form>
    </div>
  );
}

