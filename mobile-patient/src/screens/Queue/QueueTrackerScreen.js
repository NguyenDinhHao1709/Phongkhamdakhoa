import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import useQueueStore from '../../store/queueStore';
import useAuthStore from '../../store/authStore';

export default function QueueTrackerScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const { activeTicket, routingSteps, updateStepStatus } = useQueueStore();
  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'dynamic_routing'
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ticket, setTicket] = useState({
    soThuTu: activeTicket?.soThuTu || 'A-104',
    phongKham: activeTicket?.phongKham || 'Phòng 102 - Nội Tổng Quát',
    bacSi: activeTicket?.bacSi || 'BS.CKII Nguyễn Văn Dũng',
    thoiGianCap: activeTicket?.thoiGianCap || '15/09/2026 • 08:15',
    soNguoiTruoc: activeTicket?.soNguoiTruoc || 2,
    uocTinhPhut: activeTicket?.uocTinhPhut || 12,
    soDangGoi: 'A-102',
    maVe: 'PK-20260915-104-BN',
  });

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedTicket = window.localStorage.getItem('kiosk_last_ticket');
        if (savedTicket) {
          const parsed = JSON.parse(savedTicket);
          setTicket((prev) => ({
            ...prev,
            soThuTu: parsed.soThuTu || prev.soThuTu,
            phongKham: parsed.phongKham || prev.phongKham,
            bacSi: parsed.bacSi || prev.bacSi,
            thoiGianCap: parsed.gioIn || prev.thoiGianCap,
          }));
        }
      }
    } catch (e) {
      console.warn('Cannot sync kiosk ticket:', e);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      const msg = 'Đã làm mới dữ liệu hàng đợi trực ca mới nhất từ máy chủ phòng khám!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Đã cập nhật', msg);
    }, 400);
  };

  const handleNewTicket = () => {
    const confirmMsg = 'LẤY SỐ THỨ TỰ TỰ ĐỘNG (KIOSK ĐIỆN TỬ)\n\nBạn muốn cấp số thứ tự khám trực ca mới tại Kiosk hôm nay?\nSố hiện tại sẽ được thay thế bằng lượt mới.';
    let isConfirmed = false;
    if (Platform.OS === 'web') {
      isConfirmed = window.confirm(confirmMsg);
    } else {
      isConfirmed = true;
    }

    if (isConfirmed) {
      const msg = 'Đã cấp số thứ tự mới thành công!\nSố mới của bạn là: A-108 tại Phòng 102 - Nội Tổng Quát.\nVui lòng chú ý bảng điện tử và thông báo âm thanh.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Thành công', msg);
    }
  };

  const handleSimulateAiOptimize = () => {
    const msg = 'THUẬT TOÁN DYNAMIC QUEUE ROUTING (AI)\n\n• Hệ thống phát hiện: Phòng Xét nghiệm máu (P.201) hiện đang có 5 bệnh nhân chờ (~35 phút).\n• Quyết định điều phối tối ưu: Điều chuyển bạn sang Phòng 205 (Siêu âm màu 4D) trước vì hiện chỉ có 1 người chờ (~6 phút)!\n\n⚡ Tổng thời gian tiết kiệm dự kiến: 18 - 25 phút.';
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Dynamic Queue AI', msg);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Tab Bar – 2 nút solid/outline */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ticket' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ticket')}
        >
          <Ionicons
            name="ticket"
            size={15}
            color={activeTab === 'ticket' ? '#FFFFFF' : '#6B7280'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'ticket' && styles.tabBtnTextActive]}>
            Phiếu Khám STT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'dynamic_routing' && styles.tabBtnActive]}
          onPress={() => setActiveTab('dynamic_routing')}
        >
          <Ionicons
            name="git-network-outline"
            size={15}
            color={activeTab === 'dynamic_routing' ? '#FFFFFF' : '#6B7280'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'dynamic_routing' && styles.tabBtnTextActive]}>
            Lộ Trình Dynamic AI
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Hàng Đợi & Tiến Độ Khám</Text>
            <Text style={styles.headerSubtitle}>
              Thuật toán điều phối động Dynamic Queue Routing AI
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={17} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {activeTab === 'ticket' ? (
          /* ───────────── TAB 1: PHIẾU KHÁM STT ĐIỆN TỬ ───────────── */
          <View>
            {/* E-Ticket Card – trắng, border xanh nhạt, số STT to màu xanh */}
            <View style={styles.ticketCard}>
              <View style={styles.ticketTop}>
                <View>
                  <Text style={styles.ticketClinicName}>PHÒNG KHÁM ĐA KHOA</Text>
                  <Text style={styles.ticketDate}>Phiếu khám ngày: 15/09/2026 • 08:15</Text>
                </View>
                <View style={styles.liveTag}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveTagText}>TRỰC CA</Text>
                </View>
              </View>

              {/* STT lớn – xanh trên nền trắng */}
              <View style={styles.ticketCenter}>
                <Text style={styles.ticketSttLabel}>SỐ THỨ TỰ CỦA BẠN</Text>
                <Text style={styles.ticketSttNumber}>{ticket.soThuTu}</Text>
                <Text style={styles.ticketRoom}>{ticket.phongKham}</Text>
                <Text style={styles.ticketDoctor}>Bác sĩ phụ trách: {ticket.bacSi}</Text>
              </View>

              {/* QR Code row */}
              <View style={styles.barcodeBox}>
                <View style={styles.mockQrCode}>
                  <Ionicons name="qr-code" size={28} color="#374151" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.qrCodeLabel}>MÃ VÉ KHÁM ĐIỆN TỬ</Text>
                  <Text style={styles.qrCodeValue}>{ticket.maVe}</Text>
                  <Text style={styles.qrCodeHint}>Quét mã tại Kiosk hoặc cửa phòng khám</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{ticket.soNguoiTruoc}</Text>
                  <Text style={styles.statLabel}>Người chờ trước</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>~{ticket.uocTinhPhut} ph</Text>
                  <Text style={styles.statLabel}>Ước tính đến lượt</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: '#16A34A' }]}>{ticket.soDangGoi}</Text>
                  <Text style={styles.statLabel}>Số đang gọi</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={handleNewTicket}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="add-circle-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.actionCardTitle}>Lấy STT Mới</Text>
                <Text style={styles.actionCardDesc}>Cấp phiếu khám Kiosk</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('dynamic_routing')}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="map-outline" size={22} color="#2563EB" />
                </View>
                <Text style={styles.actionCardTitle}>Xem Lộ Trình AI</Text>
                <Text style={styles.actionCardDesc}>Tiết kiệm 18 phút</Text>
              </TouchableOpacity>
            </View>

            {/* Notification Toggle */}
            <View style={styles.notifyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifyTitle}>Chuông & Rung Cảnh Báo Khi Đến Lượt</Text>
                <Text style={styles.notifyDesc}>
                  Hệ thống sẽ phát chuông báo và rung khi còn 1 người phía trước
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, notifyEnabled && styles.toggleBtnActive]}
                onPress={() => setNotifyEnabled(!notifyEnabled)}
              >
                <Ionicons
                  name={notifyEnabled ? 'notifications' : 'notifications-off'}
                  size={17}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ───────────── TAB 2: LỘ TRÌNH DYNAMIC QUEUE ROUTING AI ───────────── */
          <View>
            {/* AI Banner – card trắng border xanh */}
            <View style={styles.aiOptimizationCard}>
              <View style={styles.aiTopRow}>
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={13} color="#2563EB" />
                  <Text style={styles.aiBadgeText}>DYNAMIC QUEUE AI OPTIMIZATION</Text>
                </View>
                <TouchableOpacity onPress={handleSimulateAiOptimize}>
                  <Text style={styles.aiDetailLink}>Chi tiết →</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.aiSavingText}>
                ⚡ Tiết kiệm dự kiến:{' '}
                <Text style={{ fontWeight: '700', color: '#16A34A' }}>18 - 25 phút</Text>
              </Text>
              <Text style={styles.aiExplainText}>
                Hệ thống nhận thấy Phòng Xét Nghiệm Máu (P.201) hiện có 5 người chờ. Lộ trình tự động điều chuyển bạn sang Phòng Siêu Âm 205 trước (chỉ 1 người chờ) để tối ưu thời gian!
              </Text>
            </View>

            {/* Timeline stepper dọc */}
            <Text style={styles.timelineSectionTitle}>Tiến Trình 4 Chặng Điều Phối Thực Tế</Text>
            <View style={styles.timelineContainer}>

              {/* Chặng 1 – đang tới lượt */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftCol}>
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.stepLine} />
                </View>
                <View style={styles.stepContentCard}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepRoom}>Phòng 102 - Khám Lâm Sàng Nội</Text>
                    <View style={styles.badgeCalling}>
                      <Text style={styles.badgeCallingText}>Đang tới lượt</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDoctor}>BS.CKII Nguyễn Văn Dũng</Text>
                  <Text style={styles.stepMeta}>📍 Tầng 1 - Dãy khám lâm sàng • Còn 2 lượt</Text>
                </View>
              </View>

              {/* Chặng 2 – ưu tiên */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftCol}>
                  <View style={[styles.stepCircle, styles.stepCirclePriority]}>
                    <Text style={styles.stepNum}>2</Text>
                  </View>
                  <View style={styles.stepLine} />
                </View>
                <View style={[styles.stepContentCard, styles.stepCardPriority]}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepRoom}>Phòng 205 - Siêu Âm Màu 4D</Text>
                    <View style={styles.badgePriority}>
                      <Text style={styles.badgePriorityText}>Ưu tiên trước</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDoctor}>BS.CKI Lê Hoàng Minh</Text>
                  <Text style={styles.stepMeta}>📍 Tầng 2 - Chỉ 1 người chờ (~6 phút)</Text>
                </View>
              </View>

              {/* Chặng 3 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftCol}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumGray}>3</Text>
                  </View>
                  <View style={styles.stepLine} />
                </View>
                <View style={styles.stepContentCard}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepRoom}>Phòng 201 - Trung Tâm Xét Nghiệm</Text>
                    <View style={styles.badgeWaiting}>
                      <Text style={styles.badgeWaitingText}>Chặng tiếp theo</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDoctor}>Lấy mẫu máu & Nước tiểu 10 thông số</Text>
                  <Text style={styles.stepMeta}>📍 Tầng 2 - Khu Cận Lâm Sàng</Text>
                </View>
              </View>

              {/* Chặng 4 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeftCol}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumGray}>4</Text>
                  </View>
                </View>
                <View style={styles.stepContentCard}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepRoom}>Phòng 102 - Bác Sĩ Kết Luận & Kê Đơn</Text>
                    <View style={styles.badgeWaiting}>
                      <Text style={styles.badgeWaitingText}>Chặng cuối</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDoctor}>Đọc kết quả CLS & Kê đơn thuốc điện tử</Text>
                  <Text style={styles.stepMeta}>📍 Tầng 1 - Hoàn tất đợt khám</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.simulateAiBtn} onPress={handleSimulateAiOptimize}>
              <Ionicons name="refresh-circle" size={19} color="#FFFFFF" />
              <Text style={styles.simulateAiBtnText}>Mô Phỏng Tối Ưu Lại Lộ Trình (AI)</Text>
            </TouchableOpacity>
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

  // Tab Bar
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

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ticket Card – trắng border xanh nhạt
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 14,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  ticketClinicName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  ticketDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },

  // STT Center – số to màu xanh trên nền trắng
  ticketCenter: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ticketSttLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  ticketSttNumber: {
    fontSize: 52,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    marginVertical: 4,
  },
  ticketRoom: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  ticketDoctor: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Barcode row
  barcodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginVertical: 10,
  },
  mockQrCode: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  qrCodeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  qrCodeHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#BFDBFE',
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  actionCardDesc: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Notify Card
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 12,
  },
  notifyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  notifyDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  toggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#16A34A',
  },

  // AI Optimization Card – trắng border xanh
  aiOptimizationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  aiDetailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  aiSavingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  aiExplainText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Timeline / Stepper dọc
  timelineSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepCirclePriority: {
    backgroundColor: '#16A34A',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepNumGray: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  stepContentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginLeft: 10,
    marginBottom: 6,
  },
  stepCardPriority: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  stepRoom: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  stepDoctor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 3,
  },
  stepMeta: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },
  badgeCalling: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeCallingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  badgePriority: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgePriorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  badgeWaiting: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeWaitingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Simulate button – xanh solid
  simulateAiBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  simulateAiBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
