import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import {
  ClipboardList, Search, User, FileText, Activity, FlaskConical, Pill, Calendar
} from 'lucide-react';

export default function HoSoBenhAnQuanLyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBenhNhan, setSelectedBenhNhan] = useState(null);

  // Lấy danh sách bệnh nhân
  const { data: bnData, isLoading: bnLoading } = useQuery({
    queryKey: ['benh-nhan-list-emr', searchTerm],
    queryFn: () => apiGet(`/benh-nhan?search=${encodeURIComponent(searchTerm)}`),
  });

  const bnList = bnData?.data || [];
  const activeBn = selectedBenhNhan || bnList[0];

  // Lấy lịch sử khám của bệnh nhân đã chọn
  const { data: hsData, isLoading: hsLoading } = useQuery({
    queryKey: ['ho-so-kham-emr', activeBn?.id],
    queryFn: () => apiGet(`/ho-so-benh-an/lich-su/${activeBn?.id}`),
    enabled: !!activeBn?.id,
  });

  const hoSoList = hsData?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-primary-600" /> Quản lý Hồ sơ Bệnh án (EMR)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          UC-BS-03: Tra cứu tiền sử y tế, diễn biến lâm sàng, sinh hiệu, xét nghiệm và đơn thuốc toàn hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-13rem)]">
        {/* Cột trái: Tìm kiếm bệnh nhân */}
        <MedCard className="flex flex-col h-full overflow-hidden p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm bệnh nhân (Tên, Mã BN, SĐT)..."
              className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {bnLoading && <p className="text-center text-sm text-gray-400 py-6">Đang tải danh sách...</p>}
            {bnList.map((bn) => (
              <div
                key={bn.id}
                onClick={() => setSelectedBenhNhan(bn)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  activeBn?.id === bn.id
                    ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-700">{bn.maBenhNhan}</span>
                  <span className="text-xs text-gray-500">{bn.gioiTinh === 'nam' ? 'Nam' : 'Nữ'} • {tinhTuoi(bn.ngaySinh)}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mt-0.5">{bn.hoTen}</p>
                <p className="text-xs text-gray-500 mt-0.5">SĐT: {bn.soDienThoai}</p>
              </div>
            ))}
          </div>
        </MedCard>

        {/* Cột phải: Chi tiết Hồ sơ Bệnh án EMR */}
        {activeBn ? (
          <div className="lg:col-span-2 flex flex-col h-full overflow-y-auto space-y-4 pr-1">
            {/* Thẻ bệnh nhân */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{activeBn.hoTen}</h3>
                  <p className="text-xs text-gray-500">
                    Mã BN: <span className="font-bold text-gray-700">{activeBn.maBenhNhan}</span> | SĐT: {activeBn.soDienThoai} | Địa chỉ: {activeBn.diaChi || 'Chưa cập nhật'}
                  </p>
                  {activeBn.tienSuDiUng && (
                    <span className="inline-block mt-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-medium">
                      ⚠ Tiền sử dị ứng: {activeBenhNhan.tienSuDiUng}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Danh sách các lần khám trước */}
            <MedCard title={`Lịch sử khám bệnh (${hoSoList.length} lượt)`}>
              {hsLoading && <p className="text-sm text-gray-400 py-4">Đang tải hồ sơ bệnh án...</p>}
              {hoSoList.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">Bệnh nhân chưa có hồ sơ khám bệnh nào</p>
              ) : (
                <div className="space-y-4">
                  {hoSoList.map((hs) => (
                    <div key={hs.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary-600" />
                          <span className="font-bold text-sm text-gray-900">{formatDateTime(hs.ngayKham)}</span>
                          <span className="text-xs text-gray-500">• Bác sĩ: {hs.bacSi?.nhanVien?.hoTen || 'Bác sĩ chuyên khoa'}</span>
                        </div>
                        <StatusBadge status={hs.trangThai === 'da_hoan_thanh' ? 'hoan_thanh' : 'dang_kham'} size="sm" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-gray-700">Triệu chứng lâm sàng:</p>
                          <p className="text-gray-600 mt-0.5">{hs.trieuChung || 'Không ghi nhận'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Chẩn đoán xác định:</p>
                          <p className="text-primary-700 font-bold mt-0.5">{hs.chanDoanXacDinh || hs.chanDoanSoBo || 'Chưa chẩn đoán'}</p>
                        </div>
                      </div>

                      {hs.phuongPhapDieuTri && (
                        <div className="text-xs bg-white p-2.5 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-700">Phương pháp điều trị & Lời khuyên:</p>
                          <p className="text-gray-600 mt-0.5">{hs.phuongPhapDieuTri}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MedCard>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-400">Chọn bệnh nhân ở danh sách bên trái để xem Hồ sơ Bệnh án EMR</p>
          </div>
        )}
      </div>
    </div>
  );
}
