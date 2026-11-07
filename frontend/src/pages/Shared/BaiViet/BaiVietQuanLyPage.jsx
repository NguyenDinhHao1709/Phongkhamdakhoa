import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, CheckCircle2, AlertCircle, Clock,
  Eye, Edit2, Trash2, Send, CheckSquare, XCircle, RotateCcw,
  ExternalLink, Sparkles, Stethoscope, Image as ImageIcon, BookOpen, Layers,
  ChevronRight, ArrowLeft, UploadCloud, EyeOff
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../../services/api';
import useAuthStore from '../../../store/authStore';
import { BACKEND_URL, toBackendUrl } from '../../../utils/backendUrl';

const STATUS_MAP = {
  nhap:      { label: 'Bản nháp',     color: 'bg-slate-100 text-slate-700 border-slate-200' },
  cho_duyet: { label: 'Chờ duyệt',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  xuat_ban:  { label: 'Đã xuất bản',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tu_choi:   { label: 'Bị từ chối',   color: 'bg-rose-50 text-rose-700 border-rose-200' },
  an:        { label: 'Đã tạm ẩn',    color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const CHUYEN_KHOA_OPTIONS = [
  'Nội tổng quát',
  'Tim mạch',
  'Nhi khoa',
  'Tai Mũi Họng',
  'Cơ Xương Khớp',
  'Răng Hàm Mặt',
  'Mắt',
  'Dinh dưỡng',
  'Chẩn đoán hình ảnh',
  'Truyền thông phòng khám',
];

const SAMPLE_COVERS = [
  { label: 'Tim mạch', url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800' },
  { label: 'Dinh dưỡng', url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800' },
  { label: 'Nhi khoa', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800' },
  { label: 'Khám tổng quát', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800' },
  { label: 'Cận lâm sàng', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800' },
];

export default function BaiVietQuanLyPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);

  const [articles, setArticles] = useState([]);
  const [chuyenKhoaOptions, setChuyenKhoaOptions] = useState(CHUYEN_KHOA_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKhoa, setFilterKhoa] = useState('all');

  const [toast, setToast] = useState(null);

  // Modal Soạn / Sửa
  const [editModal, setEditModal] = useState({ open: false, mode: 'create', data: null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    tieuDe: '',
    chuyenKhoa: 'Nội tổng quát',
    tomTat: '',
    noiDung: '',
    anhDaiDien: '',
    trangThai: 'nhap',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal Phê Duyệt / Từ Chối (Ban Giám Đốc)
  const [approvalModal, setApprovalModal] = useState({ open: false, article: null, mode: 'duyet', reason: '' });
  const [approving, setApproving] = useState(false);

  // Modal Xác nhận xóa
  const [deleteModal, setDeleteModal] = useState({ open: false, article: null, loading: false });

  // Modal Xem trước bài viết
  const [previewModal, setPreviewModal] = useState(null);

  // Quyền: Ban Giám Đốc có toàn quyền quản trị và phê duyệt, Bác sĩ viết bài
  const userRole = user?.vai_tro || user?.vaiTro || user?.maVaiTro || '';
  const isDirector = userRole === 'ban_giam_doc';
  const isDoctor = userRole === 'bac_si';

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/bai-viet/noi-bo');
      const data = res?.data || res || [];
      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', 'Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    apiGet('/quan-ly/danh-muc-chuyen-khoa')
      .then((res) => {
        const list = res?.data || res;
        if (Array.isArray(list) && list.length > 0) {
          setChuyenKhoaOptions(list.map((c) => c.ten));
        }
      })
      .catch(() => {});
  }, []);

  // Upload file ảnh bìa lên máy chủ
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Kích thước tệp ảnh không được vượt quá 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${BACKEND_URL}/api/bai-viet/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Tải ảnh lên máy chủ thất bại');
      }

      const uploadedUrl = data?.data?.url || data?.url;
      if (!uploadedUrl) {
        throw new Error('Máy chủ không trả về đường dẫn ảnh');
      }

      setForm((prev) => ({ ...prev, anhDaiDien: toBackendUrl(uploadedUrl) }));
      showToast('success', 'Đã tải ảnh lên máy chủ thành công!');
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Lỗi khi tải file ảnh lên máy chủ');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Danh sách sau khi lọc
  const filteredList = useMemo(() => {
    return articles.filter((a) => {
      const matchSearch =
        !searchTerm ||
        a.tieuDe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tomTat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tenTacGia?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === 'all' || a.trangThai === filterStatus;
      const matchKhoa = filterKhoa === 'all' || a.chuyenKhoa === filterKhoa;

      return matchSearch && matchStatus && matchKhoa;
    });
  }, [articles, searchTerm, filterStatus, filterKhoa]);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setForm({
      tieuDe: '',
      chuyenKhoa: user?.chuyenKhoa || 'Nội tổng quát',
      tomTat: '',
      noiDung: `<p>Nhập nội dung tư vấn y khoa tại đây...</p>
<h3>1. Nguyên nhân & Triệu chứng nhận biết</h3>
<p>Mô tả các biểu hiện lâm sàng thường gặp...</p>
<h3>2. Lời khuyên phòng ngừa từ Bác sĩ</h3>
<p>Chế độ sinh hoạt khoa học và dinh dưỡng hợp lý...</p>`,
      anhDaiDien: '',
      trangThai: 'nhap',
    });
    setEditModal({ open: true, mode: 'create', data: null });
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (art) => {
    setForm({
      tieuDe: art.tieuDe || '',
      chuyenKhoa: art.chuyenKhoa || 'Nội tổng quát',
      tomTat: art.tomTat || '',
      noiDung: art.noiDung || '',
      anhDaiDien: toBackendUrl(art.anhDaiDien || ''),
      trangThai: art.trangThai || 'nhap',
    });
    setEditModal({ open: true, mode: 'edit', data: art });
  };

  // Lưu bài viết (Tạo mới hoặc Cập nhật)
  const handleSave = async (targetStatus) => {
    if (!form.tieuDe.trim()) {
      showToast('error', 'Vui lòng nhập tiêu đề bài viết');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        trangThai: targetStatus || form.trangThai,
      };

      if (editModal.mode === 'create') {
        const res = await apiPost('/bai-viet', payload);
        showToast('success', res?.message || 'Đã tạo bài viết thành công!');
      } else {
        const res = await apiPut(`/bai-viet/${editModal.data.id}`, payload);
        showToast('success', res?.message || 'Đã cập nhật bài viết thành công!');
      }

      setEditModal({ open: false, mode: 'create', data: null });
      fetchArticles();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi lưu bài viết');
    } finally {
      setSubmitting(false);
    }
  };

  // Bác sĩ gửi duyệt bài viết
  const handleSendForApproval = async (art) => {
    try {
      await apiPatch(`/bai-viet/${art.id}/gui-duyet`);
      showToast('success', `Đã gửi bài viết "${art.tieuDe}" lên Ban Giám Đốc chờ phê duyệt`);
      fetchArticles();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Không thể gửi duyệt bài viết');
    }
  };

  // Ban Giám Đốc phê duyệt hoặc trả lại
  const handleConfirmApproval = async () => {
    if (approvalModal.mode === 'tu_choi' && !approvalModal.reason.trim()) {
      showToast('error', 'Vui lòng nhập lý do yêu cầu tác giả chỉnh sửa');
      return;
    }
    setApproving(true);
    try {
      await apiPatch(`/bai-viet/${approvalModal.article.id}/phe-duyet`, {
        trangThai: approvalModal.mode === 'duyet' ? 'xuat_ban' : 'tu_choi',
        lyDoTuChoi: approvalModal.mode === 'tu_choi' ? approvalModal.reason.trim() : null,
      });
      showToast(
        'success',
        approvalModal.mode === 'duyet'
          ? 'Đã phê duyệt và xuất bản bài viết lên trang chủ!'
          : 'Đã trả về bài viết kèm phản hồi cho tác giả'
      );
      setApprovalModal({ open: false, article: null, mode: 'duyet', reason: '' });
      fetchArticles();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Lỗi khi phê duyệt');
    } finally {
      setApproving(false);
    }
  };

  // Ban Giám Đốc tạm ẩn bài viết đã xuất bản
  const handleToggleHide = async (art) => {
    try {
      await apiPut(`/bai-viet/${art.id}`, { trangThai: 'an' });
      showToast('success', `Đã tạm ẩn bài viết "${art.tieuDe}" khỏi trang công khai`);
      fetchArticles();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Không thể tạm ẩn bài viết');
    }
  };

  // Xác nhận xóa bài viết
  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiDelete(`/bai-viet/${deleteModal.article.id}`);
      showToast('success', 'Đã xóa bài viết thành công');
      setDeleteModal({ open: false, article: null, loading: false });
      fetchArticles();
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Không thể xóa bài viết');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Đếm số lượng theo trạng thái
  const counts = useMemo(() => {
    return {
      all: articles.length,
      xuat_ban: articles.filter((a) => a.trangThai === 'xuat_ban').length,
      cho_duyet: articles.filter((a) => a.trangThai === 'cho_duyet').length,
      nhap: articles.filter((a) => a.trangThai === 'nhap').length,
      tu_choi: articles.filter((a) => a.trangThai === 'tu_choi').length,
    };
  }, [articles]);

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-4 max-w-7xl mx-auto font-sans">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 transition-all animate-bounce-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-2">
            <BookOpen className="h-3.5 w-3.5" /> MEDICAL KNOWLEDGE & PATIENT EDUCATION
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {isDirector ? 'Ban Giám Đốc - Kiểm Duyệt & Quản Lý Bài Viết Y Khoa' : 'Cẩm Nang Y Khoa & Bài Viết Tư Vấn Sức Khỏe'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDoctor
              ? 'Chia sẻ kiến thức chuyên môn, hướng dẫn chăm sóc sức khỏe người bệnh và khẳng định uy tín y khoa.'
              : 'Thẩm quyền duy nhất phê duyệt, xuất bản tin tức phòng khám và chuẩn hóa nội dung giáo dục sức khỏe.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/#cam-nang-y-khoa"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary-600" />
            <span>Xem Mục Bài Viết Trang Chủ</span>
          </Link>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Soạn Bài Viết Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs by Status */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { id: 'all', label: 'Tất cả bài viết', count: counts.all },
          { id: 'xuat_ban', label: 'Đã xuất bản', count: counts.xuat_ban, color: 'text-emerald-700 bg-emerald-50' },
          { id: 'cho_duyet', label: 'Chờ phê duyệt', count: counts.cho_duyet, color: 'text-amber-700 bg-amber-50' },
          { id: 'nhap', label: 'Bản nháp', count: counts.nhap, color: 'text-slate-700 bg-slate-100' },
          { id: 'tu_choi', label: 'Bị từ chối', count: counts.tu_choi, color: 'text-rose-700 bg-rose-50' },
        ].map((tab) => {
          const isActive = filterStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : tab.color || 'bg-gray-100 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tiêu đề bài viết, tóm tắt, tên bác sĩ tác giả..."
            className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterKhoa}
            onChange={(e) => setFilterKhoa(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả chuyên khoa</option>
            {chuyenKhoaOptions.map((ck) => (
              <option key={ck} value={ck}>
                {ck}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Articles List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="font-medium">Đang tải danh sách bài viết...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm space-y-3">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-medium text-gray-600">Không tìm thấy bài viết nào phù hợp</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Bấm "Soạn Bài Viết Mới" để bắt đầu tạo nội dung tư vấn sức khỏe đầu tiên cho người bệnh.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Bài Viết & Tiêu Đề</th>
                  <th className="px-6 py-3.5">Chuyên Khoa</th>
                  <th className="px-6 py-3.5">Tác Giả</th>
                  <th className="px-6 py-3.5 text-center">Trạng Thái</th>
                  <th className="px-6 py-3.5 text-center">Lượt Xem</th>
                  <th className="px-6 py-3.5 text-right">Thao Tác Quản Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((art) => {
                  const st = STATUS_MAP[art.trangThai] || STATUS_MAP.nhap;
                  const isAuthor = art.tacGiaId === user?.id;
                  const canEdit = isDirector || (isDoctor && isAuthor && ['nhap', 'tu_choi'].includes(art.trangThai));
                  const canDelete = isDirector || (isDoctor && isAuthor && art.trangThai === 'nhap');

                  return (
                    <tr key={art.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Tiêu đề & Ảnh */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-start gap-3">
                          <img
                            src={toBackendUrl(art.anhDaiDien) || SAMPLE_COVERS[0].url}
                            alt=""
                            className="w-16 h-12 object-cover rounded-xl border border-gray-200 shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = SAMPLE_COVERS[0].url;
                            }}
                          />
                          <div className="space-y-1">
                            <h4
                              className="font-bold text-gray-900 text-sm line-clamp-1 hover:text-primary-600 cursor-pointer"
                              onClick={() => setPreviewModal(art)}
                            >
                              {art.tieuDe}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{art.tomTat || 'Chưa có tóm tắt'}</p>
                            {art.lyDoTuChoi && art.trangThai === 'tu_choi' && (
                              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Lý do từ chối: {art.lyDoTuChoi}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Chuyên khoa */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                          {art.chuyenKhoa || 'Đa khoa'}
                        </span>
                      </td>

                      {/* Tác giả */}
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-gray-900">{art.tenTacGia || 'Bác sĩ chuyên khoa'}</p>
                          {art.hocViTacGia && (
                            <p className="text-primary-700 font-medium text-[11px]">{art.hocViTacGia}</p>
                          )}
                          <p className="text-gray-400 text-[10px]">
                            {art.xuatBanLuc
                              ? `Ngày đăng: ${new Date(art.xuatBanLuc).toLocaleDateString('vi-VN')}`
                              : 'Chưa xuất bản'}
                          </p>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Lượt xem */}
                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-gray-700">
                        <div className="inline-flex items-center gap-1 text-slate-500">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{art.luotXem || 0}</span>
                        </div>
                      </td>

                      {/* Thao tác quản lý */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => setPreviewModal(art)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Xem chi tiết nội dung"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Bác sĩ gửi duyệt bài nháp */}
                          {isDoctor && art.trangThai === 'nhap' && (
                            <button
                              type="button"
                              onClick={() => handleSendForApproval(art)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold border border-amber-200 flex items-center gap-1 transition-colors"
                              title="Gửi Ban Giám Đốc phê duyệt"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Gửi duyệt</span>
                            </button>
                          )}

                          {/* 3. Ban Giám Đốc: Duyệt & Trả lại (khi bài chờ duyệt) */}
                          {isDirector && art.trangThai === 'cho_duyet' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApprovalModal({ open: true, article: art, mode: 'duyet', reason: '' })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors"
                                title="Phê duyệt và xuất bản ngay"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setApprovalModal({ open: true, article: art, mode: 'tu_choi', reason: '' })}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 flex items-center gap-1 transition-colors"
                                title="Trả lại bài viết cho tác giả"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Trả lại</span>
                              </button>
                            </>
                          )}

                          {/* 4. Ban Giám Đốc: Tạm ẩn bài đã xuất bản */}
                          {isDirector && art.trangThai === 'xuat_ban' && (
                            <button
                              type="button"
                              onClick={() => handleToggleHide(art)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Tạm ẩn khỏi trang chủ"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}

                          {/* 5. Ban Giám Đốc: Đăng lại bài đã ẩn hoặc bị từ chối */}
                          {isDirector && (art.trangThai === 'an' || art.trangThai === 'tu_choi') && (
                            <button
                              type="button"
                              onClick={() => setApprovalModal({ open: true, article: art, mode: 'duyet', reason: '' })}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors"
                              title="Xuất bản lại lên trang chủ"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>Đăng lại</span>
                            </button>
                          )}

                          {/* 6. Chỉnh sửa */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(art)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Chỉnh sửa nội dung"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* 7. Xóa */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteModal({ open: true, article: art, loading: false })}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa bài viết"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL SOẠN THẢO / CHỈNH SỬA ────────────────────────────── */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[calc(100vh-2rem)] flex flex-col p-6 shadow-2xl border border-gray-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {editModal.mode === 'create' ? 'Soạn Thảo Bài Viết Y Khoa Mới' : 'Chỉnh Sửa Bài Viết'}
                </h3>
              </div>
              <button
                onClick={() => setEditModal({ open: false, mode: 'create', data: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-4 overflow-y-auto pr-1"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tiêu Đề Bài Viết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 5 Thói quen đơn giản giúp phòng ngừa tăng huyết áp tại nhà..."
                  value={form.tieuDe}
                  onChange={(e) => setForm({ ...form, tieuDe: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chuyên Khoa Phụ Trách
                </label>
                <select
                  value={form.chuyenKhoa}
                  onChange={(e) => setForm({ ...form, chuyenKhoa: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  {chuyenKhoaOptions.map((ck) => (
                    <option key={ck} value={ck}>
                      {ck}
                    </option>
                  ))}
                </select>
              </div>

              {/* ─── TẢI ẢNH BÌA LÊN MÁY CHỦ (KHÔNG CẦN NHẬP LINK) ─── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Ảnh Bìa Đại Diện Bài Viết
                </label>

                {/* Input file ẩn */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {form.anhDaiDien ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-slate-50 group">
                    <img
                      src={form.anhDaiDien}
                      alt="Ảnh bìa bài viết"
                      className="w-full h-44 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = SAMPLE_COVERS[0].url;
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-gray-800 text-xs font-bold shadow-md hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-primary-600" />
                        <span>Đổi ảnh khác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, anhDaiDien: '' })}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Xóa ảnh</span>
                      </button>
                    </div>
                    <div className="p-2.5 bg-white border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 truncate max-w-xs font-mono">{form.anhDaiDien}</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary-600 font-bold hover:underline"
                      >
                        Tải ảnh mới từ máy tính
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      uploadingImage
                        ? 'border-primary-400 bg-primary-50/50'
                        : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50/20'
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-primary-600">
                        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <p className="text-xs font-bold">Đang tải ảnh lên máy chủ...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-xs mx-auto">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Bấm vào đây để tải ảnh từ máy tính lên</p>
                          <p className="text-xs text-gray-400 mt-0.5">Hỗ trợ JPG, PNG, WEBP, GIF (Dung lượng tối đa 10MB)</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-xs hover:bg-primary-700 transition-colors mt-1">
                          <Plus className="w-4 h-4" /> Chọn tệp hình ảnh
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Gợi ý mẫu ảnh có sẵn */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 font-semibold">Hoặc chọn nhanh ảnh minh họa chuyên khoa:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_COVERS.map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => setForm({ ...form, anhDaiDien: sc.url })}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        form.anhDaiDien === sc.url
                          ? 'bg-primary-50 text-primary-700 border-primary-300 ring-2 ring-primary-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tóm Tắt Ngắn Gọn (Hiển thị ở danh sách bài viết trang chủ)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tóm tắt ngắn gọn khoảng 2-3 câu để người bệnh dễ nắm bắt ý chính..."
                  value={form.tomTat}
                  onChange={(e) => setForm({ ...form, tomTat: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Nội Dung Bài Viết Chi Tiết <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">Hỗ trợ HTML / Đoạn văn y khoa</span>
                </div>
                <textarea
                  rows={9}
                  required
                  placeholder="Nhập nội dung tư vấn chi tiết từ Bác sĩ..."
                  value={form.noiDung}
                  onChange={(e) => setForm({ ...form, noiDung: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, mode: 'create', data: null })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSave('nhap')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    Lưu bản nháp
                  </button>

                  {isDoctor && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSave('cho_duyet')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Ban Giám Đốc Duyệt</span>
                    </button>
                  )}

                  {isDirector && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSave('xuat_ban')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Xuất Bản Ngay</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL PHÊ DUYỆT / TỪ CHỐI (BAN GIÁM ĐỐC) ─────────────── */}
      {approvalModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  approvalModal.mode === 'duyet'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {approvalModal.mode === 'duyet' ? <CheckSquare className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {approvalModal.mode === 'duyet'
                  ? 'Phê Duyệt & Xuất Bản Bài Viết'
                  : 'Yêu Cầu Chỉnh Sửa Bài Viết'}
              </h3>
            </div>

            <p className="text-xs text-gray-600">
              Bài viết: <strong className="text-gray-900">"{approvalModal.article?.tieuDe}"</strong>
              <br />
              Tác giả: <span className="font-semibold text-primary-700">{approvalModal.article?.tenTacGia}</span>
            </p>

            {approvalModal.mode === 'tu_choi' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Lý do yêu cầu sửa đổi (Gửi phản hồi cho tác giả) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={approvalModal.reason}
                  onChange={(e) => setApprovalModal({ ...approvalModal, reason: e.target.value })}
                  placeholder="Ví dụ: Cần bổ sung liều lượng an toàn hoặc trích dẫn phác đồ điều trị Bộ Y Tế..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setApprovalModal({ open: false, article: null, mode: 'duyet', reason: '' })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleConfirmApproval}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  approvalModal.mode === 'duyet'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {approving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{approvalModal.mode === 'duyet' ? 'Xác Nhận Xuất Bản' : 'Gửi Yêu Cầu Sửa Đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM TRƯỚC BÀI VIẾT (PREVIEW) ────────────────────── */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-xs font-bold text-primary-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {previewModal.chuyenKhoa || 'Đa khoa'}
              </span>
              <button
                onClick={() => setPreviewModal(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {previewModal.tieuDe}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 border-b">
              <span>Tác giả: <strong className="text-slate-800">{previewModal.tenTacGia || 'Bác sĩ chuyên khoa'}</strong></span>
              <span>•</span>
              <span>Lượt xem: {previewModal.luotXem || 0}</span>
            </div>

            {previewModal.anhDaiDien && (
              <img
                src={toBackendUrl(previewModal.anhDaiDien)}
                alt=""
                className="w-full h-56 object-cover rounded-xl border border-slate-200"
                onError={(e) => {
                  e.currentTarget.src = SAMPLE_COVERS[0].url;
                }}
              />
            )}

            {previewModal.tomTat && (
              <div className="rounded-xl bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed border-l-4 border-primary-500 italic">
                "{previewModal.tomTat}"
              </div>
            )}

            <div
              className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: previewModal.noiDung || '' }}
            />

            <div className="flex items-center justify-end pt-3 border-t">
              <button
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL XÁC NHẬN XÓA ───────────────────────────────────── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Xác Nhận Xóa / Ẩn Bài Viết?</h3>
            <p className="text-xs text-gray-500">
              Bạn có chắc chắn muốn xóa bài viết{' '}
              <strong className="text-gray-900">"{deleteModal.article?.tieuDe}"</strong>?
            </p>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, article: null, loading: false })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteModal.loading}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {deleteModal.loading ? 'Đang xử lý...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
