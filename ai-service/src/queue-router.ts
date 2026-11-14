/**
 * Định tuyến hàng đợi cận lâm sàng (Min-Wait-First).
 *
 * Mô hình: bệnh nhân đã có số trong hàng đợi của mọi phòng từ lúc chỉ định, nên hàng phía trước
 * ở từng phòng vẫn rút dần trong lúc bệnh nhân làm ở phòng khác. Phòng i "sẵn sàng" sau phutCho_i phút
 * (tổng thời gian phục vụ của các chỉ định đang chờ phía trước). Đi theo thứ tự phutCho tăng dần cho
 * thời điểm hoàn thành sớm nhất (bài toán lập lịch 1 máy có thời điểm sẵn sàng → Earliest-Release-Date).
 */

/** Thời gian cho một chỉ định khi chưa có dữ liệu đo của dịch vụ lẫn loại phòng */
export const PHUT_MAC_DINH = 15;

export interface PhongCls {
  loai: string;
  /** Số bệnh nhân khác đang chờ phía trước */
  soNguoiCho: number;
  /** Phút cho đến khi hết hàng phía trước = tổng thời gian phục vụ từng chỉ định đang chờ */
  phutCho: number;
  /** Phút làm các chỉ định của chính bệnh nhân tại phòng này */
  phutThucHien: number;
  dichVu: string[];
  /** false khi có chỉ định phải dùng PHUT_MAC_DINH */
  duDuLieu: boolean;
}

const TEN_PHONG: Record<string, string> = {
  cdha: 'Phòng Chẩn đoán Hình ảnh (Siêu âm / X-Quang)',
  xet_nghiem: 'Phòng Xét nghiệm Máu & Sinh hóa',
  ecg: 'Phòng Điện tâm đồ (ECG)',
  noi_soi: 'Phòng Nội soi',
  khac: 'Phòng Kỹ thuật viên',
};

/** Đi lần lượt các phòng theo thứ tự cho trước → thời gian chờ thực tại từng phòng và tổng thời gian. */
function moPhong(thuTu: PhongCls[]) {
  let t = 0;
  const cho = thuTu.map((p) => {
    const choTaiDay = Math.max(0, p.phutCho - t);
    t += choTaiDay + p.phutThucHien;
    return choTaiDay;
  });
  return { cho, tong: t };
}

/** `thuTuChiDinh`: các phòng theo thứ tự bác sĩ chỉ định (dùng làm mốc so sánh số phút tiết kiệm). */
export function toiUuLoTrinhCls(thuTuChiDinh: PhongCls[]) {
  const toiUu = [...thuTuChiDinh].sort((a, b) => a.phutCho - b.phutCho || a.soNguoiCho - b.soNguoiCho);
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
      thoi_gian_thuc_hien_phut: Math.round(p.phutThucHien),
      dich_vu: p.dichVu,
      tinh_trang,
      badge_color: n <= 2 ? 'emerald' : n <= 4 ? 'amber' : 'red',
      khuyen_nghi,
    };
  });

  const thieuDuLieu = toiUu.filter((p) => !p.duDuLieu).map((p) => p.loai);
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
