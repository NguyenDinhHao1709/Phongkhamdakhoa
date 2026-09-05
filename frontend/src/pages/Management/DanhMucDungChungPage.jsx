import { useState, useEffect } from 'react';
import {
  Layers, Stethoscope, DoorOpen, TestTube2, Pill, Search, RefreshCw, CheckCircle2,
  AlertCircle, Plus, Eye
} from 'lucide-react';
import { apiGet } from '../../services/api';

export default function DanhMucDungChungPage() {
  const [activeTab, setActiveTab] = useState('phong_ban'); // 'phong_ban' | 'phong_kham' | 'dich_vu' | 'thuoc'
  const [data, setData] = useState({ phongBans: [], phongKhams: [], dichVus: [], thuocs: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDanhMuc = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/quan-ly/danh-muc-tong-hop');
      const d = res?.data || res;
      setData(d || { phongBans: [], phongKhams: [], dichVus: [], thuocs: [] });
    } catch (err) {
      console.error('Lỗi tải danh mục dùng chung:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDanhMuc();
  }, []);

  const tabs = [
    { id: 'phong_ban', label: 'Khoa / Phòng Ban', icon: Stethoscope, count: data.phongBans?.length || 0 },
    { id: 'phong_kham', label: 'Phòng Khám Thực Tế', icon: DoorOpen, count: data.phongKhams?.length || 0 },
    { id: 'dich_vu', label: 'Dịch Vụ Kỹ Thuật (CLS)', icon: TestTube2, count: data.dichVus?.length || 0 },
    { id: 'thuoc', label: 'Danh Mục Thuốc', icon: Pill, count: data.thuocs?.length || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Layers className="h-3.5 w-3.5" /> MASTER DATA MANAGEMENT
          </div>
          <h1 className="text-2xl font-black text-gray-900">Quản Lý Danh Mục Dùng Chung</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản trị chuẩn hóa dữ liệu nền tảng: Chuyên khoa, phòng khám, danh mục dịch vụ cận lâm sàng và danh mục dược.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDanhMuc}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm theo mã, tên danh mục..."
          className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Đang tải danh mục...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'phong_ban' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mã phòng ban</th>
                    <th className="px-6 py-3">Tên khoa / Phòng ban</th>
                    <th className="px-6 py-3">Mô tả chức năng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.phongBans
                    ?.filter(p => !searchTerm || p.ten_phong_ban?.toLowerCase().includes(searchTerm.toLowerCase()) || p.ma_phong_ban?.toLowerCase().includes(searchTerm.toLowerCase()))
                    ?.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs">#{p.id}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-primary-700">{p.ma_phong_ban}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{p.ten_phong_ban}</td>
                        <td className="px-6 py-3.5 text-gray-500 text-xs">{p.mo_ta || 'Khoa chuyên môn'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'phong_kham' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mã phòng</th>
                    <th className="px-6 py-3">Tên phòng khám</th>
                    <th className="px-6 py-3">Vị trí tầng / khu</th>
                    <th className="px-6 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.phongKhams
                    ?.filter(p => !searchTerm || p.ten_phong?.toLowerCase().includes(searchTerm.toLowerCase()) || p.ma_phong?.toLowerCase().includes(searchTerm.toLowerCase()))
                    ?.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs">#{p.id}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-primary-700">{p.ma_phong}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{p.ten_phong}</td>
                        <td className="px-6 py-3.5 text-gray-600 text-xs">{p.vi_tri || 'Tầng 1'}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {p.trang_thai || 'Hoạt động'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'dich_vu' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mã dịch vụ</th>
                    <th className="px-6 py-3">Tên dịch vụ kỹ thuật</th>
                    <th className="px-6 py-3 text-right">Đơn giá niêm yết</th>
                    <th className="px-6 py-3 text-center">Thời gian trả KQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.dichVus
                    ?.filter(d => !searchTerm || d.ten_dich_vu?.toLowerCase().includes(searchTerm.toLowerCase()) || d.ma_dich_vu?.toLowerCase().includes(searchTerm.toLowerCase()))
                    ?.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs">#{d.id}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-indigo-700">{d.ma_dich_vu}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{d.ten_dich_vu}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-emerald-700 text-right">
                          {Number(d.gia_tien || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs text-gray-500 font-medium">
                          {d.thoi_gian_tra_kq_phut ? `${d.thoi_gian_tra_kq_phut} phút` : '30 phút'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'thuoc' && (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Mã thuốc</th>
                    <th className="px-6 py-3">Tên thuốc biệt dược</th>
                    <th className="px-6 py-3">Hoạt chất chính</th>
                    <th className="px-6 py-3">Đơn vị</th>
                    <th className="px-6 py-3 text-right">Giá bán lẻ</th>
                    <th className="px-6 py-3 text-right">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.thuocs
                    ?.filter(t => !searchTerm || t.ten_thuoc?.toLowerCase().includes(searchTerm.toLowerCase()) || t.hoat_chat?.toLowerCase().includes(searchTerm.toLowerCase()))
                    ?.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-gray-500 text-xs">#{t.id}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-purple-700">{t.ma_thuoc}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-900">{t.ten_thuoc}</td>
                        <td className="px-6 py-3.5 text-xs text-gray-600">{t.hoat_chat || '—'}</td>
                        <td className="px-6 py-3.5 text-xs text-gray-600">{t.don_vi_tinh}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-emerald-700 text-right">
                          {Number(t.gia_ban || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-gray-800 text-right">
                          {t.so_luong_ton || 0}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
