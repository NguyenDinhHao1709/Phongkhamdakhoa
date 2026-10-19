import { useRef, useEffect, useState } from 'react';
import { X, Printer, Pill, User, Stethoscope, Calendar, Clock, AlertCircle } from 'lucide-react';
import { apiGet } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/formatDate';

export default function InDonThuocModal({ donThuoc, donThuocId, onClose }) {
  const printRef = useRef(null);
  const [data, setData] = useState(donThuoc || null);
  const [loading, setLoading] = useState(false);

  // Lấy ID đơn thuốc từ prop donThuocId hoặc donThuoc.id
  const targetId = donThuocId || donThuoc?.id;

  // Hỗ trợ phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Luôn nạp chi tiết từ API để có đơn giá, thành tiền và thông tin bệnh nhân chính xác nhất
  useEffect(() => {
    if (targetId) {
      let isMounted = true;
      setLoading(true);
      apiGet(`/nha-thuoc/don-thuoc/${targetId}`)
        .then((res) => {
          if (isMounted && res.data) {
            setData(res.data);
          }
        })
        .catch((err) => {
          console.error('Lỗi tải chi tiết đơn thuốc để in:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return () => {
        isMounted = false;
      };
    } else if (donThuoc) {
      setData(donThuoc);
    }
  }, [targetId, donThuoc]);

  const handlePrint = () => {
    window.print();
  };

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-700">Đang tải chi tiết toa thuốc...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const benhNhan = data.benhNhan || {};
  const chiTiet = data.chiTiet || [];
  const bacSi = data.bacSi || 'Bác sĩ điều trị';
  const chanDoan = data.chanDoan || data.khamBenh?.chanDoan || 'Theo dõi và điều trị ngoại trú';
  const maDon = data.maDonThuoc || 'DT-XXXX';
  const ngayKe = data.ngayKe || data.createdAt || new Date();

  // Tính tổng tiền thuốc an toàn từ các dòng thuốc nếu tổng tiền đơn thuốc chưa có
  const tongTienTinhToan = chiTiet.reduce((sum, item) => {
    const donGia = Number(item.giaBan ?? item.thuoc?.giaBan ?? 0);
    const soLuong = Number(item.soLuong || 0);
    const thanhTien = Number(item.thanhTien ?? (soLuong * donGia));
    return sum + thanhTien;
  }, 0);

  const tongTien = Number(data.tongTienDonThuoc || tongTienTinhToan);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in border border-gray-200">
        {/* Header Action Bar - CỐ ĐỊNH Ở TRÊN CÙNG, KHÔNG BỊ CUỘN MẤT */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-700">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                In Toa Thuốc & Phiếu Hướng Dẫn Sử Dụng (Khổ A4 / A5)
              </h3>
              <p className="text-xs text-gray-500">
                Mã đơn: <span className="font-mono font-bold text-primary-700">{maDon}</span> • Bệnh nhân: <span className="font-semibold text-gray-800">{benhNhan.hoTen || 'Bệnh nhân'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Toa Thuốc (Ctrl+P)</span>
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
            className="w-full max-w-[210mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-5"
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
                  padding: 12mm 15mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header phòng khám */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-3">
              <div>
                <h4 className="font-bold text-sm uppercase text-gray-900">
                  PHÒNG KHÁM ĐA KHOA QUỐC TẾ
                </h4>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Khoa Khám Bệnh · Nhà Thuốc Đạt Chuẩn GPP
                </p>
                <p className="text-gray-500 text-[11px]">
                  Địa chỉ: 123 Đường Y Dược, Quận 1, TP. Hồ Chí Minh · Hotline: 1900.xxxx
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-bold uppercase tracking-wider">
                  ĐƠN THUỐC NGOẠI TRÚ
                </span>
                <p className="font-mono text-xs font-bold text-gray-800 mt-1">
                  MÃ ĐƠN: {maDon}
                </p>
                <p className="text-[11px] text-gray-500">
                  Ngày kê: {formatDateTime(ngayKe)}
                </p>
              </div>
            </div>

            {/* Tiêu đề Toa thuốc */}
            <div className="text-center space-y-0.5">
              <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
                ĐƠN THUỐC VÀ HƯỚNG DẪN ĐIỀU TRỊ
              </h2>
              <p className="text-[11px] text-gray-500 italic">
                (Ban hành theo Thông tư quy định về kê đơn thuốc của Bộ Y Tế)
              </p>
            </div>

            {/* Thông tin bệnh nhân & Chẩn đoán */}
            <div className="bg-gray-50 p-3.5 rounded border border-gray-200 space-y-2 text-[11px]">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-500">Họ và tên người bệnh: </span>
                  <span className="font-bold text-gray-900 uppercase text-xs">{benhNhan.hoTen || 'Chưa có thông tin'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mã bệnh nhân: </span>
                  <span className="font-mono font-semibold text-gray-800">{benhNhan.maBenhNhan || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Giới tính / Tuổi: </span>
                  <span className="font-semibold text-gray-800">
                    {benhNhan.gioiTinh === 'nam' ? 'Nam' : benhNhan.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}
                    {benhNhan.ngaySinh && ` • ${new Date().getFullYear() - new Date(benhNhan.ngaySinh).getFullYear()} tuổi`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200/60">
                <div>
                  <span className="text-gray-500">Điện thoại: </span>
                  <span className="font-medium text-gray-800">{benhNhan.soDienThoai || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Địa chỉ: </span>
                  <span className="font-medium text-gray-800">{benhNhan.diaChi || 'TP. Hồ Chí Minh'}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-gray-200/60">
                <span className="text-gray-500">Chẩn đoán: </span>
                <span className="font-bold text-blue-900">{chanDoan}</span>
              </div>
            </div>

            {/* Danh mục thuốc kê đơn */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 border-l-4 border-primary-600 pl-2">
                Danh Sách Thuốc Kê Đơn & Cách Dùng Chi Tiết
              </h3>
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                      <th className="p-2 text-center w-10">STT</th>
                      <th className="p-2 text-left">Tên Biệt Dược / Hoạt Chất - Hàm Lượng</th>
                      <th className="p-2 text-center w-16">ĐVT</th>
                      <th className="p-2 text-center w-20">Số Lượng</th>
                      <th className="p-2 text-right w-24">Đơn Giá</th>
                      <th className="p-2 text-right w-28">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chiTiet.map((item, idx) => {
                      const tenThuoc = item.tenThuoc || item.thuoc?.tenThuoc || 'Dược phẩm';
                      const donViTinh = item.donViTinh || item.thuoc?.donViTinh || 'Hộp';
                      const donGia = Number(item.giaBan ?? item.thuoc?.giaBan ?? 0);
                      const soLuong = Number(item.soLuong || 0);
                      const thanhTien = Number(item.thanhTien ?? (soLuong * donGia));

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                          <td className="p-2 text-center font-bold text-gray-600 align-top">{idx + 1}</td>
                          <td className="p-2 align-top">
                            <div className="font-bold text-gray-900 text-xs">{tenThuoc}</div>
                            <div className="text-blue-900 font-medium mt-0.5 italic">
                              👉 Cách dùng: {item.lieuDung || 'Theo chỉ định của bác sĩ'}
                            </div>
                            {item.loThuocGợiÝ && (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                Lô xuất: {item.loThuocGợiÝ.maLo} • HSD: {formatDate(item.loThuocGợiÝ.ngayHetHan)}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center text-gray-700 align-top">{donViTinh}</td>
                          <td className="p-2 text-center font-bold text-gray-900 align-top">{soLuong}</td>
                          <td className="p-2 text-right text-gray-700 align-top">{formatCurrency(donGia)}</td>
                          <td className="p-2 text-right font-bold text-primary-700 align-top">
                            {formatCurrency(thanhTien)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-gray-300 text-[11px]">
                      <td colSpan={5} className="p-2 text-right uppercase text-gray-700">Tổng cộng tiền thuốc:</td>
                      <td className="p-2 text-right text-primary-700 text-xs">{formatCurrency(tongTien)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Lời dặn dò bác sĩ & Tái khám */}
            <div className="border border-amber-200 bg-amber-50/50 p-3 rounded text-[11px] space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                LỜI DẶN CỦA BÁC SĨ & DƯỢC SĨ:
              </div>
              <p className="text-amber-800">
                • Uống thuốc đúng liều lượng, đúng giờ và đủ ngày theo hướng dẫn trên đơn.
              </p>
              <p className="text-amber-800">
                • Nếu có bất kỳ dấu hiệu dị ứng, phát ban, buồn nôn hoặc bất thường, ngừng dùng thuốc và liên hệ ngay phòng khám.
              </p>
              <p className="text-amber-800">
                • Mang theo toa thuốc này khi đến khám lại hoặc tái khám theo lịch hẹn.
              </p>
            </div>

            {/* Phần ký tên 2 bên */}
            <div className="pt-4 border-t border-gray-300">
              <div className="grid grid-cols-2 text-center gap-8 text-[11px]">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">DƯỢC SĨ CẤP PHÁT THUỐC</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-semibold text-gray-800">Dược sĩ Nhà thuốc</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-gray-900 uppercase">BÁC SĨ KÊ ĐƠN</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-semibold text-gray-800">{bacSi}</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 mt-6 pt-2 border-t border-dashed border-gray-200">
                Khám lại xin mang theo đơn này · Giờ mở cửa Nhà thuốc: 7h00 - 20h00 hàng ngày
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
