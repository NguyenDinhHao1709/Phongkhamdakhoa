import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import { FileText, Activity, Pill, FlaskConical, Stethoscope, User, AlertTriangle, Clock, Printer, ExternalLink, Eye, CheckCircle2 } from 'lucide-react';
import InPhieuKhamModal from '../../components/Print/InPhieuKhamModal';
import InDonThuocModal from '../../components/Print/InDonThuocModal';
import InKetQuaXetNghiemModal from '../../components/Print/InKetQuaXetNghiemModal';

export default function HoSoYTeBenhNhanPage() {
  const [printPhieuKham, setPrintPhieuKham] = useState({ open: false, record: null });
  const [printDonThuoc, setPrintDonThuoc] = useState({ open: false, donThuoc: null, record: null });
  const [printXetNghiem, setPrintXetNghiem] = useState({ open: false, items: [], record: null });
  const { data, isLoading } = useQuery({
    queryKey: ['emr-cua-toi'],
    queryFn: () => apiGet('/ho-so-benh-an/cua-toi'),
  });

  const res = data?.data;
  const records = Array.isArray(res) ? res : (res?.lichSuKham || []);
  const latestBenhNhan = res?.benhNhan || records[0]?.benhNhan;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary-600" /> Hồ sơ y tế cá nhân (EMR)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Tra cứu lịch sử khám bệnh, chẩn đoán ICD-10, đơn thuốc và kết quả xét nghiệm được cập nhật trực tiếp từ phòng khám
        </p>
      </div>

      {/* Thông tin bệnh nhân */}
      {latestBenhNhan && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs font-bold text-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{latestBenhNhan.hoTen}</h2>
                <p className="text-xs text-blue-100 font-mono">
                  Mã BN: {latestBenhNhan.maBenhNhan} {latestBenhNhan.soDienThoai && `• SĐT: ${latestBenhNhan.soDienThoai}`}
                </p>
              </div>
            </div>
          </div>
          {(latestBenhNhan.diUng || latestBenhNhan.tienSuBenh) && (
            <div className="pt-2 border-t border-white/20 flex flex-wrap gap-4 text-xs">
              {latestBenhNhan.diUng && (
                <span className="bg-red-500/30 border border-red-300/40 text-red-100 px-3 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Dị ứng: {latestBenhNhan.diUng}
                </span>
              )}
              {latestBenhNhan.tienSuBenh && (
                <span className="bg-white/10 px-3 py-1 rounded-full text-blue-100">
                  Tiền sử bệnh: {latestBenhNhan.tienSuBenh}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl bg-white p-12 text-center text-gray-400 border border-gray-200">
          <div className="h-8 w-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Đang nạp hồ sơ y tế điện tử từ CSDL phòng khám...</p>
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center text-gray-400 border border-gray-200">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary-600" />
          <p className="text-base font-bold text-gray-700">Chưa có lịch sử khám bệnh</p>
          <p className="text-xs text-gray-500 mt-1">Dữ liệu hồ sơ y tế sẽ được cập nhật tự động sau khi bác sĩ kết thúc lượt khám của bạn.</p>
        </div>
      )}

      {/* Danh sách các lần khám (xếp theo mới nhất) */}
      {records.map((item, idx) => {
        const ba = item.benhAn || item.benhAnKham || item;
        const bacSiTen = item.bacSiTen || (typeof item.bacSi === 'string' ? item.bacSi : item.bacSi?.nhanVien?.hoTen) || 'Bác sĩ điều trị';
        const donThuoc = item.donThuoc || [];
        const canLamSang = item.canLamSang || item.xetNghiem || [];
        const sinhHieu = item.sinhHieu;

        return (
          <div key={ba.id || idx} className="rounded-2xl bg-white p-6 shadow-xs border border-gray-200 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 font-bold text-sm">
                  #{records.length - idx}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Lần khám ngày {formatDateTime(ba.ngayKham || ba.taoLuc)}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Stethoscope className="h-3.5 w-3.5 text-primary-600" /> {bacSiTen}
                    {ba.luotTiepNhanId && ` · Mã lượt khám #${ba.luotTiepNhanId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setPrintPhieuKham({ open: true, record: item })}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> In phiếu khám
                </button>
                {donThuoc && donThuoc.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrintDonThuoc({ open: true, donThuoc: donThuoc[0], record: item })}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> In đơn thuốc
                  </button>
                )}
                {canLamSang && canLamSang.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrintXetNghiem({ open: true, items: canLamSang, record: item })}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> In kết quả XN ({canLamSang.length})
                  </button>
                )}
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  ba.trangThai === 'da_hoan_thanh'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {ba.trangThai === 'da_hoan_thanh' ? '✓ Đã hoàn thành' : '⏳ Đang khám'}
                </span>
              </div>
            </div>

          {/* Chẩn đoán & Sinh hiệu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Chẩn đoán & Lâm sàng
              </p>
              {ba.chanDoanXacDinh ? (
                <div>
                  <span className="text-xs font-semibold text-gray-500 block">Chẩn đoán xác định (ICD-10):</span>
                  <p className="font-bold text-primary-900 text-sm">{ba.chanDoanXacDinh}</p>
                </div>
              ) : null}
              {ba.chanDoanSoBo && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 block">Chẩn đoán sơ bộ:</span>
                  <p className="font-medium text-gray-800 text-xs">{ba.chanDoanSoBo}</p>
                </div>
              )}
              {ba.trieuChung && (
                <p className="text-xs text-gray-600 pt-1 border-t border-blue-100/60">
                  <strong>Triệu chứng:</strong> {ba.trieuChung}
                </p>
              )}
              {ba.phuongPhapDieuTri && (
                <p className="text-xs text-gray-600">
                  <strong>Hướng điều trị:</strong> {ba.phuongPhapDieuTri}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-rose-500" /> Chỉ số sinh hiệu
              </p>
              {sinhHieu ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-700 pt-1">
                  <span>Huyết áp: <strong>{sinhHieu.huyet_ap_tam_thu || sinhHieu.huyetApTamThu || 120}/{sinhHieu.huyet_ap_tam_truong || sinhHieu.huyetApTamTruong || 80} mmHg</strong></span>
                  <span>Nhiệt độ: <strong>{sinhHieu.nhiet_do_c || sinhHieu.nhietDoC || 36.8} °C</strong></span>
                  <span>Mạch: <strong>{sinhHieu.mach || sinhHieu.nhip_tim || 75} lần/phút</strong></span>
                  <span>SpO2: <strong>{sinhHieu.spo2 || 98}%</strong></span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">Chưa ghi nhận chỉ số sinh hiệu</p>
              )}
              {ba.taiKham && (
                <div className="pt-2 border-t border-gray-200/60 text-xs text-primary-700 font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Hẹn tái khám: {formatDate(ba.taiKham)}
                </div>
              )}
            </div>
          </div>

          {/* Kết quả Cận lâm sàng / Xét nghiệm */}
          {canLamSang && canLamSang.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-purple-600" /> Kết quả Xét nghiệm & CĐHA ({canLamSang.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setPrintXetNghiem({ open: true, items: canLamSang, record: item })}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                >
                  <Printer className="h-3.5 w-3.5" /> In phiếu kết quả ({canLamSang.length})
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {canLamSang.map((c) => {
                  const kq = c.ketQua;
                  const dv = c.dichVu || {};
                  const giaTri = kq?.giaTri ?? kq?.gia_tri;
                  const donVi = kq?.donVi ?? kq?.don_vi ?? dv.donViKetQua ?? '';
                  const thamChieu = dv.giaTriBinhThuong || 'Bình thường';
                  const nhanXet = kq?.nhanXet ?? kq?.nhan_xet;
                  const fileDinhKem = kq?.fileDinhKem ?? kq?.file_dinh_kem;
                  const fileUrl = fileDinhKem ? (fileDinhKem.startsWith('http') ? fileDinhKem : `http://localhost:5000${fileDinhKem}`) : null;
                  const isImage = fileDinhKem && fileDinhKem.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                  const isCoKetQua = c.trangThai === 'co_ket_qua' || !!kq;

                  return (
                    <div key={c.id} className="rounded-xl border border-purple-200/80 bg-gradient-to-br from-white to-purple-50/30 p-4 shadow-2xs space-y-3 transition-all hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2 border-b border-purple-100 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase font-mono">
                              {dv.maDichVu || 'XN'}
                            </span>
                            <span className="font-bold text-gray-900 text-sm">{dv.tenDichVu || 'Xét nghiệm'}</span>
                            <span className="text-xs text-gray-400">
                              ({dv.loai === 'cdha' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm y khoa'})
                            </span>
                          </div>
                          {c.thoiGianChiDinh && (
                            <p className="text-[11px] text-gray-500">
                              Chỉ định lúc: {formatDateTime(c.thoiGianChiDinh)}
                            </p>
                          )}
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          isCoKetQua ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isCoKetQua ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-amber-600" />}
                          {isCoKetQua ? 'Đã có kết quả' : 'Đang xử lý'}
                        </span>
                      </div>

                      {/* Hiển thị chi tiết kết quả */}
                      {isCoKetQua && kq ? (
                        <div className="space-y-3">
                          {/* Grid chỉ số */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-purple-100 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Kết quả đo đạc:
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-extrabold text-purple-900">{giaTri || '—'}</span>
                                {donVi && <span className="text-xs font-semibold text-purple-700">{donVi}</span>}
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Tham chiếu chuẩn:
                              </span>
                              <span className="text-sm font-medium text-gray-700">{thamChieu}</span>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                                Thời gian hoàn thành:
                              </span>
                              <span className="text-xs text-gray-600">
                                {formatDateTime(kq.thoiGianNhap || c.thoiGianCoKetQua || new Date())}
                              </span>
                            </div>
                          </div>

                          {/* Nhận xét chuyên môn */}
                          {nhanXet && (
                            <div className="rounded-lg bg-purple-50/60 p-2.5 border border-purple-200/60 text-xs text-gray-800 space-y-1">
                              <span className="font-bold text-purple-900 flex items-center gap-1">
                                💬 Đánh giá & Nhận xét của Kỹ thuật viên:
                              </span>
                              <p className="italic text-gray-700 pl-2 border-l-2 border-purple-400">
                                "{nhanXet}"
                              </p>
                            </div>
                          )}

                          {/* Tệp đính kèm / Ảnh siêu âm / X-Quang */}
                          {fileUrl && (
                            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                  📎 Tệp kết quả đính kèm (Ảnh chẩn đoán / File PDF)
                                </span>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                                >
                                  Mở trong tab mới <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>

                              {isImage ? (
                                <div className="flex items-center gap-3 pt-1">
                                  <img
                                    src={fileUrl}
                                    alt="Ảnh kết quả cận lâm sàng"
                                    className="h-20 w-28 object-cover rounded-lg border border-purple-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => window.open(fileUrl, '_blank')}
                                  />
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <p className="font-medium text-gray-700">Ảnh kết quả siêu âm / X-Quang / Nội soi</p>
                                    <p className="text-[11px] text-gray-400">Nhấn vào ảnh để xem kích thước gốc phóng to</p>
                                    <button
                                      type="button"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                      className="inline-flex items-center gap-1 text-primary-600 font-semibold hover:underline text-[11px]"
                                    >
                                      <Eye className="h-3 w-3" /> Xem ảnh cỡ lớn
                                    </button>
                                  </div>
                                </div>
                              ) : isCoKetQua ? (
                                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span>Kết quả đã hoàn tất và đang được đồng bộ. Vui lòng tải lại hồ sơ sau ít phút nếu chưa hiển thị chi tiết.</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <span className="text-xs font-semibold text-gray-700">Tài liệu kết quả y khoa (.PDF)</span>
                                  </div>
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-primary-600 bg-white px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition"
                                  >
                                    Xem tài liệu ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer nút in chi tiết riêng phiếu này */}
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setPrintXetNghiem({ open: true, items: [c], record: item })}
                              className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" /> Xem bản in phiếu kết quả này
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-800 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                          <span>Mẫu bệnh phẩm đang được phòng xét nghiệm xử lý. Bệnh nhân vui lòng theo dõi hoặc làm theo hướng dẫn của điều dưỡng.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Đơn thuốc đã kê */}
          {donThuoc && donThuoc.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-emerald-600" /> Đơn thuốc được bác sĩ kê
              </h4>
              {donThuoc.map((dt) => (
                <div key={dt.id} className="rounded-xl border border-gray-200 overflow-hidden text-sm">
                  <div className="bg-emerald-50/80 px-4 py-2 text-xs font-bold text-emerald-900 flex justify-between">
                    <span>Mã đơn thuốc: #{dt.maDonThuoc || dt.id}</span>
                    <span>{dt.trangThai === 'da_phat' ? '✓ Đã lấy thuốc' : 'Đơn thuốc mới'}</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                      <tr>
                        <th className="px-4 py-2">Tên thuốc</th>
                        <th className="px-4 py-2 text-center">ĐVT</th>
                        <th className="px-4 py-2 text-center">SL</th>
                        <th className="px-4 py-2">Hướng dẫn sử dụng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(dt.chiTietDonThuoc || dt.chiTiet || []).map((ct) => (
                        <tr key={ct.id}>
                          <td className="px-4 py-2.5 font-bold text-gray-900">{ct.thuoc?.tenThuoc || 'Thuốc'}</td>
                          <td className="px-4 py-2.5 text-center">{ct.dvt || ct.thuoc?.donViTinh || 'Viên'}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-primary-700">{ct.soLuong}</td>
                          <td className="px-4 py-2.5 text-gray-600">{ct.lieuDung || ct.huongDanSuDung || 'Uống theo chỉ định'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}

      {/* Modal In Phiếu Khám Bệnh cho Bệnh Nhân */}
      <InPhieuKhamModal
        isOpen={printPhieuKham.open}
        onClose={() => setPrintPhieuKham({ open: false, record: null })}
        benhAn={printPhieuKham.record?.benhAn || printPhieuKham.record?.benhAnKham || printPhieuKham.record}
        benhNhan={latestBenhNhan || printPhieuKham.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printPhieuKham.record?.bacSiTen || printPhieuKham.record?.bacSi?.nhanVien?.hoTen || (typeof printPhieuKham.record?.bacSi === 'string' ? printPhieuKham.record?.bacSi : 'Bác sĩ điều trị') } }}
        sinhHieu={printPhieuKham.record?.sinhHieu}
        dsXetNghiem={(printPhieuKham.record?.canLamSang || printPhieuKham.record?.xetNghiem || []).map((c) => ({
          tenDichVu: c.dichVu?.tenDichVu,
          ketQua: c.ketQua ? `${c.ketQua.gia_tri || c.ketQua.giaTri || ''} ${c.ketQua.don_vi || c.ketQua.donVi || ''}` : 'Chờ KQ',
          ghiChuKetQua: c.ketQua?.nhan_xet || c.ketQua?.nhanXet || '',
        }))}
      />

      {/* Modal In Đơn Thuốc cho Bệnh Nhân */}
      <InDonThuocModal
        isOpen={printDonThuoc.open}
        onClose={() => setPrintDonThuoc({ open: false, donThuoc: null, record: null })}
        donThuoc={printDonThuoc.donThuoc ? {
          ...printDonThuoc.donThuoc,
          chiTiet: (printDonThuoc.donThuoc.chiTiet || printDonThuoc.donThuoc.chiTietDonThuoc || []).map((ct) => ({
            thuoc: ct.thuoc,
            soLuong: ct.soLuong,
            lieuDung: ct.lieuDung || ct.huongDanSuDung,
            donViTinh: ct.thuoc?.donViTinh || ct.dvt || 'Viên',
          })),
        } : null}
        benhNhan={latestBenhNhan || printDonThuoc.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printDonThuoc.record?.bacSiTen || printDonThuoc.record?.bacSi?.nhanVien?.hoTen || (typeof printDonThuoc.record?.bacSi === 'string' ? printDonThuoc.record?.bacSi : 'Bác sĩ điều trị') } }}
        chanDoan={printDonThuoc.record?.chanDoanXacDinh || printDonThuoc.record?.benhAn?.chanDoanXacDinh || printDonThuoc.record?.benhAnKham?.chanDoanXacDinh || 'Đơn thuốc điều trị ngoại trú'}
      />

      {/* Modal In & Xem Phiếu Kết Quả Xét Nghiệm / CĐHA */}
      <InKetQuaXetNghiemModal
        isOpen={printXetNghiem.open}
        onClose={() => setPrintXetNghiem({ open: false, items: [], record: null })}
        items={printXetNghiem.items}
        record={printXetNghiem.record}
        benhNhan={latestBenhNhan || printXetNghiem.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printXetNghiem.record?.bacSiTen || printXetNghiem.record?.bacSi?.nhanVien?.hoTen || (typeof printXetNghiem.record?.bacSi === 'string' ? printXetNghiem.record?.bacSi : 'Bác sĩ điều trị') } }}
      />
    </div>
  );
}
