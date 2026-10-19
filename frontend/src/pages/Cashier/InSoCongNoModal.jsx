import { useRef } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

export default function InSoCongNoModal({
  apList = [],
  opexList = [],
  apStats = {},
  opexStats = {},
  mainSection = 'mua_thuoc',
  onClose,
}) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const isAp = mainSection === 'mua_thuoc';
  const tieuDe = isAp
    ? 'SỔ THEO DÕI CÔNG NỢ & CHI TRẢ NHÀ CUNG CẤP (AP)'
    : 'SỔ QUẢN LÝ CHI PHÍ HOẠT ĐỘNG & VẬN HÀNH (OPEX)';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in border border-gray-200">
        {/* Header Action Bar - CỐ ĐỊNH Ở TRÊN CÙNG, KHÔNG BỊ CUỘN MẤT */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                In Sổ Kế Toán Chi Trả & Quản Lý Công Nợ (Khổ A4)
              </h3>
              <p className="text-xs text-gray-500">
                Phân hệ: {isAp ? 'Sổ Công Nợ Thuốc NCC (AP)' : 'Chi Phí Vận Hành (OPEX)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Sổ Kế Toán (Ctrl+P)</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Khung cuộn nội bộ cho bản xem trước */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
          {/* TỜ IN KHỔ A4 CÓ ID PRINT-SECTION */}
          <div
            id="print-section"
            ref={printRef}
            className="w-full max-w-[210mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-6"
          >
            {/* Scoped CSS để in không bị trang trắng */}
            <style>{`
              @media print {
                body { visibility: hidden !important; background: white !important; margin: 0 !important; }
                #print-section, #print-section * { visibility: visible !important; }
                #print-section {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-shadow: none !important;
                  border: none !important;
                  padding: 15mm 20mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header thông tin phòng khám */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h2 className="text-sm font-black text-emerald-800 uppercase tracking-wide">PHÒNG KHÁM ĐA KHOA</h2>
                <p className="text-[11px] text-gray-600">Địa chỉ: 123 Đường Sức Khỏe, Quận 1, TP. Hồ Chí Minh</p>
                <p className="text-[11px] text-gray-600">Bộ phận: Kế toán thanh toán & Mua hàng dược phẩm</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[11px] text-gray-800">Mẫu số S02 - AP</p>
                <p className="text-[10px] text-gray-500 italic">(Ban hành theo TT số 200/2014/TT-BTC)</p>
                <p className="text-[10px] text-gray-500 mt-1">Ngày in: {formatDateTime(new Date())}</p>
              </div>
            </div>

            {/* Tiêu đề */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                {tieuDe}
              </h1>
              <p className="text-[11px] text-gray-600 italic">
                Thời điểm lập sổ: {formatDate(new Date())}
              </p>
            </div>

            {/* BẢNG TỔNG QUAN CHỈ TIÊU TÀI CHÍNH */}
            <div>
              <h3 className="font-bold text-xs uppercase text-emerald-800 mb-2 border-b border-gray-200 pb-1">
                I. Chỉ Tiêu Tổng Hợp & Cân Đối Công Nợ
              </h3>
              {isAp ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <p className="text-[11px] text-gray-500">Tổng Giá Trị Nhập Kho (PO)</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {formatCurrency(apStats?.tongGiaTriNhap || 0)}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{apList.length} phiếu nhập</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <p className="text-[11px] text-emerald-800">Đã Thanh Toán (Đã Chi)</p>
                    <p className="text-sm font-black text-emerald-700 mt-1">
                      {formatCurrency(apStats?.tongDaChi || 0)}
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">{apStats?.soHoSoDaChi || 0} hồ sơ đã chi</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <p className="text-[11px] text-amber-800">Công Nợ Còn Phải Trả</p>
                    <p className="text-sm font-black text-amber-700 mt-1">
                      {formatCurrency(apStats?.tongChoChi || 0)}
                    </p>
                    <p className="text-[10px] text-amber-700 mt-0.5">{apStats?.soHoSoChoChi || 0} hồ sơ chờ chi</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <p className="text-[11px] text-gray-500">Tổng Chi Phí Vận Hành (OPEX)</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {formatCurrency(opexStats?.tongChi || 0)}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{opexStats?.soPhieu || 0} phiếu chi</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                    <p className="text-[11px] text-blue-800">Chi Bằng Tiền Mặt Tại Quỹ</p>
                    <p className="text-sm font-black text-blue-700 mt-1">
                      {formatCurrency(opexStats?.tienMat || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                    <p className="text-[11px] text-purple-800">Chi Chuyển Khoản Ngân Hàng</p>
                    <p className="text-sm font-black text-purple-700 mt-1">
                      {formatCurrency(opexStats?.chuyenKhoan || 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* BẢNG CHI TIẾT SỔ SÁCH */}
            <div>
              <h3 className="font-bold text-xs uppercase text-emerald-800 mb-2 border-b border-gray-200 pb-1">
                II. Chi Tiết Các Chứng Từ & Hồ Sơ Kế Toán ({isAp ? apList.length : opexList.length} bản ghi)
              </h3>
              <table className="w-full text-[11px] border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">STT</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left w-24">Số Chứng Từ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Ngày Lập</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">
                      {isAp ? 'Nhà Cung Cấp' : 'Khoản Chi / Đối Tượng'}
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Hóa Đơn / Gốc</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Số Tiền (VNĐ)</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-24">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {isAp ? (
                    apList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-gray-300 px-3 py-4 text-center text-gray-400 italic">
                          Không có hồ sơ công nợ mua thuốc
                        </td>
                      </tr>
                    ) : (
                      apList.slice(0, 30).map((item, idx) => {
                        const daChi = item.trangThaiChiTra === 'da_chi';
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1.5 text-center">{idx + 1}</td>
                            <td className="border border-gray-300 px-2 py-1.5 font-mono font-bold text-gray-800">
                              {item.maYeuCau || item.soChungTuChi || '--'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-600">
                              {formatDate(item.ngayTao || item.ngayChiTra)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 font-medium">
                              {item.nhaCungCap?.tenNhaCungCap || item.nhaCungCap || '--'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-700">
                              {item.soHoaDonNcc || '--'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-gray-900">
                              {formatCurrency(item.tongThucTe || item.soTienChiTra || 0)}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                              {daChi ? (
                                <span className="text-emerald-700">Đã Chi</span>
                              ) : (
                                <span className="text-amber-700">Chờ Chi</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : opexList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-3 py-4 text-center text-gray-400 italic">
                        Không có phiếu chi phí vận hành
                      </td>
                    </tr>
                  ) : (
                    opexList.slice(0, 30).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-2 py-1.5 font-mono font-bold text-gray-800">
                          {item.maPhieuChi || item.id || '--'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-600">
                          {formatDate(item.ngayChi)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 font-medium">
                          {item.khoanChi || '--'} ({item.nguoiNhan || '--'})
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 font-mono text-gray-700">
                          {item.chungTuGoc || '--'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-rose-700">
                          {formatCurrency(item.soTien || 0)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-emerald-700">
                          Đã Xuất Quỹ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* CHỮ KÝ 4 BÊN */}
            <div className="pt-6">
              <div className="text-right text-[11px] italic text-gray-600 mb-2">
                TP. Hồ Chí Minh, ngày ..... tháng ..... năm 2026
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-[10px]">
                <div>
                  <p className="font-bold uppercase text-gray-800">Ban Giám Đốc</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên, đóng dấu)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Ban Giám Đốc</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-gray-800">Kế Toán Trưởng</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Kế Toán Trưởng</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-gray-800">Thủ Quỹ</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Thủ Quỹ</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-gray-800">Người Lập Sổ</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Thu ngân / Kế toán AP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

