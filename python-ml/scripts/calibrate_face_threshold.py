"""
calibrate_face_threshold.py — Đo tỷ lệ từ chối nhầm (FRR) và nhận nhầm (FAR) của ngưỡng khuôn mặt
trên dữ liệu thật: ảnh đại diện nhân viên (nhan_vien.anh_dai_dien) và ảnh chấm công đã lưu (cham_cong).

  Cặp đúng người : ảnh đại diện của A  ↔  ảnh chấm công của A
  Cặp khác người : ảnh đại diện của A  ↔  ảnh chấm công / ảnh đại diện của người khác

Cách chạy (cần DB_* như service; ảnh lưu dạng /uploads/... thì chỉ tới thư mục backend):
    python scripts/calibrate_face_threshold.py --backend-dir ../backend

LƯU Ý khi đọc kết quả: cham_cong chỉ lưu ảnh của những lần chấm công THÀNH CÔNG (đã vượt ngưỡng hiện tại),
nên FRR đo được ở đây thấp hơn thực tế. FAR không bị ảnh hưởng. Cần vài chục nhân viên thì số liệu mới ổn định.
"""
import argparse
import base64
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.forecaster import DataLoader
from services.face_verifier import NGUONG_KHOP_PCT, cosine, decode_base64_image, get_face_info, mat_hop_le


def doc_anh(duong_dan: str, backend_dir: str):
    """Đọc ảnh từ URL (Cloudinary) hoặc đường dẫn /uploads/... trong thư mục backend → face hoặc None."""
    try:
        if duong_dan.startswith("http"):
            data = urllib.request.urlopen(duong_dan, timeout=20).read()
        else:
            data = open(os.path.join(backend_dir, duong_dan.lstrip("/")), "rb").read()
        face = get_face_info(decode_base64_image(base64.b64encode(data).decode()))
        return face if mat_hop_le(face) else None
    except Exception as e:
        print(f"  bỏ qua {duong_dan[:60]}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--backend-dir", default="../backend", help="Thư mục chứa uploads/ của backend")
    parser.add_argument("--max-anh-moi-nguoi", type=int, default=20, help="Số ảnh chấm công tối đa mỗi nhân viên")
    args = parser.parse_args()

    loader = DataLoader()
    nhan_vien = loader._query(
        "SELECT id, anh_dai_dien FROM nhan_vien WHERE anh_dai_dien IS NOT NULL AND anh_dai_dien != ''")
    cham_cong = loader._query("""
        SELECT nhan_vien_id, anh_checkin AS anh FROM cham_cong WHERE anh_checkin IS NOT NULL AND anh_checkin != ''
        UNION ALL
        SELECT nhan_vien_id, anh_checkout FROM cham_cong WHERE anh_checkout IS NOT NULL AND anh_checkout != ''
    """)

    print(f"Đọc {len(nhan_vien)} ảnh đại diện, {len(cham_cong)} ảnh chấm công...")
    mau = {}  # nhan_vien_id → embedding ảnh đại diện
    for nv in nhan_vien:
        face = doc_anh(nv["anh_dai_dien"], args.backend_dir)
        if face is not None:
            mau[nv["id"]] = face.embedding
    anh_cc = []  # (nhan_vien_id, embedding)
    da_lay = {}
    for row in cham_cong:
        nv_id = row["nhan_vien_id"]
        if da_lay.get(nv_id, 0) >= args.max_anh_moi_nguoi:
            continue
        face = doc_anh(row["anh"], args.backend_dir)
        if face is not None:
            anh_cc.append((nv_id, face.embedding))
            da_lay[nv_id] = da_lay.get(nv_id, 0) + 1

    dung_nguoi = [cosine(mau[nv_id], emb) for nv_id, emb in anh_cc if nv_id in mau]
    khac_nguoi = [cosine(m, emb) for mau_id, m in mau.items() for nv_id, emb in anh_cc if nv_id != mau_id]
    ids = sorted(mau)
    khac_nguoi += [cosine(mau[a], mau[b]) for i, a in enumerate(ids) for b in ids[i + 1:]]

    print(f"\n{len(mau)} nhân viên có ảnh mẫu dùng được | {len(dung_nguoi)} cặp đúng người | {len(khac_nguoi)} cặp khác người")
    if not dung_nguoi or not khac_nguoi:
        print("Chưa đủ dữ liệu để đo (cần cả cặp đúng người và cặp khác người).")
        return
    print(f"Cosine đúng người: thấp nhất {min(dung_nguoi):.3f}, trung bình {sum(dung_nguoi) / len(dung_nguoi):.3f}")
    print(f"Cosine khác người: cao nhất {max(khac_nguoi):.3f}, trung bình {sum(khac_nguoi) / len(khac_nguoi):.3f}")

    nguong_hien_tai = 0.20 + NGUONG_KHOP_PCT / 100 * 0.35
    print(f"\n{'cosine':>7} {'hiển thị':>9} {'FRR (từ chối nhầm)':>20} {'FAR (nhận nhầm)':>17}")
    for nguong in [0.25, 0.30, 0.35, 0.40, round(nguong_hien_tai, 3), 0.50, 0.55, 0.60]:
        frr = sum(c < nguong for c in dung_nguoi) / len(dung_nguoi)
        far = sum(c >= nguong for c in khac_nguoi) / len(khac_nguoi)
        dau = "  ← ngưỡng hiện tại" if nguong == round(nguong_hien_tai, 3) else ""
        print(f"{nguong:>7.3f} {(nguong - 0.20) / 0.35 * 100:>8.0f}% {frr:>19.1%} {far:>16.1%}{dau}")


if __name__ == "__main__":
    main()
