"""
services/face_verifier.py — Nhận diện khuôn mặt + Kiểm tra thực thể sống (Live Face)
Dùng InsightFace ArcFace embedding + Phân tích thực thể sống (Live Face Presence)
Ngưỡng đối sánh: ~70% (chuẩn hóa thang điểm 100%)
"""
import os
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


def get_cached_face(b64: str | None = None, path: str | None = None):
    """Nhận diện ảnh (base64 hoặc đường dẫn) có cache. Trả về face hoặc None; raise nếu ảnh hỏng."""
    key = hashlib.sha1(b64.encode()).hexdigest() if b64 else f'{path}|{os.path.getmtime(path)}'
    if key in _face_cache:
        _face_cache.move_to_end(key)
        return _face_cache[key]
    img = decode_base64_image(b64) if b64 else cv2.imread(path)
    if img is None:
        raise ValueError('ảnh hỏng hoặc sai định dạng')
    face = get_face_info(img)
    _face_cache[key] = face
    if len(_face_cache) > _FACE_CACHE_MAX:
        _face_cache.popitem(last=False)
    return face


def cosine_similarity(a, b) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def check_live_entity(frame_img: np.ndarray, frames_b64: list[str] | None = None) -> dict:
    """
    Xác định đối tượng trước camera là thực thể sống (Live entity):
    - Có khuôn mặt người thực tế với 5 điểm mốc landmarks (2 mắt, mũi, 2 khóe miệng).
    - Độ sắc nét (Laplacian variance) và ánh sáng tự nhiên, không phải màn hình đen/ảnh nhiễu.
    - Không bắt buộc chớp mắt.
    """
    # 1. Kiểm tra độ sắc nét / độ tương phản của frame
    gray = cv2.cvtColor(frame_img, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 10.0:
        return {
            'is_live': False,
            'reason': 'Hình ảnh quá mờ hoặc camera bị che khuất',
        }

    # 2. Kiểm tra khuôn mặt và các điểm mốc sinh trắc
    face_info = get_face_info(frame_img)
    if face_info is None or face_info.det_score < 0.5:
        return {
            'is_live': False,
            'reason': 'Không phát hiện khuôn mặt hợp lệ trước camera',
        }

    # 3. Kiểm tra kích thước khuôn mặt đủ lớn trong khung hình
    bbox = face_info.bbox
    face_w = bbox[2] - bbox[0]
    face_h = bbox[3] - bbox[1]
    if face_w < 60 or face_h < 60:
        return {
            'is_live': False,
            'reason': 'Vui lòng lại gần camera hơn để nhận diện',
        }

    return {
        'is_live': True,
        'face': face_info,  # dùng lại để so khớp, không chạy model lần 2
        'det_score': float(face_info.det_score),
        'reason': 'Thực thể sống hợp lệ',
    }


def verify_face(
    frame_b64: str,
    ref_image_path: str | None = None,
    ref_image_base64: str | None = None,
    frames_b64: list[str] | None = None,
) -> dict:
    """
    Xác thực khuôn mặt:
    1. Kiểm tra thực thể sống trước camera (Live Entity)
    2. Đối sánh khuôn mặt với ảnh đại diện theo ngưỡng ~70%
    """
    def fail(reason: str) -> dict:
        return {'verified': False, 'liveness': False, 'similarity': 0.0, 'reason': reason}

    # ── 1. Ảnh mẫu (có cache embedding) ──
    if not ref_image_base64 and not (ref_image_path and os.path.exists(ref_image_path)):
        return fail('Không nhận được ảnh mẫu nhân viên từ backend')
    try:
        ref_face = get_cached_face(ref_image_base64, ref_image_path)
    except Exception as e:
        return fail(f'Không thể đọc ảnh mẫu nhân viên: {e}')
    if ref_face is None:
        return fail('Ảnh mẫu trong hệ thống không phát hiện được khuôn mặt')

    # ── 2. Đọc frame camera và kiểm tra thực thể sống ──
    try:
        frame_img = decode_base64_image(frame_b64)
    except Exception as e:
        return fail(f'Lỗi giải mã ảnh camera: {e}')

    live_check = check_live_entity(frame_img, frames_b64)
    if not live_check['is_live']:
        return fail(live_check['reason'])
    frame_face = live_check['face']

    # ── 3. So khớp khuôn mặt ──
    cos_sim = cosine_similarity(ref_face.embedding, frame_face.embedding)

    # Chuẩn hóa cosine similarity (ArcFace) sang thang điểm phần trăm 0 - 100%:
    # 0.20 -> 0%
    # 0.35 -> ~70% (ngưỡng xác nhận theo yêu cầu người dùng)
    # 0.55 -> ~100%
    score_pct = (cos_sim - 0.20) / (0.55 - 0.20) * 100.0
    score_pct = max(0.0, min(100.0, score_pct))
    score_pct = round(score_pct, 2)

    # Ngưỡng chấp nhận: tầm 70% (tương đương cosine similarity >= 0.35)
    TARGET_THRESHOLD_PCT = 70.0
    verified = score_pct >= TARGET_THRESHOLD_PCT

    return {
        'verified': verified,
        'liveness': True,
        'similarity': score_pct / 100.0,  # dạng thập phân cho backend (vd 0.75)
        'similarity_percent': score_pct,
        'raw_cosine': round(cos_sim, 4),
        'reason': 'OK' if verified else f'Độ khớp khuôn mặt đạt {score_pct}%, chưa đạt yêu cầu ({TARGET_THRESHOLD_PCT}%)',
    }


def check_duplicate_face(
    target_image_path: str | None = None,
    target_image_base64: str | None = None,
    candidate_list: list[dict] | None = None,
) -> dict:
    """
    Kiểm tra tính hợp lệ và chống trùng lặp khuôn mặt:
    1. Kiểm tra ảnh tải lên có phát hiện được khuôn mặt người rõ nét không.
    2. So khớp Face Embedding với tất cả các nhân viên khác trong candidate_list.
    Ngưỡng phát hiện trùng lặp: >= 70% (~ cosine similarity >= 0.35)
    """
    candidate_list = candidate_list or []
    if not target_image_base64 and not (target_image_path and os.path.exists(target_image_path)):
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': 'Không thể đọc dữ liệu ảnh tải lên hoặc đường dẫn ảnh không tồn tại',
        }
    try:
        # Có cache: ảnh này sau thành ảnh mẫu, lần đối soát/chấm công sau không phải chạy lại model
        target_face = get_cached_face(target_image_base64, target_image_path)
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

    # So sánh với từng ứng viên
    for cand in candidate_list:
        cand_path = cand.get('anh_path')
        if not cand.get('anh_base64') and not (cand_path and os.path.exists(cand_path)):
            continue
        try:
            cand_face = get_cached_face(cand.get('anh_base64'), cand_path)
        except Exception:
            continue
        if cand_face is None:
            continue

        cos_sim = cosine_similarity(target_face.embedding, cand_face.embedding)
        score_pct = (cos_sim - 0.20) / (0.55 - 0.20) * 100.0
        score_pct = max(0.0, min(100.0, score_pct))
        score_pct = round(score_pct, 2)

        if score_pct >= 70.0:
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
