import { useState, useEffect, useMemo } from 'react';
import { Search, CreditCard, Filter, RefreshCw, CheckCircle2, Clock, Printer } from 'lucide-react';
import { apiGet } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import ThanhToanModal from './ThanhToanModal';
import InHoaDonModal from './InHoaDonModal';

export default function HoaDonListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'cho_thanh_toan' | 'da_thanh_toan'
  const [selectedHoaDonId, setSelectedHoaDonId] = useState(null);
  const [printInvoiceData, setPrintInvoiceData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/thanh-toan/danh-sach');
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
        item.maHoaDon?.toLowerCase().includes(term) ||
        item.benhNhan?.hoTen?.toLowerCase().includes(term) ||
        item.benhNhan?.soDienThoai?.includes(term);
      return matchStatus && matchSearch;
    });
  }, [list, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý Thu ngân & Hóa đơn</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi, thanh toán viện phí và in phiếu thu cho bệnh nhân
          </p>
        </div>
        <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Tải lại danh sách
        </MedButton>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-200">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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
            onClick={() => setFilterStatus('cho_thanh_toan')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'cho_thanh_toan'
                ? 'bg-warning-main text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Chờ thanh toán ({list.filter((i) => i.trangThai === 'cho_thanh_toan').length})
          </button>
          <button
            onClick={() => setFilterStatus('da_thanh_toan')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterStatus === 'da_thanh_toan'
                ? 'bg-success-main text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã thanh toán ({list.filter((i) => i.trangThai === 'da_thanh_toan').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã HD, Tên BN, SĐT..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3"></div>
            Đang tải dữ liệu hóa đơn...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không tìm thấy hóa đơn nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-3.5">Mã Hóa đơn</th>
                  <th className="px-6 py-3.5">Bệnh nhân</th>
                  <th className="px-6 py-3.5 text-right">Tổng tiền</th>
                  <th className="px-6 py-3.5 text-right">Thực thu</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5">Ngày tạo</th>
                  <th className="px-6 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((hd) => (
                  <tr key={hd.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{hd.maHoaDon}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{hd.benhNhan?.hoTen}</div>
                      <div className="text-xs text-gray-500">
                        {hd.benhNhan?.maBenhNhan} · {hd.benhNhan?.soDienThoai}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">
                      {formatCurrency(hd.tongTien)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary-600">
                      {formatCurrency(hd.thucThu)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={hd.trangThai === 'da_thanh_toan' ? 'hoan_thanh' : 'cho_kham'}
                      />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {formatDateTime(hd.ngayTao)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <MedButton
                          size="sm"
                          variant={hd.trangThai === 'da_thanh_toan' ? 'secondary' : 'primary'}
                          onClick={() => setSelectedHoaDonId(hd.id)}
                        >
                          {hd.trangThai === 'da_thanh_toan' ? 'Xem chi tiết' : 'Thu tiền'}
                        </MedButton>
                        {hd.trangThai === 'da_thanh_toan' && (
                          <button
                            onClick={async () => {
                              const res = await apiGet(`/thanh-toan/${hd.id}`);
                              setPrintInvoiceData(res?.data || res);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                            title="In phiếu thu viện phí"
                          >
                            <Printer className="h-4 w-4" />
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

      {/* Modal Thanh toán */}
      {selectedHoaDonId && (
        <ThanhToanModal
          hoaDonId={selectedHoaDonId}
          onClose={() => setSelectedHoaDonId(null)}
          onSuccess={fetchData}
        />
      )}

      {/* Modal In Hóa Đơn / Phiếu Thu */}
      {printInvoiceData && (
        <InHoaDonModal
          hoaDon={printInvoiceData}
          onClose={() => setPrintInvoiceData(null)}
        />
      )}
    </div>
  );
}

