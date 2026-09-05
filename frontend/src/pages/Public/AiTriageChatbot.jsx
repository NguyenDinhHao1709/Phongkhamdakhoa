import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bot, Send, X, RotateCcw, AlertTriangle, Stethoscope, ChevronDown, MessageCircle, Zap } from 'lucide-react';
import { apiPost } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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

export default function AiTriageChatbot({ mode = 'floating', onClose, initialMessage = '' }) {
  const navigate = useNavigate();
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'bot',
      text: '🏥 Xin chào! Tôi là **AI Triage** của Phòng Khám Đa Khoa.\n\nHãy mô tả triệu chứng của bạn và tôi sẽ gợi ý chuyên khoa phù hợp nhất. Bạn có thể gõ tự do bằng tiếng Việt.',
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

    try {
      const res = await apiPost('/ai/triage-chat', { sessionId, message: msg });
      const d = res?.data || res;

      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: d.cau_tra_loi,
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
        text: '⚠️ Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại hoặc liên hệ nhân viên tiếp tân.',
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
      text: '🔄 Cuộc trò chuyện đã được đặt lại. Bạn có vấn đề sức khỏe gì cần tư vấn?',
      data: null, timestamp: new Date(),
    }]);
    setLastResult(null);
    setKhanCap(false);
  };

  const handleDatLich = () => {
    if (mode === 'floating' && onClose) onClose();
    navigate('/dat-lich');
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
    <div className={`flex flex-col bg-white ${mode === 'floating' ? 'rounded-2xl shadow-2xl border border-gray-200 w-[420px] max-w-full h-[600px]' : 'h-full w-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-700 to-indigo-700 text-white px-4 py-3 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-primary-700"></span>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">AI Triage Phòng Khám</p>
            <p className="text-[11px] text-blue-200 flex items-center gap-1"><Zap className="h-3 w-3" /> Powered by Gemini AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleReset} title="Đặt lại cuộc trò chuyện" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cảnh báo khẩn cấp */}
      {khanCap && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm font-bold animate-pulse shrink-0">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>🚨 TRIỆU CHỨNG CÓ THỂ NGUY HIỂM! Vui lòng đến PHÒNG CẤP CỨU ngay hoặc gọi 115!</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'bot' && (
              <div className="h-7 w-7 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {renderText(msg.text)}
              </div>

              {/* Card kết quả AI */}
              {msg.data && msg.data.khoa && !msg.data.can_hoi_them && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                  <div className={`${CHUYEN_KHOA_COLORS[msg.data.ma_khoa] || 'bg-primary-600'} text-white px-3 py-2 flex items-center gap-2`}>
                    <Stethoscope className="h-4 w-4" />
                    <span className="font-bold text-sm">Gợi ý: {msg.data.khoa}</span>
                    {msg.data.khan_cap && <span className="ml-auto bg-red-200 text-red-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">KHẨN CẤP</span>}
                  </div>
                  <div className="px-3 py-2 space-y-1 text-xs text-gray-600">
                    <p><strong>Lời khuyên:</strong> {msg.data.loi_khuyen_so_bo}</p>
                    <p><strong>Độ tin cậy AI:</strong> {Math.round((msg.data.do_tin_cay || 0.75) * 100)}%</p>
                  </div>
                  <div className="px-3 pb-2">
                    <button
                      onClick={handleDatLich}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      📅 Đặt lịch khám ngay
                    </button>
                  </div>
                </div>
              )}

              {msg.data && msg.data.khoa && msg.data.can_hoi_them && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Stethoscope className="h-3 w-3 text-primary-500" />
                  <span>Đang phân tích: <strong className="text-primary-700">{msg.data.khoa}</strong></span>
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
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></span>
                ))}
                <span className="text-xs text-gray-500 ml-1">Gemini đang phân tích...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Gợi ý nhanh:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-[11px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full transition-colors font-medium"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 px-3 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Mô tả triệu chứng của bạn... (Enter để gửi)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="h-10 w-10 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">AI chỉ hỗ trợ gợi ý, không thay thế khám lâm sàng của bác sĩ.</p>
      </div>
    </div>
  );
}

