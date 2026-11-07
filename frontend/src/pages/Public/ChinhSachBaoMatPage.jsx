import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  PhoneCall,
  Mail,
  MapPin,
  ArrowLeft,
  Stethoscope,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useHospitalStore } from '../../store/hospitalStore';

export default function ChinhSachBaoMatPage() {
  const { hospitalInfo, fetchHospitalInfo, isLoaded } = useHospitalStore();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    fetchHospitalInfo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchHospitalInfo]);

  const policy = hospitalInfo?.chinhSachBaoMat || {};
  const sections = Array.isArray(policy.danhSachDieuKhoan) ? policy.danhSachDieuKhoan : [];
  const commitments = Array.isArray(policy.camKetCotLoi) ? policy.camKetCotLoi : [];
  const badges = Array.isArray(policy.tieuChuanTuanThu) ? policy.tieuChuanTuanThu : [];
  const dpo = policy.thongTinLienHeBaoMat || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* ─── TOP NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-500 text-white shadow-sm shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                {hospitalInfo.tenBenhVien || 'PHÒNG KHÁM ĐA KHOA'}
              </span>
              <span className="text-[10px] font-bold text-primary-700 tracking-wider uppercase mt-1">
                {hospitalInfo.slogan || 'TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO'}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Về Trang Chủ</span>
            </Link>
            <Link
              to="/dat-lich"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Đặt Lịch Khám</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO HEADER ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-primary-900 via-slate-900 to-slate-900 text-white py-14 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-400/20 text-primary-300 text-xs font-bold tracking-wide">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>QUY CHUẨN AN TOÀN & BẢO VỆ DỮ LIỆU Y TẾ</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-4xl leading-tight">
            {policy.tieuDeTrang || 'Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Y Tế Cá Nhân'}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            {policy.moTaMoDau ||
              'Phòng khám cam kết bảo vệ tuyệt đối thông tin sức khỏe, hồ sơ bệnh án điện tử (EMR) và quyền riêng tư của mọi bệnh nhân theo đúng quy định của pháp luật Việt Nam.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary-400" />
              Ngày hiệu lực / Cập nhật: <strong className="text-white">{policy.ngayCapNhat || '05/11/2026'}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              Đơn vị chủ quản: <strong className="text-white">{hospitalInfo.tenBenhVien}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">
              {hospitalInfo.soGiayPhep || 'Giấy phép hoạt động BYT'}
            </span>
          </div>

          {/* Compliance Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {badges.map((b, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] font-semibold text-slate-200"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 3 CORE COMMITMENTS CARDS ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {commitments.map((c, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 hover:border-primary-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-black">
                  {idx === 0 ? <Lock className="w-5 h-5" /> : idx === 1 ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <h3 className="font-bold text-slate-900 text-base">{c.tieuDe}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{c.moTa}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MAIN CONTENT BODY: SIDEBAR TOC + SECTIONS ──────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Mục lục điều hướng (Sticky TOC) */}
          <aside className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <FileText className="w-4 h-4 text-primary-600" />
                <span>Mục Lục Điều Khoản</span>
              </div>
              <nav className="space-y-1">
                {sections.map((sec, idx) => (
                  <a
                    key={sec.id || idx}
                    href={`#${sec.id || `section-${idx}`}`}
                    onClick={() => setActiveSection(sec.id || `section-${idx}`)}
                    className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeSection === (sec.id || `section-${idx}`)
                        ? 'bg-primary-50 text-primary-700 font-bold border-l-4 border-primary-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {sec.tieuDe}
                  </a>
                ))}
                <a
                  href="#thong-tin-lien-he"
                  className="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  6. Thông tin liên hệ Ban bảo vệ dữ liệu (DPO)
                </a>
              </nav>
            </div>

            {/* Hộp liên hệ nhanh DPO */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Hỗ Trợ Quyền Riêng Tư 24/7</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Người bệnh có quyền gửi yêu cầu giải trình, cập nhật hoặc thu hồi dữ liệu bất cứ lúc nào.
              </p>
              <div className="pt-1 text-xs space-y-1.5 text-emerald-900 font-semibold">
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{dpo.hotline || hospitalInfo.tongDai}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{dpo.email || hospitalInfo.email}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Cột phải: Chi tiết các điều khoản chính sách */}
          <div className="lg:col-span-8 space-y-6">
            {sections.map((sec, idx) => (
              <section
                key={sec.id || idx}
                id={sec.id || `section-${idx}`}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4 scroll-mt-24 transition-shadow hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700 text-xs font-black">
                    {idx + 1}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {sec.tieuDe}
                  </h2>
                </div>

                {sec.noiDung && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {sec.noiDung}
                  </p>
                )}

                {Array.isArray(sec.danhSachChiTiet) && sec.danhSachChiTiet.length > 0 && (
                  <ul className="space-y-2.5 pt-2 border-t border-slate-100">
                    {sec.danhSachChiTiet.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Section 6: Bộ phận tiếp nhận & giải quyết thắc mắc (DPO) */}
            <section
              id="thong-tin-lien-he"
              className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">
                  6
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Đơn Vị Phụ Trách & Tiếp Nhận Yêu Cầu Dữ Liệu Cá Nhân
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mọi thắc mắc, phản ánh liên quan đến chính sách bảo mật hoặc yêu cầu thực thi quyền của chủ thể dữ liệu (trích xuất sao y bệnh án, khiếu nại, cải chính thông tin), xin vui lòng liên hệ:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl bg-slate-800/80 p-4 border border-slate-700 space-y-1">
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Bộ phận phụ trách</p>
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {dpo.donViPhuTrach || 'Ban Bảo Vệ Dữ Liệu Cá Nhân (DPO)'}
                  </p>
                  <p className="text-[11px] text-slate-400">{dpo.diaChiTiepNhan || hospitalInfo.diaChi}</p>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-4 border border-slate-700 space-y-1">
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Đường dây nóng & Hộp thư</p>
                  <p className="text-xs sm:text-sm font-bold text-emerald-400">
                    Hotline: {dpo.hotline || hospitalInfo.tongDai}
                  </p>
                  <p className="text-xs text-slate-300">
                    Email: {dpo.email || hospitalInfo.email}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
                <span>{hospitalInfo.banQuyen}</span>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-bold transition-colors"
                >
                  <span>Quay về trang chủ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-500 text-xs py-6 border-t border-slate-800 text-center">
        <div className="mx-auto max-w-7xl px-4 space-y-2">
          <p className="text-slate-400 font-bold">{hospitalInfo.tenBenhVien} • {hospitalInfo.slogan}</p>
          <p>{hospitalInfo.diaChi} • Giấy phép số {hospitalInfo.soGiayPhep || '08922/BYT-GPHĐ'}</p>
          <p className="text-[11px] text-slate-600">{hospitalInfo.banQuyen}</p>
        </div>
      </footer>
    </div>
  );
}

