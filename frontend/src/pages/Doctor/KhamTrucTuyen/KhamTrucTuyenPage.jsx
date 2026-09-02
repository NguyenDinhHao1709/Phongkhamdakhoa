import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { apiGet, apiPost } from '../../../services/api';
import { formatDateTime } from '../../../utils/formatDate';
import {
  Video, MessageSquare, Send, Calendar, Clock, User,
  FileText, Pill, CheckCircle2, ShieldCheck
} from 'lucide-react';

export default function KhamTrucTuyenPage() {
  const [selectedLich, setSelectedLich] = useState(null);
  const [messages, setMessages] = useState([
    { sender: 'benh_nhan', text: 'Chào bác sĩ, dạo này tôi hay bị đau đầu về chiều và hoa mắt.', time: '09:00' },
    { sender: 'bac_si', text: 'Chào anh/chị. Triệu chứng này xuất hiện bao lâu rồi? Anh/chị có bị đo huyết áp gần đây không?', time: '09:02' },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [formAdvise, setFormAdvise] = useState({ chanDoan: '', loiKhuyen: '' });

  // Lấy danh sách lịch tư vấn online
  const { data, isLoading } = useQuery({
    queryKey: ['lich-tu-van-online'],
    queryFn: () => apiGet('/lich-hen?loai=online'),
  });

  const items = data?.data || [
    {
      id: 101,
      maLichHen: 'LH20260012',
      benhNhan: { hoTen: 'Nguyễn Văn Nam', ngaySinh: '1988-05-12', gioiTinh: 'nam', soDienThoai: '0912345678' },
      ngayKham: new Date().toISOString(),
      gioKham: '09:00 - 09:30',
      lyDoKham: 'Tư vấn huyết áp và đau đầu kéo dài',
      trangThai: 'da_xac_nhan',
    },
    {
      id: 102,
      maLichHen: 'LH20260015',
      benhNhan: { hoTen: 'Trần Thị Thu', ngaySinh: '1995-11-20', gioiTinh: 'nu', soDienThoai: '0988776655' },
      ngayKham: new Date().toISOString(),
      gioKham: '10:00 - 10:30',
      lyDoKham: 'Hỏi về kết quả xét nghiệm máu tuần trước',
      trangThai: 'cho_xac_nhan',
    },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [
      ...prev,
      { sender: 'bac_si', text: inputMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInputMsg('');
  };

  const activeLich = selectedLich || items[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-7 w-7 text-primary-600" /> Khám & Tư vấn Trực tuyến (Telehealth)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            UC-BS-01: Khám, tư vấn từ xa và kê đơn trực tuyến cho bệnh nhân
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-13rem)]">
        {/* Danh sách ca tư vấn */}
        <MedCard className="flex flex-col h-full overflow-hidden p-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600" /> Lịch tư vấn hôm nay
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {isLoading && <p className="text-center text-sm text-gray-400 py-6">Đang tải...</p>}
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedLich(item)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeLich?.id === item.id
                    ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-primary-700">{item.maLichHen}</span>
                  <StatusBadge status={item.trangThai === 'da_xac_nhan' ? 'dang_kham' : 'cho_kham'} size="sm" />
                </div>
                <p className="font-semibold text-gray-900 text-sm">{item.benhNhan?.hoTen}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.gioKham}</span>
                  <span>• {item.benhNhan?.soDienThoai}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-1 mt-1.5 bg-gray-100 p-1.5 rounded-md">
                  Lý do: {item.lyDoKham}
                </p>
              </div>
            ))}
          </div>
        </MedCard>

        {/* Khung Khám & Chat Trực tuyến */}
        {activeLich && (
          <div className="lg:col-span-2 flex flex-col h-full space-y-4">
            {/* Header thông tin bệnh nhân */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{activeLich.benhNhan?.hoTen}</h4>
                  <p className="text-xs text-gray-500">
                    SĐT: {activeLich.benhNhan?.soDienThoai} | Khám lúc: {activeLich.gioKham}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MedButton variant="primary" size="sm" leftIcon={<Video className="h-4 w-4" />}>
                  Mở Video Call
                </MedButton>
              </div>
            </div>

            {/* Chat & Ghi nhận kết quả */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Khung chat */}
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full">
                <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary-600" /> Tin nhắn tư vấn trực tiếp
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'bac_si' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === 'bac_si'
                            ? 'bg-primary-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Nhập tin nhắn tư vấn..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <MedButton type="submit" variant="primary" size="sm">
                    <Send className="h-4 w-4" />
                  </MedButton>
                </form>
              </div>

              {/* Kết luận & Chẩn đoán Telehealth */}
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full p-4 space-y-3">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary-600" /> Kết luận tư vấn từ xa
                </h4>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Chẩn đoán sơ bộ</label>
                    <textarea
                      rows={3}
                      value={formAdvise.chanDoan}
                      onChange={(e) => setFormAdvise({ ...formAdvise, chanDoan: e.target.value })}
                      placeholder="Nhập chẩn đoán từ xa..."
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Lời khuyên & Chỉ định</label>
                    <textarea
                      rows={4}
                      value={formAdvise.loiKhuyen}
                      onChange={(e) => setFormAdvise({ ...formAdvise, loiKhuyen: e.target.value })}
                      placeholder="Dặn dò chế độ ăn, tái khám hoặc đi xét nghiệm tại phòng khám..."
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t flex gap-2 justify-end">
                  <MedButton
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => alert('Đã hoàn thành ca tư vấn trực tuyến!')}
                  >
                    Hoàn tất tư vấn
                  </MedButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
