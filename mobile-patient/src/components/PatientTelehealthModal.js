import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export default function PatientTelehealthModal({ visible, appointment, onClose }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const channelRef = useRef(null);
  const [status, setStatus] = useState('Đang khởi tạo phòng khám...');
  const [error, setError] = useState('');
  const roomId = appointment?.maLichHen || appointment?.id;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || !roomId) return undefined;

    let mounted = true;
    const sendSignal = (signal) => {
      const payload = { ...signal, senderRole: 'patient', roomId };
      channelRef.current?.postMessage(payload);
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:signal', { roomId, signal: payload, role: 'patient' });
      }
    };

    const handleSignal = async (data) => {
      if (!data || data.senderRole === 'patient' || !peerRef.current) return;
      const pc = peerRef.current;
      try {
        if (data.type === 'peer_joined') {
          setStatus('Đã kết nối bác sĩ, đang chờ tín hiệu video...');
        } else if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', sdp: pc.localDescription });
        } else if (data.type === 'candidate' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else if (data.type === 'peer_left') {
          setStatus('Bác sĩ đã rời phòng khám.');
        }
      } catch (signalError) {
        console.error('Telehealth signaling error:', signalError);
        setError('Không thể thiết lập kết nối với bác sĩ.');
      }
    };

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
        });
        peerRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('Đã kết nối với bác sĩ.');
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) sendSignal({ type: 'candidate', candidate: event.candidate });
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setStatus('Đã kết nối với bác sĩ.');
          if (['failed', 'disconnected'].includes(pc.connectionState)) setStatus('Kết nối bị gián đoạn.');
        };

        const channel = new BroadcastChannel(`telehealth_${roomId}`);
        channelRef.current = channel;
        channel.onmessage = (event) => handleSignal(event.data);

        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        socket.emit('call:join', {
          roomId,
          role: 'patient',
          userName: appointment?.bacSi || 'Bệnh nhân',
        });
        socket.on('call:signal', (data) => handleSignal(data.signal));
        socket.on('call:peer_joined', () => setStatus('Đã vào phòng, đang chờ bác sĩ...'));
        socket.on('call:peer_left', () => setStatus('Bác sĩ đã rời phòng khám.'));
        sendSignal({ type: 'peer_joined' });
        setStatus('Đã vào phòng khám, đang chờ bác sĩ...');
      } catch (startError) {
        console.error('Telehealth start error:', startError);
        setError('Không thể mở camera/micro. Hãy cấp quyền trình duyệt rồi thử lại.');
      }
    };

    startCall();
    return () => {
      mounted = false;
      channelRef.current?.postMessage({ type: 'peer_left', senderRole: 'patient', roomId });
      channelRef.current?.close();
      channelRef.current = null;
      socketRef.current?.emit('call:leave', { roomId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      peerRef.current?.close();
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setError('');
      setStatus('Đang khởi tạo phòng khám...');
    };
  }, [visible, roomId]);

  const video = (ref, muted) => (
    React.createElement('video', {
      ref,
      autoPlay: true,
      playsInline: true,
      muted,
      style: styles.video,
    })
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Phòng khám Telehealth</Text>
              <Text style={styles.subtitle}>{appointment?.maLichHen || 'Cuộc hẹn trực tuyến'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.videoGrid}>
            <View style={styles.videoBox}>
              {video(remoteVideoRef, false)}
              <Text style={styles.label}>Bác sĩ</Text>
            </View>
            <View style={styles.videoBox}>
              {video(localVideoRef, true)}
              <Text style={styles.label}>Bạn</Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.status}>{status}</Text>}
          {!error && !streamRef.current && <ActivityIndicator color="#2563EB" />}
          <Text style={styles.notice}>Phòng sử dụng cùng mã lịch hẹn với giao diện bác sĩ.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 16 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 3 },
  closeButton: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  closeText: { color: '#B91C1C', fontWeight: '700' },
  videoGrid: { flexDirection: 'row', gap: 10, minHeight: 260 },
  videoBox: { flex: 1, backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden', minHeight: 220, position: 'relative' },
  video: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#111827' },
  label: { position: 'absolute', bottom: 8, left: 8, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  status: { textAlign: 'center', color: '#1D4ED8', fontWeight: '600', marginTop: 14 },
  error: { textAlign: 'center', color: '#B91C1C', fontWeight: '600', marginTop: 14 },
  notice: { textAlign: 'center', color: '#6B7280', fontSize: 12, marginTop: 10 },
});
