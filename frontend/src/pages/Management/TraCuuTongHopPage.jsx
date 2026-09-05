import { useState } from 'react';
import { apiGet } from '../../services/api';
import { MedCard } from '../../design-system/components/Card/MedCard';
import {
  Search, Users, User, Phone, Mail, MapPin, CreditCard,
  HeartPulse, Shield, FileText, CheckCircle2, ChevronRight, Activity
} from 'lucide-react';

export default function TraCuuTongHopPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ nhanSu: [], benhNhan: [] });
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('nhanSu');
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!keyword.trim() || loading) return;
    setLoading(true);
    setSearched(true);
    setSelectedItem(null);
    try {
      const res = await apiGet(`/quan-ly/tra-cuu?keyword=${encodeURIComponent(keyword.trim())}`);
      setResult(res?.data || { nhanSu: [], benhNhan: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalResults = (result.nhanSu?.length || 0) + (result.benhNhan?.length || 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tra Cứu Hồ Sơ Tổng Hợp</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tìm kiếm xuyên suốt hồ sơ nhân sự phòng khám và hồ sơ thông tin bệnh nhân
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-5 w-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Nhập tên nhân viên, tên bệnh nhân, CCCD/CMND, SĐT, mã bệnh nhân..."
              className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!keyword.trim() || loading}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-colors shadow-xs"
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </form>
      </div>

      {/* Search Results */}
      {searched && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-3 border-b border-gray-200 pb-2">
            <button
              onClick={() => { setActiveTab('nhanSu'); setSelectedItem(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'nhanSu'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="h-4 w-4" />
              Hồ sơ Nhân sự ({result.nhanSu?.length || 0})
            </button>
            <button
              onClick={() => { setActiveTab('benhNhan'); setSelectedItem(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'benhNhan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HeartPulse className="h-4 w-4" />
              Hồ sơ Bệnh nhân ({result.benhNhan?.length || 0})
            </button>
          </div>

          {/* Results Grid + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List column */}
            <div className="lg:col-span-2 space-y-3">
              {activeTab === 'nhanSu' && (
                result.nhanSu?.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-xs">
                    Không tìm thấy nhân viên nào phù hợp với từ khóa "{keyword}"
                  </div>
                ) : (
                  result.nhanSu.map(nv => (
                    <div
                      key={nv.id}
                      onClick={() => setSelectedItem(nv)}
                      className={`bg-white rounded-2xl border p-4 shadow-2xs hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between ${
                        selectedItem?.id === nv.id ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{nv.hoTen}</p>
                          <p className="text-xs text-gray-500">{nv.chucVu} • SĐT: {nv.soDienThoai || 'Chưa có'}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))
                )
              )}

              {activeTab === 'benhNhan' && (
                result.benhNhan?.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-xs">
                    Không tìm thấy bệnh nhân nào phù hợp với từ khóa "{keyword}"
                  </div>
                ) : (
                  result.benhNhan.map(bn => (
                    <div
                      key={bn.id}
                      onClick={() => setSelectedItem(bn)}
                      className={`bg-white rounded-2xl border p-4 shadow-2xs hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between ${
                        selectedItem?.id === bn.id ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <HeartPulse className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {bn.hoTen} <span className="font-mono text-xs text-emerald-700 font-bold ml-1">({bn.maBenhNhan})</span>
                          </p>
                          <p className="text-xs text-gray-500">Giới tính: {bn.gioiTinh} • SĐT: {bn.soDienThoai || 'Chưa có'}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))
                )
              )}
            </div>

            {/* Detail Preview Column */}
            <div>
              {selectedItem ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4 sticky top-6">
                  <h3 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary-600" />
                    Thông Tin Chi Tiết
                  </h3>

                  {activeTab === 'nhanSu' ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-gray-400 font-medium">Họ và tên</p>
                        <p className="font-bold text-gray-900 text-sm">{selectedItem.hoTen}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Chức vụ / Vai trò</p>
                        <p className="font-semibold text-blue-700">{selectedItem.chucVu} ({selectedItem.vaiTro})</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Số điện thoại</p>
                        <p className="font-semibold text-gray-800">{selectedItem.soDienThoai || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Email</p>
                        <p className="font-semibold text-gray-800">{selectedItem.email || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">CCCD / CMND</p>
                        <p className="font-semibold text-gray-800">{selectedItem.soCmnd || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Địa chỉ</p>
                        <p className="font-semibold text-gray-800">{selectedItem.diaChi || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-gray-400 font-medium">Mã bệnh nhân</p>
                        <p className="font-mono font-bold text-emerald-700 text-sm">{selectedItem.maBenhNhan}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Họ và tên</p>
                        <p className="font-bold text-gray-900 text-sm">{selectedItem.hoTen}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Số điện thoại</p>
                        <p className="font-semibold text-gray-800">{selectedItem.soDienThoai || 'Chưa có'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Nhóm máu / Dị ứng</p>
                        <p className="font-semibold text-gray-800">{selectedItem.nhomMau || 'Chưa rõ'} • {selectedItem.diUng || 'Không'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-medium">Địa chỉ</p>
                        <p className="font-semibold text-gray-800">{selectedItem.diaChi || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-400">
                  Chọn một bản ghi để xem thông tin chi tiết
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

