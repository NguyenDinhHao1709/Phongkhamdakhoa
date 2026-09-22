import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, Stethoscope, AlertTriangle, ShieldAlert, XCircle, CheckCircle2, Video, Building2, Users, QrCode, Star } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import TelehealthVideoModal from '../../components/Telehealth/TelehealthVideoModal';
import AppointmentTicketModal from '../../components/Appointment/AppointmentTicketModal';
import DanhGiaCaKhamModal from '../../components/Appointment/DanhGiaCaKhamModal';

export default function LichHenBenhNhanPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [videoCall, setVideoCall] = useState({ open: false, doctorName: '', info: {} });
  const [ticketModalData, setTicketModalData] = useState({ isOpen: false, appointment: null });
  const [reviewModalData, setReviewModalData] = useState({ isOpen: false, appointment: null });

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

            return (
              <div
                key={lh.id}
                className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-900">{lh.maLichHen}</span>
                    <StatusBadge
                      status={
                        isCanceled
                          ? 'da_huy'
                          : isCompleted
                          ? 'hoan_thanh'
                          : lh.trangThai === 'cho_thanh_toan'
                          ? 'cho_thanh_toan'
                          : lh.trangThai === 'da_xac_nhan'
                          ? 'hoan_thanh'
                          : 'cho_kham'
                      }
                    />
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                      Tạm ứng 1/5: 40.000 đ
                    </span>
                    {lh.ghiChu?.includes('[ĐẶT_HỘ:') && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-600" /> Đặt giùm người thân {lh.benhNhan?.hoTen ? `(${lh.benhNhan.hoTen})` : ''}
                      </span>
                    )}
                    {lh.hinhThuc === 'truc_tuyen' ? (
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                        <Video className="h-3.5 w-3.5 text-purple-600" /> Tư vấn Online
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" /> Khám tại PK
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary-600" />
                      <span>
                        Ngày hẹn: <strong className="text-gray-900">{formatDate(lh.ngayHen)}</strong> lúc{' '}
                        <strong className="text-primary-700 font-bold">{lh.gioHen}</strong>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-gray-400" />
                      <span>
                        Bác sĩ:{' '}
                        <strong className={lh.bacSi?.nhanVien?.hoTen ? 'text-gray-900' : 'text-amber-700'}>
                          {lh.bacSi?.nhanVien?.hoTen || 'Đang chờ phân công'}
                        </strong>
                      </span>
                    </p>
                    {lh.lyDoKham && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl mt-1">
                        Lý do: {lh.lyDoKham}
                      </p>
                    )}
                    {lh.ghiChu && (
                      <p className="text-xs text-primary-700 bg-primary-50/50 p-2 rounded-lg italic">
                        Ghi chú: {lh.ghiChu}
                      </p>
                    )}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                  {!isCanceled && (
                    <MedButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setTicketModalData({ isOpen: true, appointment: lh })}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                      leftIcon={<QrCode className="h-4 w-4 text-blue-600" />}
                    >
                      Phiếu Hẹn & QR
                    </MedButton>
                  )}

                  {!isCanceled && !isCompleted && (
                    <>
                      {lh.hinhThuc === 'truc_tuyen' ? (
                        <MedButton
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setVideoCall({
                              open: true,
                              doctorName: lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ phụ trách',
                              info: { ...lh, gioKham: `${lh.gioHen} ngày ${formatDate(lh.ngayHen)}` },
                            })
                          }
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          leftIcon={<Video className="h-4 w-4" />}
                        >
                          Vào phòng khám Video
                        </MedButton>
                      ) : (
                        <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-center font-medium">
                          📍 Đến khám tại CS1: 123 Đường Y Học
                        </div>
                      )}

                      <MedButton
                        variant="danger"
                        size="sm"
                        loading={cancelingId === lh.id}
                        onClick={() => handleCancelAppointment(lh)}
                        leftIcon={<XCircle className="h-4 w-4" />}
                      >
                        Hủy lịch hẹn
                      </MedButton>
                    </>
                  )}

                  {isCompleted && (
                    <MedButton
                      variant="primary"
                      size="sm"
                      onClick={() => setReviewModalData({ isOpen: true, appointment: lh })}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs border-none"
                      leftIcon={<Star className="h-4 w-4 fill-white text-white" />}
                    >
                      Đánh giá ca khám
                    </MedButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Video Call Telehealth cho Bệnh nhân */}
      <TelehealthVideoModal
        isOpen={videoCall.open}
        onClose={() => setVideoCall({ open: false, doctorName: '', info: {} })}
        participantName={videoCall.doctorName}
        role="patient"
        appointmentInfo={videoCall.info}
      />

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
    </div>
  );
}
