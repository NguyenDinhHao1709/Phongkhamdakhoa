import { useState, useEffect, useMemo } from 'react';
import { Search, Pill, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { apiGet } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatDateTime } from '../../utils/formatDate';
import CapPhatThuocModal from './CapPhatThuocModal';

export default function DonThuocListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDonThuocId, setSelectedDonThuocId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/nha-thuoc/don-thuoc');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const matchStatus = filterStatus === 'all' || item.trangThai === filterStatus;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.maDonThuoc?.toLowerCase().includes(term) ||
        item.bacSi?.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [list, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cấp phát Đơn thuốc</h1>
          <p className="text-sm text-gray-500 mt-1">
            Duyệt đơn thuốc từ Bác sĩ & Xuất kho cấp phát theo chuẩn FEFO
          </p>
        </div>
        <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Tải lại danh sách
        </MedButton>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-200">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({list.length})
          </button>
          <button
            onClick={() => setFilterStatus('cho_duyet')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'cho_duyet'
                ? 'bg-warning-main text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Chờ cấp phát ({list.filter((i) => i.trangThai === 'cho_duyet').length})
          </button>
          <button
            onClick={() => setFilterStatus('da_cap_phat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'da_cap_phat'
                ? 'bg-success-main text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã cấp phát ({list.filter((i) => i.trangThai === 'da_cap_phat').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã đơn, Bác sĩ kê..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3"></div>
            Đang tải đơn thuốc...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Không tìm thấy đơn thuốc nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-3.5">Mã Đơn thuốc</th>
                  <th className="px-6 py-3.5">Bác sĩ kê đơn</th>
                  <th className="px-6 py-3.5 text-center">Số món thuốc</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5">Ngày kê</th>
                  <th className="px-6 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((dt) => (
                  <tr key={dt.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{dt.maDonThuoc}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{dt.bacSi}</td>
                    <td className="px-6 py-4 text-center font-semibold text-primary-600">
                      {dt.soLuongMon} loại
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={dt.trangThai === 'da_cap_phat' ? 'hoan_thanh' : 'cho_kham'}
                      />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {formatDateTime(dt.ngayKe)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <MedButton
                        size="sm"
                        variant={dt.trangThai === 'da_cap_phat' ? 'secondary' : 'primary'}
                        onClick={() => setSelectedDonThuocId(dt.id)}
                      >
                        {dt.trangThai === 'da_cap_phat' ? 'Xem chi tiết' : 'Duyệt & Cấp phát'}
                      </MedButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cấp phát */}
      {selectedDonThuocId && (
        <CapPhatThuocModal
          donThuocId={selectedDonThuocId}
          onClose={() => setSelectedDonThuocId(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

