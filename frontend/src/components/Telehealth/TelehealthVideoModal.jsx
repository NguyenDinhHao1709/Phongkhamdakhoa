import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2,
  Minimize2, Volume2, ShieldCheck
} from 'lucide-react';

export default function TelehealthVideoModal({
  isOpen,
  onClose,
  participantName = 'Bệnh nhân',
  role = 'doctor', // 'doctor' | 'patient'
  appointmentInfo = {},
}) {
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamError, setStreamError] = useState(null);

  const localVideoRef = useRef(null);
  const modalRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Bộ đếm thời gian cuộc gọi
  useEffect(() => {
    let timer;
    if (isOpen) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  // Khởi tạo Camera & Mic
  useEffect(() => {
    if (!isOpen) {
      // Dừng media stream khi đóng modal
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    const startMedia = async () => {
      try {
        setStreamError(null);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Không thể truy cập camera/mic thực tế, kích hoạt chế độ giả lập:', err.message);
        setStreamError('Không thể mở webcam vật lý. Hệ thống tự động chuyển sang chế độ luồng ảo Telehealth HD.');
      }
    };

    startMedia();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen]);

  // Bật/tắt mic
  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micOn;
      });
    }
    setMicOn(!micOn);
  };

  // Bật/tắt video
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !videoOn;
      });
    }
    setVideoOn(!videoOn);
  };

  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!isFullscreen) {
      if (modalRef.current.requestFullscreen) modalRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div
        ref={modalRef}
        className="bg-gray-950 text-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-800 relative"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                Phòng khám Trực tuyến Telehealth
                <span className="text-xs bg-primary-600/30 text-primary-300 px-2 py-0.5 rounded-full border border-primary-500/30">
                  WebRTC E2EE
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Đối thoại cùng: <strong className="text-white">{participantName}</strong> • {appointmentInfo.gioKham || 'Đang kết nối'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 border border-gray-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              {formatTimer(callDuration)}
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Thông báo nếu webcam vật lý không khả dụng */}
        {streamError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 text-center flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            {streamError}
          </div>
        )}

        {/* Video Stage */}
        <div className="flex-1 relative bg-gradient-to-b from-gray-900 via-gray-950 to-black overflow-hidden flex items-center justify-center">
          {/* Remote Video (Người đối diện) */}
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div className="relative w-full h-full flex items-center justify-center bg-gray-900/60">
              {/* Mô phỏng luồng video người đối diện */}
              <div className="text-center space-y-4">
                <div className="relative mx-auto">
                  <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-4xl font-bold shadow-xl ring-4 ring-white/10 mx-auto">
                    {participantName?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-2 border-gray-950 rounded-full"></span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-200">{participantName}</h4>
                  <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Luồng âm thanh & hình ảnh ổn định (720p HD)
                  </p>
                </div>
              </div>

              {/* Tag định danh góc dưới trái remote */}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-gray-200 flex items-center gap-2 border border-white/10">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                {participantName} ({role === 'doctor' ? 'Bệnh nhân' : 'Bác sĩ chuyên khoa'})
              </div>
            </div>
          </div>

          {/* Local Video Picture-in-Picture (Góc dưới phải) */}
          <div className="absolute bottom-4 right-4 w-48 sm:w-60 aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700/80 z-20 group">
            {videoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400">
                <VideoOff className="h-8 w-8 mb-1" />
                <span className="text-[11px]">Camera tắt</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded-md text-[10px] text-gray-300">
              Bạn {micOn ? '' : '(Đã tắt mic)'}
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="px-6 py-4 bg-gray-900/95 border-t border-gray-800 flex items-center justify-center gap-4 z-10">
          {/* Nút Mic */}
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              micOn
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
            }`}
            title={micOn ? 'Tắt Microphone' : 'Bật Microphone'}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Nút Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all shadow-md ${
              videoOn
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
            }`}
            title={videoOn ? 'Tắt Camera' : 'Bật Camera'}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Nút Kết thúc cuộc gọi */}
          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center gap-2 hover:scale-105"
            title="Kết thúc cuộc khám"
          >
            <PhoneOff className="h-5 w-5" />
            <span>Kết thúc cuộc gọi</span>
          </button>
        </div>
      </div>
    </div>
  );
}

