import { useRef } from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';

const DENOMINATIONS = [
  { key: '500k', value: 500000, label: '500.000 đ' },
  { key: '200k', value: 200000, label: '200.000 đ' },
  { key: '100k', value: 100000, label: '100.000 đ' },
  { key: '50k', value: 50000, label: '50.000 đ' },
  { key: '20k', value: 20000, label: '20.000 đ' },
  { key: '10k', value: 10000, label: '10.000 đ' },
  { key: '5k', value: 5000, label: '5.000 đ' },
  { key: '2k', value: 2000, label: '2.000 đ' },
  { key: '1k', value: 1000, label: '1.000 đ' },
];

export default function InBienBanChotCaModal({ record, onClose }) {
  const printRef = useRef(null);

  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const chiTietMenhGia = record.chiTietMenhGia || {};
  const chenhLech = Number(record.chenhLech || 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-hidden">
      {/* Khung modal với chiều cao tối đa và thanh cuộn nội bộ */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        
        {/* 1. THANH HEADER CỐ ĐỊNH - KHÔNG BAO GIỜ BỊ CUỘN MẤT (shrink-0 no-print) */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                Biên Bản Bàn Giao Ca Trực & Kiểm Kê Két Tiền
              </h3>
              <p className="text-[11px] text-gray-500">Mã biên bản: <span className="font-mono font-bold text-emerald-700">{record.maChotCa}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>In Biên Bản (Ctrl+P)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. KHUNG CUỘN XEM TRƯỚC BẢN IN TRÊN GIAO DIỆN */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
          
          {/* 3. TỜ IN CHUẨN A4 MANG id="print-section" (BẢO ĐẢM 100% HIỂN THỊ KHI IN RA GIẤY / PDF) */}
          <div
            ref={printRef}
            id="print-section"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-300 text-gray-900 font-serif space-y-5"
            style={{ fontSize: '13px', lineHeight: '1.5' }}
          >
            {/* Header Phòng Khám & Mã Biên Bản */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3">
              <div>
                <p className="text-xs uppercase font-bold text-gray-700">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <h2 className="text-sm font-black text-emerald-800 uppercase">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</h2>
                <p className="text-[11px] text-gray-600">Địa chỉ: 123 Đường Sức Khỏe, Quận 1, TP. Hồ Chí Minh</p>
                <p className="text-[11px] text-gray-600">Bộ phận: Kế toán thu ngân & Quản trị tài chính ERP</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs font-bold text-emerald-800">SỐ: {record.maChotCa}</p>
                <p className="text-[11px] text-gray-600">Lập lúc: {formatDateTime(record.taoLuc || new Date())}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                  {record.trangThai === 'da_ban_giao' ? '✓ ĐÃ BÀN GIAO TIỀN' : '✓ ĐÃ CHỐT SỐ LIỆU KÉT'}
                </span>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center space-y-1 pt-1">
              <h1 className="text-lg font-black text-gray-900 uppercase tracking-wide">
                BIÊN BẢN BÀN GIAO CA TRỰC THU NGÂN & KIỂM KÊ KÉT TIỀN
              </h1>
              <p className="text-[11px] text-gray-600 italic">
                Thời gian ca trực: Từ <b>{formatDateTime(record.thoiGianBatDau)}</b> đến <b>{formatDateTime(record.thoiGianKetThuc)}</b>
              </p>
            </div>

            {/* Thông tin 2 bên bàn giao */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-3.5 rounded-lg border border-gray-300 text-xs">
              <div>
                <p className="text-gray-500 text-[11px]">BÊN GIAO (Thu ngân hết ca trực):</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {record.thuNgan?.hoTen || 'Thu ngân giao ca'}
                </p>
                <p className="text-[11px] text-gray-600">Chức vụ: Thu ngân kiêm kế toán thanh toán</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11px]">BÊN NHẬN (Thu ngân ca tiếp theo):</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {record.nguoiNhanCa?.hoTen || 'Người nhận ca tiếp theo'}
                </p>
                <p className="text-[11px] text-gray-600">Chức vụ: Thu ngân tiếp nhận két tiền</p>
              </div>
            </div>

            {/* BẢNG 1: TỔNG HỢP GIAO DỊCH TRONG CA */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 mb-1.5">
                I. Tổng hợp thu - chi trong ca trực
              </h3>
              <table className="w-full text-xs border border-gray-400">
                <thead className="bg-gray-100 text-gray-800 font-bold uppercase text-[11px] border-b border-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left border-r border-gray-400">Nội dung chỉ tiêu</th>
                    <th className="px-3 py-2 text-center w-28 border-r border-gray-400">Số chứng từ</th>
                    <th className="px-3 py-2 text-right w-44">Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  <tr>
                    <td className="px-3 py-1.5 font-medium border-r border-gray-300">
                      1. Tổng thực thu viện phí trong ca (Hóa đơn đã thu)
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono border-r border-gray-300">{record.soLuongPhieuThu || 0} HĐ</td>
                    <td className="px-3 py-1.5 text-right font-bold text-emerald-800">{formatCurrency(record.tongThucThu || 0)}</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-3 py-1 pl-6 text-gray-600 border-r border-gray-300">• Thu bằng Tiền mặt tại quầy</td>
                    <td className="px-3 py-1 text-center text-gray-400 border-r border-gray-300">-</td>
                    <td className="px-3 py-1 text-right font-semibold text-gray-900">
                      {formatCurrency((record.tongThucThu || 0) - (record.tongThuChuyenKhoan || 0))}
                    </td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-3 py-1 pl-6 text-gray-600 border-r border-gray-300">• Thu Chuyển khoản ngân hàng / QR / Thẻ</td>
                    <td className="px-3 py-1 text-center text-gray-400 border-r border-gray-300">-</td>
                    <td className="px-3 py-1 text-right font-semibold text-gray-900">{formatCurrency(record.tongThuChuyenKhoan || 0)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-medium text-rose-800 border-r border-gray-300">
                      2. Tổng chi tiền mặt tại quỹ trong ca (Phiếu chi OPEX)
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono border-r border-gray-300">{record.soLuongPhieuChi || 0} PC</td>
                    <td className="px-3 py-1.5 text-right font-bold text-rose-700">-{formatCurrency(record.tongChiTienMat || 0)}</td>
                  </tr>
                  <tr className="bg-emerald-50/80 font-bold border-t-2 border-gray-400">
                    <td className="px-3 py-2 text-emerald-950 border-r border-gray-400">
                      3. TIỀN MẶT HỆ THỐNG GHI NHẬN TẠI KÉT (1 - 2)
                    </td>
                    <td className="px-3 py-2 text-center text-emerald-900 border-r border-gray-400">Khớp sổ</td>
                    <td className="px-3 py-2 text-right text-emerald-950 text-sm">{formatCurrency(record.tienMatHeThong || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BẢNG 2: KIỂM ĐẾM MỆNH GIÁ TIỀN MẶT */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 mb-1.5">
                II. Bảng kê chi tiết kiểm đếm mệnh giá tiền mặt thực tế trong két
              </h3>
              <table className="w-full text-xs border border-gray-400">
                <thead className="bg-gray-100 text-gray-800 font-bold uppercase text-[11px] border-b border-gray-400">
                  <tr>
                    <th className="px-3 py-1.5 text-center w-12 border-r border-gray-400">STT</th>
                    <th className="px-3 py-1.5 text-left border-r border-gray-400">Mệnh giá tờ tiền</th>
                    <th className="px-3 py-1.5 text-center w-28 border-r border-gray-400">Số lượng tờ</th>
                    <th className="px-3 py-1.5 text-right">Thành tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {DENOMINATIONS.map((den, idx) => {
                    const qty = Number(chiTietMenhGia[den.key] || 0);
                    const total = qty * den.value;
                    return (
                      <tr key={den.key} className={qty > 0 ? 'bg-white' : 'text-gray-400'}>
                        <td className="px-3 py-1 text-center font-mono border-r border-gray-300">{idx + 1}</td>
                        <td className="px-3 py-1 font-semibold border-r border-gray-300">{den.label}</td>
                        <td className="px-3 py-1 text-center font-mono font-bold border-r border-gray-300">{qty}</td>
                        <td className="px-3 py-1 text-right font-mono font-medium">
                          {total > 0 ? formatCurrency(total) : '0 đ'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-50 font-bold text-blue-950 border-t-2 border-gray-400">
                    <td colSpan={3} className="px-3 py-2 uppercase border-r border-gray-400">
                      TỔNG TIỀN MẶT THỰC TẾ KIỂM ĐẾM TẠI KÉT:
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {formatCurrency(record.tienMatThucTe || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BẢNG 3: KẾT LUẬN ĐỐI SOÁT */}
            <div className="bg-gray-50/90 p-4 rounded-lg border border-gray-300 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">
                III. Kết luận đối soát két tiền ca trực
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center text-xs pt-1">
                <div className="bg-white p-2.5 rounded border border-gray-300">
                  <p className="text-[11px] text-gray-500">Tiền mặt hệ thống:</p>
                  <p className="font-bold text-gray-900 mt-0.5">{formatCurrency(record.tienMatHeThong || 0)}</p>
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-300">
                  <p className="text-[11px] text-gray-500">Tiền thực đếm tại két:</p>
                  <p className="font-bold text-blue-900 mt-0.5">{formatCurrency(record.tienMatThucTe || 0)}</p>
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-300">
                  <p className="text-[11px] text-gray-500">Chênh lệch quỹ:</p>
                  <p className="font-bold mt-0.5">
                    {chenhLech === 0 ? '✓ Khớp hoàn toàn (0 đ)' : formatCurrency(chenhLech)}
                  </p>
                </div>
              </div>

              {record.ghiChu && (
                <p className="text-[11px] text-gray-700 pt-1 border-t border-gray-200 mt-2">
                  <b>Ghi chú ca trực:</b> {record.ghiChu}
                </p>
              )}
            </div>

            {/* 3 CHỮ KÝ XÁC NHẬN */}
            <div className="pt-4">
              <div className="text-right text-[11px] italic text-gray-600 mb-2">
                Biên bản lập xong lúc {new Date().toLocaleTimeString('vi-VN')} ngày {new Date().toLocaleDateString('vi-VN')}, các bên đã kiểm đếm và nhất trí ký tên.
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="font-bold uppercase text-gray-900">Người bàn giao</p>
                  <p className="text-gray-500 italic text-[10px]">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16 flex items-center justify-center">
                    <span className="italic text-gray-400 font-serif">[Đã ký bàn giao]</span>
                  </div>
                  <p className="font-bold text-gray-900">{record.thuNgan?.hoTen || 'Thu ngân giao ca'}</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-900">Người nhận bàn giao</p>
                  <p className="text-gray-500 italic text-[10px]">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16 flex items-center justify-center">
                    <span className="italic text-gray-400 font-serif">[Đã nhận đủ tiền]</span>
                  </div>
                  <p className="font-bold text-gray-900">{record.nguoiNhanCa?.hoTen || 'Thu ngân nhận ca'}</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-900">Kế toán trưởng / Quản lý</p>
                  <p className="text-gray-500 italic text-[10px]">(Ký & xác nhận)</p>
                  <div className="h-16 flex items-center justify-center">
                    <span className="italic text-gray-400 font-serif">[Đã duyệt sổ quỹ]</span>
                  </div>
                  <p className="font-bold text-gray-900">Kế toán trưởng</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Scoped print CSS để đảm bảo trình duyệt in toàn bộ nội dung #print-section */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
