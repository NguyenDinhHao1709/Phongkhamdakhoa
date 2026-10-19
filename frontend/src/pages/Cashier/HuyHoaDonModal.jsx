import { useState, useEffect } from 'react';
import { X, AlertTriangle, RotateCcw, Building2, Copy, Check, QrCode, Banknote } from 'lucide-react';
import { apiPatch } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

const LY_DO_PRESETS = [
  'Hoàn trả 100% tiền cọc đặt lịch hẹn (Hủy hợp lệ trước >= 24h)',
  'Bệnh nhân yêu cầu hủy / Không tiếp tục khám',
  'Bác sĩ xin hủy ca khám (Ban Giám Đốc đã phê duyệt hoàn cọc)',
  'Bác sĩ chỉ định hủy bớt dịch vụ / Cận lâm sàng',
  'Thu ngân / Lễ tân nhập sai dịch vụ chỉ định',
  'Hủy do lỗi kỹ thuật hệ thống / Thu trùng',
];

const BANK_BIN_MAP = {
  vietcombank: '970436',
  vcb: '970436',
  mbbank: '970422',
  mb: '970422',
  techcombank: '970407',
  tcb: '970407',
  bidv: '970418',
  vietinbank: '970415',
  ctg: '970415',
  agribank: '970405',
  acb: '970416',
  vpbank: '970432',
  tpbank: '970423',
  sacombank: '970403',
  hdbank: '970437',
  vib: '970441',
  shb: '970443',
};

function getBankBin(bankName = '') {
  const lower = bankName.toLowerCase().replace(/\s+/g, '');
  for (const [key, bin] of Object.entries(BANK_BIN_MAP)) {
    if (lower.includes(key)) return bin;
  }
  return null;
}

