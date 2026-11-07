import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import useHospitalStore from '../../store/hospitalStore';
import {
  Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2,
  Printer, X, ShieldCheck, HeartPulse, Building2, Phone, Video, Wifi
} from 'lucide-react';

export default function AppointmentTicketModal({
  isOpen,
  onClose,
  appointment,
  onViewAllAppointments
}) {
  const printRef = useRef(null);
  const hospitalInfo = useHospitalStore((s) => s.hospitalInfo);

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
    soTienThanhToan,
    soTienCoc,
    soTien,
  } = appointment;

  const isOnline = hinhThuc === 'truc_tuyen';

  // Tên phòng khám và vị trí (Chỉ áp dụng cho khám trực tiếp tại phòng khám)
  const tenPhong = isOnline
    ? 'Khám & Tư vấn trực tuyến từ xa (Telehealth 1-1)'
    : (phongKham?.tenPhong || phongKham?.ten_phong || 'Phòng Khám Chuyên Khoa');
  const viTri = isOnline
    ? 'Phòng gọi Video trực tuyến trên hệ thống (Mở trước 15 phút)'
    : (phongKham?.viTri || phongKham?.vi_tri || 'Tầng 1 - Khu Tiếp Nhận Lâm Sàng');

  // Tên bác sĩ
  const tenBacSi = bacSi?.nhanVien?.hoTen || bacSi?.hoTen || 'Bác sĩ chuyên khoa theo phân công';
  const chuyenKhoa = bacSi?.chuyenKhoa || appointment.chuyenKhoa || 'Đa Khoa';

  // Tên bệnh nhân
  const tenBenhNhan = benhNhan?.hoTen || appointment.hoTen || 'Bệnh nhân';
  const soDienThoai = benhNhan?.soDienThoai || appointment.soDienThoai || '';

  // Số tiền đã thanh toán (Ưu tiên lấy số tiền thực tế được truyền)
  const actualPaidAmount = Number(soTienThanhToan ?? soTienCoc ?? soTien ?? (isOnline ? 2000 : 40000));
  const formattedPaidAmount = actualPaidAmount.toLocaleString('vi-VN') + ' đ';

  // QR Code data: chứa mã lịch hẹn, STT, giờ hẹn và mã phòng khám
  const qrData = qrCodeValue || `${maLichHen}|STT:${soThuTu}|DATE:${ngayHen}|TIME:${gioHen}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Dọn dẹp iframe in cũ nếu có để tránh đệm trạng thái
    const oldIframe = document.getElementById('ticket-print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'ticket-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Phiếu Hẹn Khám - ${maLichHen}</title>
          ${headStyles}
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            @media print {
              html, body, body * {
                visibility: visible !important;
              }
              #print-section, #print-section * {
                visibility: visible !important;
              }
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0;
              padding: 12px;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              font-family: "Times New Roman", Times, serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #print-section {
              position: relative !important;
              width: 100% !important;
              max-width: 480px !important;
              margin: 0 auto !important;
              padding: 24px !important;
              border: 1.5px solid #cbd5e1 !important;
              border-radius: 16px !important;
              background-color: #ffffff !important;
              box-shadow: none !important;
              visibility: visible !important;
            }
            #print-section * {
              visibility: visible !important;
            }
          </style>
        </head>
        <body>
          <div id="print-section">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-4 sm:my-6 animate-fade-in flex flex-col">
        {/* Header Modal */}
        <div className={`px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between no-print ${
          isOnline
            ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600'
            : 'bg-gradient-to-r from-blue-700 to-primary-600'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md font-bold">
              {isOnline ? <Video className="h-5 w-5 text-white" /> : <CheckCircle2 className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                {isOnline ? 'Xác Nhận Tư Vấn Trực Tuyến (Telehealth)' : 'Phiếu Hẹn Khám Điện Tử'}
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-100">
                {isOnline ? 'Đã thanh toán phí tư vấn & Xác nhận lịch hẹn' : 'Đã thanh toán tạm ứng & Xác nhận lịch hẹn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-100 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung xác nhận */}
        <div ref={printRef} id="print-section" className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white">
          {/* Logo & Tên cơ sở */}
          <div className="text-center pb-4 border-b border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center gap-2 text-primary-700 font-extrabold text-base tracking-wide uppercase">
              <HeartPulse className="h-5 w-5 text-blue-600" />
              <span>{hospitalInfo.tenBenhVien || 'Phòng Khám Đa Khoa'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {hospitalInfo.diaChi || '123 Nguyễn Văn Cừ, Quận 5, TP.HCM'} • Hotline: {hospitalInfo.tongDai || '1900 8888'}
            </p>
          </div>

          {/* KHỐI TRẠNG THÁI / STT TIẾP NHẬN */}
          {isOnline ? (
            <div className="bg-indigo-50/90 border-2 border-indigo-300 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 bg-white px-3 py-1 rounded-full border border-indigo-200 inline-flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-indigo-600" />
                Tư Vấn Khám Trực Tuyến Telehealth
              </span>
              <div className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono tracking-wider my-2">
                STT: {soThuTu}
              </div>
              <p className="text-xs text-indigo-900 font-medium">
                Mã cuộc hẹn: <span className="font-mono font-bold text-indigo-700">{maLichHen}</span>
              </p>
            </div>
          ) : (
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
          )}

          {/* KHỐI KẾT NỐI / MÃ QR */}
          {isOnline ? (
            <div className="flex flex-col items-center justify-center py-2 bg-indigo-50/40 rounded-2xl border border-indigo-200 p-4">
              <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                <QRCodeSVG
                  value={qrData}
                  size={130}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-indigo-800 font-bold mt-2.5 text-center flex items-center gap-1.5">
                <Wifi className="h-4 w-4 text-indigo-600 inline" />
                Đến giờ hẹn, Bác sĩ sẽ gọi Video Call trực tuyến cho Quý khách
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 text-center">
                (Quét mã QR trên bằng điện thoại để xem chi tiết lịch hẹn từ xa)
              </span>
            </div>
          ) : (
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
          )}

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

            {isOnline ? (
              <>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-indigo-600" /> Hình thức khám:
                  </span>
                  <span className="font-bold text-right text-indigo-700">{tenPhong}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Wifi className="h-3.5 w-3.5 text-indigo-600" /> Kênh kết nối:
                  </span>
                  <span className="font-semibold text-gray-800 text-right">{viTri}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Hình thức khám:
                  </span>
                  <span className="font-bold text-right text-blue-700">Khám trực tiếp tại phòng khám</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" /> Phòng khám:
                  </span>
                  <span className="font-bold text-right text-blue-700">{tenPhong}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" /> Vị trí phòng:
                  </span>
                  <span className="font-semibold text-gray-800 text-right">{viTri}</span>
                </div>
              </>
            )}

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
              <span className="text-gray-500">
                {isOnline ? 'Phí tư vấn trực tuyến (Telehealth):' : 'Tạm ứng phí khám (giữ chỗ):'}
              </span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {formattedPaidAmount} (Đã thanh toán)
              </span>
            </div>
          </div>

          {/* Lời dặn */}
          {isOnline ? (
            <div className="rounded-xl bg-indigo-50/80 p-3.5 border border-indigo-200 text-[11px] text-indigo-950 space-y-1">
              <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-indigo-600" /> Hướng dẫn dành cho bệnh nhân khám Online:
              </p>
              <p>• Quý khách vui lòng chuẩn bị thiết bị (điện thoại hoặc máy tính có camera, micro) và giữ kết nối mạng ổn định.</p>
              <p>• Bác sĩ phụ trách sẽ gọi Video Call trực tiếp tới Quý khách vào khung giờ hẹn trên.</p>
              <p>• Quý khách có thể xem chi tiết hoặc đổi/hủy lịch tại mục <strong>"Lịch Hẹn Của Tôi"</strong> (trước giờ hẹn 24 tiếng để được bảo lưu/hoàn tiền).</p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">⚠️ Lưu ý dành cho người bệnh:</p>
              <p>• Quý khách vui lòng có mặt trước giờ hẹn <strong>15 phút</strong> tại phòng khám để quét mã QR check-in.</p>
              <p>• Nếu cần hủy lịch, quý khách phải hủy <strong>trước ngày khám ít nhất 1 ngày (24 tiếng)</strong> để được hoàn 100% tiền tạm ứng.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-2.5 no-print">
          {/* Chỉ hiển thị In Phiếu Ra Giấy cho Khám Trực Tiếp, Khám Online không in giấy */}
          {!isOnline && (
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" /> In Phiếu Ra Giấy
            </button>
          )}

          {onViewAllAppointments && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewAllAppointments();
              }}
              className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer ${
                isOnline ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Calendar className="h-4 w-4" /> Xem Lịch Hẹn Của Tôi
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
