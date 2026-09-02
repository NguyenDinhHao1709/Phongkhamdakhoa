import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Calendar, Bot, ShieldCheck, Heart, User, LogIn,
  Search, ArrowRight, Activity, PhoneCall, Sparkles, CheckCircle2,
  FileText, Clock, MapPin, Award, BookOpen, UserCheck
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet, apiPost } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import SearchResultsModal from './SearchResultsModal';

const ROLE_HOME = {
  quan_tri_vien_cap_cao: '/quan-ly',
  quan_tri_vien: '/quan-ly',
  ban_giam_doc: '/quan-ly',
  bac_si: '/bac-si',
  tiep_tan: '/tiep-tan',
  ky_thuat_vien: '/ky-thuat-vien',
  nhan_vien_nha_thuoc: '/nha-thuoc',
  thu_ngan: '/thu-ngan',
  benh_nhan: '/benh-nhan',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchKeyword, setActiveSearchKeyword] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);

  // Doctors from Database State
  const [dbDoctors, setDbDoctors] = useState([]);

  // AI Symptom State
  const [trieuChungInput, setTrieuChungInput] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Article Modal State
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchPublicDoctors();
  }, []);

  const fetchPublicDoctors = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) setDbDoctors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchKeyword(searchQuery.trim());
    setIsSearchModalOpen(true);
  };

  const handleAiAnalyze = async (e) => {
    e.preventDefault();
    if (!trieuChungInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiPost('/ai/goi-y-chuyen-khoa', { trieuChung: trieuChungInput });
      if (res.data) {
        setAiResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      alert('Vui lòng Đăng nhập hoặc Đăng ký tài khoản Bệnh nhân để thực hiện Đặt lịch khám trực tuyến.');
      navigate('/login');
    } else {
      navigate('/benh-nhan/dat-lich');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* ─── PUBLIC NAVBAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-sm text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:inline">Phòng Khám Đa Khoa</span>
          </div>

          {/* Header Search Icon (Expandable on Click) */}
          <div className="flex items-center">
            {isHeaderSearchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center animate-fade-in relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery.trim()) setIsHeaderSearchOpen(false);
                  }}
                  placeholder="Tìm bác sĩ, chuyên khoa..."
                  className="w-48 sm:w-64 rounded-full border border-primary-300 bg-white py-1.5 pl-9 pr-8 text-xs sm:text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsHeaderSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold p-1"
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsHeaderSearchOpen(true)}
                title="Mở thanh tìm kiếm"
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#hero" className="hover:text-primary-600 transition-colors">Trang chủ</a>
            <a href="#chuyen-khoa" className="hover:text-primary-600 transition-colors">Chuyên khoa</a>
            <a href="#ai-symptom" className="hover:text-primary-600 transition-colors flex items-center gap-1 text-primary-600 font-semibold">
              <Sparkles className="h-4 w-4" /> Gợi ý AI
            </a>
            <a href="#bac-si" className="hover:text-primary-600 transition-colors">Bác sĩ</a>
            <a href="#bai-viet" className="hover:text-primary-600 transition-colors">Bài viết</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <MedButton
                variant="primary"
                size="sm"
                onClick={() => {
                  const targetHome = ROLE_HOME[user?.vaiTro] || '/';
                  navigate(targetHome);
                }}
                leftIcon={<User className="h-4 w-4" />}
              >
                {user?.vaiTro === 'benh_nhan' ? 'Cổng Bệnh nhân' : 'Trang làm việc'} ({user?.tenDangNhap})
              </MedButton>
            ) : (
              <>
                <MedButton variant="ghost" size="sm" onClick={() => navigate('/login')} leftIcon={<LogIn className="h-4 w-4" />}>
                  Đăng nhập
                </MedButton>
                <MedButton variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Đăng ký
                </MedButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-gray-50 py-12 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-4 py-1.5 text-xs font-semibold text-primary-700 border border-primary-200">
                <ShieldCheck className="h-4 w-4" /> Tiêu chuẩn Y tế Quốc tế 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Chăm sóc sức khỏe<br />
                <span className="text-primary-600">Toàn diện & Hiện đại</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Tìm kiếm bác sĩ chuyên khoa, tra cứu cẩm nang y tế và đặt lịch hẹn khám trực tuyến nhanh chóng cho gia đình bạn.
              </p>

              {/* Main Big Search Box */}
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto lg:mx-0">
                <div className="flex items-center rounded-2xl bg-white p-2 shadow-lg border border-gray-200">
                  <Search className="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tên bác sĩ, chuyên khoa, hoặc tên bài viết..."
                    className="w-full bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                  <MedButton type="submit" variant="primary" size="md">
                    Tìm kiếm
                  </MedButton>
                </div>
              </form>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <MedButton
                  size="lg"
                  variant="primary"
                  onClick={handleBookingClick}
                  leftIcon={<Calendar className="h-5 w-5" />}
                  className="shadow-md shadow-primary-500/20"
                >
                  Đặt lịch khám trực tuyến
                </MedButton>
                <a href="#ai-symptom">
                  <MedButton
                    size="lg"
                    variant="secondary"
                    leftIcon={<Bot className="h-5 w-5 text-primary-600" />}
                  >
                    Khai báo triệu chứng AI
                  </MedButton>
                </a>
              </div>
            </div>

            {/* Right Card Feature Display */}
            <div className="relative">
              <div className="rounded-3xl bg-white p-6 shadow-xl border border-gray-100 space-y-6">
                <div className="flex items-center gap-4 border-b pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-mint text-medical-teal font-bold">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Phòng Khám Đa Khoa Đạt Chuẩn</h3>
                    <p className="text-xs text-gray-500">Dịch vụ khám chữa bệnh tận tâm, bảo mật thông tin</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <CheckCircle2 className="h-5 w-5 text-success-main flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Không phải chờ đợi lâu — Chọn khung giờ chủ động</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <CheckCircle2 className="h-5 w-5 text-success-main flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Tra cứu thông tin bác sĩ & chuyên khoa minh bạch</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <CheckCircle2 className="h-5 w-5 text-success-main flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Trợ lý AI phân tích triệu chứng ban đầu miễn phí</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI SYMPTOM CHECKER SECTION (GUEST & ALL ACTORS) ──────── */}
      <section id="ai-symptom" className="py-16 bg-white border-t border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold text-primary-700 border border-primary-200">
              <Sparkles className="h-3.5 w-3.5 text-primary-600" /> Tính năng dành cho Khách vãng lai & Bệnh nhân
            </span>
            <h2 className="text-3xl font-bold text-gray-900">AI Khai Báo Triệu Chứng & Gợi Ý Chuyên Khoa</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              Nhập các dấu hiệu bất thường bạn đang gặp phải. Trợ lý AI sẽ tự động phân tích và đưa ra gợi ý chuyên khoa khám phù hợp.
            </p>
          </div>

          <form onSubmit={handleAiAnalyze} className="rounded-2xl bg-gray-50 p-6 shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mô tả triệu chứng sức khỏe của bạn:
              </label>
              <textarea
                rows={3}
                value={trieuChungInput}
                onChange={(e) => setTrieuChungInput(e.target.value)}
                placeholder="Ví dụ: Tôi bị đau đầu kéo dài 3 ngày nay, kèm theo cảm giác chóng mặt và mệt mỏi vào buổi sáng..."
                className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <MedButton
                type="submit"
                variant="primary"
                loading={aiLoading}
                leftIcon={<Bot className="h-4 w-4" />}
              >
                Phân tích bằng AI
              </MedButton>
            </div>
          </form>

          {/* AI Result Display */}
          {aiResult && (
            <div className="mt-6 rounded-2xl bg-primary-50/70 p-6 border border-primary-200/80 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-primary-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary-600" />
                  <h4 className="font-bold text-gray-900">Kết quả phân tích từ AI</h4>
                </div>
                <span className="text-xs font-medium text-primary-700 bg-white px-2.5 py-1 rounded-full border border-primary-200">
                  Độ chính xác tham khảo: {aiResult.doChinhXac}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Chuyên khoa khuyên khám:</p>
                  <p className="text-lg font-bold text-primary-700 mt-0.5">{aiResult.chuyenKhoaGoiY}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Mức độ cần thiết:</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{aiResult.moTa}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-primary-100">
                <p className="text-xs font-bold text-gray-700 mb-1">💡 Lời khuyên ban đầu từ chuyên gia:</p>
                <p className="text-sm text-gray-600 leading-relaxed">{aiResult.loiKhuyen}</p>
              </div>

              <div className="pt-2 flex justify-center">
                <MedButton variant="primary" size="md" onClick={handleBookingClick}>
                  Đặt lịch khám chuyên khoa này ngay
                </MedButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── CHUYÊN KHOA SHOWCASE ──────────────────────────────────── */}
      <section id="chuyen-khoa" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Chuyên Khoa Mũi Nhọn</h2>
            <p className="text-sm text-gray-500">Đầy đủ các chuyên khoa với đội ngũ bác sĩ chuyên môn cao</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: 'Nội tổng quát', desc: 'Tầm soát & khám điều trị bệnh lý chung, huyết áp, tiểu đường, dạ dày' },
              { title: 'Ngoại khoa', desc: 'Phẫu thuật & tiểu phẫu khâu rửa vết thương an toàn' },
              { title: 'Nhi khoa', desc: 'Khám chữa bệnh lý thường gặp ở trẻ sơ sinh và trẻ nhỏ' },
              { title: 'Tai Mũi Họng', desc: 'Điều trị viêm họng, viêm xoang, tai giữa, nội soi TMH' },
              { title: 'Tim mạch', desc: 'Đo điện tâm đồ, siêu âm tim, khám huyết áp, nhịp tim' },
              { title: 'Cơ Xương Khớp', desc: 'Điều trị thoái hóa khớp, thoát vị đĩa đệm, chấn thương' },
              { title: 'Răng Hàm Mặt', desc: 'Nhổ răng, hàn răng, làm răng thẩm mỹ, chăm sóc răng miệng' },
              { title: 'Mắt', desc: 'Đo khúc xạ thị lực, khám điều trị tật cận thị, viêm kết mạc' },
            ].map((ck, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActiveSearchKeyword(ck.title);
                  setIsSearchModalOpen(true);
                }}
                className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200/80 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer space-y-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-base">{ck.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{ck.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ĐỘI NGŨ BÁC SĨ ────────────────────────────────────────── */}
      <section id="bac-si" className="py-16 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Đội Ngũ Bác Sĩ Tiêu Biểu</h2>
            <p className="text-sm text-gray-500">Bác sĩ chuyên khoa nhiều năm kinh nghiệm tại các bệnh viện lớn</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbDoctors.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-400 text-sm">
                Đang tải danh sách bác sĩ từ CSDL...
              </div>
            ) : (
              dbDoctors.map((bs) => (
                <div key={bs.id} className="rounded-2xl bg-gray-50 p-6 border border-gray-200 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 font-bold flex-shrink-0">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{bs.hoTen}</h4>
                        <p className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded inline-block mt-0.5 border border-primary-200">
                          {bs.chuyenKhoa}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">{bs.bangCap}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{bs.moTa}</p>
                  </div>

                  <MedButton variant="primary" size="sm" onClick={handleBookingClick} className="w-full">
                    Đặt lịch khám ngay
                  </MedButton>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ─── CẨM NANG BÀI VIẾT Y HỌC ────────────────────────────────── */}
      <section id="bai-viet" className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Cẩm Nang & Bài Viết Y Học</h2>
            <p className="text-sm text-gray-500">Kiến thức chăm sóc sức khỏe chính thống từ bác sĩ chuyên khoa</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 1, tieuDe: 'Hướng dẫn chăm sóc sức khỏe cho người bị tăng huyết áp tại nhà', danhMuc: 'Tim mạch', tacGia: 'BS. Lê Hoàng Cường', tomTat: 'Cách kiểm soát chỉ số huyết áp bằng chế độ ăn giảm muối, tập thể dục nhẹ nhàng và dùng thuốc đúng giờ.' },
              { id: 2, tieuDe: 'Cách phòng ngừa bệnh viêm xoang, viêm họng khi thời tiết chuyển mùa', danhMuc: 'Tai Mũi Họng', tacGia: 'BS. Phạm Minh Đức', tomTat: 'Giữ ấm vùng cổ mặt, rửa mũi bằng nước muối sinh lý hàng ngày để tránh vi khuẩn tấn công.' },
              { id: 3, tieuDe: 'Chế độ dinh dưỡng khoa học giúp trẻ tăng cường sức đề kháng', danhMuc: 'Nhi khoa', tacGia: 'BS. Trần Thị Bình', tomTat: 'Bổ sung đầy đủ Vitamin C, Zinc, Protein và tiêm ngừa đúng lịch giúp bé luôn khỏe mạnh.' },
            ].map((bv) => (
              <div
                key={bv.id}
                onClick={() => setSelectedArticle(bv)}
                className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 hover:border-primary-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
                    {bv.danhMuc}
                  </span>
                  <h4 className="font-bold text-gray-900 text-base leading-snug hover:text-primary-600 transition-colors">
                    {bv.tieuDe}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{bv.tomTat}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
                  <span>Tác giả: {bv.tacGia}</span>
                  <span className="text-primary-600 font-semibold flex items-center gap-1">
                    Đọc tiếp <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEARCH RESULTS MODAL ───────────────────────────────────── */}
      {isSearchModalOpen && (
        <SearchResultsModal
          keyword={activeSearchKeyword}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectDoctor={() => handleBookingClick()}
          onSelectSpecialty={(ck) => {
            setActiveSearchKeyword(ck.ten);
          }}
          onSelectArticle={(bv) => setSelectedArticle(bv)}
        />
      )}

      {/* ─── ARTICLE DETAIL MODAL ──────────────────────────────────── */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
                {selectedArticle.danhMuc}
              </span>
              <button onClick={() => setSelectedArticle(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{selectedArticle.tieuDe}</h3>
            <p className="text-xs text-gray-400">Tác giả: {selectedArticle.tacGia}</p>
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
              {selectedArticle.tomTat}
              <br /><br />
              Nội dung tư vấn chi tiết từ chuyên gia phòng khám nhằm giúp bạn theo dõi và bảo vệ sức khỏe hàng ngày một cách khoa học nhất.
            </div>
            <div className="flex justify-end pt-2">
              <MedButton variant="secondary" onClick={() => setSelectedArticle(null)}>
                Đóng bài viết
              </MedButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">Phòng Khám Đa Khoa</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Hệ thống chăm sóc sức khỏe toàn diện. Đồng hành cùng sự yên tâm của gia đình bạn.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3">Thông tin liên hệ</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary-400" /> 123 Đường Y Học, Quận 1, TP. Hồ Chí Minh
              </p>
              <p className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary-400" /> Hotline cấp cứu 24/7: <span className="font-bold text-white">1900 1234</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-400" /> Giờ làm việc: 07:00 - 20:00 (Tất cả các ngày)
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3">Cam kết dịch vụ</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              © 2026 Phòng Khám Đa Khoa. Đảm bảo an toàn và bảo mật dữ liệu y tế theo quy định.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
