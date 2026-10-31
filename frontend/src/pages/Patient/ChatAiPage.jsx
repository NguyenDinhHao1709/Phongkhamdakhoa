import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  User,
  Sparkles,
  RefreshCw,
  FileText,
  Pill,
  Apple,
  AlertTriangle,
  HeartPulse,
  Calendar,
  CheckCircle2,
  Circle,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowRight,
} from 'lucide-react';
import { apiPost, apiGet } from '../../services/api';
import { formatDate } from '../../utils/formatDate';

// Hàm render văn bản có format Markdown đơn giản (in đậm, bullet, xuống dòng)
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13.5px]">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;

        // Gạch đầu dòng
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const isNumbered = /^\d+\.\s/.test(trimmed);

        const content = isBullet ? trimmed.replace(/^[-*]\s+/, '') : trimmed;

        // Parse in đậm **text**
        const parts = content.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-gray-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span className="flex-1">{renderedLine}</span>
            </div>
          );
        }

        if (isNumbered) {
          return (
            <div key={lIdx} className="pl-1 font-medium text-gray-800">
              {renderedLine}
            </div>
          );
        }

        return <p key={lIdx}>{renderedLine}</p>;
      })}
    </div>
  );
}

// Bóc tách đơn thuốc thành 3 cữ thông minh: Sáng (07:00), Trưa (12:00), Tối (19:00)
function parseMedicationSchedule(danhSachThuoc) {
  if (!danhSachThuoc || !Array.isArray(danhSachThuoc) || danhSachThuoc.length === 0) {
    return { sang: [], trua: [], toi: [] };
  }

  const sang = [];
  const trua = [];
  const toi = [];

  danhSachThuoc.forEach((thuoc) => {
    const ld = (thuoc.lieuDung || '').toLowerCase();

    const hasSang = ld.includes('sáng') || ld.includes('buổi sáng');
    const hasTrua = ld.includes('trưa') || ld.includes('buổi trưa');
    const hasToi =
      ld.includes('tối') ||
      ld.includes('chiều') ||
      ld.includes('ngủ') ||
      ld.includes('trước khi ngủ');
    const has2Lan = ld.includes('2 lần') || ld.includes('2l') || ld.includes('12h') || ld.includes('12 tiếng');
    const has3Lan = ld.includes('3 lần') || ld.includes('3l') || ld.includes('8h') || ld.includes('8 tiếng');
    const has4Lan = ld.includes('4 lần') || ld.includes('4l') || ld.includes('6h') || ld.includes('6 tiếng');

    // Phân bổ
    if (hasSang || has2Lan || has3Lan || has4Lan || (!hasTrua && !hasToi)) {
      sang.push(thuoc);
    }
    if (hasTrua || has3Lan || has4Lan) {
      trua.push(thuoc);
    }
    if (hasToi || has2Lan || has3Lan || has4Lan) {
      toi.push(thuoc);
    }
  });

  return { sang, trua, toi };
}

