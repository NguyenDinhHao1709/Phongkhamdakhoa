import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import {
  apiPatientChat,
  apiPatientSummary,
  apiResetPatientSession,
} from '../../api/apiClient';

const QUICK_PROMPTS = [
  'Đau đầu chóng mặt kéo dài',
  'Đau thượng vị sau ăn 2 tuần',
  'Sốt cao trên 38.5 độ ở trẻ em',
  'Chế độ ăn cho người tiểu đường',
];

export default function AiDoctorChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ Lý Y Tế AI của Phòng Khám Đa Khoa. Bạn đang có dấu hiệu khó chịu hoặc triệu chứng gì cần được phân tích và định hướng chuyên khoa phù hợp trước khi gặp bác sĩ?',
      time: '08:00',
      suggestedSpecialty: null,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session_${Math.random().toString(36).slice(2, 10)}`);
  const [patientSummary, setPatientSummary] = useState(null);
  const scrollViewRef = useRef();

  React.useEffect(() => {
    apiPatientSummary()
      .then((res) => setPatientSummary(res?.data || res))
      .catch((err) => console.warn('Lỗi tải tóm tắt hồ sơ AI:', err));
  }, []);

  const handleSendPrompt = (promptText) => {
    setInputMessage(promptText);
    sendMessage(promptText);
  };

  const sendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await apiPatientChat(sessionId, query);
      const replyText = res?.data?.reply || res?.reply;
      
      let finalReply = replyText;
      let specialty = null;

      if (!finalReply) {
        if (query.toLowerCase().includes('đầu') || query.toLowerCase().includes('chóng mặt')) {
          specialty = 'Nội Tổng Quát';
          finalReply = `🩺 **Phân Tích Triệu Chứng:**\nTriệu chứng đau đầu kèm chóng mặt kéo dài có thể liên quan đến thiếu máu não, rối loạn tiền đình hoặc biến động huyết áp.\n\n👉 **Khuyến Nghị Chuyên Khoa:**\nBạn nên đặt lịch khám tại **Khoa Nội Tổng Quát** hoặc **Khoa Tim Mạch**.\n\n⚠️ **Chuẩn Bị:**\nĐo huyết áp tại nhà nếu có máy, ghi lại tần suất cơn chóng mặt. Tránh lái xe khi đang choáng váng.`;
        } else if (query.toLowerCase().includes('thượng vị') || query.toLowerCase().includes('dạ dày') || query.toLowerCase().includes('ăn')) {
          specialty = 'Nội Tổng Quát';
          finalReply = `🩺 **Phân Tích Triệu Chứng:**\nĐau thượng vị sau ăn kéo dài 2 tuần là dấu hiệu điển hình của viêm loét dạ dày tá tràng hoặc trào ngược thực quản (GERD).\n\n👉 **Khuyến Nghị Chuyên Khoa:**\nNên đăng ký khám tại **Khoa Nội Tiêu Hóa / Nội Tổng Quát** để được bác sĩ nội soi dạ dày hoặc test vi khuẩn HP.\n\n⚠️ **Lưu Ý Quan Trọng:**\nNhịn ăn sáng tối thiểu 6 - 8 tiếng trước khi đi khám để sẵn sàng nội soi hoặc xét nghiệm máu nếu cần.`;
        } else if (query.toLowerCase().includes('sốt') || query.toLowerCase().includes('trẻ')) {
          specialty = 'Nhi Khoa';
          finalReply = `🩺 **Phân Tích Triệu Chứng:**\nTrẻ sốt cao trên 38.5 độ C cần theo dõi sát sao nguy cơ co giật do sốt, sốt xuất huyết hoặc nhiễm trùng đường hô hấp.\n\n👉 **Khuyến Nghị Chuyên Khoa:**\nNên đưa bé đến ngay **Khoa Nhi** của phòng khám để được bác sĩ thăm khám và xét nghiệm công thức máu.\n\n⚠️ **Xử Trí Ban Đầu:**\nLau mát bằng nước ấm ở nách, bẹn; cho bé uống nhiều nước hoặc Oresol; uống hạ sốt Paracetamol đúng liều 10-15mg/kg nếu sốt > 38.5°C.`;
        } else {
          specialty = 'Nội Tổng Quát';
          finalReply = `🩺 **Phân Tích Triệu Chứng:**\nDựa trên các thông tin bạn cung cấp, hệ thống ghi nhận tình trạng sức khỏe cần được bác sĩ chuyên khoa thăm khám lâm sàng.\n\n👉 **Khuyến Nghị:**\nNên đặt lịch khám tại **Khoa Nội Tổng Quát** để được kiểm tra toàn diện, đo chỉ số sinh hiệu và làm các xét nghiệm cận lâm sàng cần thiết.`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: finalReply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestedSpecialty: specialty,
        },
      ]);
    } catch (err) {
      console.warn('AI Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Dựa trên triệu chứng bạn chia sẻ, hệ thống khuyến nghị bạn nên khám tại **Khoa Nội Tổng Quát** để được kiểm tra kỹ lưỡng và chỉ định xét nghiệm phù hợp.`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestedSpecialty: 'Nội Tổng Quát',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleReset = async () => {
    const oldSessionId = sessionId;
    const newSessionId = `session_${Math.random().toString(36).slice(2, 10)}`;
    setSessionId(newSessionId);
    try {
      await apiResetPatientSession(oldSessionId);
    } catch (err) {
      console.warn('Lỗi làm mới phiên AI:', err);
    }
    setMessages([{
      id: Date.now(),
      sender: 'ai',
      text: 'Cuộc trò chuyện đã được làm mới. Tôi sẵn sàng hỗ trợ các câu hỏi về bệnh án, đơn thuốc và chăm sóc sức khỏe của bạn!',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header – trắng, icon xanh */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatar}>
              <Ionicons name="chatbubble-ellipses" size={19} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Bác Sĩ Trợ Lý Y Tế AI</Text>
              <View style={styles.onlineRow}>
                <View style={styles.greenDot} />
                <Text style={styles.onlineText}>Trực tuyến 24/7 • Sàng lọc Triage</Text>
              </View>
              {patientSummary?.chanDoanGanNhat ? (
                <Text style={styles.summaryText} numberOfLines={1}>
                  Chẩn đoán gần nhất: {patientSummary.chanDoanGanNhat}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={13} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookShortcutBtn}
              onPress={() => navigation.navigate('Booking')}
            >
              <Ionicons name="calendar-outline" size={13} color="#2563EB" />
              <Text style={styles.bookShortcutText}>Đặt lịch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Suggestion Pills */}
        <View style={styles.quickPromptContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.promptChip}
                onPress={() => handleSendPrompt(prompt)}
              >
                <Text style={styles.promptChipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Message Stream */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => {
            const isUser = item.sender === 'user';
            return (
              <View
                key={item.id}
                style={[
                  styles.msgContainer,
                  isUser ? styles.msgContainerUser : styles.msgContainerAi,
                ]}
              >
                {/* AI avatar */}
                {!isUser && (
                  <View style={styles.aiMsgAvatar}>
                    <Ionicons name="pulse" size={13} color="#2563EB" />
                  </View>
                )}

                {/* Bubble */}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAi]}>
                    {item.text}
                  </Text>

                  {/* CTA đặt lịch khi AI gợi ý chuyên khoa */}
                  {item.suggestedSpecialty && (
                    <TouchableOpacity
                      style={styles.aiBookingCta}
                      onPress={() => navigation.navigate('Booking')}
                    >
                      <Ionicons name="calendar" size={14} color="#FFFFFF" />
                      <Text style={styles.aiBookingCtaText}>
                        Đặt Khám {item.suggestedSpecialty} Ngay
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeAi]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Loading indicator */}
          {loading && (
            <View style={[styles.msgContainer, styles.msgContainerAi]}>
              <View style={styles.aiMsgAvatar}>
                <Ionicons name="pulse" size={13} color="#2563EB" />
              </View>
              <View style={[styles.bubble, styles.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>AI đang phân tích triệu chứng y khoa...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar – border gray-300, send button xanh solid */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Mô tả triệu chứng khó chịu của bạn..."
            placeholderTextColor="#9CA3AF"
            value={inputMessage}
            onChangeText={setInputMessage}
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputMessage.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputMessage.trim() || loading}
          >
            <Ionicons name="send" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header – trắng, icon xanh
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  summaryText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    maxWidth: 220,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  onlineText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
  },
  bookShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bookShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Quick prompts
  quickPromptContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  promptChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promptChipText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },

  // Messages
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  msgContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  msgContainerUser: {
    justifyContent: 'flex-end',
  },
  msgContainerAi: {
    justifyContent: 'flex-start',
  },
  aiMsgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },

  // User bubble – xanh solid, borderRadius phải
  bubbleUser: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },

  // AI bubble – trắng, border gray-200, borderRadius trái
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },

  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextUser: {
    color: '#FFFFFF',
  },
  msgTextAi: {
    color: '#374151',
  },

  // Booking CTA in AI bubble
  aiBookingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
    alignSelf: 'flex-start',
  },
  aiBookingCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  timeText: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeAi: {
    color: '#9CA3AF',
  },
  loadingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Input Bar – border gray-300, send xanh solid
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
