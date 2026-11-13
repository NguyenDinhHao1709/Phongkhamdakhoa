"""
services/face_verifier.py — Nhận diện khuôn mặt chấm công
InsightFace (buffalo_sc) → embedding ArcFace → cosine similarity với ảnh mẫu.
Trước khi so khớp có kiểm tra chất lượng khung hình (đủ nét, có mặt, mặt đủ lớn).
LƯU Ý: đây KHÔNG phải chống giả mạo (anti-spoofing) — ảnh/video phát lại vẫn có thể qua.
"""
import base64
import hashlib
import io
import threading
from collections import OrderedDict

import cv2
import numpy as np
from PIL import Image

from insightface.app import FaceAnalysis

# Ảnh lớn hơn được thu nhỏ trước khi nhận diện (ảnh điện thoại 12MP xử lý rất chậm)
MAX_SIDE = 800
# Mặt khi chấm công/ảnh thẻ luôn lớn → khung dò 320 đủ chính xác, nhanh hơn ~3-4 lần so với 640
DET_SIZE = (320, 320)
# Ngưỡng chấp nhận trên thang phần trăm hiển thị (xem similarity_percent): 70% ⇔ cosine 0.445
NGUONG_KHOP_PCT = 70.0

# ─── Khởi tạo InsightFace ───────────────────────────────────────────────────

_face_app = None
_face_app_lock = threading.Lock()


def get_face_app():
    """Nạp model 1 lần (gọi sẵn lúc khởi động service, có khóa để request đồng thời không nạp trùng)."""
    global _face_app
    with _face_app_lock:
        if _face_app is None:
            app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
            app.prepare(ctx_id=0, det_size=DET_SIZE)
            app.get(np.zeros((DET_SIZE[1], DET_SIZE[0], 3), dtype=np.uint8))  # chạy thử 1 lần để khởi tạo ONNX
            _face_app = app
    return _face_app


def decode_base64_image(b64_str: str) -> np.ndarray:
    """Giải mã base64 -> OpenCV BGR image."""
    data = b64_str
    for prefix in ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,']:
        data = data.replace(prefix, '')
    pil_img = Image.open(io.BytesIO(base64.b64decode(data)))
    pil_img.draft('RGB', (MAX_SIDE, MAX_SIDE))  # JPEG: giải mã thẳng ở kích thước nhỏ, nhanh hơn nhiều
    return cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)


def get_face_info(img_bgr: np.ndarray):
    """Lấy thông tin khuôn mặt (det_score, kps, embedding). Trả về None nếu không thấy mặt."""
    h, w = img_bgr.shape[:2]
    if max(h, w) > MAX_SIDE:
        scale = MAX_SIDE / max(h, w)
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    faces = get_face_app().get(img_bgr)
    if not faces:
        return None
    return max(faces, key=lambda f: f.det_score)


# ─── Cache kết quả nhận diện ảnh mẫu theo hash nội dung ─────────────────────
# Ảnh mẫu nhân viên ít thay đổi → không chạy lại model mỗi lần quét/đối soát trùng
_FACE_CACHE_MAX = 500
_face_cache: 'OrderedDict[str, object]' = OrderedDict()
_face_cache_lock = threading.Lock()


def get_cached_face(b64: str):
    """Nhận diện ảnh base64 có cache. Trả về face hoặc None; raise nếu ảnh hỏng."""
    key = hashlib.sha1(b64.encode()).hexdigest()
    with _face_cache_lock:
        if key in _face_cache:
            _face_cache.move_to_end(key)
            return _face_cache[key]
    face = get_face_info(decode_base64_image(b64))
    with _face_cache_lock:
        _face_cache[key] = face
        if len(_face_cache) > _FACE_CACHE_MAX:
            _face_cache.popitem(last=False)
    return face


def similarity_percent(a, b) -> tuple[float, float]:
    """
    Trả về (cosine, điểm phần trăm hiển thị) giữa 2 embedding ArcFace.
    Thang hiển thị tuyến tính: cosine 0.20 → 0%, 0.445 → 70% (ngưỡng), 0.55 → 100%.
    """
    cos_sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
    pct = (cos_sim - 0.20) / (0.55 - 0.20) * 100.0
    return cos_sim, round(max(0.0, min(100.0, pct)), 2)


