import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { BACKEND_URL } from '../utils/backendUrl';

/**
 * Làm mới các query hàng đợi ngay khi server phát 'queue:update' / 'queue:call' qua WebSocket.
 *
 * Trước đây các trang hàng đợi / phòng khám tự hỏi server mỗi 2,5–5 giây (mỗi máy đang mở trang
 * ≈ 24 truy vấn/phút suốt ca), trong khi pool kết nối CSDL trên Render rất nhỏ. Giờ cập nhật đến
 * tức thì qua socket; refetchInterval của từng query chỉ còn là dự phòng khi socket rớt hoặc khi
 * thay đổi đến từ module chưa phát sự kiện.
 *
 * Dùng chung một kết nối cho mọi component (đếm số người dùng, ngắt khi không còn ai).
 */
let socketChung = null;
let soNguoiDung = 0;

function laySocket() {
  if (!socketChung) {
    socketChung = io(BACKEND_URL || window.location.origin, { transports: ['websocket', 'polling'] });
  }
  soNguoiDung += 1;
  return socketChung;
}

function traSocket() {
  soNguoiDung -= 1;
  if (soNguoiDung <= 0 && socketChung) {
    socketChung.disconnect();
    socketChung = null;
    soNguoiDung = 0;
  }
}

/** Polling dự phòng khi đã có socket: đủ thưa để không tạo tải, đủ dày để không lỡ thay đổi quá lâu */
export const POLL_DU_PHONG_MS = 20000;

/**
 * @param {Array<Array<unknown>>} queryKeys các queryKey (tiền tố) cần làm mới khi hàng đợi thay đổi
 */
export default function useHangDoiRealtime(queryKeys) {
  const queryClient = useQueryClient();
  const khoa = JSON.stringify(queryKeys);

  useEffect(() => {
    const keys = JSON.parse(khoa);
    const socket = laySocket();
    const lamMoi = () => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    socket.on('queue:update', lamMoi);
    socket.on('queue:call', lamMoi);
    // Kết nối lại sau khi rớt mạng: có thể đã lỡ sự kiện → tải lại một lần
    socket.on('connect', lamMoi);
    return () => {
      socket.off('queue:update', lamMoi);
      socket.off('queue:call', lamMoi);
      socket.off('connect', lamMoi);
      traSocket();
    };
  }, [khoa, queryClient]);
}
