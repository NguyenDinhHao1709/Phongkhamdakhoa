/**
 * Định tuyến hàng đợi cận lâm sàng (Min-Wait-First).
 *
 * Mô hình: bệnh nhân đã có số trong hàng đợi của mọi phòng từ lúc chỉ định, nên hàng phía trước
 * ở từng phòng vẫn rút dần trong lúc bệnh nhân làm ở phòng khác. Phòng i "sẵn sàng" sau w_i phút
 * (số người chờ × thời gian phục vụ trung bình). Đi theo thứ tự w_i tăng dần cho thời điểm
 * hoàn thành sớm nhất (bài toán lập lịch 1 máy có thời điểm sẵn sàng → Earliest-Release-Date).
 */
export interface QueueState {
  count: number;
  /** Trung bình đo được từ dữ liệu; null khi chưa có dữ liệu → dùng PHUT_MAC_DINH */
  avg_service_minutes: number | null;
}

const PHUT_MAC_DINH = 15;

const TEN_PHONG: Record<string, string> = {
  cdha: 'Phòng Chẩn đoán Hình ảnh (Siêu âm / X-Quang)',
  xet_nghiem: 'Phòng Xét nghiệm Máu & Sinh hóa',
  ecg: 'Phòng Điện tâm đồ (ECG)',
  noi_soi: 'Phòng Nội soi',
  khac: 'Phòng Kỹ thuật viên',
};

interface Phong {
  loai: string;
  soNguoiCho: number;
  sanSangSau: number; // phút cho đến khi hết hàng phía trước
  thucHien: number; // phút làm các chỉ định của chính bệnh nhân
  dichVu: string[];
}

/** Đi lần lượt các phòng theo thứ tự cho trước → thời gian chờ thực tại từng phòng và tổng thời gian. */
function moPhong(thuTu: Phong[]) {
  let t = 0;
  const cho = thuTu.map((p) => {
    const choTaiDay = Math.max(0, p.sanSangSau - t);
    t += choTaiDay + p.thucHien;
    return choTaiDay;
  });
  return { cho, tong: t };
}

export function toiUuLoTrinhCls(
  items: Array<{ tenDichVu: string; loai: string }>,
  queueStates: Record<string, QueueState>,
) {
  // Gom chỉ định theo phòng, giữ thứ tự chỉ định ban đầu (dùng làm mốc so sánh)
  const theoLoai = new Map<string, string[]>();
  for (const item of items) {
    theoLoai.set(item.loai, [...(theoLoai.get(item.loai) || []), item.tenDichVu]);
  }
  const thuTuChiDinh: Phong[] = [...theoLoai].map(([loai, dichVu]) => {
    const soNguoiCho = queueStates[loai]?.count || 0;
    const phut = queueStates[loai]?.avg_service_minutes || PHUT_MAC_DINH;
    return { loai, soNguoiCho, sanSangSau: soNguoiCho * phut, thucHien: dichVu.length * phut, dichVu };
  });

  const toiUu = [...thuTuChiDinh].sort((a, b) => a.sanSangSau - b.sanSangSau || a.soNguoiCho - b.soNguoiCho);
  const ketQua = moPhong(toiUu);
  const tongTheoChiDinh = moPhong(thuTuChiDinh).tong;

  const routing_plan = toiUu.map((p, idx) => {
    const buoc = idx + 1;
    const cho = Math.round(ketQua.cho[idx]);
    const n = p.soNguoiCho;
    const tinh_trang = n === 0 ? 'trong' : n <= 2 ? 'vong' : n <= 4 ? 'vua' : 'dong';
    let khuyen_nghi: string;
    if (toiUu.length === 1) {
      khuyen_nghi = n === 0
        ? 'Đến thực hiện ngay tại phòng này. Hiện không có người chờ phía trước.'
        : `Đến thực hiện cận lâm sàng tại phòng này. Có ${n} người chờ phía trước (~${cho} phút).`;
    } else if (buoc === 1) {
      khuyen_nghi = n === 0
        ? 'Ưu tiên đến phòng này trước vì hiện không có người chờ, bạn sẽ được phục vụ ngay.'
        : `Ưu tiên đến phòng này trước. Thời gian chờ ngắn nhất (~${cho} phút).`;
    } else {
      khuyen_nghi = cho === 0
        ? `Bước ${buoc}: Di chuyển đến đây sau khi xong bước ${buoc - 1} (dự kiến đến lượt ngay).`
        : `Bước ${buoc}: Di chuyển đến đây sau khi xong bước ${buoc - 1} (chờ thêm ~${cho} phút).`;
    }
    return {
      buoc,
      loai: p.loai,
      ten_phong: TEN_PHONG[p.loai] || 'Phòng Cận Lâm Sàng',
      so_nguoi_cho: n,
      thoi_gian_cho_phut: cho,
      thoi_gian_thuc_hien_phut: Math.round(p.thucHien),
      dich_vu: p.dichVu,
      tinh_trang,
      badge_color: n <= 2 ? 'emerald' : n <= 4 ? 'amber' : 'red',
      khuyen_nghi,
    };
  });

  const thieuDuLieu = toiUu.filter((p) => !queueStates[p.loai]?.avg_service_minutes).map((p) => p.loai);
  return {
    routing_plan,
    // So với việc đi đúng thứ tự bác sĩ chỉ định
    tiet_kiem_phut: Math.round(tongTheoChiDinh - ketQua.tong),
    tong_thoi_gian_min_phut: Math.round(ketQua.tong),
    data_quality: {
      all_service_times_observed: thieuDuLieu.length === 0,
      missing_service_time_types: thieuDuLieu,
    },
  };
}
