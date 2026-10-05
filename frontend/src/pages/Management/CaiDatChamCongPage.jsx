import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, Plus, Trash2, Save, RefreshCw, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiGet, apiPut } from '../../services/api';

export default function CaiDatChamCongPage() {
  const queryClient = useQueryClient();
  const [newIp, setNewIp] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cham-cong-cau-hinh'],
    queryFn: () => apiGet('/cham-cong/cau-hinh'),
    select: (res) => res?.data?.data || res?.data || { bat_buoc_wifi: false, danh_sach_ip: [] },
  });

  const { data: ipHienTai } = useQuery({
    queryKey: ['cham-cong-ip-admin'],
    queryFn: () => apiGet('/cham-cong/ip-hien-tai'),
    select: (res) => res?.data?.data?.ip || res?.data?.ip || '',
  });

  const [config, setConfig] = useState(null);
  // Dùng data từ server khi chưa có local state
  const cfg = config ?? data ?? { bat_buoc_wifi: false, danh_sach_ip: [] };

  const saveMutation = useMutation({
    mutationFn: (newCfg) => apiPut('/cham-cong/cau-hinh', newCfg),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries(['cham-cong-cau-hinh']);
    },
  });

  const setCfg = (updater) => setConfig(prev => {
    const cur = prev ?? data ?? { bat_buoc_wifi: false, danh_sach_ip: [] };
    return typeof updater === 'function' ? updater(cur) : updater;
  });

  const toggleWifi = () => setCfg(c => ({ ...c, bat_buoc_wifi: !c.bat_buoc_wifi }));

  const addIp = (ip) => {
    const trimmed = ip.trim();
    if (!trimmed) return;
    setCfg(c => ({ ...c, danh_sach_ip: [...new Set([...(c.danh_sach_ip || []), trimmed])] }));
    setNewIp('');
  };

  const removeIp = (ip) => setCfg(c => ({ ...c, danh_sach_ip: (c.danh_sach_ip || []).filter(x => x !== ip) }));

  const handleSave = () => {
    let finalCfg = { ...cfg };
    const trimmed = newIp.trim();
    if (trimmed) {
      finalCfg.danh_sach_ip = [...new Set([...(finalCfg.danh_sach_ip || []), trimmed])];
      setNewIp('');
      setConfig(finalCfg);
    }
    saveMutation.mutate(finalCfg);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-6 w-6" />
          <h1 className="text-xl font-bold">Cài đặt Chấm Công & WiFi</h1>
        </div>
        <p className="text-blue-200 text-sm">
          Quản lý danh sách IP mạng hợp lệ cho chức năng chấm công khuôn mặt
        </p>
      </div>

      {/* Toggle bắt buộc WiFi */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Bắt buộc cùng mạng WiFi</h2>
            <p className="text-sm text-gray-500 mt-1">
              Khi bật, chỉ nhân viên có IP trong danh sách mới được phép chấm công
            </p>
          </div>
          <button onClick={toggleWifi} className="flex-shrink-0 ml-4">
            {cfg.bat_buoc_wifi
              ? <ToggleRight className="h-10 w-10 text-blue-600" />
              : <ToggleLeft className="h-10 w-10 text-gray-400" />
            }
          </button>
        </div>
        {!cfg.bat_buoc_wifi && (
          <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs">
            ⚠️ Hiện đang <strong>TẮT</strong> kiểm tra WiFi — nhân viên có thể chấm công từ bất kỳ mạng nào.
          </div>
        )}
      </div>

      {/* Danh sách IP */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Danh sách IP được phép</h2>
          <span className="text-xs text-gray-400">{cfg.danh_sach_ip?.length || 0} IP</span>
        </div>

        {/* Nút lấy IP hiện tại */}
        {ipHienTai && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Wifi className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-500">IP của bạn hiện tại</p>
              <p className="text-sm font-mono font-medium text-blue-800 truncate">{ipHienTai}</p>
            </div>
            <button
              onClick={() => addIp(ipHienTai)}
              disabled={cfg.danh_sach_ip?.includes(ipHienTai)}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {cfg.danh_sach_ip?.includes(ipHienTai) ? '✓ Đã thêm' : '+ Thêm IP này'}
            </button>
          </div>
        )}

        {/* Thêm IP thủ công */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newIp}
            onChange={e => setNewIp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIp(newIp)}
            placeholder="Nhập IP (VD: 192.168.1.100)"
            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={() => addIp(newIp)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>

        {/* Danh sách IP */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {cfg.danh_sach_ip?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có IP nào trong danh sách</p>
          )}
          {cfg.danh_sach_ip?.map(ip => (
            <div key={ip} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border">
              <span className="font-mono text-sm text-gray-700">{ip}</span>
              <button
                onClick={() => removeIp(ip)}
                className="text-red-400 hover:text-red-600 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Nút lưu */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {saveMutation.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Đang lưu...</>
            : saved
            ? <><Save className="h-4 w-4" /> Đã lưu ✓</>
            : <><Save className="h-4 w-4" /> Lưu cài đặt</>
          }
        </button>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-red-600 text-center">
          Lỗi: {saveMutation.error?.message || saveMutation.error?.response?.data?.message || 'Không thể lưu cài đặt'}
        </p>
      )}
    </div>
  );
}
