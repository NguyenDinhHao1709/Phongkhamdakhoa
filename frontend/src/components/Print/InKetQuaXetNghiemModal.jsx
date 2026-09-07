import { useRef } from 'react';
import { Printer, X, FlaskConical, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatDate, formatDateTime } from '../../utils/formatDate';

export default function InKetQuaXetNghiemModal({
  isOpen,
  onClose,
  items = [],
  record,
  benhNhan,
  bacSi,
}) {
  const printRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const listItems = Array.isArray(items) ? items : [items].filter(Boolean);
  const ba = record?.benhAn || record?.benhAnKham || record;
  const bn = benhNhan || record?.benhNhan;
  const bsTen =
    bacSi?.nhanVien?.hoTen ||
    record?.bacSiTen ||
    record?.bacSi?.nhanVien?.hoTen ||
    (typeof record?.bacSi === 'string' ? record.bacSi : 'Bác sĩ điều trị');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container hiển thị modal */}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Thanh công cụ Modal (ẩn khi in) */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            <span className="font-bold text-gray-800 text-sm">
              Xem trước Phiếu Kết Quả Xét Nghiệm & Chẩn Đoán Hình Ảnh
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MedButton
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              In kết quả / Xuất PDF
            </MedButton>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="Đóng"
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
            {/* Header Cơ quan y tế & Phòng khám */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-400">
              <div className="text-left">
                <p className="font-bold text-xs uppercase text-gray-800">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="font-bold text-sm uppercase text-purple-800">
                  PHÒNG KHÁM ĐA KHOA QUỐC TẾ
                </p>
                <p className="text-xs text-gray-600">Đ/c: 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                <p className="text-xs text-gray-600">Khoa: Xét nghiệm & Thăm dò chức năng / CĐHA</p>
                <p className="text-xs text-gray-600">Hotline: 1900 6868</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold text-xs italic">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-xs text-gray-400 mt-1">***</p>
                <div className="text-right text-xs mt-2 space-y-0.5">
                  <p>
                    Mã BN: <strong>{bn?.maBenhNhan || 'BN000001'}</strong>
                  </p>
                  <p>
                    Mã Lượt khám: <strong>#{ba?.luotTiepNhanId || ba?.id || '—'}</strong>
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    Ngày in: {formatDate(new Date())}
                  </p>
                </div>
              </div>
            </div>

            {/* Tiêu đề tài liệu */}
            <div className="text-center my-6">
              <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900">
                PHIẾU KẾT QUẢ XÉT NGHIỆM & CẬN LÂM SÀNG
              </h1>
              <p className="text-xs italic text-gray-600 mt-1">
                (Kết quả phân tích mẫu bệnh phẩm / Hình ảnh học y khoa)
              </p>
            </div>

            {/* PHẦN I: THÔNG TIN BỆNH NHÂN */}
            <div className="space-y-2 mb-5">
              <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                I. THÔNG TIN HÀNH CHÍNH & CHỈ ĐỊNH
              </h2>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-6">
                  1. Họ và tên: <strong className="text-sm uppercase">{bn?.hoTen || '—'}</strong>
                </div>
                <div className="col-span-3">
                  2. Ngày sinh: <strong>{bn?.ngaySinh ? formatDate(bn.ngaySinh) : '—'}</strong>
                </div>
                <div className="col-span-3">
                  3. Giới tính: <strong>{bn?.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</strong>
                </div>

                <div className="col-span-6">
                  4. Số điện thoại: <strong>{bn?.soDienThoai || '—'}</strong>
                </div>
                <div className="col-span-6">
                  5. Bác sĩ chỉ định: <strong>{bsTen}</strong>
                </div>

                <div className="col-span-12">
                  6. Địa chỉ: {bn?.diaChi || 'TP. Hồ Chí Minh'}
                </div>

                <div className="col-span-12 pt-1 border-t border-gray-200 text-gray-600">
                  7. Chẩn đoán lâm sàng: <strong>{ba?.chanDoanXacDinh || ba?.chanDoanSoBo || ba?.chanDoan || 'Kiểm tra sức khỏe'}</strong>
                </div>
              </div>
            </div>

            {/* PHẦN II: BẢNG KẾT QUẢ CHI TIẾT */}
            <div className="space-y-2 mb-6">
              <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800">
                II. KẾT QUẢ ĐO ĐẠC & PHÂN TÍCH
              </h2>

              <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-[11px]">
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">STT</th>
                    <th className="border border-gray-300 px-2 py-1.5">Tên xét nghiệm / Kỹ thuật</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-28">Kết quả</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Đơn vị</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-32">Chỉ số bình thường</th>
                    <th className="border border-gray-300 px-2 py-1.5">Nhận xét / Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {listItems.map((c, i) => {
                    const kq = c.ketQua || {};
                    const dv = c.dichVu || {};
                    const giaTri = kq.giaTri ?? kq.gia_tri ?? 'Chờ KQ';
                    const donVi = kq.donVi ?? kq.don_vi ?? dv.donViKetQua ?? '';
                    const giaTriBinhThuong = dv.giaTriBinhThuong || 'Bình thường';
                    const nhanXet = kq.nhanXet ?? kq.nhan_xet ?? 'Chỉ số trong giới hạn bình thường';

                    return (
                      <tr key={c.id || i} className="hover:bg-gray-50/50">
                        <td className="border border-gray-300 px-2 py-2 text-center font-medium">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-2 font-bold text-gray-900">
                          {dv.tenDichVu || 'Xét nghiệm'}
                          {dv.maDichVu && (
                            <span className="ml-1 text-[10px] text-gray-500 font-mono font-normal">
                              ({dv.maDichVu})
                            </span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center font-extrabold text-sm text-purple-900">
                          {giaTri}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center text-gray-700">
                          {donVi}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-center text-gray-600 italic">
                          {giaTriBinhThuong}
                        </td>
                        <td className="border border-gray-300 px-2 py-2 text-gray-800">
                          {nhanXet}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PHẦN III: HÌNH ẢNH / TỆP ĐÍNH KÈM (NẾU CÓ) */}
            {listItems.some((c) => c.ketQua?.fileDinhKem || c.ketQua?.file_dinh_kem) && (
              <div className="space-y-3 mb-6">
                <h2 className="font-bold text-xs uppercase bg-gray-200/80 px-2 py-1 text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> III. HÌNH ẢNH Y KHOA / TÀI LIỆU KẾT QUẢ ĐÍNH KÈM
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listItems.map((c, i) => {
                    const file = c.ketQua?.fileDinhKem || c.ketQua?.file_dinh_kem;
                    if (!file) return null;
                    const fileUrl = file.startsWith('http') ? file : `http://localhost:5000${file}`;
                    const isImage = file.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                    return (
                      <div key={i} className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800">
                            {c.dichVu?.tenDichVu || 'Ảnh kết quả'}
                          </span>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-700 hover:underline flex items-center gap-1 font-semibold text-[11px] no-print"
                          >
                            Mở xem ảnh gốc <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        {isImage ? (
                          <div className="text-center">
                            <img
                              src={fileUrl}
                              alt="Hình ảnh kết quả cận lâm sàng"
                              className="max-h-56 mx-auto object-contain rounded border border-gray-200 bg-white"
                            />
                            <p className="text-[10px] text-gray-500 italic mt-1">Ảnh chụp chẩn đoán cận lâm sàng</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-white rounded border border-gray-200">
                            <FileText className="h-6 w-6 text-purple-600" />
                            <div className="text-xs">
                              <p className="font-semibold text-gray-800">Tài liệu kết quả (PDF/Bản chụp)</p>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary-600 hover:underline font-mono text-[11px]"
                              >
                                Nhấn để tải về / xem tệp PDF
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* KẾT LUẬN CHUNG */}
            <div className="space-y-1.5 mb-6 text-xs bg-gray-50 p-3 rounded border border-gray-200">
              <p className="font-bold text-gray-900">KẾT LUẬN / LỜI DẶN KỸ THUẬT VIÊN:</p>
              <p className="text-gray-700">
                {listItems.find((c) => c.ketQua?.nhanXet || c.ketQua?.nhan_xet)?.ketQua?.nhanXet ||
                  listItems.find((c) => c.ketQua?.nhanXet || c.ketQua?.nhan_xet)?.ketQua?.nhan_xet ||
                  'Kết quả cận lâm sàng trong giới hạn bình thường. Người bệnh mang kết quả về phòng khám ban đầu để Bác sĩ điều trị kết luận và kê đơn.'}
              </p>
            </div>

            {/* CHỮ KÝ */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
              <div className="text-center text-xs">
                <p className="font-semibold uppercase">BÁC SĨ CHỈ ĐỊNH</p>
                <p className="text-gray-500 italic text-[11px]">(Ký và ghi rõ họ tên)</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-gray-300 italic text-xs">Đã duyệt điện tử</span>
                </div>
                <p className="font-bold text-gray-900">{bsTen}</p>
              </div>

              <div className="text-center text-xs">
                <p className="font-semibold uppercase">KỸ THUẬT VIÊN / TRƯỞNG KHOA XÉT NGHIỆM</p>
                <p className="text-gray-500 italic text-[11px]">(Ký và đóng dấu)</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-purple-600 font-serif italic text-sm font-bold border border-purple-300 rounded px-2 py-0.5 bg-purple-50">
                    ✓ ĐÃ XÁC NHẬN KẾT QUẢ
                  </span>
                </div>
                <p className="font-bold text-gray-900">KTV. Nguyễn Thị Thu Trang</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Style hỗ trợ in ấn sạch chuẩn trang in */}
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
