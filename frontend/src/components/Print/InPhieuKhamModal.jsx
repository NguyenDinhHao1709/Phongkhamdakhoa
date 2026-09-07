import { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatDate } from '../../utils/formatDate';

export default function InPhieuKhamModal({ isOpen, onClose, benhAn, benhNhan, bacSi, sinhHieu, dsXetNghiem }) {
  const printRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container hiển thị trên màn hình */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Thanh công cụ Modal (ẩn khi in) */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <span className="font-bold text-gray-800 text-sm">Xem trước bản in Phiếu Khám Bệnh (Bộ Y Tế)</span>
          </div>
          <div className="flex items-center gap-2">
            <MedButton variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              In phiếu / Xuất PDF
            </MedButton>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Khung nội dung in khổ A4 */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50 flex justify-center">
          <div
            ref={printRef}
            id="print-section"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-300 text-gray-900 font-serif leading-normal"
            style={{ fontSize: '13px' }}
          >
            {/* Header Bộ Y Tế & Phòng khám */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-400">
              <div className="text-left">
                <p className="font-bold text-xs uppercase text-gray-800">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="font-bold text-sm uppercase text-primary-800">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</p>
                <p className="text-xs text-gray-600">Đ/c: 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                <p className="text-xs text-gray-600">Hotline: 1900 6868 - Cấp cứu: (028) 3838 9999</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold text-xs italic">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-xs text-gray-400 mt-1">***</p>
                <div className="text-right text-xs mt-2">
                  <p>Mã HS: <strong>{benhNhan?.maBenhNhan || 'BN000001'}</strong></p>
                  <p>Mã Lượt: <strong>{benhAn?.maLuotKham || 'LK20260001'}</strong></p>
                </div>
              </div>
            </div>

            {/* Tiêu đề tài liệu */}
            <div className="text-center my-6">
              <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">PHIẾU KHÁM BỆNH VÀ ĐIỀU TRỊ</h1>
              <p className="text-xs italic text-gray-600 mt-1">(Theo mẫu quy định hồ sơ bệnh án ngoại trú - Bộ Y Tế)</p>
            </div>

            {/* PHẦN I: HÀNH CHÍNH */}
            <div className="space-y-2 mb-4">
              <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                I. THÔNG TIN HÀNH CHÍNH BỆNH NHÂN
              </h2>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-6">
                  1. Họ và tên: <strong className="text-sm uppercase">{benhNhan?.hoTen || 'Nguyễn Văn A'}</strong>
                </div>
                <div className="col-span-3">
                  2. Ngày sinh: <strong>{benhNhan?.ngaySinh ? formatDate(benhNhan.ngaySinh) : '01/01/1990'}</strong>
                </div>
                <div className="col-span-3">
                  3. Giới tính: <strong>{benhNhan?.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</strong>
                </div>

                <div className="col-span-6">
                  4. Số điện thoại: <strong>{benhNhan?.soDienThoai || '0901234567'}</strong>
                </div>
                <div className="col-span-6">
                  5. Thẻ BHYT: <strong>{benhNhan?.soBhyt || 'Chưa đăng ký'}</strong>
                </div>

                <div className="col-span-12">
                  6. Địa chỉ liên hệ: {benhNhan?.diaChi || 'TP. Hồ Chí Minh'}
                </div>
              </div>
            </div>

            {/* PHẦN II: KHÁM BỆNH & SINH HIỆU */}
            <div className="space-y-2 mb-4">
              <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                II. KHÁM BỆNH & CHỈ SỐ SINH HIỆU
              </h2>
              <div className="text-xs space-y-1.5">
                <p>1. Lý do đến khám: <strong>{benhAn?.trieuChung || benhAn?.lyDoKham || 'Khám tổng quát'}</strong></p>
                <p>2. Bệnh sử: {benhAn?.benhSu || 'Bệnh nhân có triệu chứng kéo dài vài ngày trước khi đến khám.'}</p>
                <p>3. Tiền sử dị ứng / bệnh lý: <span className="text-red-700 font-semibold">{benhAn?.tienSuBenh || 'Chưa ghi nhận tiền sử dị ứng thuốc'}</span></p>

                {/* Bảng sinh hiệu */}
                <div className="mt-2 border border-gray-300 rounded overflow-hidden">
                  <div className="grid grid-cols-5 text-center bg-gray-50 border-b border-gray-300 py-1 font-semibold text-[11px]">
                    <div>Mạch (nhịp/phút)</div>
                    <div>Huyết áp (mmHg)</div>
                    <div>Nhiệt độ (°C)</div>
                    <div>Nhịp thở (lần/p)</div>
                    <div>SpO2 (%)</div>
                  </div>
                  <div className="grid grid-cols-5 text-center py-1.5 text-xs font-bold text-primary-900">
                    <div>{sinhHieu?.mach || 78}</div>
                    <div>{sinhHieu?.huyetAp || '120/80'}</div>
                    <div>{sinhHieu?.nhietDo || 36.8}</div>
                    <div>{sinhHieu?.nhipTho || 18}</div>
                    <div>{sinhHieu?.spo2 || 98}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN III: CHỈ ĐỊNH CẬN LÂM SÀNG & KẾT QUẢ */}
            {dsXetNghiem && dsXetNghiem.length > 0 && (
              <div className="space-y-2 mb-4">
                <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                  III. KẾT QUẢ CẬN LÂM SÀNG / XÉT NGHIỆM
                </h2>
                <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-[11px]">
                      <th className="border border-gray-300 px-2 py-1">STT</th>
                      <th className="border border-gray-300 px-2 py-1">Tên chỉ định / Xét nghiệm</th>
                      <th className="border border-gray-300 px-2 py-1">Kết quả ghi nhận</th>
                      <th className="border border-gray-300 px-2 py-1">Đánh giá / Trị số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dsXetNghiem.map((xn, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-1 font-semibold">{xn.dichVu?.tenDichVu || xn.tenDichVu || 'Xét nghiệm'}</td>
                        <td className="border border-gray-300 px-2 py-1">{xn.ketQua || 'Bình thường'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-gray-600">{xn.ghiChuKetQua || 'Trong giới hạn bình thường'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PHẦN IV: CHẨN ĐOÁN & ĐIỀU TRỊ */}
            <div className="space-y-2 mb-6">
              <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                IV. CHẨN ĐOÁN & HƯỚNG ĐIỀU TRỊ
              </h2>
              <div className="text-xs space-y-1.5">
                <p>
                  1. Chẩn đoán chính (ICD-10): <strong className="text-sm text-primary-900 font-bold">{benhAn?.chanDoan || 'Viêm họng cấp tính'}</strong>
                  {benhAn?.maIcd && <span className="ml-2 bg-gray-100 px-1.5 py-0.5 border rounded">Mã: {benhAn.maIcd}</span>}
                </p>
                <p>2. Chẩn đoán phân biệt / bệnh kèm theo: {benhAn?.chanDoanKemTheo || 'Không ghi nhận'}</p>
                <p>3. Hướng giải quyết: <strong>{benhAn?.huongDieuTri || 'Điều trị ngoại trú, kê đơn thuốc uống và tái khám'}</strong></p>
                <p>4. Lời dặn dò bác sĩ: {benhAn?.loiDan || 'Ăn uống đủ chất, nghỉ ngơi hợp lý, tái khám nếu triệu chứng không thuyên giảm sau 3 ngày.'}</p>
              </div>
            </div>

            {/* KÝ TÊN BÁC SĨ */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
              <div className="text-center text-xs">
                <p className="font-semibold">NGƯỜI BỆNH / ĐẠI DIỆN</p>
                <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-semibold">{benhNhan?.hoTen}</p>
              </div>
              <div className="text-center text-xs">
                <p className="italic text-[11px]">
                  TP.HCM, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}
                </p>
                <p className="font-bold uppercase mt-1">BÁC SĨ KHÁM BỆNH</p>
                <p className="italic text-[10px] text-gray-500">(Ký, đóng dấu và ghi rõ họ tên)</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-primary-700 italic font-serif font-bold text-base opacity-70">
                    {bacSi?.nhanVien?.hoTen || 'Bác sĩ chuyên khoa'}
                  </span>
                </div>
                <p className="font-bold text-gray-900">{bacSi?.nhanVien?.hoTen || 'BS. Chuyên Khoa I'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Style hỗ trợ in ấn sạch */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
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

