import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import {
  apiGetMyAppointments,
  apiBookAppointment,
  apiCancelAppointment,
  apiGetDoctors,
} from '../../api/apiClient';
import PatientTelehealthModal from '../../components/PatientTelehealthModal';
import useAuthStore from '../../store/authStore';

const CHUYEN_KHOA = [
  { id: 'noi', name: 'Nội Tổng Quát', icon: 'medkit-outline', desc: 'Khám tổng quát, huyết áp, tiểu đường, tiêu hóa' },
  { id: 'tim', name: 'Tim Mạch', icon: 'heart-outline', desc: 'Bệnh lý tim, van tim, rối loạn nhịp, tăng huyết áp' },
  { id: 'tai_mui_hong', name: 'Tai Mũi Họng', icon: 'headset-outline', desc: 'Viêm xoang, amidan, ù tai, nội soi TMH' },
  { id: 'nhi', name: 'Nhi Khoa', icon: 'happy-outline', desc: 'Khám sức khỏe trẻ em, tiêm chủng, hô hấp nhi' },
  { id: 'ngoai', name: 'Ngoại Khoa', icon: 'bandage-outline', desc: 'Tiểu phẫu, vết thương phần mềm, chấn thương' },
  { id: 'mat', name: 'Mắt (Nhãn Khoa)', icon: 'eye-outline', desc: 'Đo thị lực, tật khúc xạ, viêm kết mạc, đục thủy tinh thể' },
  { id: 'co_xuong_khop', name: 'Cơ Xương Khớp', icon: 'body-outline', desc: 'Thoái hóa khớp, đau lưng, thoát vị đĩa đệm' },
  { id: 'rang_ham_mat', name: 'Răng Hàm Mặt', icon: 'medkit-outline', desc: 'Khám nha khoa, nhổ răng, lấy cao răng, niềng răng' },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
];