def check_frame_quality(frame_img: np.ndarray) -> dict:
    """
    Kiểm tra khung hình camera dùng được để so khớp:
    đủ nét (Laplacian variance), phát hiện được khuôn mặt, mặt đủ lớn.
    """
    gray = cv2.cvtColor(frame_img, cv2.COLOR_BGR2GRAY)
    if cv2.Laplacian(gray, cv2.CV_64F).var() < 10.0:
        return {'ok': False, 'reason': 'Hình ảnh quá mờ hoặc camera bị che khuất'}

    face_info = get_face_info(frame_img)
    if face_info is None or face_info.det_score < 0.5:
        return {'ok': False, 'reason': 'Không phát hiện khuôn mặt hợp lệ trước camera'}

    bbox = face_info.bbox
    if bbox[2] - bbox[0] < 60 or bbox[3] - bbox[1] < 60:
        return {'ok': False, 'reason': 'Vui lòng lại gần camera hơn để nhận diện'}

    return {'ok': True, 'face': face_info}  # face dùng lại để so khớp, không chạy model lần 2


def verify_face(frame_b64: str, ref_image_base64: str) -> dict:
    """
    Xác thực khuôn mặt:
    1. Kiểm tra khung hình camera có khuôn mặt hợp lệ
    2. Đối sánh với ảnh mẫu nhân viên theo ngưỡng NGUONG_KHOP_PCT
    Trường `liveness` = khung hình có khuôn mặt hợp lệ (giữ tên cũ cho backend).
    """
    def fail(reason: str) -> dict:
        return {'verified': False, 'liveness': False, 'similarity': 0.0, 'reason': reason}

    # ── 1. Ảnh mẫu (có cache embedding) ──
    try:
        ref_face = get_cached_face(ref_image_base64)
    except Exception as e:
        return fail(f'Không thể đọc ảnh mẫu nhân viên: {e}')
    if ref_face is None:
        return fail('Ảnh mẫu trong hệ thống không phát hiện được khuôn mặt')

    # ── 2. Đọc frame camera và kiểm tra chất lượng ──
    try:
        frame_img = decode_base64_image(frame_b64)
    except Exception as e:
        return fail(f'Lỗi giải mã ảnh camera: {e}')

    quality = check_frame_quality(frame_img)
    if not quality['ok']:
        return fail(quality['reason'])

    # ── 3. So khớp khuôn mặt ──
    cos_sim, score_pct = similarity_percent(ref_face.embedding, quality['face'].embedding)
    verified = score_pct >= NGUONG_KHOP_PCT

    return {
        'verified': verified,
        'liveness': True,
        'similarity': score_pct / 100.0,  # dạng thập phân cho backend (vd 0.75)
        'similarity_percent': score_pct,
        'raw_cosine': round(cos_sim, 4),
        'reason': 'OK' if verified else f'Độ khớp khuôn mặt đạt {score_pct}%, chưa đạt yêu cầu ({NGUONG_KHOP_PCT}%)',
    }


def check_duplicate_face(target_image_base64: str, candidate_list: list[dict]) -> dict:
    """
    Kiểm tra tính hợp lệ và chống trùng lặp khuôn mặt:
    1. Ảnh tải lên phải phát hiện được khuôn mặt người rõ nét.
    2. So khớp embedding với từng nhân viên khác trong candidate_list ({id, ho_ten, chuc_vu, anh_base64}).
    """
    try:
        # Có cache: ảnh này sau thành ảnh mẫu, lần đối soát/chấm công sau không phải chạy lại model
        target_face = get_cached_face(target_image_base64)
    except Exception as exc:
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': f'Không thể giải mã ảnh tải lên: {exc}',
        }

    if target_face is None or target_face.det_score < 0.5:
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': 'Không phát hiện rõ khuôn mặt người trong ảnh. Vui lòng chọn ảnh chụp thẳng, rõ nét khuôn mặt.',
        }

    for cand in candidate_list:
        if not cand.get('anh_base64'):
            continue
        try:
            cand_face = get_cached_face(cand['anh_base64'])
        except Exception:
            continue
        if cand_face is None:
            continue

        _, score_pct = similarity_percent(target_face.embedding, cand_face.embedding)
        if score_pct >= NGUONG_KHOP_PCT:
            return {
                'valid_face': True,
                'is_duplicate': True,
                'duplicate_with': {
                    'id': cand.get('id'),
                    'ho_ten': cand.get('ho_ten'),
                    'chuc_vu': cand.get('chuc_vu'),
                },
                'similarity_percent': score_pct,
                'reason': f"Ảnh khuôn mặt này trùng khớp ({score_pct}%) với nhân viên: {cand.get('ho_ten')} ({cand.get('chuc_vu') or 'Nhân viên'}). Mỗi nhân viên phải có khuôn mặt nhận diện riêng biệt.",
            }

    return {
        'valid_face': True,
        'is_duplicate': False,
        'duplicate_with': None,
        'similarity_percent': 0.0,
        'reason': 'Ảnh hợp lệ, khuôn mặt không bị trùng lặp.',
    }
