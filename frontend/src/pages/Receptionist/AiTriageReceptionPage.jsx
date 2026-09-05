import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AiTriageChatbot from '../Public/AiTriageChatbot';
import { apiPost } from '../../services/api';
import {
  BrainCircuit, Zap, AlertTriangle, Stethoscope, CheckCircle,
  ClipboardList, RotateCcw, Sparkles, Clock
} from 'lucide-react';

const QUICK_SYMPTOMS = [
  'Sốt cao, ho nhiều, đau họng',
  'Đau bụng quặn từng cơn',
  'Tức ngực, khó thở',
  'Đau đầu dữ dội, chóng mặt',
  'Đau lưng lan xuống chân',
  'Trẻ em sốt cao, quấy khóc',
  'Nổi mẩn đỏ, ngứa toàn thân',
  'Tiêu chảy nhiều lần trong ngày',
];

export default function AiTriageReceptionPage() {
  const [sessionId] = useState(() => uuidv4());
  const [activeMode, setActiveMode] = useState('quick'); // 'quick' | 'chat'
  const [quickSymptom, setQuickSymptom] = useState('');
  const [quickResult, setQuickResult] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const handleQuickAnalyze = async (symptom) => {
    const text = symptom || quickSymptom;
    if (!text.trim() || quickLoading) return;
    setQuickLoading(true);
    setQuickResult(null);
    try {
      const res = await apiPost('/ai/phan-luong-nhanh', { trieuChung: text });
      const raw = res?.data || res;
      const d = (raw?.data && (raw.data.cau_tra_loi || raw.data.khoa)) ? raw.data : raw;
      setQuickResult(d);
      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setQuickLoading(false);
    }
  };

  const mucDoColors = {
    thap: 'border-l-emerald-500 bg-emerald-50',
    trung_binh: 'border-l-amber-500 bg-amber-50',
    cao: 'border-l-orange-500 bg-orange-50',
    khan_cap: 'border-l-red-600 bg-red-50 animate-pulse',
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-primary-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-amber-300" />
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              AI Triage — Phân Luồng Bệnh Nhân <Sparkles className="h-4 w-4 text-amber-300" />
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">
              Powered by Gemini AI • Nhập triệu chứng để AI gợi ý chuyên khoa phù hợp
            </p>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveMode('quick')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'quick' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Zap className="h-4 w-4 inline mr-1.5" />
          Phân Luồng Nhanh
        </button>
        <button
          onClick={() => setActiveMode('chat')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'chat' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BrainCircuit className="h-4 w-4 inline mr-1.5" />
          Chat AI Chi Tiết
        </button>
      </div>

      {/* QUICK MODE */}
      {activeMode === 'quick' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              Nhập Triệu Chứng Bệnh Nhân
            </h3>

            <textarea
              value={quickSymptom}
              onChange={e => setQuickSymptom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleQuickAnalyze(); }}
              placeholder="Ví dụ: Bệnh nhân khai ho nhiều, sốt 38.5 độ, đau họng từ 2 ngày nay..."
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleQuickAnalyze()}
                disabled={!quickSymptom.trim() || quickLoading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {quickLoading ? (
                  <><div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> Đang phân tích...</>
                ) : (
                  <><Zap className="h-4 w-4" /> Phân Tích Ngay (Ctrl+Enter)</>
                )}
              </button>
              <button
                onClick={() => { setQuickSymptom(''); setQuickResult(null); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Quick symptom chips */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Triệu chứng phổ biến:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SYMPTOMS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuickSymptom(s); handleQuickAnalyze(s); }}
                    className="text-xs bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Kết Quả Phân Luồng AI
            </h3>

            {!quickResult && !quickLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                <BrainCircuit className="h-12 w-12 text-gray-200 mb-3" />
                <p>Nhập triệu chứng và nhấn <strong>Phân Tích</strong> để xem kết quả</p>
              </div>
            )}

            {quickLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm gap-3">
                <div className="h-8 w-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <p>Gemini AI đang phân tích triệu chứng...</p>
              </div>
            )}

            {quickResult && !quickLoading && (
              <div className={`border-l-4 rounded-xl p-4 space-y-3 ${mucDoColors[quickResult.muc_do_uu_tien] || 'border-l-gray-400 bg-gray-50'}`}>
                {/* Khẩn cấp banner */}
                {quickResult.khan_cap && (
                  <div className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    TÌNH TRẠNG KHẨN CẤP — Ưu tiên xử lý ngay!
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Gợi ý chuyên khoa</p>
                    <p className="text-lg font-extrabold text-gray-900">{quickResult.khoa}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/80 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500 font-semibold">Mức độ ưu tiên</p>
                    <p className="font-bold capitalize text-gray-800">{quickResult.muc_do_uu_tien?.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500 font-semibold">Độ tin cậy AI</p>
                    <p className="font-bold text-gray-800">{Math.round((quickResult.do_tin_cay || 0.75) * 100)}%</p>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-600 text-xs mb-1">📋 Phân tích:</p>
                  <p className="leading-relaxed">{quickResult.cau_tra_loi}</p>
                </div>

                <div className="bg-white/80 rounded-lg p-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-600 text-xs mb-1">💡 Lời khuyên sơ bộ:</p>
                  <p className="leading-relaxed">{quickResult.loi_khuyen_so_bo}</p>
                </div>

                {lastChecked && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Phân tích lúc: {lastChecked.toLocaleTimeString('vi-VN')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT MODE (full chatbot) */}
      {activeMode === 'chat' && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ height: '620px' }}>
          <AiTriageChatbot mode="embedded" />
        </div>
      )}
    </div>
  );
}

