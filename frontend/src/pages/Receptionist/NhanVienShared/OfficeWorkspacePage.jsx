import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../../../store/authStore';
import useThemeStore from '../../../store/themeStore';
import api, { apiGet, apiPost, apiPatch, apiDelete } from '../../../services/api';
import { toAttachmentUrl } from '../../../utils/fileAttachments';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Pin,
  Reply,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  CheckCheck,
  UserPlus,
  Building2,
  Stethoscope,
  FileText,
  Download,
  X,
  AtSign,
  Sparkles,
  Lock,
  Info,
  Sun,
  Moon,
  FolderOpen,
  Bell,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  LogOut,
  Link2,
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const RECALL_LIMIT_MINUTES = 15;

function canRecallByTime(dateStr) {
  if (!dateStr) return false;
  const sentTime = new Date(dateStr).getTime();
  if (isNaN(sentTime)) return false;
  return Date.now() - sentTime <= RECALL_LIMIT_MINUTES * 60 * 1000;
}
const EMOJI_PALETTE = [
  '😀', '😄', '😊', '🥳', '😎', '🤩', '🫡', '🤝',
  '👍', '👏', '🙌', '💪', '❤️', '🔥', '💯', '✅',
  '🩺', '💊', '💉', '🧪', '🚑', '🏥', '📋', '📢',
  '😂', '🤣', '😅', '😮', '😢', '🙏', '🎉', '⭐',
];

