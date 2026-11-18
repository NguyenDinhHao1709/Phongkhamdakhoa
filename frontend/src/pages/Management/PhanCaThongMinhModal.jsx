import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { apiPost } from '../../services/api';

const TEN_NHOM = { bac_si: 'Bác sĩ', tiep_tan: 'Lễ tân', thu_ngan: 'Thu ngân', nha_thuoc: 'Dược', ky_thuat_vien: 'KTV' };
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const loiApi = (err) => {
  const m = err?.error?.message || err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
  return Array.isArray(m) ? m.join('\n') : m || 'Có lỗi xảy ra';
};

/** Phân ca tự động: đề xuất theo dự báo bệnh nhân + ràng buộc lao động, giám đốc xem chỉ số rồi mới áp dụng */
export default function PhanCaThongMinhModal({ weekStart, weekDays, onClose }) {
  const queryClient = useQueryClient();
  const [thamSo, setThamSo] = useState({ overwrite: true, soBnMoiGioBs: 4, soBnMoiNguoiHoTro: 40, gioToiDaTuan: 48, gioNghiToiThieu: 12 });
  const [deXuat, setDeXuat] = useState(null);

  const deXuatMutation = useMutation({
    mutationFn: () => apiPost('/quan-ly/phan-ca-tu-dong/de-xuat', { weekStart, ...thamSo }),
    onSuccess: (res) => setDeXuat(res?.data?.data || res?.data),
    onError: (err) => alert(`⚠️ Không thể đề xuất lịch:\n${loiApi(err)}`),
  });

  const apDungMutation = useMutation({
    mutationFn: () => apiPost('/quan-ly/phan-ca-tu-dong/ap-dung', {
      weekStart, overwrite: deXuat.overwrite, caDeXuat: deXuat.caDeXuat,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quan-ly-lich-lam-viec'] });
      alert(res?.message || res?.data?.message || 'Đã áp dụng lịch trực');
      onClose();
    },
    onError: (err) => alert(`⚠️ Không thể áp dụng:\n${loiApi(err)}`),
  });

  // Lưới đề xuất: nhân viên × ngày → tên các ca
  const luoi = useMemo(() => {
    if (!deXuat) return [];
    return deXuat.gioTheoNguoi
      .filter((g) => g.soCa > 0 || g.nghi > 0)
      .map((g) => ({
        ...g,
        ngay: weekDays.map((d) => deXuat.caDeXuat.filter((c) => c.nhanVienId === g.nhanVienId && c.ngayLam === d.dateStr)),
      }));
  }, [deXuat, weekDays]);

  // Độ phủ nhu cầu theo ngày × ca
  const phu = useMemo(() => {
    if (!deXuat) return [];
    const nhom = new Map();
    for (const p of deXuat.phuNhuCau) {
      const key = `${p.ngay}_${p.caId}`;
      if (!nhom.has(key)) nhom.set(key, { ngay: p.ngay, tenCa: p.tenCa, ds: [] });
      nhom.get(key).ds.push(p);
    }
    return [...nhom.values()];
  }, [deXuat]);

  const sua = (field, value) => {
    setThamSo((t) => ({ ...t, [field]: value }));
    setDeXuat(null);
  };
  const oSo = (field, label, min, max) => (
    <label className="space-y-1">
      <span className="font-semibold text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={thamSo[field]}
        onChange={(e) => sua(field, Number(e.target.value))}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-6xl max-h-[92vh] overflow-y-auto text-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600 text-white rounded-xl"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Phân ca tự động theo nhu cầu</h3>
              <p className="text-[11px] text-purple-700 font-semibold">
                Tuần {weekDays[0].fullDate} – {weekDays[6].fullDate}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-purple-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5"><Info className="h-4 w-4 text-purple-600" /> Cách hệ thống xếp ca</p>
            <p>• <b>Nhu cầu:</b> dự báo số bệnh nhân từng khoa (Holt-Winters, thiếu dữ liệu thì lấy trung bình cùng thứ 8 tuần trước) và lịch hẹn đã đặt, chia theo giờ đến thực tế vào từng ca → số bác sĩ cần. Tối thiểu 1 bác sĩ/khoa ở ca sáng, chiều T2–T6 và sáng T7; 1 bác sĩ trực sáng CN và các ca tối T2–T6.</p>
            <p>• <b>Ràng buộc:</b> không xếp ngày nghỉ phép đã duyệt; tối đa {thamSo.gioToiDaTuan} giờ/tuần, 6 ngày/tuần; nghỉ ≥ {thamSo.gioNghiToiThieu} giờ giữa 2 ngày; giữ ca bác sĩ đã có bệnh nhân đặt lịch.</p>
            <p>• <b>Công bằng:</b> ưu tiên người ít giờ, xoay vòng ca tối / Chủ nhật (tính cả 4 tuần trước), sau đó cân bằng giờ giữa người cùng vị trí.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            {oSo('soBnMoiGioBs', 'BN / bác sĩ / giờ', 1, 20)}
            {oSo('soBnMoiNguoiHoTro', 'BN / nhân viên hỗ trợ / ca', 5, 200)}
            {oSo('gioToiDaTuan', 'Giờ tối đa / tuần', 8, 72)}
            {oSo('gioNghiToiThieu', 'Giờ nghỉ giữa 2 ngày', 0, 24)}
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={!thamSo.overwrite} onChange={(e) => sua('overwrite', !e.target.checked)} />
              <span className="font-semibold text-gray-700">Giữ ca đã xếp, chỉ bổ sung</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={deXuatMutation.isPending}
              onClick={() => deXuatMutation.mutate()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5"
            >
              <Sparkles className={`h-4 w-4 ${deXuatMutation.isPending ? 'animate-spin' : ''}`} />
              {deXuatMutation.isPending ? 'Đang dự báo & xếp ca...' : deXuat ? 'Đề xuất lại' : 'Phân tích & đề xuất'}
            </button>
          </div>

          {deXuat && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-gray-500">Tổng ca đề xuất</p>
                  <p className="text-lg font-bold text-gray-900">{deXuat.caDeXuat.length}</p>
                </div>
                <div className={`rounded-xl border p-3 ${deXuat.thieu.length ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <p className="text-gray-500">Vị trí thiếu người</p>
                  <p className={`text-lg font-bold ${deXuat.thieu.length ? 'text-red-600' : 'text-emerald-600'}`}>{deXuat.thieu.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-gray-500">Ngày nghỉ phép đã trừ</p>
                  <p className="text-lg font-bold text-gray-900">{deXuat.soNgayNghiPhep}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-gray-500">Nguồn dự báo</p>
                  <p className="font-semibold text-gray-800">
                    {[...new Set(Object.values(deXuat.nguonDuBao))].join(', ')}
                  </p>
                </div>
              </div>

              {(deXuat.thieu.length > 0 || deXuat.canhBao.length > 0) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1 max-h-40 overflow-y-auto">
                  {[...deXuat.canhBao, ...deXuat.thieu].map((t) => (
                    <p key={t} className="text-red-700 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {t}
                    </p>
                  ))}
                </div>
              )}

              <div>
                <h4 className="font-bold text-gray-900 mb-1.5">Chênh lệch giờ làm theo vị trí</h4>
                <div className="flex flex-wrap gap-2">
                  {deXuat.chenhLech.map((c) => (
                    <span key={c.nhom} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
                      {c.tenNhom} ({c.soNguoi}): {c.gioMin}–{c.gioMax} giờ
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-1.5">Lịch đề xuất</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-2">Nhân viên</th>
                        {weekDays.map((d, i) => <th key={d.dateStr} className="p-2">{THU[i]} {d.display}</th>)}
                        <th className="p-2">Giờ</th>
                        <th className="p-2" title="Ca tối / Chủ nhật">Ca khó</th>
                      </tr>
                    </thead>
                    <tbody>
                      {luoi.map((r) => (
                        <tr key={r.nhanVienId} className="border-t border-gray-100">
                          <td className="p-2">
                            <p className="font-semibold text-gray-900">{r.hoTen}</p>
                            <p className="text-[10px] text-gray-500">{TEN_NHOM[r.nhom]}{r.chuyenKhoa ? ` · ${r.chuyenKhoa}` : ''}</p>
                          </td>
                          {r.ngay.map((ds, i) => (
                            <td key={i} className="p-1 text-center align-top">
                              {ds.map((c) => (
                                <span
                                  key={c.caLamViecId}
                                  title={c.ghiChu}
                                  className={`block mb-0.5 px-1 py-0.5 rounded text-[10px] ${c.coDinh ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-700'}`}
                                >
                                  {c.tenCa}
                                </span>
                              ))}
                            </td>
                          ))}
                          <td className="p-2 text-center font-semibold">{r.soGio}</td>
                          <td className="p-2 text-center">{r.soCaKho}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  <span className="px-1 rounded bg-amber-100 text-amber-800">Vàng</span> = ca giữ nguyên (đã có bệnh nhân đặt lịch hoặc đã xếp trước).
                </p>
              </div>

              <details className="border border-gray-200 rounded-xl">
                <summary className="p-2.5 font-bold text-gray-900 cursor-pointer">Độ phủ nhu cầu từng ca ({phu.length} ca mở khám)</summary>
                <div className="p-2.5 grid sm:grid-cols-2 gap-2">
                  {phu.map((p) => (
                    <div key={`${p.ngay}_${p.tenCa}`} className="rounded-lg border border-gray-100 p-2">
                      <p className="font-semibold text-gray-800">{p.ngay} · {p.tenCa}</p>
                      {p.ds.map((n) => (
                        <p key={`${n.nhom}_${n.chuyenKhoa}`} title={n.lyDo} className={n.daXep < n.can ? 'text-red-600' : 'text-gray-600'}>
                          {n.daXep < n.can ? '✗' : '✓'} {TEN_NHOM[n.nhom]}{n.chuyenKhoa ? ` ${n.chuyenKhoa}` : n.nhom === 'bac_si' ? ' (bất kỳ)' : ''}: {n.daXep}/{n.can}
                          <span className="text-gray-400"> — {n.lyDo}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={apDungMutation.isPending || !deXuat.caDeXuat.length}
                  onClick={() => apDungMutation.mutate()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {apDungMutation.isPending ? 'Đang lưu...' : `Áp dụng ${deXuat.caDeXuat.length} ca${deXuat.overwrite ? ' (thay lịch cũ của tuần)' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
