import { useRef } from 'react';
import { X, Printer, FlaskConical, CheckCircle2, Star } from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const TRANG_THAI_CONFIG = {
  cho_lay_mau: 'Chờ lấy mẫu',
  dang_lay_mau: 'Đang lấy mẫu',
  dang_xu_ly: 'Đang xử lý / Phân tích',
  co_ket_qua: 'Đã có kết quả',
  huy: 'Đã hủy',
};

export default function InBaoCaoXetNghiemModal({ stats, filterInfo = {}, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  // Xác định khoảng thời gian hiển thị
  let kyBaoCaoStr = 'Toàn bộ thời gian';
  if (filterInfo.tuNgay && filterInfo.denNgay) {
    kyBaoCaoStr = `Từ ngày ${formatDate(filterInfo.tuNgay)} đến ngày ${formatDate(filterInfo.denNgay)}`;
  } else if (filterInfo.tuNgay) {
    kyBaoCaoStr = `Từ ngày ${formatDate(filterInfo.tuNgay)}`;
  } else if (filterInfo.timeRange === 'hom_nay') {
    kyBaoCaoStr = `Hôm nay (${formatDate(new Date())})`;
  } else if (filterInfo.timeRange === 'tuan_nay') {
    kyBaoCaoStr = 'Tuần này (7 ngày gần nhất)';
  } else if (filterInfo.timeRange === 'thang_nay') {
    kyBaoCaoStr = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  } else if (filterInfo.timeRange === 'quy_nay') {
    kyBaoCaoStr = `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()}`;
  }

  const danhSach = stats?.danhSachMoiNhat || [];
  const topDichVu = stats?.topDichVu || [];
  const coCauPhanLoai = stats?.coCauPhanLoai || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in border border-gray-200">
        {/* Header Action Bar - Cố định ở trên cùng */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Báo Cáo Thống Kê Hoạt Động Xét Nghiệm & CLS (Khổ A4)
              </h3>
              <p className="text-xs text-gray-500">
                Phạm vi: {filterInfo.scope === 'ca_nhan' ? 'Chuyên Môn Cá Nhân' : 'Toàn Bộ Khoa'} • {kyBaoCaoStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>In Báo Cáo (Ctrl+P)</span>
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

        {/* Khung cuộn xem trước bản in */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
          {/* TỜ IN KHỔ A4 CÓ ID PRINT-SECTION */}
          <div
            id="print-section"
            ref={printRef}
            className="w-full max-w-[210mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-6"
          >
            {/* Scoped CSS để in chuẩn khổ A4 */}
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
                  padding: 15mm 20mm !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
            `}</style>

            {/* Header thông tin phòng khám */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h2 className="text-sm font-black text-blue-900 uppercase tracking-wide">PHÒNG KHÁM ĐA KHOA</h2>
                <p className="text-[11px] text-gray-600">Địa chỉ: 123 Đường Sức Khỏe, Quận 1, TP. Hồ Chí Minh</p>
                <p className="text-[11px] text-gray-600 font-medium">Khoa: Xét Nghiệm & Chẩn Đoán Hình Ảnh (CLS)</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[11px] text-gray-800">Mẫu số CLS-01</p>
                <p className="text-[10px] text-gray-500 italic">(Báo cáo vận hành chuyên môn nội bộ)</p>
                <p className="text-[10px] text-gray-500 mt-1">Ngày lập: {formatDateTime(new Date())}</p>
              </div>
            </div>

            {/* Tiêu đề báo cáo */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                BÁO CÁO THỐNG KÊ HOẠT ĐỘNG XÉT NGHIỆM & CẬN LÂM SÀNG
              </h1>
              <p className="text-[11px] text-gray-600 italic">Kỳ báo cáo: {kyBaoCaoStr}</p>
              <p className="text-[11px] font-semibold text-blue-800">
                Phạm vi: {filterInfo.scope === 'ca_nhan' ? 'Chuyên môn cá nhân kỹ thuật viên' : 'Toàn bộ khoa Xét nghiệm & CĐHA'}
                {stats?.tenKtv && ` • Phụ trách: ${stats.tenKtv}`}
              </p>
            </div>

            {/* I. TỔNG HỢP CHỈ SỐ CỐT LÕI (KPIS) */}
            <div>
              <h3 className="font-bold text-xs uppercase text-blue-900 mb-2 border-b border-gray-200 pb-1">
                I. Tổng Hợp Chỉ Số Khối Lượng & Công Suất Xử Lý
              </h3>
              <table className="w-full text-xs border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-center w-12">STT</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Chỉ Tiêu Đánh Giá</th>
                    <th className="border border-gray-300 px-3 py-2 text-center w-36">Số Lượng</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Tỷ Lệ / Đánh Giá</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">1</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">Tổng chỉ định CLS tiếp nhận</td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-blue-700">
                      {stats?.tongChiDinh || 0} ca
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">Lệnh từ bác sĩ điều trị</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">2</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-emerald-800">
                      Đã hoàn thành (Có kết quả)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-emerald-700">
                      {stats?.daHoanThanh ?? stats?.coKetQua ?? 0} ca
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-bold text-emerald-700">
                      Đạt {stats?.tyLeHoanThanh || '100%'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">3</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-indigo-800">
                      Đang xử lý / Đang phân tích máy
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-indigo-700">
                      {stats?.dangXuLy || 0} ca
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">Đang chạy máy / nhập kết quả</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">4</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold text-amber-800">
                      Chờ lấy mẫu / Đang chờ thực hiện
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">
                      {stats?.choLayMau || 0} ca
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-gray-600">Bệnh nhân đang chờ điều phối</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold">5</td>
                    <td className="border border-gray-300 px-3 py-2 font-semibold">
                      Chỉ số hài lòng người bệnh (CSAT CLS)
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-600">
                      {stats?.danhGia?.diemClsTB?.toFixed(1) || '5.0'} / 5.0 ⭐
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-bold text-emerald-700">
                      Hài lòng: {stats?.danhGia?.tyLeHaiLong || '100%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* II. TOP DỊCH VỤ XÉT NGHIỆM & CẬN LÂM SÀNG THỰC HIỆN NHIỀU NHẤT */}
            {topDichVu.length > 0 && (
              <div>
                <h3 className="font-bold text-xs uppercase text-blue-900 mb-2 border-b border-gray-200 pb-1">
                  II. Danh Mục Dịch Vụ Cận Lâm Sàng Thực Hiện Nhiều Nhất
                </h3>
                <table className="w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="border border-gray-300 px-3 py-1.5 text-center w-12">STT</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left">Tên Dịch Vụ Cận Lâm Sàng</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-center w-36">Số Lượt Thực Hiện</th>
                      <th className="border border-gray-300 px-3 py-1.5 text-left">Đánh Giá Tải Công Việc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDichVu.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-300 px-3 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-3 py-1.5 font-medium">{item.ten}</td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-bold text-blue-700">
                          {item.count} ca
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-gray-600">
                          {idx === 0 ? 'Dịch vụ chủ lực' : 'Đạt yêu cầu vận hành'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* III. NHẬT KÝ CHỈ ĐỊNH CHI TIẾT TRONG KỲ */}
            <div>
              <h3 className="font-bold text-xs uppercase text-blue-900 mb-2 border-b border-gray-200 pb-1 flex justify-between items-center">
                <span>III. Danh Sách Chỉ Định & Trả Kết Quả Trong Kỳ</span>
                <span className="text-[10px] text-gray-500 font-normal lowercase">
                  (Hiển thị {Math.min(danhSach.length, 20)}/{danhSach.length} ca)
                </span>
              </h3>
              <table className="w-full text-xs border border-gray-300">
                <thead className="bg-gray-100 font-bold text-gray-700">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-10">STT</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Mã Lệnh</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">Bệnh Nhân</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left">Dịch Vụ Cận Lâm Sàng</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-28">Trạng Thái</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-36">Thời Gian Có KQ</th>
                  </tr>
                </thead>
                <tbody>
                  {danhSach.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-3 py-3 text-center text-gray-400 italic">
                        Không có dữ liệu chỉ định nào trong kỳ báo cáo này.
                      </td>
                    </tr>
                  ) : (
                    danhSach.slice(0, 20).map((c, idx) => (
                      <tr key={c.id || idx}>
                        <td className="border border-gray-300 px-2 py-1.5 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-mono font-bold text-blue-700">
                          #{c.id}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 font-medium">
                          {c.benhNhan?.hoTen || 'Bệnh nhân'}
                          {c.benhNhan?.maBenhNhan && (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              ({c.benhNhan.maBenhNhan})
                            </span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5">{c.tenDichVu}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-medium">
                          {TRANG_THAI_CONFIG[c.trangThai] || c.trangThai}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-600">
                          {c.thoiGianCoKetQua ? formatDateTime(c.thoiGianCoKetQua) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* IV. XÁC NHẬN & KÝ TÊN */}
            <div className="pt-8 grid grid-cols-3 text-center text-xs">
              <div>
                <p className="font-bold text-gray-800 uppercase">NGƯỜI LẬP BÁO CÁO</p>
                <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-16" />
                <p className="font-bold text-blue-900">{stats?.tenKtv || 'Kỹ thuật viên'}</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 uppercase">TRƯỞNG KHOA XÉT NGHIỆM & CĐHA</p>
                <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-16" />
                <p className="font-bold text-gray-900">................................................</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 uppercase">BAN GIÁM ĐỐC PHÊ DUYỆT</p>
                <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký tên và đóng dấu)</p>
                <div className="h-16" />
                <p className="font-bold text-gray-900">................................................</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

