import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2,
  Minimize2, Volume2, VolumeX, ShieldCheck, MessageSquare,
  Send, Radio, Activity, CheckCircle2, User, Sparkles,
  Paperclip, Image as ImageIcon, Download, FileText, ExternalLink,
  Move, RotateCcw, RotateCw, ZoomIn, ZoomOut, X, ChevronDown
} from 'lucide-react';

export default function TelehealthVideoModal({
  isOpen,
  onClose,
  participantName = 'Bệnh nhân',
  role = 'doctor', // 'doctor' | 'patient'
  appointmentInfo = {},
  isMinimized = false,
  onToggleMinimize,
}) {
  const [internalMinimized, setInternalMinimized] = useState(false);
  const activeMinimized = onToggleMinimize ? isMinimized : internalMinimized;
  const handleToggleMinimize = onToggleMinimize || (() => setInternalMinimized((prev) => !prev));

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [speakerMuted, setSpeakerMuted] = useState(false); // Dùng để tắt tiếng tránh rú mic khi test 2 tab trên cùng 1 máy tính
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [streamError, setStreamError] = useState(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0); // 0 -> 100
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0); // 0 -> 100
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [inCallMessages, setInCallMessages] = useState([
    { sender: 'system', text: 'Phòng khám trực tuyến bảo mật WebRTC E2EE đã khởi tạo.', time: 'Bây giờ' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Xem phóng to hình ảnh đính kèm
  const [previewImage, setPreviewImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Vị trí cửa sổ Video nhỏ (PiP draggable)
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const modalRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const seenSignalsRef = useRef(new Set());

  const roomId = appointmentInfo?.maLichHen || appointmentInfo?.id || 'telehealth_general';

  const MAX_CALL_DURATION = 3600; // 60 phút tối đa (1 tiếng)
  const WARNING_THRESHOLD = 3000; // Cảnh báo trước 10 phút (khi đã gọi 50 phút)
  const [showTimeWarningToast, setShowTimeWarningToast] = useState(false);
  const [hasDismissedWarning, setHasDismissedWarning] = useState(false);

  // 1. Bộ đếm thời gian cuộc gọi & Giới hạn 60 phút
  useEffect(() => {
    let timer;
    if (isOpen) {
      setCallDuration(0);
      setShowTimeWarningToast(false);
      setHasDismissedWarning(false);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (callDuration >= WARNING_THRESHOLD && !hasDismissedWarning) {
      setShowTimeWarningToast(true);
    }
    if (callDuration >= MAX_CALL_DURATION && isOpen) {
      alert('⏰ HẾT THỜI GIAN KHÁM TRỰC TUYẾN:\n\nCa khám trực tuyến đã đạt thời lượng tối đa 60 phút quy định. Cuộc gọi sẽ được tự động đóng để bác sĩ hoàn tất kết luận tư vấn.');
      cleanupCall();
      onClose();
    }
  }, [callDuration, hasDismissedWarning, isOpen]);

  // Khóa cuộn trang web nền (Body Scroll Lock) chỉ khi đang mở cuộc gọi Toàn màn hình
  useEffect(() => {
    if (isOpen && !activeMinimized) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTouchAction = document.body.style.touchAction;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';

      window.scrollTo(0, 0);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen, activeMinimized]);

  // Đồng bộ và gắn lại luồng video khi chuyển đổi giữa Cửa sổ nổi và Toàn màn hình
  useEffect(() => {
    if (mediaStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
    if (remoteStreamRef.current && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [activeMinimized]);

  // Phím ESC đóng phóng to ảnh
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

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

        // A. Lấy Local Media (Camera + Mic chất lượng cao với bộ lọc âm thanh)
        let localStream = null;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: {
                echoCancellation: true,  // Khử tiếng vọng loa-mic
                noiseSuppression: true,  // Lọc tạp âm môi trường
                autoGainControl: true,   // Tự động cân bằng âm lượng đàm thoại
              },
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

        // B. Tạo RTCPeerConnection chuẩn WebRTC với STUN servers Google & Mozilla
        const pcConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
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
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch((playErr) => {
                console.warn('[WebRTC] Tự động phát âm thanh bị giới hạn bởi trình duyệt:', playErr);
              });
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

        // Socket.io signaling: Kết nối qua cùng origin (https) với path /socket.io (thông qua proxy của Vite)
        // hoặc fallback tới cổng 5000 để tránh bị trình duyệt di động chặn Mixed Content (HTTPS -> HTTP)
        let socket;
        try {
          if (import.meta.env.VITE_WS_URL) {
            socket = io(import.meta.env.VITE_WS_URL, { transports: ['websocket', 'polling'] });
          } else {
            // Sử dụng window.location.origin và path /socket.io để cùng giao thức HTTPS
            socket = io(window.location.origin, {
              path: '/socket.io',
              transports: ['websocket', 'polling'],
            });
          }
        } catch (sockErr) {
          console.warn('[Socket] Lỗi tạo kết nối socket, fallback port 5000:', sockErr);
          const socketHost = window.location.hostname || 'localhost';
          socket = io(`http://${socketHost}:5000`, { transports: ['websocket', 'polling'] });
        }
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[Socket] Đã kết nối Socket.IO thành công, id =', socket.id);
          socket.emit('call:join', { roomId, role, userName: role === 'doctor' ? 'Bác sĩ' : participantName });
        });

        socket.on('connect_error', (err) => {
          console.warn('[Socket] Lỗi kết nối Socket.IO qua HTTPS proxy, thử fallback trực tiếp port 5000:', err);
        });

        socket.on('call:peer_joined', async (data) => {
          console.log('[Signaling] Peer joined:', data);
          setIsPeerConnected(true);
          // Vai trò Doctor khởi tạo Offer khi có người tham gia
          if (role === 'doctor') {
            await createAndSendOffer();
          }
        });

        socket.on('call:error', (err) => {
          console.warn('[Telehealth] Lỗi bảo mật phòng khám:', err);
          alert(`⚠️ BẢO MẬT PHÒNG KHÁM TRỰC TUYẾN:\n\n${err?.message || 'Không thể tham gia phòng gọi.'}`);
          onClose();
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

  // Đảm bảo stream luôn được gán vào thẻ video khi videoOn bật lại
  useEffect(() => {
    if (videoOn && localVideoRef.current && mediaStreamRef.current) {
      if (localVideoRef.current.srcObject !== mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [videoOn]);

  // Gửi tín hiệu WebRTC qua cả BroadcastChannel lẫn Socket.io với ID khử trùng lặp
  const sendSignal = (signalData) => {
    const msgId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const payload = { ...signalData, senderRole: role, roomId, msgId };
    seenSignalsRef.current.add(msgId);

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

    // Khử trùng lặp tín hiệu giữa BroadcastChannel & Socket.io
    if (data.msgId) {
      if (seenSignalsRef.current.has(data.msgId)) return;
      seenSignalsRef.current.add(data.msgId);
      if (seenSignalsRef.current.size > 200) {
        const firstKeys = Array.from(seenSignalsRef.current).slice(0, 50);
        firstKeys.forEach((k) => seenSignalsRef.current.delete(k));
      }
    }

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
      } else if (data.type === 'track_state') {
        if (data.kind === 'video') {
          setHasRemoteVideo(!!data.enabled);
        }
      } else if (data.type === 'chat_msg') {
        setInCallMessages((prev) => [...prev, data.message]);
        if (!showChat) {
          setUnreadChatCount((prev) => prev + 1);
        }
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
    const nextState = !videoOn;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    setVideoOn(nextState);

    // Gửi tín hiệu trạng thái video cho đối phương biết
    sendSignal({
      type: 'track_state',
      kind: 'video',
      enabled: nextState,
    });

    // Nếu bật lại, đảm bảo gắn stream và kích hoạt play() ngay lập tức
    if (nextState && localVideoRef.current && mediaStreamRef.current) {
      if (localVideoRef.current.srcObject !== mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  };

  // Bật/tắt âm lượng loa người đối diện (hữu ích khi test 2 tab trên cùng 1 máy tính để tránh hú âm thanh)
  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !speakerMuted;
    }
    setSpeakerMuted(!speakerMuted);
  };

  // Xử lý kéo thả bằng Pointer Events (chuẩn W3C: hỗ trợ 100% cả Chuột máy tính, Touch điện thoại và Bút cảm ứng)
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e) => {
    // Chỉ kích hoạt khi click chuột trái (button === 0) hoặc touch
    if (e.button !== undefined && e.button !== 0) return;
    // Bỏ qua nếu bấm trúng nút bấm (button) hoặc link
    if (e.target.closest('button') || e.target.closest('a')) return;

    isDraggingRef.current = true;
    setIsDragging(true);

    const initialPointerX = e.clientX;
    const initialPointerY = e.clientY;
    const initialPipX = pipPosition.x;
    const initialPipY = pipPosition.y;

    const handlePointerMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvt.clientX - initialPointerX;
      const deltaY = moveEvt.clientY - initialPointerY;
      setPipPosition({
        x: initialPipX + deltaX,
        y: initialPipY + deltaY,
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Đặt lại vị trí ban đầu của khung hình
  const resetPipPosition = (e) => {
    e?.stopPropagation();
    setPipPosition({ x: 0, y: 0 });
  };

  // Mở/đóng khung chat và reset số tin chưa đọc
  const toggleChat = () => {
    if (!showChat) {
      setUnreadChatCount(0);
    }
    setShowChat(!showChat);
  };

  // Gửi tin nhắn văn bản nhanh trong cuộc gọi
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setInCallMessages((prev) => [...prev, msg]);
    sendSignal({ type: 'chat_msg', message: msg });
    setChatInput('');
  };

  // Chọn và gửi file / ảnh trực tiếp trong cuộc gọi
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Tệp tin quá lớn! Vui lòng chọn tệp tin hoặc ảnh có dung lượng dưới 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      const isImage = file.type.startsWith('image/');
      const filePayload = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        isImage,
        dataUrl,
      };

      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender: role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân',
        text: isImage ? '📷 Đã gửi một hình ảnh' : `📎 Đã gửi tệp: ${file.name}`,
        file: filePayload,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setInCallMessages((prev) => [...prev, msg]);
      sendSignal({ type: 'chat_msg', message: msg });
      e.target.value = '';
    };

    reader.readAsDataURL(file);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (modalRef.current?.requestFullscreen) {
          modalRef.current.requestFullscreen().catch(() => {});
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (err) {}
    } else {
      setIsFullscreen(false);
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {}
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Giao diện Cửa sổ nổi (Floating Mini Call / PiP) khi thu nhỏ để lướt xem hệ thống
  if (activeMinimized) {
    return (
      <div
        style={{
          transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`,
        }}
        onPointerDown={handlePointerDown}
        className="fixed bottom-4 right-4 z-[99999] w-36 h-52 sm:w-80 sm:h-52 bg-gray-950 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-emerald-500/80 sm:border-gray-700 overflow-hidden select-none touch-none animate-scale-in flex flex-col group cursor-move"
      >
        {/* Vùng Video Người Đối Diện */}
        <div className="relative flex-1 w-full h-full bg-black overflow-hidden select-none">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover pointer-events-none ${hasRemoteVideo ? 'block' : 'hidden'}`}
          />
          {!hasRemoteVideo && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 p-2 text-center pointer-events-none">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-white mb-1 shadow-inner">
                <User className="h-5 w-5 sm:h-7 sm:w-7 text-primary-400" />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[90%]">
                {participantName}
              </p>
              <p className="text-[9px] sm:text-[10px] text-emerald-400 font-medium">
                {isPeerConnected ? 'Đang gọi trực tuyến' : 'Đang kết nối...'}
              </p>
            </div>
          )}

          {/* Popup cảnh báo sắp hết 60 phút khám */}
          {showTimeWarningToast && (
            <div className="absolute top-10 left-2 right-2 z-30 bg-amber-500/95 text-white p-2 rounded-xl shadow-xl border border-amber-300 text-center animate-bounce text-[10px] pointer-events-auto">
              <p className="font-bold flex items-center justify-center gap-1">
                <Clock className="h-3 w-3 shrink-0" /> Sắp hết giờ ({Math.max(1, Math.ceil((MAX_CALL_DURATION - callDuration) / 60))}p)!
              </p>
              <p className="opacity-95 text-[9px] mt-0.5">Giới hạn ca khám là 60 phút.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimeWarningToast(false);
                  setHasDismissedWarning(true);
                }}
                className="mt-1 bg-amber-800 hover:bg-amber-900 text-white font-bold px-2 py-0.5 rounded-md text-[9px] transition"
              >
                Đã hiểu
              </button>
            </div>
          )}

          {/* Video bản thân nhỏ ở góc */}
          <div className="absolute top-2 right-2 w-10 h-14 sm:w-16 sm:h-22 rounded-lg sm:rounded-xl overflow-hidden border border-white/40 shadow-lg bg-gray-900 pointer-events-none">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${videoOn ? 'block' : 'hidden'}`}
            />
            {!videoOn && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                <VideoOff className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            )}
          </div>

          {/* Header nhỏ trên video */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-2 flex items-center justify-between text-white pointer-events-none">
            <div className="flex items-center gap-1.5 min-w-0 pr-12">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-[10px] sm:text-xs font-bold truncate max-w-[80px] sm:max-w-[130px] drop-shadow">
                {participantName}
              </span>
            </div>
            <span className={`text-[9px] sm:text-[11px] font-mono shrink-0 drop-shadow ${callDuration >= WARNING_THRESHOLD ? 'text-amber-300 font-bold' : 'text-emerald-300'}`}>
              {formatTimer(callDuration)}
            </span>
          </div>

          {/* Thanh công cụ mini ở đáy */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 flex items-center justify-center gap-2 sm:gap-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút Mic */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-1.5 sm:p-2 rounded-full transition active:scale-95 ${
                micOn ? 'bg-gray-800/90 text-white hover:bg-gray-700' : 'bg-red-600 text-white'
              }`}
              title={micOn ? 'Tắt mic' : 'Bật mic'}
            >
              {micOn ? <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>

            {/* Nút Phóng to - CHỈ PHÓNG TO KHI BẤM NÚT NÀY */}
            <button
              type="button"
              onClick={handleToggleMinimize}
              className="p-1.5 sm:p-2 rounded-full bg-primary-600 text-white hover:bg-primary-500 shadow-md active:scale-95 transition"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Nút Kết thúc cuộc gọi */}
            <button
              type="button"
              onClick={() => {
                cleanupCall();
                onClose();
              }}
              className="p-1.5 sm:p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition"
              title="Kết thúc cuộc khám"
            >
              <PhoneOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-fade-in overscroll-none touch-none ${
        isFullscreen ? 'p-0' : 'p-0 sm:p-4'
      }`}
    >
      <div
        ref={modalRef}
        className={`bg-black text-white flex flex-col overflow-hidden shadow-2xl relative transition-all duration-150 ${
          isFullscreen
            ? 'w-full h-full max-w-none rounded-none border-none'
            : 'w-full h-[100dvh] sm:h-[88vh] sm:max-w-5xl rounded-none sm:rounded-3xl border-0 sm:border border-gray-800'
        }`}
      >
        {/* Top Header: Nổi đè lên Video trên Mobile (Zalo-style) và thanh trên cố định ở Desktop */}
        <div className="absolute top-0 left-0 right-0 z-20 sm:relative sm:top-auto sm:left-auto sm:right-auto sm:z-10 bg-gradient-to-b from-black/85 via-black/40 to-transparent sm:bg-gray-900/90 sm:border-b sm:border-gray-800 pt-safe px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between shrink-0 pointer-events-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Nút Thu nhỏ cuộc gọi (Minimize to PiP) */}
            <button
              type="button"
              onClick={handleToggleMinimize}
              className="p-2 sm:p-2.5 rounded-full bg-black/50 sm:bg-gray-800/90 text-white sm:text-gray-200 hover:text-white hover:bg-black/70 sm:hover:bg-gray-700 backdrop-blur-md border border-white/20 sm:border-gray-700 active:scale-95 transition flex items-center justify-center shrink-0 shadow-md group"
              title="Thu nhỏ để lướt xem hệ thống"
            >
              <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

            <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 relative shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 ${isPeerConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>

            {/* Mobile Header Title (Gọn gàng, bóng mờ rõ nét trên nền video) */}
            <div className="sm:hidden min-w-0">
              <h3 className="font-bold text-sm text-white drop-shadow truncate">
                {participantName}
              </h3>
              <p className="text-[11px] text-gray-300 drop-shadow flex items-center gap-1.5 truncate">
                <span className={isPeerConnected ? 'text-emerald-300' : 'text-amber-300'}>
                  {isPeerConnected ? 'Trực tuyến' : 'Đang chờ...'}
                </span>
                <span>•</span>
                <span className="font-mono text-emerald-300">{formatTimer(callDuration)}</span>
              </p>
            </div>

            {/* Desktop Header Title */}
            <div className="hidden sm:block">
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Bộ đếm thời gian (Hiển thị pill trên Desktop) */}
            <div className="hidden sm:flex bg-gray-800 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 border border-gray-700 items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              {formatTimer(callDuration)}
            </div>

            {/* Mute Loa để tránh hú khi test 2 tab trên 1 máy tính */}
            <button
              onClick={toggleSpeaker}
              className={`p-2.5 sm:p-2 rounded-full sm:rounded-xl backdrop-blur-md border transition ${
                speakerMuted
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                  : 'bg-black/40 sm:bg-transparent text-white sm:text-gray-400 hover:text-white hover:bg-gray-800 border-white/20 sm:border-transparent'
              }`}
              title={speakerMuted ? 'Bật âm thanh loa' : 'Tắt âm thanh loa'}
            >
              {speakerMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* Bật tắt khung Chat nhanh có badge tin nhắn chưa đọc */}
            <button
              onClick={toggleChat}
              className={`p-2.5 sm:p-2 rounded-full sm:rounded-xl backdrop-blur-md border relative transition ${
                showChat
                  ? 'bg-primary-600 text-white border-primary-500'
                  : 'bg-black/40 sm:bg-transparent text-white sm:text-gray-400 hover:text-white hover:bg-gray-800 border-white/20 sm:border-transparent'
              }`}
              title="Khung chat trong cuộc gọi"
            >
              <MessageSquare className="h-4 w-4" />
              {unreadChatCount > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Thu nhỏ cửa sổ để xem hệ thống (Desktop) */}
            <button
              onClick={handleToggleMinimize}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-700 text-xs font-medium transition active:scale-95"
              title="Thu nhỏ để lướt xem hệ thống"
            >
              <ChevronDown className="h-4 w-4 text-emerald-400" />
              <span>Thu nhỏ</span>
            </button>

            {/* Toàn màn hình (Ẩn trên Mobile vì mobile đã full 100dvh) */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Popup cảnh báo sắp hết 60 phút khám */}
        {showTimeWarningToast && (
          <div className="absolute top-16 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-30 bg-amber-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-300 flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-5 w-5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">⏰ Sắp hết thời gian khám (còn {Math.max(1, Math.ceil((MAX_CALL_DURATION - callDuration) / 60))} phút)!</p>
                <p className="text-[11px] opacity-95">Giới hạn ca khám là 60 phút. Vui lòng chuẩn bị hoàn tất tư vấn.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowTimeWarningToast(false);
                setHasDismissedWarning(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1 rounded-xl text-xs shrink-0 transition"
            >
              Đã hiểu
            </button>
          </div>
        )}

        {/* Thông báo nếu webcam/mic vật lý chuyển sang chế độ ảo */}
        {streamError && (
          <div className="absolute top-16 sm:relative sm:top-auto left-4 right-4 sm:left-auto sm:right-auto z-20 bg-amber-500/80 backdrop-blur-md rounded-xl sm:rounded-none sm:bg-amber-500/10 sm:border-b sm:border-amber-500/20 px-4 py-1.5 text-xs text-amber-100 sm:text-amber-300 text-center flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-200 sm:text-amber-400 shrink-0" />
            <span className="truncate">{streamError}</span>
          </div>
        )}

        {/* Video Stage Main: Tràn viền toàn màn hình trên Mobile như Zalo */}
        <div className="absolute inset-0 sm:relative sm:flex-1 h-full w-full bg-black overflow-hidden flex">
          {/* Vùng Video Người Đối Diện (Remote) */}
          <div className="flex-1 relative h-full w-full flex items-center justify-center bg-black overflow-hidden">
            {/* Video element phát remote stream thực tế (nếu có WebRTC P2P) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={speakerMuted}
              className={`w-full h-full object-cover sm:object-contain transition-opacity duration-500 ${isPeerConnected && hasRemoteVideo ? 'opacity-100 block' : 'hidden'}`}
            />

            {/* Hiển thị avatar nếu đối phương kết nối nhưng tắt camera */}
            {isPeerConnected && !hasRemoteVideo && (
              <div className="text-center space-y-3 p-4 sm:p-6 animate-fade-in">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-2xl mx-auto text-gray-300">
                  {participantName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-200">{participantName}</h4>
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mt-1">
                    <VideoOff className="h-3.5 w-3.5 text-amber-400" /> Đã tắt camera (Đang bật mic)
                  </p>
                </div>
              </div>
            )}

            {/* Màn hình chờ nếu đối phương chưa vào phòng */}
            {!isPeerConnected && (
              <div className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6 max-w-md animate-fade-in">
                <div className="relative mx-auto">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-2xl ring-4 ring-primary-500/30 mx-auto">
                    {participantName?.charAt(0) || 'U'}
                  </div>
                  <span className="animate-ping absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-amber-400 opacity-75"></span>
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-amber-500 border-2 border-gray-950"></span>
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-gray-200">{participantName}</h4>
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
            <div className="absolute bottom-24 left-4 sm:bottom-4 sm:left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs text-gray-200 flex items-center gap-2.5 sm:gap-3 border border-white/15 shadow-2xl max-w-[50%] sm:max-w-none">
              <span className={`h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full shrink-0 ${isPeerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{participantName} ({role === 'doctor' ? 'BN' : 'Bác sĩ'})</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px]">
                  <Volume2 className={`h-3 w-3 shrink-0 ${remoteAudioLevel > 15 ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span className="text-gray-400 hidden sm:inline">Âm thanh:</span>
                  <div className="flex gap-0.5 h-2.5 sm:h-3 items-end shrink-0">
                    {[10, 25, 45, 70, 90].map((threshold, idx) => (
                      <span
                        key={idx}
                        className={`w-0.5 sm:w-1 rounded-xs transition-all ${
                          remoteAudioLevel >= threshold
                            ? 'bg-emerald-400 h-full'
                            : 'bg-gray-700 h-1'
                        }`}
                      />
                    ))}
                  </div>
                  {remoteAudioLevel > 15 && <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium ml-1">Nói...</span>}
                </div>
              </div>
            </div>

            {/* Vùng Video Bản Thân PiP (Nổi ở góc phải, tỉ lệ dọc 3:4 trên mobile, ngang 16:9 trên desktop, kéo thả di chuyển tự do) */}
            <div
              onPointerDown={handlePointerDown}
              className={`absolute bottom-24 right-4 sm:bottom-4 sm:right-4 w-24 sm:w-64 aspect-[3/4] sm:aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 sm:border-gray-700/80 z-20 select-none touch-none cursor-grab active:cursor-grabbing transition-shadow ${
                isDragging ? 'shadow-primary-500/40 ring-2 ring-primary-400 cursor-grabbing' : 'hover:border-white/40'
              }`}
              style={{
                transform: `translate3d(${pipPosition.x}px, ${pipPosition.y}px, 0)`,
                transition: isDragging ? 'none' : 'box-shadow 0.2s ease, transform 0.05s ease',
              }}
              title="Nhấn giữ vào khung hình này để kéo di chuyển tự do"
            >
              {/* Thanh tay cầm kéo chuyên dụng (Header Bar - Hiện trên desktop) */}
              <div
                className={`hidden sm:flex absolute top-0 left-0 right-0 z-20 px-2.5 py-1.5 items-center justify-between text-[11px] transition backdrop-blur-md select-none ${
                  isDragging ? 'bg-primary-600/90 text-white' : 'bg-black/60 text-gray-200 hover:bg-black/80'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium pointer-events-none">
                  <Move className="h-3.5 w-3.5" />
                  <span>Kéo di chuyển</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {(pipPosition.x !== 0 || pipPosition.y !== 0) && (
                    <button
                      type="button"
                      onClick={resetPipPosition}
                      className="px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] text-white flex items-center gap-1 cursor-pointer"
                      title="Đặt lại vị trí ban đầu"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Vị trí gốc
                    </button>
                  )}
                  <span className="text-[10px] text-gray-300 pointer-events-none font-semibold">Bạn</span>
                </div>
              </div>

              {/* Giữ nguyên DOM video luôn luôn mount để không mất stream khi tắt/bật camera */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`w-full h-full object-cover mirror pointer-events-none ${videoOn ? 'block' : 'hidden'}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              {!videoOn && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400 animate-fade-in pointer-events-none p-2 text-center">
                  <VideoOff className="h-5 w-5 sm:h-8 sm:w-8 mb-1 text-gray-500" />
                  <span className="text-[10px] sm:text-[11px]">Tắt camera</span>
                </div>
              )}

              {/* Tag Bạn + Thanh sóng Micro (Voice Detection) */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg flex items-center justify-between text-[9px] sm:text-[10px] text-gray-300 pointer-events-none">
                <span className="truncate">{micOn ? 'Bạn' : 'Tắt mic'}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex gap-0.5 h-2 sm:h-2.5 items-end">
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
                    <span className="text-emerald-400 font-bold text-[8px] sm:text-[9px] hidden sm:inline">Thu âm</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Khung Chat Nhanh Trong Cuộc Gọi (Toàn màn hình trên Mobile, thanh bên trên Desktop) */}
          {showChat && (
            <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col md:relative md:w-80 md:inset-auto md:z-20 md:border-l md:border-gray-800 h-[100dvh] md:h-full animate-fade-in">
              <div className="p-3 sm:p-3.5 pt-safe bg-gray-900 border-b border-gray-800 font-semibold text-xs sm:text-sm text-gray-200 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary-400" /> Tin nhắn cuộc gọi
                </span>
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  ✕ <span>Quay lại video</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs overscroll-contain">
                {inCallMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-2xl max-w-[85%] break-words ${
                      m.sender === (role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân')
                        ? 'bg-primary-600 text-white ml-auto'
                        : m.sender === 'system'
                        ? 'bg-gray-800/80 text-gray-300 italic text-center text-[10px] mx-auto w-full'
                        : 'bg-gray-800 text-gray-200 mr-auto'
                    }`}
                  >
                    {m.sender !== 'system' && (
                      <p className="text-[10px] opacity-75 font-bold mb-1">{m.sender}</p>
                    )}
                    {m.text && <p className="leading-relaxed">{m.text}</p>}

                    {/* Hiển thị File / Hình ảnh đính kèm */}
                    {m.file && (
                      <div className="mt-2">
                        {m.file.isImage ? (
                          <div className="rounded-xl overflow-hidden border border-white/20 bg-black/40 group relative">
                            <div
                              onClick={() => {
                                setPreviewImage({ url: m.file.dataUrl, name: m.file.name });
                                setZoomLevel(1);
                                setRotation(0);
                              }}
                              className="relative cursor-zoom-in block"
                              title="Bấm để phóng to xem chi tiết"
                            >
                              <img
                                src={m.file.dataUrl}
                                alt={m.file.name}
                                className="max-h-48 w-full object-contain rounded-lg hover:opacity-95 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px]">
                                <ZoomIn className="h-4 w-4" />
                                <span>Phóng to ảnh</span>
                              </div>
                            </div>
                            <div className="p-1.5 flex items-center justify-between text-[10px] opacity-90 bg-black/60">
                              <span className="truncate max-w-[120px]">{m.file.name}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewImage({ url: m.file.dataUrl, name: m.file.name });
                                    setZoomLevel(1);
                                    setRotation(0);
                                  }}
                                  className="text-primary-300 hover:text-white flex items-center gap-0.5 cursor-pointer font-medium"
                                  title="Phóng to"
                                >
                                  <ZoomIn className="h-3 w-3" /> Xem to
                                </button>
                                <a
                                  href={m.file.dataUrl}
                                  download={m.file.name}
                                  className="text-primary-300 hover:underline flex items-center gap-0.5"
                                  title="Tải ảnh về máy"
                                >
                                  <Download className="h-3 w-3" /> Tải về
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-black/30 border border-white/15 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-5 w-5 text-primary-300 shrink-0" />
                              <div className="truncate">
                                <p className="text-[11px] font-semibold truncate text-white">{m.file.name}</p>
                                <p className="text-[9px] opacity-70">{m.file.size}</p>
                              </div>
                            </div>
                            <a
                              href={m.file.dataUrl}
                              download={m.file.name}
                              className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold text-white shrink-0 flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" /> Tải
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {m.time && <p className="text-[9px] opacity-60 text-right mt-1">{m.time}</p>}
                  </div>
                ))}
              </div>

              {/* Form Chat và Nút Gửi File (Ô nhập text-[16px] ngăn chặn triệt để Safari iOS auto-zoom) */}
              <form onSubmit={handleSendChat} className="p-2.5 sm:p-3 pb-safe border-t border-gray-800 flex items-center gap-2 bg-gray-900 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition cursor-pointer shrink-0"
                  title="Gửi hình ảnh hoặc tài liệu kết quả/đơn thuốc (< 5MB)"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Gửi tin nhắn..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-[16px] sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar: Nổi đè lên Video trên Mobile (Zalo-style) và thanh dưới cố định ở Desktop */}
        <div className="absolute bottom-6 left-0 right-0 z-20 pb-safe sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:z-10 sm:px-6 sm:py-4 sm:bg-gray-900/95 sm:border-t sm:border-gray-800 flex items-center justify-center gap-5 sm:gap-4 shrink-0 pointer-events-auto">
          {/* Nút Mic */}
          <button
            onClick={toggleMic}
            className={`h-12 w-12 sm:h-auto sm:w-auto p-3.5 rounded-full sm:rounded-2xl transition-all shadow-xl active:scale-90 flex items-center justify-center backdrop-blur-md ${
              micOn
                ? 'bg-black/50 sm:bg-gray-800 border border-white/20 sm:border-transparent text-white hover:bg-black/70'
                : 'bg-red-500/80 sm:bg-red-500/20 text-white sm:text-red-400 border border-red-400 sm:border-red-500/40 hover:bg-red-500/30'
            }`}
            title={micOn ? 'Tắt Microphone' : 'Bật Microphone'}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          {/* Nút Camera */}
          <button
            onClick={toggleVideo}
            className={`h-12 w-12 sm:h-auto sm:w-auto p-3.5 rounded-full sm:rounded-2xl transition-all shadow-xl active:scale-90 flex items-center justify-center backdrop-blur-md ${
              videoOn
                ? 'bg-black/50 sm:bg-gray-800 border border-white/20 sm:border-transparent text-white hover:bg-black/70'
                : 'bg-red-500/80 sm:bg-red-500/20 text-white sm:text-red-400 border border-red-400 sm:border-red-500/40 hover:bg-red-500/30'
            }`}
            title={videoOn ? 'Tắt Camera' : 'Bật Camera'}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          {/* Nút Kết thúc cuộc gọi */}
          <button
            onClick={onClose}
            className="h-12 sm:h-auto px-6 py-3 sm:py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-full sm:rounded-2xl transition-all shadow-2xl flex items-center gap-2 active:scale-90"
            title="Kết thúc cuộc khám"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="text-sm sm:text-base">
              <span className="sm:hidden">Kết thúc</span>
              <span className="hidden sm:inline">Kết thúc cuộc gọi</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── Modal Phóng To Hình Ảnh Trong Cuộc Gọi (Hỗ Trợ Bác Sĩ & Bệnh Nhân) ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 animate-fade-in select-none"
          onClick={() => setPreviewImage(null)}
        >
          {/* Top toolbar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between gap-3 text-white pb-3 border-b border-white/10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate">
              <ImageIcon className="h-4 w-4 text-primary-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold truncate">{previewImage.name || 'Hình ảnh đính kèm'}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Thu nhỏ */}
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <span className="text-xs font-mono font-bold px-1.5 py-1 bg-white/10 rounded-lg min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>

              {/* Phóng to */}
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              {/* Xoay ảnh */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Xoay 90°"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* Tải về */}
              <a
                href={previewImage.url}
                download={previewImage.name || 'hinh_anh_kham.png'}
                className="p-1.5 sm:p-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Tải ảnh về máy"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Tải về</span>
              </a>

              {/* Đóng */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 sm:p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition cursor-pointer ml-1 sm:ml-2"
                title="Đóng (hoặc nhấn phím ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Vùng xem ảnh chính giữa */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto p-2 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                maxHeight: '75vh',
                maxWidth: '90vw',
              }}
              className="object-contain rounded-lg shadow-2xl cursor-default"
            />
          </div>

          {/* Hướng dẫn thoát */}
          <p className="text-[11px] text-gray-400 text-center shrink-0 pt-2">
            Nhấp ra ngoài vùng ảnh hoặc bấm nút [✕] để quay lại màn hình khám trực tuyến
          </p>
        </div>
      )}
    </div>
  );
}
