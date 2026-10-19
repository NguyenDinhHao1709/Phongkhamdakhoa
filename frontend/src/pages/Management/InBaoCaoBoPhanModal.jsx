import { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const BO_PHAN_MAP = {
  nha_thuoc: 'Bộ phận Nhà thuốc & Kho Dược',
  bac_si: 'Khoa Khám Bệnh - Bác sĩ Lâm Sàng',
  thu_ngan: 'Bộ phận Thu ngân & Viện phí',
  tiep_tan: 'Bộ phận Tiếp đón & Lễ tân',
  xet_nghiem: 'Phòng Xét Nghiệm & Cận Lâm Sàng',
};

const SNAPSHOT_LABELS = {
  // Nhà thuốc
  tongMatHang: { label: 'Tổng mặt hàng quản lý', unit: 'thuốc' },
  tongGiaTriTonKho: { label: 'Tổng giá trị kho dược', isCurrency: true },
  thuocSapHetHang: { label: 'Thuốc sắp hết hàng', unit: 'mặt hàng' },
  thuocCanDateFEFO: { label: 'Thuốc cận hạn FEFO', unit: 'mặt hàng' },
  donXuatTrongNgay: { label: 'Đơn xuất trong kỳ', unit: 'đơn' },

  // Bác sĩ
  tongBenhNhanDaKham: { label: 'Tổng ca đã khám', unit: 'ca' },
  dangChoKham: { label: 'Ca đang chờ khám', unit: 'ca' },
  tongDonThuocKe: { label: 'Đơn thuốc đã kê', unit: 'đơn' },
  tongChiDinhCLS: { label: 'Chỉ định cận lâm sàng', unit: 'lượt' },
  tyLeHoanThanh: { label: 'Tỷ lệ hoàn thành' },
  diemHaiLongCSAT: { label: 'Điểm hài lòng CSAT' },

  // Tiếp tân
  tongTiepDon: { label: 'Tổng lượt tiếp đón', unit: 'lượt' },
  khamTrucTiep: { label: 'Khám trực tiếp', unit: 'lượt' },
  khamDatLich: { label: 'Đặt lịch trước', unit: 'lượt' },
  choKham: { label: 'Bệnh nhân chờ khám', unit: 'người' },
  dangKham: { label: 'Bệnh nhân đang khám', unit: 'người' },
  hoanThanh: { label: 'Khám hoàn tất', unit: 'ca' },
  huyKham: { label: 'Hủy khám / Quá hạn', unit: 'ca' },

  // Xét nghiệm
  tongSoChiDinh: { label: 'Tổng ca xét nghiệm', unit: 'chỉ định' },
  choLayMau: { label: 'Chờ lấy mẫu', unit: 'mẫu' },
  dangLayMau: { label: 'Đang lấy mẫu', unit: 'mẫu' },
  dangXuLy: { label: 'Đang xử lý phân tích', unit: 'mẫu' },
  daCoKetQua: { label: 'Đã có kết quả', unit: 'mẫu' },
  daHuy: { label: 'Mẫu đã hủy', unit: 'mẫu' },

  // Thu ngân
  tongThuVienPhi: { label: 'Tổng thu viện phí', isCurrency: true },
  tongChiNhaCungCap: { label: 'Chi trả mua thuốc NCC', isCurrency: true },
  thucThuRong: { label: 'Thực thu ròng', isCurrency: true },
  tienMatTaiKet: { label: 'Tiền mặt tại két', isCurrency: true },
  chuyenKhoanNganHang: { label: 'Chuyển khoản QR/Thẻ', isCurrency: true },
  soLuongHoaDon: { label: 'Hóa đơn phát hành', unit: 'HĐ' },
  soLuongPhieuChi: { label: 'Phiếu chi đã lập', unit: 'phiếu' },
};

export default function InBaoCaoBoPhanModal({
  isOpen,
  onClose,
  baoCao = null,
}) {
  const printRef = useRef(null);
  const scrollContainerRef = useRef(null);

  if (!isOpen || !baoCao) return null;

  const handlePrint = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const today = new Date();
  const ngayIn = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  let snapshot = baoCao.soLieuSnapshot;
  if (typeof snapshot === 'string') {
    try { snapshot = JSON.parse(snapshot); } catch (_) {}
  }
  snapshot = snapshot || {};

  return (
    <div className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:block print:overflow-visible print:h-auto print:max-h-none print:w-full">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[94vh] animate-fade-in print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none print:max-h-none print:overflow-visible print:block print:w-full">
        {/* HEADER ACTION (ẨN KHI IN) */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                In Phiếu Báo Cáo Bộ Phận & Ý Kiến Chỉ Đạo
              </h2>
              <p className="text-xs text-gray-500">
                Chuẩn biểu mẫu A4 • Biên bản công văn lưu hành nội bộ phòng khám
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Văn Bản (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* XEM TRƯỚC BẢN IN KHỔ A4 */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full"
        >
          <div
            id="print-bo-phan-section"
            ref={printRef}
            className="w-full max-w-[210mm] bg-white p-6 sm:p-10 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-4 print:space-y-3.5 print:p-0 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full"
          >
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 8mm 10mm;
                }
                html, body, #root {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  height: auto !important;
                  min-height: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #print-bo-phan-section, #print-bo-phan-section * {
                  visibility: visible !important;
                }
                #print-bo-phan-section {
                  position: relative !important;
                  left: auto !important;
                  top: auto !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                }
                .no-print, .no-print * {
                  display: none !important;
                }
                table {
                  page-break-inside: auto;
                  break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                thead {
                  display: table-header-group;
                }
                tfoot {
                  display: table-footer-group;
                }
              }
            `}</style>

            {/* Header Quốc hiệu */}
            <div className="flex justify-between items-start border-b border-gray-800 pb-4">
              <div className="text-left space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="text-sm font-black uppercase text-blue-900">PHÒNG KHÁM ĐA KHOA THÔNG MINH</p>
                <p className="text-[10px] text-gray-500">Đơn vị: <strong>{BO_PHAN_MAP[baoCao.boPhan] || baoCao.boPhan}</strong></p>
              </div>

              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-bold uppercase text-gray-800 tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[10px] font-bold italic text-gray-700">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-[1px] bg-gray-400 ml-auto my-1"></div>
                <p className="text-[10px] italic text-gray-500">{ngayIn}</p>
              </div>
            </div>

            {/* Tiêu đề */}
            <div className="text-center space-y-1 pt-2">
              <h1 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                PHIẾU BÁO CÁO NGHIỆP VỤ & Ý KIẾN CHỈ ĐẠO BAN GIÁM ĐỐC
              </h1>
              <p className="text-xs font-bold text-blue-900">
                {baoCao.tieuDe}
              </p>
              <div className="flex justify-center items-center gap-4 text-[10px] text-gray-600 pt-1">
                <span>Mã văn bản: <strong className="font-mono text-gray-900">{baoCao.maBaoCao}</strong></span>
                <span>•</span>
                <span>Kỳ báo cáo: <strong className="text-gray-900">{baoCao.kyBaoCao || 'Theo ngày'}</strong></span>
                <span>•</span>
                <span>Người lập: <strong className="text-gray-900">{baoCao.tenNguoiGui || baoCao.nguoiGuiHoTen || `NV #${baoCao.nguoiGuiId || 'hệ thống'}`}</strong></span>
              </div>
            </div>

            {/* Phần 1: Số liệu Snapshot */}
            {Object.keys(snapshot).length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1">
                  I. SỐ LIỆU SNAPSHOT THỰC TẾ TẠI THỜI ĐIỂM BÁO CÁO
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(snapshot).map(([key, value]) => {
                    if (key === 'kyBaoCao' || key === 'phamVi') return null;
                    const meta = SNAPSHOT_LABELS[key] || { label: key };
                    let displayVal = value;
                    if (meta.isCurrency && typeof value === 'number') {
                      displayVal = formatCurrency(value);
                    } else if (typeof value === 'number') {
                      displayVal = `${value.toLocaleString('vi-VN')} ${meta.unit || ''}`;
                    }
                    return (
                      <div key={key} className="p-2 border border-gray-200 rounded bg-gray-50/50">
                        <p className="text-[10px] text-gray-500">{meta.label}</p>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">{displayVal}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Phần 2: Nội dung báo cáo */}
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1">
                II. TÌNH HÌNH VẬN HÀNH CHUYÊN MÔN
              </h3>
              <div className="p-3 bg-gray-50/50 border border-gray-200 rounded text-xs leading-relaxed whitespace-pre-wrap text-gray-800">
                {baoCao.noiDung}
              </div>
            </div>

            {/* Phần 3: Kiến nghị & Đề xuất */}
            {baoCao.kienNghi && (
              <div className="space-y-2 pt-1">
                <h3 className="font-bold text-xs uppercase text-amber-900 border-b border-amber-200 pb-1">
                  III. KIẾN NGHỊ & ĐỀ XUẤT CỦA BỘ PHẬN
                </h3>
                <div className="p-3 bg-amber-50/40 border border-amber-200 rounded text-xs leading-relaxed whitespace-pre-wrap text-amber-950">
                  {baoCao.kienNghi}
                </div>
              </div>
            )}

            {/* Phần 4: Ý kiến chỉ đạo Ban Giám Đốc */}
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs uppercase text-emerald-900 border-b border-emerald-300 pb-1 flex justify-between">
                <span>IV. Ý KIẾN CHỈ ĐẠO & PHÊ DUYỆT CỦA BAN GIÁM ĐỐC</span>
                {baoCao.ngayChiDao && (
                  <span className="text-[10px] font-normal text-gray-500 lowercase">
                    (phê duyệt lúc: {formatDateTime(baoCao.ngayChiDao)})
                  </span>
                )}
              </h3>
              <div className="p-3.5 bg-emerald-50/40 border-2 border-emerald-300 rounded text-xs leading-relaxed whitespace-pre-wrap text-emerald-950 font-medium">
                {baoCao.yKienGiamDoc || 'Ban Giám Đốc đã xem xét và ghi nhận báo cáo. Yêu cầu bộ phận tiếp tục phát huy và triển khai đúng phác đồ.'}
              </div>
            </div>

            {/* Chữ ký xác nhận */}
            <div className="grid grid-cols-2 text-center pt-4 print:pt-2">
              <div className="space-y-0.5">
                <p className="font-bold text-[11px] uppercase text-gray-800">NGƯỜI LẬP BÁO CÁO</p>
                <p className="text-[10px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-14 print:h-10"></div>
                <p className="font-semibold text-gray-800">
                  {baoCao.tenNguoiGui || baoCao.nguoiGuiHoTen || 'Đại diện bộ phận'}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-bold text-[11px] uppercase text-blue-950">BAN GIÁM ĐỐC BỆNH VIỆN</p>
                <p className="text-[10px] italic text-gray-500">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <div className="h-14 print:h-10"></div>
                <p className="font-bold text-gray-950">Giám Đốc Bệnh Viện</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

