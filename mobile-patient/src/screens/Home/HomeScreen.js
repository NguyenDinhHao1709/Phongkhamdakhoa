import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import useAuthStore from '../../store/authStore';
import useQueueStore from '../../store/queueStore';
import { apiGetPatientById, apiGetDoctors } from '../../api/apiClient';

const DEFAULT_DOCTORS = [
  { id: 1, ten: 'BS.CKII Nguyễn Văn Dũng', chuyenKhoa: 'Nội Tổng Quát', kinhNghiem: '20 năm kinh nghiệm', phongKham: 'Phòng 102 - Tầng 1' },
  { id: 2, ten: 'ThS.BS Trần Mai Phương', chuyenKhoa: 'Tim Mạch & Telehealth', kinhNghiem: '12 năm kinh nghiệm', phongKham: 'Phòng 108 - Tầng 1' },
  { id: 3, ten: 'BS.CKI Lê Hoàng Minh', chuyenKhoa: 'CĐHA & Siêu Âm 4D', kinhNghiem: '15 năm kinh nghiệm', phongKham: 'Phòng 205 - Tầng 2' },
];

const QUICK_ACTIONS = [
  { key: 'Booking', icon: 'calendar-outline', label: 'Đặt lịch khám', desc: 'Tại viện & Telehealth' },
  { key: 'Booking', icon: 'list-outline', label: 'Lịch hẹn của tôi', desc: 'Quản lý & Hủy lịch' },
  { key: 'Queue', icon: 'ticket-outline', label: 'Tiến độ & STT', desc: 'Số thứ tự điện tử' },
  { key: 'Records', icon: 'document-text-outline', label: 'Hồ sơ & EMR', desc: 'Kết quả, đơn thuốc' },
];

