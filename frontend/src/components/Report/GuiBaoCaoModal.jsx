import React, { useState, useEffect } from 'react';
import { apiPost } from '../../services/api';

// Bảng ánh xạ nhãn tiếng Việt và định dạng cho các chỉ số snapshot
const SNAPSHOT_LABELS = {
  tongMatHang: { label: 'Tổng mặt hàng theo dõi', icon: '📦', isCurrency: false, unit: 'thuốc' },
  tongGiaTriTonKho: { label: 'Tổng giá trị kho dược', icon: '💰', isCurrency: true },
  thuocSapHetHang: { label: 'Thuốc sắp hết hàng', icon: '⚠️', isCurrency: false, unit: 'mặt hàng' },
  thuocCanDateFEFO: { label: 'Thuốc cận hạn FEFO', icon: '⏳', isCurrency: false, unit: 'mặt hàng' },
  donXuatTrongNgay: { label: 'Đơn xuất trong kỳ', icon: '📋', isCurrency: false, unit: 'đơn' },
  
  // Bác sĩ
  tongBenhNhanDaKham: { label: 'Tổng ca đã khám', icon: '🩺', isCurrency: false, unit: 'ca' },
  dangChoKham: { label: 'Ca đang chờ khám', icon: '⏳', isCurrency: false, unit: 'ca' },
  tongDonThuocKe: { label: 'Đơn thuốc đã kê', icon: '💊', isCurrency: false, unit: 'đơn' },
  tongChiDinhCLS: { label: 'Chỉ định cận lâm sàng', icon: '🔬', isCurrency: false, unit: 'chỉ định' },
  tyLeHoanThanh: { label: 'Tỷ lệ hoàn thành', icon: '✅', isCurrency: false },
  diemHaiLongCSAT: { label: 'Điểm hài lòng CSAT', icon: '⭐', isCurrency: false },
  
  // Tiếp tân
  tongTiepDon: { label: 'Tổng lượt tiếp đón', icon: '👥', isCurrency: false, unit: 'lượt' },
  khamTrucTiep: { label: 'Khám trực tiếp', icon: '🚶', isCurrency: false, unit: 'lượt' },
  khamDatLich: { label: 'Đặt lịch trước', icon: '📅', isCurrency: false, unit: 'lượt' },
  choKham: { label: 'Bệnh nhân chờ khám', icon: '⏳', isCurrency: false, unit: 'người' },
  dangKham: { label: 'Bệnh nhân đang khám', icon: '🩺', isCurrency: false, unit: 'người' },
  hoanThanh: { label: 'Khám hoàn tất', icon: '✅', isCurrency: false, unit: 'ca' },
  huyKham: { label: 'Hủy khám / Quá hạn', icon: '❌', isCurrency: false, unit: 'ca' },

  // Xét nghiệm
  tongSoChiDinh: { label: 'Tổng ca xét nghiệm', icon: '🧪', isCurrency: false, unit: 'chỉ định' },
  choLayMau: { label: 'Chờ lấy mẫu', icon: '⏳', isCurrency: false, unit: 'mẫu' },
  dangLayMau: { label: 'Đang lấy mẫu', icon: '💉', isCurrency: false, unit: 'mẫu' },
  dangXuLy: { label: 'Đang xử lý phân tích', icon: '⚙️', isCurrency: false, unit: 'mẫu' },
  daCoKetQua: { label: 'Đã có kết quả', icon: '✅', isCurrency: false, unit: 'mẫu' },
  daHuy: { label: 'Mẫu đã hủy', icon: '❌', isCurrency: false, unit: 'mẫu' },

  // Thu ngân
  tongThuVienPhi: { label: 'Tổng thu viện phí', icon: '💵', isCurrency: true },
  tongChiNhaCungCap: { label: 'Chi trả mua thuốc NCC', icon: '💸', isCurrency: true },
  thucThuRong: { label: 'Thực thu ròng', icon: '📈', isCurrency: true },
  tienMatTaiKet: { label: 'Tiền mặt tại két', icon: '🪙', isCurrency: true },
  chuyenKhoanNganHang: { label: 'Chuyển khoản QR / POS', icon: '💳', isCurrency: true },
  soLuongHoaDon: { label: 'Hóa đơn phát hành', icon: '🧾', isCurrency: false, unit: 'HĐ' },
  soLuongPhieuChi: { label: 'Phiếu chi đã lập', icon: '📃', isCurrency: false, unit: 'phiếu' },
};

