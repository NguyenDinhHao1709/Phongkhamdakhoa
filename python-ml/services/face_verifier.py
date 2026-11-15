"""
services/face_verifier.py — Nhận diện khuôn mặt chấm công
InsightFace (buffalo_sc) → embedding ArcFace → cosine similarity với ảnh mẫu.

Chống giả mạo bằng thử thách nháy mắt: model 106 điểm mốc (2d106det) đo khe mí mắt trên mỗi khung hình,
chia cho khoảng cách mắt–miệng. Ảnh in / ảnh trên điện thoại có độ mở mắt không đổi (nghiêng, xoay ảnh thì khe mí
và khoảng mắt–miệng co giãn cùng tỉ lệ), mặt thật nháy mắt thì độ mở tụt mạnh trong một vài khung.
Giới hạn: chặn được ảnh tĩnh, KHÔNG chặn được video quay sẵn cảnh người đó nháy mắt.
"""
import base64
import hashlib
import io
import threading
from collections import OrderedDict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from insightface.app import FaceAnalysis
from insightface.app.common import Face
from insightface.model_zoo import get_model

# Đổi model thì embedding đã lưu trong bảng nhan_vien_khuon_mat hết dùng được → TRUNCATE bảng đó
MODEL_NAME = 'buffalo_sc'
# Ảnh lớn hơn được thu nhỏ trước khi nhận diện (ảnh điện thoại 12MP xử lý rất chậm)
MAX_SIDE = 800
# Mặt khi chấm công/ảnh thẻ luôn lớn → khung dò 320 đủ chính xác, nhanh hơn ~3-4 lần so với 640
DET_SIZE = (320, 320)
# Ngưỡng chấp nhận trên thang phần trăm hiển thị (xem similarity_percent): 70% ⇔ cosine 0.445.
# Đo lại bằng scripts/calibrate_face_threshold.py trước khi đổi.
NGUONG_KHOP_PCT = 70.0

# ─── Thử thách nháy mắt ─────────────────────────────────────────────────────
# Model 106 điểm mốc lấy từ gói buffalo_l của InsightFace (buffalo_sc chỉ có 5 điểm, không có mí mắt)
LANDMARK_MODEL_PATH = Path(__file__).resolve().parent.parent / 'models' / '2d106det.onnx'
# Cặp điểm (mí trên, mí dưới) của hai mắt trong bộ 106 điểm
CAP_MI_MAT = [(41, 36), (40, 33), (42, 37), (95, 90), (94, 87), (96, 91)]
SO_FRAME_TOI_THIEU = 8      # số khung hình phải thấy rõ mặt
# Nháy mắt đạt khi độ mở mắt nhỏ nhất ≤ tỉ lệ này × độ mở lúc mở mắt. Thực nghiệm (README): video nháy mắt thật
# xuống 0.25–0.45; video người nói chuyện không nháy và ảnh phẳng nghiêng/xoay không xuống dưới 0.7.
NGUONG_NHAM_MAT = 0.55
# Khung dùng để so khớp phải đang mở mắt (≥ tỉ lệ này × độ mở lúc mở mắt)
NGUONG_MO_MAT = 0.8
# Khung "nhìn thẳng" phải có độ lệch mũi (do_lech_mui) trong khoảng này; ảnh chấm công thật đo được ≤ 0.12
NGUONG_NHIN_THANG = 0.15
# Các khung kiểm tra phải cùng một người với khung so khớp (chống tráo ảnh giữa chừng). Ngưỡng lỏng
# vì mặt nhắm mắt làm giảm độ khớp; hai người khác nhau thường < 0.2.
NGUONG_CUNG_NGUOI = 0.20
SO_KHUNG_KIEM_TRA_NGUOI = 6  # số khung rải đều được tính embedding để kiểm tra cùng người (ngoài khung nhắm mắt)

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


_landmark_model = None


def get_landmark_model():
    """Model 106 điểm mốc cho thử thách nháy mắt (nạp 1 lần)."""
    global _landmark_model
    with _face_app_lock:
        if _landmark_model is None:
            model = get_model(str(LANDMARK_MODEL_PATH), providers=['CPUExecutionProvider'])
            model.prepare(ctx_id=0)
            _landmark_model = model
    return _landmark_model


def warmup_models():
    get_face_app()
    get_landmark_model()


def decode_base64_image(b64_str: str) -> np.ndarray:
    """Giải mã base64 -> OpenCV BGR image."""
    data = b64_str
    for prefix in ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,']:
        data = data.replace(prefix, '')
    pil_img = Image.open(io.BytesIO(base64.b64decode(data)))
    pil_img.draft('RGB', (MAX_SIDE, MAX_SIDE))  # JPEG: giải mã thẳng ở kích thước nhỏ, nhanh hơn nhiều
    return cv2.cvtColor(np.array(pil_img.convert('RGB')), cv2.COLOR_RGB2BGR)


def thu_nho(img_bgr: np.ndarray) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    if max(h, w) > MAX_SIDE:
        scale = MAX_SIDE / max(h, w)
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img_bgr


def get_face_info(img_bgr: np.ndarray):
    """Lấy thông tin khuôn mặt (det_score, kps, embedding). Trả về None nếu không thấy mặt."""
    faces = get_face_app().get(thu_nho(img_bgr))
    if not faces:
        return None
    return max(faces, key=lambda f: f.det_score)


