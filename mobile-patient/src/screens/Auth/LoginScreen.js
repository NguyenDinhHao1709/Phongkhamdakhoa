import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import {
  apiLogin,
  apiGetPatientById,
  apiForgotPasswordOtp,
  apiResetPassword,
} from '../../api/apiClient';
import useAuthStore from '../../store/authStore';

export default function LoginScreen({ navigation }) {
  const [tenDangNhap, setTenDangNhap] = useState('0354162165');
  const [matKhau, setMatKhau] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!tenDangNhap.trim() || !matKhau) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await apiLogin(tenDangNhap.trim(), matKhau);
      const data = res?.data || res;
      if (data && data.accessToken) {
        let fullPatientData = {};
        if (data.user?.benhNhanId) {
          try {
            const bnRes = await apiGetPatientById(data.user.benhNhanId);
            fullPatientData = bnRes?.data || bnRes || {};
          } catch (e) {
            console.warn('Lỗi tải thông tin chi tiết bệnh nhân:', e);
          }
        }
        const mergedUser = {
          ...data.user,
          ...fullPatientData,
          hoTen: fullPatientData.hoTen || data.user.hoTen,
          maBenhNhan: fullPatientData.maBenhNhan || 'BN000001',
          soBhyt: fullPatientData.soBhyt || fullPatientData.soBHYT || 'GD4791234567890',
          nhomMau: fullPatientData.nhomMau || 'O+',
          soDienThoai: fullPatientData.soDienThoai || data.user.tenDangNhap,
          diUng: fullPatientData.diUng || '',
          tienSuBenh: fullPatientData.tienSuBenh || '',
        };
        login(mergedUser, data.accessToken);
      } else {
        setErrorMessage('Phản hồi đăng nhập không hợp lệ từ máy chủ.');
      }
    } catch (err) {
      console.warn('Login error:', err);
      setErrorMessage(err?.error?.message || err?.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtp = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Vui lòng nhập email hợp lệ');
      return;
    }
    try {
      setForgotLoading(true);
      setForgotError('');
      await apiForgotPasswordOtp(forgotEmail.trim());
      setForgotStep(2);
    } catch (err) {
      setForgotError(err?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (forgotOtp.trim().length < 6 || forgotNewPassword.length < 6) {
      setForgotError('OTP phải có 6 ký tự và mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Xác nhận mật khẩu không trùng khớp');
      return;
    }
    try {
      setForgotLoading(true);
      setForgotError('');
      await apiResetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
      setForgotVisible(false);
      setForgotStep(1);
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setErrorMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (err) {
      setForgotError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🩺</Text>
            </View>
            <Text style={styles.brandTitle}>PHÒNG KHÁM ĐA KHOA</Text>
            <Text style={styles.brandSubtitle}>CỔNG THÔNG TIN BỆNH NHÂN</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
            <Text style={styles.cardDesc}>Nhập thông tin để tra cứu hồ sơ và theo dõi khám bệnh</Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Input SĐT/Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại / Email</Text>
              <TextInput
                style={styles.input}
                value={tenDangNhap}
                onChangeText={setTenDangNhap}
                placeholder="Nhập số điện thoại hoặc email"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Input Mật khẩu */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Mật khẩu</Text>
                <TouchableOpacity
                  onPress={() => {
                    setForgotVisible(true);
                    setForgotStep(1);
                    setForgotError('');
                  }}
                >
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  value={matKhau}
                  onChangeText={setMatKhau}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng Nhập Ngay</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Chưa có tài khoản hồ sơ y tế? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          </View>

          {forgotVisible ? (
            <View style={styles.forgotCard}>
              <Text style={styles.cardTitle}>Đặt lại mật khẩu</Text>
              <Text style={styles.cardDesc}>
                {forgotStep === 1 ? 'Nhập email để nhận mã OTP.' : 'Nhập OTP và mật khẩu mới.'}
              </Text>
              {forgotError ? <Text style={styles.errorText}>⚠️ {forgotError}</Text> : null}
              {forgotStep === 1 ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="Email đăng ký"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.loginBtn} onPress={handleForgotOtp} disabled={forgotLoading}>
                    <Text style={styles.loginBtnText}>{forgotLoading ? 'Đang gửi...' : 'Gửi mã OTP'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    placeholder="Mã OTP 6 số"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={styles.input}
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    placeholder="Mật khẩu mới"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    value={forgotConfirmPassword}
                    onChangeText={setForgotConfirmPassword}
                    placeholder="Xác nhận mật khẩu mới"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.loginBtn} onPress={handleResetPassword} disabled={forgotLoading}>
                    <Text style={styles.loginBtnText}>{forgotLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => setForgotVisible(false)}>
                <Text style={styles.cancelForgotText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Hotline Footer */}
          <View style={styles.hotlineBox}>
            <Text style={styles.hotlineText}>Tổng đài tư vấn & Cấp cứu 24/7</Text>
            <Text style={styles.hotlineNumber}>📞 1900 8888</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  forgotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelForgotText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  hotlineBox: {
    alignItems: 'center',
    marginTop: 28,
  },
  hotlineText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  hotlineNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
    marginTop: 2,
  },
});
