import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Volume2, VolumeX, Maximize2, Minimize2, Radio, Clock,
  Building2, Users, ArrowRight, CheckCircle2, BellRing, Sparkles
} from 'lucide-react';
import { apiGet } from '../../services/api';

/**
 * Phát tiếng chuông Ding-Dong y tế hai âm sắc bằng Web Audio API
 * Tần số: E5 (659.25Hz) -> C5 (523.25Hz) ngân vang ấm áp
 */
function playHospitalChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration + 0.1);
    };

    // Nốt 1 (cao) rồi nốt 2 (trầm) tạo hiệu ứng Ting-Tong chuẩn bệnh viện
    playTone(659.25, 0, 0.45);
    playTone(523.25, 0.35, 0.7);
  } catch (e) {
    console.warn('Không thể phát chuông AudioContext:', e);
  }
}

export default function ManHinhGoiSoPage() {
  const [data, setData] = useState({
    currentCall: null,
    recentCalls: [],
    phongKhamList: [],
    summary: { tongTiepNhan: 0, dangKham: 0, dangCho: 0, daHoanThanh: 0 },
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCallingAnim, setIsCallingAnim] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const lastCalledIdRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch dữ liệu màn hình TV ban đầu và polling fallback mỗi 4s
  const fetchTvData = async () => {
    try {
      const res = await apiGet('/tiep-nhan/man-hinh-tv');
      const tvData = res?.data || res;
      if (tvData && typeof tvData === 'object') {
        setData((prev) => {
          // Kiểm tra nếu có lượt gọi mới từ polling fallback
          if (tvData.currentCall && tvData.currentCall.id !== lastCalledIdRef.current) {
            triggerCallVoice(tvData.currentCall);
          }
          return {
            currentCall: tvData.currentCall || prev.currentCall,
            recentCalls: tvData.recentCalls || prev.recentCalls,
            phongKhamList: tvData.phongKhamList || prev.phongKhamList,
            summary: tvData.summary || prev.summary,
          };
        });
      }
    } catch (e) {
      console.warn('Lỗi lấy dữ liệu màn hình TV:', e);
    }
  };

  // 3. Kết nối WebSocket Socket.io nhận sự kiện queue:call tức thì
  useEffect(() => {
    fetchTvData();
    const interval = setInterval(fetchTvData, 4000);

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
    const s = io(wsUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Sự kiện gọi loa phát tức thì từ Bác sĩ hoặc Tiếp tân
    s.on('queue:call', (callEvent) => {
      if (callEvent && callEvent.id) {
        triggerCallVoice(callEvent);
        setData((prev) => ({
          ...prev,
          currentCall: callEvent,
          recentCalls: [callEvent, ...prev.recentCalls.filter((c) => c.id !== callEvent.id)].slice(0, 5),
        }));
        // Làm mới dữ liệu phòng khám
        fetchTvData();
      }
    });

    s.on('queue:update', () => {
      fetchTvData();
    });

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, []);

  // 4. Hàm phát loa giọng nói tiếng Việt
  const triggerCallVoice = (call) => {
    if (!call || call.id === lastCalledIdRef.current) return;
    lastCalledIdRef.current = call.id;

    // Kích hoạt hiệu ứng nhấp nháy phát sáng trên màn hình
    setIsCallingAnim(true);
    setTimeout(() => setIsCallingAnim(false), 8000);

    // Phát chuông Ting-Tong ngân vang
    playHospitalChime();

    // Định dạng câu đọc phát thanh tiếng Việt tự nhiên
    const cleanRoom = (call.tenPhong || 'Phòng khám').replace(/-/g, ' ');
    const text = `Xin mời bệnh nhân ${call.hoTen}, số thứ tự ${call.maSoThuTu}, vào ${cleanRoom}`;

    // Đợi chuông ngân xong 650ms rồi bắt đầu phát thanh tiếng Việt
    setTimeout(() => {
      // ƯU TIÊN 1: Phát giọng đọc tiếng Việt chuẩn tự nhiên 100% qua TTS MP3
      const audioUrl = `/api/tiep-nhan/tts?text=${encodeURIComponent(text)}`;
      const audio = new Audio(audioUrl);

      audio.play().catch((err) => {
        console.warn('Audio MP3 play warning, chuyển sang Web Speech API:', err);
        // ƯU TIÊN 2: Fallback Web Speech API
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const viVoice = voices.find(
              (v) =>
                v.lang.toLowerCase().includes('vi') ||
                v.lang.toLowerCase().includes('vn') ||
                v.name.toLowerCase().includes('vietnam') ||
                v.name.toLowerCase().includes('tiếng việt')
            );
            if (viVoice) utterance.voice = viVoice;

            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('Lỗi Web Speech API:', e);
          }
        }
      });
    }, 650);
  };

  // 5. Thao tác Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 6. Cho phép bật âm thanh (Mở khóa AudioContext và Autoplay policy của trình duyệt)
  const handleToggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      if (next) {
        // Thử phát chuông và giọng chào tiếng Việt để mở khóa toàn bộ Audio context
        playHospitalChime();
        const testAudio = new Audio(
          `/api/tiep-nhan/tts?text=${encodeURIComponent('Hệ thống loa gọi số tự động phòng khám đã sẵn sàng')}`
        );
        testAudio.play().catch((e) => console.log('Audio test unblock:', e));
      } else {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const currentCall = data.currentCall;
  const recentCalls = data.recentCalls || [];
  const rooms = data.phongKhamList || [];

  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null;
  const activeDisplayCall = selectedRoom
    ? (selectedRoom.dangKham
        ? {
            id: selectedRoom.dangKham.id,
            maSoThuTu: selectedRoom.dangKham.maSoThuTu,
            hoTen: selectedRoom.dangKham.hoTen,
            phongKhamId: selectedRoom.id,
            tenPhong: selectedRoom.tenPhong,
            viTri: selectedRoom.viTri,
            chuyenKhoa: selectedRoom.chuyenKhoa,
            bacSi: selectedRoom.bacSiTruc,
            thoiGianGoi: 'Đang phục vụ',
          }
        : selectedRoom.chuanBi
        ? {
            id: selectedRoom.chuanBi.id,
            maSoThuTu: selectedRoom.chuanBi.maSoThuTu,
            hoTen: selectedRoom.chuanBi.hoTen,
            phongKhamId: selectedRoom.id,
            tenPhong: selectedRoom.tenPhong,
            viTri: selectedRoom.viTri,
            chuyenKhoa: selectedRoom.chuyenKhoa,
            bacSi: selectedRoom.bacSiTruc,
            thoiGianGoi: 'Chuẩn bị vào',
          }
        : {
            maSoThuTu: '---',
            hoTen: 'Phòng hiện đang trống',
            phongKhamId: selectedRoom.id,
            tenPhong: selectedRoom.tenPhong,
            viTri: selectedRoom.viTri,
            chuyenKhoa: selectedRoom.chuyenKhoa,
            bacSi: selectedRoom.bacSiTruc,
            thoiGianGoi: 'Sẵn sàng tiếp nhận',
          })
    : currentCall;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* ─── HEADER: DẢI THƯƠNG HIỆU & ĐỒNG HỒ TRUNG TÂM ──────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur-md flex items-center justify-between shadow-lg">
        {/* Logo & Tên Phòng Khám */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Hệ Thống Y Tế Thông Minh
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                {isConnected ? 'Real-time Live' : 'Đang kết nối lại'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              PHÒNG KHÁM ĐA KHOA QUỐC TẾ
            </h1>
          </div>
        </div>

        {/* Đồng hồ & Nút điều khiển âm thanh TV */}
        <div className="flex items-center gap-6">
          {/* Nút bật/tắt âm thanh */}
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              isAudioEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {isAudioEnabled ? 'LOA: ĐANG BẬT' : 'CHẠM ĐỂ BẬT LOA GỌI SỐ'}
          </button>

          {/* Nút Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Đồng hồ lớn */}
          <div className="text-right border-l border-slate-800 pl-6 hidden sm:block">
            <div className="text-2xl font-black font-mono tracking-wider text-cyan-300">
              {currentTime.toLocaleTimeString('vi-VN')}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN VIEWPORT: BẢNG GỌI SỐ VÀ DANH SÁCH PHÒNG KHÁM ── */}
      <main className="flex-1 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        {/* ─── CỘT TRÁI (5 CỘT): HERO "ĐANG GỌI VÀO PHÒNG" ────── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Hộp gọi số lớn */}
          <div
            className={`flex-1 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500 border-2 ${
              isCallingAnim
                ? 'bg-gradient-to-b from-blue-900/90 to-slate-900 border-cyan-400 shadow-2xl shadow-cyan-500/40 ring-4 ring-cyan-500/30'
                : 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 shadow-xl'
            }`}
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Thẻ Gọi Số */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-cyan-400">
                  {selectedRoom ? `TIÊU ĐIỂM: ${selectedRoom.tenPhong?.toUpperCase()}` : isCallingAnim ? 'ĐANG PHÁT LOA GỌI SỐ...' : 'MỜI VÀO KHÁM'}
                </span>
              </div>

              {selectedRoom ? (
                <button
                  onClick={() => setSelectedRoomId(null)}
                  className="text-xs text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  title="Nhấn để quay lại chế độ theo dõi toàn viện"
                >
                  ✕ Xem tất cả phòng
                </button>
              ) : activeDisplayCall?.thoiGianGoi ? (
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Gọi lúc: {activeDisplayCall.thoiGianGoi}
                </span>
              ) : null}
            </div>

            {/* KHUNG SỐ THỨ TỰ CỰC ĐẠI */}
            <div className="my-auto py-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {selectedRoom ? (selectedRoom.dangKham ? 'BỆNH NHÂN ĐANG KHÁM' : 'TRẠNG THÁI HIỆN TẠI') : 'SỐ THỨ TỰ BỆNH NHÂN'}
              </p>
              <div
                className={`font-black font-mono tracking-tight text-7xl sm:text-8xl md:text-9xl transition-transform duration-300 ${
                  isCallingAnim ? 'scale-105 text-cyan-300 animate-pulse' : 'text-white'
                }`}
              >
                {activeDisplayCall?.maSoThuTu || '---'}
              </div>

              <div className="mt-4 inline-block px-5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner">
                <p className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-wide">
                  {activeDisplayCall?.hoTen || 'Đang chờ lượt tiếp theo...'}
                </p>
              </div>

              {selectedRoom?.chuanBi && (
                <div className="mt-3 text-xs text-slate-400">
                  <span>Chuẩn bị tiếp theo: </span>
                  <strong className="text-amber-400 font-mono text-sm ml-1">{selectedRoom.chuanBi.maSoThuTu}</strong>
                  <span className="text-slate-300 ml-1">({selectedRoom.chuanBi.hoTen})</span>
                </div>
              )}
            </div>

            {/* Thông tin phòng khám đích */}
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-950/40 border border-blue-800/50 backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Phòng Khám Tiếp Nhận
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
                  {activeDisplayCall?.viTri || 'Tầng 1'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                {activeDisplayCall?.tenPhong || 'Vui lòng theo dõi danh sách phòng bên phải'}
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-blue-900/50">
                <span>Chuyên khoa: <strong className="text-cyan-400">{activeDisplayCall?.chuyenKhoa || 'Đa khoa'}</strong></span>
                <span>Bác sĩ: <strong className="text-white">{activeDisplayCall?.bacSi || 'Bác sĩ trực'}</strong></span>
              </div>
            </div>
          </div>

          {/* Lịch sử 3 lượt gọi gần nhất */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Lượt gọi vừa qua</span>
              <span className="text-[11px] text-slate-500 font-normal">Để tra cứu nếu lỡ số</span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {recentCalls.slice(0, 3).map((rc, idx) => (
                <div key={idx} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <span className="text-lg font-black font-mono text-cyan-400 block">{rc.maSoThuTu}</span>
                  <span className="text-xs font-semibold text-slate-200 truncate block mt-0.5">{rc.hoTen}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{rc.tenPhong?.replace(/Phòng \d+ - /, '')}</span>
                </div>
              ))}
              {recentCalls.length === 0 && (
                <div className="col-span-3 text-center py-2 text-xs text-slate-500 italic">
                  Chưa có lịch sử gọi trong phiên này
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── CỘT PHẢI (7 CỘT): BẢNG CÁC PHÒNG KHÁM HOẠT ĐỘNG ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Thanh KPI tổng quan */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold">Tổng Tiếp Nhận</p>
                <p className="text-2xl font-black font-mono text-white mt-0.5">{data.summary.tongTiepNhan}</p>
              </div>
              <Users className="w-6 h-6 text-blue-400" />
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold">Đang Khám</p>
                <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{data.summary.dangKham}</p>
              </div>
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold">Đang Đợi Khám</p>
                <p className="text-2xl font-black font-mono text-amber-400 mt-0.5">{data.summary.dangCho}</p>
              </div>
              <Clock className="w-6 h-6 text-amber-400" />
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold">Đã Hoàn Thành</p>
                <p className="text-2xl font-black font-mono text-cyan-400 mt-0.5">{data.summary.daHoanThanh}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Grid các phòng khám */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 px-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Danh Sách Trạng Thái Phòng Khám Trực Tiếp
              </h2>
              <span className="text-xs text-slate-500">Bấm vào phòng để xem chi tiết</span>
            </div>

            {/* Thanh nút bấm chọn nhanh giữa các phòng khám */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  !selectedRoomId
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
                }`}
              >
                Tất cả phòng ({rooms.length})
              </button>
              {rooms.map((r) => {
                const isSelected = selectedRoomId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(isSelected ? null : r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{r.tenPhong?.replace(/Phòng \d+ - /, '') || r.tenPhong}</span>
                    {r.dangKham && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${isSelected ? 'bg-slate-900 text-cyan-300' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                        {r.dangKham.maSoThuTu}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {rooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                const isRoomCalling = currentCall?.phongKhamId === room.id && isCallingAnim;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
                    className={`rounded-2xl p-4 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-500/40 scale-[1.01]'
                        : isRoomCalling
                        ? 'bg-gradient-to-r from-blue-950 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/30'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Header phòng */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                          {room.tenPhong}
                          {isSelected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                              Đang xem
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {room.chuyenKhoa} • {room.viTri}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {room.bacSiTruc || 'Bác sĩ trực'}
                      </span>
                    </div>

                    {/* Hàng thông số Đang khám - Chuẩn bị */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {/* Đang khám */}
                      <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                          Đang Khám
                        </span>
                        {room.dangKham?.maSoThuTu ? (
                          <>
                            <span className="text-2xl font-black font-mono text-emerald-300 block my-0.5">
                              {room.dangKham.maSoThuTu}
                            </span>
                            <span className="text-[11px] text-slate-300 truncate block">
                              {room.dangKham.hoTen || ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black font-mono text-emerald-400/50 block my-0.5">
                              ---
                            </span>
                            <span className="text-[11px] text-slate-400 truncate block">
                              Trống
                            </span>
                          </>
                        )}
                      </div>

                      {/* Chuẩn bị vào: Nếu có thì hiện STT tiếp theo, không có thì không điền gì */}
                      <div className="bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-xl flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                          Chuẩn Bị
                        </span>
                        {room.chuanBi?.maSoThuTu ? (
                          <>
                            <span className="text-2xl font-black font-mono text-amber-300 block my-0.5">
                              {room.chuanBi.maSoThuTu}
                            </span>
                            <span className="text-[11px] text-slate-300 truncate block">
                              {room.chuanBi.hoTen || ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black font-mono text-transparent block my-0.5 select-none">
                              &nbsp;
                            </span>
                            <span className="text-[11px] text-transparent truncate block select-none">
                              &nbsp;
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Đang đợi */}
                    <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
                      <span>Đang chờ phía sau:</span>
                      <span className="font-bold text-slate-200 font-mono">
                        {room.soNguoiCho || 0} bệnh nhân
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ─── FOOTER: THANH CHỮ CHẠY HƯỚNG DẪN BỆNH NHÂN ───────── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-2.5 px-6 flex items-center overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-slate-800 text-xs font-bold text-cyan-400 uppercase tracking-wider">
          <BellRing className="w-4 h-4 animate-bounce" />
          Thông báo sảnh:
        </div>
        <div className="overflow-hidden whitespace-nowrap flex-1 ml-4">
          <div className="inline-block animate-marquee text-xs text-slate-300 tracking-wide">
            Quý khách vui lòng chú ý theo dõi số thứ tự và lắng nghe loa thông báo để vào đúng phòng khám • Vui lòng chuẩn bị sẵn CCCD gắn chip hoặc thẻ BHYT khi vào phòng • Giữ gìn trật tự và vệ sinh chung trong khuôn viên phòng khám • Chúc Quý khách có một buổi khám bệnh an tâm và thuận lợi!
          </div>
        </div>
      </footer>
    </div>
  );
}