def get_camera_face(img_bgr: np.ndarray):
    """
    Khuôn mặt trong một khung hình camera: chỉ chạy dò mặt + 106 điểm mốc (`landmark_2d_106`). Embedding ArcFace
    (chậm nhất) để dành tính sau bằng ham_embedding(), vì thử thách nháy mắt cần nhiều khung hình.
    """
    img = thu_nho(img_bgr)
    bboxes, kpss = get_face_app().det_model.detect(img, max_num=0, metric='default')
    if bboxes.shape[0] == 0:
        return None
    i = int(np.argmax(bboxes[:, 4]))
    face = Face(bbox=bboxes[i, 0:4], kps=kpss[i], det_score=bboxes[i, 4])
    get_landmark_model().get(img, face)
    face.img = img
    return face


def ham_embedding(face):
    """Embedding của khuôn mặt; khung camera chưa có thì tính bây giờ (rồi giữ lại)."""
    if getattr(face, 'embedding', None) is None:
        get_face_app().models['recognition'].get(face.img, face)
    return face.embedding


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


def do_mo_mat(face) -> float:
    """
    Khe mí mắt trung bình (6 cặp điểm mí trên – mí dưới của hai mắt) chia cho khoảng cách trung điểm hai mắt –
    trung điểm miệng. Nghiêng / xoay một tấm ảnh phẳng thì tử và mẫu co giãn cùng tỉ lệ nên giá trị gần như không đổi.
    """
    p, k = face.landmark_2d_106, face.kps
    khe = np.mean([np.linalg.norm(p[tren] - p[duoi]) for tren, duoi in CAP_MI_MAT])
    return float(khe / (np.linalg.norm((k[0] + k[1]) / 2 - (k[3] + k[4]) / 2) + 1e-9))


def danh_gia_nhay_mat(faces: list, embedding=ham_embedding) -> dict:
    """
    Đánh giá thử thách nháy mắt trên danh sách (vị trí khung hình, face). Đạt khi:
    1. Thấy rõ mặt ở ít nhất SO_FRAME_TOI_THIEU khung hình
    2. Có khung độ mở mắt ≤ NGUONG_NHAM_MAT × độ mở lúc mở mắt (đã nháy mắt)
    3. Có khung nhìn thẳng, đang mở mắt (làm khung so khớp với ảnh mẫu)
    4. Khung nhắm mắt và các khung rải đều là cùng một người với khung so khớp
    """
    if len(faces) < SO_FRAME_TOI_THIEU:
        return {'ok': False, 'reason': 'Không thấy rõ khuôn mặt trong lúc quét. Vui lòng lại gần camera, đủ ánh sáng và thử lại.'}

    mo = [do_mo_mat(face) for _, face in faces]
    mo_mat = sorted(mo)[-2]  # lấy giá trị lớn nhì: một khung nhiễu đơn lẻ không làm lệch mốc
    vt_nham = int(np.argmin(mo))
    ti_le = round(mo[vt_nham] / (mo_mat + 1e-9), 3)
    if ti_le > NGUONG_NHAM_MAT:
        return {
            'ok': False,
            'ti_le_nham_mat': ti_le,
            'reason': 'Chưa nhận thấy nháy mắt. Vui lòng nhìn thẳng vào camera và nháy mắt chậm 2–3 lần trong lúc quét.',
        }

    vt_thang = min((vt for vt, m in enumerate(mo) if m >= NGUONG_MO_MAT * mo_mat), key=lambda vt: abs(do_lech_mui(faces[vt][1])))
    index, thang = faces[vt_thang]
    if abs(do_lech_mui(thang)) > NGUONG_NHIN_THANG:
        return {'ok': False, 'ti_le_nham_mat': ti_le, 'reason': 'Vui lòng nhìn thẳng vào camera trong lúc quét.'}

    rai_deu = np.linspace(0, len(faces) - 1, SO_KHUNG_KIEM_TRA_NGUOI).round().astype(int).tolist()
    goc = embedding(thang)
    if any(cosine(goc, embedding(faces[vt][1])) < NGUONG_CUNG_NGUOI for vt in {vt_nham, *rai_deu}):
        return {'ok': False, 'ti_le_nham_mat': ti_le, 'reason': 'Khuôn mặt thay đổi trong lúc quét. Vui lòng chỉ để một người trước camera và thử lại.'}

    return {'ok': True, 'face': thang, 'frame_index': index, 'ti_le_nham_mat': ti_le}


def check_blink(frames_b64: list[str]) -> dict:
    """Giải mã chuỗi khung hình, giữ các khung thấy rõ mặt rồi đánh giá thử thách nháy mắt."""
    faces = []
    for i, b64 in enumerate(frames_b64):
        try:
            face = get_camera_face(decode_base64_image(b64))
        except Exception:
            continue
        if mat_hop_le(face):
            faces.append((i, face))
    return danh_gia_nhay_mat(faces)


def verify_face(
    frames_b64: list[str],
    ref_image_base64: str | None = None,
    ref_embedding: list[float] | None = None,
) -> dict:
    """
    Xác thực khuôn mặt chấm công: thử thách nháy mắt trên `frames_b64` rồi so khớp khung nhìn thẳng với mẫu.
    Mẫu: `ref_embedding` (đã lưu trong CSDL) hoặc `ref_image_base64` (khi đó trả kèm `ref_embedding` để lưu lại).
    `liveness` = thử thách nháy mắt đạt.
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

    # ── 2. Thử thách nháy mắt ──
    camera = check_blink(frames_b64)
    ket_qua['ti_le_nham_mat'] = camera.get('ti_le_nham_mat')  # số đo thử thách nháy mắt (để hiệu chỉnh)
    if not camera['ok']:
        return {**fail(camera['reason']), **ket_qua}

    # ── 3. So khớp khuôn mặt ──
    cos_sim = cosine(mau, ham_embedding(camera['face']))
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
