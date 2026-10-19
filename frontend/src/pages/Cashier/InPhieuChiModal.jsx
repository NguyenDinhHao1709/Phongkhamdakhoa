import { useRef } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';

// Chuyển số thành chữ tiếng Việt đơn giản cho phiếu chi
function docSoThanhChu(so) {
  if (!so || isNaN(so)) return 'Không đồng';
  const ChuSo = [' không ', ' một ', ' hai ', ' ba ', ' bốn ', ' năm ', ' sáu ', ' bảy ', ' tám ', ' chín '];
  const Tien = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
  
  let lan = 0;
  let i = 0;
  let soStr = '';
  let ViTri = [];
  let ketQua = '';
  
  let num = Math.abs(Math.round(so));
  if (num === 0) return 'Không đồng';

  while (num > 0) {
    ViTri[lan] = num % 1000;
    num = Math.floor(num / 1000);
    lan++;
  }

  for (i = lan - 1; i >= 0; i--) {
    const tram = Math.floor(ViTri[i] / 100);
    const chuc = Math.floor((ViTri[i] % 100) / 10);
    const donVi = ViTri[i] % 10;
    let chuoi = '';

    if (tram !== 0 || chuc !== 0 || donVi !== 0) {
      if (tram !== 0) {
        chuoi += ChuSo[tram] + 'trăm';
        if (chuc === 0 && donVi !== 0) chuoi += ' linh';
      }
      if (chuc !== 0 && chuc !== 1) {
        chuoi += ChuSo[chuc] + 'mươi';
        if (chuc === 0 && donVi !== 0) chuoi += ' linh';
      }
      if (chuc === 1) chuoi += ' mười';
      switch (donVi) {
        case 1:
          if (chuc !== 0 && chuc !== 1) chuoi += ' mốt';
          else chuoi += ChuSo[donVi];
          break;
        case 5:
          if (chuc === 0) chuoi += ChuSo[donVi];
          else chuoi += ' lăm';
          break;
        default:
          if (donVi !== 0) chuoi += ChuSo[donVi];
          break;
      }
      ketQua += chuoi + Tien[i];
    }
  }

  ketQua = ketQua.trim();
  if (ketQua.length > 0) {
    ketQua = ketQua.charAt(0).toUpperCase() + ketQua.slice(1) + ' đồng chẵn.';
  }
  return ketQua.replace(/\s+/g, ' ');
}

export default function InPhieuChiModal({ voucher, onClose }) {
  const printRef = useRef(null);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const soTien = Number(voucher.soTien || 0);
  const soTienChu = docSoThanhChu(soTien);
  const maPC = voucher.soChungTu || voucher.maPhieuChi || voucher.id;
  const nguoiNhan = voucher.doiTuong || voucher.nguoiNhan || 'Người nhận tiền';
  const lyDoChi = voucher.dienGiai || voucher.khoanChi || 'Chi phí phòng khám';
  const phuongThuc = voucher.phuongThuc || voucher.phuongThucChi || 'tien_mat';
  const ngayChi = voucher.ngayLap || voucher.ngayChi || new Date();
  const chungTuGoc = voucher.chungTuGoc || voucher.soHoaDonNcc || '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in border border-gray-200">
        {/* Header Action Bar - CỐ ĐỊNH Ở TRÊN CÙNG, KHÔNG BỊ CUỘN MẤT */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Phiếu Chi Tiền (Mẫu 02-TT - Bộ Tài Chính)
              </h3>
              <p className="text-xs text-gray-500">Mã phiếu: {maPC}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Phiếu Chi (Ctrl+P)</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100/70 flex justify-center">
          {/* TỜ PHIẾU IN CÓ ID PRINT-SECTION */}
          <div
            id="print-section"
            ref={printRef}
            className="w-full max-w-[210mm] bg-white p-8 sm:p-10 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-6"
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

            {/* Header Thông tin phòng khám & Mẫu quy định */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h2 className="text-sm font-black text-emerald-800 uppercase">PHÒNG KHÁM ĐA KHOA</h2>
                <p className="text-[11px] text-gray-600">Địa chỉ: 123 Đường Sức Khỏe, Quận 1, TP. Hồ Chí Minh</p>
                <p className="text-[11px] text-gray-600">Bộ phận: Kế toán thanh toán & Thủ quỹ phòng khám</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[11px] text-gray-800">Mẫu số 02 - TT</p>
                <p className="text-[10px] text-gray-500 italic">(Ban hành theo TT số 200/2014/TT-BTC của BTC)</p>
                <p className="font-mono text-xs font-bold text-emerald-700 mt-1">Số: {maPC}</p>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">PHIẾU CHI</h1>
              <p className="text-[11px] text-gray-500 italic">
                {formatDate(ngayChi)}
              </p>
            </div>

            {/* Nội dung chi tiết phiếu chi */}
            <div className="space-y-2.5 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div className="flex">
                <span className="w-44 text-gray-600">Họ và tên người nhận tiền:</span>
                <span className="font-bold text-gray-900 flex-1">{nguoiNhan}</span>
              </div>
              <div className="flex">
                <span className="w-44 text-gray-600">Lý do chi / Khoản chi:</span>
                <span className="font-medium text-gray-900 flex-1">{lyDoChi}</span>
              </div>
              <div className="flex">
                <span className="w-44 text-gray-600">Hình thức thanh toán:</span>
                <span className="font-semibold text-emerald-800 flex-1">
                  {phuongThuc === 'tien_mat' ? 'Tiền mặt tại quỹ' : 'Chuyển khoản ngân hàng'}
                </span>
              </div>
              <div className="flex">
                <span className="w-44 text-gray-600">Số tiền chi:</span>
                <span className="text-base font-black text-emerald-700 flex-1">
                  {formatCurrency(soTien)}
                </span>
              </div>
              <div className="flex">
                <span className="w-44 text-gray-600">Viết bằng chữ:</span>
                <span className="font-semibold italic text-gray-800 flex-1">{soTienChu}</span>
              </div>
              {chungTuGoc && (
                <div className="flex">
                  <span className="w-44 text-gray-600">Kèm theo chứng từ gốc:</span>
                  <span className="font-mono font-medium text-gray-700 flex-1">{chungTuGoc}</span>
                </div>
              )}
            </div>

            {/* 5 CHỮ KÝ CHUẨN THÔNG TƯ 200/BTC */}
            <div className="pt-4">
              <div className="text-right text-[11px] italic text-gray-600 mb-2">
                Ngày ..... tháng ..... năm 2026
              </div>
              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                <div>
                  <p className="font-bold uppercase text-gray-800">Thủ trưởng đơn vị</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên, đóng dấu)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Ban Giám Đốc</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-800">Kế toán trưởng</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Kế toán trưởng</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-800">Người lập phiếu</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">{voucher.nguoiLap || 'Thu ngân / Kế toán'}</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-800">Thủ quỹ</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">Thủ quỹ</p>
                </div>

                <div>
                  <p className="font-bold uppercase text-gray-800">Người nhận tiền</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">{nguoiNhan}</p>
                </div>
              </div>
            </div>

            {/* Ghi chú nhận tiền */}
            <div className="border-t border-dashed border-gray-300 pt-3 text-[10px] text-gray-500 italic">
              * Đã nhận đủ số tiền (viết bằng chữ): {soTienChu}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

