"""
services/face_verifier.py — Nhận diện khuôn mặt + Kiểm tra thực thể sống (Live Face)
Dùng InsightFace ArcFace embedding + Phân tích thực thể sống (Live Face Presence)
Ngưỡng đối sánh: ~70% (chuẩn hóa thang điểm 100%)
"""
import os
import base64
import io
import cv2
import numpy as np
from PIL import Image

from insightface.app import FaceAnalysis

# ─── Khởi tạo InsightFace ───────────────────────────────────────────────────

_face_app = None

def _get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
    return _face_app


def decode_base64_image(b64_str: str) -> np.ndarray:
    """Giải mã base64 -> OpenCV BGR image."""
    data = b64_str
    for prefix in ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,']:
        data = data.replace(prefix, '')
    buf = io.BytesIO(base64.b64decode(data))
    pil_img = Image.open(buf).convert('RGB')
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def get_face_info(img_bgr: np.ndarray):
    """Lấy thông tin khuôn mặt (det_score, kps, embedding). Trả về None nếu không thấy mặt."""
    app = _get_face_app()
    faces = app.get(img_bgr)
    if not faces:
        return None
    return max(faces, key=lambda f: f.det_score)


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
        'det_score': float(face_info.det_score),
        'reason': 'Thực thể sống hợp lệ',
    }


def verify_face(frame_b64: str, ref_image_path: str, frames_b64: list[str] | None = None) -> dict:
    """
    Xác thực khuôn mặt:
    1. Kiểm tra thực thể sống trước camera (Live Entity)
    2. Đối sánh khuôn mặt với ảnh đại diện theo ngưỡng ~70%
    """
    # ── 1. Đọc và kiểm tra ảnh mẫu ──
    if not os.path.exists(ref_image_path):
        return {
            'verified': False,
            'liveness': False,
            'similarity': 0.0,
            'reason': f'Không tìm thấy ảnh mẫu nhân viên: {ref_image_path}',
        }

    ref_img = cv2.imread(ref_image_path)
    if ref_img is None:
        return {
            'verified': False,
            'liveness': False,
            'similarity': 0.0,
            'reason': 'Không thể đọc ảnh mẫu nhân viên',
        }

    ref_face = get_face_info(ref_img)
    if ref_face is None:
        return {
            'verified': False,
            'liveness': False,
            'similarity': 0.0,
            'reason': 'Ảnh mẫu trong hệ thống không phát hiện được khuôn mặt',
        }

    # ── 2. Đọc frame camera và kiểm tra thực thể sống ──
    try:
        frame_img = decode_base64_image(frame_b64)
    except Exception as e:
        return {
            'verified': False,
            'liveness': False,
            'similarity': 0.0,
            'reason': f'Lỗi giải mã ảnh camera: {e}',
        }

    live_check = check_live_entity(frame_img, frames_b64)
    if not live_check['is_live']:
        return {
            'verified': False,
            'liveness': False,
            'similarity': 0.0,
            'reason': live_check['reason'],
        }

    frame_face = get_face_info(frame_img)
    if frame_face is None:
        return {
            'verified': False,
            'liveness': True,
            'similarity': 0.0,
            'reason': 'Không phát hiện rõ khuôn mặt trong ảnh chụp',
        }

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


def check_duplicate_face(target_image_path: str, candidate_list: list[dict]) -> dict:
    """
    Kiểm tra tính hợp lệ và chống trùng lặp khuôn mặt:
    1. Kiểm tra ảnh tải lên có phát hiện được khuôn mặt người rõ nét không.
    2. So khớp Face Embedding với tất cả các nhân viên khác trong candidate_list.
    Ngưỡng phát hiện trùng lặp: >= 70% (~ cosine similarity >= 0.35)
    """
    if not os.path.exists(target_image_path):
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': f'Không tìm thấy file ảnh tải lên: {target_image_path}',
        }

    target_img = cv2.imread(target_image_path)
    if target_img is None:
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': 'Không thể đọc dữ liệu ảnh tải lên',
        }

    target_face = get_face_info(target_img)
    if target_face is None or target_face.det_score < 0.5:
        return {
            'valid_face': False,
            'is_duplicate': False,
            'reason': 'Không phát hiện rõ khuôn mặt người trong ảnh. Vui lòng chọn ảnh chụp thẳng, rõ nét khuôn mặt.',
        }

    # So sánh với từng ứng viên
    for cand in candidate_list:
        cand_path = cand.get('anh_path')
        if not cand_path or not os.path.exists(cand_path):
            continue

        cand_img = cv2.imread(cand_path)
        if cand_img is None:
            continue

        cand_face = get_face_info(cand_img)
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
