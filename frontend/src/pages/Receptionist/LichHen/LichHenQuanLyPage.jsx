import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Plus, CheckCircle, XCircle, RefreshCw, UserCheck, Stethoscope, Clock, ShieldCheck, Eye, Phone, User, FileText, MapPin, Mail } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { formatDate } from '../../../utils/formatDate';

const CHUYEN_KHOA_LIST = ['Nội tổng quát', 'Ngoại khoa', 'Nhi khoa', 'Tai Mũi Họng', 'Tim mạch', 'Cơ Xương Khớp', 'Răng Hàm Mặt', 'Mắt'];

export default function LichHenQuanLyPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [filterDate, setFilterDate] = useState(''); // Mặc định rỗng để lấy tất cả lịch hẹn
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBacSiId, setFilterBacSiId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bacSiList, setBacSiList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLichHen, setSelectedLichHen] = useState(null); // Modal Xem Chi Tiết

  // Quản lý bệnh nhân khi Tiếp nhận khám ngay
  const [patientMode, setPatientMode] = useState('account'); // 'account' | 'manual'
  const [patientAccounts, setPatientAccounts] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form tạo lịch hẹn mới tại quầy
  const [formData, setFormData] = useState({
    benhNhanId: null,
    hoTen: '',
    soDienThoai: '',
    ngayHen: new Date().toISOString().split('T')[0],
    gioHen: '08:00',
    chuyenKhoa: '',
    bacSiId: '',
    lyDoKham: '',
  });

  useEffect(() => {
    fetchBacSi();
    fetchData();
  }, [filterDate, filterStatus, filterBacSiId]);

  const normalizeText = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };

  const fetchPatientAccounts = async () => {
    setLoadingPatients(true);
    try {
      const res = await apiGet('/benh-nhan', { limit: 200 });
      const items = res?.data || [];
      const withAccounts = items.filter(
        (p) => p.nguoiDungId != null || p.nguoi_dung_id != null || p.nguoiDung != null
      );
      setPatientAccounts(withAccounts);
    } catch (err) {
      console.error('Lỗi lấy danh sách bệnh nhân có tài khoản:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      fetchPatientAccounts();
    }
  }, [showAddModal]);

  const filteredPatientAccounts = patientAccounts.filter((p) => {
    if (!patientSearch.trim()) return true;
    const s = normalizeText(patientSearch);
    return (
      normalizeText(p.hoTen).includes(s) ||
      normalizeText(p.soDienThoai).includes(s) ||
      normalizeText(p.maBenhNhan).includes(s) ||
      normalizeText(p.email).includes(s) ||
      normalizeText(p.nguoiDung?.tenDangNhap).includes(s)
    );
  });

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

  const handleAutoAssign = async (id) => {
    try {
      await apiPost(`/lich-hen/${id}/tu-dong-phan-cong`);
      alert('Đã tự động tìm và phân công bác sĩ phù hợp.');
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Chưa tìm được bác sĩ phù hợp cho lịch hẹn');
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      // Xác định chuyên khoa chính xác (nếu đã chọn bác sĩ cụ thể, dùng chuyên khoa của bác sĩ đó để đảm bảo tương thích)
      let chosenSpecialty = formData.chuyenKhoa;
      if (formData.bacSiId) {
        const foundDoctor = bacSiList.find((bs) => bs.id === Number(formData.bacSiId));
        if (foundDoctor?.chuyenKhoa) {
          chosenSpecialty = foundDoctor.chuyenKhoa;
        }
      }

      // Backend tự động map hồ sơ bệnh nhân và tài khoản thông qua số điện thoại
      const payload = {
        hoTen: formData.hoTen.trim(),
        soDienThoai: formData.soDienThoai.trim(),
        bacSiId: formData.bacSiId ? Number(formData.bacSiId) : null,
        chuyenKhoa: chosenSpecialty,
        ghiChu: formData.lyDoKham,
      };

      const res = await apiPost('/tiep-nhan/tai-quay', payload);
      alert(`Đã tiếp nhận bệnh nhân vào hàng đợi thành công!\n${res?.message || ''}`);
      setShowAddModal(false);
      setSelectedPatient(null);
      setFormData({
        benhNhanId: null,
        hoTen: '',
        soDienThoai: '',
        ngayHen: new Date().toISOString().split('T')[0],
        gioHen: '08:00',
        chuyenKhoa: '',
        bacSiId: '',
        lyDoKham: '',
      });
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi khi tiếp nhận khám ngay');
    }
  };

  const filteredBacSi = formData.chuyenKhoa
    ? bacSiList.filter((bs) => (bs.chuyenKhoa || '').toLowerCase().includes(formData.chuyenKhoa.toLowerCase()))
    : bacSiList;

  const handleTriggerReminder = async () => {
    setSendingReminder(true);
    try {
      const res = await apiPost('/lich-hen/nhac-lich-tu-dong');
      alert(`✓ KẾT QUẢ QUÉT NHẮC LỊCH:\n${res?.message || 'Đã gửi nhắc lịch thành công!'}`);
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không thể gửi nhắc lịch tự động');
    } finally {
      setSendingReminder(false);
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tiếp nhận & quản lý lịch hẹn</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lịch hẹn đặt trước được quản lý riêng; bệnh nhân đến khám ngay dùng nút Tiếp nhận khám ngay để vào hàng đợi.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MedButton
            variant="secondary"
            onClick={handleTriggerReminder}
            loading={sendingReminder}
            leftIcon={<Mail className="h-4 w-4 text-blue-600" />}
          >
            Quét & Nhắc lịch Email 24h
          </MedButton>
          <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Làm mới
          </MedButton>
          <MedButton variant="primary" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Tiếp nhận khám ngay
          </MedButton>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm (Khối nền xám nhạt phân tách rõ ràng) */}
      <div className="rounded-2xl bg-gray-50/90 p-4 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tìm theo từ khóa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên BN, SĐT, mã lịch..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
          />
        </div>

        {/* Lọc theo Ngày */}
        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
          />
        </div>

        {/* Lọc theo Bác sĩ */}
        <div>
          <select
            value={filterBacSiId}
            onChange={(e) => setFilterBacSiId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
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
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800"
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

      {/* Danh sách Lịch hẹn (Bảng Quản lý Chuẩn Doanh nghiệp Y tế) */}
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
                  <th className="px-4 py-3.5">Mã Lịch Hẹn</th>
                  <th className="px-4 py-3.5">Bệnh Nhân</th>
                  <th className="px-4 py-3.5">Ngày & Giờ Hẹn</th>
                  <th className="px-4 py-3.5">Bác Sĩ / Chuyên Khoa</th>
                  <th className="px-4 py-3.5">Tạm Ứng (1/5)</th>
                  <th className="px-4 py-3.5">Trạng Thái</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((lh) => (
                  <tr key={lh.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-gray-900 font-mono tracking-tight">{lh.maLichHen}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900">{lh.benhNhan?.hoTen || 'Bệnh nhân'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {lh.benhNhan?.soDienThoai || '---'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                        {lh.gioHen ? String(lh.gioHen).substring(0, 5) : '--:--'}
                      </p>
                      <p className="text-xs text-gray-500 font-normal mt-0.5">
                        {formatDate(lh.ngayHen)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {lh.bacSi?.nhanVien?.hoTen ? (
                        <div>
                          <p className="text-sm font-bold text-gray-900">{lh.bacSi.nhanVien.hoTen}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{lh.bacSi.chuyenKhoa || 'Chuyên khoa'}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold text-amber-700">Chờ phân công</p>
                          <p className="text-xs text-gray-500 mt-0.5">Chưa có bác sĩ phụ trách</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <ShieldCheck className="h-3.5 w-3.5" /> 40.000 đ
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={lh.trangThai} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLichHen(lh)}
                          title="Xem chi tiết"
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {!lh.bacSiId && lh.trangThai !== 'da_huy' && (
                          <button
                            onClick={() => handleAutoAssign(lh.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-primary-700 border border-primary-200 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            Phân công tự động
                          </button>
                        )}

                        {lh.trangThai !== 'da_xac_nhan' && lh.trangThai !== 'da_huy' && (
                          <button
                            onClick={() => handleUpdateStatus(lh.id, 'da_xac_nhan', lh.phienBan)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors"
                          >
                            Duyệt
                          </button>
                        )}
                        {lh.trangThai !== 'da_huy' && (
                          <button
                            onClick={() => handleUpdateStatus(lh.id, 'da_huy', lh.phienBan)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
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

      {/* Modal tiếp nhận bệnh nhân đến khám ngay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tiếp nhận bệnh nhân khám ngay</h3>
                <p className="text-xs text-gray-500">Cấp số thứ tự và phân phòng khám trực tiếp tại quầy</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Chuyển đổi: Bệnh nhân có tài khoản vs Bệnh nhân mới */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setPatientMode('account');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  patientMode === 'account'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Bệnh nhân đã có tài khoản ({patientAccounts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatientMode('manual');
                  setSelectedPatient(null);
                  setFormData((prev) => ({ ...prev, benhNhanId: null }));
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  patientMode === 'manual'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <User className="h-4 w-4" />
                Bệnh nhân mới / Vãng lai
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-sm">
              {patientMode === 'account' && (
                <div className="space-y-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-900">
                      Danh sách bệnh nhân đã đăng ký tài khoản *
                    </label>
                    {selectedPatient && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setFormData((prev) => ({ ...prev, benhNhanId: null, hoTen: '', soDienThoai: '' }));
                        }}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Chọn bệnh nhân khác
                      </button>
                    )}
                  </div>

                  {!selectedPatient ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Tìm nhanh theo Họ tên, SĐT, Mã BN..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 shadow-inner">
                        {loadingPatients ? (
                          <div className="p-4 text-center text-xs text-gray-500">Đang tải danh sách tài khoản...</div>
                        ) : filteredPatientAccounts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-500">
                            Không tìm thấy tài khoản bệnh nhân nào phù hợp. Bạn có thể chuyển sang tab &quot;Bệnh nhân mới / Vãng lai&quot;.
                          </div>
                        ) : (
                          filteredPatientAccounts.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedPatient(p);
                                setFormData((prev) => ({
                                  ...prev,
                                  benhNhanId: p.id,
                                  hoTen: p.hoTen,
                                  soDienThoai: p.soDienThoai || '',
                                }));
                              }}
                              className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900">{p.hoTen}</span>
                                  <span className="font-mono text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                    {p.maBenhNhan}
                                  </span>
                                </div>
                                <p className="text-gray-500 mt-0.5">
                                  SĐT: <span className="font-medium text-gray-700">{p.soDienThoai || 'Chưa cập nhật'}</span>
                                  {p.nguoiDung?.tenDangNhap && ` · TK: ${p.nguoiDung.tenDangNhap}`}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Đã có tài khoản
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-3 border border-blue-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{selectedPatient.hoTen}</span>
                          <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                            {selectedPatient.maBenhNhan}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          Đã liên kết tài khoản
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        SĐT: <span className="font-semibold text-gray-800">{selectedPatient.soDienThoai || 'Chưa có'}</span>
                        {selectedPatient.ngaySinh && ` · Ngày sinh: ${formatDate(selectedPatient.ngaySinh)}`}
                        {selectedPatient.gioiTinh && ` · Giới tính: ${selectedPatient.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}`}
                      </p>
                      <p className="text-[11px] text-blue-700 pt-1 font-medium flex items-center gap-1">
                        ✓ Thông tin phiếu khám và tiến độ khám sẽ tự động cập nhật ngay trên tài khoản của bệnh nhân này.
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Chuyên khoa *</label>
                <select
                  required
                  value={formData.chuyenKhoa}
                  onChange={(e) => setFormData({ ...formData, chuyenKhoa: e.target.value, bacSiId: '' })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Chọn chuyên khoa để hệ thống phân công --</option>
                  {CHUYEN_KHOA_LIST.map((ck) => <option key={ck} value={ck}>{ck}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Bác sĩ phụ trách (Tùy chọn)</label>
                <select
                  value={formData.bacSiId}
                  onChange={(e) => setFormData({ ...formData, bacSiId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Hệ thống tự chọn bác sĩ ít tải nhất --</option>
                  {filteredBacSi.map((bs) => (
                    <option key={bs.id} value={bs.id}>
                      {bs.hoTen} ({bs.chuyenKhoa || 'Đa khoa'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Triệu chứng / Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.lyDoKham}
                  onChange={(e) => setFormData({ ...formData, lyDoKham: e.target.value })}
                  placeholder="Triệu chứng ban đầu..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <MedButton
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedPatient(null);
                  }}
                >
                  Hủy bỏ
                </MedButton>
                <MedButton variant="primary" type="submit">
                  Đưa vào hàng đợi & Cấp STT
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