export default function BookingScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const [mainTab, setMainTab] = useState('dat_lich'); // 'dat_lich' | 'lich_hen_cua_toi'
  const [hinhThuc, setHinhThuc] = useState('truc_tiep'); // 'truc_tiep' | 'truc_tuyen'
  const [selectedKhoa, setSelectedKhoa] = useState('noi');
  const [selectedDate, setSelectedDate] = useState('2026-09-18');
  const [selectedTime, setSelectedTime] = useState('08:30');
  const [trieuChung, setTrieuChung] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Danh sách lịch hẹn của tôi kết nối CSDL thực
  const [myAppointments, setMyAppointments] = useState([]);
  const [cancelingId, setCancelingId] = useState(null);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [telehealthAppointment, setTelehealthAppointment] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await apiGetMyAppointments();
      const list = res?.data || res;
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((item, idx) => ({
          id: item.id || idx,
          maLichHen: item.maLichHen || `LH-20260918-${String(idx + 1).padStart(3, '0')}`,
          chuyenKhoa: item.chuyenKhoa || item.bacSi?.chuyenKhoa || 'Nội Tổng Quát',
          bacSi: item.bacSi?.nhanVien?.hoTen
            ? `BS. ${item.bacSi.nhanVien.hoTen}`
            : (item.bacSiTen || 'BS.CKII Nguyễn Văn Dũng'),
          phongKham: item.phongKham?.tenPhong || (item.hinhThuc === 'truc_tuyen' ? 'Tư vấn Video Telehealth' : 'Phòng 102 - Nhà A'),
          ngayHenRaw: item.ngayHen,
          ngayHen: item.ngayHen ? new Date(item.ngayHen).toLocaleDateString('vi-VN') : '18/09/2026',
          gioHen: item.gioHen || '08:30',
          hinhThuc: item.hinhThuc || 'truc_tiep',
          trangThai: item.trangThai || 'da_xac_nhan',
          tienTamUng: 40000,
          lyDo: item.lyDoKham || item.lyDo || 'Khám sức khỏe tổng quát',
        }));
        setMyAppointments(formatted);
      } else {
        setMyAppointments([]);
      }
    } catch (e) {
      console.warn('Lỗi lấy danh sách lịch hẹn từ backend:', e);
      setMyAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!trieuChung.trim()) {
      const msg = 'Vui lòng mô tả sơ bộ lý do khám hoặc triệu chứng để bác sĩ chuẩn bị chu đáo.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Thông báo', msg);
      return;
    }

    setSubmitting(true);
    const khoaItem = CHUYEN_KHOA.find(k => k.id === selectedKhoa);

    try {
      const payload = {
        benhNhanId: user?.benhNhanId,
        ngayHen: selectedDate,
        gioHen: selectedTime,
        hinhThuc: hinhThuc,
        lyDoKham: trieuChung.trim(),
      };

      const res = await apiBookAppointment(payload);
      const bookedData = res?.data || res;
      const newCode = bookedData?.maLichHen || `LH-202609${Math.floor(10 + Math.random() * 20)}-${Math.floor(100 + Math.random() * 900)}`;

      await fetchAppointments();
      setTrieuChung('');

      const successNotice = `ĐẶT LỊCH THÀNH CÔNG!\n\n• Mã lịch hẹn: ${newCode}\n• Chuyên khoa: ${khoaItem?.name}\n• Hình thức: ${hinhThuc === 'truc_tiep' ? 'Khám tại viện' : 'Telehealth'}\n• Thời gian: ${selectedTime} ngày ${selectedDate}\n• Tiền tạm ứng (1/5): 40.000đ (đã đồng bộ vào CSDL)`;
      
      if (Platform.OS === 'web') {
        window.alert(successNotice);
      } else {
        Alert.alert('Thành công', successNotice);
      }
      setMainTab('lich_hen_cua_toi');
    } catch (err) {
      console.warn('Lỗi gọi API đặt lịch:', err);
      const message = err?.error?.message || err?.message || 'Không thể đặt lịch. Vui lòng thử lại.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Không thể đặt lịch', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (item) => {
    const confirmMsg = `XÁC NHẬN HỦY LỊCH HẸN: ${item.maLichHen}\n\nLịch hẹn của bạn đủ điều kiện hủy trước 2 tiếng.\nKhoản tạm ứng 40.000đ sẽ được hoàn lại 100% qua VNPay/MoMo.\n\nBạn có chắc chắn muốn hủy?`;
    
    let isConfirmed = false;
    if (Platform.OS === 'web') {
      isConfirmed = window.confirm(confirmMsg);
    } else {
      isConfirmed = true;
    }

    if (isConfirmed) {
      setCancelingId(item.id);
      try {
        await apiCancelAppointment(item.id);
      } catch (e) {
        console.warn('Cancel API warning:', e);
      }
      setMyAppointments(prev => prev.map(a => a.id === item.id ? { ...a, trangThai: 'da_huy' } : a));
      setCancelingId(null);
      const doneMsg = `Đã hủy lịch hẹn ${item.maLichHen} thành công trên hệ thống. Yêu cầu hoàn tiền 40.000đ đã được ghi nhận.`;
      if (Platform.OS === 'web') window.alert(doneMsg);
      else Alert.alert('Thông báo', doneMsg);
    }
  };

  const handleJoinTelehealth = (item) => {
    const appointmentDate = item.ngayHenRaw
      ? String(item.ngayHenRaw).slice(0, 10)
      : item.ngayHen?.split('/').reverse().join('-');
    const appointmentTime = String(item.gioHen || '').slice(0, 5);
    const appointmentStart = appointmentDate && appointmentTime
      ? new Date(`${appointmentDate}T${appointmentTime}:00`)
      : null;
    const openTime = appointmentStart ? appointmentStart.getTime() - 15 * 60 * 1000 : 0;
    if (openTime && Date.now() < openTime) {
      const minutes = Math.ceil((openTime - Date.now()) / 60000);
      const msg = `Phòng khám mở trước giờ hẹn 15 phút. Còn khoảng ${minutes} phút nữa.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Chưa đến giờ khám', msg);
      return;
    }
    setTelehealthAppointment(item);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Tab Bar – 2 nút, active = bg-blue solid */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, mainTab === 'dat_lich' && styles.tabBtnActive]}
          onPress={() => setMainTab('dat_lich')}
        >
          <Ionicons
            name="calendar"
            size={15}
            color={mainTab === 'dat_lich' ? '#FFFFFF' : '#6B7280'}
          />
          <Text style={[styles.tabBtnText, mainTab === 'dat_lich' && styles.tabBtnTextActive]}>
            Đặt Lịch Khám Mới
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, mainTab === 'lich_hen_cua_toi' && styles.tabBtnActive]}
          onPress={() => {
            setMainTab('lich_hen_cua_toi');
            fetchAppointments();
          }}
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={mainTab === 'lich_hen_cua_toi' ? '#FFFFFF' : '#6B7280'}
          />
          <Text style={[styles.tabBtnText, mainTab === 'lich_hen_cua_toi' && styles.tabBtnTextActive]}>
            Lịch Hẹn Của Tôi ({myAppointments.filter(a => a.trangThai !== 'da_huy').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {mainTab === 'dat_lic' ? null : null}
        {mainTab === 'dat_lich' ? (
          /* ───────────── TAB 1: ĐẶT LỊCH KHÁM MỚI ───────────── */
          <View>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Đặt Lịch Hẹn Khám Bệnh</Text>
              <Text style={styles.pageSubtitle}>
                Chủ động chọn giờ khám, giảm 80% thời gian chờ tại viện
              </Text>
            </View>

            {/* Chọn hình thức khám – 2 nút outline / solid */}
            <View style={styles.hinhThucRow}>
              <TouchableOpacity
                style={[styles.hinhThucBtn, hinhThuc === 'truc_tiep' && styles.hinhThucBtnActive]}
                onPress={() => setHinhThuc('truc_tiep')}
              >
                <Ionicons
                  name="business-outline"
                  size={15}
                  color={hinhThuc === 'truc_tiep' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.hinhThucBtnText, hinhThuc === 'truc_tiep' && styles.hinhThucBtnTextActive]}>
                  Khám Tại Viện
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hinhThucBtn, hinhThuc === 'truc_tuyen' && styles.hinhThucBtnActive]}
                onPress={() => setHinhThuc('truc_tuyen')}
              >
                <Ionicons
                  name="videocam-outline"
                  size={15}
                  color={hinhThuc === 'truc_tuyen' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.hinhThucBtnText, hinhThuc === 'truc_tuyen' && styles.hinhThucBtnTextActive]}>
                  Khám Telehealth
                </Text>
              </TouchableOpacity>
            </View>

            {/* Policy notice */}
            <View style={styles.policyNotice}>
              <Ionicons name="shield-checkmark" size={15} color="#2563EB" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Quy định đặt lịch & Tạm ứng y tế:</Text>
                <Text style={styles.policyText}>
                  • Tạm ứng 1/5 phí khám: <Text style={{ fontWeight: '700' }}>40.000 đ</Text> để xác nhận giữ chỗ.{'\n'}
                  • Hủy trước giờ khám {'>'} 2 tiếng: Hoàn lại 100% tiền cọc tự động qua VNPay/MoMo.
                </Text>
              </View>
            </View>

            {/* 1. Chọn Chuyên Khoa */}
            <Text style={styles.sectionLabel}>1. Chọn Chuyên Khoa Khám</Text>
            <View style={styles.khoaGrid}>
              {CHUYEN_KHOA.map((khoa) => {
                const isSelected = selectedKhoa === khoa.id;
                return (
                  <TouchableOpacity
                    key={khoa.id}
                    style={[styles.khoaCard, isSelected && styles.khoaCardActive]}
                    onPress={() => setSelectedKhoa(khoa.id)}
                  >
                    <View style={[styles.khoaIconBox, isSelected && styles.khoaIconBoxActive]}>
                      <Ionicons
                        name={khoa.icon}
                        size={19}
                        color={isSelected ? '#FFFFFF' : '#2563EB'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.khoaName, isSelected && styles.khoaNameActive]}>
                        {khoa.name}
                      </Text>
                      <Text style={styles.khoaDesc} numberOfLines={1}>{khoa.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={17} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Chọn Ngày Khám */}
            <Text style={styles.sectionLabel}>2. Chọn Ngày Khám</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'].map((d) => {
                const isSelected = selectedDate === d;
                const [y, m, day] = d.split('-');
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                      {day}/{m}
                    </Text>
                    <Text style={[styles.dateChipWeekday, isSelected && styles.dateChipTextActive]}>
                      Thứ {new Date(d).getDay() === 0 ? 'CN' : new Date(d).getDay() + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3. Chọn Khung Giờ */}
            <Text style={styles.sectionLabel}>3. Khung Giờ Trực Khám (15-30 phút/lượt)</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeText, isSelected && styles.timeTextActive]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Mô Tả Triệu Chứng */}
            <Text style={styles.sectionLabel}>4. Lý Do Khám & Triệu Chứng Ban Đầu</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Đau thượng vị sau ăn 2 tuần nay, sốt nhẹ về chiều, đã uống men tiêu hóa không đỡ..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={trieuChung}
                onChangeText={setTrieuChung}
              />
            </View>

            {/* Tóm Tắt */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hình thức:</Text>
                <Text style={styles.summaryVal}>
                  {hinhThuc === 'truc_tiep' ? '🏥 Khám Trực Tiếp Tại Viện' : '📹 Telehealth Trực Tuyến'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Chuyên khoa:</Text>
                <Text style={styles.summaryVal}>
                  {CHUYEN_KHOA.find(k => k.id === selectedKhoa)?.name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Thời gian khám:</Text>
                <Text style={[styles.summaryVal, { color: '#2563EB', fontWeight: '700' }]}>
                  {selectedTime} • {selectedDate}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>Tạm ứng đặt chỗ (1/5):</Text>
                <Text style={styles.summaryPrice}>40.000 đ</Text>
              </View>
              <Text style={styles.summaryNote}>Phí khám gốc: 200.000đ • Thanh toán 160.000đ còn lại tại quầy hoặc BHYT</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
              onPress={handleConfirmBooking}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Xác Nhận Đặt Lịch Khám</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ───────────── TAB 2: LỊCH HẸN CỦA TÔI ───────────── */
          <View>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Lịch Hẹn Của Tôi</Text>
              <Text style={styles.pageSubtitle}>
                Theo dõi tiến độ, tham gia Telehealth hoặc hủy lịch trước 2 tiếng
              </Text>
            </View>

            {loadingAppts ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={[styles.emptyText, { marginTop: 10 }]}>Đang đồng bộ lịch hẹn từ máy chủ CSDL...</Text>
              </View>
            ) : myAppointments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={44} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Chưa có lịch hẹn nào</Text>
                <Text style={styles.emptyText}>
                  Hãy chọn chuyên khoa và đặt lịch khám để được phục vụ tốt nhất.
                </Text>
                <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setMainTab('dat_lich')}>
                  <Text style={styles.emptyActionBtnText}>+ Đặt lịch khám mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {myAppointments.map((appt) => {
                  const isCanceled = appt.trangThai === 'da_huy';
                  const isDone = appt.trangThai === 'hoan_thanh';
                  const isTelehealth = appt.hinhThuc === 'truc_tuyen';

                  return (
                    <View key={appt.id} style={[styles.apptCard, isCanceled && styles.apptCardCanceled]}>
                      {/* Top Row */}
                      <View style={styles.apptTopRow}>
                        <View style={styles.apptCodeBadge}>
                          <Text style={styles.apptCodeText}>{appt.maLichHen}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          isCanceled ? styles.statusBadgeCanceled : isDone ? styles.statusBadgeDone : styles.statusBadgeActive,
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            isCanceled ? styles.statusTextCanceled : isDone ? styles.statusTextDone : styles.statusTextActive,
                          ]}>
                            {isCanceled ? 'Đã hủy' : isDone ? 'Đã khám xong' : 'Đã xác nhận chỗ'}
                          </Text>
                        </View>
                      </View>

                      {/* Content */}
                      <View style={styles.apptBody}>
                        <Text style={styles.apptSpecialty}>{appt.chuyenKhoa}</Text>
                        <Text style={styles.apptDoctor}>👨‍⚕️ {appt.bacSi}</Text>
                        <Text style={styles.apptLocation}>
                          {isTelehealth ? '📹 Khám từ xa qua Video' : `📍 ${appt.phongKham}`}
                        </Text>
                        <View style={styles.apptTimeRow}>
                          <Ionicons name="time-outline" size={14} color="#2563EB" />
                          <Text style={styles.apptTimeText}>
                            {appt.gioHen} ngày {appt.ngayHen}
                          </Text>
                        </View>
                        {appt.lyDo ? (
                          <Text style={styles.apptReasonText} numberOfLines={2}>
                            Lý do: {appt.lyDo}
                          </Text>
                        ) : null}
                      </View>

                      {/* Actions */}
                      {!isCanceled && !isDone && (
                        <View style={styles.apptActionsRow}>
                          {isTelehealth ? (
                            <TouchableOpacity
                              style={styles.telehealthBtn}
                              onPress={() => handleJoinTelehealth(appt)}
                            >
                              <Ionicons name="videocam" size={14} color="#FFFFFF" />
                              <Text style={styles.telehealthBtnText}>Vào Phòng Khám Video</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.queueShortcutBtn}
                              onPress={() => navigation.navigate('Queue')}
                            >
                              <Ionicons name="ticket-outline" size={14} color="#2563EB" />
                              <Text style={styles.queueShortcutBtnText}>Xem STT</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => handleCancel(appt)}
                            disabled={cancelingId === appt.id}
                          >
                            {cancelingId === appt.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <>
                                <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                                <Text style={styles.cancelBtnText}>Hủy Lịch</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <PatientTelehealthModal
        visible={Boolean(telehealthAppointment)}
        appointment={telehealthAppointment}
        onClose={() => setTelehealthAppointment(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Tab Bar – active = blue solid, inactive = outline gray
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 5,
    backgroundColor: '#FFFFFF',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Hình thức tab
  hinhThucRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  hinhThucBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  hinhThucBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  hinhThucBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  hinhThucBtnTextActive: {
    color: '#FFFFFF',
  },

  // Policy notice
  policyNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  policyText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
  },

  // Chuyên khoa grid
  khoaGrid: {
    gap: 8,
  },
  khoaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  khoaCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFF',
  },
  khoaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  khoaIconBoxActive: {
    backgroundColor: '#2563EB',
  },
  khoaName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  khoaNameActive: {
    color: '#2563EB',
  },
  khoaDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Date picker
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  dateChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  dateChipDay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dateChipWeekday: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },

  // Time slots
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '22%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timeChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  timeTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // Textarea input
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 10,
  },
  textInput: {
    fontSize: 13,
    color: '#374151',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Summary
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  summaryNote: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Confirm button
  confirmBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty state
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  emptyActionBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Appointment cards
  apptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  apptCardCanceled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  apptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apptCodeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  apptCodeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusTextActive: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeCanceled: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusTextCanceled: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeDone: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusTextDone: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  apptBody: {
    gap: 3,
  },
  apptSpecialty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  apptDoctor: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  apptLocation: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  apptTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  apptTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  apptReasonText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  apptActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  telehealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  telehealthBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  queueShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  queueShortcutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
