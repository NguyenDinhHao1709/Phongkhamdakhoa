import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Search, Stethoscope, FlaskConical,
  Activity, CheckCircle2, ChevronRight, Sparkles, Shield,
  Info, AlertCircle, RefreshCw, Calendar, Tag, ArrowRight,
  X, Eye, Clock, FileText, Check, HeartPulse, Building2, Video,
  HelpCircle, AlertTriangle
} from 'lucide-react';
import { apiGet } from '../../services/api';
import useAuthStore from '../../store/authStore';

const CATEGORY_TABS = [
  { id: 'tat_ca', label: 'Tất cả dịch vụ', icon: Tag },
  { id: 'kham_benh', label: 'Khám lâm sàng', icon: Stethoscope },
  { id: 'xet_nghiem', label: 'Xét nghiệm máu & sinh hóa', icon: FlaskConical },
  { id: 'cdha', label: 'Chẩn đoán hình ảnh & Siêu âm', icon: Activity },
];

export default function BangGiaDichVuSection({ onBookService }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [dichVuList, setDichVuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tat_ca');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [cauHinhTienCoc, setCauHinhTienCoc] = useState([]);
  const [selectedDichVu, setSelectedDichVu] = useState(null);

  // Fetch bảng giá công khai & Cấu hình tiền cọc
  const fetchPriceList = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resPrice, resCoc] = await Promise.all([
        apiGet('/quan-ly/bang-gia-public', { loai: activeTab, tuKhoa: searchKeyword }),
        apiGet('/quan-ly/cau-hinh-tien-coc'),
      ]);

      const items = resPrice?.data?.data || resPrice?.data || (Array.isArray(resPrice) ? resPrice : []);
      setDichVuList(Array.isArray(items) ? items : []);

      const cocItems = resCoc?.data?.data || resCoc?.data || (Array.isArray(resCoc) ? resCoc : []);
      if (Array.isArray(cocItems)) setCauHinhTienCoc(cocItems);
    } catch (err) {
      console.error('Lỗi nạp bảng giá dịch vụ:', err);
      setError('Tạm thời chưa thể tải bảng giá trực tuyến. Vui lòng thử lại sau.');
      setDichVuList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceList();
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPriceList();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const formatVND = (price) => {
    return new Intl.NumberFormat('vi-VN').format(Number(price) || 0) + ' đ';
  };

  const getCategoryBadge = (loai) => {
    switch (loai) {
      case 'kham_benh':
        return { label: 'Khám bệnh', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'xet_nghiem':
        return { label: 'Xét nghiệm', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'cdha':
        return { label: 'CĐHA & Siêu âm', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Kỹ thuật y khoa', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Xử lý khi bệnh nhân bấm Đặt khám
  const handleBook = (service) => {
    if (onBookService) {
      onBookService(service);
      return;
    }

    const isOnline = service.loai === 'kham_benh' && (
      service.maDichVu === 'KB002' ||
      service.tenDichVu?.toLowerCase().includes('trực tuyến') ||
      service.tenDichVu?.toLowerCase().includes('telehealth')
    );
    const hinhThuc = isOnline ? 'truc_tuyen' : 'truc_tiep';
    const targetUrl = `/benh-nhan/dat-lich?hinhThuc=${hinhThuc}`;

    if (isAuthenticated && user?.vaiTro === 'benh_nhan') {
      navigate(targetUrl);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  };

  // Tìm thông tin tiền cọc tương ứng với hình thức dịch vụ
  const isOnlineService = selectedDichVu?.loai === 'kham_benh' && (
    selectedDichVu?.maDichVu === 'KB002' ||
    selectedDichVu?.tenDichVu?.toLowerCase().includes('trực tuyến') ||
    selectedDichVu?.tenDichVu?.toLowerCase().includes('telehealth')
  );

  const matchedCoc = cauHinhTienCoc.find(c =>
    isOnlineService ? c.loaiHinhThuc === 'truc_tuyen' : c.loaiHinhThuc === 'truc_tiep'
  ) || cauHinhTienCoc[0];

  return (
    <div className="mt-14 pt-10 border-t border-slate-200">
      {/* ─── TIÊU ĐỀ KHU VỰC BẢNG GIÁ ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Minh Bạch - Công Khai - Chuẩn Bộ Y Tế</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bảng Giá Dịch Vụ Khám Chữa Bệnh & Kỹ Thuật Y Khoa
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Toàn bộ chi phí khám chữa bệnh, xét nghiệm và chẩn đoán hình ảnh được niêm yết công khai theo quy định của Bộ Y Tế. Nhấn vào dịch vụ để xem nội dung thăm khám chi tiết.
          </p>
        </div>

        {/* BHYT Tag Badge */}
        <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200/80 px-3.5 py-2 rounded-xl text-blue-800 text-xs font-semibold shrink-0">
          <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />
          <span>Áp dụng thanh toán BHYT đúng tuyến & thông tuyến</span>
        </div>
      </div>

      {/* ─── THANH TÌM KIẾM & PHÂN LOẠI TAB ─────────────────────── */}
      <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên dịch vụ, xét nghiệm..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* ─── DANH SÁCH BẢNG GIÁ GỌN GÀNG (CHỈ VIẾT Ý CHÍNH) ─────── */}
      {loading && dichVuList.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500 mb-2" />
          <span className="text-xs font-bold">Đang cập nhật bảng giá niêm yết trực tuyến...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-red-500 bg-red-50/50 rounded-2xl border border-red-200 p-6">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      ) : dichVuList.length === 0 ? (
        <div className="py-14 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">Không tìm thấy dịch vụ phù hợp</p>
          <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm với từ khóa khác</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 w-24">Mã DV</th>
                  <th className="py-3 px-4">Tên dịch vụ kỹ thuật / Thăm khám</th>
                  <th className="py-3 px-4 w-44">Khoa phòng</th>
                  <th className="py-3 px-4 w-40 text-right">Đơn giá viện phí</th>
                  <th className="py-3 px-4 w-48 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {(Array.isArray(dichVuList) ? dichVuList : []).map((item, index) => {
                  const badge = getCategoryBadge(item.loai);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDichVu(item)}
                      title="Nhấn để xem chi tiết thăm khám"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                        {index + 1}
                      </td>

                      {/* Mã DV */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary-700 text-xs">
                        {item.maDichVu}
                      </td>

                      {/* Tên dịch vụ (Ý chính gọn gàng) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-primary-700 transition-colors text-sm">
                            {item.tenDichVu}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* Khoa phòng */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                        {item.boPhanThucHien || 'Phòng khám chuyên khoa'}
                      </td>

                      {/* Đơn giá viện phí */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-slate-900 font-mono">
                          {formatVND(item.gia)}
                        </div>
                      </td>

                      {/* Nút hành động */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedDichVu(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Xem chi tiết nội dung dịch vụ"
                          >
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            onClick={() => handleBook(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs group/btn cursor-pointer"
                            title="Đặt lịch khám dịch vụ này (yêu cầu đăng nhập)"
                          >
                            <span>Đặt khám</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer bảng giá */}
          <div className="bg-slate-50/90 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-600 shrink-0" />
              <span>
                Bảng giá niêm yết theo thông tư Bộ Y Tế. Người bệnh nhấn vào dòng để xem chi tiết nội dung khám và các bước thực hiện.
              </span>
            </div>
            <div className="font-bold text-slate-700 shrink-0">
              Niêm yết năm 2026
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CHI TIẾT: KHÁM NHỮNG CÁI GÌ & QUY TRÌNH THỰC HIỆN ─── */}
      {selectedDichVu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedDichVu(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-700 via-primary-700 to-indigo-800 p-5 text-white flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-mono font-bold tracking-wider">
                    Mã: {selectedDichVu.maDichVu}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[11px] font-bold">
                    {getCategoryBadge(selectedDichVu.loai).label}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-medium">
                    {selectedDichVu.boPhanThucHien || 'Phòng khám chuyên khoa'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight pt-1">
                  {selectedDichVu.tenDichVu}
                </h3>
              </div>

              <button
                onClick={() => setSelectedDichVu(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700">
              {/* Thẻ Chi Phí & Chính Sách BHYT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Đơn giá niêm yết
                    </span>
                    <span className="text-xl font-black text-blue-700 font-mono mt-0.5 block">
                      {formatVND(selectedDichVu.gia)}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Chế độ BHYT
                    </span>
                    <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
                      Hỗ trợ đúng tuyến & thông tuyến
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Mô Tả Mục Đích Khám */}
              {selectedDichVu.moTa && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary-600" />
                    <span>Mục đích & Chỉ định chuyên môn</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    {selectedDichVu.moTa}
                  </p>
                </div>
              )}

              {/* Chi Tiết: Khám & Thực Hiện Những Gì? */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {selectedDichVu.loai === 'kham_benh'
                      ? 'Dịch vụ này khám những cái gì?'
                      : selectedDichVu.loai === 'xet_nghiem'
                      ? 'Quy trình thực hiện xét nghiệm y khoa'
                      : 'Quy trình chẩn đoán hình ảnh kỹ thuật cao'}
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {selectedDichVu.loai === 'kham_benh' ? (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          1
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Đo dấu hiệu sinh tồn & Khảo sát tiền sử:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Đo chỉ số huyết áp, nhịp tim, nồng độ oxy trong máu SpO2, thân nhiệt, cân nặng và chiều cao. Lắng nghe triệu chứng khởi phát và ghi nhận tiền sử bệnh lý của người bệnh.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          2
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Bác sĩ chuyên khoa trực tiếp thăm khám lâm sàng:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Thăm khám thực thể chuyên sâu từng cơ quan tương ứng (nghe tim phổi, kiểm tra tai mũi họng, sờ nắn bụng, kiểm tra hệ vận động hoặc thần kinh) để xác định tổn thương.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          3
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Chẩn đoán & Chỉ định cận lâm sàng cần thiết:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Bác sĩ đưa ra chẩn đoán sơ bộ. Trường hợp cần làm rõ, bác sĩ sẽ chỉ định thêm các xét nghiệm hoặc siêu âm phù hợp, giải thích rõ mục đích từng chỉ định cho bệnh nhân.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          4
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Kê đơn thuốc điện tử & Tư vấn phác đồ điều trị:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Kê đơn thuốc chuẩn theo hướng dẫn của Bộ Y Tế, hướng dẫn cách dùng thuốc an toàn, dặn dò chế độ dinh dưỡng, vận động và đặt lịch hẹn tái khám theo dõi.
                          </span>
                        </div>
                      </div>
                    </>
                  ) : selectedDichVu.loai === 'xet_nghiem' ? (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          1
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Lấy mẫu bệnh phẩm vô trùng an toàn:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Kỹ thuật viên xét nghiệm chuyên trách thao tác nhẹ nhàng, sử dụng bộ dụng cụ vô trùng dùng một lần, đảm bảo an toàn tuyệt đối chống lây nhiễm chéo.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          2
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Phân tích trên hệ thống máy xét nghiệm tự động:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Mẫu được chạy trên hệ thống phân tích tự động chuẩn quốc tế, kiểm chuẩn chất lượng (QC) định kỳ hằng ngày để đảm bảo độ chính xác tối đa.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          3
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Duyệt kết quả & Lưu trữ hồ sơ bệnh án điện tử:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Bác sĩ xét nghiệm đối chiếu chỉ số, ký duyệt kết quả và tự động đồng bộ lên tài khoản Cổng Bệnh Nhân để quý khách tra cứu trực tuyến bất cứ lúc nào.
                          </span>
                        </div>
                      </div>

                      {selectedDichVu.giaTriBinhThuong && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                          <strong>Trị số tham chiếu bình thường:</strong> {selectedDichVu.giaTriBinhThuong} {selectedDichVu.donViKetQua ? `(${selectedDichVu.donViKetQua})` : ''}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          1
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Hướng dẫn tư thế & Chuẩn bị thăm khám:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Kỹ thuật viên phòng máy hướng dẫn tư thế nằm hoặc đứng phù hợp, bộc lộ vùng cần thăm dò và thoa gel chuyên dụng (nếu siêu âm).
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          2
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            Bác sĩ CĐHA khảo sát trên máy kỹ thuật số:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            Thực hiện quét hình ảnh đa bình diện trên máy siêu âm Doppler màu hoặc hệ thống chụp kỹ thuật số hiện đại, ghi nhận chi tiết các cấu trúc giải phẫu.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          3
                        </span>
                        <div>
                          <strong className="text-slate-900 block font-bold text-xs sm:text-sm">
                            In ảnh kết quả & Trả kết luận chuyên môn:
                          </strong>
                          <span className="text-slate-600 text-xs leading-relaxed">
                            In phim hoặc hình ảnh màu độ phân giải cao kèm phiếu mô tả chi tiết, gửi trực tiếp về phòng khám bác sĩ để đưa ra phác đồ điều trị kịp thời.
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Chính Sách Đặt Cọc Giữ Chỗ & Hoàn Phí Minh Bạch */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-sky-50/40 to-blue-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Chính sách đặt hẹn & Đặt cọc giữ chỗ minh bạch</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Tiền tạm ứng giữ chỗ: <strong className="text-slate-900">{formatVND(matchedCoc?.soTienCoc || 40000)}</strong> ({matchedCoc?.phanTramCoc || 20}% chi phí khám).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Được trừ <strong className="text-slate-900">100%</strong> vào viện phí khi người bệnh đến khám tại phòng khám.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Được đặt trước từ <strong className="text-slate-900">{matchedCoc?.choPhepDatTruocNgayMin !== undefined && matchedCoc?.choPhepDatTruocNgayMin !== null ? matchedCoc.choPhepDatTruocNgayMin : 0} đến {matchedCoc?.choPhepDatTruocNgayMax || 30} ngày</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Hoàn tiền <strong className="text-emerald-700">{matchedCoc?.phanTramHoanCoc || 100}%</strong> nếu thông báo hủy trước <strong className="text-slate-900">{matchedCoc?.thoiGianHuyHoanCocGio || 2} giờ</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Hướng Dẫn Chuẩn Bị Cho Người Bệnh */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Lưu ý khi đi khám:</strong> Quý bệnh nhân vui lòng mang theo Căn cước công dân gắn chip / ứng dụng VNeID, Thẻ BHYT và các đơn thuốc hoặc kết quả khám cũ (nếu có). Đến trước giờ hẹn 10 - 15 phút để làm thủ tục tiếp đón nhanh.
                </div>
              </div>
            </div>

            {/* Footer Modal với nút Đặt Khám nổi bật */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setSelectedDichVu(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                onClick={() => {
                  const service = selectedDichVu;
                  setSelectedDichVu(null);
                  handleBook(service);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Đặt Lịch Khám Dịch Vụ Này</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
