import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../services/api';
import { getLocalDateString } from '../../utils/formatDate';

const LOAI_HUY = {
  phong_kham: { label: 'Lỗi phòng khám', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  benh_nhan: { label: 'Lỗi bệnh nhân', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  nham: { label: 'Tiếp nhận nhầm', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
};
const TRANG_THAI_HOAN = {
  khong_hoan: 'Không hoàn',
  cho_duyet: 'Chờ BGĐ duyệt',
  da_duyet: 'BGĐ đã duyệt',
  tu_choi: 'BGĐ từ chối',
  tu_dong: 'Hoàn theo quy định',
};
const tien = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`;

/** Ban Giám Đốc theo dõi lễ tân hủy lịch / lượt khám: ai hủy, lỗi bên nào, hoàn bao nhiêu */
export default function BaoCaoHuyLichPage() {
  const homNay = getLocalDateString();
  const [tuNgay, setTuNgay] = useState(`${homNay.slice(0, 8)}01`);
  const [denNgay, setDenNgay] = useState(homNay);

  const { data, isLoading } = useQuery({
    queryKey: ['bao-cao-huy-lich', tuNgay, denNgay],
    queryFn: () => apiGet('/tiep-nhan/bao-cao/huy-lich', { tuNgay, denNgay }).then((r) => r?.data),
  });
  const theoNhanVien = data?.theoNhanVien || [];
  const chiTiet = data?.chiTiet || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch hủy tại quầy</h1>
          <p className="text-xs text-gray-500">Lễ tân hủy lịch hẹn / lượt khám: người hủy, lỗi bên nào và số tiền cọc được hoàn</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1" />
          <span className="text-gray-400">→</span>
          <input type="date" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-gray-800">Theo nhân viên</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">Đang tải…</p>
        ) : theoNhanVien.length === 0 ? (
          <p className="text-sm text-gray-500">Không có lần hủy nào trong khoảng thời gian này.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Nhân viên</th>
                <th className="py-2 text-right">Tổng</th>
                <th className="py-2 text-right">Lỗi phòng khám</th>
                <th className="py-2 text-right">Lỗi bệnh nhân</th>
                <th className="py-2 text-right">Nhầm</th>
                <th className="py-2 text-right">Tiền cọc hoàn</th>
              </tr>
            </thead>
            <tbody>
              {theoNhanVien.map((nv) => (
                <tr key={`${nv.nhanVienId}-${nv.tenNguoiHuy}`} className="border-t border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{nv.tenNguoiHuy}</td>
                  <td className="py-2 text-right font-bold">{nv.tong}</td>
                  <td className="py-2 text-right text-rose-700">{nv.phong_kham || 0}</td>
                  <td className="py-2 text-right text-amber-700">{nv.benh_nhan || 0}</td>
                  <td className="py-2 text-right text-gray-600">{nv.nham || 0}</td>
                  <td className="py-2 text-right">{tien(nv.tienHoan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-gray-800">Chi tiết ({chiTiet.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Thời gian</th>
                <th className="py-2">Lịch hẹn / Lượt</th>
                <th className="py-2">Bệnh nhân</th>
                <th className="py-2">Người hủy</th>
                <th className="py-2">Lỗi bên nào</th>
                <th className="py-2">Lý do</th>
                <th className="py-2 text-right">Hoàn cọc</th>
              </tr>
            </thead>
            <tbody>
              {chiTiet.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="py-2 whitespace-nowrap text-gray-600">{new Date(r.thoiGian).toLocaleString('vi-VN')}</td>
                  <td className="py-2 font-mono text-xs">
                    {r.maLichHen || '—'}
                    {r.maSoThuTu ? ` · ${r.maSoThuTu}` : ''}
                  </td>
                  <td className="py-2">{r.tenBenhNhan || '—'}</td>
                  <td className="py-2">{r.tenNguoiHuy}</td>
                  <td className="py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${LOAI_HUY[r.loaiHuy]?.cls || ''}`}>
                      {LOAI_HUY[r.loaiHuy]?.label || r.loaiHuy}
                    </span>
                  </td>
                  <td className="py-2 max-w-[260px] text-gray-700">{r.lyDo}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {r.soTienHoan > 0 ? tien(r.soTienHoan) : '—'}
                    <div className="text-[11px] text-gray-500">{TRANG_THAI_HOAN[r.trangThaiHoan] || r.trangThaiHoan}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
