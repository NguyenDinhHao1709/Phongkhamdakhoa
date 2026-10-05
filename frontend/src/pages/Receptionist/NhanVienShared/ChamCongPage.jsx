import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, XCircle, LogIn, LogOut, Clock, AlertTriangle, Wifi, ShieldCheck, Calendar, AlertCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../../services/api';
import useAuthStore from '../../../store/authStore';

// Số frame cần thu thập cho kiểm tra thực thể sống
const FRAMES_NEEDED = 10;
// Thời gian quét nhận diện (6 giây để người dùng dễ dàng căn chỉnh khuôn mặt)
const CAPTURE_DURATION_SEC = 6;

// Tính thời lượng làm việc chính xác (số giờ, số phút; nếu dưới 1 giờ thì hiện đúng số phút làm)
function tinhThoiLuongLamViec(gioVao, gioRa) {
  if (!gioVao) return '—';
  if (!gioRa) return 'Đang làm việc';

  const [h1, m1] = gioVao.split(':').map(Number);
  const [h2, m2] = gioRa.split(':').map(Number);
  let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMinutes < 0) diffMinutes += 24 * 60;

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }
  return `${mins} phút`;
}

export default function ChamCongPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [mode, setMode] = useState(null); // 'checkin' | 'checkout'
  const [step, setStep] = useState('idle'); // 'idle' | 'capturing' | 'processing' | 'done' | 'error'
  const [countdown, setCountdown] = useState(0);
  const [frames, setFrames] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ─── Lấy trạng thái hôm nay ────────────────────────────────────────────────
  const { data: trangThaiData, refetch: refetchTrangThai } = useQuery({
    queryKey: ['cham-cong-trang-thai'],
    queryFn: () => apiGet('/cham-cong/trang-thai-hom-nay'),
    select: (res) => res?.data?.data || res?.data || null,
  });

  // ─── Lấy IP hiện tại ────────────────────────────────────────────────────────
  const { data: ipData } = useQuery({
    queryKey: ['cham-cong-ip'],
    queryFn: () => apiGet('/cham-cong/ip-hien-tai'),
    select: (res) => res?.data?.data || res?.data || {},
  });

  // ─── Lịch sử 7 ngày ─────────────────────────────────────────────────────────
  const { data: lichSu } = useQuery({
    queryKey: ['cham-cong-lich-su'],
    queryFn: () => apiGet('/cham-cong/lich-su'),
    select: (res) => res?.data?.data || res?.data || [],
  });

  // ─── Mutation check-in / check-out ──────────────────────────────────────────
  const chamCongMutation = useMutation({
    mutationFn: ({ endpoint, frameBase64, framesB64 }) =>
      apiPost(endpoint, { frameBase64, framesB64 }),
    onSuccess: (res) => {
      setResult(res?.data?.data || res?.data || res);
      setStep('done');
      queryClient.invalidateQueries(['cham-cong-trang-thai']);
      queryClient.invalidateQueries(['cham-cong-lich-su']);
      stopCamera();
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || (typeof err === 'string' ? err : 'Xác thực thất bại');
      setErrorMsg(msg);
      setStep('error');
      stopCamera();
    },
  });

  // ─── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setCameraError(null);
    } catch (err) {
      setCameraError('Không thể mở camera: ' + err.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Chụp frame từ video ─────────────────────────────────────────────────────
  const captureFrame = useCallback((targetW = 640, targetH = 480, quality = 0.8) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext('2d').drawImage(video, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  // ─── Bắt đầu quy trình chấm công ─────────────────────────────────────────────
  const batDauChamCong = useCallback(async (loai) => {
    setMode(loai);
    setStep('capturing');
    setFrames([]);
    setResult(null);
    setErrorMsg('');
    await startCamera();

    let collectedFrames = [];
    let cd = CAPTURE_DURATION_SEC;
    setCountdown(cd);

    const cdInterval = setInterval(() => {
      cd--;
      setCountdown(cd);
    }, 1000);

    captureIntervalRef.current = setInterval(() => {
      const frame = captureFrame(320, 240, 0.6);
      if (frame) collectedFrames.push(frame);
    }, Math.floor((CAPTURE_DURATION_SEC * 1000) / FRAMES_NEEDED));

    setTimeout(async () => {
      clearInterval(captureIntervalRef.current);
      clearInterval(cdInterval);
      setCountdown(0);
      setStep('processing');

      // Frame chất lượng cao để đối sánh khuôn mặt
      const finalFrame = captureFrame(640, 480, 0.85);
      setFrames(collectedFrames);

      const endpoint = loai === 'checkin' ? '/cham-cong/check-in' : '/cham-cong/check-out';
      chamCongMutation.mutate({
        endpoint,
        frameBase64: finalFrame,
        framesB64: collectedFrames,
      });
    }, CAPTURE_DURATION_SEC * 1000);
  }, [startCamera, captureFrame, chamCongMutation]);

  const reset = () => {
    setStep('idle');
    setMode(null);
    setResult(null);
    setErrorMsg('');
    setFrames([]);
    stopCamera();
  };

  const trangThai = trangThaiData;
  const daCheckIn = !!trangThai?.gioVao;
  const daCheckOut = !!trangThai?.gioRa;
  const coLich = trangThai?.coLichHomNay ?? true;

  const trangThaiLabel = {
    dung_gio: { text: 'Đúng giờ', color: 'text-green-600 bg-green-50' },
    di_muon: { text: 'Đi muộn', color: 'text-yellow-600 bg-yellow-50' },
    ve_som: { text: 'Về sớm', color: 'text-orange-600 bg-orange-50' },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Camera className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Chấm Công Khuôn Mặt</h1>
        </div>
      </div>

      {/* IP & WiFi Status */}
      <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
        <Wifi className="h-5 w-5 text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700">IP hiện tại của bạn</p>
          <p className="text-xs text-gray-500 font-mono">{ipData?.ip || '...'}</p>
        </div>
      </div>

      {/* Trạng thái hôm nay */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" /> Hôm nay
        </h2>

        {/* Lịch làm việc hôm nay */}
        {coLich ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm mb-1.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Lịch phân ca hôm nay ({trangThai?.soCaHomNay || trangThai?.danhSachCa?.length || 1} ca):</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {trangThai?.danhSachCa && trangThai.danhSachCa.length > 0 ? (
                trangThai.danhSachCa.map((ca) => (
                  <span key={ca.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-blue-700 border border-blue-200 shadow-sm">
                    {ca.ten_ca}: {ca.gio_bat_dau?.slice(0, 5)} - {ca.gio_ket_thuc?.slice(0, 5)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-blue-600">Đã phân ca làm việc</span>
              )}
            </div>
            {trangThai?.soCaHomNay > 1 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                💡 Trong ngày có làm nhiều ca — chỉ cần 1 lần Check-in đầu ca sáng và 1 lần Check-out cuối ngày.
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Hôm nay bạn không có lịch phân ca làm việc</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Hệ thống chỉ cho phép chấm công đối với nhân viên có ca trực được phân công trong ngày.
              </p>
            </div>
          </div>
        )}

        {/* Cảnh báo chưa có ảnh khuôn mặt mẫu do Admin đăng ký */}
        {trangThai && trangThai.coAnhMau === false && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Chưa có ảnh khuôn mặt mẫu trong hệ thống</p>
              <p className="text-xs text-rose-700 mt-0.5">
                Chỉ Quản trị viên (Admin) mới có quyền cập nhật ảnh nhận diện khuôn mặt cho nhân viên. Vui lòng liên hệ Admin để cập nhật ảnh đại diện mẫu trước khi chấm công.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-lg p-3 text-center ${daCheckIn ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border'}`}>
            <p className="text-xs text-gray-500 mb-1">Check-in</p>
            <p className={`font-bold text-lg ${daCheckIn ? 'text-green-600' : 'text-gray-400'}`}>
              {trangThai?.gioVao ? trangThai.gioVao.slice(0, 5) : '—'}
            </p>
            {trangThai?.trangThai && trangThaiLabel[trangThai.trangThai] && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trangThaiLabel[trangThai.trangThai].color}`}>
                {trangThaiLabel[trangThai.trangThai].text}
              </span>
            )}
          </div>
          <div className={`rounded-lg p-3 text-center ${daCheckOut ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border'}`}>
            <p className="text-xs text-gray-500 mb-1">Check-out</p>
            <p className={`font-bold text-lg ${daCheckOut ? 'text-blue-600' : 'text-gray-400'}`}>
              {trangThai?.gioRa ? trangThai.gioRa.slice(0, 5) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Nút bấm chấm công */}
      {step === 'idle' && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => batDauChamCong('checkin')}
            disabled={!coLich || daCheckIn || (trangThai && trangThai.coAnhMau === false)}
            className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all font-semibold
              ${(!coLich || daCheckIn || (trangThai && trangThai.coAnhMau === false))
                ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:shadow-md active:scale-95'
              }`}
          >
            <LogIn className="h-8 w-8" />
            <span>Check-in vào ca</span>
            {daCheckIn && <span className="text-xs font-normal">Đã check-in ({trangThai?.gioVao?.slice(0,5)})</span>}
            {trangThai && trangThai.coAnhMau === false && <span className="text-xs font-normal text-rose-600">Chưa có ảnh mẫu (Liên hệ Admin)</span>}
            {!coLich && <span className="text-xs font-normal">Không có lịch làm</span>}
          </button>

          <button
            onClick={() => batDauChamCong('checkout')}
            disabled={!coLich || !daCheckIn || daCheckOut || (trangThai && trangThai.coAnhMau === false)}
            className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all font-semibold
              ${(!coLich || !daCheckIn || daCheckOut || (trangThai && trangThai.coAnhMau === false))
                ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:shadow-md active:scale-95'
              }`}
          >
            <LogOut className="h-8 w-8" />
            <span>Check-out hết ca</span>
            {daCheckOut && <span className="text-xs font-normal">Đã check-out ({trangThai?.gioRa?.slice(0,5)})</span>}
            {trangThai && trangThai.coAnhMau === false && <span className="text-xs font-normal text-rose-600">Chưa có ảnh mẫu (Liên hệ Admin)</span>}
            {!daCheckIn && coLich && !(trangThai && trangThai.coAnhMau === false) && <span className="text-xs font-normal">Cần check-in trước</span>}
            {!coLich && <span className="text-xs font-normal">Không có lịch làm</span>}
          </button>
        </div>
      )}

      {/* Camera + Capturing */}
      {(step === 'capturing' || step === 'processing') && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

            {/* Overlay khung quét khuôn mặt */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-56 border-4 border-white/80 rounded-full shadow-lg" style={{ boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)' }} />
            </div>

            {/* Countdown */}
            {step === 'capturing' && countdown > 0 && (
              <div className="absolute top-4 right-4 bg-black/60 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                {countdown}
              </div>
            )}

            {/* Processing overlay */}
            {step === 'processing' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white font-medium">Đang đối sánh khuôn mặt...</p>
              </div>
            )}
          </div>

          {step === 'capturing' && (
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <div className="flex items-center gap-2.5 text-blue-700">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold">
                    Đang quét xác thực thực thể sống
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Vui lòng nhìn thẳng vào camera và giữ yên khuôn mặt trong khung hình
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((CAPTURE_DURATION_SEC - countdown) / CAPTURE_DURATION_SEC) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-500 mt-1.5 text-right font-medium">
                {countdown > 0 ? `Đang nhận diện... (${countdown}s)` : 'Đang xử lý kết quả...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Kết quả thành công */}
      {step === 'done' && result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <h3 className="text-lg font-bold text-green-800">
            {mode === 'checkin' ? 'Check-in thành công!' : 'Check-out thành công!'}
          </h3>
          <div className="text-sm text-green-700 space-y-1">
            {result.gioVao && <p>🕐 Giờ vào: <strong>{result.gioVao?.slice(0,5)}</strong></p>}
            {result.gioRa  && <p>🕐 Giờ ra: <strong>{result.gioRa?.slice(0,5)}</strong></p>}
            {result.thongBao && (
              <p className="text-xs text-green-800 bg-green-100/70 p-2.5 rounded-lg mt-2 font-medium">
                {result.thongBao}
              </p>
            )}
            {result.trangThai === 'di_muon' && (
              <p className="text-yellow-700 font-medium">⚠️ Đi muộn so với ca trực</p>
            )}
          </div>
          <button
            onClick={reset}
            className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Xong
          </button>
        </div>
      )}

      {/* Kết quả lỗi */}
      {step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <XCircle className="h-14 w-14 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-red-800">Xác thực thất bại</h3>
          <p className="text-sm text-red-700">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-2 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Lỗi camera */}
      {cameraError && step === 'idle' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-orange-700">{cameraError}</p>
        </div>
      )}

      {/* Canvas ẩn để capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Lịch sử chấm công */}
      {lichSu && lichSu.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Lịch sử chấm công</h2>
          <div className="space-y-2">
            {lichSu.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b last:border-0 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(item.ngayCham).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </p>
                  {item.caLamViec && (
                    <p className="text-xs text-gray-400 truncate">{item.caLamViec.tenCa}</p>
                  )}
                </div>

                <div className="text-center px-2">
                  <p className="text-[11px] text-gray-400 font-medium">Thời gian</p>
                  <div className="text-sm font-medium">
                    <span className="text-green-600">{item.gioVao?.slice(0, 5) || '—'}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="text-blue-600">{item.gioRa?.slice(0, 5) || '—'}</span>
                  </div>
                </div>

                <div className="text-center px-2">
                  <p className="text-[11px] text-gray-400 font-medium">Thời lượng làm</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                    !item.gioRa && item.gioVao
                      ? 'bg-blue-50 text-blue-700 animate-pulse border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {tinhThoiLuongLamViec(item.gioVao, item.gioRa)}
                  </span>
                </div>

                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.trangThai === 'dung_gio' ? 'bg-green-100 text-green-700' :
                    item.trangThai === 'di_muon'  ? 'bg-yellow-100 text-yellow-700' :
                    item.trangThai === 've_som'   ? 'bg-orange-100 text-orange-700' :
                    item.trangThai === 'nghi_phep' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.trangThai === 'dung_gio' ? 'Đúng giờ' :
                     item.trangThai === 'di_muon'  ? 'Đi muộn' :
                     item.trangThai === 've_som'   ? 'Về sớm' :
                     item.trangThai === 'nghi_phep' ? 'Nghỉ phép' : item.trangThai}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
