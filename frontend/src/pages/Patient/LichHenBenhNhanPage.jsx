import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, Stethoscope, AlertTriangle, ShieldAlert, XCircle, CheckCircle2, Video, Building2, Users, QrCode, Star, CreditCard, CalendarClock } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatDate, checkTelehealthAccess } from '../../utils/formatDate';
import useTelehealthStore from '../../store/telehealthStore';
import AppointmentTicketModal from '../../components/Appointment/AppointmentTicketModal';
import DanhGiaCaKhamModal from '../../components/Appointment/DanhGiaCaKhamModal';
import PaymentCountdownModal from '../../components/Appointment/PaymentCountdownModal';
import RescheduleAppointmentModal from '../../components/Appointment/RescheduleAppointmentModal';

// Loại bỏ các log hệ thống như [ĐÃ_NHẮC_LỊCH: ...] khỏi giao diện bệnh nhân
const cleanGhiChu = (note) => {
  if (!note) return '';
  return note.replace(/\[ĐÃ_NHẮC_LỊCH:[^\]]*\]/gi, '').trim();
};

export default function LichHenBenhNhanPage() {
  const { startCall, isOpen: isCallOpen, maximizeCall } = useTelehealthStore();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [ticketModalData, setTicketModalData] = useState({ isOpen: false, appointment: null });
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false, appointment: null });
  const [rescheduleModalData, setRescheduleModalData] = useState({ isOpen: false, appointment: null });

  useEffect(() => {
    fetchData();
    const refreshTimer = setInterval(fetchData, 15000);
    return () => clearInterval(refreshTimer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/lich-hen/cua-toi');
      if (res.data) setList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (lh) => {
    const now = new Date();
    const bookingDateTime = new Date(`${lh.ngayHen}T${lh.gioHen}`);
    const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      alert(`⚠️ KHÔNG THỂ HỦY LỊCH HẸN TRỰC TUYẾN!\n\nLịch hẹn ${lh.maLichHen} còn dưới 24 tiếng (1 ngày) nữa là đến giờ khám (${lh.gioHen} ngày ${lh.ngayHen}).\nTheo quy định phòng khám, chỉ được hủy trước ngày khám ít nhất 1 ngày (24 tiếng). Khi hủy dưới 24 tiếng, hệ thống không thể xử lý hủy trực tuyến và không được hoàn lại tiền tạm ứng 1/5 (40.000đ).`);
      return;
    }

    const confirmCancel = window.confirm(
      `XÁC NHẬN HỦY LỊCH HẸN ${lh.maLichHen}\n\nBạn đang hủy trước ngày khám >= 1 ngày (Hợp lệ).\nSố tiền tạm ứng 40.000đ (1/5 phí khám) sẽ được hoàn trả tự động 100% qua VNPay/MoMo.\n\nBạn có chắc chắn muốn hủy?`
    );

    if (!confirmCancel) return;

    setCancelingId(lh.id);
    setMsg({ type: '', text: '' });
    try {
      const res = await apiPatch(`/lich-hen/${lh.id}/huy`);
      setMsg({ type: 'success', text: res.message || 'Hủy lịch hẹn thành công! Đã gửi yêu cầu hoàn tiền 40.000đ qua VNPay/MoMo.' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: err?.error?.message || err?.message || 'Không thể hủy lịch hẹn' });
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch hẹn của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi trạng thái các cuộc hẹn khám và quy định hủy lịch/hoàn cọc tạm ứng 1/5
          </p>
        </div>
        <MedButton variant="secondary" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Cập nhật
        </MedButton>
      </div>

      {msg.text && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm border animate-fade-in ${
            msg.type === 'success'
              ? 'bg-success-light text-success-main border-success-main/30'
              : 'bg-danger-50 text-danger-700 border-danger-200'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Thông tin chính sách đặt trước & hủy trước 1 ngày */}
      <div className="rounded-2xl bg-primary-50/70 p-4 border border-primary-200/80 text-xs text-primary-900 leading-relaxed">
        <p className="font-bold text-sm mb-1 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-primary-600" /> Quy định Tạm ứng 1/5 & Ranh giới Hủy trước 1 ngày (24 giờ):
        </p>
        <p>• Mỗi lịch hẹn cần tạm ứng <strong>40.000 đ (1/5 phí khám 200.000đ)</strong> để xác nhận giữ chỗ.</p>
        <p>• Hủy lịch hợp lệ <strong>trước ngày khám ít nhất 1 ngày (trước 24 tiếng)</strong>: Được <strong>hoàn trả 100% tiền tạm ứng (40.000đ)</strong> tự động qua VNPay/MoMo.</p>
        <p>• Hủy lịch <strong>trong vòng 24 tiếng</strong> hoặc không đến khám (No-show): Khoản tiền tạm ứng 40.000đ sẽ không được hoàn lại theo quy định của phòng khám.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-500 border border-gray-200">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-3"></div>
            Đang tải danh sách lịch hẹn...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-500 border border-gray-200">
            Bạn chưa có lịch hẹn nào. Hãy bấm "Đặt lịch khám mới" để đăng ký!
          </div>
        ) : (
          list.map((lh) => {
            const isCanceled = lh.trangThai === 'da_huy';
            const isCompleted = lh.trangThai === 'hoan_thanh';
            const isChoThanhToan = lh.trangThai === 'cho_thanh_toan';

            return (
              <div
                key={lh.id}
                className="rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 shadow-2xs border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:border-primary-300 transition-all"
              >
                <div className="space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-bold text-base sm:text-lg text-gray-900 shrink-0">{lh.maLichHen}</span>
                    <div className="shrink-0">
                      <StatusBadge
                        status={
                          isCanceled
                            ? 'da_huy'
                            : isCompleted
                            ? 'hoan_thanh'
                            : lh.trangThai === 'dang_kham'
                            ? 'dang_kham'
                            : lh.trangThai === 'cho_thanh_toan'
                            ? 'cho_thanh_toan'
                            : lh.trangThai === 'da_xac_nhan'
                            ? 'da_xac_nhan'
                            : 'cho_kham'
                        }
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-primary-700 bg-primary-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-primary-200 shrink-0 whitespace-nowrap">
                      Tạm ứng 1/5: 40.000 đ
                    </span>
                    {lh.ghiChu?.includes('[ĐẶT_HỘ:') && (
                      <span className="text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" /> Đặt giùm {lh.benhNhan?.hoTen ? `(${lh.benhNhan.hoTen})` : ''}
                      </span>
                    )}
                    {lh.hinhThuc === 'truc_tuyen' ? (
                      lh.trangThai === 'cho_thanh_toan' ? (
                        <span className="text-[11px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" /> Cần thanh toán (200k)
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" /> Đã thanh toán • Tư vấn Online
                        </span>
                      )
                    ) : (
                      lh.trangThai === 'cho_thanh_toan' ? (
                        <span className="text-[11px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" /> Cần tạm ứng (40k)
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-bold text-blue-700 bg-blue-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-blue-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" /> Khám tại PK
                        </span>
                      )
                    )}
                  </div>

                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 shrink-0" />
                      <span>
                        Ngày hẹn: <strong className="text-gray-900">{formatDate(lh.ngayHen)}</strong> lúc{' '}
                        <strong className="text-primary-700 font-bold">{lh.gioHen}</strong>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" />
                      <span>
                        Bác sĩ:{' '}
                        <strong className={lh.bacSi?.nhanVien?.hoTen ? 'text-gray-900' : 'text-amber-700'}>
                          {lh.bacSi?.nhanVien?.hoTen || 'Đang chờ phân công'}
                        </strong>
                      </span>
                    </p>
                    {lh.lyDoKham && (
                      <p className="text-[11px] sm:text-xs text-gray-500 bg-gray-50 p-2 sm:p-2.5 rounded-xl mt-1 break-words">
                        Lý do: {lh.lyDoKham}
                      </p>
                    )}
                    {cleanGhiChu(lh.ghiChu) && (
                      <p className="text-[11px] sm:text-xs text-primary-700 bg-primary-50/50 p-2 rounded-lg italic break-words">
                        Ghi chú: {cleanGhiChu(lh.ghiChu)}
                      </p>
                    )}
                    {lh.hanThanhToan && lh.trangThai === 'cho_thanh_toan' && (
                      <p className="text-[11px] sm:text-xs text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Hạn thanh toán: <strong>{new Date(lh.hanThanhToan).toLocaleString('vi-VN')}</strong> (Vui lòng thanh toán trước hạn để giữ chỗ)</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="space-y-1.5 sm:space-y-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto md:flex md:flex-col md:justify-end">
                  {/* Nút chính nổi bật (Telehealth / Thanh toán) */}
                  {!isCanceled && !isCompleted && (
                    <>
                      {lh.hinhThuc === 'truc_tuyen' ? (
                        lh.trangThai === 'cho_thanh_toan' ? (
                          <MedButton
                            variant="primary"
                            size="sm"
                            onClick={() => setPaymentAppointment(lh)}
                            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs justify-center"
                            leftIcon={<CreditCard className="h-4 w-4" />}
                          >
                            Thanh toán phí khám (200.000 đ)
                          </MedButton>
                        ) : (() => {
                          const access = checkTelehealthAccess(lh.ngayHen, lh.gioHen, lh.ghiChu);
                          if (access.canJoin) {
                            return (
                              <MedButton
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (isCallOpen) {
                                    maximizeCall();
                                  } else {
                                    startCall({
                                      participantName: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách',
                                      role: 'patient',
                                      appointmentInfo: { ...lh, gioKham: `${lh.gioHen} ngày ${formatDate(lh.ngayHen)}` },
                                    });
                                  }
                                }}
                                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs justify-center"
                                leftIcon={<Video className="h-4 w-4" />}
                              >
                                Vào phòng khám Video
                              </MedButton>
                            );
                          }
                          if (access.isTooEarly) {
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  alert(
                                    `⏰ PHÒNG KHÁM TRỰC TUYẾN CHƯA MỞ:\n\n${access.statusMessage}\n\nQuý khách vui lòng quay lại trước giờ khám 15 phút để gặp bác sĩ.`
                                  )
                                }
                                className="w-full md:w-auto py-2 px-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-purple-100 transition cursor-pointer text-center"
                                title={access.statusMessage}
                              >
                                <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <span>Mở lúc {access.openTimeText} (còn {access.timeLeftText})</span>
                              </button>
                            );
                          }
                          return (
                            <div className="w-full md:w-auto text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-center font-medium">
                              Đã qua giờ khám
                            </div>
                          );
                        })()
                      ) : (
                        lh.trangThai === 'cho_thanh_toan' ? (
                          <MedButton
                            variant="primary"
                            size="sm"
                            onClick={() => setPaymentAppointment(lh)}
                            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs justify-center"
                            leftIcon={<CreditCard className="h-4 w-4" />}
                          >
                            Thanh toán tạm ứng (40.000 đ)
                          </MedButton>
                        ) : (
                          <div className="w-full md:w-auto text-[11px] sm:text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 text-center font-medium">
                            📍 Khám tại CS1: 123 Nguyễn Văn Cừ, Q.5
                          </div>
                        )
                      )}
                    </>
                  )}

                  {isCompleted && lh.hinhThuc === 'truc_tuyen' && (
                    <div className="w-full md:w-auto text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-center font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Đã hoàn tất tư vấn</span>
                    </div>
                  )}

                  {/* Nhóm nút phụ: Chỉ hiển thị khi đã thanh toán (không ở trạng thái chờ thanh toán) */}
                  {!isChoThanhToan ? (
                    <div className="grid grid-cols-3 md:flex md:flex-col gap-1.5 md:gap-2">
                      {!isCanceled && (
                        <button
                          type="button"
                          onClick={() => setTicketModalData({ isOpen: true, appointment: lh })}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">Phiếu & QR</span>
                        </button>
                      )}

                      {!isCanceled && !isCompleted && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const [h, m] = (lh.gioHen || '00:00').split(':').map(Number);
                              const bookingDate = new Date(lh.ngayHen);
                              bookingDate.setHours(h, m, 0, 0);
                              const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                              if (diffHours < 24) {
                                alert(
                                  `⚠️ KHÔNG THỂ ĐỔI LỊCH HẸN TRỰC TUYẾN!\n\nLịch hẹn ${lh.maLichHen} còn dưới 24 tiếng (1 ngày) nữa là đến giờ khám (${lh.gioHen} ngày ${lh.ngayHen}).\nTheo quy định của phòng khám, quý khách chỉ có thể đổi sang ngày/giờ khác trước tối thiểu 1 ngày (24 tiếng) để đảm bảo điều phối bác sĩ trực.`
                                );
                                return;
                              }

                              setRescheduleModalData({ isOpen: true, appointment: lh });
                            }}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <CalendarClock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">Đổi lịch</span>
                          </button>

                          <button
                            type="button"
                            disabled={cancelingId === lh.id}
                            onClick={() => handleCancelAppointment(lh)}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1 transition disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            <span className="truncate">Hủy hẹn</span>
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => setReviewModalData({ isOpen: true, appointment: lh })}
                          className="col-span-3 md:col-auto py-1.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Star className="h-3.5 w-3.5 fill-white text-white shrink-0" />
                          <span>Đánh giá ca khám</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={cancelingId === lh.id}
                      onClick={() => handleCancelAppointment(lh)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline py-1 text-center w-full transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span>Hủy yêu cầu đặt lịch này</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Phiếu Hẹn Khám Điện Tử (Có STT, Phòng khám, Giờ, Mã QR) */}
      <AppointmentTicketModal
        isOpen={ticketModalData.isOpen}
        appointment={ticketModalData.appointment}
        onClose={() => setTicketModalData({ isOpen: false, appointment: null })}
      />

      {/* Modal Đánh Giá Trải Nghiệm Ca Khám */}
      <DanhGiaCaKhamModal
        isOpen={reviewModalData.isOpen}
        appointment={reviewModalData.appointment}
        onClose={() => setReviewModalData({ isOpen: false, appointment: null })}
        onSuccess={fetchData}
      />

      {/* Modal Đổi / Chỉnh Sửa Lịch Khám */}
      <RescheduleAppointmentModal
        isOpen={rescheduleModalData.isOpen}
        appointment={rescheduleModalData.appointment}
        onClose={() => setRescheduleModalData({ isOpen: false, appointment: null })}
        onSuccess={(updated) => {
          setMsg({
            type: 'success',
            text: `Đổi lịch hẹn ${updated?.maLichHen || rescheduleModalData.appointment?.maLichHen} thành công sang ngày ${formatDate(updated?.ngayHen)} lúc ${updated?.gioHen}!`,
          });
          fetchData();
        }}
      />

      {/* Modal Thanh Toán Phí Khám / Tiền Tạm Ứng */}
      {paymentAppointment && (
        <PaymentCountdownModal
          lichHenId={paymentAppointment.id}
          maLichHen={paymentAppointment.maLichHen}
          soTien={paymentAppointment.hinhThuc === 'truc_tuyen' ? 200000 : 40000}
          title={
            paymentAppointment.hinhThuc === 'truc_tuyen'
              ? 'Thanh toán phí khám trực tuyến Telehealth'
              : 'Thanh toán tạm ứng giữ chỗ (1/5 phí khám)'
          }
          isTelehealth={paymentAppointment.hinhThuc === 'truc_tuyen'}
          hanThanhToan={paymentAppointment.hanThanhToan}
          onPaid={async () => {
            await apiPost(`/lich-hen/${paymentAppointment.id}/xac-nhan-thanh-toan`);
            setPaymentAppointment(null);
            setMsg({
              type: 'success',
              text:
                paymentAppointment.hinhThuc === 'truc_tuyen'
                  ? 'Thanh toán phí khám thành công! Phòng gọi video WebRTC đã được kích hoạt.'
                  : 'Thanh toán tiền tạm ứng 40.000 đ thành công! Lịch hẹn khám trực tiếp đã được xác nhận giữ chỗ.',
            });
            fetchData();
          }}
          onCancelled={() => setPaymentAppointment(null)}
          onPaymentError={(err) =>
            setMsg({ type: 'error', text: err?.error?.message || err?.message || 'Lỗi thanh toán' })
          }
        />
      )}
    </div>
  );
}
