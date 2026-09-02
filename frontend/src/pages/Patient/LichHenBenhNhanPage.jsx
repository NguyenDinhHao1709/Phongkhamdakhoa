import { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, Stethoscope, AlertTriangle, ShieldAlert, XCircle, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { MedButton } from '../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../design-system/components/Badge/StatusBadge';
import { formatDate } from '../../utils/formatDate';

export default function LichHenBenhNhanPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
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

    if (diffHours < 2) {
      alert(`⚠️ KHÔNG THỂ HỦY LỊCH HẸN TRỰC TUYẾN!\n\nLịch hẹn ${lh.maLichHen} còn dưới 2 tiếng nữa là đến giờ khám (${lh.gioHen} ngày ${lh.ngayHen}). Theo quy định phòng khám, hủy dưới 2 tiếng hoặc không đến khám sẽ không được hoàn lại khoản tiền tạm ứng 1/5 (40.000đ).`);
      return;
    }

    const confirmCancel = window.confirm(
      `XÁC NHẬN HỦY LỊCH HẸN ${lh.maLichHen}\n\nBạn đang hủy trước giờ khám > 2 tiếng (Hợp lệ).\nSố tiền tạm ứng 40.000đ (1/5 phí khám) sẽ được hoàn trả tự động 100% qua VNPay/MoMo.\n\nBạn có chắc chắn muốn hủy?`
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

      {/* Thông tin chính sách hủy & hoàn cọc 2h */}
      <div className="rounded-2xl bg-primary-50/70 p-4 border border-primary-200/80 text-xs text-primary-900 leading-relaxed">
        <p className="font-bold text-sm mb-1 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-primary-600" /> Quy định Tạm ứng 1/5 & Ranh giới Hủy 2 tiếng:
        </p>
        <p>• Mỗi lịch hẹn cần tạm ứng <strong>40.000 đ (1/5 phí khám 200.000đ)</strong> để xác nhận chỗ.</p>
        <p>• Hủy lịch hợp lệ <strong>trước giờ khám &gt; 2 tiếng</strong>: Được <strong>hoàn trả 100% tạm ứng (40.000đ)</strong> qua VNPay/MoMo.</p>
        <p>• Hủy lịch <strong>dưới 2 tiếng</strong> hoặc không đến khám (No-show): Khoản tiền tạm ứng 40.000đ sẽ được phòng khám giữ lại theo quy định.</p>
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
                          : lh.trangThai === 'da_xac_nhan'
                          ? 'hoan_thanh'
                          : 'cho_kham'
                      }
                    />
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                      Tạm ứng 1/5: 40.000 đ
                    </span>
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
                      <span>Bác sĩ: {lh.bacSi?.nhanVien?.hoTen || 'Bác sĩ trực phòng khám'}</span>
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

                {/* Nút Hủy Lịch */}
                {!isCanceled && !isCompleted && (
                  <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                    <MedButton
                      variant="danger"
                      size="sm"
                      loading={cancelingId === lh.id}
                      onClick={() => handleCancelAppointment(lh)}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      Hủy lịch hẹn
                    </MedButton>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
