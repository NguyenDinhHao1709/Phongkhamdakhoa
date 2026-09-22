import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2,
  Printer, X, ShieldCheck, HeartPulse, Building2, Phone
} from 'lucide-react';

export default function AppointmentTicketModal({
  isOpen,
  onClose,
  appointment,
  onViewAllAppointments
}) {
  const printRef = useRef(null);

  if (!isOpen || !appointment) return null;

  const {
    maLichHen = 'LH2026',
    soThuTu = 'A001',
    ngayHen = '',
    gioHen = '',
    hinhThuc = 'truc_tiep',
    phongKham,
    bacSi,
    benhNhan,
    lyDoKham,
    qrCodeValue,
  } = appointment;

  // Tên phòng khám và vị trí
  const tenPhong = phongKham?.tenPhong || phongKham?.ten_phong || 'Phòng Khám Chuyên Khoa';
  const viTri = phongKham?.viTri || phongKham?.vi_tri || 'Tầng 1 - Khu Tiếp Nhận Lâm Sàng';

  // Tên bác sĩ
  const tenBacSi = bacSi?.nhanVien?.hoTen || bacSi?.hoTen || 'Bác sĩ chuyên khoa theo phân công';
  const chuyenKhoa = bacSi?.chuyenKhoa || appointment.chuyenKhoa || 'Đa Khoa';

  // Tên bệnh nhân
  const tenBenhNhan = benhNhan?.hoTen || appointment.hoTen || 'Bệnh nhân';
  const soDienThoai = benhNhan?.soDienThoai || appointment.soDienThoai || '';

  // QR Code data: chứa mã lịch hẹn, STT, giờ hẹn và mã phòng khám
  const qrData = qrCodeValue || `${maLichHen}|STT:${soThuTu}|DATE:${ngayHen}|TIME:${gioHen}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-6 animate-fade-in flex flex-col">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 to-primary-600 px-6 py-4 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md font-bold">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Phiếu Hẹn Khám Điện Tử</h2>
              <p className="text-xs text-blue-100">Đã thanh toán tạm ứng & Xác nhận lịch hẹn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-100 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung phiếu hẹn (Khu vực có thể in ra) */}
        <div ref={printRef} id="print-section" className="p-6 space-y-5 bg-white">
          {/* Logo & Tên cơ sở */}
          <div className="text-center pb-4 border-b border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center gap-2 text-primary-700 font-extrabold text-base tracking-wide uppercase">
              <HeartPulse className="h-5 w-5 text-blue-600" />
              <span>Phòng Khám Đa Khoa</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">123 Đường Y Học, Quận 1, TP.HCM • Hotline: 1900 8888</p>
          </div>

          {/* SỐ THỨ TỰ (STT) NỔI BẬT */}
          <div className="bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-white px-3 py-1 rounded-full border border-blue-200">
              Số Thứ Tự Tiếp Nhận Khám
            </span>
            <div className="text-5xl font-black text-blue-700 font-mono tracking-wider my-2">
              {soThuTu}
            </div>
            <p className="text-xs text-blue-900 font-medium">
              Mã lịch hẹn: <span className="font-mono font-bold text-primary-700">{maLichHen}</span>
            </p>
          </div>

          {/* MÃ QR CODE TIẾP ĐÓN */}
          <div className="flex flex-col items-center justify-center py-2 bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <QRCodeSVG
                value={qrData}
                size={150}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[11px] text-gray-600 font-semibold mt-2.5 text-center flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 inline" />
              Quét mã này tại Kiosk hoặc Quầy tiếp nhận khi đến khám
            </p>
          </div>

          {/* Chi tiết lịch khám */}
          <div className="space-y-2.5 text-xs text-left bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-600" /> Bệnh nhân:
              </span>
              <span className="font-bold text-gray-900 text-sm">{tenBenhNhan}</span>
            </div>

            {soDienThoai && (
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-500 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-blue-600" /> Số điện thoại:
                </span>
                <span className="font-semibold text-gray-800 font-mono">{soDienThoai}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-blue-600" /> Phòng khám:
              </span>
              <span className="font-bold text-blue-700 text-right">{tenPhong}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-600" /> Vị trí phòng:
              </span>
              <span className="font-semibold text-gray-800">{viTri}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" /> Giờ khám & Ngày:
              </span>
              <span className="font-bold text-gray-900">
                <span className="text-blue-700 text-sm">{gioHen}</span> • Ngày {ngayHen}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-gray-500 flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Bác sĩ phụ trách:
              </span>
              <span className="font-semibold text-gray-900">{tenBacSi} ({chuyenKhoa})</span>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <span className="text-gray-500">Tạm ứng phí khám (1/5):</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                40.000 đ (Đã thanh toán)
              </span>
            </div>
          </div>

          {/* Lời dặn */}
          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <p className="font-bold">⚠️ Lưu ý dành cho người bệnh:</p>
            <p>• Quý khách vui lòng có mặt trước giờ hẹn <strong>15 phút</strong> tại phòng khám để quét mã QR check-in.</p>
            <p>• Nếu cần hủy lịch, quý khách phải hủy <strong>trước ngày khám ít nhất 1 ngày (24 tiếng)</strong> để được hoàn 100% tiền tạm ứng.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors"
          >
            <Printer className="h-4 w-4" /> In Phiếu Ra Giấy
          </button>

          {onViewAllAppointments && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewAllAppointments();
              }}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Calendar className="h-4 w-4" /> Xem Lịch Hẹn Của Tôi
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

