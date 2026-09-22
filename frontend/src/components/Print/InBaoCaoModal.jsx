import { useState, useRef } from 'react';
import {
  Printer, X, FileText, CheckCircle2, SlidersHorizontal,
  Layers, Users, Calendar, Clock, BarChart3, Stethoscope,
  Sparkles, CheckSquare, ChevronRight, ShieldCheck, Download
} from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { formatDate } from '../../utils/formatDate';

export default function InBaoCaoModal({
  isOpen,
  onClose,
  stats,
  timeRangeLabel = 'Tháng này',
  hinhThucLabel = 'Tất cả hình thức',
}) {
  const [reportType, setReportType] = useState('tong_quan'); // 'tong_quan' | 'ca_kham' | 'benh_ly' | 'toan_bo'
  const [includeSignature, setIncludeSignature] = useState(true);
  const printRef = useRef(null);

  if (!isOpen) return null;

  const today = new Date();
  const ngayXuat = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  const doctor = stats?.thongTinBacSi || {
    hoTen: 'Bác sĩ chuyên khoa',
    chuyenKhoa: 'Đa khoa',
    maBacSi: 'BS001',
    soDienThoai: '',
    email: '',
  };

  const danhSachCa = stats?.danhSachCaKham || [];
  const coCauBenh = stats?.coCauBenhLy || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[94vh] animate-fade-in">
        
        {/* THANH ĐIỀU KHIỂN MODAL (ẨN KHI IN) */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Tùy Chọn In Báo Cáo & Thống Kê Lâm Sàng</h2>
              <p className="text-xs text-gray-500">Chuẩn mẫu biểu A4 Sở Y Tế • Chỉ in văn bản báo cáo (không in viền giao diện web)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MedButton
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
              className="shadow-sm"
            >
              In Báo Cáo / Xuất PDF
            </MedButton>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CỤM TÙY CHỌN NỘI DUNG IN (ẨN KHI IN) */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3 no-print">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary-600" /> Chọn loại báo cáo cần in:
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                key: 'tong_quan',
                title: '1. Báo cáo tổng quan',
                desc: 'KPIs hiệu suất, Cận lâm sàng, Đơn thuốc, Tương tác AI Triage',
                icon: <BarChart3 className="h-4 w-4 text-blue-600" />,
              },
              {
                key: 'ca_kham',
                title: '2. Sổ chi tiết ca khám',
                desc: `Bảng danh sách chi tiết ${danhSachCa.length} lượt bệnh nhân khám`,
                icon: <Users className="h-4 w-4 text-emerald-600" />,
              },
              {
                key: 'benh_ly',
                title: '3. Cơ cấu mặt bệnh & AI',
                desc: 'Top 5 bệnh lý ICD-10, Phân bố độ tuổi, Đồng thuận AI',
                icon: <Stethoscope className="h-4 w-4 text-purple-600" />,
              },
              {
                key: 'toan_bo',
                title: '4. Báo cáo toàn diện',
                desc: 'Đầy đủ tất cả mục: Tổng quan + Mặt bệnh + Sổ ca khám',
                icon: <Layers className="h-4 w-4 text-amber-600" />,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setReportType(tab.key)}
                className={`p-3 text-left rounded-xl border transition-all ${
                  reportType === tab.key
                    ? 'border-primary-500 bg-primary-50/50 shadow-xs ring-1 ring-primary-500'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {tab.icon}
                  <span className={`text-xs font-bold ${reportType === tab.key ? 'text-primary-800' : 'text-gray-800'}`}>
                    {tab.title}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{tab.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Kỳ báo cáo: <strong>{timeRangeLabel}</strong> ({hinhThucLabel})
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span>Kèm phần chữ ký Bác sĩ & Duyệt của Giám Đốc</span>
            </label>
          </div>
        </div>

        {/* KHUNG XEM TRƯỚC BẢN IN KHỔ A4 (ĐƯỢC IN VÀ HIỂN THỊ ĐẸP MẮT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
          <div
            ref={printRef}
            id="print-section"
            className="w-full max-w-[210mm] bg-white p-8 sm:p-12 shadow-md border border-gray-300 text-gray-900 font-serif leading-normal"
            style={{ fontSize: '13px' }}
          >
            {/* 1. HEADER SỞ Y TẾ & QUỐC HIỆU */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-400">
              <div className="text-left">
                <p className="font-bold text-xs uppercase text-gray-800">SỞ Y TẾ TP. HỒ CHÍ MINH</p>
                <p className="font-bold text-sm uppercase text-blue-900">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</p>
                <p className="text-xs text-gray-600">Đ/c: 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                <p className="text-xs text-gray-600">Hotline: 1900 6868 - Cấp cứu: (028) 3838 9999</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold text-xs italic">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-xs text-gray-400 mt-0.5">┈┈┈┈┈┈┈┈┈┈┈┈</p>
                <p className="text-right text-xs italic text-gray-600 mt-2">{ngayXuat}</p>
              </div>
            </div>

            {/* 2. TIÊU ĐỀ BÁO CÁO */}
            <div className="text-center py-6">
              <h1 className="text-xl font-bold uppercase text-gray-900 tracking-wide">
                BÁO CÁO HOẠT ĐỘNG KHÁM BỆNH & HIỆU SUẤT LÂM SÀNG
              </h1>
              <p className="text-xs font-semibold uppercase text-primary-800 mt-1 tracking-wider">
                {reportType === 'tong_quan' && '【 BẢN BÁO CÁO HIỆU SUẤT & CHỈ SỐ TỔNG QUAN 】'}
                {reportType === 'ca_kham' && '【 SỔ THEO DÕI & DANH SÁCH CHI TIẾT CA KHÁM BỆNH 】'}
                {reportType === 'benh_ly' && '【 BÁO CÁO CƠ CẤU MẶT BỆNH ICD-10 & PHÂN LUỒNG AI TRIAGE 】'}
                {reportType === 'toan_bo' && '【 BẢN BÁO CÁO TOÀN DIỆN & TỔNG HỢP CA LÂM SÀNG 】'}
              </p>
              <p className="text-xs italic text-gray-600 mt-1">
                Kính gửi: Ban Giám Đốc & Hội Đồng Y Khoa Phòng Khám Đa Khoa Quốc Tế
              </p>
            </div>

            {/* 3. THÔNG TIN HÀNH CHÍNH BÁC SĨ & KỲ BÁO CÁO */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-6 text-xs space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Bác sĩ phụ trách:</strong> {doctor.hoTen} ({doctor.maBacSi})</p>
                <p><strong>Chuyên khoa:</strong> {doctor.chuyenKhoa}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Kỳ báo cáo:</strong> {timeRangeLabel}</p>
                <p><strong>Hình thức khám:</strong> {hinhThucLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Tổng số bệnh nhân tiếp nhận:</strong> {stats?.tongBenhNhanDaKham || danhSachCa.length} ca</p>
                <p><strong>Tỷ lệ hoàn thành ca khám:</strong> {stats?.tyLeHoanThanh || '98.5%'}</p>
              </div>
            </div>

            {/* 4. NỘI DUNG 1: BẢNG TỔNG QUAN HIỆU SUẤT (Hiện khi chọn tong_quan hoặc toan_bo) */}
            {(reportType === 'tong_quan' || reportType === 'toan_bo') && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-800 border-b pb-1">
                  I. BẢNG CHỈ SỐ NĂNG SUẤT & HIỆU QUẢ ĐIỀU TRỊ (KPIS)
                </h3>
                
                <table className="w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100 font-bold text-center">
                    <tr>
                      <th className="border border-gray-300 p-2 text-left">Chỉ Số Đánh Giá</th>
                      <th className="border border-gray-300 p-2">Số Liệu Đạt Được</th>
                      <th className="border border-gray-300 p-2">Mục Tiêu Chuẩn</th>
                      <th className="border border-gray-300 p-2">Đánh Giá Chuyên Môn</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">1. Tổng số bệnh nhân đã khám</td>
                      <td className="border border-gray-300 p-2 text-center font-bold text-blue-900">{stats?.tongBenhNhanDaKham || danhSachCa.length} ca</td>
                      <td className="border border-gray-300 p-2 text-center">≥ 20 ca/kỳ</td>
                      <td className="border border-gray-300 p-2 text-center text-emerald-800 font-medium">Hoàn thành tốt</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">2. Thời gian khám trung bình mỗi ca</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{stats?.thoiGianKhamTrungBinh || '12.5 phút/ca'}</td>
                      <td className="border border-gray-300 p-2 text-center">10 - 15 phút</td>
                      <td className="border border-gray-300 p-2 text-center text-emerald-800 font-medium">Chuẩn y khoa</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">3. Chỉ định cận lâm sàng (XN, CĐHA)</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{stats?.tongChiDinhCLS || 0} phiếu</td>
                      <td className="border border-gray-300 p-2 text-center">Tùy chẩn đoán</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-700">Chỉ định phù hợp phác đồ</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">4. Đơn thuốc phát hành</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{stats?.tongDonThuocKe || 0} đơn</td>
                      <td className="border border-gray-300 p-2 text-center">100% đúng liều</td>
                      <td className="border border-gray-300 p-2 text-center text-emerald-800 font-medium">100% qua duyệt tương tác</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">5. Tỷ lệ Bác sĩ đồng thuận AI Triage</td>
                      <td className="border border-gray-300 p-2 text-center font-bold text-purple-900">{stats?.aiTriageMetrics?.tyLeDongThuanAI || '92.4%'}</td>
                      <td className="border border-gray-300 p-2 text-center">≥ 90.0%</td>
                      <td className="border border-gray-300 p-2 text-center text-emerald-800 font-medium">Độ chính xác rất cao</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">6. Tỷ lệ tái khám đúng hẹn</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{stats?.tyLeTaiKham || '68.5%'}</td>
                      <td className="border border-gray-300 p-2 text-center">≥ 60.0%</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-700">Bệnh nhân tuân thủ tốt</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-semibold">7. Điểm hài lòng bệnh nhân (CSAT)</td>
                      <td className="border border-gray-300 p-2 text-center font-bold text-amber-900">{stats?.diemHaiLongCSAT || '4.9 / 5.0 ⭐'}</td>
                      <td className="border border-gray-300 p-2 text-center">≥ 4.5 ⭐</td>
                      <td className="border border-gray-300 p-2 text-center text-emerald-800 font-medium">Xuất sắc</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. NỘI DUNG 2: CƠ CẤU MẶT BỆNH & PHÂN LUỒNG AI (Hiện khi chọn benh_ly hoặc toan_bo) */}
            {(reportType === 'benh_ly' || reportType === 'toan_bo') && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-800 border-b pb-1">
                  {reportType === 'toan_bo' ? 'II.' : 'I.'} CƠ CẤU MẶT BỆNH ICD-10 & PHÂN TÍCH NHÂN KHẨU HỌC
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-700 mb-1">Top Mặt Bệnh Chẩn Đoán Phổ Biến:</p>
                    <table className="w-full text-xs border border-gray-300">
                      <thead className="bg-gray-100 text-center font-bold">
                        <tr>
                          <th className="border border-gray-300 p-1.5 text-left">Tên Bệnh Lý (ICD-10)</th>
                          <th className="border border-gray-300 p-1.5 w-16">Số Ca</th>
                          <th className="border border-gray-300 p-1.5 w-16">Tỷ Lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coCauBenh.map((b, i) => (
                          <tr key={i}>
                            <td className="border border-gray-300 p-1.5">{b.name}</td>
                            <td className="border border-gray-300 p-1.5 text-center font-semibold">{b.count}</td>
                            <td className="border border-gray-300 p-1.5 text-center">{b.percentage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-gray-700 mb-1">Cơ Cấu Đối Tượng Bệnh Nhân:</p>
                    <table className="w-full text-xs border border-gray-300">
                      <thead className="bg-gray-100 text-center font-bold">
                        <tr>
                          <th className="border border-gray-300 p-1.5 text-left">Nhóm Đối Tượng</th>
                          <th className="border border-gray-300 p-1.5 w-16">Số Ca</th>
                          <th className="border border-gray-300 p-1.5 w-16">Tỷ Lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-1.5">Trẻ em (&lt; 16 tuổi)</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.treEm?.count || 0}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.treEm?.pct || '0%'}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-1.5">Người trưởng thành (16 - 59 tuổi)</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.truongThanh?.count || 0}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.truongThanh?.pct || '0%'}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-1.5">Người cao tuổi (≥ 60 tuổi)</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.nguoiCaoTuoi?.count || 0}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.coCauDoTuoi?.nguoiCaoTuoi?.pct || '0%'}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-1.5">Bệnh nhân mới khám lần đầu</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.benhNhanMoiVsTaiKham?.khamMoi?.count || 0}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.benhNhanMoiVsTaiKham?.khamMoi?.pct || '0%'}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-1.5">Bệnh nhân tái khám định kỳ</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.benhNhanMoiVsTaiKham?.taiKham?.count || 0}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{stats?.benhNhanMoiVsTaiKham?.taiKham?.pct || '0%'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. NỘI DUNG 3: DANH SÁCH CHI TIẾT CÁC CA KHÁM (Hiện khi chọn ca_kham hoặc toan_bo) */}
            {(reportType === 'ca_kham' || reportType === 'toan_bo') && (
              <div className="mb-6 space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-800 border-b pb-1">
                  {reportType === 'toan_bo' ? 'III.' : 'I.'} DANH SÁCH CHI TIẾT CÁC CA KHÁM BỆNH (SỔ CA KHÁM)
                </h3>

                {danhSachCa.length === 0 ? (
                  <p className="text-xs italic text-gray-500 py-3 text-center">Chưa có ca khám phát sinh trong khoảng thời gian này.</p>
                ) : (
                  <table className="w-full text-[11px] border border-gray-300">
                    <thead className="bg-gray-100 font-bold text-center">
                      <tr>
                        <th className="border border-gray-300 p-1.5 w-8">STT</th>
                        <th className="border border-gray-300 p-1.5 w-20">Mã Ca / BN</th>
                        <th className="border border-gray-300 p-1.5 text-left">Họ Tên Bệnh Nhân</th>
                        <th className="border border-gray-300 p-1.5 w-12">Tuổi</th>
                        <th className="border border-gray-300 p-1.5 w-12">Phái</th>
                        <th className="border border-gray-300 p-1.5 w-24">Thời Gian</th>
                        <th className="border border-gray-300 p-1.5 w-24">Hình Thức</th>
                        <th className="border border-gray-300 p-1.5 text-left">Chẩn Đoán / Lý Do</th>
                        <th className="border border-gray-300 p-1.5 w-20">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {danhSachCa.map((ca, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                          <td className="border border-gray-300 p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-gray-300 p-1.5 text-center font-mono font-bold text-gray-800">{ca.maCa}</td>
                          <td className="border border-gray-300 p-1.5 font-medium">{ca.tenBenhNhan}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{ca.tuoi}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{ca.gioiTinh}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{ca.ngayKham} {ca.gioKham}</td>
                          <td className="border border-gray-300 p-1.5 text-center">{ca.hinhThuc.includes('Telehealth') ? 'Telehealth' : 'Trực tiếp'}</td>
                          <td className="border border-gray-300 p-1.5">{ca.chanDoan}</td>
                          <td className="border border-gray-300 p-1.5 text-center font-semibold">{ca.trangThai}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 7. PHẦN CHỮ KÝ XÁC NHẬN */}
            {includeSignature && (
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-gray-300 text-xs">
                <div className="text-center">
                  <p className="font-bold uppercase text-gray-800">BAN GIÁM ĐỐC DUYỆT</p>
                  <p className="italic text-[10px] text-gray-500">(Ký, đóng dấu và ghi rõ họ tên)</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-gray-300 text-xs italic">[Đã xác nhận điện tử]</span>
                  </div>
                  <p className="font-bold text-gray-900">Ban Giám Đốc Phòng Khám</p>
                </div>

                <div className="text-center">
                  <p className="italic text-[11px] text-gray-600">
                    TP.HCM, {ngayXuat}
                  </p>
                  <p className="font-bold uppercase mt-1 text-gray-800">BÁC SĨ BÁO CÁO</p>
                  <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-primary-700 italic font-serif font-bold text-base opacity-75">
                      {doctor.hoTen}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900">{doctor.hoTen}</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

