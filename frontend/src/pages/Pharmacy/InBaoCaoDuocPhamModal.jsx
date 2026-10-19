import { useRef, useEffect } from 'react';
import { X, Printer, FileText, PackageCheck, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

export default function InBaoCaoDuocPhamModal({ stats, listThuoc = [], filterInfo = {}, onClose }) {
  const printRef = useRef(null);

  // Hỗ trợ phím tắt Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const tongSoThuoc = Number(stats?.tongSoThuoc || 0);
  const tongGiaTriKho = Number(stats?.tongGiaTriKho || 0);
  const sapHetHang = Number(stats?.sapHetHang || 0);
  const sapHetHanCount = Number(stats?.sapHetHanCount || 0);
  const donXuatTrongNgay = Number(stats?.donXuatTrongNgay || 0);
  const top10Thuoc = stats?.top10Thuoc || [];
  const canhBaoRuiRo = stats?.canhBaoRuiRo || [];

  // Xác định khoảng thời gian báo cáo
  let kyBaoCaoStr = 'Toàn bộ thời gian';
  if (filterInfo.fromDate && filterInfo.toDate) {
    kyBaoCaoStr = `Từ ngày ${formatDate(filterInfo.fromDate)} đến ngày ${formatDate(filterInfo.toDate)}`;
  } else if (filterInfo.fromDate) {
    kyBaoCaoStr = `Từ ngày ${formatDate(filterInfo.fromDate)}`;
  } else if (filterInfo.timeFilter === 'today') {
    kyBaoCaoStr = `Hôm nay (${formatDate(new Date())})`;
  } else if (filterInfo.timeFilter === '7days') {
    kyBaoCaoStr = '7 ngày gần nhất';
  } else if (filterInfo.timeFilter === 'month') {
    kyBaoCaoStr = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  } else if (filterInfo.timeFilter === 'quarter') {
    kyBaoCaoStr = `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()}`;
  }

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
                Báo Cáo Thống Kê Dược Phẩm & Xuất Nhập Tồn (Khổ A4)
              </h3>
              <p className="text-xs text-gray-500">
                Kỳ báo cáo: {kyBaoCaoStr} • Thời gian xuất: {formatDateTime(new Date())}
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
              <span>In Báo Cáo (Ctrl+P)</span>
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
                  padding: 12mm 15mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header thông tin phòng khám */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h4 className="font-bold text-sm uppercase text-gray-900">
                  PHÒNG KHÁM ĐA KHOA QUỐC TẾ
                </h4>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Kho Dược Phẩm & Thiết Bị Y Tế · Chuẩn GPP / GDP
                </p>
                <p className="text-gray-500 text-[11px]">
                  Địa chỉ: 123 Đường Y Dược, Quận 1, TP. Hồ Chí Minh · Hotline: 1900.xxxx
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider">
                  MẪU BÁO CÁO DƯỢC
                </span>
                <p className="text-[11px] text-gray-500 mt-1">
                  Mã BC: BC-DP-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-{Math.floor(1000 + Math.random() * 9000)}
                </p>
              </div>
            </div>

            {/* Tiêu đề báo cáo */}
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
                BÁO CÁO TỔNG HỢP HOẠT ĐỘNG DƯỢC & XUẤT NHẬP TỒN
              </h2>
              <p className="text-gray-600 italic text-[11px]">
                {kyBaoCaoStr}
              </p>
              <p className="text-gray-400 text-[10px]">
                (Thời điểm lập báo cáo: {formatDateTime(new Date())})
              </p>
            </div>

            {/* I. CHỈ SỐ TỔNG QUAN TỒN KHO & HOẠT ĐỘNG */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800 border-l-4 border-emerald-600 pl-2">
                I. Tổng Quan Tài Sản Kho Dược Phẩm
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="border border-gray-200 p-2.5 rounded bg-gray-50/50">
                  <div className="text-gray-500 text-[11px]">Tổng Danh Mục Thuốc</div>
                  <div className="font-bold text-sm text-gray-900 mt-0.5">
                    {tongSoThuoc.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-gray-500">mặt hàng</span>
                  </div>
                </div>
                <div className="border border-emerald-200 p-2.5 rounded bg-emerald-50/40">
                  <div className="text-emerald-700 text-[11px] font-medium">Tổng Giá Trị Tồn Kho</div>
                  <div className="font-bold text-sm text-emerald-700 mt-0.5">
                    {formatCurrency(tongGiaTriKho)}
                  </div>
                </div>
                <div className="border border-amber-200 p-2.5 rounded bg-amber-50/40">
                  <div className="text-amber-700 text-[11px] font-medium">Thuốc Cận Hạn Dùng (FEFO)</div>
                  <div className="font-bold text-sm text-amber-700 mt-0.5">
                    {sapHetHanCount.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-amber-600">mặt hàng</span>
                  </div>
                </div>
                <div className="border border-rose-200 p-2.5 rounded bg-rose-50/40">
                  <div className="text-rose-700 text-[11px] font-medium">Thuốc Sắp Hết / Nguy Cấp</div>
                  <div className="font-bold text-sm text-rose-700 mt-0.5">
                    {sapHetHang.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-rose-600">mặt hàng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* II. TOP 10 THUỐC XUẤT DÙNG NHIỀU NHẤT TRONG KỲ */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800 border-l-4 border-emerald-600 pl-2">
                II. Top Mặt Hàng Thuốc Xuất Dùng & Kê Đơn Cao Nhất
              </h3>
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                      <th className="p-2 text-center w-10">STT</th>
                      <th className="p-2 text-left w-24">Mã Thuốc</th>
                      <th className="p-2 text-left">Tên Biệt Dược / Hoạt Chất</th>
                      <th className="p-2 text-center w-20">ĐVT</th>
                      <th className="p-2 text-right w-24">Số Lượng Xuất</th>
                      <th className="p-2 text-right w-28">Tồn Kho Hiện Tại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {top10Thuoc.length > 0 ? (
                      top10Thuoc.map((item, idx) => {
                        const matchingThuoc = (listThuoc || []).find(
                          (t) => t.maThuoc === item.maThuoc || t.tenThuoc === item.tenThuoc
                        );
                        const soLuongXuat = Number(
                          item.soLuongKe ?? item.soLuongXuat ?? item.soLuong ?? 0
                        );
                        const tonKho = Number(
                          item.tonKhoTong ?? item.tonKho ?? matchingThuoc?.tonKhoTong ?? 0
                        );
                        const donViTinh =
                          item.donViTinh || matchingThuoc?.donViTinh || 'Hộp';

                        return (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                            <td className="p-2 text-center font-medium text-gray-500">{idx + 1}</td>
                            <td className="p-2 font-mono text-[10px] text-gray-600">{item.maThuoc || `TH-${idx + 1}`}</td>
                            <td className="p-2 font-medium text-gray-900">{item.tenThuoc}</td>
                            <td className="p-2 text-center text-gray-600">{donViTinh}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">
                              {soLuongXuat.toLocaleString('vi-VN')}
                            </td>
                            <td className="p-2 text-right text-gray-700">
                              {tonKho.toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                          Chưa có dữ liệu giao dịch xuất thuốc trong kỳ báo cáo này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* III. CẢNH BÁO RỦI RO & KHUYẾN NGHỊ VẬN HÀNH KHO */}
            {canhBaoRuiRo.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-rose-800 border-l-4 border-rose-600 pl-2">
                  III. Cảnh Báo Rủi Ro Tồn Kho & Hạn Dùng Cần Xử Lý
                </h3>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-rose-50/60 text-gray-700 font-semibold border-b border-gray-300">
                        <th className="p-2 text-center w-10">STT</th>
                        <th className="p-2 text-left">Mặt Hàng Dược Phẩm</th>
                        <th className="p-2 text-left w-36">Loại Rủi Ro</th>
                        <th className="p-2 text-center w-24">Mức Độ</th>
                        <th className="p-2 text-left">Đề Xuất Xử Lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {canhBaoRuiRo.slice(0, 6).map((cb, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                          <td className="p-2 font-medium text-gray-900">{cb.tenThuoc}</td>
                          <td className="p-2 text-rose-700 font-medium">{cb.loaiRuiRo}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              cb.mucDo === 'nguy_cap' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {cb.mucDo === 'nguy_cap' ? 'NGUY CẤP' : 'CẢNH BÁO'}
                            </span>
                          </td>
                          <td className="p-2 text-gray-600 italic">{cb.khuyenNghi || 'Lập kế hoạch mua bổ sung / ưu tiên xuất kho FEFO'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* IV. PHẦN KÝ TÊN VÀ XÁC NHẬN 4 BÊN */}
            <div className="pt-6 border-t border-gray-300 mt-6">
              <div className="grid grid-cols-4 text-center gap-4 text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">NGƯỜI LẬP BÁO CÁO</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-gray-700">Dược sĩ trực</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">THỦ KHO DƯỢC</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-gray-700">Thủ kho</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">KẾ TOÁN DƯỢC</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-gray-700">Kế toán viên</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">GIÁM ĐỐC / TRƯỞNG KHOA</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký và đóng dấu)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-gray-700">Phê duyệt</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 mt-6 pt-3 border-t border-dashed border-gray-200">
                Báo cáo được trích xuất tự động từ Hệ thống Quản trị Bệnh viện & Nhà thuốc ERP • Chứng từ nội bộ bảo mật
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

