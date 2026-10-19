import React, { useState, useEffect } from 'react';
import { apiGet } from '../../services/api';

const SNAPSHOT_LABELS = {
  tongMatHang: { label: 'Tổng mặt hàng theo dõi', icon: '📦', isCurrency: false, unit: 'thuốc' },
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

export default function LichSuBaoCaoModal({
  isOpen,
  onClose,
  boPhan = 'nha_thuoc',
  tenBoPhan = 'Bộ phận'
}) {
  const [danhSach, setDanhSach] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterTrangThai, setFilterTrangThai] = useState('');
  const [selectedBaoCao, setSelectedBaoCao] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory(true);
      // Tự động làm mới mỗi 2.5s (dưới 3s) để nhân viên thấy ngay ý kiến chỉ đạo của Giám đốc
      const interval = setInterval(() => {
        fetchHistory(false);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen, boPhan, filterTrangThai]);

  const fetchHistory = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = { boPhan };
      if (filterTrangThai) params.trangThai = filterTrangThai;
      const res = await apiGet('/quan-ly/bao-cao-bo-phan', params);
      setDanhSach(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error('Lỗi tải lịch sử báo cáo:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderSnapshotCards = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const entries = Object.entries(snapshot).filter(([k]) => k !== 'bacSi' && k !== 'chuyenKhoa' && k !== 'phamVi');

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
        {entries.map(([key, val]) => {
          const cfg = SNAPSHOT_LABELS[key] || { label: key, icon: '📊', isCurrency: false };
          let displayVal = val;
          if (cfg.isCurrency) {
            displayVal = formatVnd(val);
          } else if (typeof val === 'number') {
            displayVal = `${val.toLocaleString('vi-VN')} ${cfg.unit || ''}`.trim();
          }

          return (
            <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-xs text-gray-500 flex items-center gap-1 truncate" title={cfg.label}>
                <span>{cfg.icon}</span>
                <span className="truncate">{cfg.label}</span>
              </span>
              <span className="text-sm font-bold text-gray-800 block mt-1 truncate" title={String(displayVal)}>
                {String(displayVal)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <h3 className="text-lg font-bold">Lịch Sử Báo Cáo & Ý Kiến Chỉ Đạo</h3>
              <p className="text-xs text-indigo-200">
                Đơn vị: <strong className="text-white">{tenBoPhan}</strong> • Theo dõi phản hồi từ Ban Giám Đốc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Trạng thái:</span>
            <select
              value={filterTrangThai}
              onChange={(e) => setFilterTrangThai(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="da_chi_dao">✅ Đã có ý kiến chỉ đạo</option>
              <option value="cho_xem">⏳ Đang chờ xem xét</option>
            </select>
          </div>
          <div className="text-xs text-gray-500">
            Tổng số: <strong className="text-gray-800">{danhSach.length}</strong> báo cáo
          </div>
        </div>

        {/* Danh sách */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && danhSach.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
              <p className="text-sm">Đang tải lịch sử báo cáo...</p>
            </div>
          ) : danhSach.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-sm font-medium">Chưa có báo cáo nào được gửi từ bộ phận này</p>
            </div>
          ) : (
            <div className="space-y-3">
              {danhSach.map((bc) => {
                const isDaChiDao = bc.trangThai === 'da_chi_dao';
                const isExpanded = expandedId === bc.id;
                let snapshot = bc.soLieuSnapshot;
                if (typeof snapshot === 'string') {
                  try { snapshot = JSON.parse(snapshot); } catch (_) {}
                }

                return (
                  <div
                    key={bc.id}
                    className={`border rounded-2xl p-4 bg-white shadow-xs transition duration-200 ${
                      isExpanded ? 'border-blue-400 ring-2 ring-blue-50 shadow-md' : 'hover:border-blue-200 hover:shadow-xs'
                    }`}
                  >
                    {/* Header tóm tắt gọn gàng */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                          {bc.maBaoCao}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate" title={bc.tieuDe}>
                            {bc.tieuDe}
                          </h4>
                          <span className="text-[11px] text-gray-400">
                            {bc.ngayGui ? new Date(bc.ngayGui).toLocaleString('vi-VN') : (bc.taoLuc ? new Date(bc.taoLuc).toLocaleString('vi-VN') : '—')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {isDaChiDao ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <span>✅</span> Đã có chỉ đạo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <span>⏳</span> Chờ xem
                          </span>
                        )}

                        <button
                          onClick={() => toggleExpand(bc.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                            isExpanded
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          {isExpanded ? (
                            <>
                              <span>Thu gọn</span>
                              <span className="text-[10px]">▲</span>
                            </>
                          ) : (
                            <>
                              <span>Xem chi tiết</span>
                              <span className="text-[10px]">▼</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Vùng chi tiết — Chỉ bung ra khi bấm Xem chi tiết */}
                    {isExpanded && (
                      <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-3 animate-fadeIn">
                        {/* Snapshot số liệu */}
                        {snapshot && renderSnapshotCards(snapshot)}

                        {/* Nội dung báo cáo */}
                        <div className="bg-gray-50/70 p-3 rounded-xl text-xs text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                          <strong className="text-gray-900 block mb-1">📝 Nội dung đã báo cáo:</strong>
                          {bc.noiDung}
                        </div>

                        {/* Kiến nghị nếu có */}
                        {bc.kienNghi && (
                          <div className="bg-amber-50/50 p-3 rounded-xl text-xs text-amber-900 whitespace-pre-wrap leading-relaxed border border-amber-200/60">
                            <strong className="text-amber-950 block mb-1">💡 Đ đề xuất & Kiến nghị:</strong>
                            {bc.kienNghi}
                          </div>
                        )}

                        {/* Ý kiến chỉ đạo từ Giám đốc */}
                        {isDaChiDao ? (
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-xl p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                                <span>✍️</span> Ý Kiến Chỉ Đạo Của Ban Giám Đốc
                              </span>
                              {bc.ngayChiDao && (
                                <span className="text-[11px] text-emerald-700 font-medium">
                                  Chỉ đạo lúc: {new Date(bc.ngayChiDao).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-emerald-950 bg-white/80 p-2.5 rounded-lg border border-emerald-200 shadow-2xs whitespace-pre-wrap leading-relaxed">
                              {bc.yKienGiamDoc || 'Ban Giám Đốc đã xem và ghi nhận báo cáo.'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-500 italic">
                            Báo cáo đang trong hàng đợi chờ Ban Giám Đốc xem xét và phản hồi ý kiến chỉ đạo.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

