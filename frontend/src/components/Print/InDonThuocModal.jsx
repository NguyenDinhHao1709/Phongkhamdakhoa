import { useRef, useEffect } from 'react';
import { Printer, X, Pill } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

export default function InDonThuocModal({ isOpen, onClose, donThuoc, benhNhan, bacSi, chanDoan }) {
  const printRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const dsChiTiet = donThuoc?.chiTiet || donThuoc?.chiTietDonThuoc || [];

  // Tính tổng tiền thuốc
  const tongTien = dsChiTiet.reduce((sum, item) => {
    const donGia = Number(item.giaBan ?? item.thuoc?.giaBan ?? 0);
    const soLuong = Number(item.soLuong || 0);
    const thanhTien = Number(item.thanhTien ?? (soLuong * donGia));
    return sum + thanhTien;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Khung hiển thị modal */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header Modal - CỐ ĐỊNH Ở TRÊN CÙNG, KHÔNG BỊ CUỘN MẤT */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-gray-800 text-sm">Xem trước bản in Đơn Thuốc (Thông tư 52/TT-BYT)</span>
          </div>
          <div className="flex items-center gap-2">
            <MedButton variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              In đơn thuốc / Xuất PDF (Ctrl+P)
            </MedButton>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nội dung in */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/50 flex justify-center">
          <div
            ref={printRef}
            id="print-section"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-300 text-gray-900 font-serif leading-normal"
            style={{ fontSize: '13px' }}
          >
            {/* Scoped CSS để in chuẩn A4 không bị trang trắng */}
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
                  padding: 12mm 15mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header Phòng khám */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-400">
              <div className="text-left">
                <p className="font-bold text-xs uppercase text-gray-800">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="font-bold text-sm uppercase text-emerald-800">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</p>
                <p className="text-xs text-gray-600">Đ/c: 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                <p className="text-xs text-gray-600">ĐT: 1900 6868</p>
              </div>
              <div className="text-right text-xs">
                <p>Mã Đơn thuốc: <strong>{donThuoc?.maDonThuoc || 'DT20260001'}</strong></p>
                <p>Mã Bệnh nhân: <strong>{benhNhan?.maBenhNhan || 'BN000001'}</strong></p>
                <p className="italic text-[11px] text-gray-500 mt-1">Mẫu đơn thuốc ngoại trú</p>
              </div>
            </div>

            {/* Tiêu đề */}
            <div className="text-center my-5">
              <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">ĐƠN THUỐC</h1>
              <p className="text-xs italic text-gray-500">(Theo Thông tư số 52/2017/TT-BYT của Bộ Y Tế)</p>
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="text-xs space-y-1.5 mb-5 pb-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  Họ và tên: <strong className="text-sm uppercase">{benhNhan?.hoTen || 'Nguyễn Văn A'}</strong>
                </div>
                <div className="col-span-3">
                  Tuổi / Năm sinh: <strong>{benhNhan?.ngaySinh ? new Date().getFullYear() - new Date(benhNhan.ngaySinh).getFullYear() : '30'} tuổi</strong>
                </div>
                <div className="col-span-3">
                  Giới tính: <strong>{benhNhan?.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</strong>
                </div>

                <div className="col-span-6">
                  Số thẻ BHYT: <strong>{benhNhan?.soBhyt || 'Không có'}</strong>
                </div>
                <div className="col-span-6">
                  Điện thoại: <strong>{benhNhan?.soDienThoai || '0901234567'}</strong>
                </div>

                <div className="col-span-12">
                  Địa chỉ: {benhNhan?.diaChi || 'TP. Hồ Chí Minh'}
                </div>
                <div className="col-span-12">
                  Chẩn đoán: <strong className="text-primary-900">{chanDoan || 'Viêm họng cấp tính'}</strong>
                </div>
              </div>
            </div>

            {/* Danh sách thuốc kê dạng Bảng chi tiết có Đơn giá & Thành tiền */}
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-xs uppercase text-gray-800">CHỈ ĐỊNH DÙNG THUỐC:</h3>
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300 text-[11px]">
                      <th className="p-2 text-center w-10">STT</th>
                      <th className="p-2 text-left">Tên thuốc & Hướng dẫn cách dùng</th>
                      <th className="p-2 text-center w-14">ĐVT</th>
                      <th className="p-2 text-center w-14">SL</th>
                      <th className="p-2 text-right w-24">Đơn giá</th>
                      <th className="p-2 text-right w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dsChiTiet.length > 0 ? (
                      dsChiTiet.map((item, idx) => {
                        const tenThuoc = item.thuoc?.tenThuoc || item.tenThuoc || 'Dược phẩm';
                        const hamLuong = item.thuoc?.hamLuong || item.hamLuong || '';
                        const donViTinh = item.thuoc?.donViTinh || item.donViTinh || 'Viên';
                        const donGia = Number(item.giaBan ?? item.thuoc?.giaBan ?? 0);
                        const soLuong = Number(item.soLuong || 0);
                        const thanhTien = Number(item.thanhTien ?? (soLuong * donGia));

                        return (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                            <td className="p-2 text-center font-bold text-gray-600 align-top">{idx + 1}</td>
                            <td className="p-2 align-top">
                              <div className="font-bold text-gray-900 text-xs">
                                {tenThuoc} {hamLuong && <span className="font-normal text-gray-600">({hamLuong})</span>}
                              </div>
                              <div className="text-blue-900 font-medium italic mt-0.5 text-[11px]">
                                👉 Cách dùng: {item.lieuDung || 'Theo chỉ định của bác sĩ'}
                              </div>
                            </td>
                            <td className="p-2 text-center text-gray-700 align-top">{donViTinh}</td>
                            <td className="p-2 text-center font-bold text-gray-900 align-top">{soLuong}</td>
                            <td className="p-2 text-right text-gray-700 align-top font-mono">{formatCurrency(donGia)}</td>
                            <td className="p-2 text-right font-bold text-emerald-800 align-top font-mono">{formatCurrency(thanhTien)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                          Chưa có thông tin danh sách thuốc trong đơn này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {dsChiTiet.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t border-gray-300 text-xs">
                        <td colSpan={5} className="p-2 text-right uppercase text-gray-700">Tổng cộng tiền thuốc:</td>
                        <td className="p-2 text-right text-emerald-800 font-mono text-sm">{formatCurrency(tongTien)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Lời dặn */}
            <div className="text-xs space-y-1 border-t border-gray-200 pt-3">
              <p><strong>Lời dặn của Bác sĩ:</strong></p>
              <p className="italic pl-2">• {donThuoc?.loiDan || 'Uống thuốc đúng liều và thời gian đã chỉ định.'}</p>
              <p className="italic pl-2">• Uống nhiều nước, kiêng các chất kích thích và đồ ăn cay nóng.</p>
              <p className="italic pl-2">• Khám lại ngay nếu có biểu hiện bất thường như phát ban, khó thở, sốt cao kéo dài.</p>
              <p className="italic pl-2">• Đơn thuốc này có giá trị mua trong vòng 05 ngày kể từ ngày kê đơn.</p>
            </div>

            {/* Ký tên */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
              <div></div>
              <div className="text-center text-xs">
                <p className="italic text-[11px]">
                  TP.HCM, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}
                </p>
                <p className="font-bold uppercase mt-1">BÁC SĨ KÊ ĐƠN</p>
                <p className="italic text-[10px] text-gray-500">(Ký, ghi rõ họ tên)</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-emerald-700 italic font-serif font-bold text-base opacity-75">
                    {bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị'}
                  </span>
                </div>
                <p className="font-bold text-gray-900">{bacSi?.nhanVien?.hoTen || 'BS. Chuyên Khoa'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
