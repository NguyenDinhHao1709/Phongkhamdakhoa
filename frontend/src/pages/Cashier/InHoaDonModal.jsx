import { useRef } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function InHoaDonModal({ hoaDon, onClose }) {
  const printRef = useRef(null);

  if (!hoaDon) return null;

  const handlePrint = () => {
    window.print();
  };

  const PHUONG_THUC_LABEL = {
    tien_mat: 'Tiền mặt',
    chuyen_khoan: 'Chuyển khoản QR',
    the: 'Thẻ POS',
    vnpay: 'Cổng VNPay',
    momo: 'Ví MoMo',
    bao_hiem: 'BHYT',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8">
        {/* Modal Actions Bar (hidden when printing) */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <Printer className="h-5 w-5 text-primary-600" />
            <span>Phiếu Thu Viện Phí / Hóa Đơn Điện Tử</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="h-4 w-4" /> In Phiếu Thu (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE CONTENT */}
        <div ref={printRef} className="p-8 text-gray-900 font-sans text-xs space-y-6 print:p-0">
          {/* Header Phòng Khám */}
          <div className="flex justify-between items-start border-b border-gray-300 pb-4">
            <div>
              <h2 className="text-lg font-black text-primary-800 uppercase tracking-tight">Phòng Khám Đa Khoa</h2>
              <p className="text-[11px] text-gray-600">Địa chỉ: 123 Đường Sức Khỏe, Quận 1, TP. Hồ Chí Minh</p>
              <p className="text-[11px] text-gray-600">Hotline: 1900 6868 • Email: hotro@phongkham.vn</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-bold text-gray-900">Mã HĐ: {hoaDon.maHoaDon}</p>
              <p className="text-[11px] text-gray-500">Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ ĐÃ THANH TOÁN
              </span>
            </div>
          </div>

          {/* Tiêu đề chính */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">Phiếu Thu Viện Phí</h1>
            <p className="text-[11px] text-gray-500 italic">(Liên lưu trữ phòng khám & giao cho bệnh nhân)</p>
          </div>

          {/* Thông tin bệnh nhân */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs border border-gray-200">
            <div>
              <p className="text-gray-500">Họ và tên bệnh nhân:</p>
              <p className="font-bold text-sm text-gray-900">{hoaDon.benhNhan?.hoTen || 'Bệnh nhân'}</p>
            </div>
            <div>
              <p className="text-gray-500">Mã bệnh nhân:</p>
              <p className="font-mono font-bold text-gray-900">{hoaDon.benhNhan?.maBenhNhan || '--'}</p>
            </div>
            <div>
              <p className="text-gray-500">Số điện thoại:</p>
              <p className="font-medium text-gray-800">{hoaDon.benhNhan?.soDienThoai || '--'}</p>
            </div>
            <div>
              <p className="text-gray-500">Hình thức thanh toán:</p>
              <p className="font-bold text-primary-700">
                {PHUONG_THUC_LABEL[hoaDon.phuongThucThanhToan] || hoaDon.phuongThucThanhToan || 'Tiền mặt'}
              </p>
            </div>
          </div>

          {/* Bảng chi tiết các dịch vụ */}
          <div>
            <table className="w-full text-xs text-left border border-gray-300 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase border-b border-gray-300">
                <tr>
                  <th className="px-3 py-2 text-center w-10">STT</th>
                  <th className="px-3 py-2">Dịch Vụ / Nội Dung</th>
                  <th className="px-3 py-2 text-center w-16">SL</th>
                  <th className="px-3 py-2 text-right w-28">Đơn Giá</th>
                  <th className="px-3 py-2 text-right w-28">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(hoaDon.chiTiet || []).map((ct, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{ct.moTa || 'Dịch vụ khám'}</td>
                    <td className="px-3 py-2 text-center">{ct.soLuong || 1}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(ct.donGia || ct.thanhTien)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(ct.thanhTien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tổng tiền & Miễn giảm */}
          <div className="space-y-1.5 border-t border-gray-300 pt-3 text-right text-xs">
            <div className="flex justify-end gap-8">
              <span className="text-gray-500">Tổng chi phí dịch vụ:</span>
              <span className="font-semibold text-gray-800 w-28">{formatCurrency(hoaDon.tongTien)}</span>
            </div>
            {Number(hoaDon.soTienGiam) > 0 && (
              <div className="flex justify-end gap-8 text-amber-700">
                <span>Miễn giảm / BHYT chi trả:</span>
                <span className="font-semibold w-28">-{formatCurrency(hoaDon.soTienGiam)}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 text-sm font-black text-emerald-700 border-t border-dashed border-gray-300 pt-1.5">
              <span>BỆNH NHÂN ĐÃ NỘP:</span>
              <span className="w-28 text-base">{formatCurrency(hoaDon.thucThu)}</span>
            </div>
          </div>

          {/* Chữ ký hai bên */}
          <div className="grid grid-cols-2 pt-6 text-center text-xs">
            <div>
              <p className="font-bold text-gray-800">Người Nộp Tiền</p>
              <p className="text-[10px] text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-semibold text-gray-700">{hoaDon.benhNhan?.hoTen || 'Bệnh nhân'}</p>
            </div>
            <div>
              <p className="font-bold text-gray-800">Người Thu Tiền / Thu Ngân</p>
              <p className="text-[10px] text-gray-400 italic">(Ký và đóng dấu)</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-xs text-emerald-600 font-bold border-2 border-emerald-600 px-3 py-1 rounded-md rotate-[-5deg]">
                  ✓ ĐÃ THU ĐỦ
                </span>
              </div>
              <p className="font-semibold text-gray-700">{hoaDon.thuNgan?.hoTen || 'Nhân viên thu ngân'}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3 text-center text-[10px] text-gray-400 italic">
            Cảm ơn Quý khách đã tin tưởng và sử dụng dịch vụ khám chữa bệnh của Phòng Khám Đa Khoa!
          </div>
        </div>
      </div>
    </div>
  );
}

