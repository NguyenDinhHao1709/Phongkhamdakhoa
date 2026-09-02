import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Plus, CheckCircle, XCircle, RefreshCw, UserCheck, Stethoscope, Clock, ShieldCheck, Eye, Phone, User, FileText, MapPin } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { formatDate } from '../../../utils/formatDate';

export default function LichHenQuanLyPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(''); // Mặc định rỗng để lấy tất cả lịch hẹn
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBacSiId, setFilterBacSiId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bacSiList, setBacSiList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLichHen, setSelectedLichHen] = useState(null); // Modal Xem Chi Tiết

  // Form tạo lịch hẹn mới tại quầy
  const [formData, setFormData] = useState({
    hoTen: '',
    soDienThoai: '',
    ngayHen: new Date().toISOString().split('T')[0],
    gioHen: '08:00',
    bacSiId: '',
    lyDoKham: '',
  });

  useEffect(() => {
    fetchBacSi();
    fetchData();
  }, [filterDate, filterStatus, filterBacSiId]);

  const fetchBacSi = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) setBacSiList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.ngay = filterDate;
      if (filterStatus) params.trangThai = filterStatus;
      if (filterBacSiId) params.bacSiId = filterBacSiId;

      const res = await apiGet('/lich-hen', params);
      if (res.data) setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus, currentVersion = 0) => {
    try {
      await apiPatch(`/lich-hen/${id}/trang-thai`, {
        trangThai: newStatus,
        phienBan: currentVersion,
      });
      fetchData();
      if (selectedLichHen?.id === id) {
        setSelectedLichHen((prev) => prev ? { ...prev, trangThai: newStatus } : null);
      }
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/lich-hen', {
        hoTen: formData.hoTen,
        soDienThoai: formData.soDienThoai,
        bacSiId: formData.bacSiId ? Number(formData.bacSiId) : null,
        ngayHen: formData.ngayHen,
        gioHen: formData.gioHen,
        lyDoKham: formData.lyDoKham || 'Đăng ký đặt lịch trực tiếp tại quầy tiếp tân',
      });
      alert('Đã đăng ký lịch hẹn tại quầy tiếp tân thành công!');
      setShowAddModal(false);
      setFormData({
        hoTen: '',
        soDienThoai: '',
        ngayHen: new Date().toISOString().split('T')[0],
        gioHen: '08:00',
        bacSiId: '',
        lyDoKham: '',
      });
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi khi đăng ký lịch hẹn');
    }
  };

  // Lọc tìm kiếm theo từ khóa
  const filteredList = list.filter((lh) => {
    const kw = searchKeyword.toLowerCase().trim();
    const bnName = (lh.benhNhan?.hoTen || '').toLowerCase();
    const bnPhone = (lh.benhNhan?.soDienThoai || '').toLowerCase();
    const bsName = (lh.bacSi?.nhanVien?.hoTen || '').toLowerCase();
    const ma = (lh.maLichHen || '').toLowerCase();
    return !kw || bnName.includes(kw) || bnPhone.includes(kw) || bsName.includes(kw) || ma.includes(kw);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý Lịch hẹn Tiếp tân</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu, xem chi tiết, lọc và duyệt danh sách lịch hẹn của bệnh nhân đăng ký khám
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Làm mới
          </MedButton>
          <MedButton variant="primary" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Đặt lịch tại quầy
          </MedButton>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tìm theo từ khóa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên BN, SĐT, mã lịch..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
          />
        </div>

        {/* Lọc theo Ngày */}
        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
          />
        </div>

        {/* Lọc theo Bác sĩ */}
        <div>
          <select
            value={filterBacSiId}
            onChange={(e) => setFilterBacSiId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
          >
            <option value="">-- Tất cả Bác sĩ --</option>
            {bacSiList.map((bs) => (
              <option key={bs.id} value={bs.id}>
                {bs.hoTen} ({bs.chuyenKhoa})
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Trạng thái */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
          >
            <option value="">-- Tất cả Trạng thái --</option>
            <option value="cho_thanh_toan">Chờ thanh toán tạm ứng</option>
            <option value="cho_xac_nhan">Chờ xác nhận</option>
            <option value="da_xac_nhan">Đã xác nhận</option>
            <option value="hoan_thanh">Hoàn thành</option>
            <option value="da_huy">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Đếm tổng số & Nút reset ngày */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Hiển thị <strong>{filteredList.length}</strong> lịch hẹn</span>
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className="text-primary-600 font-semibold hover:underline"
          >
            Xem tất cả các ngày
          </button>
        )}
      </div>

      {/* Danh sách Lịch hẹn (Bảng Quản lý) */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3" />
            Đang tải danh sách lịch hẹn...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto" />
            <p>Không có lịch hẹn nào phù hợp với bộ lọc.</p>
            {filterDate && (
              <MedButton variant="ghost" size="sm" onClick={() => setFilterDate('')}>
                Xem tất cả các ngày
              </MedButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Mã Lịch Hẹn</th>
                  <th className="px-4 py-3">Bệnh Nhân</th>
                  <th className="px-4 py-3">Ngày & Giờ Hẹn</th>
                  <th className="px-4 py-3">Bác Sĩ / Chuyên Khoa</th>
                  <th className="px-4 py-3">Tạm Ứng (1/5)</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((lh) => (
                  <tr key={lh.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-gray-900">{lh.maLichHen}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">{lh.benhNhan?.hoTen || 'Bệnh nhân'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lh.benhNhan?.soDienThoai || '---'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{formatDate(lh.ngayHen)}</p>
                      <p className="text-xs font-bold text-primary-700">{lh.gioHen}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {lh.bacSi?.nhanVien?.hoTen ? (
                        <div>
                          <p className="font-semibold text-gray-900">{lh.bacSi.nhanVien.hoTen}</p>
                          <p className="text-xs text-gray-500">{lh.bacSi.chuyenKhoa}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Khám tự do / Bác sĩ trực</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3.5 w-3.5" /> 40.000 đ
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={lh.trangThai === 'da_xac_nhan' ? 'hoan_thanh' : lh.trangThai === 'da_huy' ? 'da_huy' : 'cho_kham'} />
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedLichHen(lh)}
                        className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                      </button>

                      {lh.trangThai !== 'da_xac_nhan' && lh.trangThai !== 'da_huy' && (
                        <button
                          onClick={() => handleUpdateStatus(lh.id, 'da_xac_nhan', lh.phienBan)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                        >
                          Duyệt
                        </button>
                      )}
                      {lh.trangThai !== 'da_huy' && (
                        <button
                          onClick={() => handleUpdateStatus(lh.id, 'da_huy', lh.phienBan)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xem Chi Tiết Lịch Hẹn */}
      {selectedLichHen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                  {selectedLichHen.maLichHen}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">Chi tiết Lịch hẹn Khám bệnh</h3>
              </div>
              <button onClick={() => setSelectedLichHen(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                <p className="text-xs text-gray-500">Thông tin Bệnh nhân:</p>
                <p className="font-bold text-gray-900 text-base">{selectedLichHen.benhNhan?.hoTen || 'Bệnh nhân'}</p>
                <p className="text-xs text-gray-600">Số điện thoại: <strong>{selectedLichHen.benhNhan?.soDienThoai || '---'}</strong></p>
                <p className="text-xs text-gray-600">Email: <strong>{selectedLichHen.benhNhan?.email || '---'}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary-50/50 p-3 rounded-xl">
                  <p className="text-xs text-gray-500">Thời gian hẹn khám:</p>
                  <p className="font-bold text-primary-700">{selectedLichHen.gioHen}</p>
                  <p className="text-xs text-gray-800">{formatDate(selectedLichHen.ngayHen)}</p>
                </div>
                <div className="bg-primary-50/50 p-3 rounded-xl">
                  <p className="text-xs text-gray-500">Bác sĩ phụ trách:</p>
                  <p className="font-bold text-gray-900">{selectedLichHen.bacSi?.nhanVien?.hoTen || 'Bác sĩ trực'}</p>
                  <p className="text-xs text-gray-600">{selectedLichHen.bacSi?.chuyenKhoa || 'Đa khoa'}</p>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-800 font-medium">Khoản tạm ứng xác nhận (1/5 phí khám):</p>
                  <p className="text-base font-extrabold text-emerald-700">40.000 đ</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  Đã cọc 100%
                </span>
              </div>

              {selectedLichHen.lyDoKham && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Lý do khám / Triệu chứng:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-xl text-gray-800 mt-1">{selectedLichHen.lyDoKham}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <MedButton variant="ghost" onClick={() => setSelectedLichHen(null)}>Đóng</MedButton>
              {selectedLichHen.trangThai !== 'da_xac_nhan' && selectedLichHen.trangThai !== 'da_huy' && (
                <MedButton
                  variant="primary"
                  onClick={() => handleUpdateStatus(selectedLichHen.id, 'da_xac_nhan', selectedLichHen.phienBan)}
                >
                  Duyệt lịch hẹn
                </MedButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Lịch Hẹn Trực Tiếp Tại Quầy */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Đăng ký Lịch hẹn trực tiếp tại Quầy</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Họ và tên bệnh nhân *</label>
                <input
                  type="text"
                  required
                  value={formData.hoTen}
                  onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                  placeholder="Nhập họ tên bệnh nhân..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  value={formData.soDienThoai}
                  onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                  placeholder="0912345678..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ngày hẹn *</label>
                  <input
                    type="date"
                    required
                    value={formData.ngayHen}
                    onChange={(e) => setFormData({ ...formData, ngayHen: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Giờ hẹn *</label>
                  <select
                    value={formData.gioHen}
                    onChange={(e) => setFormData({ ...formData, gioHen: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                  >
                    {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:30', '14:00', '14:30', '15:00', '15:30'].map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Bác sĩ khám (Tùy chọn)</label>
                <select
                  value={formData.bacSiId}
                  onChange={(e) => setFormData({ ...formData, bacSiId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Khám với Bác sĩ bất kỳ --</option>
                  {bacSiList.map((bs) => (
                    <option key={bs.id} value={bs.id}>
                      {bs.hoTen} ({bs.chuyenKhoa || 'Đa khoa'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Lý do khám / Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.lyDoKham}
                  onChange={(e) => setFormData({ ...formData, lyDoKham: e.target.value })}
                  placeholder="Triệu chứng ban đầu..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <MedButton variant="ghost" type="button" onClick={() => setShowAddModal(false)}>Hủy bỏ</MedButton>
                <MedButton variant="primary" type="submit">Xác nhận đăng ký</MedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
