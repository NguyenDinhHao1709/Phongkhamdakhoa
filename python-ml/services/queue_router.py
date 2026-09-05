"""
queue_router.py — Thuật toán Điều hướng Động Hàng đợi Cận Lâm Sàng (Dynamic Queue Routing Engine)
Mục tiêu: Định tuyến bệnh nhân làm nhiều chỉ định sang các phòng có thời gian chờ ngắn nhất trước.
"""
from typing import List, Dict, Any, Optional

# Thời gian xử lý trung bình mặc định cho từng loại cận lâm sàng (phút/ca)
THOI_GIAN_TRUNG_BINH_PHUT = {
    "cdha": 12,       # Siêu âm / X-Quang / CT: ~12 phút/ca
    "xet_nghiem": 5,   # Lấy máu xét nghiệm: ~5 phút/ca
    "ecg": 7,          # Điện tâm đồ: ~7 phút/ca
    "noi_soi": 15,     # Nội soi: ~15 phút/ca
    "khac": 8,         # Khác
}

TEN_PHONG_LABELS = {
    "cdha": "Phòng Chẩn đoán Hình ảnh (Siêu âm / X-Quang)",
    "xet_nghiem": "Phòng Xét nghiệm Máu & Sinh hóa",
    "ecg": "Phòng Điện tâm đồ (ECG)",
    "noi_soi": "Phòng Nội soi",
    "khac": "Phòng Kỹ thuật viên",
}

class DynamicQueueRouter:
    """
    Bộ định tuyến động hàng đợi cận lâm sàng.
    Tính toán thời gian chờ dự kiến = SoNguoiCho * ThoiGianXuLyTrungBinh.
    Sắp xếp các bước khám sao cho tổng thời gian chờ là nhỏ nhất (Min-Wait First).
    """

    def __init__(self, requested_items: List[Dict[str, Any]], queue_states: Dict[str, int]):
        """
        requested_items: List các chỉ định [{ "id": 1, "tenDichVu": "...", "loai": "xet_nghiem" }, ...]
        queue_states: Dict số người đang chờ từng loại { "xet_nghiem": 2, "cdha": 5, ... }
        """
        self.requested_items = requested_items
        self.queue_states = queue_states

    def optimize_route(self) -> Dict[str, Any]:
        if not self.requested_items:
            return {
                "routing_plan": [],
                "tiet_kiem_phut": 0,
                "tong_thoi_gian_min_phut": 0,
                "tong_thoi_gian_fifo_phut": 0,
                "thong_diep": "Không có chỉ định cận lâm sàng nào.",
            }

        # 1. Gom nhóm chỉ định theo loại dịch vụ/phòng
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for item in self.requested_items:
            loai = item.get("loai") or "xet_nghiem"
            if loai not in grouped:
                grouped[loai] = []
            grouped[loai].append(item)

        # 2. Tính thời gian chờ dự kiến tại từng phòng
        room_estimates = []
        fifo_sequence = list(grouped.keys())

        for loai, items in grouped.items():
            so_nguoi_cho = self.queue_states.get(loai, 0)
            avg_time = THOI_GIAN_TRUNG_BINH_PHUT.get(loai, 8)
            # Thời gian chờ trước khi đến lượt
            wait_min = so_nguoi_cho * avg_time
            # Thời gian thực hiện các dịch vụ của chính bệnh nhân này
            proc_min = len(items) * avg_time
            total_room_min = wait_min + proc_min

            room_estimates.append({
                "loai": loai,
                "ten_phong": TEN_PHONG_LABELS.get(loai, "Phòng Cận Lâm Sàng"),
                "so_nguoi_cho": so_nguoi_cho,
                "thoi_gian_cho_du_kien": wait_min,
                "thoi_gian_thuc_hien": proc_min,
                "tong_phut": total_room_min,
                "danh_sach_dich_vu": [it.get("tenDichVu") for it in items],
            })

        # 3. Tính tổng thời gian theo thứ tự FIFO (thứ tự chỉ định ban đầu)
        total_fifo_min = sum(r["tong_phut"] for r in room_estimates)

        # 4. Sắp xếp tối ưu: Ưu tiên phòng có THỜI GIAN CHỜ NGẮN NHẤT trước (Min-Wait First)
        # Giúp bệnh nhân hoàn thành nhanh bước 1 trong khi các phòng đông hơn giải phóng bớt hàng đợi
        sorted_rooms = sorted(room_estimates, key=lambda x: x["thoi_gian_cho_du_kien"])

        # 5. Tạo lộ trình từng bước
        routing_plan = []
        accumulated_wait = 0

        for idx, room in enumerate(sorted_rooms):
            buoc_num = idx + 1
            wait_here = room["thoi_gian_cho_du_kien"]
            proc_here = room["thoi_gian_thuc_hien"]

            # Đánh giá mức độ đông
            if room["so_nguoi_cho"] <= 1:
                tinh_trang = "vong"
                badge_color = "emerald"
                mota_hang_doi = f"Phòng vắng (chỉ {room['so_nguoi_cho']} người chờ)"
            elif room["so_nguoi_cho"] <= 3:
                tinh_trang = "vua"
                badge_color = "amber"
                mota_hang_doi = f"Phòng vừa phải ({room['so_nguoi_cho']} người chờ)"
            else:
                tinh_trang = "dong"
                badge_color = "red"
                mota_hang_doi = f"Phòng khá đông ({room['so_nguoi_cho']} người chờ)"

            khuyen_nghi = (
                f"⭐ ĐẾN ĐÂY ĐẦU TIÊN! {mota_hang_doi}, bạn sẽ được phục vụ ngay trong ~{wait_here} phút."
                if buoc_num == 1 and len(sorted_rooms) > 1 else
                f"Bước {buoc_num}: Di chuyển đến đây sau khi hoàn thành bước {buoc_num - 1}."
            )

            routing_plan.append({
                "buoc": buoc_num,
                "loai": room["loai"],
                "ten_phong": room["ten_phong"],
                "so_nguoi_cho": room["so_nguoi_cho"],
                "thoi_gian_cho_phut": wait_here,
                "thoi_gian_thuc_hien_phut": proc_here,
                "dich_vu": room["danh_sach_dich_vu"],
                "tinh_trang": tinh_trang,
                "badge_color": badge_color,
                "khuyen_nghi": khuyen_nghi,
            })

        # 6. Tính số phút tiết kiệm được
        # Do đi phòng vắng trước, trong thời gian làm ở phòng 1 thì phòng đông (bước 2) đã kịp phục vụ bớt người!
        # Tiết kiệm ước tính = Chênh lệch thời gian chờ nếu đi phòng đông trước vs phòng vắng trước
        max_wait = max((r["thoi_gian_cho_du_kien"] for r in room_estimates), default=0)
        min_wait = min((r["thoi_gian_cho_du_kien"] for r in room_estimates), default=0)
        tiet_kiem_phut = max(0, max_wait - min_wait)

        tong_thoi_gian_min_phut = sum(r["thoi_gian_cho_du_kien"] + r["thoi_gian_thuc_hien"] for r in sorted_rooms)

        return {
            "routing_plan": routing_plan,
            "tiet_kiem_phut": tiet_kiem_phut,
            "tong_thoi_gian_min_phut": tong_thoi_gian_min_phut,
            "tong_thoi_gian_fifo_phut": total_fifo_min,
            "so_luong_phong": len(sorted_rooms),
        }

