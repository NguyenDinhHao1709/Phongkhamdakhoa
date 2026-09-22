import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bot, Send, X, RotateCcw, AlertTriangle, Stethoscope, ChevronDown, MessageCircle, Zap, Minus, Calendar } from 'lucide-react';
import { apiPost } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const CHUYEN_KHOA_COLORS = {
  CAP_CUU: 'bg-red-600',
  TIM: 'bg-rose-600',
  HH_TMH: 'bg-sky-600',
  NOI: 'bg-blue-600',
  TK: 'bg-indigo-600',
  TH: 'bg-amber-600',
  CXK: 'bg-orange-600',
  NHI: 'bg-pink-600',
  DA: 'bg-teal-600',
  MAT: 'bg-cyan-600',
};

const QUICK_SUGGESTIONS = [
  'Tôi bị đau đầu và chóng mặt từ sáng',
  'Bé nhà tôi sốt 39 độ, ho nhiều',
  'Tôi tức ngực, khó thở',
  'Đau bụng dưới liên tục từ hôm qua',
  'Đau lưng, mỏi khớp gối',
];

export default function AiTriageChatbot({ mode = 'floating', onClose, onMinimize, initialMessage = '' }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'bot',
      text: '🏥 Xin chào! Tôi là **Trợ Lý Y Tế AI Triage** của Phòng Khám Đa Khoa.\n\nHãy mô tả các triệu chứng hoặc cảm giác khó chịu của bạn (ví dụ: sốt, ho, đau đầu, tức ngực...). Tôi sẽ phân tích và gợi ý chuyên khoa khám bệnh phù hợp nhất cho bạn.',
      data: null, timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [khanCap, setKhanCap] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (initialMessage) sendMessage(initialMessage);
  }, []);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setLoading(true);

    const userMsg = { id: Date.now(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    // Lấy 6 tin nhắn hội thoại gần nhất gửi kèm để AI nắm giữ ngữ cảnh (Chat Context)
    const chatHistory = messages
      .filter(m => m.text && !m.text.startsWith('⚠️') && !m.text.startsWith('🔄'))
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    try {
      const res = await apiPost('/ai/triage-chat', { 
        sessionId, 
        message: msg,
        history: chatHistory,
      });
      const raw = res?.data || res;
      const d = (raw?.data && (raw.data.cau_tra_loi || raw.data.chuyen_khoa || raw.data.khoa)) ? raw.data : raw;

      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: d?.cau_tra_loi || 'Tôi đã tiếp nhận triệu chứng của bạn và đang gợi ý khoa khám phù hợp.',
        data: d,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMsg]);
      setLastResult(d);

      if (d.khan_cap) {
        setKhanCap(true);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        text: '⚠️ Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại hoặc liên hệ nhân viên tiếp tân qua hotline 1900 8888.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleReset = async () => {
    try { await apiPost('/ai/reset-session', { sessionId }); } catch (_) {}
    setMessages([{
      id: Date.now(), role: 'bot',
      text: '🔄 Cuộc trò chuyện đã được đặt lại. Bạn đang có dấu hiệu hoặc vấn đề sức khỏe gì cần tư vấn?',
      data: null, timestamp: new Date(),
    }]);
    setLastResult(null);
    setKhanCap(false);
  };

  const handleDatLich = (chuyenKhoa = null) => {
    if (mode === 'floating' && onClose) onClose();
    const query = chuyenKhoa ? `?chuyenKhoa=${encodeURIComponent(chuyenKhoa)}` : '';
    const target = `/benh-nhan/dat-lich${query}`;
    if (isAuthenticated && user?.vaiTro === 'benh_nhan') {
      navigate(target);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
    }
  };

  const renderText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.replace(/\*\*(.*?)\*\*/g, (_, m) => m).split(/(\*\*.*?\*\*)/).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className={`flex flex-col bg-white overflow-hidden ${mode === 'floating' ? 'rounded-2xl shadow-2xl border border-slate-200 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] h-[560px] max-h-[85vh]' : 'h-full w-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 text-white px-4 py-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-primary-700 animate-pulse"></span>
          </div>
          <div>
            <p className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
              AI Triage Tư Vấn Y Tế
            </p>
            <p className="text-[11px] text-blue-200 flex items-center gap-1 font-medium">
              <Zap className="h-3 w-3 text-amber-300" /> Sẵn sàng 24/7 • Gợi ý chuyên khoa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleReset} 
            title="Đặt lại cuộc trò chuyện" 
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {onMinimize && (
            <button 
              onClick={onMinimize} 
              title="Thu nhỏ" 
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose} 
              title="Đóng chatbot" 
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/90 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cảnh báo khẩn cấp */}
      {khanCap && (
        <div className="bg-red-600 text-white px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-bold shrink-0 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>TRIỆU CHỨNG CÓ THỂ NGUY HIỂM! Cần cấp cứu ngay!</span>
          </div>
          <a href="tel:19008888" className="px-2 py-1 bg-white text-red-700 rounded-md text-[10px] font-black uppercase whitespace-nowrap hover:bg-red-50">
            Gọi 1900 8888
          </a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}>
            {msg.role === 'bot' && (
              <div className="h-7 w-7 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={`max-w-[85%]`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-xs shadow-xs'
                  : 'bg-white text-gray-800 rounded-tl-xs border border-slate-200 shadow-2xs'
              }`}>
                {renderText(msg.text)}
              </div>

              {/* Card kết quả AI gợi ý chuyên khoa */}
              {msg.data && (msg.data.chuyen_khoa || msg.data.khoa) && !msg.data.can_hoi_them && (
                <div className="mt-2.5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
                  <div className={`${CHUYEN_KHOA_COLORS[msg.data.ma_khoa] || 'bg-primary-600'} text-white px-3.5 py-2.5 flex items-center justify-between gap-2`}>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 shrink-0" />
                      <span className="font-extrabold text-xs sm:text-sm">Gợi ý: {msg.data.chuyen_khoa || msg.data.khoa}</span>
                    </div>
                    {msg.data.khan_cap && (
                      <span className="bg-red-200 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Khẩn cấp
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5 text-xs text-gray-600 bg-white">
                    {msg.data.loi_khuyen_so_bo && (
                      <p className="leading-relaxed">
                        <strong className="text-gray-900 font-semibold">Lời khuyên:</strong> {msg.data.loi_khuyen_so_bo}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-slate-100">
                      <span>Độ tin cậy AI:</span>
                      <strong className="text-primary-700 font-bold">{Math.round((msg.data.do_tin_cay || 0.85) * 100)}%</strong>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => handleDatLich(msg.data.chuyen_khoa || msg.data.khoa)}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="h-3.5 w-3.5" /> Đặt lịch khám {msg.data.chuyen_khoa || msg.data.khoa} ngay
                    </button>
                  </div>
                </div>
              )}

              {msg.data && (msg.data.chuyen_khoa || msg.data.khoa) && msg.data.can_hoi_them && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                  <Stethoscope className="h-3 w-3 text-primary-500 animate-pulse" />
                  <span>Đang định hướng: <strong className="text-primary-700">{msg.data.chuyen_khoa || msg.data.khoa}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-200 shadow-2xs">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></span>
                ))}
                <span className="text-xs text-gray-500 ml-1 font-medium">AI đang phân tích triệu chứng...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && (
        <div className="px-3.5 pt-2 pb-2 bg-white border-t border-slate-100 shrink-0">
          <p className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            Gợi ý triệu chứng mẫu:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full transition-colors font-medium text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-200 p-3 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Khai báo triệu chứng (ví dụ: sốt, ho, đau bụng...)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="h-10 w-10 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-xs"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Khách hàng chưa đăng nhập vẫn sử dụng bình thường • AI hỗ trợ gợi ý chuyên khoa
        </p>
      </div>
    </div>
  );
}

