"""
services/face_verifier.py — Nhận diện khuôn mặt chấm công
InsightFace (buffalo_sc) → embedding ArcFace → cosine similarity với ảnh mẫu.

Chống giả mạo bằng thử thách quay đầu, đo THỊ SAI của mũi: hai mắt và hai khóe miệng gần như đồng phẳng,
còn mũi nhô ra trước. Khi đầu thật quay, mũi dịch chuyển so với mặt phẳng mắt–miệng; với ảnh in / ảnh trên
điện thoại (mặt phẳng), mọi điểm đi theo cùng một phép chiếu nên mũi không lệch dù nghiêng ảnh thế nào.
Giới hạn: chặn được ảnh tĩnh, KHÔNG chặn được video quay sẵn cảnh người đó quay đầu.
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

# Đổi model thì embedding đã lưu trong bảng nhan_vien_khuon_mat hết dùng được → TRUNCATE bảng đó
MODEL_NAME = 'buffalo_sc'
# Ảnh lớn hơn được thu nhỏ trước khi nhận diện (ảnh điện thoại 12MP xử lý rất chậm)
MAX_SIDE = 800
# Mặt khi chấm công/ảnh thẻ luôn lớn → khung dò 320 đủ chính xác, nhanh hơn ~3-4 lần so với 640
DET_SIZE = (320, 320)
# Ngưỡng chấp nhận trên thang phần trăm hiển thị (xem similarity_percent): 70% ⇔ cosine 0.445.
# Đo lại bằng scripts/calibrate_face_threshold.py trước khi đổi.
NGUONG_KHOP_PCT = 70.0

# ─── Thử thách quay đầu ─────────────────────────────────────────────────────
SO_FRAME_TOI_THIEU = 5      # số khung hình phải thấy rõ mặt
# Thị sai mũi tối thiểu (đơn vị: khoảng cách hai mắt), xem thi_sai_mui(). Thực nghiệm (README): ảnh phẳng nghiêng
# tới ±40° không vượt 0.22; mặt thật quay ~26° đo được 0.24, ~32° đo được 0.62 → người dùng cần quay khoảng 30°.
NGUONG_QUAY_DAU = 0.22
# Khung "nhìn thẳng" phải có độ lệch mũi (do_lech_mui) trong khoảng này; ảnh chấm công thật đo được ≤ 0.12
NGUONG_NHIN_THANG = 0.15
# Mọi khung hình phải cùng một người với khung nhìn thẳng (chống tráo ảnh giữa chừng). Ngưỡng lỏng
# vì mặt nghiêng làm giảm độ khớp; hai người khác nhau thường < 0.2.
NGUONG_CUNG_NGUOI = 0.20

# ─── Khởi tạo InsightFace ───────────────────────────────────────────────────

_face_app = None
_face_app_lock = threading.Lock()


def get_face_app():
    """Nạp model 1 lần (gọi sẵn lúc khởi động service, có khóa để request đồng thời không nạp trùng)."""
    global _face_app
    with _face_app_lock:
        if _face_app is None:
            app = FaceAnalysis(name=MODEL_NAME, providers=['CPUExecutionProvider'])
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


def cosine(a, b) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def similarity_percent(cos_sim: float) -> float:
    """Thang hiển thị tuyến tính: cosine 0.20 → 0%, 0.445 → 70% (ngưỡng), 0.55 → 100%."""
    return round(max(0.0, min(100.0, (cos_sim - 0.20) / (0.55 - 0.20) * 100.0)), 2)


def mat_hop_le(face) -> bool:
    """Phát hiện chắc chắn và mặt đủ lớn (≥ 60px) để so khớp."""
    if face is None or face.det_score < 0.5:
        return False
    return face.bbox[2] - face.bbox[0] >= 60 and face.bbox[3] - face.bbox[1] >= 60


def do_lech_mui(face) -> float:
    """
    Vị trí mũi so với trung điểm hai mắt, chiếu lên trục nối hai mắt, chia cho khoảng cách hai mắt.
    ≈ 0 khi nhìn thẳng; đổi dấu theo hướng quay đầu. Chiếu lên trục mắt nên không bị ảnh hưởng khi nghiêng đầu.
    """
    mat_trai, mat_phai, mui = face.kps[0], face.kps[1], face.kps[2]
    truc = mat_phai - mat_trai
    kc_mat = float(np.linalg.norm(truc)) + 1e-9
    return float(np.dot(mui - (mat_trai + mat_phai) / 2, truc / kc_mat) / kc_mat)


def thi_sai_mui(face, moc) -> float:
    """
    Thị sai của mũi giữa `face` và khung mốc `moc`: dựng phép chiếu phẳng (homography) đưa 2 mắt + 2 khóe miệng
    của `face` về đúng vị trí ở `moc`, áp lên mũi rồi đo khoảng lệch so với mũi ở `moc` (chia khoảng cách hai mắt).
    Vật phẳng → ≈ 0 với mọi góc nghiêng; đầu thật quay góc θ → xấp xỉ 0.45·sin θ.
    """
    mat_phang = [0, 1, 3, 4]
    H = cv2.getPerspectiveTransform(face.kps[mat_phang].astype(np.float32), moc.kps[mat_phang].astype(np.float32))
    mui = cv2.perspectiveTransform(face.kps[2].reshape(1, 1, 2).astype(np.float32), H)[0, 0]
    return float(np.linalg.norm(mui - moc.kps[2]) / (np.linalg.norm(moc.kps[1] - moc.kps[0]) + 1e-9))


def danh_gia_quay_dau(faces: list) -> dict:
    """
    Đánh giá thử thách quay đầu trên danh sách (vị trí khung hình, face). Đạt khi:
    1. Thấy rõ mặt ở ít nhất SO_FRAME_TOI_THIEU khung hình
    2. Có khung nhìn thẳng (làm mốc đo và để so khớp với ảnh mẫu)
    3. Ít nhất 2 khung có thị sai mũi so với khung nhìn thẳng ≥ NGUONG_QUAY_DAU (đầu thật quay, không phải ảnh phẳng)
    4. Mọi khung hình là cùng một người
    """
    if len(faces) < SO_FRAME_TOI_THIEU:
        return {'ok': False, 'reason': 'Không thấy rõ khuôn mặt trong lúc quét. Vui lòng lại gần camera, đủ ánh sáng và thử lại.'}

    index, thang = min(faces, key=lambda f: abs(do_lech_mui(f[1])))
    if abs(do_lech_mui(thang)) > NGUONG_NHIN_THANG:
        return {'ok': False, 'reason': 'Vui lòng nhìn thẳng vào camera lúc bắt đầu, sau đó mới quay đầu sang một bên.'}

    # Lấy giá trị lớn nhì: một khung hình nhiễu đơn lẻ không đủ để qua
    bien_do = sorted(thi_sai_mui(face, thang) for _, face in faces)[-2]
    if bien_do < NGUONG_QUAY_DAU:
        return {
            'ok': False,
            'bien_do_quay_dau': round(bien_do, 3),
            'reason': 'Chưa nhận thấy chuyển động quay đầu. Vui lòng nhìn thẳng rồi quay đầu sang một bên (khoảng 30°) trong lúc quét.',
        }

    if any(cosine(thang.embedding, face.embedding) < NGUONG_CUNG_NGUOI for _, face in faces):
        return {'ok': False, 'reason': 'Khuôn mặt thay đổi trong lúc quét. Vui lòng chỉ để một người trước camera và thử lại.'}

    return {'ok': True, 'face': thang, 'frame_index': index, 'bien_do_quay_dau': round(bien_do, 3)}


def check_head_turn(frames_b64: list[str]) -> dict:
    """Giải mã chuỗi khung hình, giữ các khung thấy rõ mặt rồi đánh giá thử thách quay đầu."""
    faces = []
    for i, b64 in enumerate(frames_b64):
        try:
            face = get_face_info(decode_base64_image(b64))
        except Exception:
            continue
        if mat_hop_le(face):
            faces.append((i, face))
    return danh_gia_quay_dau(faces)


def verify_face(
    frames_b64: list[str],
    ref_image_base64: str | None = None,
    ref_embedding: list[float] | None = None,
) -> dict:
    """
    Xác thực khuôn mặt chấm công: thử thách quay đầu trên `frames_b64` rồi so khớp khung nhìn thẳng với mẫu.
    Mẫu: `ref_embedding` (đã lưu trong CSDL) hoặc `ref_image_base64` (khi đó trả kèm `ref_embedding` để lưu lại).
    `liveness` = thử thách quay đầu đạt.
    """
    def fail(reason: str) -> dict:
        return {'verified': False, 'liveness': False, 'similarity': 0.0, 'reason': reason}

    # ── 1. Mẫu khuôn mặt nhân viên ──
    ket_qua = {}
    if ref_embedding:
        mau = np.asarray(ref_embedding, dtype=np.float32)
    elif ref_image_base64:
        try:
            ref_face = get_cached_face(ref_image_base64)
        except Exception as e:
            return fail(f'Không thể đọc ảnh mẫu nhân viên: {e}')
        if ref_face is None:
            return fail('Ảnh mẫu trong hệ thống không phát hiện được khuôn mặt')
        mau = ref_face.embedding
        ket_qua['ref_embedding'] = [round(float(x), 6) for x in mau]
    else:
        return fail('Không nhận được mẫu khuôn mặt nhân viên từ backend')

    # ── 2. Thử thách quay đầu ──
    camera = check_head_turn(frames_b64)
    ket_qua['bien_do_quay_dau'] = camera.get('bien_do_quay_dau')  # số đo thử thách quay đầu (để hiệu chỉnh)
    if not camera['ok']:
        return {**fail(camera['reason']), **ket_qua}

    # ── 3. So khớp khuôn mặt ──
    cos_sim = cosine(mau, camera['face'].embedding)
    score_pct = similarity_percent(cos_sim)
    verified = score_pct >= NGUONG_KHOP_PCT

    return {
        **ket_qua,
        'verified': verified,
        'liveness': True,
        'frame_index': camera['frame_index'],  # khung hình đã dùng để so khớp
        'similarity': score_pct / 100.0,  # dạng thập phân cho backend (vd 0.75)
        'similarity_percent': score_pct,
        'raw_cosine': round(cos_sim, 4),
        'reason': 'OK' if verified else f'Độ khớp khuôn mặt đạt {score_pct}%, chưa đạt yêu cầu ({NGUONG_KHOP_PCT}%)',
    }


def check_duplicate_face(target_image_base64: str, candidate_list: list[dict]) -> dict:
    """
    Kiểm tra tính hợp lệ và chống trùng lặp khuôn mặt:
    1. Ảnh tải lên phải phát hiện được khuôn mặt người rõ nét.
    2. So khớp với từng nhân viên khác trong candidate_list:
       {id, ho_ten, chuc_vu, embedding (đã lưu) hoặc anh_base64}.
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
        if cand.get('embedding'):
            cand_embedding = np.asarray(cand['embedding'], dtype=np.float32)
        elif cand.get('anh_base64'):
            try:
                cand_face = get_cached_face(cand['anh_base64'])
            except Exception:
                continue
            if cand_face is None:
                continue
            cand_embedding = cand_face.embedding
        else:
            continue

        score_pct = similarity_percent(cosine(target_face.embedding, cand_embedding))
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
