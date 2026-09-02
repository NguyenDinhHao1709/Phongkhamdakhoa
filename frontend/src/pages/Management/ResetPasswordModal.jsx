import { useForm } from 'react-hook-form';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { X } from 'lucide-react';

export function ResetPasswordModal({ isOpen, onClose, onSubmit, nguoiDungId }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  
  if (!isOpen) return null;

  const submitForm = (data) => {
    onSubmit({ nguoiDungId, matKhauMoi: data.matKhauMoi });
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Đặt lại mật khẩu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form id="reset-password-form" onSubmit={handleSubmit(submitForm)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới *</label>
              <input 
                type="password" 
                {...register('matKhauMoi', { required: 'Vui lòng nhập mật khẩu', minLength: { value: 6, message: 'Ít nhất 6 ký tự' } })} 
                className="w-full rounded-md border-gray-300 p-2 border" 
              />
              {errors.matKhauMoi && <span className="text-red-500 text-xs">{errors.matKhauMoi.message}</span>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu *</label>
              <input 
                type="password" 
                {...register('confirmPassword', { 
                  required: 'Vui lòng xác nhận mật khẩu',
                  validate: (val) => {
                    if (watch('matKhauMoi') != val) {
                      return "Mật khẩu không khớp";
                    }
                  }
                })} 
                className="w-full rounded-md border-gray-300 p-2 border" 
              />
              {errors.confirmPassword && <span className="text-red-500 text-xs">{errors.confirmPassword.message}</span>}
            </div>
          </form>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <MedButton variant="outline" onClick={onClose}>Hủy</MedButton>
          <MedButton form="reset-password-form" type="submit">Lưu mật khẩu</MedButton>
        </div>
      </div>
    </div>
  );
}

