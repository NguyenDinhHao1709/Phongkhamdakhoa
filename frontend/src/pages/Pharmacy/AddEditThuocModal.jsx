import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Pill } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { apiPost, apiPatch } from '../../services/api';

export default function AddEditThuocModal({ thuoc, onClose, onSuccess }) {
  const isEdit = Boolean(thuoc);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      maThuoc: '', tenThuoc: '', tenHoatChat: '', donViTinh: 'Viên',
      hamLuong: '', duongDung: 'Uống', giaBan: 0, moTa: '',
    },
  });

  useEffect(() => {
    reset(thuoc ? {
      maThuoc: thuoc.maThuoc || '',
      tenThuoc: thuoc.tenThuoc || '',
      tenHoatChat: thuoc.tenHoatChat || '',
      donViTinh: thuoc.donViTinh || 'Viên',
      hamLuong: thuoc.hamLuong || '',
      duongDung: thuoc.duongDung || 'Uống',
      giaBan: thuoc.giaBan || 0,
      moTa: thuoc.moTa || '',
    } : {
      maThuoc: '', tenThuoc: '', tenHoatChat: '', donViTinh: 'Viên',
      hamLuong: '', duongDung: 'Uống', giaBan: 0, moTa: '',
    });
  }, [thuoc, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await apiPatch(`/nha-thuoc/thuoc/${thuoc.id}`, data);
        alert('Cập nhật thông tin danh mục thuốc thành công!');
      } else {
        await apiPost('/nha-thuoc/thuoc', data);
        alert('Đã thêm thuốc vào danh mục kho. Tồn kho hiện tại là 0; hãy lập yêu cầu mua để nhập lô hàng.');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600"><Pill className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{isEdit ? 'Chỉnh sửa danh mục thuốc' : 'Thêm thuốc vào danh mục kho'}</h3>
              <p className="text-xs text-gray-500">Chỉ khai báo thông tin thuốc; lô, nhà sản xuất và hạn dùng nhập khi nhận hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-sm">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            Đây là danh mục thuốc, không phải phiếu nhập kho. Tồn kho luôn bắt đầu bằng 0. Nhà cung cấp, giá nhập, số lô, ngày sản xuất và hạn dùng sẽ ghi nhận tại yêu cầu mua và bước kiểm nhận.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="font-medium text-gray-700">Mã thuốc (tùy chọn)
              <input {...register('maThuoc')} placeholder="VD: TH005" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
            </label>
            <label className="font-medium text-gray-700">Đơn vị tính *
              <select {...register('donViTinh')} className="mt-1 w-full rounded-lg border border-gray-300 p-2.5">
                {['Viên', 'Chai', 'Lọ', 'Vỉ', 'Hộp', 'Tuýp', 'Gói', 'Ống'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="block font-medium text-gray-700">Tên thuốc *
            <input {...register('tenThuoc', { required: 'Tên thuốc không được để trống' })} placeholder="VD: Paracetamol 500mg" className={`mt-1 w-full rounded-lg border p-2.5 ${errors.tenThuoc ? 'border-danger-main' : 'border-gray-300'}`} />
            {errors.tenThuoc && <p className="mt-1 text-xs text-danger-main">{errors.tenThuoc.message}</p>}
          </label>
          <label className="block font-medium text-gray-700">Tên hoạt chất
            <input {...register('tenHoatChat')} placeholder="VD: Paracetamol" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="font-medium text-gray-700">Hàm lượng
              <input {...register('hamLuong')} placeholder="VD: 500mg" className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
            </label>
            <label className="font-medium text-gray-700">Đường dùng
              <select {...register('duongDung')} className="mt-1 w-full rounded-lg border border-gray-300 p-2.5">
                {['Uống', 'Tiêm tĩnh mạch', 'Tiêm bắp', 'Bôi ngoài da', 'Nhỏ mắt/mũi', 'Đặt hậu môn', 'Khác'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="block font-medium text-gray-700">Đơn giá bán (VNĐ) *
            <input type="number" min="0" step="500" {...register('giaBan', { valueAsNumber: true })} className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 font-semibold" />
          </label>
          <label className="block font-medium text-gray-700">Mô tả / Ghi chú
            <textarea rows={2} {...register('moTa')} placeholder="Chỉ định, chống chỉ định, lưu ý bảo quản..." className="mt-1 w-full rounded-lg border border-gray-300 p-2.5" />
          </label>
          <div className="flex justify-end gap-3 border-t pt-4">
            <MedButton variant="secondary" onClick={onClose} type="button">Hủy bỏ</MedButton>
            <MedButton variant="primary" loading={isSubmitting} type="submit">{isEdit ? 'Lưu thay đổi' : 'Thêm vào danh mục thuốc'}</MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}