export default function HuyHoaDonModal({ hoaDon, onClose, onSuccess }) {
  const isTamUng =
    hoaDon?.loaiHoaDon === 'tam_ung_dat_lich' ||
    hoaDon?.maHoaDon?.startsWith('HDT') ||
    hoaDon?.choHoanCoc;
  const infoHoan = hoaDon?.thongTinHoanCoc || null;

  const [lyDoHuy, setLyDoHuy] = useState(
    isTamUng ? LY_DO_PRESETS[0] : LY_DO_PRESETS[1]
  );
  const [customLyDo, setCustomLyDo] = useState('');
  const [ghiChu, setGhiChu] = useState('Hoàn trả tiền mặt tại quầy thu ngân');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedStk, setCopiedStk] = useState(false);

  useEffect(() => {
    if (!hoaDon) return;
    if (isTamUng && infoHoan) {
      if (infoHoan.phuongThucNhan === 'chuyen_khoan' && infoHoan.soTaiKhoan) {
        setGhiChu(
          `Đã CK hoàn cọc 40.000đ về ${infoHoan.nganHang} - STK ${infoHoan.soTaiKhoan} (${infoHoan.chuTaiKhoan})`
        );
      } else if (infoHoan.phuongThucNhan === 'tien_mat') {
        setGhiChu('Đã chi tiền mặt hoàn cọc 40.000đ trực tiếp cho bệnh nhân tại quầy');
      } else {
        setGhiChu('Đã liên hệ bệnh nhân và hoàn trả 40.000đ tiền cọc lịch hẹn');
      }
    }
  }, [hoaDon, isTamUng]);

  if (!hoaDon) return null;

  const soTienHoan = Number(hoaDon.thucThu || hoaDon.tongTien || 40000);
  const bankBin = infoHoan?.nganHang ? getBankBin(infoHoan.nganHang) : null;
  const qrTransferUrl =
    bankBin && infoHoan?.soTaiKhoan
      ? `https://img.vietqr.io/image/${bankBin}-${encodeURIComponent(
          infoHoan.soTaiKhoan.trim()
        )}-compact2.png?amount=${soTienHoan}&addInfo=${encodeURIComponent(
          `HOAN COC ${hoaDon.maLichHen || hoaDon.maHoaDon}`
        )}&accountName=${encodeURIComponent(infoHoan.chuTaiKhoan || '')}`
      : null;

  const handleCopyStk = () => {
    if (!infoHoan?.soTaiKhoan) return;
    navigator.clipboard?.writeText(infoHoan.soTaiKhoan);
    setCopiedStk(true);
    setTimeout(() => setCopiedStk(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalLyDo = lyDoHuy === 'Khác' ? customLyDo.trim() : lyDoHuy;
    if (!finalLyDo) {
      setErrorMsg('Vui lòng nhập lý do hủy / hoàn tiền.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiPatch(`/thanh-toan/hoa-don/${hoaDon.id}/huy`, {
        lyDoHuy: finalLyDo,
        ghiChu: ghiChu.trim() || undefined,
      });
      alert(
        isTamUng
          ? 'Đã xác nhận giải ngân hoàn trả 40.000đ tiền cọc lịch hẹn cho bệnh nhân thành công!'
          : 'Đã hủy hóa đơn và ghi nhận hoàn tiền thành công!'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.error?.message || err?.message || 'Không thể xử lý hoàn tiền. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-rose-50/70 border-rose-100">
          <div className="flex items-center gap-2.5 text-rose-800">
            <div className="p-2 bg-rose-100 rounded-xl">
              <RotateCcw className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                {isTamUng ? 'Giải Ngân Hoàn Cọc Đặt Lịch Hẹn (100%)' : 'Hủy Hóa Đơn & Hoàn Tiền Viện Phí'}
              </h3>
              <p className="text-xs text-rose-700">
                Mã chứng từ: <span className="font-mono font-bold">{hoaDon.maHoaDon}</span>
                {hoaDon.maLichHen ? ` • Lịch hẹn: ${hoaDon.maLichHen}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông tin hóa đơn */}
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Bệnh nhân thụ hưởng:</span>
              <span className="font-bold text-gray-900">
                {hoaDon.benhNhan?.hoTen || 'Bệnh nhân'}
                {hoaDon.benhNhan?.soDienThoai ? ` (${hoaDon.benhNhan.soDienThoai})` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Số tiền cần hoàn trả:</span>
              <span className="text-base font-black text-rose-700">
                {formatCurrency(soTienHoan)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Phương thức đã thu ban đầu:</span>
              <span className="font-semibold text-gray-700 capitalize">
                {hoaDon.phuongThucThanhToan === 'chuyen_khoan' ? 'Chuyển khoản / QR' : hoaDon.phuongThucThanhToan || 'Tiền mặt'}
              </span>
            </div>
            {hoaDon.ngayThanhToan && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Thời gian thu tiền:</span>
                <span className="text-gray-600">{formatDateTime(hoaDon.ngayThanhToan)}</span>
              </div>
            )}
          </div>

          {/* Khối Thông tin Tài khoản Nhận Hoàn Cọc của Bệnh nhân (Chuẩn ERP Y tế) */}
          {isTamUng && (
            <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Thông tin nhận hoàn cọc do Bệnh nhân cung cấp
                </span>
                {infoHoan?.phuongThucNhan === 'chuyen_khoan' && infoHoan?.soTaiKhoan ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Chuyển khoản Ngân hàng
                  </span>
                ) : infoHoan?.phuongThucNhan === 'tien_mat' ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Nhận tiền mặt tại quầy
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                    Chưa khai báo STK
                  </span>
                )}
              </div>

              {infoHoan?.phuongThucNhan === 'chuyen_khoan' && infoHoan?.soTaiKhoan ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-indigo-100">
                  <div className={`${qrTransferUrl ? 'sm:col-span-7' : 'sm:col-span-12'} space-y-1.5 text-xs`}>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ngân hàng / Ví:</span>
                      <span className="font-bold text-indigo-900">{infoHoan.nganHang}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {infoHoan.soTaiKhoan}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyStk}
                          className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedStk ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chủ tài khoản:</span>
                      <span className="font-bold text-gray-900 uppercase">{infoHoan.chuTaiKhoan}</span>
                    </div>
                    {infoHoan.lyDoHuy && (
                      <div className="pt-1 border-t border-gray-100 text-[11px] text-gray-600">
                        Lý do hủy: <span className="font-medium text-gray-800">{infoHoan.lyDoHuy}</span>
                      </div>
                    )}
                  </div>

                  {qrTransferUrl && (
                    <div className="sm:col-span-5 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-100 pt-2 sm:pt-0 sm:pl-3">
                      <img
                        src={qrTransferUrl}
                        alt="VietQR Hoàn Cọc"
                        className="w-32 h-32 object-contain rounded-lg border border-gray-200 bg-white p-1"
                      />
                      <span className="text-[10px] font-semibold text-indigo-700 mt-1 flex items-center gap-1">
                        <QrCode className="h-3 w-3" /> Quét QR chuyển hoàn 40k
                      </span>
                    </div>
                  )}
                </div>
              ) : infoHoan?.phuongThucNhan === 'tien_mat' ? (
                <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
                  <Banknote className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">Bệnh nhân đăng ký nhận tiền mặt trực tiếp tại Quầy Thu Ngân</p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Đối chiếu SĐT <strong className="text-gray-800">{hoaDon.benhNhan?.soDienThoai}</strong> hoặc CCCD khi chi trả tiền mặt tại quầy.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs text-gray-600">
                  Bệnh nhân chưa cập nhật Số tài khoản ngân hàng trên cổng bệnh nhân. Thu ngân có thể liên hệ SĐT{' '}
                  <strong className="text-gray-900">{hoaDon.benhNhan?.soDienThoai || 'bệnh nhân'}</strong> để hỏi STK chuyển khoản hoặc hoàn tiền mặt tại quầy.
                </div>
              )}
            </div>
          )}

          {/* Chọn lý do hủy */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Lý do hoàn trả / hủy chứng từ <span className="text-rose-600">*</span>
            </label>
            <select
              value={lyDoHuy}
              onChange={(e) => setLyDoHuy(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {LY_DO_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
              <option value="Khác">Lý do khác (Nhập chi tiết)</option>
            </select>
          </div>

          {lyDoHuy === 'Khác' && (
            <div className="space-y-1">
              <textarea
                value={customLyDo}
                onChange={(e) => setCustomLyDo(e.target.value)}
                placeholder="Nhập chi tiết lý do hủy hóa đơn..."
                rows={2}
                className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                required
              />
            </div>
          )}

          {/* Ghi chú hoàn tiền */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Nội dung chứng từ hoàn tiền / Mã giao dịch ngân hàng (UNC)
            </label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Vd: Đã CK hoàn cọc mã GD FT26289... hoặc Hoàn tiền mặt tại quầy"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Cảnh báo kế toán ERP */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
            ⚠️ <b>Quy định kiểm soát tài chính ERP:</b> Thu ngân thực hiện chuyển khoản hoàn tiền vào STK của bệnh nhân (hoặc chi tiền mặt), sau đó bấm xác nhận bên dưới. Hệ thống sẽ ghi nhận phiếu hoàn tiền, trừ khỏi thực thu ca trực và gửi thông báo hoàn tất cho bệnh nhân.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>
                {submitting
                  ? 'Đang xử lý...'
                  : isTamUng
                  ? 'Xác nhận đã chuyển hoàn cọc'
                  : 'Xác nhận hủy & Hoàn tiền'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