export default function HomeScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const activeTicket = useQueueStore((state) => state.activeTicket);
  const [doctors, setDoctors] = React.useState(DEFAULT_DOCTORS);

  React.useEffect(() => {
    if (user?.benhNhanId && !user?.soBhyt) {
      apiGetPatientById(user.benhNhanId)
        .then((res) => {
          const patient = res?.data || res;
          if (patient) {
            setUser({
              hoTen: patient.hoTen || user.hoTen,
              maBenhNhan: patient.maBenhNhan || user.maBenhNhan,
              soBhyt: patient.soBhyt || patient.soBHYT || user.soBhyt,
              nhomMau: patient.nhomMau || user.nhomMau,
              diUng: patient.diUng || '',
              tienSuBenh: patient.tienSuBenh || '',
              soDienThoai: patient.soDienThoai || user.soDienThoai,
            });
          }
        })
        .catch((error) => console.warn('Lỗi đồng bộ hồ sơ bệnh nhân:', error));
    }

    apiGetDoctors()
      .then((res) => {
        const list = res?.data || res;
        if (Array.isArray(list) && list.length > 0) {
          setDoctors(list.slice(0, 3).map((doctor, index) => ({
            id: doctor.id || index,
            ten: doctor.nhanVien?.hoTen ? `BS. ${doctor.nhanVien.hoTen}` : (doctor.hoTen || 'Bác sĩ chuyên khoa'),
            chuyenKhoa: doctor.chuyenKhoa || 'Chuyên khoa Nội',
            kinhNghiem: doctor.bangCap || 'Bác sĩ chuyên khoa',
            phongKham: doctor.phongKham || 'Phòng khám đa khoa',
          })));
        }
      })
      .catch((error) => console.warn('Lỗi lấy danh sách bác sĩ:', error));
  }, [user?.benhNhanId]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.hoTen || 'Bệnh nhân'}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{(user?.hoTen || 'B').charAt(0)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.patientCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardLabel}>Mã bệnh nhân</Text>
              <Text style={styles.cardValue}>{user?.maBenhNhan || 'BN000001'}</Text>
            </View>
            <Text style={styles.bloodBadge}>{user?.nhomMau || 'O+'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardLabel}>Thẻ BHYT</Text>
              <Text style={styles.cardMono}>{user?.soBhyt || 'Chưa cập nhật'}</Text>
            </View>
            <Text style={styles.validText}>✓ Đúng tuyến</Text>
          </View>
        </View>

        {activeTicket ? (
          <TouchableOpacity style={styles.queueCard} onPress={() => navigation.navigate('Queue')}>
            <Text style={styles.queueLabel}>SỐ THỨ TỰ CỦA BẠN</Text>
            <Text style={styles.queueNumber}>{activeTicket.soThuTu || 'A-104'}</Text>
            <Text style={styles.queueRoom}>{activeTicket.phongKham || 'Phòng khám chuyên khoa'}</Text>
            <Text style={styles.queueHint}>Còn {activeTicket.soNguoiTruoc || 0} người • ~{activeTicket.uocTinhPhut || 0} phút</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Dịch vụ y tế</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <TouchableOpacity key={item.label} style={styles.quickCard} onPress={() => navigation.navigate(item.key)}>
              <Ionicons name={item.icon} size={22} color={COLORS.primary} />
              <Text style={styles.quickTitle}>{item.label}</Text>
              <Text style={styles.quickDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.aiCard} onPress={() => navigation.navigate('ChatAI')}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
          <View style={styles.flex}>
            <Text style={styles.aiTitle}>Trợ lý tư vấn AI 24/7</Text>
            <Text style={styles.aiDesc}>Hỏi về triệu chứng, thuốc và chuẩn bị trước khi khám</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bác sĩ đang trực</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
            <Text style={styles.link}>Đặt lịch →</Text>
          </TouchableOpacity>
        </View>
        {doctors.map((doctor) => (
          <View key={doctor.id} style={styles.doctorCard}>
            <View style={styles.doctorAvatar}><Ionicons name="person-outline" size={20} color={COLORS.primary} /></View>
            <View style={styles.flex}>
              <Text style={styles.doctorName}>{doctor.ten}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.chuyenKhoa}</Text>
              <Text style={styles.doctorMeta}>{doctor.kinhNghiem} • {doctor.phongKham}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
              <Text style={styles.link}>Đặt khám</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.hotline} onPress={() => Linking.openURL('tel:19008888')}>
          <Ionicons name="call-outline" size={20} color={COLORS.primary} />
          <View>
            <Text style={styles.hotlineTitle}>Tổng đài hỗ trợ</Text>
            <Text style={styles.hotlineNumber}>1900 8888 • Cấp cứu: 115</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { color: COLORS.textSecondary, fontSize: 13 },
  userName: { color: COLORS.textPrimary, fontSize: 21, fontWeight: '800', marginTop: 3 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 18 },
  patientCard: { backgroundColor: COLORS.primary, borderRadius: 18, padding: 17, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#DBEAFE', fontSize: 11, fontWeight: '600' },
  cardValue: { color: '#FFF', fontSize: 17, fontWeight: '800', marginTop: 3 },
  cardMono: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 3 },
  bloodBadge: { color: '#1D4ED8', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, fontWeight: '800' },
  validText: { color: '#BBF7D0', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 13 },
  queueCard: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 18 },
  queueLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  queueNumber: { color: COLORS.primaryDark, fontSize: 42, fontWeight: '900', marginVertical: 3 },
  queueRoom: { color: COLORS.textPrimary, fontWeight: '700' },
  queueHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 5 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  quickCard: { width: '48%', minHeight: 104, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 15, padding: 13 },
  quickTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 9 },
  quickDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 20 },
  flex: { flex: 1 },
  aiTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  aiDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  doctorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 15, padding: 12, marginBottom: 9 },
  doctorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  doctorName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  doctorSpecialty: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginTop: 3 },
  doctorMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  hotline: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.primaryLight, borderRadius: 15, padding: 14, marginTop: 12 },
  hotlineTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  hotlineNumber: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 3 },
});
