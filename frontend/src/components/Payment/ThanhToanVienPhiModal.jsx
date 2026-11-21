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
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { STK_PHONG_KHAM } from '../../utils/constants';
import { apiGet, apiPatch, apiPost } from '../../services/api';
import BankAppLinks from './BankAppLinks';

/**
 * Modal Thanh toán Viện phí Đa phương thức chuẩn ERP Y tế
 * Hỗ trợ:
 * 1. Chuyển khoản VietQR tự động qua STK Phòng khám (2729999996789)
 * 2. Bệnh nhân chọn nhận thuốc tại viện hoặc tự mua bên ngoài
 * 3. Hướng dẫn đóng tiền mặt tại Quầy Thu ngân (Kèm phiếu tạm tính)
 * Bệnh nhân chọn trên máy (chưa gửi gì), bấm "Xác nhận" một lần → server ghi lựa chọn, lập lại hóa đơn, báo thu ngân / nhà thuốc.
 * Đã xác nhận thì khóa; muốn đổi phải nhờ thu ngân.
 */
export default function ThanhToanVienPhiModal({
  isOpen,
  onClose,
  hoaDon,
  benhNhan,
  onSuccess,
  onPrintHoaDon,
}) {
  const [chonThanhToan, setChonThanhToan] = useState(null); // 'chuyen_khoan' | 'tai_quay'
  const [chonThuoc, setChonThuoc] = useState(null); // 'mua_tai_benh_vien' | 'mua_ngoai'
  const [copiedField, setCopiedField] = useState(null);
  const [detailHd, setDetailHd] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dangXacNhan, setDangXacNhan] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Mã QR động PayOS: tiền vào là hóa đơn tự chuyển "Đã thanh toán" (webhook + polling)
  const [payData, setPayData] = useState(null);
  const [payosLoi, setPayosLoi] = useState(false);
  const [daThanhToan, setDaThanhToan] = useState(false);

  // Tải chi tiết hóa đơn (Bảng kê chi tiết & Đơn thuốc) khi mở Modal
  useEffect(() => {
    if (isOpen && hoaDon?.id) {
      fetchDetailHoaDon(hoaDon.id);
    } else {
      setDetailHd(null);
      setChonThanhToan(null);
      setChonThuoc(null);
      setPayData(null);
      setPayosLoi(false);
      setDaThanhToan(false);
    }
  }, [isOpen, hoaDon?.id]);

  // Chỉ tạo mã QR PayOS khi bệnh nhân đã xác nhận chuyển khoản (số tiền đã chốt)
  const soTienQr = detailHd && detailHd.trangThai === 'cho_thanh_toan' && detailHd.luaChonThanhToan === 'chuyen_khoan'
    ? Number(detailHd.thucThu || 0)
    : null;
  useEffect(() => {
    if (!isOpen || !hoaDon?.id || !soTienQr) return;
    let active = true;
    setPayData(null);
    setPayosLoi(false);
    apiPost(`/payos/hoa-don/${hoaDon.id}/tao-link`)
      .then((res) => {
        if (!active) return;
        const data = res?.data ?? res;
        if (data?.daThanhToan) {
          setDaThanhToan(true);
          onSuccess?.();
        } else if (data?.qrCode) {
          setPayData(data);
        } else {
          setPayosLoi(true);
        }
      })
      .catch(() => active && setPayosLoi(true));
    return () => {
      active = false;
    };
  }, [isOpen, hoaDon?.id, soTienQr]);

  // Polling 4 giây: phát hiện tiền đã vào để báo bệnh nhân ngay (server cũng tự xác nhận qua webhook)
  useEffect(() => {
    if (!isOpen || !hoaDon?.id || !payData?.orderCode || daThanhToan) return;
    const timer = setInterval(async () => {
      try {
        const res = await apiGet(`/payos/hoa-don/${hoaDon.id}/kiem-tra`);
        const data = res?.data ?? res;
        if (data?.isPaid) {
          setDaThanhToan(true);
          onSuccess?.();
        }
      } catch {
        // bỏ qua lỗi mạng khi polling
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [isOpen, hoaDon?.id, payData?.orderCode, daThanhToan]);

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
    accountNo: STK_PHONG_KHAM,
    accountName: 'PHONG KHAM DA KHOA',
  };

  // Có mã PayOS thì dùng đúng tài khoản/nội dung PayOS cấp (để hệ thống đối soát tự động); nếu không thì QR tĩnh dự phòng
  const soTaiKhoan = payData?.accountNumber || BANK_INFO.accountNo;
  const maNganHang = payData?.bin || BANK_INFO.bankId;
  const tenTaiKhoan = payData?.accountName || BANK_INFO.accountName;
  const soTienCK = payData?.amount ?? thucThu;
  const noiDungCK = payData?.description || `VP ${currentHd.maHoaDon || currentHd.id}`;
  const vietQrUrl = `https://img.vietqr.io/image/${maNganHang}-${soTaiKhoan}-compact2.png?amount=${soTienCK}&addInfo=${encodeURIComponent(noiDungCK)}&accountName=${encodeURIComponent(tenTaiKhoan)}`;
  const hoaDonDaThanhToan = daThanhToan || currentHd.trangThai === 'da_thanh_toan';

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const donThuoc = currentHd.donThuoc || [];
  const coDonThuoc = donThuoc.length > 0;
  const tienThuoc = donThuoc.reduce((sum, dt) => sum + Number(dt.tongTien || 0), 0);
  const daXacNhan = Boolean(currentHd.luaChonThanhToan);
  const luaChonThuocDaLuu = coDonThuoc && donThuoc.every((dt) => dt.luaChonMua === 'mua_ngoai')
    ? 'mua_ngoai'
    : coDonThuoc && donThuoc.every((dt) => dt.luaChonMua === 'mua_tai_benh_vien') ? 'mua_tai_benh_vien' : null;
  const thuocDangChon = daXacNhan ? luaChonThuocDaLuu : chonThuoc;
  const hinhThuc = daXacNhan ? currentHd.luaChonThanhToan : chonThanhToan;

  // Gửi lựa chọn một lần duy nhất
  const handleXacNhan = async () => {
    if (!chonThanhToan || (coDonThuoc && !chonThuoc)) {
      setErrorMsg(coDonThuoc ? 'Vui lòng chọn nơi mua thuốc và hình thức thanh toán' : 'Vui lòng chọn hình thức thanh toán');
      return;
    }
    setDangXacNhan(true);
    setErrorMsg('');
    try {
      const res = await apiPatch(`/thanh-toan/hoa-don/${currentHd.id}/xac-nhan-lua-chon`, {
        luaChonThanhToan: chonThanhToan,
        ...(coDonThuoc ? { luaChonMua: chonThuoc } : {}),
      });
      if (res?.data) setDetailHd(res.data);
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err?.error?.message || err?.message || 'Không xác nhận được lựa chọn');
      fetchDetailHoaDon(currentHd.id);
    } finally {
      setDangXacNhan(false);
    }
  };

  const theChon = (active) => `p-2.5 rounded-xl border text-left transition ${
    active ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300' : 'border-gray-200 bg-white'
  } ${daXacNhan ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-emerald-300'}`;

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

          {/* 1. NƠI MUA THUỐC (nếu có đơn) — chỉ chọn trên máy, gửi khi bấm Xác nhận */}
          {coDonThuoc && !hoaDonDaThanhToan && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-2">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-indigo-600" /> Nơi mua thuốc
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['mua_tai_benh_vien', 'Mua tại nhà thuốc phòng khám', `Cộng ${formatCurrency(tienThuoc)} tiền thuốc vào viện phí`],
                  ['mua_ngoai', 'Tự mua bên ngoài', 'Không tính tiền thuốc, nhận đơn để tự mua'],
                ].map(([value, label, moTa]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={daXacNhan}
                    onClick={() => setChonThuoc(value)}
                    className={theChon(thuocDangChon === value)}
                  >
                    <div className="font-bold text-xs text-gray-900">{label}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{moTa}</div>
                  </button>
                ))}
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
                <span className="uppercase text-xs tracking-wider text-gray-700">
                  {coDonThuoc && !daXacNhan && !hoaDonDaThanhToan && luaChonThuocDaLuu !== 'mua_tai_benh_vien' ?'Tạm tính (chưa gồm thuốc):' : 'Số tiền bệnh nhân thanh toán:'}
                </span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {formatCurrency(thucThu)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. HÌNH THỨC THANH TOÁN + NÚT XÁC NHẬN */}
          {!hoaDonDaThanhToan && (
            <div className="rounded-xl border border-gray-200 p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-gray-900">Hình thức thanh toán</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['chuyen_khoan', <QrCode key="i" className="h-4 w-4" />, 'Chuyển khoản (quét QR)'],
                  ['tai_quay', <Banknote key="i" className="h-4 w-4" />, 'Thanh toán tại quầy thu ngân'],
                ].map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={daXacNhan}
                    onClick={() => setChonThanhToan(value)}
                    className={`${theChon(hinhThuc === value)} flex items-center gap-2 text-xs font-bold text-gray-900`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              {daXacNhan ? (
                <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Đã xác nhận. Muốn đổi lựa chọn, vui lòng liên hệ quầy thu ngân.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={dangXacNhan || loadingDetail}
                  onClick={handleXacNhan}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition cursor-pointer"
                >
                  {dangXacNhan ? 'Đang xác nhận...' : 'Xác nhận'}
                </button>
              )}
            </div>
          )}

          {/* TAB 1: CHUYỂN KHOẢN VIETQR */}
          {hoaDonDaThanhToan && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-900 text-sm">Đã nhận thanh toán viện phí</p>
              <p className="text-xs text-emerald-800">
                Hóa đơn đã chuyển sang <strong>Đã thanh toán</strong>. Nếu có đơn thuốc, vui lòng tới Quầy Dược để nhận thuốc.
              </p>
            </div>
          )}

          {daXacNhan && hinhThuc === 'chuyen_khoan' && !hoaDonDaThanhToan && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Mã QR */}
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                  {payData?.qrCode ? (
                    <QRCodeSVG value={payData.qrCode} size={192} level="M" className="rounded-lg" />
                  ) : payosLoi ? (
                    <img
                      src={vietQrUrl}
                      alt="VietQR Viện phí"
                      className="w-48 h-48 object-contain rounded-lg border border-gray-100 shadow-2xs"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-[11px] text-gray-500">
                      Đang tạo mã QR...
                    </div>
                  )}
                  <span className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Quét bằng bất kỳ App Ngân hàng
                  </span>
                  {payData?.qrCode && (
                    <span className="mt-1 text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-pulse" /> Đang chờ tiền vào tài khoản...
                    </span>
                  )}
                  {payosLoi && (
                    <span className="mt-1 text-[10px] text-amber-700 text-center">
                      Không kết nối được cổng thanh toán tự động — sau khi chuyển khoản, Thu ngân sẽ xác nhận thủ công.
                    </span>
                  )}
                </div>

                <BankAppLinks accountNo={soTaiKhoan} bank={maNganHang} amount={soTienCK} content={noiDungCK} accountName={tenTaiKhoan} />

                {/* Thông tin chuyển khoản chi tiết */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-gray-900">{BANK_INFO.bankName}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Số tài khoản:</span>
                      <span className="font-mono font-black text-sm text-emerald-800">{STK_PHONG_KHAM}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(STK_PHONG_KHAM, 'stk')}
                      className="px-2 py-1 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
                    >
                      {copiedField === 'stk' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Số tiền chính xác:</span>
                      <span className="font-mono font-black text-sm text-emerald-600">{formatCurrency(soTienCK)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(soTienCK), 'sotien')}
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
          {daXacNhan && hinhThuc === 'tai_quay' && !hoaDonDaThanhToan && (
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
