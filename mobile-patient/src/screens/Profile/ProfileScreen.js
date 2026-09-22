import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import useAuthStore from '../../store/authStore';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Đăng Xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.hoTen || 'BN').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.hoTen || 'Nguyễn Đình Hảo'}</Text>
          <Text style={styles.userCode}>Mã Bệnh Nhân: {user?.maBenhNhan || 'BN000001'}</Text>
        </View>

        {/* Thông tin y tế chi tiết */}
        <Text style={styles.sectionTitle}>Thông Tin Hồ Sơ Y Tế</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số Điện Thoại</Text>
            <Text style={styles.infoValue}>{user?.soDienThoai || '0354162165'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thẻ BHYT</Text>
            <Text style={[styles.infoValue, { color: COLORS.success, fontWeight: '800' }]}>
              {user?.soBhyt || 'GD4791234567890'} (Đúng tuyến)
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nhóm Máu</Text>
            <Text style={[styles.infoValue, { color: COLORS.danger, fontWeight: '800' }]}>
              {user?.nhomMau || 'O+'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tiền Sử Dị Ứng</Text>
            <Text style={styles.infoValue}>Không có tiền sử dị ứng thuốc</Text>
          </View>
        </View>

        {/* Cài Đặt & Hỗ Trợ */}
        <Text style={styles.sectionTitle}>Hỗ Trợ & Cài Đặt</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={() => alert('Đường dây nóng 1900 8888')}>
            <Text style={styles.menuText}>📞 Tổng đài hỗ trợ 24/7</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => alert('Chính sách bảo mật dữ liệu y tế theo chuẩn HIPAA và Bộ Y Tế 2026.')}>
            <Text style={styles.menuText}>🔒 Bảo mật dữ liệu y tế</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => alert('Phiên bản Mobile App 1.0.0 (KLTN 2026)')}>
            <Text style={styles.menuText}>ℹ️ Về ứng dụng</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đăng Xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  userCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  logoutBtn: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
  },
});

