import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, FlaskConical, FileText, CheckCheck, Inbox, Clock, ClipboardList, Wallet, X } from 'lucide-react';
import api from '../services/api';
import { timeAgo } from '../utils/formatDate';
import useAuthStore from '../store/authStore';

// Tiền tố route theo vai trò (dùng để chuyển hướng khi bấm thông báo)
const ROLE_PREFIX = {
  tiep_tan: 'tiep-tan',
  bac_si: 'bac-si',
  ky_thuat_vien: 'ky-thuat-vien',
  nhan_vien_nha_thuoc: 'nha-thuoc',
  nha_thuoc: 'nha-thuoc',
  thu_ngan: 'thu-ngan',
};

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null); // Thông báo mới vừa đến (popup góc màn hình)
  const [ringing, setRinging] = useState(false); // Hiệu ứng rung chuông
  const seenIdsRef = useRef(null); // null = chưa tải lần đầu
  const baseTitleRef = useRef(document.title.replace(/^\(\d+\+?\)\s*/, ''));
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Polling thông báo siêu tốc dưới 3s (2.5s) theo đúng user ID đang đăng nhập
  const { data } = useQuery({
    queryKey: ['thong-bao', user?.id],
    queryFn: async () => {
      const res = await api.get('/thong-bao');
      if (res?.data?.items) return res.data;
      if (res?.items) return res;
      return res?.data || { items: [], unreadCount: 0 };
    },
    refetchInterval: 2500,
    enabled: !!user?.id,
  });

  const notifications = data?.items || data?.data?.items || (Array.isArray(data) ? data : []);
  const unreadCount = typeof data?.unreadCount === 'number'
    ? data.unreadCount
    : (typeof data?.data?.unreadCount === 'number' ? data.data.unreadCount : 0);

  // Hiệu ứng phát hiện thông báo MỚI đến qua Polling -> Rung chuông & hiện Toast nổi
  useEffect(() => {
    if (!notifications) return;

    // Lần đầu tải trang: ghi nhận các ID đã có để không spam toast
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(notifications.map((n) => n.id));
      return;
    }

    // Các lần refetch sau: tìm thông báo chưa đọc mới xuất hiện
    const newItems = notifications.filter(
      (item) => !item.daDoc && !seenIdsRef.current.has(item.id),
    );

    if (newItems.length > 0) {
      // Thêm vào danh sách đã thấy
      newItems.forEach((item) => seenIdsRef.current.add(item.id));
      const latest = newItems[0];
      setToast(latest);
      setRinging(true);

      // Tự tắt rung chuông sau 1.2s
      const ringTimer = setTimeout(() => setRinging(false), 1200);
      // Tự đóng toast sau 6s
      const toastTimer = setTimeout(() => setToast(null), 6000);

      return () => {
        clearTimeout(ringTimer);
        clearTimeout(toastTimer);
      };
    }
  }, [notifications]);

  // Cập nhật tiêu đề tab trình duyệt với số lượng chưa đọc (vd: (3) Phòng khám đa khoa)
  useEffect(() => {
    const base = baseTitleRef.current || 'Phòng Khám';
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 9 ? '9+' : unreadCount}) ${base}`;
    } else {
      document.title = base;
    }
  }, [unreadCount]);

  // Đánh dấu 1 thông báo đã đọc
  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/thong-bao/${id}/doc`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thong-bao', user?.id] });
    },
  });

  // Đánh dấu tất cả đã đọc
  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/thong-bao/doc-tat-ca'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thong-bao', user?.id] });
    },
  });

  const handleNotificationClick = (item) => {
    if (!item.daDoc) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    setToast(null);

    // Chuyển hướng thông minh theo ngữ cảnh và loại đối tượng
    if (item.loai === 'xet_nghiem' || item.loai === 'ket_qua_xet_nghiem_hieu_chinh') {
      const chiDinhId = item.doiTuongId;
      if (user?.vaiTro === 'ky_thuat_vien') {
        // KTV: mở thẳng chỉ định xét nghiệm đó để tiến hành lấy mẫu / nhập kết quả
        navigate(chiDinhId ? `/ky-thuat-vien/xet-nghiem?chiDinhId=${chiDinhId}` : '/ky-thuat-vien/xet-nghiem');
      } else if (user?.vaiTro === 'bac_si') {
        // Bác sĩ: mở phòng khám lâm sàng, tự nạp bệnh nhân và chuyển sang tab Xét nghiệm & CLS
        navigate(chiDinhId ? `/bac-si/phong-kham?chiDinhId=${chiDinhId}&tab=xn` : '/bac-si/phong-kham');
      }
    } else if (item.loai === 'don_tu' || item.loai === 'phe_duyet') {
      const donId = item.doiTuongId;
      if (user?.vaiTro === 'ban_giam_doc') {
        // Giám đốc: mở trang duyệt đơn và chọn ngay đơn đó
        navigate(donId ? `/ban-giam-doc/phe-duyet-don?donId=${donId}` : '/ban-giam-doc/phe-duyet-don');
      } else {
        const prefix = ROLE_PREFIX[user?.vaiTro] || 'tiep-tan';
        navigate(`/${prefix}/gui-don`);
      }
    } else if (item.loai === 'chi_dao_bao_cao') {
      // Nhân viên / bác sĩ nhận chỉ đạo của Giám đốc -> chuyển đến trang thống kê / báo cáo của bộ phận mình
      const prefix = ROLE_PREFIX[user?.vaiTro] || 'tiep-tan';
      navigate(`/${prefix}/thong-ke`);
    } else if (item.loai === 'bao_cao_bo_phan') {
      // Giám đốc nhận báo cáo từ các bộ phận gửi lên
      if (user?.vaiTro === 'ban_giam_doc') {
        navigate('/ban-giam-doc/bao-cao-bo-phan');
      } else {
        const prefix = ROLE_PREFIX[user?.vaiTro] || 'tiep-tan';
        navigate(`/${prefix}/thong-ke`);
      }
    } else if (item.loai === 'ban_giao_ca' || item.loai === 'xac_nhan_nhan_ca') {
      navigate('/thu-ngan/thong-ke');
    } else if (item.loai === 'lich_kham' || item.loai === 'lich_hen') {
      if (user?.vaiTro === 'bac_si') {
        navigate('/bac-si/phong-kham');
      } else if (user?.vaiTro === 'tiep_tan') {
        navigate('/tiep-tan/hang-doi');
      }
    }
  };

  const getIcon = (loai) => {
    switch (loai) {
      case 'xet_nghiem':
      case 'ket_qua_xet_nghiem_hieu_chinh':
        return <FlaskConical className="w-4 h-4 text-blue-600" />;
      case 'don_tu':
      case 'phe_duyet':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'chi_dao_bao_cao':
      case 'bao_cao_bo_phan':
        return <ClipboardList className="w-4 h-4 text-emerald-600" />;
      case 'ban_giao_ca':
      case 'xac_nhan_nhan_ca':
        return <Wallet className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-primary-600" />;
    }
  };

  const getIconBg = (loai) => {
    switch (loai) {
      case 'xet_nghiem':
      case 'ket_qua_xet_nghiem_hieu_chinh':
        return 'bg-blue-100';
      case 'don_tu':
      case 'phe_duyet':
        return 'bg-amber-100';
      case 'chi_dao_bao_cao':
      case 'bao_cao_bo_phan':
        return 'bg-emerald-100';
      case 'ban_giao_ca':
      case 'xac_nhan_nhan_ca':
        return 'bg-purple-100';
      default:
        return 'bg-primary-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toast thông báo nổi khi có tin mới */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[9999] max-w-sm w-full bg-white border border-blue-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3 transition-all duration-300 animate-slide-in hover:shadow-blue-100"
          role="alert"
        >
          <div className={`p-2.5 rounded-xl shrink-0 ${getIconBg(toast.loai)}`}>
            {getIcon(toast.loai)}
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => handleNotificationClick(toast)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                Thông báo mới
              </span>
              <span className="text-[10px] text-gray-400">Vừa xong</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
              {toast.tieuDe}
            </p>
            {toast.noiDung && (
              <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                {toast.noiDung}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nút quả chuông */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all focus:outline-none ${
          ringing ? 'animate-bounce text-red-500 bg-red-50' : ''
        }`}
        title="Thông báo"
        data-testid="btn-notification-bell"
      >
        <Bell className={`h-5 w-5 ${ringing ? 'text-red-500' : ''}`} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse"
            data-testid="badge-notification-count"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden transition-all duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Inbox className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">Chưa có thông báo</p>
                <p className="text-xs text-gray-400 mt-0.5">Mọi cập nhật xét nghiệm, đơn từ sẽ hiển thị ở đây</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    !item.daDoc ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${getIconBg(
                      item.loai,
                    )}`}
                  >
                    {getIcon(item.loai)}
                  </div>

                  {/* Nội dung */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !item.daDoc ? 'text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {item.tieuDe}
                      </p>
                      {!item.daDoc && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    {item.noiDung && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {item.noiDung}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(item.taoLuc)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
            <span className="text-[11px] text-gray-400">Tự động cập nhật thông báo</span>
          </div>
        </div>
      )}
    </div>
  );
}

