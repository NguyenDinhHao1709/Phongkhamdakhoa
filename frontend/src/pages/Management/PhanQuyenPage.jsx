import { useState, useMemo, useEffect, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import {
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Layers,
  Lock,
  LayoutGrid,
  ListFilter,
  RotateCcw,
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  BarChart3,
  Check,
  CheckCheck,
  Building2,
  Sparkles,
  Plus,
  Edit3,
  X,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { MedCard } from '../../design-system/components/Card/MedCard';
import { MedButton } from '../../design-system/components/Button/MedButton';

// Role visual metadata
const ROLE_METAS = {
  tiep_tan: { label: 'Tiếp đón & CSKH', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bac_si: { label: 'Lâm sàng & Khám bệnh', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ky_thuat_vien: { label: 'Cận lâm sàng & Xét nghiệm', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  nhan_vien_nha_thuoc: { label: 'Dược & Kho thuốc', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  nha_thuoc: { label: 'Dược & Kho thuốc', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  thu_ngan: { label: 'Tài chính & Thu ngân', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ban_giam_doc: { label: 'Ban Lãnh Đạo', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  quan_tri_vien: { label: 'Quản trị hệ thống', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  quan_tri_vien_cap_cao: { label: 'Super Admin Root', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// Module visual icons
const NHOM_ICONS = {
  'Lâm Sàng & Khám Bệnh': Stethoscope,
  'Cận Lâm Sàng & Xét Nghiệm': FlaskConical,
  'Dược & Nhà Thuốc': Pill,
  'Tài Chính & Thu Ngân': Receipt,
  'Tin Tức & Truyền Thông Y Khoa': BookOpen,
  'Hành Chính, Nhân Sự & Chấm Công': Users,
  'Báo Cáo, Thống Kê & Dự Báo': BarChart3,
  'Quản Trị Hệ Thống & Bảo Mật': Shield,
  'Lịch Làm Việc & Phân Ca': Calendar,
};

export default function PhanQuyenPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('detail'); // 'detail' | 'matrix'
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [activePermissions, setActivePermissions] = useState(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Modals state
  const [editRoleModal, setEditRoleModal] = useState({ isOpen: false, role: null });
  const [editRoleForm, setEditRoleForm] = useState({ tenVaiTro: '', moTa: '' });

  const [addPermModal, setAddPermModal] = useState({ isOpen: false });
  const [addPermForm, setAddPermForm] = useState({
    maQuyen: '',
    tenQuyen: '',
    nhomChucNang: 'Lâm Sàng & Khám Bệnh',
    moTa: '',
  });

  // Fetch RBAC Matrix
  const { data: qData, isLoading } = useQuery({
    queryKey: ['phan-quyen'],
    queryFn: async () => {
      const res = await apiGet('/quan-ly/phan-quyen');
      return res.data;
    },
  });

  // Map roleId -> Set of permission IDs from backend
  const rolePermMap = useMemo(() => {
    const map = new Map();
    if (qData?.matrix) {
      qData.matrix.forEach(m => {
        map.set(m.vaiTro.id, new Set(m.quyenHanIds || []));
      });
    }
    return map;
  }, [qData]);

  // Set default selected role
  useEffect(() => {
    if (qData?.vaiTros && qData.vaiTros.length > 0 && !selectedRoleId) {
      // Prefer first editable role or first role
      const firstRole = qData.vaiTros.find(r => !r.laHeThong) || qData.vaiTros[0];
      setSelectedRoleId(firstRole.id);
    }
  }, [qData, selectedRoleId]);

  // Sync activePermissions when selected role changes or data reloads
  useEffect(() => {
    if (selectedRoleId && rolePermMap.has(selectedRoleId)) {
      setActivePermissions(new Set(rolePermMap.get(selectedRoleId)));
    }
  }, [selectedRoleId, rolePermMap]);

  const selectedRole = useMemo(() => {
    return qData?.vaiTros?.find(r => r.id === selectedRoleId) || null;
  }, [qData, selectedRoleId]);

  // Check if current draft has unsaved changes
  const isDirty = useMemo(() => {
    if (!selectedRoleId || !rolePermMap.has(selectedRoleId)) return false;
    const original = rolePermMap.get(selectedRoleId);
    if (original.size !== activePermissions.size) return true;
    for (const id of activePermissions) {
      if (!original.has(id)) return true;
    }
    return false;
  }, [activePermissions, selectedRoleId, rolePermMap]);

  // Update Permissions Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ vaiTroId, quyenHanIds }) => {
      await apiPatch(`/quan-ly/phan-quyen/${vaiTroId}`, { quyenHanIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phan-quyen'] });
      setSuccessToast('Đã lưu cấu hình phân quyền thành công! Thay đổi có hiệu lực tức thì.');
      setTimeout(() => setSuccessToast(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || err.message || 'Có lỗi xảy ra khi lưu phân quyền');
    }
  });

  // Reset to Default Presets Mutation
  const resetDefaultMutation = useMutation({
    mutationFn: async (vaiTroId) => {
      return await apiPost(`/quan-ly/phan-quyen/${vaiTroId}/mac-dinh`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['phan-quyen'] });
      setSuccessToast(res?.message || 'Đã khôi phục bộ quyền chuẩn mặc định thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || err.message || 'Không thể khôi phục quyền mặc định');
    }
  });

  // Edit Role Info Mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ vaiTroId, data }) => {
      return await apiPatch(`/quan-ly/vai-tro/${vaiTroId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phan-quyen'] });
      setEditRoleModal({ isOpen: false, role: null });
      setSuccessToast('Cập nhật thông tin vai trò thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || err.message || 'Không thể cập nhật vai trò');
    }
  });

  // Add Dynamic Permission Mutation
  const addPermMutation = useMutation({
    mutationFn: async (data) => {
      return await apiPost('/quan-ly/quyen-han', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phan-quyen'] });
      setAddPermModal({ isOpen: false });
      setAddPermForm({
        maQuyen: '',
        tenQuyen: '',
        nhomChucNang: 'Lâm Sàng & Khám Bệnh',
        moTa: '',
      });
      setSuccessToast('Thêm quyền hạn mới vào hệ thống thành công!');
      setTimeout(() => setSuccessToast(''), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || err.message || 'Không thể thêm quyền hạn');
    }
  });

  const handleSelectRole = (role) => {
    setSelectedRoleId(role.id);
  };

  const handleTogglePermission = (quyenHanId) => {
    if (selectedRole?.laHeThong) return;
    const next = new Set(activePermissions);
    if (next.has(quyenHanId)) {
      next.delete(quyenHanId);
    } else {
      next.add(quyenHanId);
    }
    setActivePermissions(next);
  };

  const handleToggleModule = (modulePerms, shouldSelect) => {
    if (selectedRole?.laHeThong) return;
    const next = new Set(activePermissions);
    modulePerms.forEach(p => {
      if (shouldSelect) {
        next.add(p.id);
      } else {
        next.delete(p.id);
      }
    });
    setActivePermissions(next);
  };

  const handleSelectAll = () => {
    if (selectedRole?.laHeThong || !qData?.allQuyenHans) return;
    setActivePermissions(new Set(qData.allQuyenHans.map(q => q.id)));
  };

  const handleDeselectAll = () => {
    if (selectedRole?.laHeThong) return;
    setActivePermissions(new Set());
  };

  const handleReset = () => {
    if (selectedRoleId && rolePermMap.has(selectedRoleId)) {
      setActivePermissions(new Set(rolePermMap.get(selectedRoleId)));
    }
  };

  const handleSave = () => {
    if (!selectedRole || selectedRole.laHeThong) return;
    updateMutation.mutate({
      vaiTroId: selectedRole.id,
      quyenHanIds: Array.from(activePermissions),
    });
  };

  const handleResetToDefaultPreset = () => {
    if (!selectedRole || selectedRole.laHeThong) return;
    const confirmed = window.confirm(
      `Khôi phục quyền mặc định cho vai trò "${selectedRole.tenVaiTro}"?\n\nThao tác này sẽ đặt lại quyền hạn theo bộ preset tiêu chuẩn khuyến nghị của hệ thống phòng khám.`
    );
    if (confirmed) {
      resetDefaultMutation.mutate(selectedRole.id);
    }
  };

  const handleOpenEditRole = (role) => {
    setEditRoleModal({ isOpen: true, role });
    setEditRoleForm({
      tenVaiTro: role.tenVaiTro || '',
      moTa: role.moTa || '',
    });
  };

  const handleSaveEditRole = (e) => {
    e.preventDefault();
    if (!editRoleModal.role) return;
    editRoleMutation.mutate({
      vaiTroId: editRoleModal.role.id,
      data: editRoleForm,
    });
  };

  const handleSaveAddPerm = (e) => {
    e.preventDefault();
    if (!addPermForm.maQuyen.trim() || !addPermForm.tenQuyen.trim()) {
      alert('Vui lòng nhập đầy đủ Mã quyền và Tên quyền hạn');
      return;
    }
    addPermMutation.mutate(addPermForm);
  };

  // Matrix cell toggle
  const handleMatrixCellToggle = (role, qhId) => {
    if (role.laHeThong) return;
    const current = rolePermMap.get(role.id) || new Set();
    const next = new Set(current);
    if (next.has(qhId)) {
      next.delete(qhId);
    } else {
      next.add(qhId);
    }
    updateMutation.mutate({
      vaiTroId: role.id,
      quyenHanIds: Array.from(next),
    });
  };

  // Filtered roles
  const filteredRoles = useMemo(() => {
    if (!qData?.vaiTros) return [];
    if (!roleSearch.trim()) return qData.vaiTros;
    const term = roleSearch.toLowerCase();
    return qData.vaiTros.filter(r =>
      r.tenVaiTro.toLowerCase().includes(term) ||
      r.maVaiTro.toLowerCase().includes(term)
    );
  }, [qData, roleSearch]);

  // Filtered permissions grouped by module
  const filteredGroupedQuyen = useMemo(() => {
    if (!qData?.quyenHans) return {};
    if (!permSearch.trim()) return qData.quyenHans;
    const term = permSearch.toLowerCase();
    const result = {};
    Object.entries(qData.quyenHans).forEach(([nhom, list]) => {
      const matched = list.filter(q =>
        q.tenQuyen.toLowerCase().includes(term) ||
        q.maQuyen.toLowerCase().includes(term)
      );
      if (matched.length > 0) {
        result[nhom] = matched;
      }
    });
    return result;
  }, [qData, permSearch]);

  const totalPermCount = qData?.allQuyenHans?.length || 1;
  const activePermCount = activePermissions.size;
  const activePercent = Math.round((activePermCount / totalPermCount) * 100);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Đang tải ma trận phân quyền hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 flex flex-col h-[calc(100vh-1rem)] max-w-[1700px] mx-auto overflow-hidden">
      {/* ─── HEADER BAR ────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Phân Quyền & Vai Trò</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                  Chuẩn ERP Nâng Cao
                </span>
                <span className="text-xs font-medium text-gray-500">
                  ({totalPermCount} quyền hạn • {qData?.vaiTros?.length || 0} vai trò)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Thiết lập quyền truy cập chức năng chi tiết cho từng vị trí nhân sự. Quyền hạn có hiệu lực tức thì trên menu và API.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('detail')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'detail'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Chi tiết Vai trò
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Ma trận toàn cảnh
            </button>
          </div>

          <button
            onClick={() => setAddPermModal({ isOpen: true })}
            className="px-3 py-1.5 rounded-xl border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Thêm quyền hạn mới vào hệ thống"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm quyền hạn
          </button>

          {viewMode === 'detail' && selectedRole && !Boolean(selectedRole.laHeThong) && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-all"
                  title="Hủy các thay đổi chưa lưu"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                </button>
              )}
              <MedButton
                onClick={handleSave}
                loading={updateMutation.isPending}
                disabled={!isDirty}
                className="gap-2 text-xs py-2 px-4 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isDirty ? 'Lưu thay đổi' : 'Đã đồng bộ'}
              </MedButton>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      {viewMode === 'detail' ? (
        <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 overflow-hidden">
          {/* CỘT TRÁI: DANH SÁCH VAI TRÒ */}
          <MedCard className="w-full lg:w-80 xl:w-96 flex flex-col min-h-0 overflow-hidden border-gray-200 shadow-xs bg-white rounded-2xl flex-shrink-0">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-500" />
                  Danh mục Vai trò ({qData?.vaiTros?.length || 0})
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm vai trò..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="p-2.5 overflow-y-auto flex-1 space-y-1.5 divide-y-0 divide-gray-100">
              {filteredRoles.map((vt) => {
                const isSelected = selectedRoleId === vt.id;
                const meta = ROLE_METAS[vt.maVaiTro] || { label: 'Chức năng', color: 'bg-gray-100 text-gray-700 border-gray-200' };
                const permSet = rolePermMap.get(vt.id) || new Set();
                const permPercent = Math.round((permSet.size / totalPermCount) * 100);
                const isSystem = Boolean(vt.laHeThong);

                return (
                  <button
                    key={vt.id}
                    onClick={() => handleSelectRole(vt)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1.5 relative ${
                      isSelected
                        ? 'bg-primary-50/70 border-primary-300 shadow-xs ring-1 ring-primary-200'
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-gray-900 leading-tight">
                        {vt.tenVaiTro}
                      </div>
                      {isSystem ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0">
                          <Lock className="w-2.5 h-2.5" /> Hệ thống
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${meta.color}`}>
                          {meta.label}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 line-clamp-1">{vt.moTa || vt.maVaiTro}</div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100/60 mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-gray-600">
                        <Users className="w-3 h-3 text-gray-400" />
                        {vt.soNhanSu || 0} nhân sự
                      </span>
                      <span className="font-mono text-xs text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded font-medium">
                        {permSet.size}/{totalPermCount} quyền ({permPercent}%)
                      </span>
                    </div>

                    {/* Progress line */}
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden mt-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSystem ? 'bg-rose-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${permPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </MedCard>

          {/* CỘT PHẢI: CHI TIẾT QUYỀN HẠN CỦA VAI TRÒ */}
          <MedCard className="flex-1 flex flex-col min-h-0 overflow-hidden border-gray-200 shadow-xs bg-white rounded-2xl">
            {selectedRole ? (
              <>
                {/* Header quyền hạn vai trò */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-primary-700 shadow-xs">
                      {selectedRole.tenVaiTro.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-gray-900">{selectedRole.tenVaiTro}</h2>
                        
                        {!Boolean(selectedRole.laHeThong) && (
                          <button
                            onClick={() => handleOpenEditRole(selectedRole)}
                            className="p-1 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Chỉnh sửa tên và mô tả vai trò"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          {selectedRole.maVaiTro}
                        </span>
                        {Boolean(selectedRole.laHeThong) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock className="w-3 h-3" /> Vai trò gốc (Không thể sửa)
                          </span>
                        ) : isDirty ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Có thay đổi chưa lưu
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedRole.moTa}</p>
                    </div>
                  </div>

                  {/* Preset Reset & Coverage Indicator */}
                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {!Boolean(selectedRole.laHeThong) && (
                      <button
                        onClick={handleResetToDefaultPreset}
                        disabled={resetDefaultMutation.isPending}
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                        title="Đặt lại quyền hạn theo bộ chuẩn khuyến nghị của hệ thống phòng khám"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        {resetDefaultMutation.isPending ? 'Đang khôi phục...' : 'Khôi phục quyền mặc định'}
                      </button>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-500">Phạm vi quyền hạn</div>
                        <div className="text-sm font-bold text-gray-900">
                          {activePermCount} / {totalPermCount} quyền ({activePercent}%)
                        </div>
                      </div>
                      <div className="w-12 h-12 relative flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-gray-200"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-primary-600"
                            strokeDasharray={`${activePercent}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[11px] font-bold text-gray-700">{activePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar filter & bulk actions */}
                <div className="px-4 py-2.5 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Lọc quyền hạn theo tên hoặc mã..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  {!Boolean(selectedRole.laHeThong) && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={handleSelectAll}
                        className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-all flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Cấp tất cả
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 rounded-lg transition-all"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  )}
                </div>

                {/* Danh sách module quyền hạn */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                  {Object.keys(filteredGroupedQuyen).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                      <Search className="w-10 h-10 mb-2 opacity-30" />
                      <p className="text-sm font-medium">Không tìm thấy quyền hạn nào khớp với từ khóa</p>
                    </div>
                  ) : (
                    Object.entries(filteredGroupedQuyen).map(([nhom, quyenList]) => {
                      const allInModuleChecked = quyenList.every(q => activePermissions.has(q.id));
                      const someInModuleChecked = quyenList.some(q => activePermissions.has(q.id));
                      const checkedCount = quyenList.filter(q => activePermissions.has(q.id)).length;
                      const NhomIcon = NHOM_ICONS[nhom] || Layers;

                      return (
                        <div key={nhom} className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
                          {/* Module Header */}
                          <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <NhomIcon className="w-4 h-4 text-primary-600" />
                              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{nhom}</h3>
                              <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                {checkedCount}/{quyenList.length}
                              </span>
                            </div>

                            {!Boolean(selectedRole.laHeThong) && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModule(quyenList, true)}
                                  disabled={allInModuleChecked}
                                  className="text-[11px] font-medium text-primary-600 hover:text-primary-800 disabled:opacity-30 disabled:pointer-events-none px-2 py-0.5 rounded hover:bg-primary-50 transition-all"
                                >
                                  Chọn nhóm này
                                </button>
                                <span className="text-gray-300 text-xs">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleModule(quyenList, false)}
                                  disabled={!someInModuleChecked}
                                  className="text-[11px] font-medium text-gray-500 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none px-2 py-0.5 rounded hover:bg-rose-50 transition-all"
                                >
                                  Bỏ chọn nhóm
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Grid checkboxes */}
                          <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {quyenList.map(qh => {
                              const isChecked = activePermissions.has(qh.id);
                              const isSystemRole = Boolean(selectedRole.laHeThong);

                              return (
                                <label
                                  key={qh.id}
                                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                    isSystemRole
                                      ? 'opacity-85 cursor-not-allowed bg-gray-50/60 border-gray-200'
                                      : isChecked
                                      ? 'bg-primary-50/60 border-primary-200 shadow-xs cursor-pointer'
                                      : 'hover:bg-gray-50/70 border-gray-200/80 cursor-pointer bg-white'
                                  }`}
                                >
                                  <div className="flex items-center h-5 mt-0.5">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-primary-600 rounded-md focus:ring-primary-500 border-gray-300 disabled:cursor-not-allowed transition-all"
                                      checked={isChecked}
                                      onChange={() => handleTogglePermission(qh.id)}
                                      disabled={isSystemRole}
                                    />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`text-xs font-semibold leading-snug ${isChecked ? 'text-primary-950' : 'text-gray-800'}`}>
                                      {qh.tenQuyen}
                                    </span>
                                    <span className="text-[11px] text-gray-400 font-mono mt-0.5">{qh.maQuyen}</span>
                                    {qh.moTa && (
                                      <span className="text-[11px] text-gray-500 mt-1 leading-normal">{qh.moTa}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <Shield className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">Vui lòng chọn một vai trò bên cột trái để tùy chỉnh phân quyền</p>
              </div>
            )}
          </MedCard>
        </div>
      ) : (
        /* ─── MA TRẬN TOÀN CẢNH ERP (GRID MATRIX VIEW) ────────────── */
        <MedCard className="flex-1 flex flex-col min-h-0 overflow-hidden border-gray-200 shadow-xs bg-white rounded-2xl">
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Bảng Ma Trận Phân Quyền Tổng Thể Phòng Khám (2D Matrix)
              </span>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Lọc quyền hạn trong ma trận..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-primary-500"
              />
            </div>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-100 sticky top-0 z-20 shadow-2xs">
                <tr>
                  <th className="p-3 font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-200 bg-gray-100 min-w-[240px] sticky left-0 z-30">
                    Chức năng / Quyền hạn
                  </th>
                  {qData?.vaiTros?.map((vt) => {
                    const isSystem = Boolean(vt.laHeThong);
                    return (
                      <th
                        key={vt.id}
                        className="p-3 font-bold text-gray-800 text-center border-b border-r border-gray-200 min-w-[130px] bg-gray-100"
                      >
                        <div className="font-semibold text-gray-900">{vt.tenVaiTro}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{vt.maVaiTro}</div>
                        {isSystem ? (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Root System
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[10px] text-gray-500 font-normal">
                            {vt.soNhanSu || 0} nhân sự
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {Object.entries(filteredGroupedQuyen).map(([nhom, list]) => {
                  const NhomIcon = NHOM_ICONS[nhom] || Layers;
                  return (
                    <Fragment key={`group-${nhom}`}>
                      {/* Module row header */}
                      <tr className="bg-slate-100/90 font-bold text-gray-700">
                        <td
                          colSpan={(qData?.vaiTros?.length || 0) + 1}
                          className="p-2.5 text-xs uppercase tracking-wider text-primary-900 bg-primary-50/40 border-y border-primary-100 sticky left-0 font-bold"
                        >
                          <div className="flex items-center gap-1.5">
                            <NhomIcon className="w-3.5 h-3.5 text-primary-600" />
                            <span>{nhom}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Permissions rows */}
                      {list.map((qh) => (
                        <tr key={qh.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 border-r border-gray-100 bg-white sticky left-0 z-10 font-medium text-gray-900 shadow-xs">
                            <div>{qh.tenQuyen}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{qh.maQuyen}</div>
                          </td>

                          {qData?.vaiTros?.map((vt) => {
                            const permSet = rolePermMap.get(vt.id) || new Set();
                            const isGranted = permSet.has(qh.id);
                            const isSystem = Boolean(vt.laHeThong);

                            return (
                              <td
                                key={`${qh.id}-${vt.id}`}
                                className={`p-2.5 text-center border-r border-gray-100 ${
                                  isGranted ? 'bg-primary-50/20' : 'bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  {isSystem ? (
                                    <div className="w-5 h-5 rounded flex items-center justify-center bg-rose-50 text-rose-600" title="Vai trò hệ thống - Luôn có toàn quyền">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleMatrixCellToggle(vt, qh.id)}
                                      disabled={updateMutation.isPending}
                                      title={`Click để ${isGranted ? 'gỡ' : 'cấp'} quyền "${qh.tenQuyen}" cho "${vt.tenVaiTro}"`}
                                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                        isGranted
                                          ? 'bg-primary-600 border-primary-600 text-white shadow-2xs hover:bg-primary-700'
                                          : 'bg-white border-gray-300 text-transparent hover:border-primary-400 hover:text-gray-300'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </MedCard>
      )}

      {/* ─── MODAL CHỈNH SỬA THÔNG TIN VAI TRÒ ───────────────────── */}
      {editRoleModal.isOpen && editRoleModal.role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-bold text-gray-900">Chỉnh Sửa Thông Tin Vai Trò</h3>
              </div>
              <button
                onClick={() => setEditRoleModal({ isOpen: false, role: null })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mã định danh vai trò</label>
                <input
                  type="text"
                  disabled
                  value={editRoleModal.role.maVaiTro}
                  className="w-full px-3 py-2 text-xs font-mono bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-gray-400 mt-0.5 block">Mã vai trò hệ thống không được phép thay đổi để đảm bảo tính toàn vẹn.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên vai trò hiển thị *</label>
                <input
                  type="text"
                  required
                  value={editRoleForm.tenVaiTro}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, tenVaiTro: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Ví dụ: Bác sĩ điều trị..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả chức trách / phạm vi</label>
                <textarea
                  rows={3}
                  value={editRoleForm.moTa}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, moTa: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Mô tả nhiệm vụ và phạm vi nghiệp vụ của vị trí này..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditRoleModal({ isOpen: false, role: null })}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <MedButton
                  type="submit"
                  loading={editRoleMutation.isPending}
                  className="text-xs py-1.5 px-4"
                >
                  Cập nhật
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL TẠO QUYỀN HẠN MỚI DYNAMIC ─────────────────────── */}
      {addPermModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-bold text-gray-900">Thêm Quyền Hạn Mới Vào Hệ Thống</h3>
              </div>
              <button
                onClick={() => setAddPermModal({ isOpen: false })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddPerm} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mã quyền hạn (Unique Code) *</label>
                <input
                  type="text"
                  required
                  value={addPermForm.maQuyen}
                  onChange={(e) => setAddPermForm({ ...addPermForm, maQuyen: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '_') })}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Ví dụ: he_thong.tinh_nang_moi hoặc bai_viet.xoa"
                />
                <span className="text-[11px] text-gray-400 mt-0.5 block">Quy chuẩn định danh: phan_he.hanh_dong (chữ thường, ngăn cách bằng dấu chấm).</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên quyền hạn hiển thị *</label>
                <input
                  type="text"
                  required
                  value={addPermForm.tenQuyen}
                  onChange={(e) => setAddPermForm({ ...addPermForm, tenQuyen: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Ví dụ: Quản lý tính năng mới"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nhóm chức năng *</label>
                <select
                  value={addPermForm.nhomChucNang}
                  onChange={(e) => setAddPermForm({ ...addPermForm, nhomChucNang: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {qData?.nhomChucNangs?.map((nhom) => (
                    <option key={nhom} value={nhom}>
                      {nhom}
                    </option>
                  ))}
                  <option value="Chức Năng Khác">Chức Năng Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả quyền hạn</label>
                <textarea
                  rows={2}
                  value={addPermForm.moTa}
                  onChange={(e) => setAddPermForm({ ...addPermForm, moTa: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Giải thích chi tiết quyền hạn này cho phép người dùng thao tác những gì..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddPermModal({ isOpen: false })}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <MedButton
                  type="submit"
                  loading={addPermMutation.isPending}
                  className="text-xs py-1.5 px-4"
                >
                  Tạo quyền hạn
                </MedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
