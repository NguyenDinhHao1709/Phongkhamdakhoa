import { useState } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { apiPost } from '../../services/api';

export default function ChatAiPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Sức khỏe của Phòng Khám Đa Khoa. Bạn cần hỗ trợ thông tin y tế hay lời khuyên chăm sóc sức khỏe nào hôm nay?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiPost('/ai/goi-y-chuyen-khoa', { trieuChung: userMsg });
      const aiReply = res.data?.loiKhuyen
        ? `Gợi ý từ AI: ${res.data.loiKhuyen} (Nên tham khảo chuyên khoa ${res.data.chuyenKhoaGoiY})`
        : 'Cảm ơn bạn đã hỏi. Bạn nên đến cơ sở y tế để bác sĩ tư vấn và khám trực tiếp nhé!';

      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Xin lỗi, trợ lý AI gặp chút gián đoạn. Bạn thử hỏi lại nhé!' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4 bg-gray-50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
            Trợ lý AI Sức Khỏe 24/7 <Sparkles className="h-4 w-4 text-primary-600" />
          </h3>
          <p className="text-xs text-gray-500">Tư vấn y tế & Giải đáp thắc mắc sức khỏe tức thì</p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 text-white text-xs font-bold ${
                msg.sender === 'user' ? 'bg-gray-700' : 'bg-primary-600'
              }`}
            >
              {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium italic">
            <Bot className="h-4 w-4 animate-bounce text-primary-600" /> Trợ lý AI đang suy nghĩ câu trả lời...
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-4 border-t bg-white flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi sức khỏe hoặc triệu chứng bạn cần tư vấn..."
          className="flex-1 rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

