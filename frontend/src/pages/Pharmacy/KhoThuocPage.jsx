import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiGet, apiDel } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatCurrency } from '../../utils/formatCurrency';
import AddEditThuocModal from './AddEditThuocModal';

export default function KhoThuocPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThuoc, setEditingThuoc] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/nha-thuoc/thuoc');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, tenThuoc) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${tenThuoc}" khỏi danh mục?`)) return;
    try {
      const res = await apiDel(`/nha-thuoc/thuoc/${id}`);
      alert(res?.message || 'Thao tác thành công!');
      fetchData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Không thể xóa thuốc này');
    }
  };

  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.tenThuoc?.toLowerCase().includes(term) ||
        item.maThuoc?.toLowerCase().includes(term) ||
        item.tenHoatChat?.toLowerCase().includes(term),
    );
  }, [list, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Danh mục Thuốc & Tồn kho</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu thông tin thuốc, quản lý danh mục và theo dõi số lượng kho khả dụng
          </p>
        </div>
        <div className="flex gap-2">
          <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Tải lại
          </MedButton>
          <MedButton
            variant="primary"
            onClick={() => {
              setEditingThuoc(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Thêm thuốc mới
          </MedButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-gray-200">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên thuốc, Hoạt chất, Mã thuốc..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3"></div>
            Đang tải danh mục kho thuốc...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Không tìm thấy loại thuốc nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-6 py-3.5">Mã thuốc</th>
                  <th className="px-6 py-3.5">Tên thuốc / Hoạt chất</th>
                  <th className="px-6 py-3.5 text-center">ĐVT</th>
                  <th className="px-6 py-3.5">Đường dùng / Hàm lượng</th>
                  <th className="px-6 py-3.5 text-right">Đơn giá bán</th>
                  <th className="px-6 py-3.5 text-center">Tồn kho tổng</th>
                  <th className="px-6 py-3.5 text-center">Trạng thái kho</th>
                  <th className="px-6 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{t.maThuoc}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{t.tenThuoc}</div>
                      <div className="text-xs text-gray-500">{t.tenHoatChat || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-gray-600">
                      {t.donViTinh}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {t.duongDung || '---'} · {t.hamLuong || ''}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(t.giaBan)}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-lg">
                      <span className={t.tonKhoTong <= 10 ? 'text-danger-main' : 'text-gray-900'}>
                        {t.tonKhoTong}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {t.tonKhoTong <= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-1 text-xs font-medium text-danger-700 border border-danger-200">
                          <AlertCircle className="h-3 w-3" /> Hết hàng
                        </span>
                      ) : t.tonKhoTong <= 10 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning-main border border-warning-main/20">
                          Sắp hết hàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success-main border border-success-main/20">
                          <CheckCircle2 className="h-3 w-3" /> Sẵn sàng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingThuoc(t);
                            setIsModalOpen(true);
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                          title="Chỉnh sửa thuốc"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.tenThuoc)}
                          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-danger-main transition-colors"
                          title="Xóa thuốc"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh sửa Thuốc */}
      {isModalOpen && (
        <AddEditThuocModal
          thuoc={editingThuoc}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

