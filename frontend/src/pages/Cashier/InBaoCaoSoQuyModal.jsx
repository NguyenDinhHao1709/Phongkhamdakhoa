import { useRef } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import useHospitalStore from '../../store/hospitalStore';

const PHUONG_THUC_LABELS = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản QR',
  the: 'Thẻ POS',
  vnpay: 'Cổng VNPay',
  momo: 'Ví MoMo',
  bao_hiem: 'BHYT',
};

export default function InBaoCaoSoQuyModal({ stats, chungTu = [], kyBaoCaoLabel, filterInfo = {}, onClose }) {
  const printRef = useRef(null);
  const hospitalInfo = useHospitalStore((s) => s.hospitalInfo);

  const handlePrint = () => {
    window.print();
  };

  const byPhuongThuc = stats?.byPhuongThuc || {};
  const tongThuTheoPT = Object.values(byPhuongThuc).reduce((sum, v) => sum + Number(v || 0), 0);
  const tongThu = Number(stats?.tongThucThu ?? stats?.tongPhieuThu ?? 0);
  const tongChi = Number(stats?.tongPhieuChi ?? 0);
  const soDuQuyRong = Number(stats?.soDuDongTien ?? (tongThu - tongChi));
  // Liệt kê đúng các phương thức có phát sinh (kể cả mã chưa có nhãn), để cộng các dòng ra đúng dòng Tổng
  const dongPhuongThuc = [
    ...Object.keys(PHUONG_THUC_LABELS),
    ...Object.keys(byPhuongThuc).filter((k) => !PHUONG_THUC_LABELS[k]),
  ];

  // Kỳ báo cáo lấy đúng nhãn của trang (trước đây thiếu "Quý này", "Đến ngày...")
  const kyBaoCaoStr = kyBaoCaoLabel || 'Toàn thời gian';
  const namHienTai = new Date().getFullYear();
  const soHoan = chungTu.filter((c) => c.loai === 'phieu_huy').length;

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
                Báo Cáo Sổ Quỹ & Dòng Tiền Thu - Chi (Khổ A4)
              </h3>
              <p className="text-xs text-gray-500">
                Phạm vi: {filterInfo.phamVi === 'ca_nhan' ? 'Ca Trực Cá Nhân' : 'Toàn Viện'} • {kyBaoCaoStr}
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
                  padding: 15mm 20mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header thông tin phòng khám */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h2 className="text-sm font-black text-emerald-800 uppercase tracking-wide">{hospitalInfo?.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}</h2>
                {hospitalInfo?.diaChi && <p className="text-[11px] text-gray-600">Địa chỉ: {hospitalInfo.diaChi}</p>}
                <p className="text-[11px] text-gray-600">Bộ phận: Thu ngân & Kế toán viện phí</p>
              </div>
              <div className="text-right">
                {/* Báo cáo quản trị nội bộ — không ghi số hiệu mẫu biểu TT200 vì không theo mẫu đó */}
                <p className="font-bold text-[11px] text-gray-800">Báo cáo quản trị nội bộ</p>
                <p className="text-[10px] text-gray-500 mt-1">Ngày lập: {formatDateTime(new Date())}</p>
              </div>
            </div>

            {/* Tiêu đề báo cáo */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                BÁO CÁO SỔ QUỸ & DÒNG TIỀN THU - CHI
              </h1>
              <p className="text-[11px] text-gray-600 italic">
                Kỳ báo cáo: {kyBaoCaoStr} • Phạm vi: {filterInfo.phamVi === 'ca_nhan' ? 'Ca trực cá nhân' : 'Toàn phòng khám'}
              </p>
              {stats?.isCaNhan && stats?.tenThuNgan && (
                <p className="text-[11px] font-semibold text-emerald-800">
                  Thu ngân thực hiện: {stats.tenThuNgan}
                </p>
              )}
            </div>

            {/* 1. TỔNG HỢP CÂN ĐỐI DÒNG TIỀN */}
            <div>
              <h3 className="font-bold text-xs uppercase text-emerald-800 mb-2 border-b border-gray-200 pb-1">
                I. Tổng Hợp Cân Đối Quỹ & Dòng Tiền Thuần (Cash Flow)
              </h3>
              <table className="w-full text-xs border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-center w-12">STT</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Chỉ Tiêu Tài Chính</th>
                    <th className="border border-gray-300 px-3 py-2 text-right w-44">Số Tiền (VNĐ)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">1</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">TỔNG THU VIỆN PHÍ (Dòng tiền vào)</td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-700">
                      {formatCurrency(tongThu)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">
                      {stats?.soPhieuThu ?? 0} phiếu thu (viện phí, tạm ứng) — đã trừ tiền hoàn
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">2</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">TỔNG CHI HOẠT ĐỘNG (Dòng tiền ra)</td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-bold text-rose-700">
                      {formatCurrency(tongChi)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">
                      Tiền thuốc NCC {formatCurrency(stats?.tongChiThuoc ?? 0)} • Vận hành {formatCurrency(stats?.tongChiOpex ?? 0)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/60">
                    <td className="border border-gray-300 px-3 py-2 text-center font-black text-emerald-900">3</td>
                    <td className="border border-gray-300 px-3 py-2 font-black text-emerald-900">
                      SỐ DƯ DÒNG TIỀN THUẦN (NET CASH FLOW)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-black text-emerald-800 text-sm">
                      {formatCurrency(soDuQuyRong)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-emerald-800">
                      = Tổng Thu - Tổng Chi
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. CƠ CẤU THEO PHƯƠNG THỨC THANH TOÁN */}
            <div>
              <h3 className="font-bold text-xs uppercase text-emerald-800 mb-2 border-b border-gray-200 pb-1">
                II. Cơ Cấu Doanh Thu Theo Phương Thức Thanh Toán
              </h3>
              <table className="w-full text-xs border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-center w-12">STT</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Phương Thức Thanh Toán</th>
                    <th className="border border-gray-300 px-3 py-2 text-right w-44">Doanh Thu (VNĐ)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right w-24">Tỷ Trọng (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {dongPhuongThuc.map((key, idx) => {
                    const val = Number(byPhuongThuc[key] || 0);
                    const pct = tongThuTheoPT > 0 ? ((val / tongThuTheoPT) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={key}>
                        <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-3 py-2 font-medium">{PHUONG_THUC_LABELS[key] || key}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                          {formatCurrency(val)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-600">{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={2} className="border border-gray-300 px-3 py-2 text-center uppercase">
                      Tổng Cộng
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-blue-700">
                      {formatCurrency(tongThuTheoPT)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      {tongThuTheoPT > 0 ? '100%' : '0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. NHẬT KÝ CHỨNG TỪ GIAO DỊCH PHÁT SINH */}
            <div>
              <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-1">
                <h3 className="font-bold text-xs uppercase text-emerald-800">
                  III. Nhật Ký Chứng Từ Thu - Chi Phát Sinh ({chungTu.length} chứng từ)
                </h3>
              </div>
              <table className="w-full text-[11px] border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">STT</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left w-24">Số Chứng Từ</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Ngày Lập</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">Đối Tượng / Người Nộp - Nhận</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">Diễn Giải Nội Dung</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-right w-24">Thu (VNĐ)</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-right w-24">Chi (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {chungTu.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-3 py-4 text-center text-gray-400 italic">
                        Không có chứng từ phát sinh trong kỳ báo cáo
                      </td>
                    </tr>
                  ) : (
                    // In đủ mọi chứng từ của kỳ (trước đây cắt ở 30 dòng)
                    chungTu.map((ct, idx) => {
                      const isThu = ct.loai === 'phieu_thu';
                      const isHoan = ct.loai === 'phieu_huy';
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-gray-300 px-2 py-1.5 font-mono font-bold text-gray-800">
                            {ct.soChungTu || '--'}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-600">
                            {formatDate(ct.ngayLap)}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 font-medium">{ct.doiTuong || '--'}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-700">{ct.dienGiai || '--'}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-blue-700">
                            {isThu ? formatCurrency(ct.soTien) : '-'}
                          </td>
                          {/* Hoàn tiền đã trừ sẵn trong phiếu thu → ghi trong ngoặc, không phải khoản chi */}
                          <td className={`border border-gray-300 px-2 py-1.5 text-right font-bold ${isHoan ? 'text-amber-700 italic' : 'text-rose-700'}`}>
                            {isThu ? '-' : isHoan ? `(${formatCurrency(ct.soTien)})` : formatCurrency(ct.soTien)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {chungTu.length > 0 && (
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="border border-gray-300 px-2 py-1.5 text-right uppercase">Cộng phát sinh</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-blue-700">{formatCurrency(tongThu)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-rose-700">{formatCurrency(tongChi)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {soHoan > 0 && (
                <p className="mt-1 text-[10px] italic text-gray-500">
                  Số trong ngoặc ( ): {soHoan} khoản hoàn tiền cho bệnh nhân — đã trừ trong cột Thu, không cộng vào tổng Chi.
                </p>
              )}
            </div>

            {/* CHỮ KÝ PHÊ DUYỆT 4 BÊN CHUẨN KẾ TOÁN */}
            <div className="pt-6">
              <div className="text-right text-[11px] italic text-gray-600 mb-2">
                TP. Hồ Chí Minh, ngày ..... tháng ..... năm {namHienTai}
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-[10px]">
                <div>
                  <p className="font-bold uppercase text-gray-800">Thủ Trưởng Đơn Vị</p>
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
                  <p className="font-bold uppercase text-gray-800">Người Lập Biểu</p>
                  <p className="text-gray-400 italic text-[9px]">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16" />
                  <p className="font-medium text-gray-700">{stats?.tenThuNgan || 'Thu ngân / Kế toán'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

