import { useState, useRef } from 'react';
import {
  Printer, X, FileText, CheckCircle2, SlidersHorizontal,
  Wallet, DollarSign, Stethoscope, FlaskConical, Pill, ShieldCheck,
  TrendingUp, Download, Building2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const PHUONG_THUC_LABEL = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT chi trả',
};

export default function InBaoCaoToanDienGiamDocModal({
  isOpen,
  onClose,
  report = {},
  timeRangeStr = 'Tháng này',
}) {
  const [reportSection, setReportSection] = useState('toan_bo'); // 'toan_bo' | 'kpi_tong_quan' | 'tai_chinh' | 'lam_sang' | 'duoc'
  const printRef = useRef(null);
  const scrollContainerRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Reset scroll vị trí về đỉnh trang trước khi gọi window.print() để tránh Chromium cắt lệch trang
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

  const taiChinh = report?.taiChinh || {};
  const soQuy = report?.soQuy || {};
  const lamSang = report?.lamSang || {};
  const cls = report?.cls || {};
  const duoc = report?.duoc || {};

  const danhSachHoaDon = taiChinh?.danhSachHoaDon || [];
  const danhSachChiPhi = soQuy?.danhSachChiPhi || [];
  const danhSachTiepNhan = lamSang?.danhSachTiepNhan || [];
  const danhSachChiDinhCls = cls?.danhSachChiDinhCls || [];
  const danhSachTonKhoChiTiet = duoc?.danhSachTonKhoChiTiet || [];
  const chuyenKhoaStats = lamSang?.chuyenKhoaStats || [];
  const danhMucDichVu = cls?.danhMucDichVu || [];
  const topThuocKeDon = duoc?.topThuocKeDon || [];

  // Chuẩn hóa và đồng bộ các chỉ số báo cáo (safe fallbacks)
  const tongTiepNhan = lamSang?.totalTiepNhan ?? lamSang?.tongTiepNhan ?? danhSachTiepNhan.length;
  const daKham = lamSang?.daKham ?? danhSachTiepNhan.filter(t => t.trangThai === 'hoan_thanh' || t.trangThai === 'hoan_tat' || t.trangThai === 'da_kham').length;
  const dangKham = lamSang?.dangKham ?? danhSachTiepNhan.filter(t => t.trangThai === 'dang_kham').length;
  const choKham = lamSang?.choKham ?? danhSachTiepNhan.filter(t => t.trangThai === 'cho_kham' || t.trangThai === 'dang_cho').length;

  const tongChiDinhCls = cls?.tongChiDinh ?? danhSachChiDinhCls.length;
  const daHoanThanhCls = cls?.daHoanThanh ?? cls?.daThucHien ?? 0;
  const choThucHienCls = cls?.choThucHien ?? ((cls?.dangThucHien || 0) + (cls?.choTiepNhan || 0));

  const tongGiaTriKho = duoc?.tongGiaTriKho ?? 0;
  const tongSoMatHang = duoc?.tongSoMatHang ?? duoc?.tongSoThuoc ?? danhSachTonKhoChiTiet.length;
  const thuocSapHetHang = duoc?.thuocSapHetHang ?? duoc?.sapHetHangCount ?? 0;
  const thuocCanDateFEFO = duoc?.thuocCanDateFEFO ?? duoc?.sapHetHanCount ?? 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:block print:overflow-visible print:h-auto print:max-h-none print:w-full">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[94vh] animate-fade-in print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none print:max-h-none print:overflow-visible print:block print:w-full">
        {/* THANH ĐIỀU KHIỂN MODAL (ẨN KHI IN) */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                In Báo Cáo Toàn Diện Hoạt Động & Tài Chính Viện Phí
              </h2>
              <p className="text-xs text-gray-500">
                Chuẩn mẫu biểu A4 Ban Giám Đốc • Tự động loại bỏ thanh điều hướng và viền trang web
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Báo Cáo / Xuất PDF (Ctrl+P)</span>
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

        {/* TÙY CHỌN NỘI DUNG IN (ẨN KHI IN) */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-2 no-print">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" /> Chọn phạm vi nội dung cần in:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'toan_bo', label: '📄 Toàn Bộ Hợp Nhất', desc: 'Báo cáo đầy đủ 4 phần' },
              { id: 'kpi_tong_quan', label: '📊 Tóm Tắt KPIs', desc: 'Bảng số liệu điều hành' },
              { id: 'tai_chinh', label: '💰 Tài Chính & Sổ Quỹ', desc: 'Thu chi & Doanh thu' },
              { id: 'lam_sang', label: '🩺 Khám Bệnh & CLS', desc: 'Lưu lượng & Ca khám' },
              { id: 'duoc', label: '💊 Kho Dược & Tồn Kho', desc: 'Xuất nhập & FEFO' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportSection(tab.id)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  reportSection === tab.id
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-300'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="text-xs font-bold text-gray-900">{tab.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{tab.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* KHUNG CUỘN XEM TRƯỚC BẢN IN (PREVIEW A4) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full"
        >
          <div
            id="print-section"
            ref={printRef}
            className="w-full max-w-[210mm] bg-white p-6 sm:p-10 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-4 print:space-y-3.5 print:p-0 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full"
          >
            {/* Scoped CSS cho in ấn khổ A4 */}
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
                #print-section, #print-section * {
                  visibility: visible !important;
                }
                #print-section {
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

            {/* ── 1. HEADER CHUẨN CÔNG VĂN Y TẾ ── */}
            <div className="flex justify-between items-start border-b border-gray-800 pb-4">
              <div className="text-left space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="text-sm font-black uppercase text-blue-900">PHÒNG KHÁM ĐA KHOA THÔNG MINH</p>
                <p className="text-[10px] text-gray-500">Số 123 Đường Y Dược, Phường 10, TP. Hồ Chí Minh</p>
                <p className="text-[10px] text-gray-500">Hotline: (028) 3822 9999 • Email: bando@phongkham.vn</p>
              </div>

              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-bold uppercase text-gray-800 tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[10px] font-bold italic text-gray-700">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-[1px] bg-gray-400 ml-auto my-1"></div>
                <p className="text-[10px] italic text-gray-500">{ngayIn}</p>
              </div>
            </div>

            {/* ── 2. TIÊU ĐỀ BÁO CÁO ── */}
            <div className="text-center space-y-1 pt-2">
              <h1 className="text-lg sm:text-xl font-black text-gray-950 uppercase tracking-tight">
                BÁO CÁO TOÀN DIỆN HOẠT ĐỘNG BỆNH VIỆN & TÀI CHÍNH
              </h1>
              <p className="text-xs font-semibold text-gray-700">
                Kỳ báo cáo: <span className="font-bold text-blue-900">{timeRangeStr}</span>
              </p>
              <p className="text-[10px] italic text-gray-500">
                (Hợp nhất lưu lượng tiếp nhận, khám chữa bệnh, cận lâm sàng, kho dược và đối soát sổ quỹ viện phí)
              </p>
            </div>

            {/* ── 3. PHẦN I: TỔNG QUAN CHỈ SỐ HOẠT ĐỘNG (KPI SUMMARY) ── */}
            {(reportSection === 'toan_bo' || reportSection === 'kpi_tong_quan') && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1 flex items-center gap-1.5">
                  <span>I.</span> TỔNG QUAN CÁC CHỈ SỐ VẬN HÀNH & TÀI CHÍNH TOÀN VIỆN (KPI EXECUTIVE SUMMARY)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Tổng Thu Viện Phí</p>
                    <p className="text-sm font-black text-blue-700 mt-1">{formatCurrency(taiChinh?.tongThucThu || 0)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{taiChinh?.tongGiaoDich || 0} hóa đơn</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Chi Trả NCC & OPEX</p>
                    <p className="text-sm font-black text-rose-700 mt-1">{formatCurrency(soQuy?.tongChiHoatDong || 0)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{soQuy?.danhSachChiPhi?.length || 0} phiếu chi</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Thực Thu Ròng (Dòng Tiền)</p>
                    <p className="text-sm font-black text-emerald-700 mt-1">{formatCurrency(soQuy?.thucThuRong || (taiChinh?.tongThucThu || 0))}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Khấu trừ chi phí</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Tổng Lượt Tiếp Nhận</p>
                    <p className="text-sm font-black text-gray-900 mt-1">{tongTiepNhan} ca</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Hoàn thành: {daKham} ca</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Chỉ Định Cận Lâm Sàng</p>
                    <p className="text-sm font-black text-indigo-700 mt-1">{tongChiDinhCls} lượt</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Đã có kết quả: {daHoanThanhCls}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Giá Trị Kho Dược</p>
                    <p className="text-sm font-black text-amber-700 mt-1">{formatCurrency(tongGiaTriKho)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{tongSoMatHang} mặt hàng</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Cảnh Báo Tồn Ít</p>
                    <p className="text-sm font-black text-amber-600 mt-1">{thuocSapHetHang} thuốc</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Dưới ngưỡng an toàn</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Cận Hạn FEFO (90 ngày)</p>
                    <p className="text-sm font-black text-rose-600 mt-1">{thuocCanDateFEFO} lô</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Ưu tiên xuất dùng trước</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. PHẦN II: TÀI CHÍNH VIỆN PHÍ & DÒNG TIỀN SỔ QUỸ ── */}
            {(reportSection === 'toan_bo' || reportSection === 'tai_chinh') && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1 flex items-center justify-between">
                  <span>II. CHI TIẾT TÀI CHÍNH VIỆN PHÍ & DÒNG TIỀN SỔ QUỸ</span>
                  <span className="text-[10px] font-normal text-gray-500 lowercase">
                    (tổng thu: {formatCurrency(taiChinh?.tongThucThu || 0)} • tổng chi: {formatCurrency(soQuy?.tongChiHoatDong || 0)})
                  </span>
                </h3>

                {/* Bảng tổng hợp các khoản thu chi lớn */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800">
                        <th className="border border-gray-300 px-2 py-1.5 text-center w-10">STT</th>
                        <th className="border border-gray-300 px-2.5 py-1.5 text-left">Chỉ Tiêu Tài Chính / Khoản Mục</th>
                        <th className="border border-gray-300 px-2.5 py-1.5 text-right w-28">Số Tiền (VNĐ)</th>
                        <th className="border border-gray-300 px-2.5 py-1.5 text-center w-20">Số Chứng Từ</th>
                        <th className="border border-gray-300 px-2.5 py-1.5 text-left">Ghi Chú Nghiệp Vụ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">1</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 font-bold text-blue-950">Tổng Thu Viện Phí & Dịch Vụ Y Tế</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-right font-bold text-blue-700">{formatCurrency(taiChinh?.tongThucThu || 0)}</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-center">{taiChinh?.tongGiaoDich || 0}</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-gray-600">Đã đối soát khớp biên lai thu ngân</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">2</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 font-bold text-rose-950">Tổng Chi Hoạt Động & Mua Thuốc NCC</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-right font-bold text-rose-700">{formatCurrency(soQuy?.tongChiHoatDong || 0)}</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-center">{soQuy?.danhSachChiPhi?.length || 0}</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-gray-600">Trong đó chi NCC: {formatCurrency(soQuy?.chiMuaThuocNcc || 0)}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-bold">
                        <td className="border border-gray-300 px-2 py-1.5 text-center">3</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-emerald-950">Thực Thu Ròng (Dòng Tiền Thuần Trong Kỳ)</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-right text-emerald-800">{formatCurrency(soQuy?.thucThuRong || (taiChinh?.tongThucThu || 0))}</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-center">—</td>
                        <td className="border border-gray-300 px-2.5 py-1.5 text-emerald-800">Dòng tiền thặng dư thực tế</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Top các giao dịch viện phí gần nhất */}
                {danhSachHoaDon.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-600 mb-1">
                      Danh sách hóa đơn viện phí gần nhất ({Math.min(danhSachHoaDon.length, 10)} / {danhSachHoaDon.length} giao dịch):
                    </p>
                    <table className="w-full border-collapse border border-gray-200 text-[10px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="border border-gray-200 p-1 text-center w-8">#</th>
                          <th className="border border-gray-200 p-1 text-left">Mã HĐ</th>
                          <th className="border border-gray-200 p-1 text-left">Bệnh Nhân</th>
                          <th className="border border-gray-200 p-1 text-left">Phương Thức</th>
                          <th className="border border-gray-200 p-1 text-right">Thực Thu (VNĐ)</th>
                          <th className="border border-gray-200 p-1 text-center">Thời Gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {danhSachHoaDon.slice(0, 10).map((hd, idx) => (
                          <tr key={hd.id || idx}>
                            <td className="border border-gray-200 p-1 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1 font-mono font-semibold">{hd.maHoaDon}</td>
                            <td className="border border-gray-200 p-1">{hd.benhNhanTen}</td>
                            <td className="border border-gray-200 p-1 font-medium">{PHUONG_THUC_LABEL[hd.phuongThuc || hd.phuongThucThanhToan] || hd.phuongThuc || hd.phuongThucThanhToan || 'Tiền mặt'}</td>
                            <td className="border border-gray-200 p-1 text-right font-bold">{formatCurrency(hd.thucThu)}</td>
                            <td className="border border-gray-200 p-1 text-center text-gray-500">{formatDateTime(hd.ngayThanhToan || hd.taoLuc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── 5. PHẦN III: LÂM SÀNG & CẬN LÂM SÀNG ── */}
            {(reportSection === 'toan_bo' || reportSection === 'lam_sang') && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1 flex items-center justify-between">
                  <span>III. HIỆU SUẤT KHÁM BỆNH & CẬN LÂM SÀNG</span>
                  <span className="text-[10px] font-normal text-gray-500 lowercase">
                    (tiếp đón: {tongTiepNhan} ca • chỉ định CLS: {tongChiDinhCls} lượt)
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-gray-200 p-3 rounded-lg bg-gray-50/40">
                    <p className="font-bold text-gray-900 mb-1 text-[11px]">Tiến độ phân bổ ca khám lâm sàng:</p>
                    <ul className="space-y-1 text-gray-700 text-[11px]">
                      <li className="flex justify-between border-b border-gray-100 pb-0.5">
                        <span>Tổng tiếp nhận đăng ký:</span>
                        <strong className="text-gray-900">{tongTiepNhan} ca</strong>
                      </li>
                      <li className="flex justify-between border-b border-gray-100 pb-0.5">
                        <span>Đã khám hoàn tất:</span>
                        <strong className="text-emerald-700">{daKham} ca ({tongTiepNhan > 0 ? Math.round((daKham / tongTiepNhan) * 100) : 0}%)</strong>
                      </li>
                      <li className="flex justify-between border-b border-gray-100 pb-0.5">
                        <span>Đang trong phòng khám:</span>
                        <strong className="text-blue-700">{dangKham} ca</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Đang chờ gọi tên:</span>
                        <strong className="text-amber-700">{choKham} ca</strong>
                      </li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 p-3 rounded-lg bg-gray-50/40">
                    <p className="font-bold text-gray-900 mb-1 text-[11px]">Tiến độ thực hiện Cận lâm sàng (CLS):</p>
                    <ul className="space-y-1 text-gray-700 text-[11px]">
                      <li className="flex justify-between border-b border-gray-100 pb-0.5">
                        <span>Tổng lượt chỉ định:</span>
                        <strong className="text-gray-900">{tongChiDinhCls} lượt</strong>
                      </li>
                      <li className="flex justify-between border-b border-gray-100 pb-0.5">
                        <span>Đã có kết quả xét nghiệm/CĐHA:</span>
                        <strong className="text-emerald-700">{daHoanThanhCls} lượt ({tongChiDinhCls > 0 ? Math.round((daHoanThanhCls / tongChiDinhCls) * 100) : 0}%)</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Đang lấy mẫu / Đang phân tích:</span>
                        <strong className="text-amber-700">{choThucHienCls} lượt</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Bảng phân bổ lưu lượng theo Chuyên khoa */}
                {chuyenKhoaStats.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-600 mb-1">
                      Lưu lượng khám theo chuyên khoa ({Math.min(chuyenKhoaStats.length, 6)} khoa hàng đầu):
                    </p>
                    <table className="w-full border-collapse border border-gray-200 text-[10px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="border border-gray-200 p-1 text-center w-8">#</th>
                          <th className="border border-gray-200 p-1 text-left">Chuyên Khoa</th>
                          <th className="border border-gray-200 p-1 text-left">Bác Sĩ Phụ Trách</th>
                          <th className="border border-gray-200 p-1 text-center w-20">Số Ca</th>
                          <th className="border border-gray-200 p-1 text-right w-28">Doanh Thu Dịch Vụ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chuyenKhoaStats.slice(0, 6).map((c, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-1 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1 font-semibold">{c.chuyenKhoa}</td>
                            <td className="border border-gray-200 p-1">{c.bacSiPhuTrach}</td>
                            <td className="border border-gray-200 p-1 text-center font-bold text-blue-900">{c.soCa} ca</td>
                            <td className="border border-gray-200 p-1 text-right font-bold text-emerald-700">{formatCurrency(c.doanhThu)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── 6. PHẦN IV: DƯỢC PHẨM & CẢNH BÁO AN TOÀN KHO THUỐC ── */}
            {(reportSection === 'toan_bo' || reportSection === 'duoc') && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-xs uppercase text-blue-900 border-b border-blue-200 pb-1 flex items-center justify-between">
                  <span>IV. DƯỢC PHẨM & AN TOÀN KHO THEO NGUYÊN TẮC FEFO</span>
                  <span className="text-[10px] font-normal text-gray-500 lowercase">
                    (tổng tài sản kho: {formatCurrency(tongGiaTriKho)} • {tongSoMatHang} mặt hàng)
                  </span>
                </h3>

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-900">
                    <span>⚠️</span> Cảnh báo rủi ro tồn kho cần Ban Giám Đốc lưu ý:
                  </p>
                  <p>
                    • Có <strong>{thuocSapHetHang}</strong> mặt hàng có lượng tồn dưới ngưỡng tối thiểu (cần duyệt kế hoạch mua bổ sung).
                  </p>
                  <p>
                    • Có <strong>{thuocCanDateFEFO}</strong> lô thuốc cận hạn sử dụng trong 90 ngày (ưu tiên cấp phát theo đúng nguyên tắc FEFO).
                  </p>
                </div>

                {/* Bảng Top thuốc kê đơn */}
                {topThuocKeDon.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-gray-600 mb-1">
                      Top thuốc kê đơn có sản lượng xuất dùng cao ({Math.min(topThuocKeDon.length, 6)} mặt hàng):
                    </p>
                    <table className="w-full border-collapse border border-gray-200 text-[10px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="border border-gray-200 p-1 text-center w-8">#</th>
                          <th className="border border-gray-200 p-1 text-left">Mã Thuốc</th>
                          <th className="border border-gray-200 p-1 text-left">Tên Thuốc / Biệt Dược</th>
                          <th className="border border-gray-200 p-1 text-left">Hoạt Chất</th>
                          <th className="border border-gray-200 p-1 text-center w-24">Số Lượng Kê</th>
                          <th className="border border-gray-200 p-1 text-right w-28">Doanh Thu Thuốc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topThuocKeDon.slice(0, 6).map((t, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-1 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1 font-mono font-semibold">{t.maThuoc}</td>
                            <td className="border border-gray-200 p-1 font-semibold">{t.tenThuoc}</td>
                            <td className="border border-gray-200 p-1 text-gray-600 italic">{t.hoatChat || '-'}</td>
                            <td className="border border-gray-200 p-1 text-center font-bold">{t.soLuongKe} {t.donVi || ''}</td>
                            <td className="border border-gray-200 p-1 text-right font-bold text-emerald-700">{formatCurrency(t.doanhThu)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── 7. PHẦN V: Ý KIẾN CHỈ ĐẠO & CHỮ KÝ XÁC NHẬN ── */}
            <div className="pt-3 print:pt-2 space-y-2.5 print:space-y-1.5">
              <div className="p-2.5 print:p-2 bg-gray-50 border border-gray-300 rounded-lg space-y-1">
                <p className="font-bold text-[11px] text-gray-900 uppercase">
                  Ý KIẾN NHẬN XÉT & CHỈ ĐẠO CỦA BAN GIÁM ĐỐC:
                </p>
                <div className="h-9 print:h-7 border-b border-dashed border-gray-400"></div>
              </div>

              {/* 3 Cột Chữ Ký Chuẩn Bệnh Viện */}
              <div className="grid grid-cols-3 text-center pt-1 print:pt-0">
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px] uppercase text-gray-800">NGƯỜI LẬP BÁO CÁO</p>
                  <p className="text-[10px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-12 print:h-9"></div>
                  <p className="font-semibold text-gray-800">Tổ Thư Ký Quản Trị</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-bold text-[11px] uppercase text-gray-800">KẾ TOÁN TRƯỞNG</p>
                  <p className="text-[10px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-12 print:h-9"></div>
                  <p className="font-semibold text-gray-800">Bộ Phận Tài Chính - Kế Toán</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-bold text-[11px] uppercase text-blue-950">BAN GIÁM ĐỐC</p>
                  <p className="text-[10px] italic text-gray-500">(Ký, đóng dấu và ghi rõ họ tên)</p>
                  <div className="h-12 print:h-9"></div>
                  <p className="font-bold text-gray-950">Giám Đốc Bệnh Viện</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

