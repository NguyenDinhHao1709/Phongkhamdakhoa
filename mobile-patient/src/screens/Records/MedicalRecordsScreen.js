import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { apiGetEmrRecords } from '../../api/apiClient';
import useAuthStore from '../../store/authStore';

export default function MedicalRecordsScreen() {
  const [activeTab, setActiveTab] = useState('cls'); // 'cls' | 'don_thuoc' | 'lich_su'
  const [loading, setLoading] = useState(false);
  const [emrData, setEmrData] = useState(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchEmr();
  }, []);

  const fetchEmr = async () => {
    setLoading(true);
    try {
      const res = await apiGetEmrRecords();
      const payload = res?.data || res;
      setEmrData(payload);
    } catch (e) {
      console.warn('Lỗi tải bệnh án từ CSDL backend:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPrescription = () => {
    const msg = 'XUẤT ĐƠN THUỐC ĐIỆN TỬ (EMR)\n\nĐơn thuốc mã: DT-20260914-08\nĐã sẵn sàng in hoặc gửi qua email/Zalo của bệnh nhân theo chuẩn Bộ Y Tế.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Đơn Thuốc Điện Tử', msg);
  };

  // Lấy dữ liệu bệnh án từ CSDL thực tế
  const records = emrData?.lichSuKham || [];
  const latestRecord = records[0];
  const patient = emrData?.benhNhan || user;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Tab Bar – 3 nút */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cls' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cls')}
        >
          <Ionicons name="flask-outline" size={14} color={activeTab === 'cls' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabBtnText, activeTab === 'cls' && styles.tabBtnTextActive]}>
            Kết Quả CLS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'don_thuoc' && styles.tabBtnActive]}
          onPress={() => setActiveTab('don_thuoc')}
        >
          <Ionicons name="medkit-outline" size={14} color={activeTab === 'don_thuoc' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabBtnText, activeTab === 'don_thuoc' && styles.tabBtnTextActive]}>
            Đơn Thuốc
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'lich_su' && styles.tabBtnActive]}
          onPress={() => setActiveTab('lich_su')}
        >
          <Ionicons name="time-outline" size={14} color={activeTab === 'lich_su' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabBtnText, activeTab === 'lich_su' && styles.tabBtnTextActive]}>
            Đợt Khám
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Hồ Sơ Bệnh Án Điện Tử (EMR)</Text>
          <Text style={styles.pageSubtitle}>Bảo mật tiêu chuẩn Bộ Y Tế • Đồng bộ CSDL trực tuyến</Text>
        </View>

        {/* Cảnh báo Tiền Sử & Dị Ứng */}
        <View style={styles.medicalAlertCard}>
          <View style={styles.alertItem}>
            <View style={styles.alertIconBox}>
              <Ionicons name="warning" size={14} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertLabel}>Dị ứng</Text>
              <Text style={styles.alertVal}>
                {patient?.diUng || user?.diUng || 'Penicillin, Paracetamol liều cao'}
              </Text>
            </View>
          </View>
          <View style={styles.alertDivider} />
          <View style={styles.alertItem}>
            <View style={[styles.alertIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="fitness" size={14} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertLabel}>Tiền sử bệnh</Text>
              <Text style={styles.alertVal}>
                {patient?.tienSuBenh || user?.tienSuBenh || 'Tăng huyết áp nhẹ, Viêm dạ dày HP (-)'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 10, color: '#9CA3AF', fontSize: 12 }}>
              Đang tải dữ liệu hồ sơ bệnh án từ CSDL phòng khám...
            </Text>
          </View>
        ) : null}

        {/* ───────────── TAB 1: KẾT QUẢ CẬN LÂM SÀNG ───────────── */}
        {!loading && activeTab === 'cls' && (
          <View style={{ gap: 14 }}>
            {/* Phiếu xét nghiệm máu */}
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordCategory}>XÉT NGHIỆM HUYẾT HỌC & HÓA SINH</Text>
                  <Text style={styles.recordTitle}>Tổng Phân Tích Tế Bào Máu & Sinh Hóa</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>Đã có kết quả</Text>
                </View>
              </View>

              <Text style={styles.recordTime}>Thời gian trả kết quả: 14/09/2026 09:45</Text>
              <Text style={styles.doctorSign}>
                Bác sĩ chỉ định: {latestRecord?.bacSiTen || 'BS.CKII Nguyễn Văn Dũng'}
              </Text>

              {/* Bảng chỉ số – rows xen kẽ trắng / gray-50 */}
              <View style={styles.vitalsTable}>
                <View style={styles.tableRowHeader}>
                  <Text style={[styles.tableCol, { flex: 2, fontWeight: '700', color: '#374151' }]}>Chỉ số</Text>
                  <Text style={[styles.tableCol, { fontWeight: '700', color: '#374151' }]}>Kết quả</Text>
                  <Text style={[styles.tableCol, { fontWeight: '700', color: '#374151' }]}>Khoảng chuẩn</Text>
                </View>

                {[
                  { name: 'Bạch cầu (WBC)', result: '6.8 G/L', range: '4.0 - 10.0', ok: true },
                  { name: 'Hồng cầu (RBC)', result: '4.6 T/L', range: '3.8 - 5.5', ok: true },
                  { name: 'Đường huyết (Glucose)', result: '5.2 mmol/L', range: '3.9 - 6.4', ok: true },
                  { name: 'Men gan (ALT/GPT)', result: '28 U/L', range: '< 40 U/L', ok: true },
                  { name: 'Creatinine máu', result: '78 µmol/L', range: '62 - 106', ok: true },
                ].map((row, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCol, { flex: 2 }]}>{row.name}</Text>
                    <Text style={[styles.tableCol, row.ok && styles.normalVal]}>{row.result}</Text>
                    <Text style={styles.tableCol}>{row.range}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Phiếu siêu âm */}
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordCategory}>CHẨN ĐOÁN HÌNH ẢNH (CĐHA)</Text>
                  <Text style={styles.recordTitle}>Siêu Âm Màu Ổ Bụng Tổng Quát 4D</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>Đã có kết quả</Text>
                </View>
              </View>

              <Text style={styles.recordTime}>Thời gian thực hiện: 14/09/2026 10:15</Text>
              <Text style={styles.doctorSign}>Bác sĩ siêu âm: BS.CKI Lê Hoàng Minh</Text>

              <View style={styles.ultrasoundBox}>
                <Text style={styles.ultrasoundTitle}>Mô tả hình ảnh:</Text>
                <Text style={styles.ultrasoundDesc}>
                  - Gan: Kích thước trong giới hạn bình thường, nhu mô đều, không thấy tổn thương khu trú.{'\n'}
                  - Mật, Tụy, Lách, Thận: Cấu trúc giải phẫu bình thường, không thấy sỏi.{'\n'}
                  - Bàng quang: Thành mỏng, nước tiểu trong.
                </Text>
                <View style={styles.conclusionDivider} />
                <Text style={styles.conclusionText}>
                  👉 <Text style={{ fontWeight: '700' }}>KẾT LUẬN:</Text> Chưa thấy bất thường trên siêu âm ổ bụng tổng quát.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ───────────── TAB 2: ĐƠN THUỐC ĐIỆN TỬ ───────────── */}
        {!loading && activeTab === 'don_thuoc' && (
          <View style={{ gap: 14 }}>
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordCategory}>ĐƠN THUỐC NGOẠI TRÚ</Text>
                  <Text style={styles.recordTitle}>Mã đơn: DT-20260914-08</Text>
                </View>
                <TouchableOpacity style={styles.printBtn} onPress={handlePrintPrescription}>
                  <Ionicons name="print-outline" size={14} color="#2563EB" />
                  <Text style={styles.printBtnText}>Xuất đơn</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.recordTime}>
                Ngày kê đơn: 14/09/2026 • {latestRecord?.bacSiTen || 'BS.CKII Nguyễn Văn Dũng'}
              </Text>
              <Text style={styles.diagnosisICD}>
                Chẩn đoán:{' '}
                <Text style={{ fontWeight: '700', color: '#111827' }}>
                  {latestRecord?.chanDoanXacDinh || 'K29.7 - Viêm dạ dày thể nhẹ'}
                </Text>
              </Text>

              {/* Danh mục thuốc – list items đơn giản */}
              <View style={styles.medicineList}>
                {[
                  {
                    name: 'Esomeprazole 40mg (Nexium Mups)',
                    qty: 'Số lượng: 14 viên',
                    guide: 'Uống 1 viên vào buổi sáng trước ăn 30 phút',
                  },
                  {
                    name: 'Gaviscon Dual Action (Gói 10ml)',
                    qty: 'Số lượng: 20 gói',
                    guide: 'Uống 1 gói sau các bữa ăn và trước khi đi ngủ',
                  },
                  {
                    name: 'Phosphalugel (Gel chữ P)',
                    qty: 'Số lượng: 15 gói',
                    guide: 'Uống khi đau cồn cào hoặc khó chịu thượng vị',
                  },
                ].map((med, idx) => (
                  <View key={idx} style={styles.medItem}>
                    <View style={styles.medIndexBadge}>
                      <Text style={styles.medIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDosage}>{med.qty}</Text>
                      <Text style={styles.medGuide}>{med.guide}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Lời dặn bác sĩ */}
              <View style={styles.doctorNoteBox}>
                <View style={[styles.alertIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={14} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorNoteTitle}>Lời dặn bác sĩ điều trị:</Text>
                  <Text style={styles.doctorNoteText}>
                    Kiêng đồ chua, cay, rượu bia, cà phê. Ăn đúng bữa, không thức khuya sau 23h. Tái khám sau 2 tuần hoặc khi có dấu hiệu đau tăng.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ───────────── TAB 3: ĐỢT KHÁM & ICD-10 ───────────── */}
        {!loading && activeTab === 'lich_su' && (
          <View style={{ gap: 14 }}>
            {records.length > 0 ? (
              records.map((item, idx) => {
                const ba = item.benhAn || item.benhAnKham || item;
                const sh = item.sinhHieu;
                return (
                  <View key={item.id || idx} style={styles.card}>
                    <View style={styles.historyTop}>
                      <View style={styles.historyNumBadge}>
                        <Text style={styles.historyNumText}>#{records.length - idx}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyDate}>
                          Đợt khám: {new Date(ba.ngayKham || ba.taoLuc || Date.now()).toLocaleDateString('vi-VN')}
                        </Text>
                        <Text style={styles.historyDoctor}>
                          {item.bacSiTen || 'Bác sĩ điều trị'} • {ba.hinhThucKham === 'truc_tuyen' ? 'Telehealth' : 'Trực tiếp tại viện'}
                        </Text>
                      </View>
                      <View style={styles.badgeSuccess}>
                        <Text style={styles.badgeSuccessText}>Đã kết thúc</Text>
                      </View>
                    </View>

                    <View style={styles.icdBox}>
                      <Text style={styles.icdTitle}>CHẨN ĐOÁN XÁC ĐỊNH (ICD-10):</Text>
                      <Text style={styles.icdCode}>
                        {ba.chanDoanXacDinh || 'Khám nội khoa tổng quát'}
                      </Text>
                      {ba.trieuChung ? (
                        <Text style={styles.icdSub}>Triệu chứng lúc vào: {ba.trieuChung}</Text>
                      ) : null}
                    </View>

                    {sh ? (
                      <>
                        <Text style={styles.vitalHeader}>Sinh Hiệu Ghi Nhận Lúc Khám:</Text>
                        <View style={styles.vitalsRow}>
                          <View style={styles.vitalBox}>
                            <Text style={styles.vitalVal}>
                              {sh.huyetApTamThu ? `${sh.huyetApTamThu}/${sh.huyetApTamTruong}` : '120/80'}
                            </Text>
                            <Text style={styles.vitalLabel}>Huyết áp (mmHg)</Text>
                          </View>
                          <View style={styles.vitalBox}>
                            <Text style={styles.vitalVal}>{sh.nhipTim || 78}</Text>
                            <Text style={styles.vitalLabel}>Mạch (l/p)</Text>
                          </View>
                          <View style={styles.vitalBox}>
                            <Text style={styles.vitalVal}>{sh.nhietDoC ? `${sh.nhietDoC}°C` : '36.8°C'}</Text>
                            <Text style={styles.vitalLabel}>Nhiệt độ</Text>
                          </View>
                          <View style={styles.vitalBox}>
                            <Text style={styles.vitalVal}>{sh.spo2 ? `${sh.spo2}%` : '99%'}</Text>
                            <Text style={styles.vitalLabel}>SpO2</Text>
                          </View>
                        </View>
                      </>
                    ) : null}
                  </View>
                );
              })
            ) : (
              /* Fallback card */
              <View style={styles.card}>
                <View style={styles.historyTop}>
                  <View style={styles.historyNumBadge}>
                    <Text style={styles.historyNumText}>#1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>Đợt khám ngày: 14/09/2026</Text>
                    <Text style={styles.historyDoctor}>BS.CKII Nguyễn Văn Dũng • Phòng 102</Text>
                  </View>
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>Đã kết thúc</Text>
                  </View>
                </View>

                <View style={styles.icdBox}>
                  <Text style={styles.icdTitle}>MÃ BỆNH ICD-10 QUỐC TẾ:</Text>
                  <Text style={styles.icdCode}>K29.7 - Viêm dạ dày không đặc hiệu</Text>
                  <Text style={styles.icdSub}>Kèm theo: R10.1 - Đau khu trú tại thượng vị</Text>
                </View>

                <Text style={styles.vitalHeader}>Sinh Hiệu Ghi Nhận Lúc Khám:</Text>
                <View style={styles.vitalsRow}>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalVal}>120/80</Text>
                    <Text style={styles.vitalLabel}>Huyết áp (mmHg)</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalVal}>78</Text>
                    <Text style={styles.vitalLabel}>Mạch (lần/phút)</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalVal}>36.8°C</Text>
                    <Text style={styles.vitalLabel}>Nhiệt độ</Text>
                  </View>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalVal}>99%</Text>
                    <Text style={styles.vitalLabel}>SpO2</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Tab Bar – 3 nút solid/outline
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tabBtnText: {
    fontSize: 11,
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
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  // Medical Alert Card
  medicalAlertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  alertVal: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  alertDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  recordCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.4,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  badgeSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccessText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  recordTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  doctorSign: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },

  // Vitals Table – rows xen kẽ
  vitalsTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 12,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCol: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  normalVal: {
    fontWeight: '700',
    color: '#16A34A',
  },

  // Ultrasound
  ultrasoundBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ultrasoundTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ultrasoundDesc: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
  },
  conclusionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  conclusionText: {
    fontSize: 12,
    color: '#111827',
  },

  // Print button
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  printBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  diagnosisICD: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },

  // Medicine list
  medicineList: {
    marginTop: 12,
    gap: 8,
  },
  medItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  medIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  medDosage: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  medGuide: {
    fontSize: 11,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Doctor note
  doctorNoteBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  doctorNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  doctorNoteText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },

  // History tab
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  historyNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  historyDoctor: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  icdBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 8,
  },
  icdTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
  icdCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  icdSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  vitalHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 6,
  },
  vitalsRow: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  vitalBox: {
    flex: 1,
    alignItems: 'center',
  },
  vitalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  vitalLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
});
