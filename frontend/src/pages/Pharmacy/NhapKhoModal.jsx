import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  PackagePlus,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Send,
  Pill,
  Calculator,
  Search,
  Sparkles,
} from 'lucide-react';
import { apiPost } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function NhapKhoModal({ medicineList = [], defaultThuoc = null, onClose, onSuccess }) {
  const user = useAuthStore((s) => s.user);
  const isDirectorOrAdmin = user?.vaiTro === 'ban_giam_doc' || user?.vaiTro === 'quan_tri_vien';

  const [selectedThuocId, setSelectedThuocId] = useState(defaultThuoc?.id || '');
  const [isNewMedicine, setIsNewMedicine] = useState(!defaultThuoc && medicineList.length === 0);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedThuoc = useMemo(() => {
    return medicineList.find((m) => m.id === Number(selectedThuocId)) || defaultThuoc;
  }, [medicineList, selectedThuocId, defaultThuoc]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      thuocId: defaultThuoc?.id || '',
      tenThuoc: defaultThuoc?.tenThuoc || '',
      maThuoc: defaultThuoc?.maThuoc || '',
      donViTinh: defaultThuoc?.donViTinh || 'Hộp',
      soLuongNhap: defaultThuoc?.soLuongDeXuatNhap || defaultThuoc?.soLuongNhap || 50,
      giaNhap: defaultThuoc?.giaBan ? Math.round(Number(defaultThuoc.giaBan) * 0.7) : 45000,
      giaBan: defaultThuoc?.giaBan || 65000,
      maLo: `LO${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      ngaySanXuat: new Date().toISOString().slice(0, 10),
      ngayHetHan: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2).toISOString().slice(0, 10),
      nhaCungCap: 'Dược Hậu Giang (DHG Pharma)',
      ghiChu:
        defaultThuoc?.ghiChu ||
        (defaultThuoc?.tieuThuTrungBinhNgay
          ? `[Dự báo AI] Tốc độ tiêu thụ ~${defaultThuoc.tieuThuTrungBinhNgay}/ngày, tồn chỉ còn ~${defaultThuoc.soNgayConLai} ngày. Đề xuất nhập ${defaultThuoc.soLuongDeXuatNhap} ${defaultThuoc.donViTinh || 'đơn vị'}.`
          : 'Nhập bổ sung thuốc phục vụ cấp phát đơn ngoại trú'),
    },
  });

  const watchSoLuong = watch('soLuongNhap') || 0;
  const watchGiaNhap = watch('giaNhap') || 0;
  const tongChiPhi = Number(watchSoLuong) * Number(watchGiaNhap);

  // Khi chọn thuốc từ dropdown
  useEffect(() => {
    if (selectedThuoc) {
      setValue('thuocId', selectedThuoc.id);
      setValue('tenThuoc', selectedThuoc.tenThuoc);
      setValue('maThuoc', selectedThuoc.maThuoc);
      setValue('donViTinh', selectedThuoc.donViTinh || 'Hộp');
      setValue('giaBan', selectedThuoc.giaBan || 0);
      if (selectedThuoc.soLuongDeXuatNhap) {
        setValue('soLuongNhap', selectedThuoc.soLuongDeXuatNhap);
      }
      if (selectedThuoc.ghiChu) {
        setValue('ghiChu', selectedThuoc.ghiChu);
      }
      if (!watchGiaNhap || watchGiaNhap === 45000) {
        setValue('giaNhap', selectedThuoc.giaBan ? Math.round(Number(selectedThuoc.giaBan) * 0.7) : 35000);
      }
    }
  }, [selectedThuoc, setValue]);

  const filteredMeds = useMemo(() => {
    if (!searchTerm.trim()) return medicineList.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return medicineList.filter(
      (m) =>
        m.tenThuoc?.toLowerCase().includes(term) ||
        m.maThuoc?.toLowerCase().includes(term) ||
        m.tenHoatChat?.toLowerCase().includes(term)
    );
  }, [medicineList, searchTerm]);

  const onSubmit = async (formData) => {
    try {
      const payloadData = {
        ...formData,
        thuocId: isNewMedicine ? null : Number(formData.thuocId) || null,
        soLuongNhap: Number(formData.soLuongNhap),
        giaNhap: Number(formData.giaNhap),
        giaBan: Number(formData.giaBan),
        tongChiPhi,
        loaiNhap: isNewMedicine ? 'THUOC_MOI' : 'NHAP_BO_SUNG',
      };

      if (isDirectorOrAdmin) {
        // Giám Đốc tạo là duyệt trực tiếp
        if (payloadData.thuocId) {
          await apiPost('/nha-thuoc/nhap-kho-truc-tiep', payloadData).catch(async () => {
            // Fallback nếu chưa có route riêng
            await apiPost('/quan-ly/don-tu', {
              loaiDon: 'Phiếu nhập kho thuốc',
              noiDung: `Phiếu nhập kho thuốc (Giám Đốc tự khởi tạo):\n• Thuốc: ${payloadData.tenThuoc}\n• Số lượng: ${payloadData.soLuongNhap} ${payloadData.donViTinh}\n• Đơn giá mua: ${payloadData.giaNhap.toLocaleString('vi-VN')} VNĐ\n• TỔNG CHI PHÍ: ${tongChiPhi.toLocaleString('vi-VN')} VNĐ\n[DATA_JSON: ${JSON.stringify(payloadData)}]`,
            });
          });
        }
        alert('Lập phiếu nhập kho thành công!');
      } else {
        // Dược sĩ lập phiếu gửi Giám Đốc phê duyệt
        const noiDung = `Phiếu đề xuất nhập kho thuốc (Chờ Giám Đốc phê duyệt):
• Loại thuốc: ${isNewMedicine ? 'Thuốc mới bổ sung danh mục' : 'Nhập bổ sung thuốc đã có trong kho'}
• Tên thuốc: ${payloadData.tenThuoc} (Mã: ${payloadData.maThuoc || 'Tự động tạo'})
• Số lượng nhập: ${payloadData.soLuongNhap} ${payloadData.donViTinh}
• Đơn giá mua dự kiến: ${payloadData.giaNhap.toLocaleString('vi-VN')} VNĐ / ${payloadData.donViTinh}
• TỔNG CHI PHÍ TIỀN MUA THUỐC: ${tongChiPhi.toLocaleString('vi-VN')} VNĐ
• Số Lô: ${payloadData.maLo} | Hạn dùng (Exp): ${payloadData.ngayHetHan}
• Nhà cung cấp: ${payloadData.nhaCungCap}
• Lý do / Ghi chú: ${payloadData.ghiChu || 'Nhập kho phục vụ khám chữa bệnh'}
[DATA_JSON: ${JSON.stringify(payloadData)}]`;

        await apiPost('/quan-ly/don-tu', {
          loaiDon: 'Phiếu nhập kho thuốc',
          noiDung,
        });

        alert(
          `Đã lập Phiếu nhập kho thuốc thành công!\nTổng chi phí mua thuốc: ${tongChiPhi.toLocaleString(
            'vi-VN'
          )} VNĐ.\nYêu cầu đã được chuyển tới Ban Giám Đốc phê duyệt. Thuốc sẽ được cộng vào kho ngay khi Giám Đốc duyệt chi.`
        );
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi lập phiếu nhập kho');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Đề Xuất Nhập Bổ Sung Thuốc
              </h3>
              <p className="text-xs text-gray-500">
                Lập đề xuất nhập bổ sung; phê duyệt, kiểm nhận và chi trả được xử lý theo quy trình mua hàng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quy trình thông báo */}
        <div className="mx-6 mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Quy định phê duyệt tài chính kho dược:</span> Khi lập phiếu nhập kho, tổng chi phí mua thuốc sẽ được tính toán minh bạch. Ban Giám Đốc sẽ xem xét và bấm duyệt chi trong mục <strong>Phê duyệt yêu cầu</strong> để chính thức ghi nhận số lượng vào kho.
          </div>
        </div>

        {/* Khuyến nghị từ AI Dự Báo Nhu Cầu */}
        {defaultThuoc && (defaultThuoc.soLuongDeXuatNhap > 0 || defaultThuoc.tieuThuTrungBinhNgay) && (
          <div className="mx-6 mt-3 p-3 bg-purple-50/90 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-purple-800">Khuyến nghị từ AI Dự Báo Nhu Cầu:</span>
              <p className="mt-0.5 text-purple-700">
                Thuốc <strong className="font-bold text-gray-900">{defaultThuoc.tenThuoc}</strong> đang tiêu thụ trung bình <strong>~{defaultThuoc.tieuThuTrungBinhNgay} {defaultThuoc.donViTinh}/ngày</strong> (tồn khả dụng còn <strong>{defaultThuoc.tonKhoHienTai ?? defaultThuoc.tonKhoTong}</strong>, dự kiến hết trong <strong>~{defaultThuoc.soNgayConLai} ngày</strong>).
                {defaultThuoc.soLuongDeXuatNhap > 0 && (
                  <span> Đã tự động điền số lượng đề xuất nhập: <strong className="text-purple-900 font-extrabold">{defaultThuoc.soLuongDeXuatNhap} {defaultThuoc.donViTinh}</strong>.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Lựa chọn thuốc */}
          <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-primary-600" /> Chọn Thuốc Cần Nhập Kho
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsNewMedicine(false)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    !isNewMedicine ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border'
                  }`}
                >
                  Thuốc có sẵn ({medicineList.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewMedicine(true);
                    setValue('thuocId', '');
                    setValue('tenThuoc', '');
                    setValue('maThuoc', '');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    isNewMedicine ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-gray-600 border'
                  }`}
                >
                  + Nhập thuốc mới hoàn toàn
                </button>
              </div>
            </div>

            {!isNewMedicine ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên thuốc hoặc mã thuốc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <select
                  value={selectedThuocId}
                  onChange={(e) => setSelectedThuocId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">-- Chọn thuốc từ danh mục kho --</option>
                  {filteredMeds.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.maThuoc}] {m.tenThuoc} — Tồn hiện tại: {m.tonKhoTong} {m.donViTinh} (Giá bán:{' '}
                      {Number(m.giaBan || 0).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tên thuốc mới *</label>
                  <input
                    type="text"
                    {...register('tenThuoc', { required: 'Vui lòng nhập tên thuốc' })}
                    placeholder="VD: Augmentin 1g"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                  {errors.tenThuoc && <p className="text-xs text-rose-500 mt-0.5">{errors.tenThuoc.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mã thuốc (Tùy chọn)</label>
                  <input
                    type="text"
                    {...register('maThuoc')}
                    placeholder="Để trống hệ thống tự sinh mã"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Đơn vị tính & Số lượng & Đơn giá mua */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1 text-xs">Đơn vị tính *</label>
              <select
                {...register('donViTinh')}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Hộp">Hộp</option>
                <option value="Vỉ">Vỉ</option>
                <option value="Viên">Viên</option>
                <option value="Chai">Chai</option>
                <option value="Lọ">Lọ</option>
                <option value="Gói">Gói</option>
                <option value="Ống">Ống</option>
                <option value="Tuýp">Tuýp</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1 text-xs">Số lượng nhập *</label>
              <input
                type="number"
                min="1"
                {...register('soLuongNhap', { required: true, valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1 text-xs">Đơn giá mua / nhập (VNĐ) *</label>
              <input
                type="number"
                min="500"
                step="500"
                {...register('giaNhap', { required: true, valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ── BẢNG TÍNH TỔNG CHI PHÍ TIỀN MUA THUỐC (NỔI BẬT) ── */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Tổng Chi Phí Tiền Mua Thuốc (Đề Xuất Duyệt Chi)
                </p>
                <p className="text-[11px] text-amber-700">
                  {watchSoLuong} {watch('donViTinh') || 'đơn vị'} × {Number(watchGiaNhap).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-700 tracking-tight">
                {tongChiPhi.toLocaleString('vi-VN')} <span className="text-sm font-bold">VNĐ</span>
              </span>
              <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
                Cần Ban Giám Đốc ký duyệt trước khi xuất quỹ
              </p>
            </div>
          </div>

          {/* Thông tin Lô sản xuất & Hạn sử dụng */}
          <div className="rounded-xl bg-gray-50/70 p-3.5 border border-gray-200 space-y-3">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" /> Thông Tin Lô & Hạn Sử Dụng (Quản lý FEFO)
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mã Lô sản xuất *</label>
                <input
                  type="text"
                  {...register('maLo', { required: true })}
                  placeholder="VD: LO2026A"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày sản xuất</label>
                <input
                  type="date"
                  {...register('ngaySanXuat')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">Hạn dùng (Exp Date) *</label>
                <input
                  type="date"
                  {...register('ngayHetHan', { required: true })}
                  className="w-full rounded-lg border border-rose-300 bg-white p-2 text-xs font-bold text-rose-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nhà cung cấp / Công ty Dược *</label>
                <input
                  type="text"
                  {...register('nhaCungCap', { required: true })}
                  placeholder="VD: Dược Hậu Giang, Traphaco, Sanofi..."
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú / Mục đích nhập</label>
                <input
                  type="text"
                  {...register('ghiChu')}
                  placeholder="VD: Bổ sung thuốc kháng sinh đang thiếu"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || tongChiPhi <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Gửi Ban Giám Đốc Duyệt Nhập Kho</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
