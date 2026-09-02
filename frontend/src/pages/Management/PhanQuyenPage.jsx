import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../services/api';
import { Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';

export default function PhanQuyenPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [activePermissions, setActivePermissions] = useState(new Set());

  // Fetch Matrix
  const { data: qData, isLoading } = useQuery({
    queryKey: ['phan-quyen'],
    queryFn: async () => {
      const res = await apiGet('/quan-ly/phan-quyen');
      return res.data;
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ vaiTroId, quyenHanIds }) => {
      await apiPatch(`/quan-ly/phan-quyen/${vaiTroId}`, { quyenHanIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phan-quyen'] });
      alert('Cập nhật phân quyền thành công!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Có lỗi xảy ra');
    }
  });

  const handleSelectRole = (vaiTro) => {
    setSelectedRole(vaiTro);
    // Find permissions for this role from matrix
    const matrixItem = qData?.matrix.find(m => m.vaiTro.id === vaiTro.id);
    if (matrixItem) {
      setActivePermissions(new Set(matrixItem.quyenHanIds));
    } else {
      setActivePermissions(new Set());
    }
  };

  const handleTogglePermission = (quyenHanId) => {
    if (selectedRole?.laHeThong) return; // Không cho sửa role hệ thống
    const next = new Set(activePermissions);
    if (next.has(quyenHanId)) {
      next.delete(quyenHanId);
    } else {
      next.add(quyenHanId);
    }
    setActivePermissions(next);
  };

  const handleSave = () => {
    if (!selectedRole) return;
    updateMutation.mutate({
      vaiTroId: selectedRole.id,
      quyenHanIds: Array.from(activePermissions),
    });
  };

  if (isLoading) return <div className="p-8">Đang tải cấu hình phân quyền...</div>;

  return (
    <div className="p-6 md:p-8 flex h-[calc(100vh-2rem)] flex-col">
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-600" />
            Ma Trận Phân Quyền
          </h1>
          <p className="text-gray-500 mt-1">Quản lý quyền hạn cho từng vai trò trong hệ thống</p>
        </div>
        {selectedRole && !selectedRole.laHeThong && (
          <MedButton onClick={handleSave} loading={updateMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" /> Lưu cấu hình
          </MedButton>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Cột trái: Vai trò */}
        <MedCard className="w-1/3 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-semibold">Vai trò hệ thống</div>
          <div className="p-2 overflow-y-auto flex-1">
            {qData?.vaiTros.map(vt => (
              <button
                key={vt.id}
                onClick={() => handleSelectRole(vt)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all flex flex-col ${
                  selectedRole?.id === vt.id 
                    ? 'bg-primary-50 border border-primary-200 text-primary-900 shadow-sm' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="font-semibold">{vt.tenVaiTro}</div>
                <div className="text-xs text-gray-500 mt-1">{vt.maVaiTro}</div>
                {vt.laHeThong && (
                  <span className="mt-2 inline-flex w-max items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    Hệ thống
                  </span>
                )}
              </button>
            ))}
          </div>
        </MedCard>

        {/* Cột phải: Quyền hạn */}
        <MedCard className="w-2/3 flex flex-col min-h-0 overflow-hidden">
          {selectedRole ? (
            <>
              <div className="p-4 border-b bg-gray-50 font-semibold flex items-center justify-between">
                <span>Quyền hạn của: <span className="text-primary-700">{selectedRole.tenVaiTro}</span></span>
                {selectedRole.laHeThong && (
                  <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Vai trò mặc định của hệ thống. Không thể tùy chỉnh.
                  </span>
                )}
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {Object.entries(qData?.quyenHans || {}).map(([nhom, quyenList]) => (
                  <div key={nhom} className="mb-8 last:mb-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">{nhom}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {quyenList.map(qh => {
                        const isChecked = activePermissions.has(qh.id);
                        return (
                          <label
                            key={qh.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-primary-50/50 border-primary-200' 
                                : 'hover:bg-gray-50 border-gray-200'
                            } ${selectedRole.laHeThong ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300 disabled:opacity-50"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(qh.id)}
                                disabled={selectedRole.laHeThong}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isChecked ? 'text-primary-900' : 'text-gray-700'}`}>
                                {qh.tenQuyen}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5 font-mono">{qh.maQuyen}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <p>Chọn một vai trò bên trái để xem và sửa cấu hình</p>
            </div>
          )}
        </MedCard>
      </div>
    </div>
  );
}
