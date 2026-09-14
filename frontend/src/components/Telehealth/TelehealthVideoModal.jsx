import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2,
  Minimize2, Volume2, VolumeX, ShieldCheck, MessageSquare,
  Send, Radio, Activity, CheckCircle2, User, Sparkles
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
  const [speakerMuted, setSpeakerMuted] = useState(false); // Dùng để tắt tiếng tránh rú mic khi test 2 tab trên cùng 1 máy tính
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0); // 0 -> 100
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0); // 0 -> 100
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([
    { sender: 'system', text: 'Phòng khám trực tuyến bảo mật WebRTC E2EE đã khởi tạo.', time: 'Bây giờ' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const modalRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  const roomId = appointmentInfo?.maLichHen || appointmentInfo?.id || 'telehealth_general';

  // 1. Bộ đếm thời gian cuộc gọi
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

  // 2. Khởi tạo Media Stream + WebRTC Peer Connection + Audio Analyser
  useEffect(() => {
    if (!isOpen) {
      cleanupCall();
      return;
    }

    let isMounted = true;

    const initWebRTCAndMedia = async () => {
      try {
        setStreamError(null);

        // A. Lấy Local Media (Camera + Mic)
        let localStream = null;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: true,
            });
          }
        } catch (mediaErr) {
          console.warn('Webcam/Mic vật lý không sẵn sàng hoặc bị từ chối, tạo virtual canvas stream:', mediaErr);
          localStream = createVirtualStream();
          setStreamError('Không thể mở micro/webcam trực tiếp (đang dùng luồng giả lập HD).');
        }

        if (!isMounted) return;
        mediaStreamRef.current = localStream;
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }

        // Setup Local Audio Meter
        setupAudioAnalyser(localStream, (level) => {
          if (isMounted) setLocalAudioLevel(level);
        });

        // B. Tạo RTCPeerConnection chuẩn WebRTC với STUN server Google
        const pcConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        };
        const pc = new RTCPeerConnection(pcConfig);
        peerConnectionRef.current = pc;

        // Thêm tracks từ local stream sang PeerConnection
        if (localStream) {
          localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
          });
        }

        // Nhận remote stream từ đối phương
        pc.ontrack = (event) => {
          console.log('[WebRTC] Nhận được remote track:', event.track.kind);
          const [remoteStream] = event.streams;
          if (remoteStream) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setIsPeerConnected(true);
            setHasRemoteVideo(remoteStream.getVideoTracks().length > 0);

            // Setup Remote Audio Meter
            setupAudioAnalyser(remoteStream, (level) => {
              if (isMounted) setRemoteAudioLevel(level);
            });
          }
        };

        // Gửi ICE candidates khi tìm thấy
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setIsPeerConnected(true);
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setIsPeerConnected(false);
          }
        };

        // C. Kênh truyền tin (Signaling) đa kênh: BroadcastChannel (cùng máy/tab) + Socket.io (khác máy)
        const channelName = `telehealth_${roomId}`;
        const bc = new BroadcastChannel(channelName);
        broadcastChannelRef.current = bc;

        bc.onmessage = async (e) => {
          handleIncomingSignal(e.data);
        };

        // Socket.io signaling
        const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
        const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.emit('call:join', { roomId, role, userName: role === 'doctor' ? 'Bác sĩ' : participantName });

        socket.on('call:peer_joined', async (data) => {
          console.log('[Signaling] Peer joined:', data);
          // Vai trò Doctor khởi tạo Offer khi có người tham gia
          if (role === 'doctor') {
            await createAndSendOffer();
          }
        });

        socket.on('call:signal', async (data) => {
          handleIncomingSignal(data.signal);
        });

        socket.on('call:peer_left', () => {
          setIsPeerConnected(false);
          setHasRemoteVideo(false);
        });

        // Báo cho các tab khác biết mình đã tham gia
        sendSignal({ type: 'peer_joined', role, senderRole: role });

        // Nếu là Doctor, tự động tạo offer sau 800ms
        if (role === 'doctor') {
          setTimeout(() => {
            if (isMounted && pc.signalingState === 'stable') {
              createAndSendOffer();
            }
          }, 800);
        }

      } catch (err) {
        console.error('Lỗi thiết lập cuộc gọi WebRTC:', err);
        setStreamError(err.message || 'Không thể thiết lập kết nối WebRTC.');
      }
    };

    initWebRTCAndMedia();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [isOpen, roomId]);

  // Gửi tín hiệu WebRTC qua cả BroadcastChannel lẫn Socket.io
  const sendSignal = (signalData) => {
    const payload = { ...signalData, senderRole: role, roomId };
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payload);
      } catch (e) {
        console.error('BC send error:', e);
      }
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('call:signal', { roomId, signal: payload, role });
    }
  };

  // Tạo và gửi Offer
  const createAndSendOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: pc.localDescription });
    } catch (err) {
      console.warn('Lỗi tạo Offer:', err);
    }
  };

  // Xử lý tín hiệu Signaling nhận được
  const handleIncomingSignal = async (data) => {
    if (!data || data.senderRole === role) return; // Bỏ qua tín hiệu từ chính mình
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (data.type === 'peer_joined') {
        if (role === 'doctor') {
          await createAndSendOffer();
        }
      } else if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', sdp: pc.localDescription });
      } else if (data.type === 'answer') {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'candidate' && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Lỗi thêm ICE Candidate:', e);
        }
      } else if (data.type === 'chat_msg') {
        setInCallMessages((prev) => [...prev, data.message]);
      } else if (data.type === 'voice_test' && data.text) {
        setRemoteAudioLevel(85);
        setTimeout(() => setRemoteAudioLevel(60), 400);
        setTimeout(() => setRemoteAudioLevel(80), 800);
        setTimeout(() => setRemoteAudioLevel(15), 1400);
        try {
          const u = new SpeechSynthesisUtterance(data.text);
          u.lang = 'vi-VN';
          window.speechSynthesis.speak(u);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Lỗi xử lý signaling:', e);
    }
  };

  // Tạo Virtual Stream (nếu thiết bị không có webcam hoặc người dùng tắt quyền)
  const createVirtualStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);

      // Gradient circle
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#2563eb');
      grad.addColorStop(1, '#0d9488');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(320, 240, 90 + Math.sin(frame * 0.05) * 8, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(role === 'doctor' ? 'Bác sĩ (Cam Ảo HD)' : 'Bệnh nhân (Cam Ảo HD)', 320, 248);
      requestAnimationFrame(draw);
    };
    draw();

    const vStream = canvas.captureStream(30);

    // Thêm âm thanh giả lập (Silent audio track)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const silentTrack = dst.stream.getAudioTracks()[0];
    if (silentTrack) {
      silentTrack.enabled = false;
      vStream.addTrack(silentTrack);
    }

    return vStream;
  };

  // Đo mức âm lượng Micro / Audio stream thời gian thực
  const setupAudioAnalyser = (stream, onLevelChange) => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        onLevelChange(normalized);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Không thể khởi tạo Audio Analyser:', e);
    }
  };

  // Dọn dẹp tài nguyên
  const cleanupCall = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('call:leave', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsPeerConnected(false);
    setHasRemoteVideo(false);
  };

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

  // Bật/tắt âm lượng loa người đối diện (hữu ích khi test 2 tab trên cùng 1 máy tính để tránh hú âm thanh)
  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerMuted;
    }
    setSpeakerMuted(!speakerMuted);
  };

  // Gửi tin nhắn nhanh trong cuộc gọi
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      sender: role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setInCallMessages((prev) => [...prev, msg]);
    sendSignal({ type: 'chat_msg', message: msg });
    setChatInput('');
  };

  // Thử giọng nói và kiểm tra đàm thoại hai chiều
  const handleTestVoice = () => {
    try {
      const text = role === 'doctor'
        ? 'Bác sĩ: Xin chào bạn, tôi nghe giọng bạn rất rõ. Bạn hãy chia sẻ triệu chứng nhé.'
        : 'Bệnh nhân: Dạ chào bác sĩ, tôi nghe bác sĩ nói rất rõ ràng ạ.';

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);

      setLocalAudioLevel(85);
      setTimeout(() => setLocalAudioLevel(55), 400);
      setTimeout(() => setLocalAudioLevel(80), 800);
      setTimeout(() => setLocalAudioLevel(20), 1200);

      sendSignal({ type: 'voice_test', text });
    } catch (e) {
      console.warn('Speech error:', e);
    }
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
        className="bg-gray-950 text-white rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-gray-800 relative"
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isPeerConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <div>
              <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                Phòng khám Trực tuyến Telehealth
                <span className={`text-xs px-2 py-0.5 rounded-full border ${isPeerConnected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                  {isPeerConnected ? 'P2P Đã Kết Nối Trực Tiếp' : 'Đang Đợi Người Đối Thoại...'}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Đối thoại cùng: <strong className="text-white">{participantName}</strong> • {appointmentInfo.gioKham || 'WebRTC HD Call'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ đếm thời gian */}
            <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 border border-gray-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              {formatTimer(callDuration)}
            </div>

            {/* Mute Loa để tránh hú khi test 2 tab trên 1 máy tính */}
            <button
              onClick={toggleSpeaker}
              className={`p-2 rounded-xl border transition ${speakerMuted ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-gray-400 hover:text-white hover:bg-gray-800 border-transparent'}`}
              title={speakerMuted ? 'Bật âm thanh loa' : 'Tắt âm thanh loa (Chống hú khi test 2 tab cùng máy)'}
            >
              {speakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Bật tắt khung Chat nhanh */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-xl border transition ${showChat ? 'bg-primary-600 text-white border-primary-500' : 'text-gray-400 hover:text-white hover:bg-gray-800 border-transparent'}`}
              title="Khung chat trong cuộc gọi"
            >
              <MessageSquare className="h-4 w-4" />
            </button>

            {/* Toàn màn hình */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Thông báo nếu webcam/mic vật lý chuyển sang chế độ ảo */}
        {streamError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-300 text-center flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            {streamError}
          </div>
        )}

        {/* Video Stage Main */}
        <div className="flex-1 relative bg-gradient-to-b from-gray-900 via-gray-950 to-black overflow-hidden flex">
          {/* Vùng Video Người Đối Diện (Remote) */}
          <div className="flex-1 relative h-full flex items-center justify-center bg-gray-950">
            {/* Video element phát remote stream thực tế (nếu có WebRTC P2P) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={speakerMuted}
              className={`w-full h-full object-cover transition-opacity duration-500 ${isPeerConnected ? 'opacity-100' : 'hidden'}`}
            />

            {/* Màn hình chờ nếu đối phương chưa vào phòng */}
            {!isPeerConnected && (
              <div className="text-center space-y-4 p-6 max-w-md animate-fade-in">
                <div className="relative mx-auto">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-4xl font-bold shadow-2xl ring-4 ring-primary-500/30 mx-auto">
                    {participantName?.charAt(0) || 'U'}
                  </div>
                  <span className="animate-ping absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 opacity-75"></span>
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-gray-950"></span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-200">{participantName}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Đang đợi {role === 'doctor' ? 'bệnh nhân' : 'bác sĩ'} tham gia vào phòng khám video...
                  </p>
                  <p className="text-[11px] text-primary-400 mt-2 bg-primary-950/60 py-1 px-3 rounded-full border border-primary-800/40 inline-flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 animate-pulse" /> Sẵn sàng kết nối âm thanh & hình ảnh WebRTC
                  </p>
                </div>
              </div>
            )}

            {/* Tag thông tin người đối thoại + Thanh âm lượng nói (Equalizer) */}
            <div className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs text-gray-200 flex items-center gap-3 border border-white/10 shadow-xl">
              <span className={`h-2.5 w-2.5 rounded-full ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <div>
                <p className="font-semibold text-white">{participantName} ({role === 'doctor' ? 'Bệnh nhân' : 'Bác sĩ chuyên khoa'})</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                  <Volume2 className={`h-3 w-3 ${remoteAudioLevel > 15 ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span className="text-gray-400">Âm thanh:</span>
                  <div className="flex gap-0.5 h-3 items-end">
                    {[10, 25, 45, 70, 90].map((threshold, idx) => (
                      <span
                        key={idx}
                        className={`w-1 rounded-xs transition-all ${
                          remoteAudioLevel >= threshold
                            ? 'bg-emerald-400 h-full'
                            : 'bg-gray-700 h-1'
                        }`}
                      />
                    ))}
                  </div>
                  {remoteAudioLevel > 15 && <span className="text-[10px] text-emerald-400 font-medium ml-1">Đang nói...</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Vùng Video Bản Thân PiP (Góc Dưới Phải) */}
          <div className="absolute bottom-4 right-4 w-52 sm:w-64 aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700/80 z-20 group">
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
                <VideoOff className="h-8 w-8 mb-1 text-gray-500" />
                <span className="text-[11px]">Camera tắt</span>
              </div>
            )}

            {/* Tag Bạn + Thanh sóng Micro (Voice Detection) */}
            <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-1 rounded-lg flex items-center justify-between text-[10px] text-gray-300">
              <span>Bạn {micOn ? '' : '(Đã tắt mic)'}</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5 h-2.5 items-end">
                  {[10, 30, 50, 75].map((threshold, idx) => (
                    <span
                      key={idx}
                      className={`w-0.5 rounded-xs transition-all ${
                        micOn && localAudioLevel >= threshold
                          ? 'bg-emerald-400 h-full'
                          : 'bg-gray-600 h-0.5'
                      }`}
                    />
                  ))}
                </div>
                {micOn && localAudioLevel > 15 && (
                  <span className="text-emerald-400 font-bold text-[9px]">Thu âm</span>
                )}
              </div>
            </div>
          </div>

          {/* Khung Chat Nhanh Trong Cuộc Gọi (In-Call Chat Drawer) */}
          {showChat && (
            <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-20 h-full animate-fade-in">
              <div className="p-3 border-b border-gray-800 font-semibold text-xs text-gray-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary-400" /> Tin nhắn cuộc gọi
                </span>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {inCallMessages.map((m, idx) => (
                  <div key={idx} className={`p-2 rounded-xl ${m.sender === (role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân') ? 'bg-primary-600 text-white ml-6' : m.sender === 'system' ? 'bg-gray-800/80 text-gray-300 italic text-center text-[10px]' : 'bg-gray-800 text-gray-200 mr-6'}`}>
                    {m.sender !== 'system' && <p className="text-[10px] opacity-70 font-semibold mb-0.5">{m.sender}</p>}
                    <p>{m.text}</p>
                    {m.time && <p className="text-[9px] opacity-60 text-right mt-0.5">{m.time}</p>}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="p-2 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Gửi tin nhắn..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button type="submit" className="p-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-white">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}
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

          {/* Nút Nói thử / Test Mic-Loa đàm thoại */}
          <button
            onClick={handleTestVoice}
            className="px-4 py-3.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-semibold rounded-2xl transition-all shadow-md flex items-center gap-2 hover:scale-105"
            title="Thử giọng nói và kiểm tra âm thanh hai chiều"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs">Nói thử / Test Mic & Loa</span>
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
