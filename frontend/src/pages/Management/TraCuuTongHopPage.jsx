import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../../services/api';
import {
  Search, Users, User, Phone, Mail, MapPin, CreditCard,
  HeartPulse, Shield, FileText, CheckCircle2, ChevronRight, Activity,
  RefreshCw, Filter, Calendar, Stethoscope, Eye, AlertTriangle, Building2,
  X
} from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

export default function TraCuuTongHopPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ nhanSu: [], benhNhan: [] });
  const [activeTab, setActiveTab] = useState('benhNhan'); // 'benhNhan' | 'nhanSu'
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterRole, setFilterRole] = useState('all');

  // Tự động tải danh sách tổng hợp ngay khi Giám Đốc vào trang
  const fetchData = async (searchTerm = '') => {
    setLoading(true);
    try {
      const res = await apiGet(`/quan-ly/tra-cuu?keyword=${encodeURIComponent(searchTerm.trim())}`);
      const raw = res?.data?.data || res?.data || res || {};
      const ns = Array.isArray(raw.nhanSu) ? raw.nhanSu : [];
      const bn = Array.isArray(raw.benhNhan) ? raw.benhNhan : [];
      setResult({ nhanSu: ns, benhNhan: bn });
      // Tự động chọn bản ghi đầu tiên nếu chưa có
      if (!selectedItem) {
        if (activeTab === 'benhNhan' && bn.length > 0) setSelectedItem(bn[0]);
        else if (activeTab === 'nhanSu' && ns.length > 0) setSelectedItem(ns[0]);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu tra cứu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData(keyword);
  };

  const handleResetSearch = () => {
    setKeyword('');
    fetchData('');
  };

  // Lọc theo vai trò nhân sự nếu đang ở tab Nhân sự
  const filteredNhanSu = useMemo(() => {
    if (filterRole === 'all') return result.nhanSu;
    return result.nhanSu.filter(nv => nv.vaiTro === filterRole || nv.chucVu?.toLowerCase().includes(filterRole.toLowerCase()));
  }, [result.nhanSu, filterRole]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ─── HEADER BAN GIÁM ĐỐC ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              Tra Cứu Dữ Liệu Toàn Viện
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Tra Cứu Hồ Sơ Tổng Hợp
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tìm kiếm và tra cứu toàn diện hồ sơ bệnh nhân, hồ sơ y bác sĩ và nhân sự phòng khám
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(keyword)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Làm Mới Dữ Liệu
          </button>
        </div>
      </div>

      {/* ─── THANH TÌM KIẾM TỔNG HỢP ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Nhập tên bệnh nhân, số điện thoại, mã bệnh nhân (BN...), tên bác sĩ, CCCD..."
              className="w-full text-sm pl-11 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-medium"
            />
            {keyword && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl text-sm transition-colors shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tìm Kiếm
          </button>
        </form>
      </div>

      {/* ─── TABS CHỌN ĐỐI TƯỢNG TRA CỨU ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('benhNhan'); setSelectedItem(result.benhNhan[0] || null); }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'benhNhan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <HeartPulse className="h-4 w-4" />
            Hồ Sơ Bệnh Nhân ({result.benhNhan?.length || 0})
          </button>

          <button
            onClick={() => { setActiveTab('nhanSu'); setSelectedItem(result.nhanSu[0] || null); }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'nhanSu'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Hồ Sơ Nhân Sự & Y Bác Sĩ ({result.nhanSu?.length || 0})
          </button>
        </div>

        {/* Bộ lọc nhanh theo vai trò khi xem tab nhân sự */}
        {activeTab === 'nhanSu' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Tất cả chức danh / vai trò</option>
              <option value="Bác sĩ">Bác sĩ chuyên khoa</option>
              <option value="Tiếp tân">Nhân viên tiếp đón</option>
              <option value="Thu ngân">Thu ngân viện phí</option>
              <option value="Dược">Nhà thuốc & Dược</option>
              <option value="Kỹ thuật viên">Kỹ thuật viên xét nghiệm/CĐHA</option>
            </select>
          </div>
        )}
      </div>

      {/* ─── NỘI DUNG TRA CỨU: DANH SÁCH BẢNG + CHI TIẾT ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3): BẢNG DANH SÁCH DỮ LIỆU */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'benhNhan' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  Danh Sách Bệnh Nhân Tiếp Nhận ({result.benhNhan?.length || 0})
                </h3>
                <span className="text-xs text-slate-500 font-medium">Bấm vào hàng để xem hồ sơ chi tiết</span>
              </div>

              {result.benhNhan?.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {loading ? 'Đang nạp dữ liệu hồ sơ...' : 'Không có hồ sơ bệnh nhân nào phù hợp.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                        <th className="py-3 px-4 text-left">Mã BN</th>
                        <th className="py-3 px-4 text-left">Họ và Tên</th>
                        <th className="py-3 px-4 text-left">Số Điện Thoại</th>
                        <th className="py-3 px-4 text-center">Giới Tính</th>
                        <th className="py-3 px-4 text-left">Dị Ứng / Nhóm Máu</th>
                        <th className="py-3 px-4 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.benhNhan.map((bn) => {
                        const isSelected = selectedItem?.id === bn.id && selectedItem?.maBenhNhan;
                        return (
                          <tr
                            key={bn.id}
                            onClick={() => setSelectedItem(bn)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/80 font-semibold'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                              {bn.maBenhNhan}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900 text-sm">{bn.hoTen}</p>
                              <p className="text-[11px] text-slate-500">{bn.diaChi || 'TP. Hồ Chí Minh'}</p>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                              {bn.soDienThoai || 'Chưa cập nhật'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                bn.gioiTinh === 'nam' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                              }`}>
                                {bn.gioiTinh === 'nam' ? 'Nam' : bn.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800">Máu: {bn.nhomMau || 'Chưa rõ'}</span>
                                {bn.diUng && (
                                  <p className="text-[11px] text-red-600 font-medium truncate flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" /> {bn.diUng}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(bn); }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-[11px] transition-colors"
                              >
                                Xem Chi Tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Danh Sách Nhân Sự & Y Bác Sĩ ({filteredNhanSu?.length || 0})
                </h3>
                <span className="text-xs text-slate-500 font-medium">Bấm vào hàng để xem hồ sơ nhân sự</span>
              </div>

              {filteredNhanSu?.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {loading ? 'Đang nạp danh sách nhân sự...' : 'Không tìm thấy nhân viên nào phù hợp.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                        <th className="py-3 px-4 text-left">Nhân Viên</th>
                        <th className="py-3 px-4 text-left">Chức Vụ / Chuyên Khoa</th>
                        <th className="py-3 px-4 text-left">Vai Trò Hệ Thống</th>
                        <th className="py-3 px-4 text-left">Số Điện Thoại</th>
                        <th className="py-3 px-4 text-center">Trạng Thái</th>
                        <th className="py-3 px-4 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredNhanSu.map((nv) => {
                        const isSelected = selectedItem?.id === nv.id && !selectedItem?.maBenhNhan;
                        return (
                          <tr
                            key={nv.id}
                            onClick={() => setSelectedItem(nv)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/80 font-semibold'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {nv.hoTen?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{nv.hoTen}</p>
                                  <p className="text-[11px] text-slate-500">{nv.email || 'nv@phongkham.vn'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-800">{nv.chucVu || 'Cán bộ y tế'}</p>
                              <p className="text-[11px] text-slate-500">Phòng Khám Đa Khoa</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                                {nv.vaiTro || 'Nhân viên'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              {nv.soDienThoai || 'Chưa cập nhật'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                Đang hoạt động
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedItem(nv); }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold text-[11px] transition-colors"
                              >
                                Xem Hồ Sơ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (1/3): THẺ THÔNG TIN CHI TIẾT (FULL PROFILE) */}
        <div className="lg:col-span-1">
          {selectedItem ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  {selectedItem.maBenhNhan ? 'Hồ Sơ Chi Tiết Bệnh Nhân' : 'Hồ Sơ Chi Tiết Nhân Sự'}
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                  ID: #{selectedItem.id}
                </span>
              </div>

              {selectedItem.maBenhNhan ? (
                /* Chi tiết bệnh nhân */
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                      {selectedItem.hoTen?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{selectedItem.hoTen}</p>
                      <p className="font-mono font-bold text-emerald-700">Mã BN: {selectedItem.maBenhNhan}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <span className="font-bold text-slate-900">{selectedItem.soDienThoai || 'Chưa có'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Giới tính:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedItem.gioiTinh === 'nam' ? 'Nam' : selectedItem.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số CCCD / BHYT:</span>
                      <span className="font-semibold text-slate-800">{selectedItem.soCmnd || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Nhóm máu:</span>
                      <span className="font-bold text-blue-700">{selectedItem.nhomMau || 'Chưa xác định'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Tiền sử dị ứng:</span>
                      <span className="font-semibold text-red-600">{selectedItem.diUng || 'Không ghi nhận'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Địa chỉ cư trú:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[160px] truncate">
                        {selectedItem.diaChi || 'TP. Hồ Chí Minh'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed text-[11px]">
                    Bệnh nhân có lịch sử khám ngoại trú tại phòng khám. Dữ liệu bệnh án điện tử (EMR) được lưu trữ đầy đủ.
                  </div>
                </div>
              ) : (
                /* Chi tiết nhân sự */
                <div className="space-y-4 text-xs">
                  <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                      {selectedItem.hoTen?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{selectedItem.hoTen}</p>
                      <p className="font-semibold text-blue-700">{selectedItem.chucVu || 'Cán bộ phòng khám'}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Vai trò hệ thống:</span>
                      <span className="font-bold text-blue-700">{selectedItem.vaiTro || 'Nhân viên'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <span className="font-bold text-slate-900">{selectedItem.soDienThoai || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Email công vụ:</span>
                      <span className="font-semibold text-slate-800">{selectedItem.email || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số CMND/CCCD:</span>
                      <span className="font-semibold text-slate-800">{selectedItem.soCmnd || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Địa chỉ liên hệ:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[160px] truncate">
                        {selectedItem.diaChi || 'TP. Hồ Chí Minh'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tình trạng hồ sơ:</span>
                      <span className="font-bold text-emerald-700">Đầy đủ hợp đồng & chứng chỉ</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 leading-relaxed text-[11px]">
                    Hồ sơ nhân sự đã được ký hợp đồng lao động và kích hoạt tài khoản phân quyền trên hệ thống quản trị.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
              Chọn một hồ sơ bệnh nhân hoặc nhân sự ở bảng bên trái để xem đầy đủ thông tin chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
