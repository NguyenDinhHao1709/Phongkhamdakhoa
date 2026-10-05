import { useEffect, useState } from 'react';
import { Check, ClipboardList, PackageCheck, Plus, RefreshCw, Wallet, FileCheck2, CircleCheck, X, Send, Truck, ClipboardCheck } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDel } from '../../services/api';
import useAuthStore from '../../store/authStore';

const emptyItem = { thuocId: '', nhaCungCapId: '', soLuongDat: 1, donGiaBao: 0 };
const STATUS_LABELS = {
  cho_duyet: 'Chờ giám đốc duyệt',
  da_duyet: 'Đã duyệt - chờ xử lý',
  dang_bao_gia: 'Đang lấy báo giá',
  da_chon_nha_cung_cap: 'Đã chọn nhà cung cấp',
  dang_giao: 'Đang chờ giao hàng',
  giao_mot_phan: 'Giao thiếu / có hàng hỏng',
  da_nhap_kho: 'Đã nhập kho',
  tu_choi: 'Đã từ chối',
};
const PAYMENT_LABELS = { chua_chi: 'Chưa chi', cho_chi: 'Chờ thu ngân chi', da_chi: 'Đã chi' };
const PAYMENT_METHOD_LABELS = { chuyen_khoan: 'Chuyển khoản', tien_mat: 'Tiền mặt', the: 'Thẻ / POS' };
const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export default function MuaHangThuocPage() {
  const [list, setList] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ ghiChu: '', chiTiet: [{ ...emptyItem }] });
  const [supplierForm, setSupplierForm] = useState({ tenNhaCungCap: '', soDienThoai: '', email: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ soTien: '', phuongThucChi: 'chuyen_khoan', soChungTuChi: '', ghiChu: '' });
  const [paymentChecks, setPaymentChecks] = useState({ daDoiChieuNhapKho: false, daDoiChieuSoLuong: false, daDoiChieuHoaDon: false });
  const [paymentError, setPaymentError] = useState('');
  const [quotationModal, setQuotationModal] = useState(null);
  const [quotationItems, setQuotationItems] = useState([]);
  const [receivingModal, setReceivingModal] = useState(null);
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingError, setReceivingError] = useState('');
  const { user } = useAuthStore();
  const role = user?.vaiTro;
  const isPharmacy = role === 'nhan_vien_nha_thuoc' || role === 'nha_thuoc';
  const isDirector = role === 'ban_giam_doc';
  const isCashier = role === 'thu_ngan';

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [requests, medicines, supplierResponse] = await Promise.all([
        apiGet('/nha-thuoc/mua-hang'),
        apiGet('/nha-thuoc/thuoc'),
        apiGet('/nha-thuoc/mua-hang/nha-cung-cap').catch(() => ({ data: [] })),
      ]);
      setList(requests.data || []);
      setMedicines(medicines.data || []);
      const supplierData = supplierResponse?.data?.data || supplierResponse?.data || supplierResponse || [];
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể tải dữ liệu mua hàng.';
      setLoadError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiPost('/nha-thuoc/mua-hang/yeu-cau', form);
      setForm({ ghiChu: '', chiTiet: [{ ...emptyItem }] });
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message
        || requestError?.message
        || 'Không thể gửi yêu cầu mua thuốc.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const addSupplier = async (event) => {
    event.preventDefault();
    try {
      if (editingSupplier) {
        await apiPatch(`/nha-thuoc/mua-hang/nha-cung-cap/${editingSupplier.id}`, supplierForm);
      } else {
        await apiPost('/nha-thuoc/mua-hang/nha-cung-cap', supplierForm);
      }
      setSupplierForm({ tenNhaCungCap: '', soDienThoai: '', email: '' });
      setEditingSupplier(null);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể thêm nhà cung cấp.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const editSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      tenNhaCungCap: supplier.tenNhaCungCap || '',
      soDienThoai: supplier.soDienThoai || '',
      email: supplier.email || '',
    });
  };

  const removeSupplier = async (supplier) => {
    if (!window.confirm(`Ngừng hợp tác với "${supplier.tenNhaCungCap}"? Lịch sử mua hàng vẫn được giữ nguyên.`)) return;
    try {
      await apiDel(`/nha-thuoc/mua-hang/nha-cung-cap/${supplier.id}`);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể ngừng hợp tác nhà cung cấp.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const approve = async (id, duyet) => {
    await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${id}/duyet`, { duyet, lyDo: duyet ? undefined : 'Không đáp ứng ngân sách hoặc nhu cầu' });
    await load();
  };

  const receive = async (request) => {
    setReceivingModal(request);
    setReceivingError('');
    setReceivingItems(request.chiTiet.map((item) => {
      const soLuongGiao = Number(item.soLuongGiao || 0);
      const soLuongDatChatLuong = Math.min(
        soLuongGiao,
        Math.max(0, Number(item.soLuongDatChatLuong ?? 0)),
      );
      return {
        id: item.id,
        baoGiaSoSanh: item.baoGiaSoSanh,
        soLuongGiao,
        soLuongDatChatLuong,
        soLuongHong: soLuongGiao - soLuongDatChatLuong,
        maLo: item.maLo || `LO-${request.id}-${item.id}`,
        ngayHetHan: item.ngayHetHan ? String(item.ngayHetHan).slice(0, 10) : '',
      };
    }));
  };

  const openQuotation = (request) => {
    setQuotationModal(request);
    setQuotationItems(request.chiTiet.map((item) => ({
      id: item.id,
      nhaCungCapId: item.nhaCungCapId || '',
      donGiaBao: item.donGiaBao || 0,
      donGiaChon: item.donGiaChon || item.donGiaBao || 0,
      baoGiaSoSanh: Array.isArray(item.baoGiaSoSanh) && item.baoGiaSoSanh.length
        ? item.baoGiaSoSanh
        : [{ nhaCungCapId: item.nhaCungCapId || '', donGia: item.donGiaBao || 0 }],
    })));
  };

  const submitQuotation = async (event) => {
    event.preventDefault();
    await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${quotationModal.id}/bao-gia`, { chiTiet: quotationItems });
    setQuotationModal(null);
    await load();
  };

  const submitReceiving = async (event) => {
    event.preventDefault();
    const invalidItem = receivingItems.find((item) => (
      Number(item.soLuongGiao || 0)
      !== Number(item.soLuongDatChatLuong || 0) + Number(item.soLuongHong || 0)
    ));
    if (invalidItem) {
      setReceivingError('Số lượng giao phải bằng số lượng đạt cộng số lượng hỏng ở từng dòng. Ví dụ giao 100, đạt 100 thì hỏng phải là 0.');
      return;
    }
    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${receivingModal.id}/tiep-nhan`, { chiTiet: receivingItems });
      setReceivingModal(null);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể kiểm nhận và nhập kho.';
      setReceivingError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const updateReceivingQuantity = (index, field, value) => {
    setReceivingError('');
    setReceivingItems((items) => items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const numericValue = Math.max(0, Number(value) || 0);
      const soLuongGiao = Number(item.soLuongGiao || 0);
      if (field === 'soLuongGiao') {
        const soLuongDatChatLuong = Math.min(Number(item.soLuongDatChatLuong || 0), numericValue);
        return {
          ...item,
          soLuongGiao: numericValue,
          soLuongDatChatLuong,
          soLuongHong: numericValue - soLuongDatChatLuong,
        };
      }
      if (field === 'soLuongDatChatLuong') {
        const soLuongDatChatLuong = Math.min(numericValue, soLuongGiao);
        return { ...item, soLuongDatChatLuong, soLuongHong: soLuongGiao - soLuongDatChatLuong };
      }
      const soLuongHong = Math.min(numericValue, soLuongGiao);
      return { ...item, soLuongHong, soLuongDatChatLuong: soLuongGiao - soLuongHong };
    }));
  };

  const openPayment = (request) => {
    setPaymentModal(request);
    setPaymentError('');
    setPaymentChecks({ daDoiChieuNhapKho: false, daDoiChieuSoLuong: false, daDoiChieuHoaDon: false });
    setPaymentForm({
      soTien: String(request.tongThucTe || 0),
      phuongThucChi: 'chuyen_khoan',
      soChungTuChi: `PC-${request.maYeuCau}`,
      ghiChu: '',
    });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!Object.values(paymentChecks).every(Boolean)) {
      setPaymentError('Vui lòng hoàn tất đủ 3 bước đối chiếu trước khi ghi nhận chi.');
      return;
    }
    if (!paymentForm.soChungTuChi.trim()) {
      setPaymentError('Số phiếu chi là bắt buộc để lưu sổ kế toán.');
      return;
    }
    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${paymentModal.id}/chi-tra`, {
        soTien: Number(paymentForm.soTien),
        phuongThucChi: paymentForm.phuongThucChi,
        soChungTuChi: paymentForm.soChungTuChi.trim(),
        ghiChu: paymentForm.ghiChu.trim() || 'Đã đối chiếu phiếu nhập và kiểm nhận hàng',
      });
      setPaymentModal(null);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể ghi nhận phiếu chi.';
      setPaymentError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const displayedList = isCashier
    ? list.filter((item) => item.trangThai === 'da_nhap_kho')
    : list;
  const paymentTotals = displayedList.reduce((totals, item) => {
    const amount = Number(item.soTienChiTra || item.tongThucTe || 0);
    totals.total += amount;
    if (item.trangThaiChiTra === 'da_chi') totals.paid += Number(item.soTienChiTra || item.tongThucTe || 0);
    else if (item.trangThai === 'da_nhap_kho') totals.due += amount;
    return totals;
  }, { total: 0, paid: 0, due: 0 });
  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between rounded-2xl border bg-white p-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900"><ClipboardList className="text-primary-600" /> Mua hàng & Nhập kho thuốc</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isPharmacy ? 'Lập yêu cầu, báo giá, kiểm nhận và nhập kho' : isDirector ? 'Chỉ phê duyệt hoặc từ chối yêu cầu mua thuốc' : 'Đối chiếu công nợ, lập phiếu chi và ghi sổ kế toán nhà cung cấp'}
          </p>
        </div>
        {loadError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError} <button type="button" onClick={load} className="ml-2 font-semibold underline">Thử lại</button></div>}
        <button onClick={load} className="rounded-lg border px-3 py-2 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" /> Làm mới</button>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">Luồng xử lý</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['1', 'Nhà thuốc lập yêu cầu', 'Chọn thuốc và số lượng'],
            ['2', 'Giám đốc phê duyệt', 'Duyệt hoặc từ chối'],
            ['3', 'Nhà thuốc kiểm nhận', 'Nhập kho phần đạt'],
            ['4', 'Thu ngân lập phiếu chi', 'Chi tiền và lưu chứng từ'],
          ].map(([number, title, description]) => (
            <div key={number} className="flex gap-3 rounded-xl bg-gray-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">{number}</span>
              <div><p className="text-sm font-semibold text-gray-900">{title}</p><p className="mt-1 text-xs text-gray-500">{description}</p></div>
            </div>
          ))}
        </div>
      </div>

      {isCashier && (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Tổng giá trị nhập', paymentTotals.total],
            ['Đã chi', paymentTotals.paid],
            ['Còn phải chi', paymentTotals.due],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-4">
              <p className="text-xs font-semibold text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{Number(value).toLocaleString('vi-VN')} đ</p>
            </div>
          ))}
        </div>
      )}

      {isPharmacy && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Chờ duyệt', list.filter((item) => item.trangThai === 'cho_duyet').length, 'text-amber-700 bg-amber-50'],
            ['Cần báo giá', list.filter((item) => ['da_duyet', 'dang_bao_gia'].includes(item.trangThai)).length, 'text-blue-700 bg-blue-50'],
            ['Chờ kiểm nhận', list.filter((item) => ['da_chon_nha_cung_cap', 'dang_giao'].includes(item.trangThai)).length, 'text-violet-700 bg-violet-50'],
            ['Đã nhập kho', list.filter((item) => ['da_nhap_kho', 'giao_mot_phan'].includes(item.trangThai)).length, 'text-emerald-700 bg-emerald-50'],
          ].map(([label, value, color]) => (
            <div key={label} className={`rounded-2xl border p-4 ${color}`}>
              <p className="text-xs font-semibold">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isPharmacy && <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submitRequest} className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-bold">Nhân viên nhà thuốc: gửi yêu cầu mua</h2>
          {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {form.chiTiet.map((item, index) => (
            <div key={index} className="mb-3 grid gap-2 md:grid-cols-[minmax(0,2fr)_110px_140px_minmax(0,1.5fr)_42px]">
              <label className="text-xs font-semibold text-gray-600">Thuốc
              <select required value={item.thuocId} onChange={(e) => setForm((f) => ({ ...f, chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, thuocId: e.target.value } : x) }))} className="rounded border p-2 text-sm">
                <option value="">Chọn thuốc</option>
                {medicines.filter((medicine) => medicine.trangThai !== 'ngung_kinh_doanh').map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicine.maThuoc} - {medicine.tenThuoc}
                  </option>
                ))}
              </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">Số lượng đặt
                <input required type="number" min="1" value={item.soLuongDat} onChange={(e) => setForm((f) => ({ ...f, chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, soLuongDat: e.target.value } : x) }))} className="mt-1 w-full rounded border p-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-gray-600">Giá dự kiến / đơn vị
                <input type="number" min="0" value={item.donGiaBao} onChange={(e) => setForm((f) => ({ ...f, chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, donGiaBao: e.target.value } : x) }))} className="mt-1 w-full rounded border p-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-gray-600">Nhà cung cấp dự kiến
                <select value={item.nhaCungCapId} onChange={(e) => setForm((f) => ({ ...f, chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, nhaCungCapId: e.target.value } : x) }))} className="mt-1 w-full rounded border p-2 text-sm">
                  <option value="">Chưa chọn (sẽ lấy báo giá)</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tenNhaCungCap}</option>)}
                </select>
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setForm((f) => ({ ...f, chiTiet: [...f.chiTiet, { ...emptyItem }] }))} className="rounded border px-2 text-primary-700" aria-label="Thêm dòng thuốc"><Plus className="mx-auto h-4 w-4" /></button>
                {form.chiTiet.length > 1 && <button type="button" onClick={() => setForm((f) => ({ ...f, chiTiet: f.chiTiet.filter((_, i) => i !== index) }))} className="rounded border px-2 text-red-600" aria-label="Xóa dòng thuốc"><X className="mx-auto h-4 w-4" /></button>}
              </div>
            </div>
          ))}
          <label className="mt-2 block text-xs font-semibold text-gray-600">Lý do / yêu cầu đặc biệt
            <textarea value={form.ghiChu} onChange={(e) => setForm({ ...form, ghiChu: e.target.value })} placeholder="Ví dụ: hạn dùng tối thiểu 12 tháng..." className="mt-1 w-full rounded border p-2 text-sm" />
          </label>
          <button className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">Gửi yêu cầu cho giám đốc</button>
        </form>

        <form onSubmit={addSupplier} className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-bold">Danh mục nhà cung cấp</h2>
          <div className="grid gap-2">
            <input required placeholder="Tên nhà cung cấp" value={supplierForm.tenNhaCungCap} onChange={(e) => setSupplierForm({ ...supplierForm, tenNhaCungCap: e.target.value })} className="rounded border p-2 text-sm" />
            <input placeholder="Số điện thoại" value={supplierForm.soDienThoai} onChange={(e) => setSupplierForm({ ...supplierForm, soDienThoai: e.target.value })} className="rounded border p-2 text-sm" />
            <input type="email" placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="rounded border p-2 text-sm" />
          </div>
          <button className="mt-3 rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700">{editingSupplier ? 'Lưu nhà cung cấp' : 'Thêm nhà cung cấp'}</button>
          {editingSupplier && <button type="button" onClick={() => { setEditingSupplier(null); setSupplierForm({ tenNhaCungCap: '', soDienThoai: '', email: '' }); }} className="ml-2 rounded-lg border px-4 py-2 text-sm text-gray-600">Hủy sửa</button>}
          <div className="mt-4 space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-gray-600">Nhà cung cấp đang hợp tác ({suppliers.length})</p>
            {suppliers.length === 0 ? <p className="text-xs text-gray-500">Chưa có nhà cung cấp. Thêm nhà cung cấp để lập bảng so sánh giá.</p> : suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <div><span className="font-semibold text-gray-800">{supplier.tenNhaCungCap}</span><span className="ml-3 text-gray-500">{supplier.soDienThoai || supplier.email || 'Chưa có liên hệ'}</span></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editSupplier(supplier)} className="font-semibold text-blue-600">Sửa</button>
                  <button type="button" onClick={() => removeSupplier(supplier)} className="font-semibold text-rose-600">Ngừng hợp tác</button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">Báo giá được lưu theo từng thuốc và từng nhà cung cấp để so sánh trước khi chọn.</p>
        </form>
      </div>}

      <div className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 font-bold">Quy trình mua hàng</h2>
        {loading ? <p>Đang tải...</p> : displayedList.length === 0 ? <p className="text-sm text-gray-500">{isCashier ? 'Chưa có hồ sơ công nợ nào đủ điều kiện đối chiếu.' : 'Chưa có yêu cầu mua thuốc.'}</p> : (
          <div className="space-y-3">
            {displayedList.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><b>{item.maYeuCau}</b><span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{STATUS_LABELS[item.trangThai] || item.trangThai}</span><span className={`ml-2 rounded-full px-2 py-1 text-xs ${item.trangThaiChiTra === 'da_chi' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{PAYMENT_LABELS[item.trangThaiChiTra] || item.trangThaiChiTra}</span></div>
                  <div className="flex gap-2">
                    {isDirector && item.trangThai === 'cho_duyet' && <><button onClick={() => approve(item.id, true)} className="rounded bg-emerald-600 px-3 py-1 text-xs text-white"><Check className="mr-1 inline h-3 w-3" />Duyệt</button><button onClick={() => approve(item.id, false)} className="rounded bg-red-600 px-3 py-1 text-xs text-white">Từ chối</button></>}
                    {isPharmacy && ['da_duyet', 'dang_bao_gia'].includes(item.trangThai) && <button onClick={() => openQuotation(item)} className="rounded bg-violet-600 px-3 py-1 text-xs text-white"><Send className="mr-1 inline h-3 w-3" />Báo giá & chọn NCC</button>}
                    {isPharmacy && ['da_chon_nha_cung_cap', 'dang_giao'].includes(item.trangThai) && <button onClick={() => receive(item)} className="rounded bg-blue-600 px-3 py-1 text-xs text-white"><ClipboardCheck className="mr-1 inline h-3 w-3" />Kiểm nhận hàng</button>}
                    {isCashier && item.trangThai === 'da_nhap_kho' && item.trangThaiChiTra !== 'da_chi' && <button onClick={() => openPayment(item)} className="rounded bg-amber-600 px-3 py-1 text-xs text-white"><Wallet className="mr-1 inline h-3 w-3" />Kiểm tra & lập phiếu chi</button>}
                  </div>
                  {paymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
                      <form onSubmit={submitPayment} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Quy trình chi tiền nhà cung cấp</p>
                            <h2 className="mt-1 text-xl font-bold text-gray-900">Kiểm tra và lập phiếu chi</h2>
                            <p className="mt-1 text-sm text-gray-500">Chứng từ {paymentModal.maYeuCau} · Chỉ ghi nhận chi sau khi đã đối chiếu.</p>
                          </div>
                          <button type="button" onClick={() => setPaymentModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {[
                            ['daDoiChieuNhapKho', 'Đã có phiếu nhập kho', 'Hàng đã được nhà thuốc kiểm nhận'],
                            ['daDoiChieuSoLuong', 'Đã đối chiếu số lượng', 'Chỉ thanh toán số lượng đạt'],
                            ['daDoiChieuHoaDon', 'Đã kiểm tra chứng từ', 'Giá và tổng tiền khớp hồ sơ'],
                          ].map(([key, title, description]) => (
                            <label key={key} className={`cursor-pointer rounded-xl border p-3 ${paymentChecks[key] ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><input type="checkbox" checked={paymentChecks[key]} onChange={(e) => setPaymentChecks((checks) => ({ ...checks, [key]: e.target.checked }))} /><CircleCheck className={`h-4 w-4 ${paymentChecks[key] ? 'text-emerald-600' : 'text-gray-300'}`} />{title}</span>
                              <span className="mt-1 block pl-6 text-xs text-gray-500">{description}</span>
                            </label>
                          ))}
                        </div>

                        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Giá trị thực tế phải trả</span><b className="text-lg text-gray-900">{formatMoney(paymentModal.tongThucTe)}</b></div>
                          <div className="mt-2 text-xs text-gray-500">Đã nhập kho: {paymentModal.trangThai === 'da_nhap_kho' ? 'Đủ theo yêu cầu' : 'Giao một phần / có hàng không đạt'}</div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <label className="text-xs font-semibold text-gray-600">Số tiền chi
                            <input required type="number" min="1" max={paymentModal.tongThucTe} value={paymentForm.soTien} onChange={(e) => setPaymentForm({ ...paymentForm, soTien: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5 text-sm" />
                          </label>
                          <label className="text-xs font-semibold text-gray-600">Phương thức chi
                            <select value={paymentForm.phuongThucChi} onChange={(e) => setPaymentForm({ ...paymentForm, phuongThucChi: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5 text-sm">
                              <option value="chuyen_khoan">Chuyển khoản</option><option value="tien_mat">Tiền mặt</option><option value="the">Thẻ / POS</option>
                            </select>
                          </label>
                          <label className="text-xs font-semibold text-gray-600">Số phiếu chi / số chứng từ
                            <input required value={paymentForm.soChungTuChi} onChange={(e) => setPaymentForm({ ...paymentForm, soChungTuChi: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5 text-sm" />
                          </label>
                          <label className="text-xs font-semibold text-gray-600">Ghi chú kế toán
                            <input value={paymentForm.ghiChu} onChange={(e) => setPaymentForm({ ...paymentForm, ghiChu: e.target.value })} placeholder="Ví dụ: thanh toán đủ theo phiếu nhập..." className="mt-1 w-full rounded-lg border p-2.5 text-sm" />
                          </label>
                        </div>
                        {paymentError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{paymentError}</p>}
                        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                          <button type="button" onClick={() => setPaymentModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700">Hủy</button>
                          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><FileCheck2 className="mr-1 inline h-4 w-4" />Ghi nhận phiếu chi</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                  {item.chiTiet?.map((ct) => <div key={ct.id} className="rounded-lg bg-gray-50 p-2">Thuốc <b>{ct.tenThuoc || `#${ct.thuocId}`}</b>: đặt <b>{ct.soLuongDat}</b> · giao <b>{ct.soLuongGiao}</b> · đạt <b>{ct.soLuongDatChatLuong}</b> · hỏng <b>{ct.soLuongHong}</b> · thiếu <b>{ct.soLuongThieu}</b></div>)}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-700">
                  <span>Giá dự toán: <b>{formatMoney(item.tongDuToan)}</b></span>
                  <span>Giá trị thực tế: <b>{formatMoney(item.tongThucTe)}</b></span>
                  {isCashier && <span>Đã chi: <b>{formatMoney(item.soTienChiTra)}</b>{item.soChungTuChi && <> · Phiếu chi: <b>{item.soChungTuChi}</b> · {PAYMENT_METHOD_LABELS[item.phuongThucChi] || item.phuongThucChi}</>}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {quotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <form onSubmit={submitQuotation} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Bước 3 · Mua hàng</p><h2 className="mt-1 text-xl font-bold">So sánh báo giá và chọn nhà cung cấp</h2><p className="mt-1 text-sm text-gray-500">{quotationModal.maYeuCau} · Chỉ chọn nhà cung cấp sau khi yêu cầu đã được duyệt.</p></div>
              <button type="button" onClick={() => setQuotationModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {receivingError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{receivingError}</div>}
            <div className="mt-4 space-y-3">
              {quotationItems.map((quotation, index) => {
                const detail = quotationModal.chiTiet[index];
                return (
                  <div key={quotation.id} className="rounded-xl border bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">{detail.tenThuoc || `Thuốc #${detail.thuocId}`} <span className="text-xs font-normal text-gray-500">· Số lượng {detail.soLuongDat}</span></p>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-600">Bảng so sánh giá</p>
                      {quotation.baoGiaSoSanh.map((quote, quoteIndex) => (
                        <div key={`${quotation.id}-${quoteIndex}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_90px]">
                          <select required value={quote.nhaCungCapId} onChange={(e) => setQuotationItems((items) => items.map((item, i) => i === index ? { ...item, baoGiaSoSanh: item.baoGiaSoSanh.map((q, qi) => qi === quoteIndex ? { ...q, nhaCungCapId: e.target.value } : q) } : item))} className="rounded-lg border bg-white p-2.5 text-sm">
                            <option value="">Chọn nhà cung cấp</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tenNhaCungCap}</option>)}
                          </select>
                          <input required type="number" min="0" value={quote.donGia} placeholder="Giá báo" onChange={(e) => setQuotationItems((items) => items.map((item, i) => i === index ? { ...item, baoGiaSoSanh: item.baoGiaSoSanh.map((q, qi) => qi === quoteIndex ? { ...q, donGia: e.target.value } : q) } : item))} className="rounded-lg border bg-white p-2.5 text-sm" />
                          <button type="button" onClick={() => setQuotationItems((items) => items.map((item, i) => i === index ? { ...item, baoGiaSoSanh: item.baoGiaSoSanh.filter((_, qi) => qi !== quoteIndex) } : item))} className="rounded-lg border border-rose-200 px-2 text-xs text-rose-600">Xóa</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setQuotationItems((items) => items.map((item, i) => i === index ? { ...item, baoGiaSoSanh: [...item.baoGiaSoSanh, { nhaCungCapId: '', donGia: 0 }] } : item))} className="text-xs font-semibold text-violet-700">+ Thêm nhà cung cấp để so sánh</button>
                      <label className="block text-xs font-semibold text-gray-600">Nhà cung cấp được chọn
                        <select required value={quotation.nhaCungCapId} onChange={(e) => setQuotationItems((items) => items.map((item, i) => i === index ? { ...item, nhaCungCapId: e.target.value, donGiaChon: item.baoGiaSoSanh.find((q) => String(q.nhaCungCapId) === e.target.value)?.donGia || item.donGiaChon } : item))} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm">
                          <option value="">Chọn nhà cung cấp có giá phù hợp</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tenNhaCungCap}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setQuotationModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Hủy</button><button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"><Send className="mr-1 inline h-4 w-4" />Lưu báo giá và chọn NCC</button></div>
          </form>
        </div>
      )}

      {receivingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <form onSubmit={submitReceiving} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bước 5 · Kho dược</p><h2 className="mt-1 text-xl font-bold">Kiểm nhận và nhập kho</h2><p className="mt-1 text-sm text-gray-500">{receivingModal.maYeuCau} · Nhập kho theo số lượng thực nhận và đạt chất lượng.</p></div>
              <button type="button" onClick={() => setReceivingModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              {receivingItems.map((received, index) => {
                const detail = receivingModal.chiTiet[index];
                return <div key={received.id} className="rounded-xl border bg-gray-50 p-4"><p className="font-semibold">{detail.tenThuoc || `Thuốc #${detail.thuocId}`} <span className="text-xs font-normal text-gray-500">· Đặt {detail.soLuongDat}</span></p><p className="mt-1 text-xs text-gray-500">Nhập số lượng giao thực tế, hệ thống tự tính phần đạt và hỏng. Hạn dùng bắt buộc nếu có hàng đạt.</p><div className="mt-3 grid gap-3 md:grid-cols-5">{[['soLuongGiao', 'Số lượng giao'], ['soLuongDatChatLuong', 'Số lượng đạt'], ['soLuongHong', 'Số lượng hỏng']].map(([key, label]) => <label key={key} className="text-xs font-semibold text-gray-600">{label}<input required type="number" min="0" max={key === 'soLuongGiao' ? detail.soLuongDat : received.soLuongGiao} value={received[key]} onChange={(e) => updateReceivingQuantity(index, key, e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm" /></label>)}<label className="text-xs font-semibold text-gray-600">Mã lô<input required value={received.maLo} onChange={(e) => setReceivingItems((items) => items.map((item, i) => i === index ? { ...item, maLo: e.target.value } : item))} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm" /></label><label className="text-xs font-semibold text-gray-600">Hạn dùng<input required={received.soLuongDatChatLuong > 0} type="date" min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)} value={received.ngayHetHan} onChange={(e) => setReceivingItems((items) => items.map((item, i) => i === index ? { ...item, ngayHetHan: e.target.value } : item))} className="mt-1 w-full rounded-lg border bg-white p-2.5 text-sm" /></label></div></div>;
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setReceivingModal(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Hủy</button><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><PackageCheck className="mr-1 inline h-4 w-4" />Xác nhận kiểm nhận và nhập kho</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
