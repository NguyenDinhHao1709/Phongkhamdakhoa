import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { MedCard, MedCardSection } from '../../../design-system/components/Card/MedCard';
import { MedButton } from '../../../design-system/components/Button/MedButton';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import { VitalsCard } from '../../../design-system/components/VitalSign/VitalDisplay';
import { apiGet, apiPost, apiPatch } from '../../../services/api';
import { formatDateTime, tinhTuoi } from '../../../utils/formatDate';
import { GIOI_TINH } from '../../../utils/constants';
import { Stethoscope, AlertTriangle, FileText, ClipboardList, FlaskConical, CheckCircle2, ChevronRight } from 'lucide-react';

function useHangDoi() {
  return useQuery({
    queryKey: ['tiep-nhan', 'hang-doi'],
    queryFn: () => apiGet('/tiep-nhan/hang-doi'),
    refetchInterval: 15000,
  });
}

export default function PhongKhamPage() {
  const { data, isLoading } = useHangDoi();
  const [selectedLuot, setSelectedLuot] = useState(null);
  const items = data?.data || [];
  const dangKham = items.filter((i) => i.trangThai === 'dang_kham');
  const choKham = items.filter((i) => i.trangThai === 'cho_kham');

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)] animate-fade-in">
      {/* Left: Patient Queue */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" /> Hàng đợi
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>}
          {dangKham.map((luot) => (
            <PatientCard key={luot.id} luot={luot} isActive={selectedLuot?.id === luot.id} onClick={() => setSelectedLuot(luot)} highlight />
          ))}
          {choKham.map((luot) => (
            <PatientCard key={luot.id} luot={luot} isActive={selectedLuot?.id === luot.id} onClick={() => setSelectedLuot(luot)} />
          ))}
          {!isLoading && items.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Không có bệnh nhân chờ khám</p>
          )}
        </div>
      </div>

      {/* Right: Examination Panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedLuot ? (
          <ExaminationPanel luot={selectedLuot} onComplete={() => setSelectedLuot(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base">Chọn bệnh nhân từ hàng đợi để bắt đầu khám</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ luot, isActive, onClick, highlight }) {
  const bn = luot.benhNhan || {};
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isActive ? 'border-primary-400 bg-primary-50 shadow-card-md' :
        highlight ? 'border-primary-200 bg-primary-50/30 hover:border-primary-300' :
        'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold text-primary-700">{luot.maSoThuTu}</span>
        <StatusBadge status={luot.trangThai} size="sm" />
      </div>
      <p className="font-semibold text-sm text-gray-900 truncate">{bn.hoTen}</p>
      <p className="text-xs text-gray-500">
        {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)}T`}
        {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
      </p>
      {bn.diUng && (
        <div className="mt-1.5 flex items-center gap-1 rounded bg-danger-light px-2 py-0.5 text-xs font-medium text-danger-dark">
          <AlertTriangle className="h-3 w-3" /> {bn.diUng}
        </div>
      )}
    </button>
  );
}

function ExaminationPanel({ luot, onComplete }) {
  const bn = luot.benhNhan || {};
  const qc = useQueryClient();
  const [tab, setTab] = useState('kham'); // 'kham' | 'xn' | 'lich_su'
  const [form, setForm] = useState({
    trieuChung: '', chanDoanSoBo: '', chanDoanXacDinh: '',
    ketQuaKham: '', phuongPhapDieuTri: '', taiKham: '', ghiChu: '',
  });
  const [benhAnId, setBenhAnId] = useState(null);

  // Sinh hiệu
  const { data: shData } = useQuery({
    queryKey: ['sinh-hieu', luot.id],
    queryFn: () => apiGet(`/tiep-nhan/${luot.id}/sinh-hieu`),
  });
  const sinhHieu = shData?.data;

  // Tạo phiếu khám
  const createMut = useMutation({
    mutationFn: () => apiPost(`/ho-so-benh-an/benh-an-kham/${bn.id}`, { luotTiepNhanId: luot.id, hinhThucKham: 'truc_tiep' }),
    onSuccess: (res) => setBenhAnId(res.data.id),
  });

  // Kết thúc khám
  const finishMut = useMutation({
    mutationFn: () => apiPatch(`/ho-so-benh-an/benh-an-kham/${benhAnId}/ket-thuc`, form),
    onSuccess: () => {
      apiPatch(`/tiep-nhan/${luot.id}/trang-thai`, { trangThai: 'hoan_thanh' });
      qc.invalidateQueries(['tiep-nhan']);
      onComplete();
    },
  });

  // Bắt đầu khám
  const handleBatDauKham = async () => {
    await apiPatch(`/tiep-nhan/${luot.id}/trang-thai`, { trangThai: 'dang_kham' });
    await createMut.mutateAsync();
    qc.invalidateQueries(['tiep-nhan']);
  };

  const TABS = [
    { key: 'kham', label: 'Khám bệnh', icon: Stethoscope },
    { key: 'xn', label: 'Xét nghiệm', icon: FlaskConical },
    { key: 'lich_su', label: 'Lịch sử', icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <MedCard allergyNote={bn.diUng}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{bn.hoTen}</h2>
              <StatusBadge status={luot.trangThai} />
            </div>
            <p className="text-sm text-gray-500">
              {bn.maBenhNhan} · {tinhTuoi(bn.ngaySinh) && `${tinhTuoi(bn.ngaySinh)} tuổi`}
              {bn.gioiTinh && ` · ${GIOI_TINH[bn.gioiTinh]}`}
              {bn.soDienThoai && ` · ${bn.soDienThoai}`}
            </p>
            {bn.tienSuBenh && <p className="mt-1 text-xs text-gray-400">Tiền sử: {bn.tienSuBenh}</p>}
          </div>
          {!benhAnId && (
            <MedButton variant="primary" onClick={handleBatDauKham} loading={createMut.isLoading}>
              Bắt đầu khám
            </MedButton>
          )}
        </div>
      </MedCard>

      {/* Vitals */}
      {sinhHieu && (
        <MedCard title="Sinh hiệu">
          <VitalsCard data={sinhHieu} />
        </MedCard>
      )}

      {/* Tabs */}
      {benhAnId && (
        <>
          <div className="flex border-b border-gray-200">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {tab === 'kham' && (
            <MedCard>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); finishMut.mutate(); }}>
                {[
                  { key: 'trieuChung', label: 'Triệu chứng', rows: 3, placeholder: 'Mô tả triệu chứng bệnh nhân...' },
                  { key: 'chanDoanSoBo', label: 'Chẩn đoán sơ bộ', rows: 2 },
                  { key: 'chanDoanXacDinh', label: 'Chẩn đoán xác định', rows: 2 },
                  { key: 'ketQuaKham', label: 'Kết quả khám', rows: 3, placeholder: 'Kết quả khám lâm sàng...' },
                  { key: 'phuongPhapDieuTri', label: 'Phương pháp điều trị', rows: 2 },
                ].map(({ key, label, rows, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <textarea
                      rows={rows}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder || `Nhập ${label.toLowerCase()}...`}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                ))}
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
                  <MedButton variant="secondary" type="button" onClick={() =>
                    apiPatch(`/ho-so-benh-an/benh-an-kham/${benhAnId}`, form)
                  }>
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
          )}

          {tab === 'xn' && <XetNghiemTab benhAnKhamId={benhAnId} />}
          {tab === 'lich_su' && <LichSuTab benhNhanId={bn.id} />}
        </>
      )}
    </div>
  );
}

function XetNghiemTab({ benhAnKhamId }) {
  const { data } = useQuery({
    queryKey: ['xn-benh-an', benhAnKhamId],
    queryFn: () => apiGet(`/xet-nghiem/benh-an-kham/${benhAnKhamId}`),
  });
  const items = data?.data || [];

  return (
    <MedCard title="Chỉ định xét nghiệm">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">Chưa có chỉ định xét nghiệm nào</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ chiDinh, ketQua }) => (
            <div key={chiDinh.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-gray-900">{chiDinh.dichVu?.tenDichVu}</p>
                <StatusBadge status={chiDinh.trangThai} size="sm" />
              </div>
              {ketQua && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2.5">
                  <p className="text-sm"><span className="font-medium text-gray-700">Kết quả:</span> {ketQua.giaTri} {ketQua.donVi}</p>
                  {ketQua.nhanXet && <p className="text-xs text-gray-500 mt-0.5">Nhận xét: {ketQua.nhanXet}</p>}
                </div>
              )}
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

