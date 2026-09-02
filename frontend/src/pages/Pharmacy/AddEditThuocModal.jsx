import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Pill } from 'lucide-react';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { apiPost, apiPatch } from '../../services/api';

export default function AddEditThuocModal({ thuoc, onClose, onSuccess }) {
  const isEdit = Boolean(thuoc);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      maThuoc: '',
      tenThuoc: '',
      tenHoatChat: '',
      donViTinh: 'Viên',
      hamLuong: '',
      duongDung: 'Uống',
      giaBan: 0,
      tonKhoTong: 0,
      moTa: '',
    },
  });

  useEffect(() => {
    if (thuoc) {
      reset({
        maThuoc: thuoc.maThuoc || '',
        tenThuoc: thuoc.tenThuoc || '',
        tenHoatChat: thuoc.tenHoatChat || '',
        donViTinh: thuoc.donViTinh || 'Viên',
        hamLuong: thuoc.hamLuong || '',
        duongDung: thuoc.duongDung || 'Uống',
        giaBan: thuoc.giaBan || 0,
        tonKhoTong: thuoc.tonKhoTong || 0,
        moTa: thuoc.moTa || '',
      });
    } else {
      reset({
        maThuoc: '',
        tenThuoc: '',
        tenHoatChat: '',
        donViTinh: 'Viên',
        hamLuong: '',
        duongDung: 'Uống',
        giaBan: 0,
        tonKhoTong: 0,
        moTa: '',
      });
    }
  }, [thuoc, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await apiPatch(`/nha-thuoc/thuoc/${thuoc.id}`, data);
        alert('Cập nhật thông tin thuốc thành công!');
      } else {
        await apiPost('/nha-thuoc/thuoc', data);
        alert('Thêm thuốc mới thành công!');
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Pill className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Chỉnh sửa thông tin thuốc' : 'Thêm thuốc mới vào kho'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Mã thuốc (Tùy chọn)</label>
              <input
                type="text"
                {...register('maThuoc')}
                placeholder="VD: TH005 (Tự sinh nếu bỏ trống)"
                className="w-full rounded-lg border border-gray-300 p-2.5"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Đơn vị tính *</label>
              <select {...register('donViTinh')} className="w-full rounded-lg border border-gray-300 p-2.5">
                <option value="Viên">Viên</option>
                <option value="Chai">Chai</option>
                <option value="Lọ">Lọ</option>
                <option value="Vỉ">Vỉ</option>
                <option value="Hộp">Hộp</option>
                <option value="Tuýp">Tuýp</option>
                <option value="Gói">Gói</option>
                <option value="Ống">Ống</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Tên thuốc *</label>
            <input
              type="text"
              {...register('tenThuoc', { required: 'Tên thuốc không được để trống' })}
              placeholder="VD: Paracetamol 500mg"
              className={`w-full rounded-lg border p-2.5 ${errors.tenThuoc ? 'border-danger-main' : 'border-gray-300'}`}
            />
            {errors.tenThuoc && <p className="mt-1 text-xs text-danger-main">{errors.tenThuoc.message}</p>}
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Tên hoạt chất</label>
            <input
              type="text"
              {...register('tenHoatChat')}
              placeholder="VD: Paracetamol"
              className="w-full rounded-lg border border-gray-300 p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Hàm lượng</label>
              <input
                type="text"
                {...register('hamLuong')}
                placeholder="VD: 500mg, 100mg/5ml..."
                className="w-full rounded-lg border border-gray-300 p-2.5"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Đường dùng</label>
              <select {...register('duongDung')} className="w-full rounded-lg border border-gray-300 p-2.5">
                <option value="Uống">Uống</option>
                <option value="Tiêm tĩnh mạch">Tiêm tĩnh mạch</option>
                <option value="Tiêm bắp">Tiêm bắp</option>
                <option value="Bôi ngoài da">Bôi ngoài da</option>
                <option value="Nhỏ mắt/mũi">Nhỏ mắt/mũi</option>
                <option value="Đặt hậu môn">Đặt hậu môn</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Đơn giá bán (VNĐ) *</label>
              <input
                type="number"
                min="0"
                step="500"
                {...register('giaBan', { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 p-2.5 font-semibold text-gray-900"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Số lượng tồn kho ban đầu</label>
              <input
                type="number"
                min="0"
                {...register('tonKhoTong', { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-300 p-2.5 font-semibold text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Mô tả / Ghi chú</label>
            <textarea
              rows={2}
              {...register('moTa')}
              placeholder="Chỉ định, chống chỉ định, lưu ý bảo quản..."
              className="w-full rounded-lg border border-gray-300 p-2.5"
            ></textarea>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-4 mt-4">
            <MedButton variant="secondary" onClick={onClose} type="button">
              Hủy bỏ
            </MedButton>
            <MedButton variant="primary" loading={isSubmitting} type="submit">
              {isEdit ? 'Lưu thay đổi' : 'Thêm vào kho'}
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