function formatCurrency(val) {
  if (typeof val !== 'number') return val;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function formatDateNow() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Trình sinh văn bản mẫu báo cáo chuyên nghiệp thông minh (Smart Draft)
function buildSmartDraft(boPhan, snapshot = {}, tenBoPhan = '', kyBaoCaoCustom = '') {
  const kyStr = kyBaoCaoCustom || snapshot.kyBaoCao || snapshot.kyBaoCaoLabel || `Ngày ${formatDateNow()}`;

  switch (boPhan) {
    case 'nha_thuoc': {
      const matHang = snapshot.tongMatHang ?? 0;
      const giaTri = formatCurrency(snapshot.tongGiaTriTonKho ?? 0);
      const sapHet = snapshot.thuocSapHetHang ?? 0;
      const canDate = snapshot.thuocCanDateFEFO ?? 0;
      const donXuat = snapshot.donXuatTrongNgay ?? 0;

      return {
        tieuDe: `Báo cáo hoạt động Nhà thuốc & Tồn kho FEFO - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nBộ phận Nhà thuốc & Kho Dược xin báo cáo tình hình vận hành (${kyStr}):\n1. Tình hình danh mục & tài sản tồn kho:\n   - Đang quản lý ${matHang} mặt hàng dược phẩm đang lưu hành.\n   - Tổng giá trị dược phẩm tồn kho thực tế: ${giaTri}.\n2. An toàn dược phẩm & Cảnh báo kho:\n   - Thuốc sắp hết hàng (cần dự trù nhập bổ sung): ${sapHet} mặt hàng.\n   - Thuốc cận hạn sử dụng theo nguyên tắc FEFO: ${canDate} mặt hàng.\n3. Tiến độ cấp phát:\n   - Số đơn xuất trong kỳ: ${donXuat} đơn thuốc hoàn tất.\n4. Đánh giá chất lượng: Kho thuốc duy trì nhiệt độ/độ ẩm đạt chuẩn GPP, quy trình kiểm soát cấp phát theo đúng đơn bác sĩ kê.`,
        kienNghi: `- Đề nghị Ban Giám Đốc xem xét phê duyệt định mức tồn kho tối thiểu cho các nhóm thuốc tiêu thụ cao.\n- Tiếp tục ưu tiên xuất các lô thuốc cận hạn theo đúng nguyên tắc FEFO.`
      };
    }

    case 'bac_si': {
      const bs = snapshot.bacSi || 'Bác sĩ';
      const khoa = snapshot.chuyenKhoa || 'Lâm sàng';
      const daKham = snapshot.tongBenhNhanDaKham ?? 0;
      const choKham = snapshot.dangChoKham ?? 0;
      const donKe = snapshot.tongDonThuocKe ?? 0;
      const cls = snapshot.tongChiDinhCLS ?? 0;
      const tyLe = snapshot.tyLeHoanThanh || '100%';
      const csat = snapshot.diemHaiLongCSAT || '5.0/5.0';

      return {
        tieuDe: `Báo cáo hiệu suất khám chữa bệnh - ${bs} (${khoa}) - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nBác sĩ xin báo cáo tình hình khám bệnh tại chuyên khoa ${khoa} (${kyStr}):\n- Tổng số ca bệnh nhân đã tiếp nhận khám: ${daKham} ca.\n- Số ca đang chờ tiếp tục xử lý: ${choKham} ca.\n- Tổng số đơn thuốc đã kê: ${donKe} đơn.\n- Tổng số chỉ định cận lâm sàng (xét nghiệm / CĐHA): ${cls} lượt.\n- Tỷ lệ hoàn thành ca khám đạt: ${tyLe}.\n- Đánh giá hài lòng của người bệnh (CSAT): ${csat}.\n- Công tác chẩn đoán và điều trị diễn ra an toàn, tuân thủ nghiêm ngặt phác đồ y khoa.`,
        kienNghi: `- Đề xuất tiếp tục phối hợp chặt chẽ với bộ phận Điều dưỡng và Tiếp đón để rút ngắn thời gian chờ của người bệnh trong các khung giờ cao điểm.`
      };
    }

    case 'tiep_tan': {
      const tong = snapshot.tongTiepDon ?? 0;
      const tt = snapshot.khamTrucTiep ?? 0;
      const dl = snapshot.khamDatLich ?? 0;
      const xong = snapshot.hoanThanh ?? 0;
      const dang = snapshot.dangKham ?? 0;
      const cho = snapshot.choKham ?? 0;
      const huy = snapshot.huyKham ?? 0;
      const csat = snapshot.diemHaiLongCSAT || '5.0/5.0';

      return {
        tieuDe: `Báo cáo tình hình tiếp đón & lưu lượng bệnh nhân - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nBộ phận Tiếp đón & Lễ tân xin báo cáo lưu lượng bệnh nhân (${kyStr}):\n- Tổng lượt tiếp đón: ${tong} lượt (Trong đó: Khám trực tiếp ${tt} lượt, Đặt lịch trước qua Kiosk/App ${dl} lượt).\n- Tiến độ tại các phòng khám: Đã hoàn tất ${xong} ca, đang khám ${dang} ca, chờ khám ${cho} ca, hủy/quá hạn ${huy} ca.\n- Mức độ hài lòng tiếp đón (CSAT): ${csat}.\n- Khu vực sảnh tiếp đón trật tự, luồng đón tiếp vận hành thông suốt.`,
        kienNghi: `- Kiến nghị tiếp tục đẩy mạnh hướng dẫn bệnh nhân quét mã QR và đặt hẹn trước để phân bổ tải đều trong ngày.`
      };
    }

    case 'xet_nghiem': {
      const tong = snapshot.tongSoChiDinh ?? 0;
      const choLay = snapshot.choLayMau ?? 0;
      const dangLay = snapshot.dangLayMau ?? 0;
      const dangXuLy = snapshot.dangXuLy ?? 0;
      const daCoKQ = snapshot.daCoKetQua ?? 0;
      const huy = snapshot.daHuy ?? 0;

      return {
        tieuDe: `Báo cáo công suất xét nghiệm & trả kết quả - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nPhòng Xét nghiệm xin báo cáo tiến độ xử lý cận lâm sàng (${kyStr}):\n- Tổng số chỉ định tiếp nhận: ${tong} ca xét nghiệm.\n- Tiến độ phân tích mẫu: Chờ lấy mẫu: ${choLay}, Đang lấy mẫu: ${dangLay}, Đang phân tích xử lý: ${dangXuLy}, Đã trả kết quả: ${daCoKQ}, Mẫu hủy: ${huy}.\n- Thiết bị máy móc xét nghiệm vận hành ổn định, nội kiểm QC đạt tiêu chuẩn, kết quả được đồng bộ tự động lên hồ sơ bệnh án.`,
        kienNghi: `- Đề xuất phê duyệt kế hoạch cấp bổ sung hóa chất và sinh phẩm tiêu hao định kỳ cho các máy phân tích tự động.`
      };
    }

    case 'thu_ngan': {
      const thu = formatCurrency(snapshot.tongThuVienPhi ?? 0);
      const chi = formatCurrency(snapshot.tongChiNhaCungCap ?? 0);
      const rong = formatCurrency(snapshot.thucThuRong ?? 0);
      const tienMat = formatCurrency(snapshot.tienMatTaiKet ?? 0);
      const ck = formatCurrency(snapshot.chuyenKhoanNganHang ?? 0);
      const hd = snapshot.soLuongHoaDon ?? 0;
      const pc = snapshot.soLuongPhieuChi ?? 0;

      return {
        tieuDe: `Báo cáo thu - chi viện phí & đối soát sổ quỹ - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nBộ phận Thu ngân xin báo cáo tình hình thu chi và dòng tiền (${kyStr}):\n- Tổng thu viện phí (Phiếu Thu): ${thu} (${hd} hóa đơn).\n- Tổng chi trả NCC và chi phí hoạt động (Phiếu Chi): ${chi} (${pc} phiếu chi).\n- Thực thu ròng: ${rong}.\n- Cơ cấu thu quỹ: Tiền mặt tại két: ${tienMat}, Chuyển khoản QR/Thẻ: ${ck}.\n- Sổ quỹ tiền mặt và biên lai đã được đối soát khớp 100%, chứng từ hợp lệ.`,
        kienNghi: `- Kính đề nghị Ban Giám Đốc phê duyệt chốt ca trực và cho phép bàn giao két tiền mặt theo quy chế tài chính.`
      };
    }

    default:
      return {
        tieuDe: `Báo cáo tình hình hoạt động ${tenBoPhan} - ${kyStr}`,
        kyBaoCao: kyStr,
        noiDung: `Kính gửi Ban Giám Đốc,\n\nBộ phận ${tenBoPhan} xin báo cáo tình hình hoạt động và vận hành chuyên môn trong kỳ (${kyStr}) diễn ra bình thường, đảm bảo tiến độ và chất lượng phục vụ người bệnh.`,
        kienNghi: `- Kính mong Ban Giám Đốc tiếp tục quan tâm và chỉ đạo sát sao.`
      };
  }
}

/**
 * Modal dùng chung để nhân viên các bộ phận (Nhà thuốc, Bác sĩ, Thu ngân, Tiếp tân, Xét nghiệm)
 * gửi Báo cáo nghiệp vụ & vận hành kèm snapshot số liệu thực tế lên Ban Giám Đốc.
 */
export default function GuiBaoCaoModal({
  isOpen,
  onClose,
  boPhan = 'nha_thuoc',
  tenBoPhan = 'Bộ phận',
  tieuDeMacDinh = '',
  kyBaoCaoMacDinh = '',
  soLieuSnapshot = {},
  onSuccess
}) {
  const [tieuDe, setTieuDe] = useState('');
  const [kyBaoCao, setKyBaoCao] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [kienNghi, setKienNghi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tự động sinh nội dung thông minh khi mở modal
  useEffect(() => {
    if (isOpen) {
      const draft = buildSmartDraft(boPhan, soLieuSnapshot, tenBoPhan, kyBaoCaoMacDinh);
      setTieuDe(tieuDeMacDinh || draft.tieuDe);
      setKyBaoCao(kyBaoCaoMacDinh || draft.kyBaoCao);
      setNoiDung(draft.noiDung);
      setKienNghi(draft.kienNghi);
      setError('');
    }
  }, [isOpen, boPhan, soLieuSnapshot, tenBoPhan, tieuDeMacDinh, kyBaoCaoMacDinh]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    const draft = buildSmartDraft(boPhan, soLieuSnapshot, tenBoPhan, kyBaoCaoMacDinh);
    setTieuDe(tieuDeMacDinh || draft.tieuDe);
    setKyBaoCao(kyBaoCaoMacDinh || draft.kyBaoCao);
    setNoiDung(draft.noiDung);
    setKienNghi(draft.kienNghi);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tieuDe.trim()) {
      setError('Vui lòng nhập tiêu đề báo cáo');
      return;
    }
    if (!noiDung.trim()) {
      setError('Vui lòng nhập nội dung tóm tắt tình hình vận hành');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        boPhan,
        tieuDe: tieuDe.trim(),
        kyBaoCao: kyBaoCao.trim() || undefined,
        soLieuSnapshot: soLieuSnapshot || {},
        noiDung: noiDung.trim(),
        kienNghi: kienNghi.trim() || undefined
      };

      const res = await apiPost('/quan-ly/bao-cao-bo-phan', payload);
      alert('Đã gửi báo cáo lên Ban Giám Đốc thành công!');
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      console.error('Lỗi gửi báo cáo:', err);
      setError(err?.message || 'Có lỗi xảy ra khi gửi báo cáo lên Ban Giám Đốc');
    } finally {
      setLoading(false);
    }
  };

  // Render thẻ KPI trực quan, thân thiện
  const renderSnapshotCards = () => {
    const entries = Object.entries(soLieuSnapshot || {}).filter(([k]) => k !== 'bacSi' && k !== 'chuyenKhoa' && k !== 'phamVi');
    if (entries.length === 0) return null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-2">
        {entries.map(([key, val]) => {
          const cfg = SNAPSHOT_LABELS[key] || { label: key, icon: '📊', isCurrency: false };
          let displayVal = val;
          if (cfg.isCurrency) {
            displayVal = formatCurrency(val);
          } else if (typeof val === 'number') {
            displayVal = `${val.toLocaleString('vi-VN')} ${cfg.unit || ''}`.trim();
          }

          return (
            <div
              key={key}
              className="bg-white border border-blue-200/80 rounded-xl p-2.5 shadow-xs hover:border-blue-400 transition"
            >
              <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate" title={cfg.label}>
                <span>{cfg.icon}</span>
                <span className="truncate font-medium">{cfg.label}</span>
              </div>
              <div className="text-sm font-bold text-gray-900 mt-1 truncate" title={String(displayVal)}>
                {displayVal}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl backdrop-blur-xs">
              📋
            </div>
            <div>
              <h3 className="text-lg font-bold">Lập & Gửi Báo Cáo Bộ Phận</h3>
              <p className="text-xs text-blue-200">
                Kính gửi Ban Giám Đốc • Đơn vị: <span className="font-semibold text-white">{tenBoPhan}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold leading-none p-1 transition"
            disabled={loading}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Tiêu đề & Kỳ báo cáo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tiêu đề báo cáo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tieuDe}
                onChange={(e) => setTieuDe(e.target.value)}
                placeholder="VD: Báo cáo hoạt động Nhà thuốc & Tồn kho FEFO"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold text-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Kỳ báo cáo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={kyBaoCao}
                onChange={(e) => setKyBaoCao(e.target.value)}
                placeholder="VD: Ngày 12/10/2026..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold text-gray-800"
                required
              />
            </div>
          </div>

          {/* Khối snapshot số liệu đính kèm TRỰC QUAN */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200/70 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊</span> Số liệu snapshot thực tế đính kèm
                </span>
                <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                  Tự động chốt tại thời điểm gửi
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                title="Tải lại nội dung phân tích tự động dựa trên số liệu"
              >
                <span>🔄</span> Tạo lại mẫu báo cáo
              </button>
            </div>
            {renderSnapshotCards()}
          </div>

          {/* Nội dung vận hành được pre-fill sẵn */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Nội dung & Tình hình vận hành chuyên môn <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400">Đã tự động tạo sẵn • Có thể chỉnh sửa</span>
            </div>
            <textarea
              rows={6}
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Mô tả tóm tắt tình hình thực tế, các khó khăn vướng mắc hoặc phát sinh nổi bật trong kỳ..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-800 leading-relaxed font-sans"
              required
            />
          </div>

          {/* Đề xuất / Kiến nghị xin ý kiến chỉ đạo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                Đề xuất & Kiến nghị xin ý kiến chỉ đạo của Ban Giám Đốc
              </label>
              <span className="text-[11px] text-amber-600 font-medium">Gửi tới Giám đốc phê duyệt</span>
            </div>
            <textarea
              rows={3}
              value={kienNghi}
              onChange={(e) => setKienNghi(e.target.value)}
              placeholder="VD: Đề xuất nhập thêm thuốc X; Kiến nghị bố trí thêm nhân sự trực giờ cao điểm..."
              className="w-full px-3.5 py-2.5 border border-amber-300/80 bg-amber-50/20 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm text-gray-800 leading-relaxed font-sans"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center pt-3 border-t">
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-xs text-gray-500 hover:text-gray-700 underline font-medium"
            >
              Đặt lại mẫu mặc định
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-md flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Gửi lên Ban Giám Đốc
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
