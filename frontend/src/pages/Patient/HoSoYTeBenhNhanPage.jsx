import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import { FileText, Activity, Pill, FlaskConical, Stethoscope, User, AlertTriangle, Clock, Printer } from 'lucide-react';
import InPhieuKhamModal from '../../components/Print/InPhieuKhamModal';
import InDonThuocModal from '../../components/Print/InDonThuocModal';

export default function HoSoYTeBenhNhanPage() {
  const [printPhieuKham, setPrintPhieuKham] = useState({ open: false, record: null });
  const [printDonThuoc, setPrintDonThuoc] = useState({ open: false, donThuoc: null, record: null });
  const { data, isLoading } = useQuery({
    queryKey: ['emr-cua-toi'],
    queryFn: () => apiGet('/ho-so-benh-an/cua-toi'),
  });

  const records = data?.data || [];
  const latestBenhNhan = records[0]?.benhNhan;

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
      {records.map(({ benhAn: ba, bacSiTen, donThuoc, canLamSang, sinhHieu }, idx) => (
        <div key={ba.id} className="rounded-2xl bg-white p-6 shadow-xs border border-gray-200 space-y-6">
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
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 transition"
              >
                <Printer className="h-3.5 w-3.5" /> In phiếu khám
              </button>
              {donThuoc && donThuoc.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPrintDonThuoc({ open: true, donThuoc: donThuoc[0], record: item })}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 transition"
                >
                  <Printer className="h-3.5 w-3.5" /> In đơn thuốc
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
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-purple-600" /> Kết quả Xét nghiệm & CĐHA
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {canLamSang.map((c) => (
                  <div key={c.id} className="rounded-xl border border-gray-200 p-3 bg-purple-50/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{c.dichVu?.tenDichVu || 'Xét nghiệm'}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.trangThai === 'co_ket_qua' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.trangThai === 'co_ket_qua' ? 'Có kết quả' : 'Đang xử lý'}
                      </span>
                    </div>
                    {c.ketQua && (
                      <div className="mt-1 pt-1.5 border-t border-purple-100 text-gray-800">
                        <p className="font-bold text-emerald-900 text-sm">
                          Giá trị: {c.ketQua.gia_tri || c.ketQua.giaTri || 'Chưa nhập'} {c.ketQua.don_vi || c.ketQua.donVi || ''}
                        </p>
                        {(c.ketQua.nhan_xet || c.ketQua.nhanXet) && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            <strong>Nhận xét KTV:</strong> {c.ketQua.nhan_xet || c.ketQua.nhanXet}
                          </p>
                        )}
                        {(c.ketQua.file_dinh_kem || c.ketQua.fileDinhKem) && (
                          <div className="mt-2 pt-1.5 border-t border-purple-200/60 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-purple-800 flex items-center gap-1">
                              📎 Tệp kết quả / Ảnh chụp đính kèm
                            </span>
                            <a
                              href={(c.ketQua.file_dinh_kem || c.ketQua.fileDinhKem).startsWith('http') ? (c.ketQua.file_dinh_kem || c.ketQua.fileDinhKem) : `http://localhost:5000${c.ketQua.file_dinh_kem || c.ketQua.fileDinhKem}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs hover:underline"
                            >
                              Xem / Tải ảnh ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
                      {dt.chiTietDonThuoc?.map((ct) => (
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
      ))}

      {/* Modal In Phiếu Khám Bệnh cho Bệnh Nhân */}
      <InPhieuKhamModal
        isOpen={printPhieuKham.open}
        onClose={() => setPrintPhieuKham({ open: false, record: null })}
        benhAn={printPhieuKham.record?.benhAnKham}
        benhNhan={latestBenhNhan || printPhieuKham.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printPhieuKham.record?.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị' } }}
        sinhHieu={printPhieuKham.record?.sinhHieu}
        dsXetNghiem={(printPhieuKham.record?.canLamSang || []).map((c) => ({
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
          chiTiet: (printDonThuoc.donThuoc.chiTietDonThuoc || []).map((ct) => ({
            thuoc: ct.thuoc,
            soLuong: ct.soLuong,
            lieuDung: ct.lieuDung || ct.huongDanSuDung,
          })),
        } : null}
        benhNhan={latestBenhNhan || printDonThuoc.record?.benhNhan}
        bacSi={{ nhanVien: { hoTen: printDonThuoc.record?.bacSi?.nhanVien?.hoTen || 'Bác sĩ điều trị' } }}
        chanDoan={printDonThuoc.record?.benhAnKham?.chanDoanXacDinh || 'Đơn thuốc điều trị ngoại trú'}
      />
    </div>
  );
}

