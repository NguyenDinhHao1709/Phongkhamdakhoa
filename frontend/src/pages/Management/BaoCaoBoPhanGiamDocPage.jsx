import React, { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '../../services/api';
import InBaoCaoBoPhanModal from './InBaoCaoBoPhanModal';

const BO_PHAN_MAP = {
  nha_thuoc: { label: 'Nhà thuốc / Kho dược', icon: '💊', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  bac_si: { label: 'Khám bệnh / Bác sĩ', icon: '🩺', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
  thu_ngan: { label: 'Thu ngân / Viện phí', icon: '💰', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
  tiep_tan: { label: 'Tiếp đón / Lễ tân', icon: '👥', badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' },
  xet_nghiem: { label: 'Phòng Xét nghiệm', icon: '🔬', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export default function BaoCaoBoPhanGiamDocPage() {
  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterBoPhan, setFilterBoPhan] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('');
  
  // Chi tiết modal
  const [selectedBaoCao, setSelectedBaoCao] = useState(null);
  const [chiTietLoading, setChiTietLoading] = useState(false);
  const [yKienChiDao, setYKienChiDao] = useState('');
  const [savingChiDao, setSavingChiDao] = useState(false);
  const [inBaoCaoData, setInBaoCaoData] = useState(null);

  useEffect(() => {
    fetchDanhSach(true); // Lần đầu bật loading
    // Tự động làm mới mỗi 2.5s (dưới 3s) để Giám đốc nhận báo cáo tức thì mà không cần F5
    const interval = setInterval(() => {
      fetchDanhSach(false); // Các lần sau làm mới ngầm, không nháy màn hình
    }, 2500);

    return () => clearInterval(interval);
  }, [filterBoPhan, filterTrangThai]);

  const fetchDanhSach = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = {};
      if (filterBoPhan) params.boPhan = filterBoPhan;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const res = await apiGet('/quan-ly/bao-cao-bo-phan', params);
      setDanhSach(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách báo cáo bộ phận:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleOpenDetail = async (item) => {
    setChiTietLoading(true);
    setSelectedBaoCao(null);
    setYKienChiDao('');
    try {
      const res = await apiGet(`/quan-ly/bao-cao-bo-phan/${item.id}`);
      const rawData = res?.data || res || item;
      let snapshot = rawData.soLieuSnapshot ?? item.soLieuSnapshot;
      if (typeof snapshot === 'string') {
        try { snapshot = JSON.parse(snapshot); } catch (_) {}
      }
      setSelectedBaoCao({ ...item, ...rawData, soLieuSnapshot: snapshot });
      setYKienChiDao(rawData?.yKienGiamDoc || item?.yKienGiamDoc || '');
    } catch (err) {
      console.error('Lỗi tải chi tiết báo cáo:', err);
      let snapshot = item.soLieuSnapshot;
      if (typeof snapshot === 'string') {
        try { snapshot = JSON.parse(snapshot); } catch (_) {}
      }
      setSelectedBaoCao({ ...item, soLieuSnapshot: snapshot });
      setYKienChiDao(item?.yKienGiamDoc || '');
    } finally {
      setChiTietLoading(false);
    }
  };

  const handleSaveChiDao = async () => {
    if (!yKienChiDao.trim()) {
      alert('Vui lòng nhập ý kiến chỉ đạo hoặc phản hồi');
      return;
    }
    setSavingChiDao(true);
    try {
      await apiPatch(`/quan-ly/bao-cao-bo-phan/${selectedBaoCao.id}/chi-dao`, {
        yKien: yKienChiDao.trim(),
        yKienGiamDoc: yKienChiDao.trim()
      });
      alert('Đã gửi ý kiến chỉ đạo tới bộ phận thành công!');
      setSelectedBaoCao(null); // Tự động đóng modal
      fetchDanhSach();
    } catch (err) {
      console.error('Lỗi lưu chỉ đạo:', err);
      alert(err?.message || 'Có lỗi khi lưu ý kiến chỉ đạo');
    } finally {
      setSavingChiDao(false);
    }
  };

// Từ điển nhãn thân thiện cho Ban Giám Đốc
const SNAPSHOT_LABELS = {
  tongMatHang: { label: 'Tổng mặt hàng quản lý', icon: '📦', isCurrency: false, unit: 'thuốc' },
  tongGiaTriTonKho: { label: 'Tổng giá trị kho dược', icon: '💰', isCurrency: true },
  thuocSapHetHang: { label: 'Thuốc sắp hết hàng', icon: '⚠️', isCurrency: false, unit: 'loại' },
  thuocCanDateFEFO: { label: 'Thuốc cận hạn FEFO', icon: '⏳', isCurrency: false, unit: 'loại' },
  donXuatTrongNgay: { label: 'Đơn xuất trong ngày', icon: '📋', isCurrency: false, unit: 'đơn' },
  tongBenhNhanDaKham: { label: 'Tổng ca đã khám', icon: '🩺', isCurrency: false, unit: 'ca' },
  dangChoKham: { label: 'Ca đang chờ khám', icon: '⏳', isCurrency: false, unit: 'ca' },
  tongDonThuocKe: { label: 'Đơn thuốc đã kê', icon: '💊', isCurrency: false, unit: 'đơn' },
  tongChiDinhCLS: { label: 'Chỉ định cận lâm sàng', icon: '🔬', isCurrency: false, unit: 'chỉ định' },
  tyLeHoanThanh: { label: 'Tỷ lệ hoàn thành', icon: '✅', isCurrency: false },
  diemHaiLongCSAT: { label: 'Điểm hài lòng CSAT', icon: '⭐', isCurrency: false },
  tongTiepDon: { label: 'Tổng lượt tiếp đón', icon: '👥', isCurrency: false, unit: 'lượt' },
  khamTrucTiep: { label: 'Khám trực tiếp', icon: '🚶', isCurrency: false, unit: 'lượt' },
  khamDatLich: { label: 'Đặt lịch trước', icon: '📅', isCurrency: false, unit: 'lượt' },
  choKham: { label: 'Bệnh nhân chờ khám', icon: '⏳', isCurrency: false, unit: 'người' },
  dangKham: { label: 'Bệnh nhân đang khám', icon: '🩺', isCurrency: false, unit: 'người' },
  hoanThanh: { label: 'Khám hoàn tất', icon: '✅', isCurrency: false, unit: 'ca' },
  huyKham: { label: 'Hủy khám / Quá hạn', icon: '❌', isCurrency: false, unit: 'ca' },
  tongSoChiDinh: { label: 'Tổng ca xét nghiệm', icon: '🧪', isCurrency: false, unit: 'chỉ định' },
  choLayMau: { label: 'Chờ lấy mẫu', icon: '⏳', isCurrency: false, unit: 'mẫu' },
  dangLayMau: { label: 'Đang lấy mẫu', icon: '💉', isCurrency: false, unit: 'mẫu' },
  dangXuLy: { label: 'Đang xử lý phân tích', icon: '⚙️', isCurrency: false, unit: 'mẫu' },
  daCoKetQua: { label: 'Đã có kết quả', icon: '✅', isCurrency: false, unit: 'mẫu' },
  daHuy: { label: 'Mẫu đã hủy', icon: '❌', isCurrency: false, unit: 'mẫu' },
  tongThuVienPhi: { label: 'Tổng thu viện phí', icon: '💵', isCurrency: true },
  tongChiNhaCungCap: { label: 'Chi trả mua thuốc NCC', icon: '💸', isCurrency: true },
  thucThuRong: { label: 'Thực thu ròng', icon: '📈', isCurrency: true },
  tienMatTaiKet: { label: 'Tiền mặt tại két', icon: '🪙', isCurrency: true },
  chuyenKhoanNganHang: { label: 'Chuyển khoản QR / POS', icon: '💳', isCurrency: true },
  soLuongHoaDon: { label: 'Hóa đơn phát hành', icon: '🧾', isCurrency: false, unit: 'HĐ' },
  soLuongPhieuChi: { label: 'Phiếu chi đã lập', icon: '📃', isCurrency: false, unit: 'phiếu' },
};

function formatVnd(val) {
  if (typeof val !== 'number') return val;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

  // Render snapshot trực quan dạng thẻ chỉ số
  const renderSnapshotData = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object' || Object.keys(snapshot).length === 0) {
      return <p className="text-sm text-gray-500 italic">Không có snapshot số liệu đính kèm</p>;
    }

    const filtered = Object.entries(snapshot).filter(([k]) => k !== 'bacSi' && k !== 'chuyenKhoa' && k !== 'phamVi');

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map(([key, val]) => {
          const cfg = SNAPSHOT_LABELS[key] || { label: key, icon: '📊', isCurrency: false };
          let displayVal = val;
          if (cfg.isCurrency) {
            displayVal = formatVnd(val);
          } else if (typeof val === 'number') {
            displayVal = `${val.toLocaleString('vi-VN')} ${cfg.unit || ''}`.trim();
          }

          return (
            <div key={key} className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 shadow-xs">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 truncate" title={cfg.label}>
                <span>{cfg.icon}</span>
                <span className="truncate font-medium">{cfg.label}</span>
              </span>
              <span className="text-base font-bold text-slate-800 block mt-1.5 truncate" title={String(displayVal)}>
                {String(displayVal)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen print:p-0 print:m-0 print:bg-white print:min-h-0">
      <div className="print:hidden">
        {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📑</span> Báo Cáo Bộ Phận & Chỉ Đạo Ban Giám Đốc
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi các báo cáo nghiệp vụ, tình hình vận hành chuyên môn và chỉ đạo kịp thời cho các phòng ban
          </p>
        </div>
        <button
          onClick={fetchDanhSach}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 self-start md:self-auto"
        >
          <span>🔄</span> Làm mới danh sách
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Bộ phận chuyên môn</label>
          <select
            value={filterBoPhan}
            onChange={(e) => setFilterBoPhan(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Tất cả bộ phận --</option>
            {Object.entries(BO_PHAN_MAP).map(([code, item]) => (
              <option key={code} value={code}>
                {item.icon} {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Trạng thái xử lý</label>
          <select
            value={filterTrangThai}
            onChange={(e) => setFilterTrangThai(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="cho_xem">⏳ Chờ xem / Chưa chỉ đạo</option>
            <option value="da_chi_dao">✅ Đã có ý kiến chỉ đạo</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500 font-medium self-end pb-1.5">
          Tổng số báo cáo: <span className="font-bold text-gray-800">{danhSach.length}</span>
        </div>
      </div>

      {/* Danh sách báo cáo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p>Đang tải danh sách báo cáo...</p>
          </div>
        ) : danhSach.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-base font-medium">Chưa có báo cáo nào từ các bộ phận gửi lên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Mã BC</th>
                  <th className="py-3 px-4">Bộ phận</th>
                  <th className="py-3 px-4">Tiêu đề báo cáo</th>
                  <th className="py-3 px-4">Kỳ báo cáo</th>
                  <th className="py-3 px-4">Người lập</th>
                  <th className="py-3 px-4">Ngày gửi</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {danhSach.map((bc) => {
                  const bpInfo = BO_PHAN_MAP[bc.boPhan] || { label: bc.boPhan, icon: '📋', badgeColor: 'bg-gray-100' };
                  const isDaChiDao = bc.trangThai === 'da_chi_dao';

                  return (
                    <tr key={bc.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 text-xs">
                        {bc.maBaoCao}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${bpInfo.badgeColor}`}>
                          <span>{bpInfo.icon}</span>
                          <span>{bpInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate" title={bc.tieuDe}>
                        {bc.tieuDe}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {bc.kyBaoCao || 'Theo ngày'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800 text-xs inline-flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                          <span className="text-gray-400">👤</span>
                          <span>{bc.tenNguoiGui || bc.nguoiGuiHoTen || `NV #${bc.nguoiGuiId}`}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {bc.ngayGui ? new Date(bc.ngayGui).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isDaChiDao ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <span>✅</span> Đã chỉ đạo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                            <span>⏳</span> Chờ xem
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(bc)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            Xem & Chỉ đạo
                          </button>
                          <button
                            onClick={() => setInBaoCaoData(bc)}
                            title="In báo cáo A4 & chỉ đạo"
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>🖨️</span>
                            <span className="hidden xl:inline">In A4</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xem chi tiết và chỉ đạo */}
      {chiTietLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-5 rounded-lg shadow-lg flex items-center gap-3">
            <span className="animate-spin text-2xl">⏳</span>
            <span className="text-sm font-medium">Đang mở chi tiết báo cáo...</span>
          </div>
        </div>
      )}

      {selectedBaoCao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📑</span>
                  <h3 className="text-lg font-bold">{selectedBaoCao.tieuDe}</h3>
                </div>
                <div className="text-xs text-indigo-300 flex items-center gap-3 mt-1">
                  <span>Mã: <strong className="text-white font-mono">{selectedBaoCao.maBaoCao}</strong></span>
                  <span>•</span>
                  <span>Đơn vị: <strong className="text-white">{BO_PHAN_MAP[selectedBaoCao.boPhan]?.label || selectedBaoCao.boPhan}</strong></span>
                  <span>•</span>
                  <span>Kỳ: <strong className="text-white">{selectedBaoCao.kyBaoCao || 'Theo ngày'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBaoCao(null)}
                className="text-white hover:text-gray-300 text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Content modal */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Thông tin người lập & thời gian */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center text-xs text-indigo-900">
                <div>
                  Người lập báo cáo: <strong className="text-indigo-950 font-semibold">{selectedBaoCao.tenNguoiGui || selectedBaoCao.nguoiGuiHoTen || `Nhân sự #${selectedBaoCao.nguoiGuiId || 'hệ thống'}`}</strong>
                </div>
                <div>
                  Thời gian gửi: <strong>{selectedBaoCao.ngayGui ? new Date(selectedBaoCao.ngayGui).toLocaleString('vi-VN') : (selectedBaoCao.taoLuc ? new Date(selectedBaoCao.taoLuc).toLocaleString('vi-VN') : 'Vừa gửi')}</strong>
                </div>
              </div>

              {/* Khối snapshot số liệu */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📊</span> Số liệu snapshot thực tế tại thời điểm báo cáo
                </h4>
                {renderSnapshotData(selectedBaoCao.soLieuSnapshot)}
              </div>

              {/* Nội dung vận hành */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📝</span> Tình hình vận hành chuyên môn
                </h4>
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedBaoCao.noiDung}
                </div>
              </div>

              {/* Kiến nghị & đề xuất */}
              {selectedBaoCao.kienNghi && (
                <div>
                  <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>💡</span> Kiến nghị & Đề xuất từ bộ phận
                  </h4>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {selectedBaoCao.kienNghi}
                  </div>
                </div>
              )}

              {/* Phần ý kiến chỉ đạo của Ban Giám Đốc */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                    <span>✍️</span> Ý kiến chỉ đạo của Ban Giám Đốc
                  </h4>
                  {selectedBaoCao.ngayChiDao && (
                    <span className="text-xs text-gray-500">
                      Chỉ đạo gần nhất: {new Date(selectedBaoCao.ngayChiDao).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Gợi ý chỉ đạo nhanh */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs text-gray-500 self-center font-medium">Mẫu chỉ đạo nhanh:</span>
                  {[
                    { label: '✅ Phê duyệt & Triển khai', text: 'Đồng ý đề xuất. Giao bộ phận khẩn trương triển khai thực hiện theo đúng kế hoạch.' },
                    { label: '📝 Ghi nhận & Tiếp tục theo dõi', text: 'Đã ghi nhận báo cáo. Yêu cầu bộ phận tiếp tục theo dõi sát sao tình hình vận hành.' },
                    { label: '⚠️ Yêu cầu phương án chi tiết', text: 'Yêu cầu bộ phận rà soát lại số liệu và gửi bổ sung phương án chi tiết trong ngày mai.' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setYKienChiDao(preset.text)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={yKienChiDao}
                  onChange={(e) => setYKienChiDao(e.target.value)}
                  placeholder="Nhập ý kiến chỉ đạo, phương án giải quyết hoặc phê duyệt đề xuất cho bộ phận..."
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm text-gray-800"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-gray-50 border-t flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBaoCao(null)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => setInBaoCaoData(selectedBaoCao)}
                  className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <span>🖨️</span>
                  In Phiếu A4
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveChiDao}
                disabled={savingChiDao}
                className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-lg hover:from-blue-800 hover:to-indigo-800 font-semibold text-sm shadow flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {savingChiDao ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Đang lưu chỉ đạo...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Lưu Ý Kiến Chỉ Đạo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Modal In Báo Cáo Bộ Phận & Ý Kiến Chỉ Đạo Chuẩn A4 */}
      <InBaoCaoBoPhanModal
        isOpen={!!inBaoCaoData}
        onClose={() => setInBaoCaoData(null)}
        baoCao={inBaoCaoData}
      />
    </div>
  );
}