export default function ChatAiPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 10));
  const [patientSummary, setPatientSummary] = useState(null);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'health' trên mobile
  const [activeDoseTab, setActiveDoseTab] = useState('sang'); // 'sang' | 'trua' | 'toi'

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là **Bác Sĩ Gia Đình AI 24/7** của Phòng Khám Đa Khoa.\n\nTôi luôn sẵn sàng đồng hành và giải đáp thắc mắc về tình trạng sức khỏe, hướng dẫn dùng thuốc an toàn hay tư vấn chế độ dinh dưỡng, sinh hoạt phù hợp cho bạn. Bạn cần tôi hỗ trợ vấn đề gì hôm nay?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Lưu trạng thái uống thuốc theo ngày hiện tại trong localStorage
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [takenMap, setTakenMap] = useState(() => {
    try {
      const stored = localStorage.getItem(`patient_meds_taken_${todayKey}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Giọng nói: Speech Recognition (STT) & Dual-Engine Speech Synthesis (TTS)
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const audioQueueRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Tải hồ sơ y tế & tóm tắt lâm sàng (kết hợp EMR cốt lõi và AI summary)
  useEffect(() => {
    let isMounted = true;

    const loadClinicalData = async () => {
      // 1. Lấy dữ liệu EMR trực tiếp từ CSDL (/ho-so-benh-an/cua-toi)
      try {
        const emrRes = await apiGet('/ho-so-benh-an/cua-toi');
        const emrData = emrRes?.data?.data || emrRes?.data || emrRes;
        const bn = emrData?.benhNhan;
        const records = Array.isArray(emrData?.lichSuKham) ? emrData.lichSuKham : [];
        const latest = records[0];

        // Lấy đơn thuốc đợt khám mới nhất
        let latestDon = null;
        for (const rec of records) {
          if (Array.isArray(rec?.donThuoc) && rec.donThuoc.length > 0) {
            latestDon = rec.donThuoc[0];
            break;
          } else if (rec?.donThuoc?.chiTiet) {
            latestDon = rec.donThuoc;
            break;
          }
        }

        const rawChiTiet = latestDon?.chiTiet || [];
        const parsedThuoc = rawChiTiet.map((ct) => ({
          id: ct.id || Math.random(),
          thuocId: ct.thuocId,
          tenThuoc: ct.thuoc?.tenThuoc || ct.tenThuoc || 'Thuốc điều trị',
          tenHoatChat: ct.thuoc?.tenHoatChat || '',
          soLuong: ct.soLuong || 1,
          donViTinh: ct.thuoc?.donViTinh || ct.donViTinh || 'Viên',
          lieuDung: ct.lieuDung || 'Theo chỉ định của bác sĩ',
          soNgayDung: ct.soNgayDung || 5,
        }));

        const ngayKhamStr = latest?.ngayKham ? formatDate(latest.ngayKham) : null;
        const taiKhamStr = latest?.taiKham ? formatDate(latest.taiKham) : null;

        const baseSummary = {
          hoTen: bn?.hoTen || 'Bệnh nhân',
          maBenhNhan: bn?.maBenhNhan || 'BN---',
          chanDoanGanNhat:
            latest?.chanDoanXacDinh ||
            latest?.chanDoanSoBo ||
            latest?.benhAn?.chanDoanXacDinh ||
            latest?.benhAn?.chanDoanSoBo ||
            'Đang theo dõi sức khỏe tổng quát',
          ngayKham: ngayKhamStr,
          taiKham: taiKhamStr,
          ngayTaiKhamRaw: latest?.taiKham || null,
          soThuocDangUong: parsedThuoc.length,
          bacSiDieuTri: latest?.bacSi
            ? {
                id: latest.bacSi.id,
                hoTen: latest.bacSi.nhanVien?.hoTen || latest.bacSi.hoTen || 'Bác sĩ điều trị',
                chuyenKhoa: latest.bacSi.chuyenKhoa || 'Nội tổng quát',
              }
            : null,
          danhSachThuoc: parsedThuoc,
        };

        if (isMounted) {
          setPatientSummary(baseSummary);
        }
      } catch (err) {
        console.warn('Lỗi đọc EMR hồ sơ:', err);
      }

      // 2. Gọi thêm /ai/patient-summary để đồng bộ thêm nếu AI Microservice đang chạy
      try {
        const aiRes = await apiGet('/ai/patient-summary');
        const aiData = aiRes?.data?.hoTen ? aiRes.data : aiRes?.data;
        if (isMounted && aiData && (aiData.hoTen || aiData.chanDoanGanNhat)) {
          setPatientSummary((prev) => ({
            ...(prev || {}),
            ...aiData,
            danhSachThuoc:
              aiData.danhSachThuoc && aiData.danhSachThuoc.length > 0
                ? aiData.danhSachThuoc
                : prev?.danhSachThuoc || [],
          }));
        }
      } catch {}
    };

    loadClinicalData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cuộn khung chat xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Nạp danh sách voices hỗ trợ tiếng Việt trên trình duyệt
  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const vList = window.speechSynthesis.getVoices();
        if (vList && vList.length > 0) {
          setVoices(vList);
        }
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Khởi tạo SpeechRecognition (Mic thu âm tiếng Việt)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  // Toggle thu âm giọng nói
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói. Vui lòng thử dùng Google Chrome hoặc Microsoft Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Tách văn bản thành danh sách câu ngắn hoàn chỉnh (< 180 ký tự) để phát nối tiếp
  const splitIntoSentences = (text) => {
    const clean = (text || '')
      .replace(/[*#_`]/g, '')
      .replace(/[-•]\s+/g, ', ')
      .replace(/\r/g, '')
      .trim();

    // Tách theo dấu chấm, hỏi, than, hoặc xuống dòng
    const rawParts = clean.split(/(?<=[.?!;\n])\s+/);
    const chunks = [];
    let current = '';

    for (const part of rawParts) {
      const s = part.trim();
      if (!s) continue;

      if ((current + ' ' + s).length <= 180) {
        current = current ? current + ' ' + s : s;
      } else {
        if (current) chunks.push(current);
        if (s.length > 180) {
          // Nếu 1 câu quá dài (> 180 ký tự), ngắt theo dấu phẩy hoặc từ
          const subParts = s.match(/.{1,170}(?:\s|$)/g) || [s];
          subParts.forEach((sp) => {
            const trimmed = sp.trim();
            if (trimmed) chunks.push(trimmed);
          });
          current = '';
        } else {
          current = s;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  // Dừng phát âm thanh ngay lập tức
  const stopSpeaking = () => {
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    currentChunkIndexRef.current = 0;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
  };

  // Phát câu tiếp theo trong danh sách câu nối tiếp
  const playNextSentence = () => {
    if (!isPlayingRef.current) return;

    if (currentChunkIndexRef.current >= audioQueueRef.current.length) {
      stopSpeaking();
      return;
    }

    const chunk = audioQueueRef.current[currentChunkIndexRef.current];
    currentChunkIndexRef.current += 1;

    try {
      const audioUrl = `/api/ai/tts?text=${encodeURIComponent(chunk)}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        if (isPlayingRef.current) {
          playNextSentence();
        }
      };

      audio.onerror = () => {
        // Tự động chuyển tiếp câu tiếp theo nếu có gián đoạn mạng
        if (isPlayingRef.current) {
          playNextSentence();
        }
      };

      audio.play().catch(() => {
        stopSpeaking();
      });
    } catch {
      stopSpeaking();
    }
  };

  // Đọc toàn bộ đoạn văn từ đầu đến cuối (hoặc dừng khi bấm nút)
  const toggleSpeak = (text, idx) => {
    if (speakingIndex === idx) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    // 1. Nếu trình duyệt có sẵn voice tiếng Việt cục bộ (vi-VN), ưu tiên phát trực tiếp
    const viVoice = voices.find(
      (v) =>
        v.lang === 'vi-VN' ||
        v.lang === 'vi_VN' ||
        v.lang?.toLowerCase().startsWith('vi') ||
        v.name?.toLowerCase().includes('vietnam') ||
        v.name?.toLowerCase().includes('tiếng việt') ||
        v.name?.toLowerCase().includes('hoaimy') ||
        v.name?.toLowerCase().includes('namminh')
    );

    if (viVoice && 'speechSynthesis' in window) {
      const cleanText = (text || '')
        .replace(/[*#_`]/g, '')
        .replace(/[-•]\s+/g, ', ')
        .replace(/\n+/g, '. ')
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = viVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);

      setSpeakingIndex(idx);
      window.speechSynthesis.speak(utterance);
      return;
    }

    // 2. Ngược lại: Dùng Server-Side Audio Stream phát nối tiếp toàn bộ câu từ đầu đến cuối
    const chunks = splitIntoSentences(text);
    if (chunks.length === 0) return;

    audioQueueRef.current = chunks;
    currentChunkIndexRef.current = 0;
    isPlayingRef.current = true;
    setSpeakingIndex(idx);

    playNextSentence();
  };

  // Gửi tin nhắn đến AI
  const sendMessageText = async (textToSend) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiPost('/ai/patient-chat', {
        sessionId,
        message: userMsg,
      });

      if (res.data?.summary && !patientSummary) {
        setPatientSummary(res.data.summary);
      }

      const aiReply =
        res.data?.reply ||
        'Tôi đã tiếp nhận câu hỏi của bạn. Bác sĩ khuyên bạn tiếp tục tuân thủ đơn thuốc và nghỉ ngơi điều độ.';
      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Xin lỗi, kết nối tới trợ lý AI gặp chút gián đoạn. Bạn thử bấm gửi lại hoặc tải lại trang nhé!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessageText(input);
  };

  const handleReset = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    const newSession = 'session_' + Math.random().toString(36).substring(2, 10);
    setSessionId(newSession);
    try {
      await apiPost('/ai/patient-reset-session', { sessionId });
    } catch {}

    setMessages([
      {
        sender: 'ai',
        text: 'Cuộc trò chuyện đã được làm mới. Tôi sẵn sàng lắng nghe mọi thắc mắc về bệnh án, đơn thuốc hay chế độ chăm sóc sức khỏe của bạn!',
      },
    ]);
  };

  // Toggle trạng thái uống thuốc
  const toggleMedTaken = (doseKey, thuocId) => {
    const key = `${doseKey}_${thuocId}`;
    setTakenMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(`patient_meds_taken_${todayKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Phân tích lịch cữ thuốc
  const schedule = useMemo(
    () => parseMedicationSchedule(patientSummary?.danhSachThuoc),
    [patientSummary?.danhSachThuoc]
  );

  // Tính tỷ lệ tuân thủ điều trị hôm nay
  const totalDosesCount =
    (schedule.sang?.length || 0) + (schedule.trua?.length || 0) + (schedule.toi?.length || 0);

  const takenDosesCount = useMemo(() => {
    let count = 0;
    ['sang', 'trua', 'toi'].forEach((dose) => {
      (schedule[dose] || []).forEach((t) => {
        if (takenMap[`${dose}_${t.id}`]) count++;
      });
    });
    return count;
  }, [schedule, takenMap]);

  const adherencePct = totalDosesCount > 0 ? Math.round((takenDosesCount / totalDosesCount) * 100) : 100;

  // Hỏi AI nhanh về một loại thuốc cụ thể
  const askAboutMedication = (thuoc) => {
    const query = `Bác sĩ giải thích giúp tôi thuốc "${thuoc.tenThuoc}" (${thuoc.tenHoatChat || ''}) có công dụng gì, cách uống như thế nào và có lưu ý hay tác dụng phụ gì khi uống không?`;
    if (mobileTab !== 'chat') setMobileTab('chat');
    sendMessageText(query);
  };

  // Đặt lịch tái khám nhanh với bác sĩ điều trị
  const handleBookFollowUp = () => {
    const bs = patientSummary?.bacSiDieuTri;
    navigate('/benh-nhan/dat-lich', {
      state: {
        bacSiId: bs?.id,
        chuyenKhoa: bs?.chuyenKhoa,
        hinhThuc: 'truc_tiep',
      },
    });
  };

  const quickPrompts = [
    {
      label: 'Giải thích bệnh án gần nhất',
      icon: FileText,
      text: 'Hãy đọc và giải thích chi tiết bệnh án khám và kết quả xét nghiệm gần nhất của tôi',
    },
    {
      label: 'Cách uống đơn thuốc hiện tại',
      icon: Pill,
      text: 'Hướng dẫn tôi cách uống các thuốc trong đơn hiện tại, uống trước hay sau ăn và có tác dụng phụ gì không?',
    },
    {
      label: 'Chế độ ăn uống & Kiêng khem',
      icon: Apple,
      text: 'Với tình trạng bệnh án của tôi, tôi nên ăn uống và kiêng khem những món gì?',
    },
    {
      label: 'Dấu hiệu cần tái khám ngay',
      icon: AlertTriangle,
      text: 'Tôi uống thuốc xong nếu gặp những dấu hiệu nào thì phải đến phòng khám kiểm tra lại ngay?',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-135px)] sm:h-[86vh] flex flex-col space-y-3">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'chat' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bot className="h-4 w-4 text-blue-600" />
          Bác Sĩ AI 24/7
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('health')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'health' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Pill className="h-4 w-4 text-emerald-600" />
          Hộp Thuốc & Sức Khỏe ({takenDosesCount}/{totalDosesCount})
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* CỘT TRÁI (38%): SỨC KHỎE CỦA TÔI & LỊCH UỐNG THUỐC HÔM NAY */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-3 h-full overflow-y-auto no-scrollbar ${
            mobileTab === 'health' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* 1. Thẻ Bệnh nhân & Chẩn đoán */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase">
                  Bệnh nhân quản lý
                </span>
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  {patientSummary?.hoTen || 'Bệnh nhân'}
                </h4>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                {patientSummary?.maBenhNhan || 'BN---'}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-500 shrink-0">Chẩn đoán gần nhất:</span>
                <span className="font-semibold text-gray-900 text-right line-clamp-2">
                  {patientSummary?.chanDoanGanNhat || 'Chưa có chẩn đoán'}
                </span>
              </div>
              {patientSummary?.ngayKham && (
                <div className="flex items-center justify-between text-gray-500">
                  <span>Khám ngày:</span>
                  <span className="font-medium text-gray-700">{patientSummary.ngayKham}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Thẻ Lịch Uống Thuốc Thông Minh (Smart Medication Timeline) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs flex-1 flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs sm:text-sm">Lịch Uống Thuốc Hôm Nay</h4>
                  <p className="text-[11px] text-gray-500">Nhắc nhở & theo dõi tuân thủ</p>
                </div>
              </div>

              {totalDosesCount > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    adherencePct === 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : adherencePct >= 50
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {adherencePct}% Hoàn thành
                </span>
              )}
            </div>

            {/* Progress bar tuân thủ */}
            {totalDosesCount > 0 && (
              <div className="mt-3 shrink-0">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                  <span>Đã uống: <strong className="text-gray-800 font-semibold">{takenDosesCount}/{totalDosesCount} cữ</strong></span>
                  <span className="font-medium text-gray-600">{adherencePct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${adherencePct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Doses Tabs: Sáng, Trưa, Tối */}
            {totalDosesCount > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-1.5 mt-3 p-1 bg-gray-100 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveDoseTab('sang')}
                    className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeDoseTab === 'sang'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>🌅 Sáng</span>
                    <span className="text-[10px] opacity-75">({schedule.sang.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDoseTab('trua')}
                    className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeDoseTab === 'trua'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>☀️ Trưa</span>
                    <span className="text-[10px] opacity-75">({schedule.trua.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDoseTab('toi')}
                    className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeDoseTab === 'toi'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>🌙 Tối</span>
                    <span className="text-[10px] opacity-75">({schedule.toi.length})</span>
                  </button>
                </div>

                {/* Danh sách thuốc trong cữ đang chọn */}
                <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {(schedule[activeDoseTab] || []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      Không có loại thuốc nào cần uống vào cữ này.
                    </div>
                  ) : (
                    schedule[activeDoseTab].map((thuoc) => {
                      const isTaken = !!takenMap[`${activeDoseTab}_${thuoc.id}`];
                      return (
                        <div
                          key={thuoc.id}
                          className={`p-2.5 rounded-xl border transition-all text-xs flex items-start justify-between gap-2 ${
                            isTaken
                              ? 'bg-emerald-50/70 border-emerald-200 text-gray-700'
                              : 'bg-white border-gray-200 text-gray-800 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleMedTaken(activeDoseTab, thuoc.id)}
                              className="mt-0.5 text-emerald-600 hover:text-emerald-700 transition-transform active:scale-90"
                              title={isTaken ? 'Bấm để hủy đánh dấu' : 'Bấm để đánh dấu đã uống'}
                            >
                              {isTaken ? (
                                <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-300 hover:text-emerald-500" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-semibold ${isTaken ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {thuoc.tenThuoc}
                                </span>
                                {thuoc.tenHoatChat && (
                                  <span className="text-[10px] text-gray-400">({thuoc.tenHoatChat})</span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Liều dùng: <strong className="text-gray-700 font-medium">{thuoc.lieuDung}</strong>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => askAboutMedication(thuoc)}
                            title="Hỏi Bác sĩ AI về loại thuốc này"
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-400 text-xs">
                <Pill className="h-8 w-8 text-gray-300 mb-2 stroke-1" />
                <p className="font-medium text-gray-600">Hiện tại bạn không có đơn thuốc đang điều trị</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Nếu bạn vừa đi khám xong, thông tin đơn thuốc sẽ xuất hiện tại đây sau khi bác sĩ hoàn tất kê đơn.
                </p>
              </div>
            )}
          </div>

          {/* 3. Thẻ Nhắc Hẹn Tái Khám & Đặt Lịch Nhanh 1-Chạm */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-sm shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-200" />
                <span className="text-xs font-semibold text-blue-100">Kế hoạch tái khám</span>
              </div>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                {patientSummary?.taiKham ? 'Có chỉ định' : 'Theo dõi'}
              </span>
            </div>

            <div className="mt-2.5">
              <h5 className="font-bold text-sm">
                {patientSummary?.taiKham ? `Hẹn ngày: ${patientSummary.taiKham}` : 'Khám theo dõi định kỳ'}
              </h5>
              {patientSummary?.bacSiDieuTri?.hoTen && (
                <p className="text-xs text-blue-100 mt-0.5">
                  Bác sĩ điều trị: {patientSummary.bacSiDieuTri.hoTen} ({patientSummary.bacSiDieuTri.chuyenKhoa})
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleBookFollowUp}
              className="mt-3.5 w-full bg-white text-blue-700 hover:bg-blue-50 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Đặt lịch tái khám với Bác sĩ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI (62%): KHUNG TRÒ CHUYỆN BÁC SĨ GIA ĐÌNH AI 24/7 */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header Chat */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">Bác Sĩ Gia Đình AI 24/7</h3>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Trực tuyến
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Tư vấn cá nhân hóa dựa trên dữ liệu bệnh án & đơn thuốc thực tế của bạn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              title="Làm mới cuộc trò chuyện"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          {/* Messages Feed */}
          <div ref={chatContainerRef} className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4 bg-gray-50/80">
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              const isSpeaking = speakingIndex === idx;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 text-white text-xs font-bold ${
                      isUser ? 'bg-gray-700 shadow-xs' : 'bg-blue-600 shadow-xs'
                    }`}
                  >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`group relative max-w-[85%] sm:max-w-2xl rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none text-xs sm:text-[13.5px] leading-relaxed shadow-xs'
                        : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none shadow-2xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <>
                        <FormattedMessage text={msg.text} />

                        {/* Nút Nghe giọng đọc tiếng Việt cho câu trả lời của AI */}
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="italic">Bác sĩ gia đình AI</span>
                          <button
                            type="button"
                            onClick={() => toggleSpeak(msg.text, idx)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                              isSpeaking
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'hover:bg-gray-100 text-gray-500'
                            }`}
                            title={isSpeaking ? 'Dừng đọc' : 'Đọc câu trả lời'}
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
                                <span className="text-rose-700 font-semibold">Dừng đọc</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>Đọc</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 w-fit shadow-xs">
                <Bot className="h-4 w-4 animate-spin text-blue-600" />
                <span>Bác sĩ AI đang đối chiếu dữ liệu bệnh án và soạn câu trả lời...</span>
              </div>
            )}
          </div>

            {/* Quick Prompts */}
          <div className="px-3 sm:px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" /> Gợi ý:
            </span>
            {quickPrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessageText(p.text)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1 text-[11px] sm:text-xs text-gray-600 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-full shrink-0 transition-colors"
                >
                  <Icon className="h-3 w-3 text-blue-600" />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Input Form with Voice Mic */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0"
          >
            {/* Nút Micro thu âm tiếng Việt (Speech-to-Text) */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={isListening ? 'Đang nghe... bấm để dừng' : 'Bấm để nói bằng giọng nói'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Đang lắng nghe bạn nói...' : 'Hỏi về bệnh án, đơn thuốc, chế độ ăn...'}
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 px-4 items-center gap-1.5 justify-center rounded-xl bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
            >
              <span>Gửi</span>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
