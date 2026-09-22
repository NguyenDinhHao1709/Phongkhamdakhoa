import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, ClipboardList, FileText, Ticket, Stethoscope,
  Clock, MapPin, PhoneCall, ChevronRight, ShieldCheck, ArrowRight,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet } from '../../services/api';

export default function TrangChuBenhNhanPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: benhNhanRes } = useQuery({
    queryKey: ['benh-nhan-profile', user?.benhNhanId],
    queryFn: () => apiGet(`/benh-nhan/${user?.benhNhanId || 1}`),
    enabled: true,
  });
  const benhNhan = benhNhanRes?.data || benhNhanRes || {};

  const { data: appointmentsRes } = useQuery({
    queryKey: ['benh-nhan-appointments', user?.benhNhanId],
    queryFn: () => apiGet('/lich-hen/cua-toi').catch(() => ({ data: [] })),
    enabled: true,
  });
  const appointments = appointmentsRes?.data || [];
  const upcomingAppointment = appointments.find(a => a.trangThai !== 'da_huy' && a.trangThai !== 'hoan_thanh') || appointments[0];

  const { data: ticketRes } = useQuery({
    queryKey: ['benh-nhan-live-ticket', user?.benhNhanId],
    queryFn: () => apiGet('/tiep-nhan/phieu-kham-benh-nhan').catch(() => ({ data: null })),
    refetchInterval: 10000,
  });
  const liveTicket = ticketRes?.data?.ticket;
  const liveQueue = ticketRes?.data?.queue;

  const { data: doctorsRes } = useQuery({
    queryKey: ['public-doctors-home'],
    queryFn: () => apiGet('/nhan-vien/bac-si-public').catch(() => ({ data: [] })),
  });
  const doctors = doctorsRes?.data || [];

  const displayName = benhNhan?.hoTen || user?.hoTen || 'Quý Bệnh Nhân';
  const maBN = benhNhan?.maBenhNhan || 'BN000001';
  const soBHYT = benhNhan?.soBHYT || benhNhan?.soBhyt || 'GD4791234567890';
  const nhomMau = benhNhan?.nhomMau || 'O+';

  return (
    <div className="space-y-6 pb-12">

      {/* ── THÔNG TIN BỆNH NHÂN ── */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-blue-100/60" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Cổng thông tin bệnh nhân</p>
            <p className="mt-3 text-sm text-gray-500">Xin chào,</p>
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          </div>
          <div className="relative text-right">
            <p className="text-xs text-gray-400">Mã bệnh nhân</p>
            <p className="mt-1 text-sm font-bold text-blue-600 font-mono">{maBN}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-blue-100 pt-5 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Thẻ BHYT</p>
            <p className="font-semibold text-gray-800 font-mono text-xs">{soBHYT}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              Đúng tuyến
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nhóm máu</p>
            <p className="font-semibold text-gray-900 text-base">{nhomMau}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Dị ứng</p>
            <p className="text-xs text-gray-600">{benhNhan?.diUng || 'Không có'}</p>
          </div>
        </div>
      </div>

      {/* ── PHIẾU KHÁM & SỐ THỨ TỰ HÔM NAY (NẾU ĐANG CÓ LƯỢT KHÁM) ── */}
      {liveTicket && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-700 via-primary-700 to-indigo-800 p-5 text-white shadow-lg relative overflow-hidden animate-fade-in">
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                <Ticket className="h-3.5 w-3.5" />
                Phiếu khám tại phòng khám hôm nay · {
                  liveTicket.trangThai === 'hoan_thanh' ? 'Đã hoàn thành' :
                  liveTicket.trangThai === 'dang_kham' ? 'Đang khám' : 'Đang chờ khám'
                }
              </div>
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-amber-300">
                  {liveTicket.soThuTu}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{liveTicket.phongKham}</p>
                  <p className="text-xs text-blue-100">{liveTicket.bacSi}</p>
                </div>
              </div>
              {liveTicket.trangThai !== 'hoan_thanh' ? (
                <p className="text-xs text-blue-100 pt-1">
                  Số đang gọi: <strong className="text-white font-mono">{liveQueue?.soDangGoi || '...'}</strong> · 
                  Còn <strong className="text-amber-300">{liveQueue?.soNguoiPhiaTruoc ?? 0} người</strong> phía trước (ước tính ~{liveQueue?.uocTinhPhut ?? 0} phút)
                </p>
              ) : (
                <p className="text-xs text-emerald-200 pt-1 font-medium">
                  ✓ Bạn đã hoàn thành buổi khám. Đơn thuốc và kết quả đã sẵn sàng trong hồ sơ!
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/benh-nhan/so-thu-tu')}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-primary-700 shadow-md hover:bg-blue-50 transition-all flex-shrink-0"
            >
              <span>Xem tiến trình khám & STT</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 4 CHỨC NĂNG CHÍNH ── */}
      <div>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Dịch vụ chính</p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Bạn cần hỗ trợ gì hôm nay?</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Đặt lịch khám', desc: 'Tại viện & Telehealth', icon: Calendar, path: '/benh-nhan/dat-lich' },
          { label: 'Tiến độ & STT', desc: 'Số thứ tự điện tử', icon: Ticket, path: '/benh-nhan/so-thu-tu' },
          { label: 'Lịch hẹn của tôi', desc: `${appointments.length} lịch hẹn`, icon: ClipboardList, path: '/benh-nhan/lich-hen' },
          { label: 'Hồ sơ & Kết quả', desc: 'Đơn thuốc, xét nghiệm', icon: FileText, path: '/benh-nhan/ho-so-y-te' },
        ].map(({ label, desc, icon: Icon, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="group bg-white rounded-xl border border-gray-200 p-4 text-left shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </button>
        ))}
        </div>
      </div>

      {/* ── LỊCH HẸN SẮP TỚI ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Lịch hẹn sắp tới
          </h2>
          <button
            onClick={() => navigate('/benh-nhan/lich-hen')}
            className="text-xs text-blue-600 font-medium flex items-center gap-1"
          >
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {upcomingAppointment ? (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {upcomingAppointment.gioHen?.slice(0, 5) || '08:30'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  {upcomingAppointment.bacSiTen || 'Bác sĩ chuyên khoa'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {upcomingAppointment.chuyenKhoa || 'Nội tổng quát'} • {upcomingAppointment.ngayHen || 'Hôm nay'}
                </p>
                <span className="mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-700">
                  {upcomingAppointment.hinhThuc === 'truc_tuyen' ? 'Telehealth' : 'Tại phòng khám'}
                </span>
              </div>
              <button
                onClick={() => navigate('/benh-nhan/so-thu-tu')}
                className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg"
              >
                Tiến độ
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Chưa có lịch hẹn nào</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">Đặt lịch để được khám đúng giờ</p>
            <button
              onClick={() => navigate('/benh-nhan/dat-lich')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Đặt lịch ngay
            </button>
          </div>
        )}
      </div>

      {/* ── BÁC SĨ CHUYÊN KHOA ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            Bác sĩ chuyên khoa đang trực
          </h2>
          <button
            onClick={() => navigate('/benh-nhan/dat-lich')}
            className="text-xs text-blue-600 font-medium"
          >
            Đặt khám →
          </button>
        </div>

        <div className="space-y-2">
          {(doctors.length > 0 ? doctors : [
            { id: 1, hoTen: 'BS.CKII Nguyễn Văn A', chuyenKhoa: 'Nội tổng quát & Tim mạch', bangCap: 'Chuyên khoa II — 20 năm kinh nghiệm' },
            { id: 2, hoTen: 'BS.CKI Trần Thị B', chuyenKhoa: 'Tai Mũi Họng', bangCap: 'Chuyên khoa I — 12 năm kinh nghiệm' },
            { id: 3, hoTen: 'ThS.BS Lê Hoàng C', chuyenKhoa: 'Nhi khoa', bangCap: 'Thạc sĩ Y học — 8 năm kinh nghiệm' },
          ]).map((bs, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                BS
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{bs.hoTen}</p>
                <p className="text-xs text-blue-600 font-medium">{bs.chuyenKhoa}</p>
                <p className="text-xs text-gray-500">{bs.bangCap}</p>
              </div>
              <button
                onClick={() => navigate(`/benh-nhan/dat-lich?bacSiId=${bs.id || 1}`)}
                className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-blue-50 transition-colors"
              >
                Đặt khám
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── HỖ TRỢ ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tổng đài */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Tổng đài hỗ trợ</span>
          </div>
          <p className="text-xl font-semibold text-gray-900 my-1">1900 8888</p>
          <p className="text-xs text-gray-500">Cấp cứu 24/24: 115</p>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 123 Nguyễn Văn Cừ, Q.5, TP.HCM</p>
            <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> 07:00 – 20:00 (Thứ 2 – CN)</p>
          </div>
        </div>

        {/* Hướng dẫn */}
        <button
          onClick={() => navigate('/benh-nhan/chat-ai')}
          className="group bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Hướng dẫn trước khi khám</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">Xem thông tin chuẩn bị hồ sơ và giải đáp các câu hỏi thường gặp.</p>
            </div>
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-blue-600 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>
  );
}
