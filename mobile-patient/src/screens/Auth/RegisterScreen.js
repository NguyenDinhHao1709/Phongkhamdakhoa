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
import { apiRegister, apiSendOtp } from '../../api/apiClient';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = Điền thông tin, 2 = Xác thực OTP
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [ngaySinh, setNgaySinh] = useState('2000-01-01');
  const [gioiTinh, setGioiTinh] = useState('nam');
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleNextStep1 = async () => {
    setErrorMessage('');
    if (!email.trim() || !matKhau || !hoTen.trim() || !soDienThoai.trim() || !ngaySinh) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    if (matKhau.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (matKhau !== xacNhanMatKhau) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    // RÀNG BUỘC NGÀY SINH KHÔNG ĐƯỢC QUÁ NGÀY HÔM NAY
    const today = getTodayStr();
    if (ngaySinh > today) {
      setErrorMessage('Ngày sinh không được vượt quá ngày hôm nay');
      return;
    }

    try {
      setLoading(true);
      await apiSendOtp(email.trim());
      setStep(2);
    } catch (err) {
      console.log('Send OTP error:', err);
      // Fallback cho phép tiếp tục nhập OTP demo
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegister = async () => {
    if (!otpCode || otpCode.length < 4) {
      setErrorMessage('Vui lòng nhập mã xác thực OTP');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      await apiRegister({
        tenDangNhap: email.trim(),
        email: email.trim(),
        matKhau,
        hoTen: hoTen.trim(),
        soDienThoai: soDienThoai.trim(),
        ngaySinh,
        gioiTinh,
        otp: otpCode,
      });
      alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      navigation.navigate('Login');
    } catch (err) {
      console.warn('Register error:', err);
      setErrorMessage(err?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
              <Text style={styles.backBtnText}>← Quay lại</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Đăng Ký Hồ Sơ Y Tế</Text>
            <Text style={styles.subtitle}>Tạo tài khoản nhận STT và theo dõi bệnh án</Text>

            {/* Stepper */}
            <View style={styles.stepperRow}>
              <View style={[styles.stepDot, step >= 1 && styles.stepActive]} />
              <View style={[styles.stepLine, step === 2 && styles.stepActive]} />
              <View style={[styles.stepDot, step === 2 && styles.stepActive]} />
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên bệnh nhân *</Text>
                  <TextInput
                    style={styles.input}
                    value={hoTen}
                    onChangeText={setHoTen}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại *</Text>
                  <TextInput
                    style={styles.input}
                    value={soDienThoai}
                    onChangeText={setSoDienThoai}
                    placeholder="0912345678"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email (Tên đăng nhập) *</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nguyenvana@gmail.com"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Ngày sinh (YYYY-MM-DD) *</Text>
                    <TextInput
                      style={styles.input}
                      value={ngaySinh}
                      onChangeText={setNgaySinh}
                      placeholder="2000-01-01"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={[styles.inputGroup, { width: 110 }]}>
                    <Text style={styles.label}>Giới tính *</Text>
                    <View style={styles.genderRow}>
                      <TouchableOpacity
                        style={[styles.genderBtn, gioiTinh === 'nam' && styles.genderBtnActive]}
                        onPress={() => setGioiTinh('nam')}
                      >
                        <Text style={[styles.genderText, gioiTinh === 'nam' && styles.genderTextActive]}>Nam</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, gioiTinh === 'nu' && styles.genderBtnActive]}
                        onPress={() => setGioiTinh('nu')}
                      >
                        <Text style={[styles.genderText, gioiTinh === 'nu' && styles.genderTextActive]}>Nữ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu *</Text>
                  <TextInput
                    style={styles.input}
                    value={matKhau}
                    onChangeText={setMatKhau}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu *</Text>
                  <TextInput
                    style={styles.input}
                    value={xacNhanMatKhau}
                    onChangeText={setXacNhanMatKhau}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, loading && styles.btnDisabled]}
                  onPress={handleNextStep1}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.actionBtnText}>Tiếp tục — Gửi mã OTP →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.otpHeader}>
                  <Text style={styles.otpIcon}>📩</Text>
                  <Text style={styles.otpTitle}>Xác thực mã OTP</Text>
                  <Text style={styles.otpDesc}>
                    Mã xác thực 6 số đã được gửi đến email: {'\n'}
                    <Text style={{ fontWeight: 'bold', color: COLORS.textPrimary }}>{email}</Text>
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="• • • • • •"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, loading && styles.btnDisabled]}
                  onPress={handleCompleteRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.actionBtnText}>✓ Hoàn tất & Kích hoạt tài khoản</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    paddingTop: 10,
  },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 8,
    marginBottom: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepActive: {
    backgroundColor: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  genderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genderTextActive: {
    color: COLORS.primary,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpHeader: {
    alignItems: 'center',
    marginVertical: 14,
  },
  otpIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  otpDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '800',
    color: COLORS.primary,
    paddingVertical: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
