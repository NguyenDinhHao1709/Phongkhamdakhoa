import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiDel } from '../../services/api';
import { Users, Lock, Unlock, Eye, Edit, Trash2, KeyRound, Search } from 'lucide-react';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { AddNhanVienModal } from './AddNhanVienModal';
import { EditNhanVienModal } from './EditNhanVienModal';
import { ResetPasswordModal } from './ResetPasswordModal';

export default function NhanVienPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [resettingPwId, setResettingPwId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: qData, isLoading } = useQuery({
    queryKey: ['nhan-vien-list'],
    queryFn: async () => {
      const res = await apiGet('/quan-ly/nhan-vien');
      return res.data;
    },
  });

  const filteredData = useMemo(() => {
    if (!qData) return [];
    if (!searchTerm) return qData;
    const term = searchTerm.toLowerCase();
    return qData.filter(nv => 
      nv.hoTen?.toLowerCase().includes(term) ||
      nv.soDienThoai?.toLowerCase().includes(term) ||
      nv.nguoiDung?.tenDangNhap?.toLowerCase().includes(term)
    );
  }, [qData, searchTerm]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      await apiPatch(`/quan-ly/nhan-vien/${id}/trang-thai`, { trangThai: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
    }
  });

  const addNhanVienMutation = useMutation({
    mutationFn: (data) => apiPost('/quan-ly/nhan-vien', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
      setIsAddModalOpen(false);
      alert('Thêm nhân viên thành công!');
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi thêm nhân viên');
    }
  });

  const editNhanVienMutation = useMutation({
    mutationFn: ({ id, data }) => apiPatch(`/quan-ly/nhan-vien/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
      setEditingId(null);
      alert('Cập nhật nhân viên thành công!');
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi cập nhật nhân viên');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ nguoiDungId, matKhauMoi }) => apiPatch(`/quan-ly/nhan-vien/${nguoiDungId}/mat-khau`, { matKhauMoi }),
    onSuccess: () => {
      alert('Đổi mật khẩu thành công!');
      setResettingPwId(null);
    },
    onError: (err) => {
      alert(err?.error?.message || err?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDel(`/quan-ly/nhan-vien/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nhan-vien-list'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa nhân viên');
    }
  });

  const handleDelete = (id, ten) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự "${ten}" không?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-8">Đang tải danh sách nhân viên...</div>;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-600" />
            Quản Lý Nhân Sự
          </h1>
          <p className="text-gray-500 mt-1">Danh sách nhân viên và tài khoản đăng nhập</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, sđt, tài khoản..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <MedButton onClick={() => setIsAddModalOpen(true)}>
            + Thêm nhân sự
          </MedButton>
        </div>
      </div>

      <MedCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Họ tên & Chức vụ</th>
                <th className="px-6 py-4 font-semibold">Tài khoản</th>
                <th className="px-6 py-4 font-semibold">Vai trò (RBAC)</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData?.map((nv) => (
                <tr key={nv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {nv.anhDaiDien ? (
                        <img src={nv.anhDaiDien.startsWith('http') ? nv.anhDaiDien : `http://localhost:5000${nv.anhDaiDien}`} alt="" className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                          {nv.hoTen?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{nv.hoTen}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{nv.chucVu} - {nv.soDienThoai}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{nv.nguoiDung?.tenDangNhap}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex w-max items-center rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10">
                      {nv.nguoiDung?.vaiTro || 'Chưa có'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={nv.nguoiDung?.trangThai} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingId(nv.id)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Sửa thông tin"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setResettingPwId(nv.nguoiDung?.id)}
                        className="p-1.5 text-gray-500 hover:text-warning-600 hover:bg-warning-50 rounded"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(nv.id, nv.hoTen)}
                        className="p-1.5 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded"
                        title="Xóa nhân sự"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {nv.nguoiDung && (
                        <button
                          onClick={() => toggleStatusMutation.mutate({ 
                            id: nv.nguoiDung.id, 
                            newStatus: nv.nguoiDung.trangThai === 'hoat_dong' ? 'khoa' : 'hoat_dong' 
                          })}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            nv.nguoiDung.trangThai === 'hoat_dong' 
                              ? 'text-danger-600 border-danger-200 hover:bg-danger-50' 
                              : 'text-success-600 border-success-200 hover:bg-success-50'
                          }`}
                        >
                          {nv.nguoiDung.trangThai === 'hoat_dong' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          {nv.nguoiDung.trangThai === 'hoat_dong' ? 'Khóa' : 'Mở'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!qData || qData.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Không có nhân viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </MedCard>

      <AddNhanVienModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={(data) => addNhanVienMutation.mutate(data)} 
      />

      <EditNhanVienModal 
        isOpen={!!editingId}
        nhanVienId={editingId}
        onClose={() => setEditingId(null)}
        onSubmit={(payload) => editNhanVienMutation.mutate(payload)}
      />

      <ResetPasswordModal
        isOpen={!!resettingPwId}
        nguoiDungId={resettingPwId}
        onClose={() => setResettingPwId(null)}
        onSubmit={(payload) => resetPasswordMutation.mutate(payload)}
      />
    </div>
  );
}
