import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope, Calendar, Eye, Clock, ArrowLeft, Share2,
  Building2, CheckCircle2, ChevronRight, User, ShieldCheck,
  BookOpen, Sparkles
} from 'lucide-react';
import { apiGet } from '../../services/api';
import useHospitalStore from '../../store/hospitalStore';

export default function ChiTietBaiVietPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { hospitalInfo } = useHospitalStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchArticle();
  }, [idOrSlug]);

  const fetchArticle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/bai-viet/public/${idOrSlug}`);
      const articleData = res?.data || res;
      setData(articleData);
    } catch (err) {
      console.error(err);
      setError('Không tìm thấy bài viết hoặc bài viết chưa được xuất bản.');
    } finally {
      setLoading(false);
    }
  };

  const article = data?.article;
  const related = data?.related || [];

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

      {/* ─── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 flex-1 w-full">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
            <div className="w-9 h-9 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="font-semibold">Đang tải bài viết y khoa...</p>
          </div>
        ) : error || !article ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-4 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">{error || 'Không tìm thấy bài viết'}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bài viết có thể đã được chuyển sang chế độ lưu trữ hoặc đường dẫn không chính xác.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-xs hover:bg-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Trang Chủ</span>
            </Link>
          </div>
        ) : (
          <article className="space-y-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs">
            {/* Breadcrumb & Category */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {article.chuyenKhoa || 'Đa khoa'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kiểm duyệt chuyên môn
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {article.xuatBanLuc
                    ? new Date(article.xuatBanLuc).toLocaleDateString('vi-VN')
                    : 'Mới cập nhật'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {article.luotXem || 0} lượt xem
                </span>
              </div>
            </div>

            {/* Article Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-snug tracking-tight">
              {article.tieuDe}
            </h1>

            {/* Author Meta Box */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-black text-base overflow-hidden shrink-0">
                {article.avatarTacGia ? (
                  <img
                    src={article.avatarTacGia.startsWith('http') ? article.avatarTacGia : `http://localhost:5000${article.avatarTacGia}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  'BS'
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-semibold">Cố vấn chuyên môn:</p>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {article.tenTacGia || 'Bác sĩ chuyên khoa'}
                </h4>
                <p className="text-[11px] text-primary-700 font-bold">
                  {article.hocViTacGia ? `${article.hocViTacGia} • ` : ''}{article.chuyenKhoaBacSi || article.chuyenKhoa || 'Đa khoa'} • {hospitalInfo.tenBenhVien}
                </p>
              </div>
            </div>

            {/* Cover Image */}
            {article.anhDaiDien && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                <img
                  src={article.anhDaiDien}
                  alt={article.tieuDe}
                  className="w-full max-h-[420px] object-cover"
                />
              </div>
            )}

            {/* Summary Lead In */}
            {article.tomTat && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-l-4 border-primary-600 text-sm sm:text-base text-slate-800 font-medium leading-relaxed italic">
                "{article.tomTat}"
              </div>
            )}

            {/* Main Body */}
            <div
              className="text-sm sm:text-base text-slate-800 leading-relaxed space-y-4 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: article.noiDung || '' }}
            />

            {/* ─── DOCTOR AUTHOR CTA CARD ──────────────────────────── */}
            <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-primary-950 text-white space-y-4 border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-lg border border-white/20 shrink-0">
                    <Stethoscope className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                      Tư vấn & Thăm khám trực tiếp
                    </p>
                    <h3 className="text-lg font-black text-white">
                      {article.tenTacGia || 'Bác sĩ chuyên khoa'}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {article.hocViTacGia ? `${article.hocViTacGia} • ` : ''}{article.moTaBacSi || 'Bác sĩ giàu kinh nghiệm công tác và khám chữa bệnh tận tâm tại phòng khám.'}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/dat-lich?bacSiId=${article.bacSiId || ''}&chuyenKhoa=${encodeURIComponent(article.chuyenKhoa || '')}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt Lịch Khám Ngay</span>
                </Link>
              </div>
            </div>

            {/* ─── RELATED ARTICLES ────────────────────────────────── */}
            {related.length > 0 && (
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>Bài Viết Cùng Chuyên Khoa Bạn Có Thể Quan Tâm</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/bai-viet/${rel.slug || rel.id}`}
                      className="group bg-slate-50 hover:bg-white rounded-2xl p-4 border border-slate-200 transition-all flex flex-col justify-between space-y-3 hover:shadow-sm hover:border-primary-300"
                    >
                      <div className="space-y-2">
                        {rel.anhDaiDien && (
                          <img
                            src={rel.anhDaiDien}
                            alt=""
                            className="w-full h-28 object-cover rounded-xl border border-slate-200 group-hover:scale-102 transition-transform"
                          />
                        )}
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {rel.tieuDe}
                        </h4>
                      </div>
                      <span className="text-[11px] text-primary-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Đọc tiếp</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
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

