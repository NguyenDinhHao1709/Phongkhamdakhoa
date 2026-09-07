import { useRef } from 'react';
import { Printer, X, Pill } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatDate } from '../../utils/formatDate';

export default function InDonThuocModal({ isOpen, onClose, donThuoc, benhNhan, bacSi, chanDoan }) {
  const printRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const dsChiTiet = donThuoc?.chiTiet || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Khung hiển thị modal */}
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-gray-800 text-sm">Xem trước bản in Đơn Thuốc (Thông tư 52/TT-BYT)</span>
          </div>
          <div className="flex items-center gap-2">
            <MedButton variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              In đơn thuốc / Xuất PDF
            </MedButton>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nội dung in */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50 flex justify-center">
          <div
            ref={printRef}
            id="print-section"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-300 text-gray-900 font-serif leading-normal"
            style={{ fontSize: '13px' }}
          >
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

            {/* Danh sách thuốc kê */}
            <div className="space-y-4 mb-6">
              <h3 className="font-bold text-xs uppercase text-gray-800">CHỈ ĐỊNH DÙNG THUỐC:</h3>
              <div className="space-y-3">
                {dsChiTiet.length > 0 ? (
                  dsChiTiet.map((item, idx) => (
                    <div key={idx} className="text-xs border-b border-dashed border-gray-200 pb-2">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-sm">
                          {idx + 1}. {item.thuoc?.tenThuoc || item.tenThuoc || 'Thuốc kê đơn'} {item.thuoc?.hamLuong || ''}
                        </span>
                        <span className="font-bold text-sm">
                          SL: {item.soLuong} ({item.thuoc?.donViTinh || item.donViTinh || 'viên'})
                        </span>
                      </div>
                      <div className="italic text-gray-700 mt-1 pl-4">
                        Liều dùng: {item.lieuDung || 'Uống ngày 2 lần, mỗi lần 1 viên sau ăn sáng - chiều'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-gray-500">Chưa có thông tin danh sách thuốc trong đơn này.</p>
                )}
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

      {/* CSS in ấn */}
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

