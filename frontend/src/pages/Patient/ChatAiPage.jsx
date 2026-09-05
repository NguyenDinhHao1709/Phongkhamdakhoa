import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, FileText, Pill, Apple, AlertTriangle, HeartPulse } from 'lucide-react';
import { apiPost, apiGet } from '../../services/api';

// Hàm render văn bản có format Markdown đơn giản (in đậm, bullet, xuống dòng)
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-[13.5px]">
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
              <span className="text-primary-500 font-bold mt-0.5">•</span>
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

export default function ChatAiPage() {
  const [sessionId, setSessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 10));
  const [patientSummary, setPatientSummary] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là **Bác Sĩ Gia Đình AI 24/7** của Phòng Khám Đa Khoa.\n\nTôi luôn sẵn sàng đồng hành và giải đáp thắc mắc về tình trạng sức khỏe, hướng dẫn dùng thuốc an toàn hay tư vấn chế độ dinh dưỡng, sinh hoạt phù hợp cho bạn. Bạn cần tôi hỗ trợ vấn đề gì hôm nay?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Tải tóm tắt hồ sơ y tế bệnh nhân
  useEffect(() => {
    let isMounted = true;
    apiGet('/ai/patient-summary')
      .then((res) => {
        if (!isMounted || !res) return;
        // Hỗ trợ cả 2 trường hợp response: unwrap hoặc giữ nguyên data wrapper
        const info = res.data?.hoTen ? res.data : (res.hoTen ? res : res.data);
        if (info && (info.hoTen || info.chanDoanGanNhat)) {
          setPatientSummary(info);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

      const aiReply = res.data?.reply || 'Tôi đã tiếp nhận câu hỏi của bạn. Bác sĩ khuyên bạn tiếp tục tuân thủ đơn thuốc và nghỉ ngơi điều độ.';
      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (err) {
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
    const newSession = 'session_' + Math.random().toString(36).substring(2, 10);
    setSessionId(newSession);
    try {
      await apiPost('/ai/patient-reset-session', { sessionId });
    } catch (e) {}

    setMessages([
      {
        sender: 'ai',
        text: 'Cuộc trò chuyện đã được làm mới. Tôi sẵn sàng lắng nghe mọi thắc mắc về bệnh án, đơn thuốc hay chế độ chăm sóc sức khỏe của bạn!',
      },
    ]);
  };

  const quickPrompts = [
    { label: 'Bệnh án & Kết quả khám gần nhất', icon: FileText, text: 'Hãy đọc và giải thích chi tiết bệnh án khám và kết quả xét nghiệm gần nhất của tôi' },
    { label: 'Cách uống đơn thuốc hiện tại', icon: Pill, text: 'Hướng dẫn tôi cách uống các thuốc trong đơn hiện tại, uống trước hay sau ăn và có tác dụng phụ gì không?' },
    { label: 'Chế độ ăn uống & Kiêng khem', icon: Apple, text: 'Với tình trạng bệnh án của tôi, tôi nên ăn uống và kiêng khem những món gì?' },
    { label: 'Dấu hiệu cần tái khám ngay', icon: AlertTriangle, text: 'Tôi uống thuốc xong nếu gặp những dấu hiệu nào thì phải đến phòng khám kiểm tra lại ngay?' },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[86vh] flex flex-col rounded-2xl bg-white shadow-md border border-gray-200 overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b px-6 py-3.5 bg-gradient-to-r from-primary-50 via-white to-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-sm ring-2 ring-primary-100">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">
                Bác Sĩ Gia Đình AI 24/7
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tư vấn cá nhân hóa dựa trên kết quả khám, xét nghiệm & đơn thuốc của bạn
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          title="Làm mới cuộc trò chuyện"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary-700 bg-white hover:bg-primary-50 border border-gray-200 rounded-lg transition-colors shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Làm mới
        </button>
      </div>

      {/* ─── Clinical Summary Badge Bar ─── */}
      {patientSummary?.hoTen && (
        <div className="bg-primary-50/70 border-b border-primary-100 px-6 py-2 flex flex-wrap items-center justify-between text-xs text-gray-700 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Bệnh nhân: <strong className="text-primary-800 font-semibold">{patientSummary.hoTen}</strong> {patientSummary.maBenhNhan ? `(${patientSummary.maBenhNhan})` : ''}
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span>
              Chẩn đoán gần nhất: <strong className="text-gray-900 font-medium">{patientSummary.chanDoanGanNhat || 'Chưa có chẩn đoán'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            {patientSummary.taiKham && (
              <span className="text-primary-700 font-medium">
                Hẹn tái khám: {patientSummary.taiKham}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Messages Feed ─── */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/40">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 text-white text-xs font-bold shadow-2xs ${
                msg.sender === 'user' ? 'bg-gray-800' : 'bg-primary-600 ring-2 ring-primary-100'
              }`}
            >
              {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none text-sm leading-relaxed'
                  : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none'
              }`}
            >
              {msg.sender === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <FormattedMessage text={msg.text} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-primary-700 font-medium bg-primary-50/80 border border-primary-100 rounded-xl px-4 py-2.5 w-fit">
            <Bot className="h-4 w-4 animate-spin text-primary-600" />
            <span>Bác sĩ AI đang đọc dữ liệu bệnh án và tổng hợp câu trả lời...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── Quick Prompts ─── */}
      <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> Gợi ý:
        </span>
        {quickPrompts.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessageText(p.text)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-gray-700 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-gray-200 rounded-full shrink-0 transition-colors"
            >
              <Icon className="h-3 w-3 text-primary-600" />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ─── Input Form ─── */}
      <form onSubmit={handleSend} className="p-3.5 border-t bg-white flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về bệnh án, cách dùng thuốc, kết quả xét nghiệm hay chế độ ăn..."
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-10 px-4 items-center gap-1.5 justify-center rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <span>Gửi</span>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}


