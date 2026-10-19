import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Copy,
  Check,
  X,
  Printer,
  ShieldCheck,
  AlertCircle,
  Clock,
  MapPin,
  FileText,
  User,
  Pill,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { apiGet, apiPatch } from '../../services/api';

/**
 * Modal Thanh toán Viện phí Đa phương thức chuẩn ERP Y tế
 * Hỗ trợ:
 * 1. Chuyển khoản VietQR tự động qua STK Phòng khám (2729999996789)
 * 2. Bệnh nhân linh hoạt chọn nhận thuốc tại viện hoặc tự mua bên ngoài
 * 3. Hướng dẫn đóng tiền mặt tại Quầy Thu ngân (Kèm phiếu tạm tính)
 */
export default function ThanhToanVienPhiModal({
  isOpen,
  onClose,
  hoaDon,
  benhNhan,
  onSuccess,
  onPrintHoaDon,
}) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'cash'
  const [copiedField, setCopiedField] = useState(null);
  const [detailHd, setDetailHd] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingMedicine, setUpdatingMedicine] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải chi tiết hóa đơn (Bảng kê chi tiết & Đơn thuốc) khi mở Modal
  useEffect(() => {
    if (isOpen && hoaDon?.id) {
      fetchDetailHoaDon(hoaDon.id);
    } else {
      setDetailHd(null);
    }
  }, [isOpen, hoaDon?.id]);

  const fetchDetailHoaDon = async (id) => {
    setLoadingDetail(true);
    setErrorMsg('');
    try {
      const res = await apiGet(`/thanh-toan/${id}`);
      if (res?.data) {
        setDetailHd(res.data);
      }
    } catch (err) {
      console.error('Không thể tải chi tiết hóa đơn:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (!isOpen || !hoaDon) return null;

  // Dữ liệu ưu tiên từ detailHd, fallback về hoaDon
  const currentHd = detailHd || hoaDon;
  const tongTien = Number(currentHd.tongTien || 0);
  const soTienGiam = Number(currentHd.soTienGiam || 0);
  const tienCoc = Number(currentHd.tienCocDaThu || 0);
  const thucThu = Number(currentHd.thucThu ?? Math.max(0, tongTien - soTienGiam - tienCoc));

  // Cấu hình tài khoản ngân hàng phòng khám
  const BANK_INFO = {
    bankId: 'MB',
    bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
    accountNo: '2729999996789',
    accountName: 'PHONG KHAM DA KHOA',
  };

  const noiDungCK = `VP ${currentHd.maHoaDon || currentHd.id}`;
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_INFO.bankId}-${BANK_INFO.accountNo}-compact2.png?amount=${thucThu}&addInfo=${encodeURIComponent(noiDungCK)}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Bệnh nhân đổi lựa chọn: Mua thuốc tại phòng khám hoặc tự mua bên ngoài
  const handleChangeMedicineChoice = async (luaChonMua) => {
    if (!currentHd?.id) return;
    setUpdatingMedicine(true);
    setErrorMsg('');
    try {
      const res = await apiPatch(`/thanh-toan/hoa-don/${currentHd.id}/lua-chon-thuoc`, { luaChonMua });
      if (res?.data) {
        setDetailHd(res.data);
        onSuccess?.();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể cập nhật lựa chọn nhận thuốc');
    } finally {
      setUpdatingMedicine(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Thanh toán Viện phí Khám chữa bệnh</h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono">Mã HĐ: <strong className="text-white">{currentHd.maHoaDon || `HD#${currentHd.id}`}</strong></span>
                {benhNhan?.hoTen && <span>• Bệnh nhân: <strong className="text-white">{benhNhan.hoTen}</strong></span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. KHỐI TÙY CHỌN NHẬN ĐƠN THUỐC (NẾU CÓ ĐƠN THUỐC TRONG CA KHÁM) */}
          {currentHd.donThuoc && currentHd.donThuoc.length > 0 && currentHd.trangThai !== 'da_thanh_toan' && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-indigo-600" /> Tùy chọn mua đơn thuốc:
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">
                  {updatingMedicine ? 'Đang cập nhật...' : 'Bệnh nhân có thể tùy chọn trước khi thanh toán'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Đơn thuốc luôn được lưu đầy đủ trong hồ sơ y tế. Bạn có thể chọn lấy thuốc ngay tại Nhà thuốc phòng khám hoặc nhận đơn để tự mua bên ngoài:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={updatingMedicine}
                  onClick={() => handleChangeMedicineChoice('mua_tai_benh_vien')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    currentHd.donThuoc.every((dt) => dt.luaChonMua === 'mua_tai_benh_vien')
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-900">
                    🟢 Mua thuốc tại phòng khám
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    Tính tiền thuốc vào viện phí & cấp phát tại Nhà thuốc phòng khám
                  </div>
                </button>

                <button
                  type="button"
                  disabled={updatingMedicine}
                  onClick={() => handleChangeMedicineChoice('mua_ngoai')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    currentHd.donThuoc.every((dt) => dt.luaChonMua === 'mua_ngoai')
                      ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-xs ring-2 ring-amber-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                    🟡 Tự mua thuốc bên ngoài
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    Không tính tiền thuốc vào viện phí. Nhận đơn thuốc để tự mua bên ngoài
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 2. BẢNG KÊ CHI TIẾT CÁC KHOẢN CHI PHÍ */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" /> Bảng kê chi tiết viện phí khám bệnh
              </span>
              <span className="text-gray-500 font-mono text-[11px]">
                {formatDateTime(currentHd.taoLuc || currentHd.ngayTao || new Date())}
              </span>
            </div>

            {loadingDetail ? (
              <div className="py-4 text-center text-gray-500 text-xs">
                Đang tải bảng kê chi tiết viện phí...
              </div>
            ) : currentHd.chiTiet && currentHd.chiTiet.length > 0 ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/80 text-[11px] font-bold text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Khoản chi phí</th>
                      <th className="px-2 py-2 text-center w-12">SL</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {currentHd.chiTiet.map((item, idx) => {
                      const isTamUng = item.loaiPhi === 'tam_ung' || Number(item.thanhTien) < 0;
                      return (
                        <tr key={idx} className={isTamUng ? 'bg-blue-50/70 font-medium text-blue-900' : 'hover:bg-gray-50/50'}>
                          <td className="px-3 py-2 font-medium">
                            {isTamUng ? (
                              <span className="font-bold text-blue-800 flex items-center gap-1">
                                ✓ {item.moTa || item.loaiPhi}
                              </span>
                            ) : (
                              item.moTa || item.loaiPhi
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">{item.soLuong || 1}</td>
                          <td className={`px-3 py-2 text-right ${isTamUng ? 'text-blue-700 font-mono' : ''}`}>
                            {Number(item.donGia) < 0
                              ? `- ${formatCurrency(Math.abs(item.donGia))}`
                              : formatCurrency(item.donGia)}
                          </td>
                          <td className={`px-3 py-2 text-right font-bold ${isTamUng ? 'text-blue-700 font-mono' : 'text-gray-900 font-mono'}`}>
                            {Number(item.thanhTien) < 0
                              ? `- ${formatCurrency(Math.abs(item.thanhTien))}`
                              : formatCurrency(item.thanhTien)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-between text-gray-600">
                <span>Tổng tiền viện phí các danh mục:</span>
                <span className="font-semibold font-mono text-gray-900">{formatCurrency(tongTien)}</span>
              </div>
            )}

            {/* Khối tổng kết số tiền */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Tổng viện phí dịch vụ:</span>
                <span className="font-semibold font-mono text-gray-900">{formatCurrency(tongTien)}</span>
              </div>

              {tienCoc > 0 && (
                <div className="flex justify-between text-blue-700 bg-blue-50/70 px-2 py-1 rounded border border-blue-100">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    Đã cọc đặt lịch hẹn ({currentHd.maLichHenCoc || 'Trước ca khám'}):
                  </span>
                  <span className="font-bold font-mono text-blue-800">- {formatCurrency(tienCoc)}</span>
                </div>
              )}

              {soTienGiam > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Khấu trừ BHYT / Giảm giá:</span>
                  <span className="font-semibold font-mono">- {formatCurrency(soTienGiam)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                <span className="uppercase text-xs tracking-wider text-gray-700">Số tiền bệnh nhân thanh toán:</span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {formatCurrency(thucThu)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. BỘ CHUYỂN TAB PHƯƠNG THỨC THANH TOÁN */}
          <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span>Chuyển khoản VietQR (Nhanh nhất)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cash')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'cash'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Banknote className="h-4 w-4" />
              <span>Tiền mặt tại Quầy Thu ngân</span>
            </button>
          </div>

          {/* TAB 1: CHUYỂN KHOẢN VIETQR */}
          {activeTab === 'qr' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Mã QR */}
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  <img
                    src={vietQrUrl}
                    alt="VietQR Viện phí"
                    className="w-48 h-48 object-contain rounded-lg border border-gray-100 shadow-2xs"
                  />
                  <span className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Quét bằng bất kỳ App Ngân hàng
                  </span>
                </div>

                {/* Thông tin chuyển khoản chi tiết */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-gray-900">{BANK_INFO.bankName}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Số tài khoản:</span>
                      <span className="font-mono font-black text-sm text-emerald-800">{BANK_INFO.accountNo}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(BANK_INFO.accountNo, 'stk')}
                      className="px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                    >
                      {copiedField === 'stk' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Số tiền chính xác:</span>
                      <span className="font-mono font-black text-sm text-emerald-600">{formatCurrency(thucThu)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(thucThu), 'sotien')}
                      className="px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                    >
                      {copiedField === 'sotien' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'sotien' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Nội dung chuyển khoản:</span>
                      <span className="font-mono font-black text-sm text-emerald-950">{noiDungCK}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(noiDungCK, 'noidung')}
                      className="px-2 py-1 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                    >
                      {copiedField === 'noidung' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'noidung' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn hoàn tất chuyển khoản (Đã xóa nút tôi đã chuyển khoản theo yêu cầu) */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-950">Hướng dẫn hoàn tất thanh toán:</p>
                  <p className="text-[11px] text-emerald-800">
                    Vui lòng quét mã VietQR và kiểm tra đúng số tiền và nội dung chuyển khoản. Viện phí sẽ được Thu ngân xác nhận hoặc hệ thống tự động cập nhật khi giao dịch thành công.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIỀN MẶT TẠI QUẦY THU NGÂN */}
          {activeTab === 'cash' && (
            <div className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-3 text-amber-950">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Hướng dẫn thanh toán Tiền mặt tại Quầy Thu ngân</h4>
                    <p className="text-[11px] text-amber-800">Dành cho bệnh nhân muốn đóng tiền mặt hoặc quẹt thẻ POS trực tiếp</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-200/80">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Địa điểm thu ngân:</strong> Quầy Thu ngân & Viện phí (Tầng 1 - Cửa số 2, cạnh Quầy Tiếp đón).
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Thông tin xuất trình:</strong> Đọc <strong>Mã bệnh nhân</strong> hoặc <strong>Số thứ tự khám trong ngày</strong> cho nhân viên thu ngân.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Số tiền cần thanh toán:</strong> <strong className="text-sm font-mono text-rose-700">{formatCurrency(thucThu)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 flex items-center justify-between gap-3">
                <div className="text-gray-600">
                  <span className="font-semibold text-gray-800 block">Cần in phiếu tạm tính chi phí?</span>
                  <span className="text-[11px]">Bạn có thể in phiếu tạm tính để đối chiếu cùng nhân viên thu ngân.</span>
                </div>
                {onPrintHoaDon && (
                  <button
                    type="button"
                    onClick={() => {
                      onPrintHoaDon(currentHd);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Printer className="h-3.5 w-3.5 text-gray-600" /> In phiếu tạm tính
                  </button>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-[11px] flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Sau khi nhân viên thu ngân xác nhận thu tiền mặt tại quầy, trạng thái lượt khám của bạn sẽ <strong>tự động đổi sang Đã thanh toán</strong> và đơn thuốc sẽ được chuyển tới Quầy Dược để bạn nhận thuốc.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
          {onPrintHoaDon ? (
            <button
              type="button"
              onClick={() => onPrintHoaDon(currentHd)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-gray-600" /> In phiếu viện phí
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