const ROLE_BADGE_MAP = {
  ban_giam_doc: {
    label: 'Ban Giám Đốc',
    dark: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    light: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  quan_tri_vien_cap_cao: {
    label: 'Admin Cấp Cao',
    dark: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    light: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  quan_tri_vien: {
    label: 'Quản Trị Viên',
    dark: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    light: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  bac_si: {
    label: 'Bác Sĩ',
    dark: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    light: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  ky_thuat_vien: {
    label: 'KTV Xét Nghiệm',
    dark: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    light: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  nhan_vien_nha_thuoc: {
    label: 'Dược Sĩ',
    dark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    light: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  thu_ngan: {
    label: 'Thu Ngân',
    dark: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    light: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  tiep_tan: {
    label: 'Tiếp Tân',
    dark: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    light: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
};

function formatTimeShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hh}:${mm}`;
}

function formatFileSize(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function getInitials(name) {
  if (!name) return 'NV';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarGradient(id) {
  return AVATAR_COLORS[Number(id || 0) % AVATAR_COLORS.length];
}

export default function OfficeWorkspacePage() {
  const { user } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();

  // Navigation & Tabs
  const [leftNav, setLeftNav] = useState('chat'); // 'chat' | 'directory' | 'org' | 'files'
  const [convFilter, setConvFilter] = useState('all'); // 'all' | 'group' | 'direct' | 'unread'
  const [chatSubTab, setChatSubTab] = useState('messages'); // 'messages' | 'pinned' | 'images' | 'files' | 'patients'
  const [showRightInfo, setShowRightInfo] = useState(false);

  // Workspace Data
  const [loadingInit, setLoadingInit] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [stickers, setStickers] = useState([]);

  // Active Room & Messages
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const sharedImages = useMemo(
    () => roomMessages.filter((m) => m.loai === 'hinh_anh' && !m.daThuHoi),
    [roomMessages],
  );
  const sharedFiles = useMemo(
    () => roomMessages.filter((m) => m.loai === 'tep_tin' && !m.daThuHoi),
    [roomMessages],
  );
  const sharedLinks = useMemo(() => {
    const links = [];
    const seen = new Set();
    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const m = roomMessages[i];
      if (m.daThuHoi || !m.noiDung) continue;
      const matches = String(m.noiDung).match(/https?:\/\/[^\s]+/gi) || [];
      for (const rawUrl of matches) {
        const cleanUrl = rawUrl.replace(/[.,;!?)]+$/, '');
        if (seen.has(cleanUrl)) continue;
        seen.add(cleanUrl);
        let hostname = cleanUrl;
        try {
          hostname = new URL(cleanUrl).hostname.replace(/^www\./i, '');
        } catch {
          hostname = cleanUrl.replace(/^https?:\/\//i, '').split('/')[0];
        }
        links.push({
          id: `${m.id}_${cleanUrl}`,
          url: cleanUrl,
          hostname,
          sender: m.nguoiGui?.hoTen || 'Đồng nghiệp',
          taoLuc: m.taoLuc,
        });
      }
    }
    return links;
  }, [roomMessages]);

  // Search
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Composer State
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showStickerPopover, setShowStickerPopover] = useState(false);
  const [stickerTab, setStickerTab] = useState('stickers'); // 'stickers' | 'emojis'
  const [uploadingFile, setUploadingFile] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState([]);

  const [lightboxImage, setLightboxImage] = useState(null);
  const [infoSections, setInfoSections] = useState({
    members: true,
    images: true,
    files: true,
    links: true,
  });
  const [showAllLinksInDrawer, setShowAllLinksInDrawer] = useState(false);
  const [confirmRoomAction, setConfirmRoomAction] = useState(null); // { type: 'delete_chat' | 'leave_group' }
  const [processingRoomAction, setProcessingRoomAction] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const selectedRoomIdRef = useRef(null);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // 1. Load Workspace Init
  const fetchWorkspaceInit = async (keepSelection = true) => {
    try {
      const res = await apiGet('/office/init');
      const data = res?.data || res;
      if (data) {
        setCurrentUserProfile(data.currentUser || null);
        setStaffDirectory(data.staffDirectory || []);
        setRooms(data.rooms || []);
        setStickers(data.stickers || []);

        if ((!keepSelection || !selectedRoomIdRef.current) && data.rooms?.length > 0) {
          setSelectedRoomId(data.rooms[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Office:', err);
    } finally {
      setLoadingInit(false);
    }
  };

  // 2. Load Room Messages
  const fetchRoomMessages = async (roomId) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const res = await apiGet(`/office/rooms/${roomId}/messages`);
      const data = res?.data || res;
      if (data) {
        const uniqueMsgs = [];
        const seenIds = new Set();
        for (const m of data.messages || []) {
          if (!seenIds.has(Number(m.id))) {
            seenIds.add(Number(m.id));
            uniqueMsgs.push(m);
          }
        }
        setRoomMessages(uniqueMsgs);
        setPinnedMessages(data.pinnedMessages || []);
      }
      // Clear unread count locally
      setRooms((prev) =>
        prev.map((r) => (r.id === Number(roomId) ? { ...r, unreadCount: 0 } : r)),
      );
    } catch (err) {
      console.error('Lỗi tải tin nhắn phòng:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceInit(false);
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      setChatSubTab('messages');
      setReplyTarget(null);
      fetchRoomMessages(selectedRoomId);
      if (socketRef.current) {
        socketRef.current.emit('office:join_room', { roomId: selectedRoomId });
      }
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (chatSubTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages.length, selectedRoomId, chatSubTab]);

  // 3. Connect Realtime Socket to Office Microservice (:5003)
  useEffect(() => {
    if (!user?.id) return;

    const socketHost = `${window.location.protocol === 'https:' ? 'http:' : window.location.protocol}//${window.location.hostname}:5003`;
    const socket = io(socketHost, {
      transports: ['websocket', 'polling'],
      query: { userId: user.id },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('office:register', {
        userId: user.id,
        roomIds: rooms.map((r) => r.id),
      });
      if (selectedRoomIdRef.current) {
        socket.emit('office:join_room', { roomId: selectedRoomIdRef.current });
      }
    });

    socket.on('office:presence', (payload) => {
      if (Array.isArray(payload?.onlineUserIds)) {
        const onlineSet = new Set(payload.onlineUserIds.map(Number));
        setStaffDirectory((prev) =>
          prev.map((s) => ({ ...s, online: onlineSet.has(Number(s.id)) })),
        );
      }
    });

    socket.on('office:new_message', (msg) => {
      if (Number(msg.phongChatId) === Number(selectedRoomIdRef.current)) {
        setRoomMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(msg.id))) return prev;
          return [...prev, msg];
        });
        if (Number(msg.nguoiGuiId) !== Number(user.id)) {
          apiPost(`/office/rooms/${msg.phongChatId}/read`, {}).catch(() => {});
        }
      }
    });

    socket.on('office:new_message_notification', (msg) => {
      setRooms((prev) => {
        const updated = prev.map((r) => {
          if (Number(r.id) !== Number(msg.phongChatId)) return r;
          const isCurrent = Number(r.id) === Number(selectedRoomIdRef.current);
          const isMe = Number(msg.nguoiGuiId) === Number(user.id);
          return {
            ...r,
            unreadCount: isCurrent || isMe ? 0 : (r.unreadCount || 0) + 1,
            lastMessage: {
              id: msg.id,
              nguoiGuiId: msg.nguoiGuiId,
              tenNguoiGui: msg.nguoiGui?.hoTen || 'Đồng nghiệp',
              loai: msg.loai,
              noiDung:
                msg.loai === 'hinh_anh'
                  ? '[Hình ảnh]'
                  : msg.loai === 'tep_tin'
                  ? '[Tệp đính kèm]'
                  : msg.loai === 'nhan_dan'
                  ? `[Nhãn dán] ${msg.noiDung || ''}`
                  : msg.noiDung,
              taoLuc: msg.taoLuc,
            },
            capNhatLuc: msg.taoLuc,
          };
        });
        return [...updated].sort(
          (a, b) => new Date(b.capNhatLuc || 0).getTime() - new Date(a.capNhatLuc || 0).getTime(),
        );
      });
    });

    socket.on('office:reaction', ({ roomId, messageId, reactions }) => {
      if (Number(roomId) === Number(selectedRoomIdRef.current)) {
        setRoomMessages((prev) =>
          prev.map((m) => (Number(m.id) === Number(messageId) ? { ...m, reactions } : m)),
        );
      }
    });

    socket.on('office:pin_updated', ({ roomId, messageId, daGhim }) => {
      if (Number(roomId) === Number(selectedRoomIdRef.current)) {
        setRoomMessages((prev) => {
          const next = prev.map((m) =>
            Number(m.id) === Number(messageId) ? { ...m, daGhim } : m,
          );
          setPinnedMessages(next.filter((m) => m.daGhim && !m.daThuHoi));
          return next;
        });
      }
    });

    socket.on('office:message_recalled', ({ roomId, messageId }) => {
      if (Number(roomId) === Number(selectedRoomIdRef.current)) {
        setRoomMessages((prev) =>
          prev.map((m) =>
            Number(m.id) === Number(messageId)
              ? { ...m, daThuHoi: true, noiDung: 'Tin nhắn đã được thu hồi', tepDinhKem: null }
              : m,
          ),
        );
      }
    });

    socket.on('office:typing', ({ roomId, userId: typerId, hoTen, isTyping }) => {
      if (Number(roomId) === Number(selectedRoomIdRef.current) && Number(typerId) !== Number(user.id)) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (isTyping) next[typerId] = hoTen;
          else delete next[typerId];
          return next;
        });
      }
    });

    socket.on('office:room_updated', () => {
      fetchWorkspaceInit(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // Active Room Object
  const activeRoom = useMemo(
    () => rooms.find((r) => Number(r.id) === Number(selectedRoomId)) || null,
    [rooms, selectedRoomId],
  );

  // Filtered Rooms in Middle Column
  const filteredRooms = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      if (convFilter === 'group' && r.loai !== 'nhom') return false;
      if (convFilter === 'direct' && r.loai !== 'rieng_tu') return false;
      if (convFilter === 'unread' && (!r.unreadCount || r.unreadCount <= 0)) return false;
      if (q) {
        const matchTitle = String(r.tenPhong || '').toLowerCase().includes(q);
        const matchLast = String(r.lastMessage?.noiDung || '').toLowerCase().includes(q);
        const matchMember = (r.members || []).some((m) =>
          String(m.hoTen || '').toLowerCase().includes(q),
        );
        return matchTitle || matchLast || matchMember;
      }
      return true;
    });
  }, [rooms, convFilter, sidebarSearch]);

  // Filtered Messages in Active Chat
  const displayedMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return roomMessages;
    return roomMessages.filter(
      (m) =>
        String(m.noiDung || '').toLowerCase().includes(q) ||
        String(m.nguoiGui?.hoTen || '').toLowerCase().includes(q),
    );
  }, [roomMessages, messageSearch]);

  // Total Unread Count
  const totalUnread = useMemo(
    () => rooms.reduce((sum, r) => sum + Number(r.unreadCount || 0), 0),
    [rooms],
  );

  // Grouped Staff by Department for Directory / Org View
  const groupedDepartments = useMemo(() => {
    const groups = {};
    const q = sidebarSearch.trim().toLowerCase();
    staffDirectory.forEach((s) => {
      if (
        q &&
        !String(s.hoTen || '').toLowerCase().includes(q) &&
        !String(s.khoaPhong || '').toLowerCase().includes(q) &&
        !String(s.chucVu || '').toLowerCase().includes(q)
      ) {
        return;
      }
      const dept = s.khoaPhong || 'Nội bộ Phòng khám';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(s);
    });
    return groups;
  }, [staffDirectory, sidebarSearch]);

  // Mention Candidates when typing @
  const mentionCandidates = useMemo(() => {
    const members = activeRoom?.members || staffDirectory;
    const q = mentionQuery.toLowerCase();
    const allOption = { id: 'ALL', hoTen: 'Tất cả', chucVu: 'Thông báo toàn bộ thành viên trong phòng' };
    const filtered = members.filter(
      (m) =>
        Number(m.id) !== Number(user?.id) &&
        (!q || String(m.hoTen || '').toLowerCase().includes(q)),
    );
    return !q || 'tất cả'.includes(q) ? [allOption, ...filtered] : filtered;
  }, [activeRoom, staffDirectory, mentionQuery, user?.id]);

  // Handlers
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Emit typing
    if (socketRef.current && selectedRoomId) {
      socketRef.current.emit('office:typing', {
        roomId: selectedRoomId,
        userId: user?.id,
        hoTen: currentUserProfile?.hoTen || user?.hoTen || 'Đồng nghiệp',
        isTyping: val.length > 0,
      });
    }

    // Check @mention trigger
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') || afterAt.length <= 15) {
        setMentionQuery(afterAt);
        setShowMentionList(true);
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleSelectMention = (target) => {
    const lastAt = inputText.lastIndexOf('@');
    const prefix = lastAt !== -1 ? inputText.slice(0, lastAt) : inputText;
    const nextText = `${prefix}@${target.hoTen} `;
    setInputText(nextText);
    setSelectedMentions((prev) => [...prev, target.id]);
    setShowMentionList(false);
  };

  const handleSendTextMessage = async (e) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !selectedRoomId) return;

    setInputText('');
    setShowMentionList(false);
    const currentReply = replyTarget;
    setReplyTarget(null);

    if (socketRef.current) {
      socketRef.current.emit('office:typing', {
        roomId: selectedRoomId,
        userId: user?.id,
        hoTen: currentUserProfile?.hoTen || 'Đồng nghiệp',
        isTyping: false,
      });
    }

    try {
      const res = await apiPost(`/office/rooms/${selectedRoomId}/messages`, {
        loai: 'van_ban',
        noiDung: content,
        traLoiId: currentReply?.id || null,
        mentions: selectedMentions,
      });
      const msg = res?.data || res;
      if (msg && msg.id) {
        setRoomMessages((prev) =>
          prev.some((m) => Number(m.id) === Number(msg.id)) ? prev : [...prev, msg],
        );
      }
      setSelectedMentions([]);
      fetchWorkspaceInit(true);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  const handleSendSticker = async (sticker) => {
    if (!selectedRoomId) return;
    setShowStickerPopover(false);
    try {
      const res = await apiPost(`/office/rooms/${selectedRoomId}/messages`, {
        loai: 'nhan_dan',
        noiDung: sticker.code,
        tepDinhKem: sticker,
        traLoiId: replyTarget?.id || null,
      });
      const msg = res?.data || res;
      if (msg && msg.id) {
        setRoomMessages((prev) =>
          prev.some((m) => Number(m.id) === Number(msg.id)) ? prev : [...prev, msg],
        );
      }
      setReplyTarget(null);
      fetchWorkspaceInit(true);
    } catch (err) {
      console.error('Lỗi gửi nhãn dán:', err);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedRoomId) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/office/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = uploadRes?.data?.data || uploadRes?.data;

      if (uploaded?.url) {
        const res = await apiPost(`/office/rooms/${selectedRoomId}/messages`, {
          loai: uploaded.loai || 'tep_tin',
          noiDung: uploaded.fileName || file.name,
          tepDinhKem: uploaded,
          traLoiId: replyTarget?.id || null,
        });
        const msg = res?.data || res;
        if (msg && msg.id) {
          setRoomMessages((prev) =>
            prev.some((m) => Number(m.id) === Number(msg.id)) ? prev : [...prev, msg],
          );
        }
        setReplyTarget(null);
        fetchWorkspaceInit(true);
      }
    } catch (err) {
      console.error('Lỗi tải tệp lên Office:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const res = await apiPost(`/office/messages/${messageId}/react`, { emoji });
      const data = res?.data || res;
      if (data?.reactions) {
        setRoomMessages((prev) =>
          prev.map((m) =>
            Number(m.id) === Number(messageId) ? { ...m, reactions: data.reactions } : m,
          ),
        );
      }
    } catch (err) {
      console.error('Lỗi thả cảm xúc:', err);
    }
  };

  const handleTogglePin = async (messageId) => {
    if (!selectedRoomId) return;
    try {
      const res = await apiPatch(`/office/rooms/${selectedRoomId}/pin`, { messageId });
      const data = res?.data || res;
      setRoomMessages((prev) => {
        const next = prev.map((m) =>
          Number(m.id) === Number(messageId) ? { ...m, daGhim: data.daGhim } : m,
        );
        setPinnedMessages(next.filter((m) => m.daGhim && !m.daThuHoi));
        return next;
      });
    } catch (err) {
      console.error('Lỗi ghim tin nhắn:', err);
    }
  };

  const handleRecallMessage = async (messageId, mode = 'recall') => {
    try {
      const res = await apiDelete(`/office/messages/${messageId}?mode=${mode}`);
      const data = res?.data || res;
      if (data?.action === 'deleted_for_me' || mode === 'delete_for_me') {
        setRoomMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)));
        setPinnedMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)));
        fetchWorkspaceInit(true);
      } else {
        setRoomMessages((prev) =>
          prev.map((m) =>
            Number(m.id) === Number(messageId)
              ? { ...m, daThuHoi: true, daGhim: false, noiDung: 'Tin nhắn đã được thu hồi', tepDinhKem: null }
              : m,
          ),
        );
        setPinnedMessages((prev) => prev.filter((m) => Number(m.id) !== Number(messageId)));
      }
    } catch {
      window.alert('Không thể thu hồi');
    }
  };

  const handleStartDirectChat = async (targetUserId) => {
    if (Number(targetUserId) === Number(user?.id)) return;
    try {
      const res = await apiPost('/office/rooms/direct', { targetUserId });
      const data = res?.data || res;
      if (data?.roomId) {
        await fetchWorkspaceInit(true);
        setSelectedRoomId(Number(data.roomId));
        setLeftNav('chat');
      }
    } catch (err) {
      console.error('Lỗi mở chat 1-1:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await apiPost('/office/rooms/group', {
        tenPhong: newGroupName.trim(),
        moTa: newGroupDesc.trim(),
        memberIds: newGroupMembers,
      });
      const data = res?.data || res;
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupMembers([]);
      await fetchWorkspaceInit(true);
      if (data?.roomId) {
        setSelectedRoomId(Number(data.roomId));
      }
    } catch (err) {
      console.error('Lỗi tạo nhóm mới:', err);
    }
  };

  const handleAddMembersToGroup = async (e) => {
    e.preventDefault();
    if (!selectedRoomId || addMemberIds.length === 0) return;
    try {
      await apiPost(`/office/rooms/${selectedRoomId}/members`, {
        memberIds: addMemberIds,
      });
      setShowAddMemberModal(false);
      setAddMemberIds([]);
      await fetchWorkspaceInit(true);
    } catch (err) {
      console.error('Lỗi thêm thành viên:', err);
    }
  };

  const handleConfirmRoomAction = async () => {
    if (!confirmRoomAction || !selectedRoomId) return;
    setProcessingRoomAction(true);
    try {
      if (confirmRoomAction.type === 'delete_chat') {
        await apiDelete(`/office/rooms/${selectedRoomId}/conversation`);
        setRoomMessages([]);
        setPinnedMessages([]);
        setConfirmRoomAction(null);
        await fetchWorkspaceInit(true);
      } else if (confirmRoomAction.type === 'leave_group') {
        const leavingId = Number(selectedRoomId);
        await apiPost(`/office/rooms/${leavingId}/leave`, {});
        setConfirmRoomAction(null);
        setShowRightInfo(false);
        const remaining = rooms.filter((r) => Number(r.id) !== leavingId);
        setRooms(remaining);
        setSelectedRoomId(remaining.length > 0 ? remaining[0].id : null);
        await fetchWorkspaceInit(false);
      }
    } catch (err) {
      console.error('Lỗi thao tác hội thoại:', err);
      window.alert(err?.response?.data?.message || 'Không thể thực hiện thao tác này.');
    } finally {
      setProcessingRoomAction(false);
    }
  };

  // Render formatted message text (highlighting @mentions and clickable URLs)
  const renderFormattedContent = (text, isMe) => {
    if (!text) return null;
    const parts = String(text).split(/(https?:\/\/[^\s]+|@[A-Za-zÀ-ỹ0-9_.\s]{2,25})/g);
    return parts.map((part, idx) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={`underline font-medium break-all ${
              isMe
                ? 'text-white hover:text-emerald-100'
                : darkMode
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            {part}
          </a>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            className={`font-semibold px-1 py-0.5 rounded ${
              isMe
                ? 'bg-white/20 text-white'
                : darkMode
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  // Group reactions by emoji for display beneath bubble
  const groupReactions = (reactions = []) => {
    const map = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r);
    });
    return Object.entries(map);
  };

  const latestPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;
  const activeTypingList = Object.values(typingUsers);

  const bgMain = darkMode ? 'bg-[#11151c] text-slate-100' : 'bg-gray-50 text-gray-900';
  const bgHeader = darkMode ? 'bg-[#161b24] border-slate-800' : 'bg-white border-gray-200';
  const bgSidebarLeft = darkMode ? 'bg-[#141922] border-slate-800/90' : 'bg-white border-gray-200';
  const bgMiddleCol = darkMode ? 'bg-[#181e29] border-slate-800/90' : 'bg-white border-gray-200';
  const bgChatArea = darkMode ? 'bg-[#121720]' : 'bg-gray-50/60';
  const bgBubbleOther = darkMode
    ? 'bg-[#232b3a] text-slate-100 border border-slate-700/60'
    : 'bg-white text-gray-900 border border-gray-200 shadow-xs';
  const textMuted = darkMode ? 'text-slate-400' : 'text-gray-500';
  const textSubtle = darkMode ? 'text-slate-300' : 'text-gray-700';
  const hoverItem = darkMode ? 'hover:bg-slate-800/60 hover:text-slate-100' : 'hover:bg-gray-100 hover:text-gray-900';
  const activeNavTab = darkMode
    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold';

  return (
    <div className={`flex flex-col h-[calc(100vh-76px)] -m-4 sm:-m-6 overflow-hidden select-none ${bgMain}`}>
      {/* ─── TOP HEADER BAR (NEXTX AI OFFICE STYLE) ───────────────────── */}
      <div className={`h-12 px-4 flex items-center justify-between border-b shrink-0 ${bgHeader}`}>
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              O
            </div>
            <span className="font-bold tracking-tight text-sm">Office</span>
          </div>

          {/* Top Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setLeftNav('chat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                leftNav === 'chat'
                  ? darkMode
                    ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10'
                    : 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
                  : `${textMuted} ${hoverItem}`
              }`}
            >
              <span>Trao đổi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                {totalUnread > 0 ? `${totalUnread}+` : 'Live'}
              </span>
            </button>

            <button
              onClick={() => setLeftNav('directory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                leftNav === 'directory'
                  ? darkMode
                    ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10'
                    : 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
                  : `${textMuted} ${hoverItem}`
              }`}
            >
              <span>Danh bạ Khoa/Phòng</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  darkMode ? 'bg-slate-700 text-slate-200' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {staffDirectory.length}
              </span>
            </button>

            <button
              onClick={() => {
                setLeftNav('chat');
                setChatSubTab('files');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                chatSubTab === 'files'
                  ? darkMode
                    ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10'
                    : 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
                  : `${textMuted} ${hoverItem}`
              }`}
            >
              Tài liệu & Hồ sơ
            </button>
          </div>
        </div>

        {/* Right Top Controls */}
        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${
              darkMode
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold truncate max-w-[160px]">
              {currentUserProfile?.khoaPhong || 'Phòng Khám Đa Khoa'}
            </span>
          </div>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo nhóm</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN 3-COLUMN WORKSPACE BODY ─────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ═══ COLUMN 1: LEFT NAVIGATION RAIL ═══ */}
        <div className={`w-48 shrink-0 border-r flex flex-col justify-between p-2.5 hidden lg:flex ${bgSidebarLeft}`}>
          <div className="space-y-1">
            <button
              onClick={() => {
                setLeftNav('chat');
                setConvFilter('all');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                leftNav === 'chat' && convFilter === 'all' ? activeNavTab : `${textSubtle} ${hoverItem}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Trò chuyện</span>
              </div>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white">
                  {totalUnread}!
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setLeftNav('chat');
                setConvFilter('group');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                leftNav === 'chat' && convFilter === 'group' ? activeNavTab : `${textSubtle} ${hoverItem}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Nhóm Khoa/Phòng</span>
              </div>
              <span className={`text-[11px] font-semibold ${textMuted}`}>
                {rooms.filter((r) => r.loai === 'nhom').length}
              </span>
            </button>

            <button
              onClick={() => {
                setLeftNav('chat');
                setConvFilter('direct');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                leftNav === 'chat' && convFilter === 'direct' ? activeNavTab : `${textSubtle} ${hoverItem}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AtSign className="w-4 h-4" />
                <span>Tin nhắn riêng</span>
              </div>
              <span className={`text-[11px] font-semibold ${textMuted}`}>
                {rooms.filter((r) => r.loai === 'rieng_tu').length}
              </span>
            </button>

            <button
              onClick={() => setLeftNav('directory')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                leftNav === 'directory' ? activeNavTab : `${textSubtle} ${hoverItem}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Sơ đồ tổ chức</span>
              </div>
            </button>

            <button
              onClick={() => {
                setLeftNav('chat');
                setChatSubTab('pinned');
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                chatSubTab === 'pinned' ? activeNavTab : `${textSubtle} ${hoverItem}`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Pin className="w-4 h-4" />
                <span>Bảng tin đã ghim</span>
              </div>
              {pinnedMessages.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {pinnedMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* Current Staff Footer Card */}
          <div
            className={`p-2.5 rounded-xl border ${
              darkMode
                ? 'bg-slate-800/40 border-slate-700/50'
                : 'bg-gray-50 border-gray-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(
                  user?.id,
                )} flex items-center justify-center text-white font-bold text-xs relative shrink-0`}
              >
                {getInitials(currentUserProfile?.hoTen || user?.hoTen)}
                <span
                  className={`w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 ${
                    darkMode ? 'border-[#141922]' : 'border-white'
                  } absolute -bottom-0.5 -right-0.5`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">
                  {currentUserProfile?.hoTen || user?.hoTen || 'Nhân sự'}
                </div>
                <div className={`text-[10px] font-medium truncate ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {currentUserProfile?.chucVu || 'Đang trực tuyến'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLUMN 2: CONVERSATION LIST OR STAFF DIRECTORY ═══ */}
        <div className={`w-80 shrink-0 border-r flex flex-col min-h-0 ${bgMiddleCol}`}>
          {/* Column 2 Header */}
          <div
            className={`p-3.5 border-b space-y-3 ${
              darkMode ? 'border-slate-800/80' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base tracking-tight">
                {leftNav === 'directory' ? 'Danh bạ Khoa / Phòng' : 'Trò chuyện'}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLeftNav(leftNav === 'directory' ? 'chat' : 'directory')}
                  title="Danh bạ nhân sự"
                  className={`p-1.5 rounded-lg transition ${textMuted} ${hoverItem}`}
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  title="Tạo nhóm chat mới"
                  className={`p-1.5 rounded-lg transition ${textMuted} ${hoverItem}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 ${textMuted} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Tìm mọi thứ: người, nhóm, tin nhắn..."
                className={`w-full pl-8 pr-7 py-2 rounded-lg text-xs outline-none border transition ${
                  darkMode
                    ? 'bg-[#121720] border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white'
                }`}
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${textMuted}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills (Nội bộ | Nhóm | Cá nhân | Chưa đọc) */}
            {leftNav === 'chat' && (
              <div
                className={`grid grid-cols-4 gap-1 p-1 rounded-lg border ${
                  darkMode
                    ? 'bg-[#121720] border-slate-800'
                    : 'bg-gray-100 border-gray-200/80'
                }`}
              >
                {[
                  { key: 'all', label: 'Nội bộ' },
                  { key: 'group', label: 'Nhóm' },
                  { key: 'direct', label: 'Cá nhân' },
                  { key: 'unread', label: 'Chưa đọc' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setConvFilter(tab.key)}
                    className={`py-1.5 rounded-md text-[11px] font-semibold transition ${
                      convFilter === tab.key
                        ? darkMode
                          ? 'bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 shadow-sm'
                          : 'bg-white text-emerald-700 border border-emerald-200 shadow-2xs'
                        : `${textMuted} ${hoverItem}`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List Body */}
          <div
            className={`flex-1 overflow-y-auto divide-y ${
              darkMode ? 'divide-slate-800/40' : 'divide-gray-100'
            }`}
          >
            {leftNav === 'directory' ? (
              <div className="p-2.5 space-y-4">
                {Object.entries(groupedDepartments).map(([deptName, members]) => (
                  <div key={deptName} className="space-y-1.5">
                    <div
                      className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                        darkMode ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      <span>{deptName}</span>
                      <span className={textMuted}>{members.length}</span>
                    </div>
                    {members.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => handleStartDirectChat(staff.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition group ${hoverItem}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(
                              staff.id,
                            )} flex items-center justify-center text-white font-bold text-xs relative shrink-0`}
                          >
                            {getInitials(staff.hoTen)}
                            <span
                              className={`w-2.5 h-2.5 rounded-full border-2 ${
                                darkMode ? 'border-[#181e29]' : 'border-white'
                              } absolute -bottom-0.5 -right-0.5 ${
                                staff.online ? 'bg-emerald-400' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                              <span>{staff.hoTen}</span>
                              {Number(staff.id) === Number(user?.id) && (
                                <span className={`text-[10px] ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] truncate ${textMuted}`}>
                              {staff.chucVu}
                            </div>
                          </div>
                        </div>
                        {Number(staff.id) !== Number(user?.id) && (
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition ${
                              darkMode
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            Nhắn tin
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className={`p-8 text-center text-xs space-y-2 ${textMuted}`}>
                <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
                <p>Không tìm thấy cuộc trò chuyện nào</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = Number(room.id) === Number(selectedRoomId);
                const isGroup = room.loai === 'nhom';
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`px-3.5 py-3 flex items-center gap-3 cursor-pointer transition relative ${
                      isSelected
                        ? darkMode
                          ? 'bg-[#252f42] border-l-4 border-emerald-500'
                          : 'bg-emerald-50/90 border-l-4 border-emerald-600'
                        : darkMode
                        ? 'hover:bg-slate-800/40'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar with Member Count Badge (NextX Style) */}
                    <div className="relative shrink-0">
                      {isGroup ? (
                        <div
                          className={`w-11 h-11 rounded-full border flex flex-wrap items-center justify-center p-1 gap-0.5 overflow-hidden ${
                            darkMode
                              ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/80'
                              : 'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200'
                          }`}
                        >
                          {(room.members || []).slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className={`w-4 h-4 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                m.id,
                              )} text-[8px] font-bold text-white flex items-center justify-center`}
                            >
                              {getInitials(m.hoTen).slice(0, 1)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(
                            room.directPartner?.id || room.id,
                          )} flex items-center justify-center text-white font-bold text-sm`}
                        >
                          {getInitials(room.tenPhong)}
                        </div>
                      )}

                      {isGroup ? (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-600 text-[10px] font-bold text-white shadow">
                          {room.soThanhVien}
                        </span>
                      ) : (
                        <span
                          className={`w-3 h-3 rounded-full border-2 ${
                            darkMode ? 'border-[#181e29]' : 'border-white'
                          } absolute bottom-0 right-0 ${
                            room.directPartner?.online ? 'bg-emerald-400' : 'bg-slate-400'
                          }`}
                        />
                      )}
                    </div>

                    {/* Room Title & Last Message Preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-xs truncate">{room.tenPhong}</span>
                        <span className={`text-[10px] shrink-0 ${textMuted}`}>
                          {formatTimeShort(room.lastMessage?.taoLuc || room.capNhatLuc)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate ${textMuted}`}>
                          {room.lastMessage ? (
                            <>
                              <span className={`font-semibold ${textSubtle}`}>
                                {Number(room.lastMessage.nguoiGuiId) === Number(user?.id)
                                  ? 'Bạn: '
                                  : `${room.lastMessage.tenNguoiGui}: `}
                              </span>
                              <span>{room.lastMessage.noiDung}</span>
                            </>
                          ) : (
                            <span className="italic opacity-75">Bắt đầu cuộc trò chuyện...</span>
                          )}
                        </p>

                        {room.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ COLUMN 3: ACTIVE CHAT WINDOW ═══ */}
        <div className={`flex-1 flex flex-col min-w-0 ${bgChatArea}`}>
          {!activeRoom ? (
            <div className={`flex-1 flex flex-col items-center justify-center p-8 space-y-3 ${textMuted}`}>
              <MessageSquare className="w-12 h-12 text-emerald-500/40" />
              <p className="text-sm font-semibold">Chọn một cuộc trò chuyện hoặc nhóm Khoa/Phòng</p>
            </div>
          ) : (
            <>
              {/* 1. Chat Window Header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between shrink-0 ${bgHeader}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                      activeRoom.id,
                    )} flex items-center justify-center text-white font-bold text-xs shrink-0 relative`}
                  >
                    {getInitials(activeRoom.tenPhong)}
                    {activeRoom.loai === 'nhom' && (
                      <span className="absolute -bottom-1 px-1.5 rounded-full bg-slate-900 border border-slate-700 text-[9px] font-bold text-white">
                        {activeRoom.soThanhVien}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
                      <h3 className="font-bold text-sm truncate">{activeRoom.tenPhong}</h3>
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] ${textMuted}`}>
                      <span>
                        {activeRoom.loai === 'nhom'
                          ? `${activeRoom.soThanhVien} thành viên`
                          : activeRoom.directPartner?.online
                          ? '🟢 Đang trực tuyến'
                          : 'Ngoại tuyến'}
                      </span>
                      {activeRoom.moTa && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-md">{activeRoom.moTa}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Right Actions */}
                <div className="flex items-center gap-1.5">
                  {activeRoom.loai === 'nhom' && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      title="Thêm thành viên vào nhóm"
                      className={`p-2 rounded-lg transition ${textSubtle} ${hoverItem}`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    title="Tìm kiếm tin nhắn trong hội thoại"
                    className={`p-2 rounded-lg transition ${
                      showMessageSearch
                        ? darkMode
                          ? 'text-emerald-400 bg-slate-800'
                          : 'text-emerald-700 bg-emerald-50'
                        : `${textSubtle} ${hoverItem}`
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowRightInfo(!showRightInfo)}
                    title="Thông tin hội thoại & Thành viên"
                    className={`p-2 rounded-lg transition ${
                      showRightInfo
                        ? darkMode
                          ? 'text-emerald-400 bg-slate-800'
                          : 'text-emerald-700 bg-emerald-50'
                        : `${textSubtle} ${hoverItem}`
                    }`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. Sub-Tabs Bar (Trò chuyện | Đã ghim | Ảnh & Media | Tệp) */}
              <div className={`px-5 flex items-center justify-between border-b shrink-0 ${bgHeader}`}>
                <div className="flex items-center gap-5 overflow-x-auto">
                  {[
                    { key: 'messages', label: '💬 Trò chuyện' },
                    { key: 'pinned', label: `📌 Ghim (${pinnedMessages.length})` },
                    { key: 'images', label: `🖼️ Ảnh (${sharedImages.length})` },
                    { key: 'files', label: `📎 Tệp (${sharedFiles.length})` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setChatSubTab(t.key)}
                      className={`py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                        chatSubTab === t.key
                          ? darkMode
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-emerald-600 text-emerald-700'
                          : `border-transparent ${textMuted} ${hoverItem}`
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {showMessageSearch && (
                  <div className="py-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder="Lọc nội dung tin nhắn..."
                      className={`px-3 py-1 rounded-lg border text-xs outline-none focus:border-emerald-500 ${
                        darkMode
                          ? 'bg-[#11151c] border-slate-700 text-slate-100'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    {messageSearch && (
                      <button onClick={() => setMessageSearch('')} className={textMuted}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Pinned Message Banner (Identical to NextX Screenshot) */}
              {chatSubTab === 'messages' && latestPinned && (
                <div
                  onClick={() => setChatSubTab('pinned')}
                  className={`px-5 py-2 border-b flex items-center justify-between gap-3 cursor-pointer transition shrink-0 ${
                    darkMode
                      ? 'bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-950/60'
                      : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Tin nhắn ghim
                      </div>
                      <div className={`text-xs truncate ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                        <span className="font-semibold">{latestPinned.nguoiGui?.hoTen}: </span>
                        <span>{latestPinned.noiDung}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Xem tất cả ({pinnedMessages.length})
                  </span>
                </div>
              )}

              {/* 4. Main Content Area + Optional Right Info Drawer */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                  {chatSubTab === 'messages' ? (
                    <>
                      {/* Messages Scroll Stream */}
                      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {loadingMessages ? (
                          <div className={`text-center py-12 text-xs ${textMuted}`}>
                            Đang đồng bộ tin nhắn thời gian thực...
                          </div>
                        ) : displayedMessages.length === 0 ? (
                          <div className={`text-center py-12 text-xs ${textMuted}`}>
                            Chưa có tin nhắn nào trong cuộc trò chuyện này.
                          </div>
                        ) : (
                          displayedMessages.map((msg, index) => {
                            if (msg.loai === 'he_thong') {
                              return (
                                <div key={msg.id} className="flex justify-center my-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-[11px] ${
                                      darkMode
                                        ? 'bg-slate-800/80 text-slate-400'
                                        : 'bg-gray-200/80 text-gray-600'
                                    }`}
                                  >
                                    {msg.noiDung}
                                  </span>
                                </div>
                              );
                            }

                            const isMe = Number(msg.nguoiGuiId) === Number(user?.id);
                            const roleBadge = ROLE_BADGE_MAP[msg.nguoiGui?.maVaiTro];
                            const groupedRx = groupReactions(msg.reactions);
                            const isLastMessage = index === displayedMessages.length - 1;

                            return (
                              <div
                                key={msg.id}
                                className={`group flex items-start gap-3 ${
                                  isMe ? 'flex-row-reverse' : 'flex-row'
                                }`}
                              >
                                {/* Sender Avatar */}
                                {!isMe && (
                                  <div
                                    onClick={() => handleStartDirectChat(msg.nguoiGuiId)}
                                    title={`Nhắn tin riêng với ${msg.nguoiGui?.hoTen}`}
                                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                      msg.nguoiGuiId,
                                    )} flex items-center justify-center text-white font-bold text-xs shrink-0 cursor-pointer mt-1`}
                                  >
                                    {getInitials(msg.nguoiGui?.hoTen)}
                                  </div>
                                )}

                                <div
                                  className={`flex flex-col max-w-[72%] ${
                                    isMe ? 'items-end' : 'items-start'
                                  }`}
                                >
                                  {/* Sender Name & Role Badge */}
                                  {!isMe && (
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                      <span className={`text-xs font-semibold ${textSubtle}`}>
                                        {msg.nguoiGui?.hoTen}
                                      </span>
                                      {roleBadge && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                                            darkMode ? roleBadge.dark : roleBadge.light
                                          }`}
                                        >
                                          {roleBadge.label}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Bubble + Hover Toolbar Wrapper */}
                                  <div
                                    className={`relative flex items-center gap-2 ${
                                      isMe ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                  >
                                    {/* Message Bubble */}
                                    <div
                                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative ${
                                        msg.daThuHoi
                                          ? darkMode
                                            ? 'bg-slate-800/50 text-slate-500 italic border border-slate-700/50'
                                            : 'bg-gray-100 text-gray-400 italic border border-gray-200'
                                          : isMe
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : bgBubbleOther
                                      }`}
                                    >
                                      {/* Quoted Reply Box */}
                                      {msg.traLoi && !msg.daThuHoi && (
                                        <div
                                          className={`mb-2 px-3 py-1.5 rounded-lg border-l-4 text-xs ${
                                            isMe
                                              ? 'bg-emerald-700/70 border-emerald-200 text-emerald-50'
                                              : darkMode
                                              ? 'bg-slate-800/90 border-emerald-500 text-slate-300'
                                              : 'bg-gray-100 border-emerald-600 text-gray-700'
                                          }`}
                                        >
                                          <div className="font-bold text-[11px]">
                                            ↩ {msg.traLoi.tenNguoiGui}
                                          </div>
                                          <div className="truncate opacity-90">
                                            {msg.traLoi.noiDung}
                                          </div>
                                        </div>
                                      )}

                                      {/* Content by Message Type */}
                                      {msg.daThuHoi ? (
                                        <span>🚫 Tin nhắn đã được thu hồi</span>
                                      ) : msg.loai === 'nhan_dan' && msg.tepDinhKem ? (
                                        <div className="py-1 px-2 flex items-center gap-3">
                                          <span className="text-4xl">{msg.tepDinhKem.emoji || '👍'}</span>
                                          <div>
                                            <div className="font-bold text-sm">
                                              {msg.tepDinhKem.label || msg.noiDung}
                                            </div>
                                            <div className="text-[11px] opacity-80">
                                              Nhãn dán Office
                                            </div>
                                          </div>
                                        </div>
                                      ) : msg.loai === 'hinh_anh' && msg.tepDinhKem?.url ? (
                                        <div className="relative group/img overflow-hidden rounded-xl">
                                          <img
                                            src={toAttachmentUrl(msg.tepDinhKem.url)}
                                            alt="Hình ảnh đính kèm"
                                            onClick={() => setLightboxImage(toAttachmentUrl(msg.tepDinhKem.url))}
                                            className="max-h-72 max-w-full sm:max-w-xs rounded-xl object-cover cursor-zoom-in border border-white/10 block"
                                          />
                                          <a
                                            href={toAttachmentUrl(msg.tepDinhKem.url)}
                                            download={msg.tepDinhKem.fileName || msg.noiDung || 'image'}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Tải ảnh về máy"
                                            className="opacity-0 group-hover/img:opacity-100 transition absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/85 text-white text-[11px] font-medium flex items-center gap-1 backdrop-blur-xs shadow-md"
                                          >
                                            <Download className="w-3 h-3" /> Tải về
                                          </a>
                                        </div>
                                      ) : msg.loai === 'tep_tin' && msg.tepDinhKem?.url ? (
                                        <a
                                          href={toAttachmentUrl(msg.tepDinhKem.url)}
                                          download={msg.tepDinhKem.fileName || msg.noiDung}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                                            isMe
                                              ? 'bg-emerald-700/60 border-emerald-400/30 hover:bg-emerald-700'
                                              : darkMode
                                              ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                          }`}
                                        >
                                          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <FileText className={`w-5 h-5 ${isMe || darkMode ? 'text-emerald-300' : 'text-emerald-600'}`} />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-xs truncate">
                                              {msg.tepDinhKem.fileName || msg.noiDung}
                                            </div>
                                            <div className="text-[10px] opacity-75">
                                              {formatFileSize(msg.tepDinhKem.fileSize)} • Bấm để tải xuống
                                            </div>
                                          </div>
                                          <Download className="w-4 h-4 shrink-0" />
                                        </a>
                                      ) : (
                                        <div className="whitespace-pre-wrap break-words">
                                          {renderFormattedContent(msg.noiDung, isMe)}
                                        </div>
                                      )}

                                      {/* Timestamp & Checkmark Footer inside Bubble */}
                                      <div
                                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                          isMe ? 'text-emerald-100/90' : textMuted
                                        }`}
                                      >
                                        {msg.daGhim && <Pin className="w-3 h-3 text-amber-400" />}
                                        <span>{formatTimeShort(msg.taoLuc)}</span>
                                        {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                                      </div>
                                    </div>

                                    {/* Hover Action Bar (NextX Style: Emoji + Reply + Pin + Recall) */}
                                    {!msg.daThuHoi && (
                                      <div
                                        className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 px-2 py-1 rounded-full border shadow-lg shrink-0 z-10 ${
                                          darkMode
                                            ? 'bg-[#1b2230] border-slate-700 text-slate-200'
                                            : 'bg-white border-gray-200 text-gray-700'
                                        }`}
                                      >
                                        {QUICK_EMOJIS.map((emo) => (
                                          <button
                                            key={emo}
                                            onClick={() => handleToggleReaction(msg.id, emo)}
                                            className="hover:scale-125 transition px-1 text-xs"
                                            title={`Thả ${emo}`}
                                          >
                                            {emo}
                                          </button>
                                        ))}
                                        <div className={`w-px h-3.5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                                        <button
                                          onClick={() => setReplyTarget(msg)}
                                          title="Trả lời tin nhắn"
                                          className={`p-1 rounded ${hoverItem}`}
                                        >
                                          <Reply className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleTogglePin(msg.id)}
                                          title={msg.daGhim ? 'Bỏ ghim' : 'Ghim tin nhắn'}
                                          className={`p-1 rounded ${hoverItem} ${
                                            msg.daGhim ? 'text-amber-500' : ''
                                          }`}
                                        >
                                          <Pin className="w-3.5 h-3.5" />
                                        </button>
                                        {isMe && (
                                          <button
                                            onClick={() => {
                                              if (!canRecallByTime(msg.taoLuc)) {
                                                window.alert('Không thể thu hồi');
                                                return;
                                              }
                                              handleRecallMessage(msg.id, 'recall');
                                            }}
                                            title={
                                              canRecallByTime(msg.taoLuc)
                                                ? 'Thu hồi với mọi người (trong 15 phút)'
                                                : 'Không thể thu hồi (đã quá 15 phút)'
                                            }
                                            className={`p-1 rounded ${
                                              canRecallByTime(msg.taoLuc)
                                                ? `${hoverItem} hover:text-amber-500`
                                                : 'opacity-40 cursor-not-allowed'
                                            }`}
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleRecallMessage(msg.id, 'delete_for_me')}
                                          title="Xóa ở phía tôi (bên kia vẫn thấy bình thường)"
                                          className={`p-1 rounded ${hoverItem} hover:text-rose-500`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Reactions Bar Under Bubble */}
                                  {groupedRx.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                                      {groupedRx.map(([emo, list]) => {
                                        const iReacted = list.some(
                                          (r) => Number(r.userId) === Number(user?.id),
                                        );
                                        return (
                                          <button
                                            key={emo}
                                            onClick={() => handleToggleReaction(msg.id, emo)}
                                            title={list.map((r) => r.hoTen).join(', ')}
                                            className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 border transition ${
                                              iReacted
                                                ? darkMode
                                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                : darkMode
                                                ? 'bg-slate-800/90 border-slate-700 text-slate-300'
                                                : 'bg-white border-gray-200 text-gray-700 shadow-2xs'
                                            }`}
                                          >
                                            <span>{emo}</span>
                                            <span className="font-semibold">{list.length}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Seen Avatars Row on Latest Message (NextX Bottom Right) */}
                                  {isLastMessage && msg.seenBy?.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5 px-1">
                                      <div className="flex -space-x-1.5">
                                        {msg.seenBy.slice(0, 5).map((viewer) => (
                                          <div
                                            key={viewer.id}
                                            title={`Đã xem: ${viewer.hoTen}`}
                                            className={`w-4 h-4 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                              viewer.id,
                                            )} border ${
                                              darkMode ? 'border-[#121720]' : 'border-white'
                                            } text-[8px] font-bold text-white flex items-center justify-center`}
                                          >
                                            {getInitials(viewer.hoTen).slice(0, 1)}
                                          </div>
                                        ))}
                                      </div>
                                      {msg.seenBy.length > 5 && (
                                        <span className={`text-[10px] ${textMuted}`}>
                                          +{msg.seenBy.length - 5}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Typing Indicator */}
                      {activeTypingList.length > 0 && (
                        <div className={`px-5 py-1 text-[11px] italic ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          ✍️ {activeTypingList.join(', ')} đang soạn tin nhắn...
                        </div>
                      )}

                      {/* 5. Bottom Message Composer */}
                      <div className={`p-3 border-t relative shrink-0 ${bgHeader}`}>
                        {/* Reply Banner */}
                        {replyTarget && (
                          <div
                            className={`mb-2 px-3 py-2 rounded-lg border-l-4 border-emerald-500 flex items-center justify-between text-xs ${
                              darkMode ? 'bg-slate-800/80' : 'bg-emerald-50/70'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className={`font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                Đang trả lời {replyTarget.nguoiGui?.hoTen}
                              </div>
                              <div className={`truncate ${textSubtle}`}>{replyTarget.noiDung}</div>
                            </div>
                            <button
                              onClick={() => setReplyTarget(null)}
                              className={`p-1 ${textMuted}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* @Mention Autocomplete Popover */}
                        {showMentionList && mentionCandidates.length > 0 && (
                          <div
                            className={`absolute bottom-full left-4 mb-2 w-72 max-h-56 overflow-y-auto rounded-xl border shadow-2xl p-1.5 z-30 ${
                              darkMode
                                ? 'bg-[#1c2331] border-slate-700 text-slate-100'
                                : 'bg-white border-gray-200 text-gray-900'
                            }`}
                          >
                            <div className={`px-2.5 py-1 text-[10px] font-bold uppercase ${textMuted}`}>
                              Nhắc tên trong hội thoại (@)
                            </div>
                            {mentionCandidates.map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={() => handleSelectMention(cand)}
                                className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-500/15 flex items-center gap-2.5 text-left transition"
                              >
                                <div
                                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                    cand.id,
                                  )} flex items-center justify-center text-white font-bold text-[10px] shrink-0`}
                                >
                                  {cand.id === 'ALL' ? '@' : getInitials(cand.hoTen)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">
                                    @{cand.hoTen}
                                  </div>
                                  <div className={`text-[10px] truncate ${textMuted}`}>
                                    {cand.chucVu}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Sticker & Emoji Popover */}
                        {showStickerPopover && (
                          <div
                            className={`absolute bottom-full left-4 mb-2 w-80 rounded-2xl border shadow-2xl p-3 z-30 ${
                              darkMode
                                ? 'bg-[#1c2331] border-slate-700 text-slate-100'
                                : 'bg-white border-gray-200 text-gray-900'
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between border-b pb-2 mb-2.5 ${
                                darkMode ? 'border-slate-700/80' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setStickerTab('stickers')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                    stickerTab === 'stickers'
                                      ? 'bg-emerald-600 text-white'
                                      : `${textMuted} ${hoverItem}`
                                  }`}
                                >
                                  Nhãn dán Y tế
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStickerTab('emojis')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                    stickerTab === 'emojis'
                                      ? 'bg-emerald-600 text-white'
                                      : `${textMuted} ${hoverItem}`
                                  }`}
                                >
                                  Biểu tượng Emoji
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowStickerPopover(false)}
                                className={textMuted}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {stickerTab === 'stickers' ? (
                              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                {stickers.map((stk) => (
                                  <button
                                    key={stk.id}
                                    type="button"
                                    onClick={() => handleSendSticker(stk)}
                                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition ${
                                      darkMode
                                        ? 'bg-slate-800/80 hover:bg-emerald-600/20 border-slate-700/70 hover:border-emerald-500/40'
                                        : 'bg-gray-50 hover:bg-emerald-50 border-gray-200 hover:border-emerald-300'
                                    }`}
                                  >
                                    <span className="text-2xl">{stk.emoji}</span>
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold truncate">
                                        {stk.label}
                                      </div>
                                      <div className={`text-[10px] ${textMuted}`}>{stk.category}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-8 gap-1.5 max-h-56 overflow-y-auto">
                                {EMOJI_PALETTE.map((emo) => (
                                  <button
                                    key={emo}
                                    type="button"
                                    onClick={() => {
                                      setInputText((prev) => prev + emo);
                                      setShowStickerPopover(false);
                                    }}
                                    className={`p-1.5 text-lg rounded-lg transition ${hoverItem}`}
                                  >
                                    {emo}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Toolbar Icons Row (Identical to NextX Bottom Toolbar) */}
                        <div className="flex items-center gap-1 mb-2">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleUploadAttachment}
                            className="hidden"
                          />
                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleUploadAttachment}
                            className="hidden"
                          />

                          <button
                            type="button"
                            onClick={() => setShowStickerPopover(!showStickerPopover)}
                            title="Nhãn dán & Biểu tượng cảm xúc"
                            className={`p-2 rounded-lg transition ${textMuted} ${hoverItem}`}
                          >
                            <Smile className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingFile}
                            title="Gửi hình ảnh (X-Quang, kết quả khám...)"
                            className={`p-2 rounded-lg transition ${textMuted} ${hoverItem}`}
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                            title="Đính kèm tệp tài liệu (PDF, Excel, Word...)"
                            className={`p-2 rounded-lg transition ${textMuted} ${hoverItem}`}
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setInputText((prev) => `${prev}@`);
                              setMentionQuery('');
                              setShowMentionList(true);
                            }}
                            title="Nhắc tên đồng nghiệp (@mention)"
                            className={`p-2 rounded-lg transition ${textMuted} ${hoverItem}`}
                          >
                            <AtSign className="w-4 h-4" />
                          </button>

                          {uploadingFile && (
                            <span className="text-xs text-emerald-500 animate-pulse ml-2">
                              Đang tải tệp lên...
                            </span>
                          )}
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleSendTextMessage} className="flex items-end gap-2">
                          <textarea
                            rows={1}
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendTextMessage();
                              }
                            }}
                            placeholder={`Nhắn tin tới ${activeRoom.tenPhong} (Gõ @ để nhắc tên, Enter để gửi)...`}
                            className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none border resize-none max-h-28 ${
                              darkMode
                                ? 'bg-[#11151c] border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white'
                            }`}
                          />
                          <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Send className="w-4 h-4" />
                            <span>Gửi</span>
                          </button>
                        </form>
                      </div>
                    </>
                  ) : chatSubTab === 'pinned' ? (
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                        <Pin className="w-4 h-4" /> Danh sách Tin nhắn đã ghim ({pinnedMessages.length})
                      </h4>
                      {pinnedMessages.length === 0 ? (
                        <p className={`text-xs ${textMuted}`}>Chưa có tin nhắn nào được ghim trong phòng này.</p>
                      ) : (
                        pinnedMessages.map((pm) => (
                          <div
                            key={pm.id}
                            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                              darkMode
                                ? 'bg-slate-800/70 border-slate-700'
                                : 'bg-white border-gray-200 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                {pm.nguoiGui?.hoTen} • {formatTimeShort(pm.taoLuc)}
                              </div>
                              <div className="text-sm whitespace-pre-wrap">
                                {pm.noiDung}
                              </div>
                            </div>
                            <button
                              onClick={() => handleTogglePin(pm.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                darkMode
                                  ? 'bg-slate-700 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300'
                                  : 'bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600'
                              }`}
                            >
                              Bỏ ghim
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : chatSubTab === 'images' ? (
                    <div className="flex-1 overflow-y-auto p-5">
                      <h4 className="font-bold text-sm mb-4">
                        🖼️ Kho Hình ảnh đã chia sẻ ({sharedImages.length})
                      </h4>
                      {sharedImages.length === 0 ? (
                        <p className={`text-xs ${textMuted}`}>Chưa có hình ảnh nào được chia sẻ.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {sharedImages.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => setLightboxImage(toAttachmentUrl(img.tepDinhKem?.url))}
                              className={`group relative rounded-xl overflow-hidden border aspect-square cursor-pointer ${
                                darkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-100'
                              }`}
                            >
                              <img
                                src={toAttachmentUrl(img.tepDinhKem?.url)}
                                alt={img.noiDung}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate">
                                {img.nguoiGui?.hoTen} • {formatTimeShort(img.taoLuc)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                      <h4 className="font-bold text-sm mb-3">
                        📎 Kho Tệp tài liệu đã chia sẻ ({sharedFiles.length})
                      </h4>
                      {sharedFiles.length === 0 ? (
                        <p className={`text-xs ${textMuted}`}>Chưa có tệp tài liệu nào trong phòng này.</p>
                      ) : (
                        sharedFiles.map((f) => (
                          <a
                            key={f.id}
                            href={toAttachmentUrl(f.tepDinhKem?.url)}
                            download={f.tepDinhKem?.fileName || f.noiDung}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition ${
                              darkMode
                                ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700'
                                : 'bg-white hover:bg-gray-50 border-gray-200 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-6 h-6 text-emerald-500 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  {f.tepDinhKem?.fileName || f.noiDung}
                                </div>
                                <div className={`text-[11px] ${textMuted}`}>
                                  Gửi bởi {f.nguoiGui?.hoTen} • {formatFileSize(f.tepDinhKem?.fileSize)} •{' '}
                                  {formatTimeShort(f.taoLuc)}
                                </div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                          </a>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Right Room Info & Member List Drawer */}
                {showRightInfo && (
                  <div className={`w-80 border-l flex flex-col overflow-hidden shrink-0 ${bgMiddleCol}`}>
                    {/* Header */}
                    <div
                      className={`flex items-center justify-between px-4 py-3.5 border-b shrink-0 ${
                        darkMode ? 'border-slate-800' : 'border-gray-200'
                      }`}
                    >
                      <h4 className="font-bold text-sm tracking-tight">
                        {activeRoom.loai === 'nhom' ? 'Thông tin nhóm' : 'Thông tin hội thoại'}
                      </h4>
                      <button
                        onClick={() => setShowRightInfo(false)}
                        className={`p-1 rounded-lg transition ${textMuted} ${hoverItem}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-200/70 dark:divide-slate-800/90">
                      {/* Avatar & Title */}
                      <div className="text-center space-y-1.5 px-4 py-4">
                        <div
                          className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${getAvatarGradient(
                            activeRoom.id,
                          )} flex items-center justify-center text-white font-bold text-lg shadow-sm`}
                        >
                          {getInitials(activeRoom.tenPhong)}
                        </div>
                        <div className="font-bold text-sm">{activeRoom.tenPhong}</div>
                        <div className={`text-xs ${textMuted}`}>{activeRoom.moTa}</div>
                      </div>

                      {/* Section 1: Thành viên */}
                      <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setInfoSections((prev) => ({ ...prev, members: !prev.members }))
                            }
                            className="flex items-center gap-1.5 text-xs font-bold"
                          >
                            <span>Thành viên ({activeRoom.members?.length || 0})</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                infoSections.members ? '' : '-rotate-90'
                              }`}
                            />
                          </button>
                          {activeRoom.loai === 'nhom' && (
                            <button
                              type="button"
                              onClick={() => setShowAddMemberModal(true)}
                              className="text-emerald-500 hover:underline text-[11px] font-semibold"
                            >
                              + Thêm
                            </button>
                          )}
                        </div>

                        {infoSections.members && (
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                            {(activeRoom.members || []).map((m) => (
                              <div
                                key={m.id}
                                onClick={() => handleStartDirectChat(m.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${hoverItem}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                      m.id,
                                    )} flex items-center justify-center text-white font-bold text-[10px] relative shrink-0`}
                                  >
                                    {getInitials(m.hoTen)}
                                    <span
                                      className={`w-2 h-2 rounded-full border ${
                                        darkMode ? 'border-slate-900' : 'border-white'
                                      } absolute -bottom-0.5 -right-0.5 ${
                                        m.online ? 'bg-emerald-400' : 'bg-slate-400'
                                      }`}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{m.hoTen}</div>
                                    <div className={`text-[10px] truncate ${textMuted}`}>{m.chucVu}</div>
                                  </div>
                                </div>
                                {m.vaiTroNhom === 'truong_nhom' && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                      darkMode
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    Trưởng nhóm
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Ảnh */}
                      <div className="px-4 py-3 space-y-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setInfoSections((prev) => ({ ...prev, images: !prev.images }))
                          }
                          className="w-full flex items-center justify-between text-xs font-bold"
                        >
                          <span>Ảnh ({sharedImages.length})</span>
                          <ChevronDown
                            className={`w-4 h-4 ${textMuted} transition-transform ${
                              infoSections.images ? '' : '-rotate-90'
                            }`}
                          />
                        </button>

                        {infoSections.images && (
                          <>
                            {sharedImages.length === 0 ? (
                              <p className={`text-xs ${textMuted}`}>Chưa có ảnh nào.</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {sharedImages.slice(-8).reverse().map((img) => (
                                    <div
                                      key={img.id}
                                      onClick={() => setLightboxImage(toAttachmentUrl(img.tepDinhKem?.url))}
                                      className={`aspect-square rounded-lg overflow-hidden border cursor-pointer group ${
                                        darkMode
                                          ? 'border-slate-700 bg-slate-900'
                                          : 'border-gray-200 bg-gray-100'
                                      }`}
                                    >
                                      <img
                                        src={toAttachmentUrl(img.tepDinhKem?.url)}
                                        alt={img.noiDung}
                                        className="w-full h-full object-cover group-hover:scale-105 transition"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setChatSubTab('images')}
                                  className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                                    darkMode
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  Xem tất cả
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Section 3: File */}
                      <div className="px-4 py-3 space-y-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setInfoSections((prev) => ({ ...prev, files: !prev.files }))
                          }
                          className="w-full flex items-center justify-between text-xs font-bold"
                        >
                          <span>File</span>
                          <ChevronDown
                            className={`w-4 h-4 ${textMuted} transition-transform ${
                              infoSections.files ? '' : '-rotate-90'
                            }`}
                          />
                        </button>

                        {infoSections.files && (
                          <>
                            {sharedFiles.length === 0 ? (
                              <p className={`text-xs ${textMuted}`}>Chưa có file nào.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {sharedFiles.slice(-3).reverse().map((f) => (
                                  <a
                                    key={f.id}
                                    href={toAttachmentUrl(f.tepDinhKem?.url)}
                                    download={f.tepDinhKem?.fileName || f.noiDung}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`p-2 rounded-xl border flex items-center gap-2.5 transition ${
                                      darkMode
                                        ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70'
                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                    }`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        darkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                      }`}
                                    >
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold truncate">
                                        {f.tepDinhKem?.fileName || f.noiDung}
                                      </div>
                                      <div className={`text-[10px] truncate ${textMuted}`}>
                                        {formatFileSize(f.tepDinhKem?.fileSize)} • {formatTimeShort(f.taoLuc)}
                                      </div>
                                    </div>
                                  </a>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setChatSubTab('files')}
                                  className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                                    darkMode
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  Xem tất cả
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Section 4: Link */}
                      <div className="px-4 py-3 space-y-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setInfoSections((prev) => ({ ...prev, links: !prev.links }))
                          }
                          className="w-full flex items-center justify-between text-xs font-bold"
                        >
                          <span>Link</span>
                          <ChevronDown
                            className={`w-4 h-4 ${textMuted} transition-transform ${
                              infoSections.links ? '' : '-rotate-90'
                            }`}
                          />
                        </button>

                        {infoSections.links && (
                          <>
                            {sharedLinks.length === 0 ? (
                              <p className={`text-xs ${textMuted}`}>Chưa có link nào.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {(showAllLinksInDrawer ? sharedLinks : sharedLinks.slice(0, 3)).map(
                                  (lnk) => (
                                    <a
                                      key={lnk.id}
                                      href={lnk.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={lnk.url}
                                      className={`p-2 rounded-xl flex items-center gap-2.5 transition ${
                                        darkMode
                                          ? 'bg-slate-800/60 hover:bg-slate-800'
                                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200/80'
                                      }`}
                                    >
                                      <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                          darkMode
                                            ? 'bg-slate-700/80 text-sky-400'
                                            : 'bg-sky-50 text-sky-600'
                                        }`}
                                      >
                                        <Link2 className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold truncate">
                                          {lnk.hostname}
                                        </div>
                                        <div className={`text-[11px] truncate ${textMuted}`}>
                                          {lnk.hostname}
                                        </div>
                                      </div>
                                    </a>
                                  ),
                                )}
                                {sharedLinks.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllLinksInDrawer((v) => !v)}
                                    className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                                      darkMode
                                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                    }`}
                                  >
                                    {showAllLinksInDrawer ? 'Thu gọn' : 'Xem tất cả'}
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Section 5: Xoá cuộc trò chuyện & Rời nhóm */}
                      <div className="px-3 py-3 space-y-1">
                        <button
                          type="button"
                          onClick={() => setConfirmRoomAction({ type: 'delete_chat' })}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 transition ${
                            darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span>Xoá cuộc trò chuyện</span>
                        </button>

                        {activeRoom.loai === 'nhom' && (
                          <button
                            type="button"
                            onClick={() => setConfirmRoomAction({ type: 'leave_group' })}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 transition ${
                              darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                            }`}
                          >
                            <LogOut className="w-4 h-4 shrink-0" />
                            <span>Rời nhóm</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── MODAL 1: TẠO NHÓM CHAT MỚI ───────────────────────────────── */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-[#1a212e] border-slate-700 text-slate-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                darkMode ? 'border-slate-700/80' : 'border-gray-200'
              }`}
            >
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Tạo Nhóm Trò Chuyện Nội Bộ Mới</span>
              </h3>
              <button onClick={() => setShowCreateGroupModal(false)} className={textMuted}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSubtle}`}>
                  Tên nhóm Khoa/Phòng hoặc Tổ công tác *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Tổ Trực Cấp Cứu Cuối Tuần..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none focus:border-emerald-500 ${
                    darkMode
                      ? 'bg-[#11151c] border-slate-700 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSubtle}`}>
                  Mô tả mục đích nhóm
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="VD: Phối hợp xử lý ca khám và trực chuyên môn..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none focus:border-emerald-500 ${
                    darkMode
                      ? 'bg-[#11151c] border-slate-700 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${textSubtle}`}>
                    Chọn thành viên ({newGroupMembers.length} đã chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewGroupMembers(
                        newGroupMembers.length === staffDirectory.length
                          ? []
                          : staffDirectory.map((s) => s.id),
                      )
                    }
                    className="text-[11px] text-emerald-500 hover:underline font-medium"
                  >
                    {newGroupMembers.length === staffDirectory.length ? 'Bỏ chọn tất cả' : 'Chọn toàn viện'}
                  </button>
                </div>

                <div
                  className={`max-h-52 overflow-y-auto rounded-xl border divide-y p-1 ${
                    darkMode
                      ? 'bg-[#11151c] border-slate-700/80 divide-slate-800'
                      : 'bg-gray-50 border-gray-200 divide-gray-100'
                  }`}
                >
                  {staffDirectory
                    .filter((s) => Number(s.id) !== Number(user?.id))
                    .map((staff) => {
                      const checked = newGroupMembers.includes(staff.id);
                      return (
                        <label
                          key={staff.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${hoverItem}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewGroupMembers((prev) => [...prev, staff.id]);
                                } else {
                                  setNewGroupMembers((prev) => prev.filter((id) => id !== staff.id));
                                }
                              }}
                              className="rounded accent-emerald-500"
                            />
                            <div>
                              <div className="text-xs font-semibold">{staff.hoTen}</div>
                              <div className={`text-[10px] ${textMuted}`}>
                                {staff.chucVu} • {staff.khoaPhong}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Tạo nhóm ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: THÊM THÀNH VIÊN VÀO NHÓM ────────────────────────── */}
      {showAddMemberModal && activeRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-[#1a212e] border-slate-700 text-slate-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                darkMode ? 'border-slate-700/80' : 'border-gray-200'
              }`}
            >
              <h3 className="font-bold text-sm">Thêm thành viên vào {activeRoom.tenPhong}</h3>
              <button onClick={() => setShowAddMemberModal(false)} className={textMuted}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddMembersToGroup} className="p-5 space-y-4">
              <div
                className={`max-h-60 overflow-y-auto rounded-xl border p-1 divide-y ${
                  darkMode
                    ? 'bg-[#11151c] border-slate-700 divide-slate-800'
                    : 'bg-gray-50 border-gray-200 divide-gray-100'
                }`}
              >
                {staffDirectory.map((staff) => {
                  const alreadyIn = (activeRoom.members || []).some(
                    (m) => Number(m.id) === Number(staff.id),
                  );
                  const checked = alreadyIn || addMemberIds.includes(staff.id);
                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        alreadyIn ? 'opacity-50' : `${hoverItem} cursor-pointer`
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          disabled={alreadyIn}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddMemberIds((prev) => [...prev, staff.id]);
                            } else {
                              setAddMemberIds((prev) => prev.filter((id) => id !== staff.id));
                            }
                          }}
                          className="rounded accent-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-semibold">{staff.hoTen}</div>
                          <div className={`text-[10px] ${textMuted}`}>
                            {staff.chucVu} • {staff.khoaPhong}
                          </div>
                        </div>
                      </div>
                      {alreadyIn && <span className="text-[10px] text-emerald-500 font-medium">Đã trong nhóm</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: XÁC NHẬN XOÁ CUỘC TRÒ CHUYỆN / RỜI NHÓM ────────── */}
      {confirmRoomAction && activeRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode
                ? 'bg-[#1a212e] border-slate-700 text-slate-100'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                darkMode ? 'border-slate-700/80' : 'border-gray-200'
              }`}
            >
              <h3 className="font-bold text-sm flex items-center gap-2 text-red-500">
                {confirmRoomAction.type === 'delete_chat' ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xoá cuộc trò chuyện</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Rời khỏi nhóm trò chuyện</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmRoomAction(null)}
                className={textMuted}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className={`text-xs leading-relaxed ${textSubtle}`}>
                {confirmRoomAction.type === 'delete_chat' ? (
                  <>
                    Toàn bộ lịch sử tin nhắn trong cuộc trò chuyện{' '}
                    <strong className="font-bold">{activeRoom.tenPhong}</strong> sẽ bị xoá ở phía bạn
                    và không thể khôi phục. Các thành viên khác vẫn xem được bình thường.
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn rời khỏi nhóm{' '}
                    <strong className="font-bold">{activeRoom.tenPhong}</strong>? Sau khi rời nhóm,
                    bạn sẽ không nhận được tin nhắn mới trừ khi được thành viên khác mời lại.
                  </>
                )}
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={processingRoomAction}
                  onClick={() => setConfirmRoomAction(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={processingRoomAction}
                  onClick={handleConfirmRoomAction}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {processingRoomAction
                    ? 'Đang xử lý...'
                    : confirmRoomAction.type === 'delete_chat'
                    ? 'Xoá cuộc trò chuyện'
                    : 'Rời nhóm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX XEM ẢNH PHÓNG TO ───────────────────────────────── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 flex items-center gap-2 z-10"
          >
            <a
              href={lightboxImage}
              download
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Tải về</span>
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={lightboxImage}
            alt="Xem ảnh phóng to"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
          />
        </div>
      )}
    </div>
  );
}
