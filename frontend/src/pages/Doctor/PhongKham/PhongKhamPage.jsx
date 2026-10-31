


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MedCard } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import {
  Stethoscope, AlertTriangle, FileText, ClipboardList, FlaskConical,
  CheckCircle2, ChevronRight, Activity, Plus, X, HeartPulse, Pill, Calendar, Clock, Search, Sparkles, Printer, Trash2, Volume2, Tv, Compass, MessageSquare
} from 'lucide-react';
import { parseAttachmentUrls, toAttachmentUrl } from '../../../utils/fileAttachments';
import { getFallbackServiceConfig, parseResultConfig, evaluateLabValue } from '../../../utils/labConfig';
import InPhieuKhamModal from '../../../components/Print/InPhieuKhamModal';
import InDonThuocModal from '../../../components/Print/InDonThuocModal';
import ChiTietKetQuaXetNghiemRenderer from '../../../components/Lab/ChiTietKetQuaXetNghiemRenderer';


function useHangDoi() {
  return useQuery({
    queryKey: ['tiep-nhan', 'hang-doi'],
    queryFn: () => apiGet('/tiep-nhan/hang-doi'),
    refetchInterval: 2500, // Tự động cập nhật mỗi 2.5s (dưới 3s)
  });
}

export default function PhongKhamPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chiDinhIdParam = searchParams.get('chiDinhId');
  const tabParam = searchParams.get('tab');

  const { data, isLoading } = useHangDoi();
  const [selectedLuot, setSelectedLuot] = useState(null);
  const items = data?.data || [];
  const dangKham = items.filter((i) => i.trangThai === 'dang_kham');
  const daCoKq = items.filter((i) => i.trangThai === 'da_co_kq_cls');
  const dangCls = items.filter((i) => i.trangThai === 'dang_cls');
  const choKham = items.filter((i) => i.trangThai === 'cho_kham');

  // Khôi phục lượt khám đang chọn từ sessionStorage khi chuyển qua lại giữa các trang trên menu
  useEffect(() => {
    if (!selectedLuot && items.length > 0 && !chiDinhIdParam) {
      const savedLuotId = sessionStorage.getItem('phong_kham_selected_luot_id');
      if (savedLuotId) {
        const matched = items.find((i) => String(i.id) === String(savedLuotId));
        if (matched) {
          setSelectedLuot(matched);
        }
      }
    }
  }, [items, selectedLuot, chiDinhIdParam]);

  const handleSelectLuot = (luot) => {
    setSelectedLuot(luot);
    if (luot?.id) {
      sessionStorage.setItem('phong_kham_selected_luot_id', String(luot.id));
    } else {
      sessionStorage.removeItem('phong_kham_selected_luot_id');
    }
  };

  // Nếu chuyển sang từ Thông báo xét nghiệm (có chiDinhId)
  const { data: cdData } = useQuery({
    queryKey: ['chi-dinh-direct', chiDinhIdParam],
    queryFn: () => apiGet(`/xet-nghiem/chi-dinh/${chiDinhIdParam}`),
    enabled: !!chiDinhIdParam,
  });

  useEffect(() => {
    if (cdData?.data?.chiDinh) {
      const cd = cdData.data.chiDinh;
      const bak = cd.benhAnKham;
      const luotId = bak?.luotTiepNhanId;
      const matchingLuot = items.find(
        (i) => i.id === luotId || i.benhNhan?.id === bak?.hoSoBenhAn?.benhNhan?.id,
      );
      if (matchingLuot) {
        setSelectedLuot(matchingLuot);
      } else if (bak?.hoSoBenhAn?.benhNhan) {
        setSelectedLuot({
          id: luotId,
          maSoThuTu: 'CLS',
          trangThai: bak.trangThai || 'dang_kham',
          benhNhan: bak.hoSoBenhAn.benhNhan,
        });
      }
    }
  }, [cdData, items]);

  const currentLuot = selectedLuot
    ? items.find((i) => i.id === selectedLuot.id) || selectedLuot
    : (dangKham[0] || daCoKq[0] || choKham[0] || dangCls[0] || null);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-7rem)] animate-fade-in pb-2">
      {/* Left: Patient Queue */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary-600" /> Hàng đợi
          </h2>
          <a
            href="/man-hinh-goi-so"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
            title="Mở màn hình TV gọi số sang tab mới"
          >
            <Tv className="w-3.5 h-3.5 text-blue-600" /> TV Sảnh
          </a>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-56 lg:max-h-none">
          {isLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải danh sách...</p>}

          {/* 1. Đang khám */}
          {dangKham.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider px-1">
                Đang khám ({dangKham.length})
              </span>
              {dangKham.map((luot) => (
                <PatientCard
                  key={luot.id}
                  luot={luot}
                  isSelected={currentLuot?.id === luot.id}
                  onSelect={() => handleSelectLuot(luot)}
                />
              ))}
            </div>
          )}

          {/* 2. Đã có kết quả CLS (Cần vào lại để bác sĩ kết luận) */}
          {daCoKq.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider px-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-600" /> Đã có KQ CLS ({daCoKq.length})
              </span>
              {daCoKq.map((luot) => (
                <PatientCard
                  key={luot.id}
                  luot={luot}
                  isSelected={currentLuot?.id === luot.id}
                  onSelect={() => handleSelectLuot(luot)}
                />
              ))}
            </div>
          )}

          {/* 3. Đang làm xét nghiệm / cận lâm sàng */}
          {dangCls.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider px-1 flex items-center gap-1">
                <FlaskConical className="h-3 w-3 text-purple-600" /> Đang làm CLS ({dangCls.length})
              </span>
              {dangCls.map((luot) => (
                <PatientCard
                  key={luot.id}
                  luot={luot}
                  isSelected={currentLuot?.id === luot.id}
                  onSelect={() => handleSelectLuot(luot)}
                />
              ))}
            </div>
          )}

          {/* 4. Chờ khám */}
          {choKham.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
                Chờ khám ban đầu ({choKham.length})
              </span>
              {choKham.map((luot) => (
                <PatientCard
                  key={luot.id}
                  luot={luot}
                  isSelected={currentLuot?.id === luot.id}
                  onSelect={() => handleSelectLuot(luot)}
                />
              ))}
            </div>
          )}

          {items.length === 0 && !isLoading && (
            <p className="text-center text-sm text-gray-400 py-8">Hôm nay không có bệnh nhân nào trong hàng đợi</p>
          )}
        </div>
      </div>

      {/* Right: Clinical Examination Main Panel */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-1">
        {currentLuot ? (
          <KhamBenhPanel
            key={currentLuot.id}
            luot={currentLuot}
            initialTab={tabParam}
            onComplete={() => handleSelectLuot(null)}
            onUpdateLuot={(updated) => handleSelectLuot(updated)}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <div>
              <Stethoscope className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">Chưa chọn bệnh nhân</h3>
              <p className="mt-1 text-sm text-gray-400">Chọn 1 bệnh nhân ở danh sách hàng đợi bên trái để bắt đầu khám bệnh</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ luot, isSelected, onSelect }) {
  const bn = luot.benhNhan || {};
  const isDangKham = luot.trangThai === 'dang_kham';
  const ageStr = tinhTuoi(bn.ngaySinh);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary-500 bg-blue-50/80 ring-2 ring-primary-500/20 shadow-xs'
          : isDangKham
          ? 'border-primary-200 bg-primary-50/40 hover:bg-primary-50/70'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-primary-700">{luot.maSoThuTu}</span>
        <StatusBadge status={luot.trangThai} size="sm" />
      </div>

      <p className="font-semibold text-gray-900 text-sm truncate">{bn.hoTen || 'Chưa cập nhật tên'}</p>

      <p className="text-xs text-gray-500 mt-0.5">
        {bn.maBenhNhan}
        {ageStr && ` · ${ageStr}`}
        {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
      </p>

      {bn.diUng && (
        <p className="mt-1.5 text-xs text-red-600 font-medium truncate flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" /> Dị ứng: {bn.diUng}
        </p>
      )}
    </div>
  );
}

function KhamBenhPanel({ luot, initialTab, onComplete, onUpdateLuot }) {
  const qc = useQueryClient();
  const bn = luot.benhNhan || {};
  const [tab, setTab] = useState(initialTab || 'kham');

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showChiDinhModal, setShowChiDinhModal] = useState(false);
  const [showDonThuocModal, setShowDonThuocModal] = useState(false);
  const [showTaiKhamModal, setShowTaiKhamModal] = useState(false);
  const [showInPhieuKham, setShowInPhieuKham] = useState(false);
  const [showInDonThuoc, setShowInDonThuoc] = useState(false);

  const draftStorageKey = `phong_kham_draft_luot_${luot?.id}`;

  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`phong_kham_draft_luot_${luot?.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      trieuChung: '', chanDoanSoBo: '', chanDoanXacDinh: '',
      ketQuaKham: '', phuongPhapDieuTri: '', taiKham: '', ghiChu: '',
    };
  });
  const [benhAnId, setBenhAnId] = useState(null);

  // Lưu tức thời mọi thay đổi trên form Khám lâm sàng vào sessionStorage để chuyển tab / chuyển trang không bao giờ bị mất
  useEffect(() => {
    if (!luot?.id) return;
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(form));
    } catch {}
  }, [form, luot?.id, draftStorageKey]);

  // Tự động tìm phiếu khám hiện tại của lượt tiếp nhận này
  const { data: bakData } = useQuery({
    queryKey: ['benh-an-kham-luot', luot?.id],
    queryFn: () => apiGet(`/ho-so-benh-an/benh-an-kham/luot/${luot.id}`),
    enabled: !!luot?.id,
  });

  useEffect(() => {
    if (bakData?.data) {
      const b = bakData.data;
      setBenhAnId(b.id);
      setForm((prev) => ({
        ...prev,
        // Ưu tiên giữ nguyên dữ liệu Bác sĩ đang gõ trên giao diện (prev), chỉ lấy từ server nếu ô đang trống
        trieuChung: prev.trieuChung || b.trieuChung || '',
        chanDoanSoBo: prev.chanDoanSoBo || b.chanDoanSoBo || '',
        chanDoanXacDinh: prev.chanDoanXacDinh || b.chanDoanXacDinh || '',
        ketQuaKham: prev.ketQuaKham || b.ketQuaKham || '',
        phuongPhapDieuTri: prev.phuongPhapDieuTri || b.phuongPhapDieuTri || '',
        taiKham: prev.taiKham || (b.taiKham ? b.taiKham.split('T')[0] : ''),
        ghiChu: prev.ghiChu || b.ghiChu || '',
      }));
    } else {
      setBenhAnId(null);
    }
  }, [bakData, luot?.id]);

  // Tự động đồng bộ bản nháp xuống CSDL (debounced 1.2s) khi đã có benhAnId
  useEffect(() => {
    const activeId = benhAnId || bakData?.data?.id;
    if (!activeId) return;
    const hasAnyContent =
      form.trieuChung ||
      form.chanDoanSoBo ||
      form.chanDoanXacDinh ||
      form.ketQuaKham ||
      form.phuongPhapDieuTri ||
      form.ghiChu;
    if (!hasAnyContent) return;

    const timer = setTimeout(() => {
      const payload = { ...form };
      if (!payload.taiKham || !payload.taiKham.trim()) delete payload.taiKham;
      apiPatch(`/ho-so-benh-an/benh-an-kham/${activeId}`, payload).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [form, benhAnId, bakData?.data?.id]);

  // Sinh hiệu
  const { data: shData, refetch: refetchSinhHieu } = useQuery({
    queryKey: ['sinh-hieu', luot.id],
    queryFn: () => apiGet(`/tiep-nhan/${luot.id}/sinh-hieu`),
  });
  const sinhHieu = shData?.data;

  // Lấy đơn thuốc để in
  const { data: donThuocPrintData } = useQuery({
    queryKey: ['don-thuoc-benh-an', benhAnId],
    queryFn: () => apiGet(`/nha-thuoc/don-thuoc?benhAnKhamId=${benhAnId}`),
    enabled: !!benhAnId,
  });
  const currentDonThuoc = donThuocPrintData?.data?.[0];

  // Lấy danh sách xét nghiệm để in
  const { data: xnPrintData } = useQuery({
    queryKey: ['xn-benh-an', benhAnId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnId}`),
    enabled: !!benhAnId,
  });
  const currentDsXn = (xnPrintData?.data || []).map((x) => {
    let ketQuaText = 'Chờ KQ';
    if (x.ketQua) {
      let chiTiet = {};
      try {
        const raw = x.ketQua.ketQuaChiTiet || x.ketQua.ket_qua_chi_tiet;
        chiTiet = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
      } catch {}
      if (Object.keys(chiTiet).length > 0) {
        ketQuaText = Object.entries(chiTiet).map(([k, v]) => `${k}: ${v}`).join('; ');
      } else {
        ketQuaText = `${x.ketQua.giaTri || ''} ${x.ketQua.donVi || ''}`.trim() || 'Đã có KQ';
      }
    }
    return {
      tenDichVu: x.chiDinh?.dichVu?.tenDichVu,
      ketQua: ketQuaText,
      ghiChuKetQua: x.ketQua?.nhanXet || '',
    };
  });

  // Tạo phiếu khám
  const createMut = useMutation({
    mutationFn: () => apiPost(`/ho-so-benh-an/benh-an-kham/${bn.id}`, { luotTiepNhanId: luot.id, hinhThucKham: 'truc_tiep' }),
    onSuccess: (res) => {
      if (res?.data?.id) setBenhAnId(res.data.id);
      qc.invalidateQueries(['benh-an-kham-luot', luot?.id]);
    },
  });

  // Kết thúc khám
  const finishMut = useMutation({
    mutationFn: async () => {
      let activeId = benhAnId;
      if (!activeId) {
        // Tự động tạo/lấy phiếu khám nếu chưa bấm "Bắt đầu khám"
        const res = await createMut.mutateAsync();
        activeId = res?.data?.id;
      }
      if (!activeId) {
        throw new Error('KHONG_TAO_DUOC_BENH_AN');
      }
      if (!form.chanDoanXacDinh || !form.chanDoanXacDinh.trim()) {
        throw new Error('CHUA_NHAP_CHAN_DOAN_XAC_DINH');
      }
      const payload = { ...form };
      if (!payload.taiKham || !payload.taiKham.trim()) delete payload.taiKham;
      return apiPatch(`/ho-so-benh-an/benh-an-kham/${activeId}/ket-thuc`, payload);
    },
    onSuccess: () => {
      try {
        sessionStorage.removeItem(draftStorageKey);
        sessionStorage.removeItem(`phong_kham_rag_${luot?.id}`);
      } catch {}
      qc.invalidateQueries(['tiep-nhan']);
      onComplete();
    },
    onError: (err) => {
      if (err.message === 'CHUA_NHAP_CHAN_DOAN_XAC_DINH') {
        alert('⚠️ BẮT BUỘC CHẨN ĐOÁN ICD-10:\nVui lòng nhập "Chẩn đoán xác định" (kèm mã bệnh ICD-10) ở Tab Khám lâm sàng trước khi Kết thúc khám!');
        setTab('kham');
      } else if (err.message === 'KHONG_TAO_DUOC_BENH_AN') {
        alert('Không thể tạo phiếu khám cho bệnh nhân này. Vui lòng bấm nút "Bắt đầu khám" trước!');
      } else {
        console.error('Error in finishMut:', err);
        alert('Lỗi kết thúc khám. Vui lòng kiểm tra dữ liệu và thử lại.');
      }
    },
  });

  const handleSaveDraft = async () => {
    try {
      let activeId = benhAnId;
      if (!activeId) {
        const res = await createMut.mutateAsync();
        activeId = res?.data?.id;
      }
      if (activeId) {
        await apiPatch(`/ho-so-benh-an/benh-an-kham/${activeId}`, form);
        alert('Đã lưu nháp hồ sơ khám thành công!');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu nháp hồ sơ. Vui lòng thử lại.');
    }
  };

  const handleOpenDonThuoc = async () => {
    let activeId = benhAnId;
    if (!activeId) {
      const res = await handleBatDauKham();
      activeId = res?.data?.id;
    }
    if (!form.chanDoanXacDinh || !form.chanDoanXacDinh.trim()) {
      alert('⚠️ BẮT BUỘC CHẨN ĐOÁN ICD-10:\nVui lòng nhập "Chẩn đoán xác định" (kèm mã bệnh ICD-10) ở Tab Khám lâm sàng trước khi Kê đơn thuốc!');
      setTab('kham');
      return;
    }
    setShowDonThuocModal(true);
  };


  const handleBatDauKham = async () => {
    try {
      if (luot.trangThai !== 'dang_kham') {
        await apiPatch(`/tiep-nhan/${luot.id}/trang-thai`, { trangThai: 'dang_kham' }).catch(() => {});
        onUpdateLuot({ ...luot, trangThai: 'dang_kham' });
      }
      const res = await createMut.mutateAsync();
      const newId = res?.data?.id || res?.id || bakData?.data?.id;
      if (newId) {
        setBenhAnId(newId);
      }
      qc.invalidateQueries(['tiep-nhan']);
      qc.invalidateQueries(['benh-an-kham-luot', luot?.id]);
      return newId;
    } catch (err) {
      console.error(err);
      const fallbackId = bakData?.data?.id;
      if (fallbackId) {
        setBenhAnId(fallbackId);
        return fallbackId;
      }
    }
  };

  const TABS = [
    { key: 'kham', label: 'Khám lâm sàng', icon: Stethoscope },
    { key: 'xn', label: 'Xét nghiệm & CLS', icon: FlaskConical },
    { key: 'don_thuoc', label: 'Đơn thuốc', icon: Pill },
    { key: 'lich_su', label: 'Lịch sử khám', icon: FileText },
  ];

  const ageStr = tinhTuoi(bn.ngaySinh);
  const activeBenhAnId = benhAnId || bakData?.data?.id;

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <MedCard allergyNote={bn.diUng}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{bn.hoTen}</h2>
              <StatusBadge status={luot.trangThai} />
            </div>
            <p className="text-sm text-gray-500">
              Mã BN: <span className="font-semibold text-gray-700">{bn.maBenhNhan}</span>
              {ageStr && ` · ${ageStr}`}
              {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
              {bn.soDienThoai && ` · SĐT: ${bn.soDienThoai}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {luot.trangThai === 'cho_kham' && !activeBenhAnId ? (
              <MedButton
                variant="primary"
                onClick={handleBatDauKham}
                loading={createMut.isLoading}
              >
                Bắt đầu khám
              </MedButton>
            ) : luot.trangThai === 'da_co_kq_cls' ? (
              <MedButton
                variant="primary"
                onClick={handleBatDauKham}
                loading={createMut.isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Tiếp tục khám (Đã có KQ)
              </MedButton>
            ) : null}
            {['cho_kham', 'dang_kham'].includes(luot.trangThai) && (
              <MedButton
                variant="outline"
                size="sm"
                leftIcon={<Volume2 className="h-4 w-4 text-blue-600" />}
                onClick={async () => {
                  try {
                    const result = await apiPost(`/tiep-nhan/${luot.id}/goi-loa`);
                    onUpdateLuot({ ...luot, trangThai: 'dang_kham' });
                    if (!activeBenhAnId) {
                      await handleBatDauKham();
                    }
                    qc.invalidateQueries(['tiep-nhan']);
                    alert(result?.message || `Đã gọi bệnh nhân ${bn.hoTen} (${luot.maSoThuTu}).`);
                  } catch (e) {
                    console.error(e);
                    alert(e?.message || 'Không thể gọi bệnh nhân. Vui lòng kiểm tra trạng thái lượt khám.');
                  }
                }}
              >
                {luot.trangThai === 'cho_kham' ? 'Gọi bệnh nhân' : 'Gọi lại'}
              </MedButton>
            )}
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<FlaskConical className="h-4 w-4 text-purple-600" />}
              onClick={async () => {
                let currentId = activeBenhAnId;
                if (!currentId) {
                  currentId = await handleBatDauKham();
                }
                if (!currentId) {
                  try {
                    const res = await apiPost(`/ho-so-benh-an/benh-an-kham/${bn.id}`, {
                      luotTiepNhanId: luot.id,
                      hinhThucKham: 'truc_tiep',
                    });
                    currentId = res?.data?.id || res?.id;
                  } catch (e) {
                    console.error('Không thể tạo phiếu khám:', e);
                  }
                }
                if (currentId) {
                  setBenhAnId(currentId);
                }
                setShowChiDinhModal(true);
              }}
            >
              + Chỉ định cận lâm sàng
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Pill className="h-4 w-4 text-emerald-600" />}
              onClick={handleOpenDonThuoc}
            >
              + Kê đơn thuốc
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Calendar className="h-4 w-4 text-blue-600" />}
              onClick={() => setShowTaiKhamModal(true)}
            >
              + Hẹn tái khám
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-4 w-4 text-blue-600" />}
              onClick={() => setShowInPhieuKham(true)}
            >
              In Phiếu Khám
            </MedButton>
            <MedButton
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-4 w-4 text-emerald-600" />}
              onClick={() => {
                if (!currentDonThuoc) {
                  alert('Chưa có đơn thuốc nào được lập cho lượt khám này. Vui lòng bấm "Kê đơn thuốc" trước.');
                  return;
                }
                setShowInDonThuoc(true);
              }}
            >
              In Đơn Thuốc
            </MedButton>
          </div>
        </div>
      </MedCard>

      {/* Sinh hiệu */}
      <MedCard
        title="Sinh hiệu"
        action={
          <button
            type="button"
            onClick={() => setShowVitalsModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Cập nhật
          </button>
        }
      >
        {sinhHieu ? (
          <VitalsCard data={sinhHieu} />
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500">Chưa ghi nhận sinh hiệu</p>
            </div>
            <button
              type="button"
              onClick={() => setShowVitalsModal(true)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 border border-primary-300 hover:border-primary-400 bg-white px-3.5 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Đo & Cập nhật ngay
            </button>
          </div>
        )}
      </MedCard>

      {/* Tabs */}
      {true && (
        <>
          <div className="flex border-b border-gray-200">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  tab === key
                    ? 'border-primary-600 text-primary-700 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className={tab === 'kham' ? 'block' : 'hidden'}>
            <MedCard>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); finishMut.mutate(); }}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-gray-700">Triệu chứng</label>
                  </div>
                  <textarea
                    rows={3}
                    value={form.trieuChung}
                    onChange={(e) => setForm((f) => ({ ...f, trieuChung: e.target.value }))}
                    placeholder="Mô tả triệu chứng bệnh nhân (VD: Đau đầu, chóng mặt, huyết áp cao; hoặc đau thượng vị, ợ chua...)"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* ─── TRỤ CỘT AI 3.1: RAG TRÊN PHÁC ĐỒ CHẨN ĐOÁN & ĐIỀU TRỊ BỘ Y TẾ ─── */}
                <ClinicalRagAssistantPanel
                  benhAnKhamId={activeBenhAnId}
                  luotTiepNhanId={luot.id}
                  trieuChung={form.trieuChung}
                  chanDoanSoBo={form.chanDoanSoBo}
                  chanDoanXacDinh={form.chanDoanXacDinh}
                  sinhHieu={sinhHieu}
                  diUng={bn.diUng}
                  onApplyProtocol={(suggested) => {
                    setForm((prev) => ({
                      ...prev,
                      chanDoanSoBo: suggested.chanDoanSoBoGoiY || prev.chanDoanSoBo,
                      chanDoanXacDinh: suggested.chanDoanXacDinhGoiY || prev.chanDoanXacDinh,
                      ketQuaKham: suggested.ketQuaKhamGoiY || prev.ketQuaKham,
                      phuongPhapDieuTri: suggested.phuongPhapDieuTriGoiY || prev.phuongPhapDieuTri,
                      ghiChu: suggested.ghiChuGoiY || prev.ghiChu,
                    }));
                  }}
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chẩn đoán sơ bộ</label>
                  <textarea
                    rows={2}
                    value={form.chanDoanSoBo}
                    onChange={(e) => setForm((f) => ({ ...f, chanDoanSoBo: e.target.value }))}
                    placeholder="Nhập chẩn đoán ban đầu (trước khi làm cận lâm sàng)..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Chẩn đoán xác định + ICD-10 (bắt buộc) */}
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-900">
                      Chẩn đoán xác định <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 ml-1">* Bắt buộc kèm mã ICD-10</span>
                    </label>
                  </div>

                  {/* Danh sách thẻ ICD-10 chọn nhanh */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-blue-800 mr-1">⚡ Mã ICD-10 hay dùng:</span>
                    {[
                      'J00 - Viêm mũi họng cấp',
                      'J20 - Viêm phế quản cấp',
                      'K29.5 - Viêm dạ dày mạn',
                      'I10 - Tăng huyết áp vô căn',
                      'E11 - Đái tháo đường typ 2',
                      'A09 - Viêm dạ dày ruột cấp',
                      'M54.5 - Đau lưng thắt lưng',
                    ].map((icd) => (
                      <button
                        key={icd}
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          chanDoanXacDinh: f.chanDoanXacDinh ? `${f.chanDoanXacDinh}; ${icd}` : icd,
                        }))}
                        className="text-xs bg-white hover:bg-blue-100 text-blue-700 font-medium px-2.5 py-1 rounded-lg border border-blue-300 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        + {icd}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={form.chanDoanXacDinh}
                    onChange={(e) => setForm((f) => ({ ...f, chanDoanXacDinh: e.target.value }))}
                    placeholder="VD: E11 - Đái tháo đường tuýp 2, K29.5 - Viêm dạ dày mạn..."
                    className="w-full rounded-lg border border-blue-400 bg-white py-2.5 px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kết quả khám</label>
                  <textarea
                    rows={3}
                    value={form.ketQuaKham}
                    onChange={(e) => setForm((f) => ({ ...f, ketQuaKham: e.target.value }))}
                    placeholder="Kết quả khám lâm sàng chi tiết..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phương pháp điều trị</label>
                  <textarea
                    rows={2}
                    value={form.phuongPhapDieuTri}
                    onChange={(e) => setForm((f) => ({ ...f, phuongPhapDieuTri: e.target.value }))}
                    placeholder="Nhập phương pháp điều trị..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày tái khám</label>
                    <input
                      type="date"
                      value={form.taiKham}
                      onChange={(e) => setForm((f) => ({ ...f, taiKham: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú</label>
                    <input
                      type="text"
                      value={form.ghiChu}
                      onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <MedButton
                    variant="secondary"
                    type="button"
                    onClick={handleSaveDraft}
                  >
                    Lưu nháp
                  </MedButton>
                  <MedButton
                    variant="primary"
                    type="submit"
                    loading={finishMut.isLoading}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Kết thúc khám
                  </MedButton>
                </div>
              </form>
            </MedCard>
          </div>

          <div className={tab === 'xn' ? 'block' : 'hidden'}>
            <XetNghiemTab
              benhAnKhamId={activeBenhAnId}
              onOpenModal={() => setShowChiDinhModal(true)}
              onApplyLabConclusion={(conclusionText) => {
                setForm((prev) => ({
                  ...prev,
                  ketQuaKham: prev.ketQuaKham
                    ? `${prev.ketQuaKham}\n[CLS]: ${conclusionText}`
                    : `[CLS]: ${conclusionText}`,
                }));
                setTab('kham');
              }}
            />
          </div>
          <div className={tab === 'don_thuoc' ? 'block' : 'hidden'}>
            <DonThuocTab benhAnKhamId={activeBenhAnId} onOpenModal={() => setShowDonThuocModal(true)} />
          </div>
          <div className={tab === 'lich_su' ? 'block' : 'hidden'}>
            <LichSuTab benhNhanId={bn.id} />
          </div>
        </>
      )}

      {/* Modals */}
      {showVitalsModal && (
        <VitalsModal
          luotId={luot.id}
          initialData={sinhHieu}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => {
            refetchSinhHieu();
            setShowVitalsModal(false);
          }}
        />
      )}

      {showChiDinhModal && activeBenhAnId && (
        <TaoChiDinhModal
          benhAnKhamId={activeBenhAnId}
          luotId={luot.id}
          onClose={() => setShowChiDinhModal(false)}
          onSuccess={() => {
            qc.invalidateQueries(['xn-benh-an', activeBenhAnId]);
            qc.invalidateQueries(['tiep-nhan']);
            setShowChiDinhModal(false);
            setTab('xn');
          }}
        />
      )}

      {showDonThuocModal && activeBenhAnId && (
        <KeDonThuocModal
          benhAnKhamId={activeBenhAnId}
          chanDoan={form.chanDoanXacDinh || form.chanDoanSoBo}
          diUng={bn.diUng}
          onClose={() => setShowDonThuocModal(false)}
          onSuccess={() => {
            qc.invalidateQueries(['don-thuoc-benh-an', activeBenhAnId]);
            setShowDonThuocModal(false);
            setTab('don_thuoc');
          }}
        />
      )}

      {showTaiKhamModal && (
        <DatLichTaiKhamModal
          benhNhanId={bn.id}
          onClose={() => setShowTaiKhamModal(false)}
          onSuccess={() => {
            setShowTaiKhamModal(false);
            alert('Đã đặt lịch tái khám hộ bệnh nhân thành công!');
          }}
        />
      )}

      {/* Modal In Phiếu Khám Bệnh Chuẩn Bộ Y Tế */}
      <InPhieuKhamModal
        isOpen={showInPhieuKham}
        onClose={() => setShowInPhieuKham(false)}
        benhAn={bakData?.data || { ...form, maLuotKham: luot.maLuotKham }}
        benhNhan={bn}
        bacSi={luot.bacSi || { nhanVien: { hoTen: 'BS. Chuyên Khoa I' } }}
        sinhHieu={sinhHieu}
        dsXetNghiem={currentDsXn}
      />

      {/* Modal In Đơn Thuốc Chuẩn Bộ Y Tế */}
      <InDonThuocModal
        isOpen={showInDonThuoc}
        onClose={() => setShowInDonThuoc(false)}
        donThuoc={currentDonThuoc}
        benhNhan={bn}
        bacSi={luot.bacSi || { nhanVien: { hoTen: 'BS. Kê Đơn' } }}
        chanDoan={form.chanDoanXacDinh || bakData?.data?.chanDoanXacDinh || 'Viêm họng cấp tính'}
      />
    </div>
  );
}

function VitalsModal({ luotId, initialData, onClose, onSuccess }) {
  const [form, setForm] = useState({
    mach: initialData?.mach ?? initialData?.nhipTim ?? initialData?.nhip_tim ?? '',
    huyetApTamThu: initialData?.huyetApTamThu ?? initialData?.huyet_ap_tam_thu ?? '',
    huyetApTamTruong: initialData?.huyetApTamTruong ?? initialData?.huyet_ap_tam_truong ?? '',
    nhietDo: initialData?.nhietDoC ?? initialData?.nhiet_do_c ?? initialData?.nhietDo ?? '',
    chieuCao: initialData?.chieuCaoCm ?? initialData?.chieu_cao_cm ?? initialData?.chieuCao ?? '',
    canNang: initialData?.canNangKg ?? initialData?.can_nang_kg ?? initialData?.canNang ?? '',
    spo2: initialData?.spo2 ?? '',
    nhipTho: initialData?.nhipTho ?? initialData?.nhip_tho ?? '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        mach: form.mach !== '' && form.mach !== null ? Number(form.mach) : undefined,
        nhipTim: form.mach !== '' && form.mach !== null ? Number(form.mach) : undefined,
        huyetApTamThu: form.huyetApTamThu !== '' && form.huyetApTamThu !== null ? Number(form.huyetApTamThu) : undefined,
        huyetApTamTruong: form.huyetApTamTruong !== '' && form.huyetApTamTruong !== null ? Number(form.huyetApTamTruong) : undefined,
        nhietDoC: form.nhietDo !== '' && form.nhietDo !== null ? Number(form.nhietDo) : undefined,
        chieuCaoCm: form.chieuCao !== '' && form.chieuCao !== null ? Number(form.chieuCao) : undefined,
        canNangKg: form.canNang !== '' && form.canNang !== null ? Number(form.canNang) : undefined,
        spo2: form.spo2 !== '' && form.spo2 !== null ? Number(form.spo2) : undefined,
        nhipTho: form.nhipTho !== '' && form.nhipTho !== null ? Number(form.nhipTho) : undefined,
      };

      await apiPost(`/tiep-nhan/${luotId}/sinh-hieu`, payload);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật sinh hiệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary-600" /> Cập nhật sinh hiệu bệnh nhân
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mạch (lần/phút)</label>
              <input
                type="number"
                value={form.mach}
                onChange={(e) => setForm({ ...form, mach: e.target.value })}
                placeholder="VD: 75"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nhiệt độ (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.nhietDo}
                onChange={(e) => setForm({ ...form, nhietDo: e.target.value })}
                placeholder="VD: 36.8"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Huyết áp tâm thu (mmHg)</label>
              <input
                type="number"
                value={form.huyetApTamThu}
                onChange={(e) => setForm({ ...form, huyetApTamThu: e.target.value })}
                placeholder="VD: 120"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Huyết áp tâm trương (mmHg)</label>
              <input
                type="number"
                value={form.huyetApTamTruong}
                onChange={(e) => setForm({ ...form, huyetApTamTruong: e.target.value })}
                placeholder="VD: 80"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Chiều cao (cm)</label>
              <input
                type="number"
                value={form.chieuCao}
                onChange={(e) => setForm({ ...form, chieuCao: e.target.value })}
                placeholder="VD: 165"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cân nặng (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.canNang}
                onChange={(e) => setForm({ ...form, canNang: e.target.value })}
                placeholder="VD: 60"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={form.spo2}
                onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                placeholder="VD: 98"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nhịp thở (lần/phút)</label>
              <input
                type="number"
                value={form.nhipTho}
                onChange={(e) => setForm({ ...form, nhipTho: e.target.value })}
                placeholder="VD: 18"
                className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Lưu sinh hiệu
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──── MODAL CHỈ ĐỊNH CẬN LÂM SÀNG (LẤY DỮ LIỆU TỪ CSDL) ──── */
function TaoChiDinhModal({ benhAnKhamId, luotId, onClose, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [ghiChu, setGhiChu] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Lấy danh mục dịch vụ cận lâm sàng từ CSDL
  const { data, isLoading } = useQuery({
    queryKey: ['dich-vu-cls'],
    queryFn: () => apiGet('/xet-nghiem/dich-vu'),
  });

  // Lấy các chỉ định đã có trong phiếu khám này để ngăn trùng lặp
  const { data: existingData } = useQuery({
    queryKey: ['xn-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnKhamId}`),
    enabled: !!benhAnKhamId,
  });

  const existingOrders = existingData?.data || [];
  const existingServiceIds = existingOrders
    .filter((item) => item.chiDinh?.trangThai !== 'huy')
    .map((item) => item.chiDinh?.dichVuXetNghiemId || item.chiDinh?.dichVu?.id)
    .filter(Boolean);

  const rawDichVu = (data?.data && Array.isArray(data.data))
    ? data.data
    : (Array.isArray(data) ? data : []);

  // Bác sĩ chỉ thấy và chỉ định các dịch vụ cận lâm sàng ĐANG HOẠT ĐỘNG
  const listDichVu = rawDichVu.filter((dv) => !dv.trangThai || dv.trangThai === 'hoat_dong');

  const handleToggle = (id) => {
    if (existingServiceIds.includes(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validIds = selectedIds.filter((id) => !existingServiceIds.includes(id));
    if (validIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 dịch vụ cận lâm sàng mới (chưa từng được chỉ định trong lần khám này)');
      return;
    }
    setLoading(true);
    try {
      const dsChiDinh = validIds.map((id) => ({
        dichVuXetNghiemId: id,
        ghiChuChiDinh: ghiChu,
      }));

      await apiPost('/xet-nghiem/chi-dinh', {
        benhAnKhamId,
        dsChiDinh,
      });

      // Tự động đổi trạng thái bệnh nhân trên hàng đợi sang "Đang làm Cận lâm sàng" (dang_cls)
      if (luotId) {
        try {
          await apiPatch(`/tiep-nhan/${luotId}/trang-thai`, { trangThai: 'dang_cls' });
        } catch (patchErr) {
          console.warn('Không thể chuyển trạng thái dang_cls của lượt tiếp nhận:', patchErr);
        }
      }

      alert('Đã tạo chỉ định Cận lâm sàng & Xét nghiệm thành công!');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err?.error?.message || err?.message || 'Lỗi tạo chỉ định cận lâm sàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra nếu bác sĩ chỉ định cả Siêu âm và Xét nghiệm máu
  const hasSieuAm = selectedIds.some((id) => {
    const item = listDichVu.find((d) => d.id === id);
    return item && (item.tenDichVu.toLowerCase().includes('siêu âm') || item.loai === 'chan_doan_hinh_anh');
  });
  const hasXetNghiemMau = selectedIds.some((id) => {
    const item = listDichVu.find((d) => d.id === id);
    return item && (item.tenDichVu.toLowerCase().includes('máu') || item.tenDichVu.toLowerCase().includes('huyết học') || item.tenDichVu.toLowerCase().includes('cbc'));
  });
  const isCombinedBoth = hasSieuAm && hasXetNghiemMau;
  const getServiceGroup = (service) => {
    const name = (service.tenDichVu || '').toLowerCase();
    if (name.includes('siêu âm')) return 'sieu_am';
    if (name.includes('x-quang') || name.includes('x quang')) return 'x_quang';
    if (service.loai === 'xet_nghiem') return 'xet_nghiem';
    return 'khac';
  };
  const visibleServices = listDichVu.filter((service) => {
    const matchesGroup = serviceFilter === 'all' || getServiceGroup(service) === serviceFilter;
    const query = serviceSearch.trim().toLowerCase();
    const matchesSearch = !query
      || service.tenDichVu.toLowerCase().includes(query)
      || (service.maDichVu || '').toLowerCase().includes(query);
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" /> Chỉ định Cận lâm sàng & Xét nghiệm
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">Chọn dịch vụ cận lâm sàng (CSDL):</label>
              {existingServiceIds.length > 0 && (
                <span className="text-[11px] text-amber-700 font-medium">
                  Đã có {existingServiceIds.length} dịch vụ được chỉ định trước đó
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Tìm tên hoặc mã dịch vụ..."
                  className="w-full pl-8 pr-2 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-2 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tất cả dịch vụ</option>
                <option value="xet_nghiem">Xét nghiệm</option>
                <option value="sieu_am">Siêu âm</option>
                <option value="x_quang">X-quang</option>
                <option value="khac">ECG / khác</option>
              </select>
            </div>
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 p-1">
              {isLoading && <p className="text-center text-xs text-gray-400 py-4">Đang nạp danh mục CSDL...</p>}
              {!isLoading && visibleServices.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">Không tìm thấy dịch vụ phù hợp</p>
              )}
              {visibleServices.map((dv) => {
                const isAlreadyOrdered = existingServiceIds.includes(dv.id);
                return (
                  <label
                    key={dv.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                      isAlreadyOrdered
                        ? 'bg-gray-100/70 opacity-60 cursor-not-allowed'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        disabled={isAlreadyOrdered}
                        checked={isAlreadyOrdered || selectedIds.includes(dv.id)}
                        onChange={() => handleToggle(dv.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{dv.tenDichVu}</p>
                          {isAlreadyOrdered && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                              ✓ Đã chỉ định
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Mã: {dv.maDichVu || dv.id}</p>
                        {dv.boPhanThucHien && (
                          <p className="text-[11px] text-blue-700 mt-0.5">
                            Thực hiện tại: {dv.boPhanThucHien}
                            {dv.mauBenhPham ? ` • Mẫu: ${dv.mauBenhPham}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700">
                      {Number(dv.gia || dv.giaDichVu || dv.donGia || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* HỘP ĐỊNH TUYẾN ĐỘNG (DYNAMIC ROUTING): PHÁT HIỆN CẢ SIÊU ÂM & XÉT NGHIỆM MÁU */}
          {isCombinedBoth && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-slate-800 space-y-2.5 text-xs animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Định Tuyến Cận Lâm Sàng Tối Ưu (Min-Wait)
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Tiết kiệm ~18 phút
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-blue-150">
                <div className="text-left">
                  <span className="text-slate-500 block text-[11px]">Phòng 202 - Siêu âm:</span>
                  <span className="font-bold text-emerald-700 text-sm">1 người chờ (Vắng)</span>
                </div>
                <div className="text-left border-l pl-2 border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Phòng 201 - Lấy mẫu máu:</span>
                  <span className="font-bold text-amber-700 text-sm">4 người chờ (Đông)</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                💡 <strong>Tự động định tuyến:</strong> Hệ thống sẽ chỉ dẫn bệnh nhân thực hiện <strong>Siêu âm tại Phòng 202 trước</strong>, sau đó mới sang <strong>Phòng 201 lấy mẫu xét nghiệm</strong> để tránh nghẽn hàng đợi.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú chẩn đoán lâm sàng:</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Nghi ngờ viêm phế quản, cần kiểm tra chỉ số WBC..."
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Xác nhận chỉ định ({selectedIds.length})
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──── MODAL KÊ ĐƠN THUỐC ĐIỆN TỬ (LẤY THUỐC TỪ CSDL KHO DƯỢC + AI DDI SAFETY) ──── */
function KeDonThuocModal({ benhAnKhamId, chanDoan, diUng, onClose, onSuccess }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSafetyResult, setAiSafetyResult] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  // Lấy danh mục thuốc từ CSDL Nhà Thuốc
  const { data: thuocData, isLoading } = useQuery({
    queryKey: ['thuoc-list-doctor', searchTerm],
    queryFn: () => apiGet(`/nha-thuoc/thuoc?search=${encodeURIComponent(searchTerm)}`),
  });

  const listThuoc = thuocData?.data || [
    { id: 1, maThuoc: 'TH001', tenThuoc: 'Paracetamol 500mg', donViTinh: 'Viên', giaBan: 2000 },
    { id: 2, maThuoc: 'TH002', tenThuoc: 'Amoxicillin 500mg', donViTinh: 'Viên', giaBan: 5000 },
    { id: 3, maThuoc: 'TH003', tenThuoc: 'Omeprazole 20mg', donViTinh: 'Viên', giaBan: 4500 },
  ];

  // Tự động kiểm tra tương tác thuốc, dị ứng chéo và chức năng Gan/Thận theo thời gian thực
  useEffect(() => {
    if (selectedItems.length === 0) {
      setAiSafetyResult(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingSafety(true);
      try {
        const res = await apiPost('/ai/check-drug-interactions', {
          benhAnKhamId,
          chanDoan,
          diUng,
          medications: selectedItems,
        });
        setAiSafetyResult(res?.data || null);
      } catch (e) {
        console.warn('Không thể kiểm tra tương tác thuốc AI:', e);
      } finally {
        setCheckingSafety(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedItems, benhAnKhamId, chanDoan, diUng]);

  const handleAddThuoc = (thuoc) => {
    if (selectedItems.some((i) => i.thuocId === thuoc.id)) return;
    const stock = Number(thuoc.tonKhoKhaDung ?? thuoc.tonKhoTong ?? 0);
    if (stock <= 0 || thuoc.trangThai === 'ngung_kinh_doanh') {
      alert(`⚠️ Thuốc "${thuoc.tenThuoc}" hiện đã hết tồn kho khả dụng tại Nhà thuốc (Còn: 0 ${thuoc.donViTinh}). Vui lòng chọn thuốc khác!`);
      return;
    }
    const defaultQty = Math.min(10, stock);
    setSelectedItems((prev) => [
      ...prev,
      {
        thuocId: thuoc.id,
        tenThuoc: thuoc.tenThuoc,
        donViTinh: thuoc.donViTinh,
        tonKhoKhaDung: stock,
        soLuong: defaultQty,
        lieuDung: 'Uống 1v x 2 lần/ngày sau ăn',
        soNgayDung: 5,
      },
    ]);
  };

  const handleRemoveThuoc = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.thuocId !== id));
  };

  const handleItemChange = (id, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.thuocId === id ? { ...item, [field]: value } : item))
    );
  };

  const insufficientStockItems = selectedItems.filter((item) => {
    const reqQty = Number(item.soLuong || 0);
    const avail = Number(item.tonKhoKhaDung ?? 999999);
    return reqQty <= 0 || reqQty > avail;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thuốc vào đơn');
      return;
    }
    for (const item of selectedItems) {
      const reqQty = Number(item.soLuong || 0);
      const avail = Number(item.tonKhoKhaDung ?? 0);
      if (reqQty <= 0) {
        alert(`⚠️ Số lượng kê của thuốc "${item.tenThuoc}" phải lớn hơn 0!`);
        return;
      }
      if (reqQty > avail) {
        alert(
          `⚠️ NHÀ THUỐC KHÔNG ĐỦ THUỐC:\nThuốc "${item.tenThuoc}" chỉ còn tồn kho khả dụng ${avail} ${item.donViTinh}, nhưng Bác sĩ đang kê ${reqQty} ${item.donViTinh}.\n\nVui lòng giảm số lượng về tối đa ${avail} ${item.donViTinh} hoặc chọn thuốc khác thay thế!`,
        );
        return;
      }
    }
    if (aiSafetyResult?.safetyStatus === 'nguy_hiem_cao') {
      const ok = window.confirm(
        '⚠️ CẢNH BÁO DƯỢC LÂM SÀNG NGHIÊM TRỌNG:\nĐơn thuốc hiện tại có tương tác thuốc hoặc nguy cơ dị ứng chéo mức độ cao. Bác sĩ có chắc chắn muốn tiếp tục lưu đơn thuốc này?',
      );
      if (!ok) return;
    }
    setLoading(true);
    try {
      await apiPost('/nha-thuoc/don-thuoc', {
        benhAnKhamId,
        ghiChu,
        chiTiet: selectedItems.map((i) => ({
          thuocId: i.thuocId,
          soLuong: Number(i.soLuong),
          lieuDung: i.lieuDung,
          soNgayDung: Number(i.soNgayDung),
        })),
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert(err?.error?.message || err?.message || 'Lỗi tạo đơn thuốc. Vui lòng kiểm tra tồn kho Nhà thuốc và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" /> Kê Đơn Thuốc Điện Tử (CSDL Kho Dược + AI Dược Lâm Sàng)
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Ô tìm kiếm thuốc */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tìm & chọn thuốc từ kho dược:</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên thuốc hoặc hoạt chất..."
                className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
              {isLoading && <p className="text-center text-xs text-gray-400 py-3">Đang tra cứu kho thuốc CSDL...</p>}
              {listThuoc.map((t) => {
                const stock = Number(t.tonKhoKhaDung ?? t.tonKhoTong ?? 0);
                const isOut = stock <= 0 || t.trangThai === 'ngung_kinh_doanh';
                const isLow = !isOut && stock <= 20;
                const isSelected = selectedItems.some((i) => i.thuocId === t.id);
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-2 transition-colors ${
                      isOut ? 'bg-gray-100/70 opacity-75' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-primary-700">{t.maThuoc}</span>
                      <span className="text-sm font-semibold text-gray-900">{t.tenThuoc}</span>
                      <span className="text-xs text-gray-500">({t.donViTinh})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOut
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isOut ? 'Hết thuốc (0)' : `Tồn kho: ${stock} ${t.donViTinh}`}
                      </span>
                    </div>
                    <MedButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddThuoc(t)}
                      disabled={isSelected || isOut}
                    >
                      {isOut ? 'Hết thuốc' : isSelected ? 'Đã chọn' : '+ Chọn'}
                    </MedButton>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bảng đơn thuốc đã chọn */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Thuốc trong đơn ({selectedItems.length}):</label>
            {selectedItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center border border-dashed rounded-xl">Chưa chọn thuốc nào</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => {
                  const reqQty = Number(item.soLuong || 0);
                  const avail = Number(item.tonKhoKhaDung ?? 0);
                  const isOverStock = reqQty > avail || reqQty <= 0;
                  return (
                    <div
                      key={item.thuocId}
                      className={`flex flex-col gap-1.5 p-3 border rounded-xl shadow-2xs transition ${
                        isOverStock ? 'border-red-400 bg-red-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-sm text-gray-900">{item.tenThuoc}</p>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isOverStock
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              Kho Nhà thuốc còn: {avail} {item.donViTinh}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={item.lieuDung}
                            onChange={(e) => handleItemChange(item.thuocId, 'lieuDung', e.target.value)}
                            placeholder="VD: Sáng 1v, Chiều 1v..."
                            className="w-full mt-1 rounded border border-gray-300 bg-white py-1 px-2 text-xs focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <span className="text-[10px] text-gray-500 block">
                              Số lượng (Tối đa {avail})
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={avail}
                              value={item.soLuong}
                              onChange={(e) => handleItemChange(item.thuocId, 'soLuong', e.target.value)}
                              className={`w-full rounded border py-1 px-2 text-xs text-center font-bold ${
                                isOverStock
                                  ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                                  : 'border-gray-300 bg-white text-gray-900'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveThuoc(item.thuocId)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {isOverStock && (
                        <div className="text-[11px] font-semibold text-red-700 flex items-center gap-1 pt-0.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          <span>
                            {reqQty <= 0
                              ? 'Số lượng kê phải lớn hơn 0!'
                              : `Nhà thuốc không đủ thuốc! Tồn kho khả dụng chỉ còn ${avail} ${item.donViTinh} (bạn đang kê ${reqQty} ${item.donViTinh}).`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── TRỤ CỘT AI 3.3: KIỂM DUYỆT TƯƠNG TÁC THUỐC, DỊ ỨNG & GAN THẬN THỜI GIAN THỰC ─── */}
          {selectedItems.length > 0 && (
            <div
              className={`rounded-xl border p-3.5 space-y-2.5 text-xs ${
                aiSafetyResult?.safetyStatus === 'nguy_hiem_cao'
                  ? 'bg-red-50 border-red-300 text-gray-900'
                  : aiSafetyResult?.safetyStatus === 'can_than_trong'
                  ? 'bg-amber-50 border-amber-300 text-gray-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-gray-900'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={`w-4 h-4 ${
                      aiSafetyResult?.safetyStatus === 'nguy_hiem_cao'
                        ? 'text-red-600'
                        : aiSafetyResult?.safetyStatus === 'can_than_trong'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  />
                  <span className="font-bold text-xs">
                    🛡️ AI Kiểm duyệt An toàn Dược lâm sàng (Tương tác thuốc • Dị ứng • Gan/Thận)
                  </span>
                </div>
                {checkingSafety ? (
                  <span className="text-[11px] text-gray-500 italic">Đang đối chiếu hồ sơ bệnh án...</span>
                ) : aiSafetyResult ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      aiSafetyResult.safetyStatus === 'nguy_hiem_cao'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : aiSafetyResult.safetyStatus === 'can_than_trong'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    Điểm an toàn: {aiSafetyResult.safetyScore}/100 •{' '}
                    {aiSafetyResult.safetyStatus === 'nguy_hiem_cao'
                      ? 'Cảnh báo Nghiêm trọng'
                      : aiSafetyResult.safetyStatus === 'can_than_trong'
                      ? 'Cần thận trọng'
                      : 'Đơn thuốc An toàn'}
                  </span>
                ) : null}
              </div>

              {aiSafetyResult?.alerts?.length > 0 ? (
                <div className="space-y-2">
                  {aiSafetyResult.alerts.map((al, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border bg-white ${
                        al.mucDo === 'nghiem_trong'
                          ? 'border-red-300'
                          : al.mucDo === 'trung_binh'
                          ? 'border-amber-300'
                          : 'border-blue-200'
                      }`}
                    >
                      <div className="font-bold text-gray-900">{al.tieuDe}</div>
                      <p className="text-gray-600 mt-0.5">{al.moTaChiTiet}</p>
                      <p className="text-emerald-700 font-semibold mt-1">
                        💡 Khuyến nghị xử trí: {al.khuyenNghiXuTri}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                !checkingSafety && (
                  <p className="text-emerald-800">
                    ✓ Không phát hiện tương tác thuốc bất lợi, phản ứng dị ứng chéo hay chống chỉ định trên chức năng Gan/Thận hiện tại của bệnh nhân.
                  </p>
                )
              )}

              {aiSafetyResult?.recommendedDoctorNote && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/70">
                  <span className="text-[11px] text-gray-600 truncate">
                    Gợi ý lời dặn: {aiSafetyResult.recommendedDoctorNote}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGhiChu(aiSafetyResult.recommendedDoctorNote)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-[11px] cursor-pointer"
                  >
                    ✍️ Điền vào Lời dặn
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lời dặn của Bác sĩ:</label>
            <input
              type="text"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Uống sau bữa ăn 30 phút, kiêng rượu bia..."
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t flex-shrink-0">
          <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
          <MedButton
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
            disabled={insufficientStockItems.length > 0 || selectedItems.length === 0}
            onClick={handleSubmit}
          >
            {insufficientStockItems.length > 0
              ? '⚠️ Không đủ tồn kho Nhà thuốc'
              : `Lưu & Gửi đơn thuốc (${selectedItems.length})`}
          </MedButton>
        </div>
      </div>
    </div>
  );
}

/* ──── MODAL ĐẶT LỊCH TÁI KHÁM HỘ BỆNH NHÂN ──── */
function DatLichTaiKhamModal({ benhNhanId, onClose, onSuccess }) {
  const [ngayKham, setNgayKham] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [gioKham, setGioKham] = useState('09:00');
  const [lyDo, setLyDo] = useState('Tái khám theo hẹn bác sĩ');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/lich-hen', {
        benhNhanId,
        ngayKham,
        gioKham,
        lyDoKham: lyDo,
        hinhThucKham: 'truc_tiep',
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Lỗi đặt lịch tái khám. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" /> Đặt Lịch Tái Khám Hộ Bệnh Nhân
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ngày tái khám</label>
            <input
              type="date"
              value={ngayKham}
              onChange={(e) => setNgayKham(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ khám dự kiến</label>
            <input
              type="time"
              value={gioKham}
              onChange={(e) => setGioKham(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Lý do tái khám</label>
            <input
              type="text"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <MedButton type="button" variant="ghost" size="sm" onClick={onClose}>Hủy</MedButton>
            <MedButton type="submit" variant="primary" size="sm" loading={loading}>
              Xác nhận đặt lịch
            </MedButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──── LỘ TRÌNH THỰC HIỆN CẬN LÂM SÀNG (ĐIỀU PHỐI HÀNG ĐỢI) ──── */
function DynamicQueuePanel({ benhAnKhamId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dynamic-queue-routing', benhAnKhamId],
    queryFn: () => apiGet(`/ai/dynamic-queue/${benhAnKhamId}`),
    enabled: !!benhAnKhamId,
    refetchInterval: 5000,
  });

  const resData = data?.data || {};
  const routingPlan = resData.routingPlan || [];
  const tietKiemPhut = resData.tietKiemPhut || 0;
  const thongDiep = resData.thongDiep || '';

  if (isLoading || routingPlan.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      {/* Header gọn gàng, chuẩn y tế */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">
              Lộ trình thực hiện Cận lâm sàng
            </h4>
            <p className="text-[11px] text-slate-500">
              Điều phối thứ tự theo trạng thái hàng đợi thực tế
            </p>
          </div>
        </div>

        {tietKiemPhut > 0 && routingPlan.length > 1 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Clock className="h-3 w-3" /> Tiết kiệm ~{tietKiemPhut} phút
          </span>
        )}
      </div>

      {/* Hiển thị lộ trình */}
      {routingPlan.length === 1 ? (
        /* Khi chỉ có 1 phòng: Card đơn giản, rõ ràng, không rườm rà */
        (() => {
          const step = routingPlan[0];
          const isFree = (step.so_nguoi_cho || 0) === 0;
          return (
            <div className="rounded-lg bg-slate-50/70 border border-slate-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    Phòng tiếp nhận
                  </span>
                  <span className="font-bold text-sm text-slate-900">{step.ten_phong}</span>
                </div>
                {step.dich_vu?.length > 0 && (
                  <p className="text-xs text-slate-600">
                    Chỉ định: <span className="font-medium text-slate-800">{step.dich_vu.join(', ')}</span>
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {isFree
                    ? 'Hiện không có bệnh nhân chờ phía trước — Bệnh nhân có thể đến thực hiện ngay.'
                    : `Đang có ${step.so_nguoi_cho} người chờ phía trước (~${step.thoi_gian_cho_phut} phút).`}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  isFree
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isFree ? '✓ Đến làm ngay (0 người chờ)' : `${step.so_nguoi_cho} người chờ (~${step.thoi_gian_cho_phut}p)`}
                </span>
              </div>
            </div>
          );
        })()
      ) : (
        /* Khi có từ 2 phòng trở lên: Danh sách các bước tối ưu */
        <div className="space-y-2.5">
          {thongDiep && (
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              💡 {thongDiep}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {routingPlan.map((step) => {
              const isFree = (step.so_nguoi_cho || 0) === 0;
              return (
                <div
                  key={step.buoc}
                  className={`rounded-lg p-3 border transition-all ${
                    step.buoc === 1
                      ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-300/40'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      step.buoc === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Bước {step.buoc}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      isFree
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isFree ? 'Không cần chờ' : `${step.so_nguoi_cho} người chờ (~${step.thoi_gian_cho_phut}p)`}
                    </span>
                  </div>

                  <p className="font-bold text-sm text-slate-800">{step.ten_phong}</p>

                  {step.dich_vu && step.dich_vu.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {step.dich_vu.join(', ')}
                    </p>
                  )}

                  <p className={`text-[11px] mt-2 leading-tight ${
                    step.buoc === 1 ? 'text-blue-700 font-medium' : 'text-slate-500'
                  }`}>
                    {step.khuyen_nghi}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ChiTietKetQuaXetNghiemRenderer được dùng chung từ components/Lab/ChiTietKetQuaXetNghiemRenderer */

/* ──── TAB XÉT NGHIỆM (XEM KẾT QUẢ TỪ CSDL & TẠO CHỈ ĐỊNH + AI VISION) ──── */
function XetNghiemTab({ benhAnKhamId, onOpenModal, onApplyLabConclusion }) {
  const qc = useQueryClient();
  const [previewFile, setPreviewFile] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['xn-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnKhamId}`),
    enabled: !!benhAnKhamId,
    refetchInterval: 3000,
  });
  const items = (data?.data || []).filter((it) => it.chiDinh?.trangThai !== 'huy');

  const handleHuy = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy chỉ định cận lâm sàng này?')) return;
    try {
      await apiDelete(`/xet-nghiem/chi-dinh/${id}`);
      qc.invalidateQueries(['xn-benh-an', benhAnKhamId]);
      qc.invalidateQueries(['tiep-nhan', 'hang-doi']);
      qc.invalidateQueries(['tiep-nhan']);
      qc.invalidateQueries(['tiep-nhan-detail']);
      qc.invalidateQueries(['dynamic-routing']);
    } catch (err) {
      alert(err?.message || 'Lỗi hủy chỉ định');
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Queue Routing Widget */}
      <DynamicQueuePanel benhAnKhamId={benhAnKhamId} />

      {/* ─── TRỤ CỘT AI 3.2: COMPUTER VISION & PHÂN TÍCH ĐA CHỈ SỐ CẬN LÂM SÀNG ─── */}
      {items.length > 0 && (
        <AiLabVisionPanel
          benhAnKhamId={benhAnKhamId}
          items={items}
          onApplyConclusion={onApplyLabConclusion}
        />
      )}

      <MedCard
        title="Danh sách chỉ định & Kết quả Cận lâm sàng"
        action={
          <MedButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onOpenModal}>
            Chỉ định mới
          </MedButton>
        }
      >
        {isLoading && <p className="text-sm text-gray-400 py-4">Đang nạp dữ liệu kết quả xét nghiệm từ CSDL...</p>}

        {items.length === 0 && !isLoading ? (
          <div className="text-center py-6">
            <FlaskConical className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Phiếu khám này chưa có chỉ định xét nghiệm nào</p>
            <button
              type="button"
              onClick={onOpenModal}
              className="mt-2 text-xs font-bold text-primary-600 hover:underline"
            >
              + Bấm vào đây để tạo chỉ định xét nghiệm
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(({ chiDinh, ketQua }) => (
              <div key={chiDinh.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded mr-2">
                      {chiDinh.dichVu?.maDichVu || 'XN'}
                    </span>
                    <span className="font-bold text-sm text-gray-900">{chiDinh.dichVu?.tenDichVu}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={chiDinh.trangThai} size="sm" />
                    {chiDinh.trangThai === 'cho_lay_mau' && (
                      <button
                        type="button"
                        onClick={() => handleHuy(chiDinh.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-medium border border-red-200"
                        title="Hủy chỉ định cận lâm sàng này"
                      >
                        <Trash2 className="h-3 w-3" /> Hủy
                      </button>
                    )}
                  </div>
                </div>

                {chiDinh.ghiChuChiDinh && (
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                    Ghi chú chỉ định: {chiDinh.ghiChuChiDinh}
                  </p>
                )}

                {ketQua ? (
                  <ChiTietKetQuaXetNghiemRenderer
                    chiDinh={chiDinh}
                    ketQua={ketQua}
                    onPreviewFile={setPreviewFile}
                  />
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⏳ Đang chờ Kỹ thuật viên xử lý và nhập kết quả...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </MedCard>
      {previewFile && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xem tệp kết quả cận lâm sàng"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
              <p className="text-sm font-bold text-gray-900 truncate">{previewFile.name}</p>
              <button type="button" onClick={() => setPreviewFile(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 max-h-[78vh] overflow-auto">
              {previewFile.index > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const index = previewFile.index - 1;
                    setPreviewFile({ ...previewFile, url: previewFile.files[index], index, name: `Tệp kết quả ${index + 1}` });
                  }}
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  Trước
                </button>
              )}
              {/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(previewFile.url) ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-h-[76vh] max-w-full object-contain rounded-lg" />
              ) : (
                <iframe src={previewFile.url} title={previewFile.name} className="h-[76vh] w-full rounded-lg border border-gray-200" />
              )}
              {previewFile.index < previewFile.files.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const index = previewFile.index + 1;
                    setPreviewFile({ ...previewFile, url: previewFile.files[index], index, name: `Tệp kết quả ${index + 1}` });
                  }}
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  Sau
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ──── TAB ĐƠN THUỐC ĐÃ KÊ ──── */
function DonThuocTab({ benhAnKhamId, onOpenModal }) {
  const { data, isLoading } = useQuery({
    queryKey: ['don-thuoc-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/nha-thuoc/don-thuoc?benhAnKhamId=${benhAnKhamId}`),
  });

  const donList = data?.data || [];

  return (
    <MedCard
      title="Đơn thuốc điện tử"
      action={
        <MedButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onOpenModal}>
          Kê đơn thuốc
        </MedButton>
      }
    >
      {isLoading && <p className="text-sm text-gray-400 py-4">Đang nạp dữ liệu đơn thuốc từ CSDL...</p>}

      {donList.length === 0 && !isLoading ? (
        <div className="text-center py-6">
          <Pill className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Phiếu khám này chưa có đơn thuốc nào được kê</p>
          <button
            type="button"
            onClick={onOpenModal}
            className="mt-2 text-xs font-bold text-primary-600 hover:underline"
          >
            + Bấm vào đây để lập đơn thuốc
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {donList.map((dt) => (
            <div key={dt.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-primary-700">Mã đơn: {dt.maDonThuoc}</span>
                <StatusBadge status={dt.trangThai} size="sm" />
              </div>
              <div className="space-y-2">
                {(dt.chiTiet || []).map((ct, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{ct.thuoc?.tenThuoc}</p>
                      <p className="text-gray-500">{ct.lieuDung}</p>
                    </div>
                    <span className="font-bold text-primary-700">{ct.soLuong} {ct.thuoc?.donViTinh}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </MedCard>
  );
}

function LichSuTab({ benhNhanId }) {
  const { data } = useQuery({
    queryKey: ['lich-su-kham', benhNhanId],
    queryFn: () => apiGet(`/ho-so-benh-an/lich-su/${benhNhanId}`),
  });
  const items = data?.data || [];

  return (
    <MedCard title="Lịch sử khám bệnh">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Chưa có lịch sử khám</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((bak) => (
            <div key={bak.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatDateTime(bak.ngayKham)}</p>
                  {bak.chanDoanXacDinh && <p className="text-sm text-gray-600 mt-0.5">{bak.chanDoanXacDinh}</p>}
                </div>
                <StatusBadge status={bak.trangThai === 'da_hoan_thanh' ? 'hoan_thanh' : 'dang_kham'} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </MedCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * TRỤ CỘT AI 3.1: RAG TRÊN PHÁC ĐỒ CHẨN ĐOÁN & ĐIỀU TRỊ CHUẨN BỘ Y TẾ
 * ═══════════════════════════════════════════════════════════════════════════════ */
function ClinicalRagAssistantPanel({
  benhAnKhamId,
  luotTiepNhanId,
  trieuChung,
  chanDoanSoBo,
  chanDoanXacDinh,
  sinhHieu,
  diUng,
  onApplyProtocol,
}) {
  const ragStorageKey = `phong_kham_rag_${luotTiepNhanId || benhAnKhamId || 'default'}`;
  const [ragData, setRagData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(ragStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleRunRag = async () => {
    setLoading(true);
    setExpanded(true);
    try {
      const res = await apiPost('/ai/clinical-protocol-rag', {
        benhAnKhamId,
        luotTiepNhanId,
        trieuChung,
        chanDoanSoBo,
        chanDoanXacDinh,
        sinhHieu,
        diUng,
      });
      const nextData = res?.data || null;
      setRagData(nextData);
      if (nextData) {
        try {
          sessionStorage.setItem(ragStorageKey, JSON.stringify(nextData));
        } catch {}
      }
    } catch (e) {
      console.error('Lỗi truy xuất RAG Phác đồ Bộ Y tế:', e);
    } finally {
      setLoading(false);
    }
  };

  const topProto = ragData?.topProtocol;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              🧠 Trợ lý AI Tra cứu Phác đồ Bộ Y tế (Clinical RAG)
            </h4>
            <p className="text-[11px] text-gray-500">
              Đối chiếu triệu chứng, sinh hiệu & tiền sử dị ứng với Kho Phác đồ Chẩn đoán và Điều trị Bộ Y tế Việt Nam
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ragData && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1"
            >
              {expanded ? 'Thu gọn' : 'Mở rộng'}
            </button>
          )}
          <MedButton
            type="button"
            variant="primary"
            size="sm"
            loading={loading}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={handleRunRag}
          >
            ✨ AI Tra cứu Phác đồ Bộ Y tế
          </MedButton>
        </div>
      </div>

      {ragData && expanded && topProto && (
        <div className="space-y-3 pt-2 border-t border-emerald-200/70 text-xs">
          {/* Header Phác đồ khớp nhất */}
          <div className="p-3 rounded-xl bg-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                  Độ tương đồng Vector: {Math.round((topProto.similarityScore || 0.88) * 100)}%
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                  {topProto.quyetDinhByt}
                </span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                Mã ICD-10 gợi ý: <span className="text-emerald-700">{topProto.maIcd10}</span>
              </div>
              {topProto.matchedSignals?.length > 0 && (
                <div className="text-[11px] text-gray-500">
                  Tín hiệu lâm sàng khớp: <span className="font-semibold text-gray-700">{topProto.matchedSignals.join(', ')}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onApplyProtocol?.(ragData.suggestedFields)}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              ⚡ Áp dụng Mã ICD-10 & Phác đồ vào Bệnh án
            </button>
          </div>

          {/* Cảnh báo dị ứng cá nhân hóa nếu có */}
          {ragData.allergyAlert && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{ragData.allergyAlert}</span>
            </div>
          )}

          {/* Chi tiết Tiêu chuẩn Chẩn đoán & CLS khuyến nghị */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1.5">
              <div className="font-bold text-gray-900">📋 Tiêu chuẩn Chẩn đoán & Cận lâm sàng Bộ Y tế:</div>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {(topProto.tieuChuanChanDoan || []).map((tc, i) => (
                  <li key={i}>{tc}</li>
                ))}
              </ul>
              <div className="pt-1">
                <span className="font-semibold text-blue-700">CLS khuyến nghị: </span>
                <span className="text-gray-700">{(topProto.canLamSangKhuyenNghi || []).join(' • ')}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1.5">
              <div className="font-bold text-gray-900">💊 Phác đồ Điều trị Đầu tay (Bộ Y tế):</div>
              <p className="text-gray-600">{topProto.phacDoDieuTri?.nguyenTac}</p>
              <div className="space-y-1 pt-1">
                {(topProto.phacDoDieuTri?.thuocDauTay || []).map((t, i) => (
                  <div key={i} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="font-bold text-emerald-700">{t.hoatChatGoiY}</div>
                    <div className="text-[11px] text-gray-700">{t.lieuDungChuan}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * TRỤ CỘT AI 3.2: COMPUTER VISION & PHÂN TÍCH ĐA CHỈ SỐ CẬN LÂM SÀNG
 * ═══════════════════════════════════════════════════════════════════════════════ */
function AiLabVisionPanel({ benhAnKhamId, items, onApplyConclusion }) {
  const labStorageKey = `phong_kham_lab_ai_${benhAnKhamId || 'default'}`;
  const [analysis, setAnalysis] = useState(() => {
    try {
      const saved = sessionStorage.getItem(labStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const handleAnalyzeLabs = async () => {
    setLoading(true);
    try {
      const dsXetNghiem = (items || []).map(({ chiDinh, ketQua }) => ({
        id: chiDinh?.id,
        maDichVu: chiDinh?.dichVu?.maDichVu,
        tenDichVu: chiDinh?.dichVu?.tenDichVu,
        loai: chiDinh?.dichVu?.loai,
        trangThai: chiDinh?.trangThai,
        giaTri: ketQua?.giaTri,
        donVi: ketQua?.donVi,
        ketQuaChiTiet: ketQua?.ketQuaChiTiet,
        nhanXet: ketQua?.nhanXet,
        tepDinhKem: ketQua?.tepDinhKem,
      }));
      const res = await apiPost('/ai/analyze-lab-vision', {
        benhAnKhamId,
        dsXetNghiem,
      });
      const nextAnalysis = res?.data || null;
      setAnalysis(nextAnalysis);
      if (nextAnalysis) {
        try {
          sessionStorage.setItem(labStorageKey, JSON.stringify(nextAnalysis));
        } catch {}
      }
    } catch (e) {
      console.error('Lỗi phân tích AI Cận lâm sàng:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-2xs">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900">
              🔬 AI Phân tích Đa chỉ số Cận lâm sàng & Thị giác Máy tính (Lab & Vision AI)
            </h4>
            <p className="text-[11px] text-gray-500">
              Tự động đọc chỉ số bất thường, tính mức lọc cầu thận ước tính (eGFR), tỷ số AST/ALT và phân tích hình ảnh X-Quang / Siêu âm
            </p>
          </div>
        </div>

        <MedButton
          type="button"
          variant="primary"
          size="sm"
          loading={loading}
          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          onClick={handleAnalyzeLabs}
        >
          🔍 AI Đọc & Biện luận Kết quả CLS
        </MedButton>
      </div>

      {analysis && (
        <div className="space-y-3 pt-2 border-t border-purple-200/70 text-xs">
          {/* Bảng các chỉ số vượt ngưỡng tham chiếu */}
          {analysis.abnormalBiomarkers?.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-gray-900">
                ⚠️ Phát hiện {analysis.abnormalBiomarkers.length} chỉ số sinh học vượt ngưỡng tham chiếu:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.abnormalBiomarkers.map((bm, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-white border border-amber-300 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900">
                        {bm.chiSo}: <span className="text-red-600">{bm.giaTri}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Tham chiếu chuẩn: {bm.khoangThamChieu}</div>
                      <div className="text-[11px] text-amber-800 mt-0.5">{bm.yNghiaLamSang}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] shrink-0">
                      {bm.mucDo === 'giam_thap' ? 'Thấp (L)' : 'Cao (H)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chỉ số dẫn xuất y khoa (eGFR, AST/ALT) */}
          {analysis.derivedIndices?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.derivedIndices.map((di, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white border border-blue-200">
                  <div className="font-bold text-blue-800">
                    🧮 {di.tenChiSo}: <span className="text-gray-900">{di.giaTri}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">{di.danhGia}</div>
                </div>
              ))}
            </div>
          )}

          {/* Phát hiện Hình ảnh học (X-Quang / Siêu âm / ECG) */}
          {analysis.imagingFindings?.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-gray-900">🖼️ Phân tích Hình ảnh học Y khoa (Computer Vision):</div>
              {analysis.imagingFindings.map((img, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-700">{img.tenDichVu}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      Vùng khảo sát: {img.vungKhaoSat}
                    </span>
                  </div>
                  <div className="text-gray-800 font-medium">{img.phatHien}</div>
                  <div className="text-[11px] text-gray-500">{img.khuyenNghi}</div>
                </div>
              ))}
            </div>
          )}

          {/* Kết luận tổng hợp + Nút chèn vào Bệnh án */}
          <div className="p-3 rounded-xl bg-white border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-gray-900">📌 Nhận định Tổng hợp Cận lâm sàng từ AI:</div>
              <p className="text-gray-700 mt-0.5">{analysis.clinicalConclusion}</p>
            </div>
            {onApplyConclusion && (
              <button
                type="button"
                onClick={() => onApplyConclusion(analysis.clinicalConclusion)}
                className="shrink-0 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                📋 Chèn nhận định vào Kết quả khám
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
