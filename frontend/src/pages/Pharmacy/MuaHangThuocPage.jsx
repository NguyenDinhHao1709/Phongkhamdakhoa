import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Check, ClipboardList, PackageCheck, Plus, RefreshCw, Wallet,
  FileCheck2, CircleCheck, X, Send, Truck, ClipboardCheck,
  AlertTriangle, TrendingUp, Sparkles, Printer, Eye, FileText,
  Building2, ShieldAlert, DollarSign, Layers, Search, ArrowRight,
  Boxes, CheckCircle2, XCircle, Zap, ArrowUpRight, ArrowDownRight, History,
  Download, Upload, Trash2, FileSpreadsheet
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDel } from '../../services/api';
import useAuthStore from '../../store/authStore';

const emptyItem = { thuocId: '', nhaCungCapId: '', soLuongDat: 1, donGiaBao: 0 };

const STATUS_CONFIG = {
  cho_duyet: { label: '1. Chờ giám đốc duyệt', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 2 },
  da_duyet: { label: '2. Đã duyệt - Lấy báo giá', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 3 },
  dang_bao_gia: { label: '3. Đang so sánh báo giá', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', step: 4 },
  da_chon_nha_cung_cap: { label: '4. Đã chọn NCC - Chờ PO', color: 'bg-purple-50 text-purple-700 border-purple-200', step: 4 },
  dang_giao: { label: '5. Đã phát PO - Đang giao', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', step: 5 },
  da_kiem_nhan: { label: '6. Đã kiểm nhận - Chờ chi', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 6 },
  giao_mot_phan: { label: '6. Có hàng hỏng/thiếu - Chờ chi', color: 'bg-orange-50 text-orange-700 border-orange-200', step: 6 },
  da_nhap_kho: { label: '7. Đã thanh toán & Nạp kho', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', step: 7 },
  tu_choi_nhan: { label: 'X. Từ chối nhận toàn bộ', color: 'bg-rose-50 text-rose-700 border-rose-200', step: 6 },
  tu_choi: { label: 'X. Ban giám đốc từ chối', color: 'bg-gray-100 text-gray-700 border-gray-200', step: 2 },
};

const PAYMENT_CONFIG = {
  chua_chi: { label: 'Chưa thanh toán', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  cho_chi: { label: 'Chờ thu ngân chi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  da_chi: { label: 'Đã thanh toán', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  khong_chi: { label: 'Hủy chi trả (Từ chối nhận)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const PAYMENT_METHOD_LABELS = {
  chuyen_khoan: 'Chuyển khoản ngân hàng',
  tien_mat: 'Tiền mặt tại quỹ',
  the: 'Thẻ / POS',
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
};

export default function MuaHangThuocPage() {
  const [list, setList] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [forecastList, setForecastList] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('tat_ca'); // 'tat_ca', 'pr', 'po', 'grn', 'ap', 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');

  // Form Yêu cầu PR
  const [showPrModal, setShowPrModal] = useState(false);
  const [form, setForm] = useState({ ghiChu: '', chiTiet: [{ ...emptyItem }] });

  // Modal Dự báo nhu cầu AI
  const [showForecastModal, setShowForecastModal] = useState(false);

  // Form Nhà cung cấp & Bảng giá Excel
  const [supplierForm, setSupplierForm] = useState({ tenNhaCungCap: '', soDienThoai: '', email: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewPriceListModal, setViewPriceListModal] = useState(null);
  const [priceListSearch, setPriceListSearch] = useState('');

  // Modal Báo giá RFQ & PO
  const [quotationModal, setQuotationModal] = useState(null);
  const [quotationItems, setQuotationItems] = useState([]);

  // Modal Tiếp nhận & Kiểm nhận Y tế (GRN / QC)
  const [receivingModal, setReceivingModal] = useState(null);
  const [receivingBranch, setReceivingBranch] = useState('dat_du'); // 'dat_du', 'dat_mot_phan', 'co_hang_hong', 'tu_choi_nhan'
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingError, setReceivingError] = useState('');
  const [bienBanTraHang, setBienBanTraHang] = useState('');

  // Modal Đối chiếu 3 bên & Chi trả công nợ (AP)
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    soTien: '',
    phuongThucChi: 'chuyen_khoan',
    soChungTuChi: '',
    soHoaDonNcc: '',
    ngayHoaDonNcc: new Date().toISOString().slice(0, 10),
    ghiChu: '',
  });
  const [paymentChecks, setPaymentChecks] = useState({
    daDoiChieuNhapKho: false,
    daDoiChieuSoLuong: false,
    daDoiChieuHoaDon: false,
  });
  const [paymentError, setPaymentError] = useState('');

  // Modal Xem & In chứng từ chuẩn ERP
  const [docModal, setDocModal] = useState(null); // { type: 'PR' | 'PO' | 'GRN' | 'RETURN' | 'PAYMENT', data: object }

  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const role = user?.vaiTro;
  const isPharmacy = role === 'nhan_vien_nha_thuoc' || role === 'nha_thuoc' || role === 'quan_tri_vien' || role === 'quan_tri_vien_cap_cao';
  const isDirector = role === 'ban_giam_doc' || role === 'quan_tri_vien' || role === 'quan_tri_vien_cap_cao';
  const isCashier = role === 'thu_ngan' || role === 'quan_tri_vien' || role === 'quan_tri_vien_cap_cao';

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [requests, medsRes, supplierResponse] = await Promise.all([
        apiGet('/nha-thuoc/mua-hang'),
        apiGet('/nha-thuoc/thuoc'),
        apiGet('/nha-thuoc/mua-hang/nha-cung-cap').catch(() => ({ data: [] })),
      ]);
      setList(requests.data || []);
      setMedicines(medsRes.data || []);
      const supplierData = supplierResponse?.data?.data || supplierResponse?.data || supplierResponse || [];
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể tải dữ liệu mua hàng.';
      setLoadError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await apiGet('/nha-thuoc/du-bao-nhu-cau');
      setForecastList(res?.data?.data || res?.data || []);
    } catch (err) {
      console.warn('Lỗi tải dự báo:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (location.state?.createPrFromForecast) {
      const forecastItem = location.state.createPrFromForecast;
      setForm({
        ghiChu: forecastItem.ghiChu || 'Nhu cầu bổ sung theo gợi ý AI dự báo',
        chiTiet: [
          {
            thuocId: String(forecastItem.id),
            nhaCungCapId: '',
            soLuongDat: forecastItem.soLuongDat || 50,
            donGiaBao: 0,
          },
        ],
      });
      setActiveTab('pr');
      setShowPrModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // 1. Tạo yêu cầu PR
  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiPost('/nha-thuoc/mua-hang/yeu-cau', form);
      setForm({ ghiChu: '', chiTiet: [{ ...emptyItem }] });
      setShowPrModal(false);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể gửi yêu cầu mua thuốc.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  // Nạp từ AI dự báo vào form PR
  const importFromForecast = (forecastItem) => {
    const defaultQty = Math.max(1, Number(forecastItem.soLuongDeXuatNhap || 50));
    setForm((prev) => ({
      ...prev,
      ghiChu: prev.ghiChu || `Nhu cầu bổ sung theo gợi ý AI dự báo (${forecastItem.trangThai})`,
      chiTiet: [
        ...prev.chiTiet.filter((item) => item.thuocId),
        {
          thuocId: String(forecastItem.id),
          nhaCungCapId: '',
          soLuongDat: defaultQty,
          donGiaBao: 0,
        },
      ],
    }));
    setShowForecastModal(false);
    setShowPrModal(true);
  };

  // 2. Phê duyệt PR (Ban Giám Đốc)
  const approve = async (id, duyet) => {
    let lyDo = undefined;
    if (!duyet) {
      const promptReason = window.prompt('Nhập lý do từ chối yêu cầu mua thuốc:', 'Không đáp ứng ngân sách hoặc chưa cần thiết');
      if (promptReason === null) return;
      lyDo = promptReason || 'Không đáp ứng ngân sách';
    }
    await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${id}/duyet`, { duyet, lyDo });
    await load();
  };

  // 3. Mở Báo giá RFQ & So sánh
  const openQuotation = (request) => {
    setQuotationModal(request);
    setQuotationItems(request.chiTiet.map((item) => ({
      id: item.id,
      nhaCungCapId: item.nhaCungCapId || '',
      donGiaBao: item.donGiaBao || 0,
      donGiaChon: item.donGiaChon || item.donGiaBao || 0,
      baoGiaSoSanh: Array.isArray(item.baoGiaSoSanh) && item.baoGiaSoSanh.length
        ? item.baoGiaSoSanh.map((q) => ({
            nhaCungCapId: q.nhaCungCapId || '',
            donGia: q.donGia || 0,
            ghiChu: q.ghiChu || '',
            hanDungCamKet: q.hanDungCamKet || '',
          }))
        : [{ nhaCungCapId: item.nhaCungCapId || (suppliers[0]?.id || ''), donGia: item.donGiaBao || 0, ghiChu: '', hanDungCamKet: '' }],
    })));
  };

  // Tự động chọn NCC có giá chào thấp nhất cho tất cả các thuốc
  const autoSelectBestPrice = () => {
    setQuotationItems((items) => items.map((item) => {
      const validQuotes = (item.baoGiaSoSanh || []).filter(
        (q) => Number(q.donGia) > 0 && q.nhaCungCapId
      );
      if (!validQuotes.length) return item;
      const best = validQuotes.reduce((min, q) =>
        Number(q.donGia) < Number(min.donGia) ? q : min
      , validQuotes[0]);
      return {
        ...item,
        nhaCungCapId: String(best.nhaCungCapId),
        donGiaChon: Number(best.donGia),
      };
    }));
  };

  // Tự động quét và khớp thuốc từ Bảng giá Excel của các Nhà Cung Cấp
  const scanFromSupplierPriceLists = () => {
    if (!quotationModal || !Array.isArray(quotationModal.chiTiet)) return;
    let matchCount = 0;

    setQuotationItems((prevItems) =>
      prevItems.map((item, idx) => {
        const detail = quotationModal.chiTiet[idx];
        if (!detail) return item;

        const detailName = (detail.tenThuoc || '').trim().toLowerCase();
        const detailCode = (detail.maThuoc || '').trim().toLowerCase();

        // Danh sách các quotes tìm thấy từ bảng giá Excel của các NCC
        const newQuotes = [];

        suppliers.forEach((sup) => {
          if (!Array.isArray(sup.bangGiaData) || sup.bangGiaData.length === 0) return;

          // Tìm kiếm trong bảng giá của NCC này
          const matched = sup.bangGiaData.find((p) => {
            const pCode = (p.maThuoc || '').trim().toLowerCase();
            const pName = (p.tenThuoc || '').trim().toLowerCase();
            const pHoatChat = (p.hoatChat || '').trim().toLowerCase();

            // 1. Khớp theo mã thuốc
            if (detailCode && pCode && detailCode === pCode) return true;
            // 2. Khớp theo tên thuốc
            if (pName && detailName && (pName === detailName || pName.includes(detailName) || detailName.includes(pName))) {
              return true;
            }
            // 3. Khớp theo hoạt chất
            if (pHoatChat && detailName && detailName.includes(pHoatChat)) {
              return true;
            }
            return false;
          });

          if (matched && Number(matched.donGia) > 0) {
            matchCount++;
            newQuotes.push({
              nhaCungCapId: String(sup.id),
              donGia: Number(matched.donGia),
              hanDungCamKet: matched.hanDungCamKet || matched.ghiChu || 'Theo bảng giá Excel',
              ghiChu: `Khớp tự động từ Excel: ${matched.tenThuoc}`,
            });
          }
        });

        // Nếu tìm thấy quotes từ bảng giá Excel, cập nhật danh sách báo giá cạnh tranh
        if (newQuotes.length > 0) {
          const best = newQuotes.reduce((min, q) => Number(q.donGia) < Number(min.donGia) ? q : min, newQuotes[0]);
          return {
            ...item,
            nhaCungCapId: String(best.nhaCungCapId),
            donGiaChon: Number(best.donGia),
            baoGiaSoSanh: newQuotes,
          };
        }

        return item;
      })
    );

    if (matchCount > 0) {
      alert(`Đã tự động quét và khớp thành công ${matchCount} báo giá từ các Bảng giá Excel của Nhà cung cấp!`);
    } else {
      alert('Không tìm thấy loại thuốc nào trong các Bảng giá Excel hiện có của các Nhà cung cấp. Hãy kiểm tra lại file bảng giá đã tải lên ở Tab 5.');
    }
  };

  // 1. Tải file mẫu Excel báo giá
  const downloadPriceListTemplate = (supplierName) => {
    const templateData = [
      {
        'Mã thuốc': 'TH005',
        'Tên thuốc & Hàm lượng': 'Amoxicillin 500mg',
        'Hoạt chất': 'Amoxicillin',
        'Đơn vị tính': 'Viên',
        'Đơn giá chào (VNĐ)': 5000,
        'Cam kết HSD / Điều kiện': 'HSD >= 24 tháng',
        'Ghi chú': 'Sẵn hàng tại kho'
      },
      {
        'Mã thuốc': 'TH003',
        'Tên thuốc & Hàm lượng': 'Vitamin C 1000mg',
        'Hoạt chất': 'Acid Ascorbic',
        'Đơn vị tính': 'Hộp',
        'Đơn giá chào (VNĐ)': 18000,
        'Cam kết HSD / Điều kiện': 'HSD >= 36 tháng',
        'Ghi chú': 'Giao hàng 24h'
      },
      {
        'Mã thuốc': 'TH001',
        'Tên thuốc & Hàm lượng': 'Paracetamol 500mg',
        'Hoạt chất': 'Paracetamol',
        'Đơn vị tính': 'Viên',
        'Đơn giá chào (VNĐ)': 800,
        'Cam kết HSD / Điều kiện': 'HSD >= 24 tháng',
        'Ghi chú': 'Bảo quản nhiệt độ phòng'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangGia');
    XLSX.writeFile(wb, `Mau_BaoGia_${supplierName ? supplierName.replace(/\s+/g, '_') : 'NCC'}.xlsx`);
  };

  // 2. Tải về bảng giá hiện tại của NCC ra file Excel
  const downloadCurrentPriceList = (supplier) => {
    if (!supplier || !Array.isArray(supplier.bangGiaData) || supplier.bangGiaData.length === 0) {
      alert('Nhà cung cấp chưa có bảng giá dược phẩm để tải về');
      return;
    }
    const dataToExport = supplier.bangGiaData.map((item, idx) => ({
      'STT': idx + 1,
      'Mã thuốc': item.maThuoc || '',
      'Tên thuốc & Hàm lượng': item.tenThuoc,
      'Hoạt chất': item.hoatChat || '',
      'Đơn vị tính': item.donViTinh || 'Hộp',
      'Đơn giá chào (VNĐ)': Number(item.donGia || 0),
      'Cam kết HSD / Điều kiện': item.hanDungCamKet || '',
      'Ghi chú': item.ghiChu || '',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangGia');
    XLSX.writeFile(wb, supplier.fileBangGiaTen || `BangGia_${supplier.tenNhaCungCap}.xlsx`);
  };

  // 3. Xử lý upload file Excel bảng giá
  const handleUploadPriceList = (e, supplier) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet);

        if (!rawRows || rawRows.length === 0) {
          alert('File Excel không có dữ liệu dòng nào!');
          return;
        }

        const parsedItems = rawRows.map((r) => {
          const tenThuoc = (r['Tên thuốc & Hàm lượng'] || r['Tên thuốc'] || r['Ten thuoc'] || r['tenThuoc'] || r['Tên Thuốc'] || r['Tên'] || '').toString().trim();
          const maThuoc = (r['Mã thuốc'] || r['Ma thuoc'] || r['maThuoc'] || r['Mã'] || '').toString().trim();
          const hoatChat = (r['Hoạt chất'] || r['hoatChat'] || '').toString().trim();
          const donViTinh = (r['Đơn vị tính'] || r['ĐVT'] || r['donViTinh'] || 'Hộp').toString().trim();
          const donGia = Number(r['Đơn giá chào (VNĐ)'] || r['Đơn giá'] || r['donGia'] || r['Giá'] || 0);
          const hanDungCamKet = (r['Cam kết HSD / Điều kiện'] || r['Hạn dùng'] || r['hanDungCamKet'] || '').toString().trim();
          const ghiChu = (r['Ghi chú'] || r['ghiChu'] || '').toString().trim();

          return { tenThuoc, maThuoc, hoatChat, donViTinh, donGia, hanDungCamKet, ghiChu };
        }).filter((item) => item.tenThuoc && item.donGia > 0);

        if (parsedItems.length === 0) {
          alert('Không tìm thấy dòng thuốc hợp lệ nào (Cần có cột "Tên thuốc" và "Đơn giá chào" > 0)! Vui lòng kiểm tra lại cấu trúc file Excel.');
          return;
        }

        await apiPost(`/nha-thuoc/mua-hang/nha-cung-cap/${supplier.id}/bang-gia`, {
          fileBangGiaTen: file.name,
          bangGiaData: parsedItems,
        });

        alert(`Đã nạp thành công ${parsedItems.length} mặt hàng thuốc từ file "${file.name}" cho nhà cung cấp "${supplier.tenNhaCungCap}"!`);
        await load();
      } catch (err) {
        alert(err?.response?.data?.message || err?.message || 'Lỗi xử lý file Excel');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // 4. Xóa file bảng giá của NCC
  const handleDeletePriceList = async (supplier) => {
    if (!window.confirm(`Xác nhận xóa bảng giá Excel của nhà cung cấp "${supplier.tenNhaCungCap}"?`)) return;
    try {
      await apiDel(`/nha-thuoc/mua-hang/nha-cung-cap/${supplier.id}/bang-gia`);
      await load();
      alert(`Đã xóa bảng giá của ${supplier.tenNhaCungCap}`);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi xóa bảng giá');
    }
  };

  const submitQuotation = async (event) => {
    event.preventDefault();
    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${quotationModal.id}/bao-gia`, { chiTiet: quotationItems });
      setQuotationModal(null);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi cập nhật báo giá');
    }
  };

  // 4. Phát hành Đơn Đặt Hàng PO (gửi NCC)
  const issuePurchaseOrder = async (id) => {
    if (!window.confirm('Xác nhận phát hành Đơn đặt hàng (PO) gửi Nhà cung cấp và chuyển sang trạng thái chờ giao hàng?')) return;
    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${id}/dat-hang`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Lỗi phát hành PO');
    }
  };

  // 5. Mở Modal Tiếp nhận & Kiểm nhận Y tế (4 nhánh)
  const openReceiving = (request) => {
    setReceivingModal(request);
    setReceivingError('');
    setReceivingBranch('dat_du');
    setBienBanTraHang('');
    setReceivingItems(request.chiTiet.map((item) => {
      const soLuongDat = Number(item.soLuongDat || 1);
      const today = new Date();
      const nextYear = new Date(today.setFullYear(today.getFullYear() + 2)).toISOString().slice(0, 10);
      return {
        id: item.id,
        tenThuoc: item.tenThuoc,
        maThuoc: item.maThuoc,
        donViTinh: item.donViTinh || 'Hộp',
        soLuongDat,
        soLuongGiao: soLuongDat,
        soLuongDatChatLuong: soLuongDat,
        soLuongHong: 0,
        soLuongThieu: 0,
        maLo: item.maLo || `LO-${Date.now().toString().slice(-6)}`,
        ngayHetHan: item.ngayHetHan ? String(item.ngayHetHan).slice(0, 10) : nextYear,
        lyDoHongLoi: '',
        ghiChu: '',
      };
    }));
  };

  // Thay đổi nhánh phân loại kiểm nhận
  const handleBranchChange = (branch) => {
    setReceivingBranch(branch);
    setReceivingError('');
    if (branch === 'dat_du') {
      setReceivingItems((prev) => prev.map((item) => ({
        ...item,
        soLuongGiao: item.soLuongDat,
        soLuongDatChatLuong: item.soLuongDat,
        soLuongHong: 0,
        soLuongThieu: 0,
        lyDoHongLoi: '',
      })));
    } else if (branch === 'tu_choi_nhan') {
      setBienBanTraHang('Lô thuốc không đạt tiêu chuẩn cảm quan/GSP y tế (bao bì rách móp/hạn dùng cận date). Từ chối nhận toàn bộ lô hàng.');
      setReceivingItems((prev) => prev.map((item) => ({
        ...item,
        soLuongDatChatLuong: 0,
        soLuongHong: item.soLuongGiao,
        lyDoHongLoi: 'Không đạt tiêu chuẩn kiểm nghiệm y tế',
      })));
    } else if (branch === 'co_hang_hong') {
      setBienBanTraHang('Lập biên bản trả hàng cho số lượng thuốc hỏng/vỡ/lỗi bao bì trong quá trình vận chuyển.');
    }
  };

  const updateReceivingItem = (index, field, value) => {
    setReceivingError('');
    setReceivingItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'soLuongGiao') {
        const giao = Math.max(0, Number(value) || 0);
        const dat = Math.min(giao, Number(updated.soLuongDatChatLuong || 0));
        updated.soLuongGiao = giao;
        updated.soLuongDatChatLuong = dat;
        updated.soLuongHong = giao - dat;
        updated.soLuongThieu = Math.max(0, Number(item.soLuongDat) - giao);
      } else if (field === 'soLuongDatChatLuong') {
        const dat = Math.min(Number(updated.soLuongGiao), Math.max(0, Number(value) || 0));
        updated.soLuongDatChatLuong = dat;
        updated.soLuongHong = Number(updated.soLuongGiao) - dat;
      } else if (field === 'soLuongHong') {
        const hong = Math.min(Number(updated.soLuongGiao), Math.max(0, Number(value) || 0));
        updated.soLuongHong = hong;
        updated.soLuongDatChatLuong = Number(updated.soLuongGiao) - hong;
      }
      return updated;
    }));
  };

  const submitReceiving = async (event) => {
    event.preventDefault();
    if (receivingBranch === 'tu_choi_nhan') {
      if (!bienBanTraHang.trim()) {
        setReceivingError('Vui lòng nhập lý do từ chối nhận toàn bộ lô hàng vào Biên bản trả hàng.');
        return;
      }
      try {
        await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${receivingModal.id}/tiep-nhan`, {
          chiTiet: receivingItems,
          ketQuaKiemNhan: 'tu_choi_nhan',
          bienBanTraHang: bienBanTraHang.trim(),
        });
        setReceivingModal(null);
        await load();
      } catch (err) {
        setReceivingError(err?.response?.data?.message || err?.message || 'Lỗi từ chối nhận hàng');
      }
      return;
    }

    // Kiểm tra tính hợp lệ
    for (const item of receivingItems) {
      if (Number(item.soLuongGiao) !== Number(item.soLuongDatChatLuong) + Number(item.soLuongHong)) {
        setReceivingError(`Dòng "${item.tenThuoc}": Số lượng giao (${item.soLuongGiao}) phải bằng Đạt (${item.soLuongDatChatLuong}) + Hỏng (${item.soLuongHong})`);
        return;
      }
      if (Number(item.soLuongDatChatLuong) > 0) {
        if (!item.maLo?.trim()) {
          setReceivingError(`Dòng "${item.tenThuoc}": Bắt buộc nhập mã lô sản xuất cho hàng đạt chất lượng.`);
          return;
        }
        if (!item.ngayHetHan || new Date(item.ngayHetHan) <= new Date()) {
          setReceivingError(`Dòng "${item.tenThuoc}": Hạn sử dụng bắt buộc phải còn hạn trong tương lai.`);
          return;
        }
      }
      if (Number(item.soLuongHong) > 0 && !item.lyDoHongLoi?.trim()) {
        setReceivingError(`Dòng "${item.tenThuoc}": Vui lòng nêu rõ lý do hỏng/lỗi để lập biên bản hoàn trả.`);
        return;
      }
    }

    if (receivingBranch === 'co_hang_hong' && !bienBanTraHang.trim()) {
      setReceivingError('Vui lòng ghi tóm tắt Biên bản trả hàng đối với phần dược phẩm hỏng/lỗi.');
      return;
    }

    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${receivingModal.id}/tiep-nhan`, {
        chiTiet: receivingItems,
        ketQuaKiemNhan: receivingBranch,
        bienBanTraHang: bienBanTraHang.trim() || undefined,
      });
      setReceivingModal(null);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể kiểm nhận và nhập kho.';
      setReceivingError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  // 6. Mở Modal Đối chiếu 3 bên & Chi trả công nợ (AP)
  const openPayment = (request) => {
    setPaymentModal(request);
    setPaymentError('');
    setPaymentChecks({
      daDoiChieuNhapKho: false,
      daDoiChieuSoLuong: false,
      daDoiChieuHoaDon: false,
    });
    setPaymentForm({
      soTien: String(request.tongThucTe || 0),
      phuongThucChi: 'chuyen_khoan',
      soChungTuChi: `PC-${request.maYeuCau}-${Date.now().toString().slice(-4)}`,
      soHoaDonNcc: request.soHoaDonNcc || `HD-${Date.now().toString().slice(-6)}`,
      ngayHoaDonNcc: request.ngayHoaDonNcc ? String(request.ngayHoaDonNcc).slice(0, 10) : new Date().toISOString().slice(0, 10),
      ghiChu: 'Thanh toán tiền thuốc theo phiếu kiểm nhận đạt chất lượng',
    });
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!paymentChecks.daDoiChieuNhapKho || !paymentChecks.daDoiChieuSoLuong || !paymentChecks.daDoiChieuHoaDon) {
      setPaymentError('Kế toán / Thu ngân bắt buộc phải tích đủ 3 bước kiểm tra 3-Way Matching trước khi chi tiền.');
      return;
    }
    if (!paymentForm.soChungTuChi.trim()) {
      setPaymentError('Số chứng từ chi (Phiếu chi) là bắt buộc.');
      return;
    }
    if (!paymentForm.soHoaDonNcc.trim()) {
      setPaymentError('Số hóa đơn tài chính của Nhà cung cấp là bắt buộc để lưu sổ sách thuế & công nợ.');
      return;
    }

    try {
      await apiPatch(`/nha-thuoc/mua-hang/yeu-cau/${paymentModal.id}/chi-tra`, {
        soTien: Number(paymentForm.soTien),
        phuongThucChi: paymentForm.phuongThucChi,
        soChungTuChi: paymentForm.soChungTuChi.trim(),
        soHoaDonNcc: paymentForm.soHoaDonNcc.trim(),
        ngayHoaDonNcc: paymentForm.ngayHoaDonNcc,
        ghiChu: paymentForm.ghiChu.trim(),
      });
      setPaymentModal(null);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể ghi nhận phiếu chi.';
      setPaymentError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  // Nhà cung cấp handlers
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
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể lưu nhà cung cấp.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  const removeSupplier = async (supplier) => {
    if (!window.confirm(`Ngừng hợp tác với nhà cung cấp "${supplier.tenNhaCungCap}"?`)) return;
    try {
      await apiDel(`/nha-thuoc/mua-hang/nha-cung-cap/${supplier.id}`);
      await load();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError?.message || 'Không thể ngừng hợp tác nhà cung cấp.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  // In chứng từ
  const handlePrintDoc = () => {
    window.print();
  };

  // Lọc danh sách theo Tab & Search
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      // Role filtering if cashier
      if (isCashier && !isDirector && !isPharmacy && !['da_nhap_kho', 'giao_mot_phan', 'da_kiem_nhan'].includes(item.trangThai)) {
        return false;
      }
      // Tab filter
      if (activeTab === 'pr' && !['cho_duyet', 'da_duyet', 'tu_choi'].includes(item.trangThai)) return false;
      if (activeTab === 'po' && !['da_duyet', 'dang_bao_gia', 'da_chon_nha_cung_cap', 'dang_giao'].includes(item.trangThai)) return false;
      if (activeTab === 'grn' && !['dang_giao', 'giao_mot_phan', 'da_kiem_nhan', 'da_nhap_kho', 'tu_choi_nhan'].includes(item.trangThai)) return false;
      if (activeTab === 'ap' && !['da_nhap_kho', 'giao_mot_phan', 'da_kiem_nhan'].includes(item.trangThai)) return false;

      // Search keyword
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      const matchMa = item.maYeuCau?.toLowerCase().includes(s);
      const matchNcc = item.nhaCungCap?.tenNhaCungCap?.toLowerCase().includes(s);
      const matchThuoc = item.chiTiet?.some((ct) => ct.tenThuoc?.toLowerCase().includes(s) || ct.maThuoc?.toLowerCase().includes(s));
      const matchHd = item.soHoaDonNcc?.toLowerCase().includes(s) || item.soChungTuChi?.toLowerCase().includes(s);
      return matchMa || matchNcc || matchThuoc || matchHd;
    });
  }, [list, activeTab, searchTerm, isCashier, isDirector, isPharmacy]);

  // Thống kê nhanh KPIs
  const stats = useMemo(() => {
    const choDuyetCount = list.filter((x) => x.trangThai === 'cho_duyet').length;
    const dangXuLyPoCount = list.filter((x) => ['da_duyet', 'dang_bao_gia', 'da_chon_nha_cung_cap', 'dang_giao'].includes(x.trangThai)).length;
    const choKiemNhanCount = list.filter((x) => x.trangThai === 'dang_giao').length;
    const canThanhToanList = list.filter((x) => ['da_nhap_kho', 'giao_mot_phan'].includes(x.trangThai) && x.trangThaiChiTra !== 'da_chi');
    const tongTienCanThanhToan = canThanhToanList.reduce((sum, x) => sum + Number(x.tongThucTe || 0), 0);
    const daThanhToanList = list.filter((x) => x.trangThaiChiTra === 'da_chi');
    const tongTienDaThanhToan = daThanhToanList.reduce((sum, x) => sum + Number(x.soTienChiTra || x.tongThucTe || 0), 0);

    return {
      choDuyetCount,
      dangXuLyPoCount,
      choKiemNhanCount,
      canThanhToanCount: canThanhToanList.length,
      tongTienCanThanhToan,
      tongTienDaThanhToan,
    };
  }, [list]);

  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800">
      {/* ─── 1. TOP HEADER & HOSPITAL ERP BADGE ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Boxes className="h-3.5 w-3.5" /> HỆ THỐNG ERP MUA HÀNG & QUẢN TRỊ DƯỢC PHẨM CHUẨN GSP Y TẾ
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              Quy trình Mua hàng & Kiểm nhận Dược phẩm (P2P)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Chuỗi cung ứng khép kín: Dự báo nhu cầu ➔ Phiếu PR ➔ Phê duyệt ➔ Báo giá RFQ ➔ Đơn PO ➔ Kiểm nhận GRN (4 nhánh) ➔ Đối chiếu 3 bên & Thanh toán.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowForecastModal(true);
                loadForecast();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Dự báo nhu cầu AI</span>
            </button>

            {isPharmacy && (
              <button
                onClick={() => setShowPrModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Lập phiếu yêu cầu (PR)</span>
              </button>
            )}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-75 cursor-pointer active:scale-95"
              title="Đồng bộ lại danh sách mua hàng mới nhất"
            >
              <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang làm mới...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError} <button type="button" onClick={load} className="ml-2 font-bold underline">Thử lại</button>
          </div>
        )}

        {/* ─── 2. KPI METRICS CARDS ─── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
            <p className="text-xs font-medium text-amber-700">1. Chờ duyệt PR</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{stats.choDuyetCount}</p>
            <p className="mt-0.5 text-[11px] text-amber-600">Ban giám đốc xem xét</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
            <p className="text-xs font-medium text-blue-700">2. Đang chào giá & PO</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{stats.dangXuLyPoCount}</p>
            <p className="mt-0.5 text-[11px] text-blue-600">So sánh giá & gửi NCC</p>
          </div>

          <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-3.5">
            <p className="text-xs font-medium text-cyan-700">3. Chờ kiểm nhận GSP</p>
            <p className="mt-1 text-2xl font-bold text-cyan-900">{stats.choKiemNhanCount}</p>
            <p className="mt-0.5 text-[11px] text-cyan-600">Hàng đang vận chuyển</p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3.5">
            <p className="text-xs font-medium text-orange-700">4. Chờ thanh toán AP</p>
            <p className="mt-1 text-xl font-bold text-orange-900">{formatMoney(stats.tongTienCanThanhToan)}</p>
            <p className="mt-0.5 text-[11px] text-orange-600">{stats.canThanhToanCount} đơn đã nhập kho</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
            <p className="text-xs font-medium text-emerald-700">5. Đã chi trả công nợ</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatMoney(stats.tongTienDaThanhToan)}</p>
            <p className="mt-0.5 text-[11px] text-emerald-600">Khớp hóa đơn & phiếu chi</p>
          </div>
        </div>
      </div>

      {/* ─── 3. 8-STAGE VISUAL WORKFLOW TIMELINE ─── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700">
            <Layers className="h-4 w-4 text-blue-600" /> Chuỗi Quy Trình Mua & Nhập Kho Thuốc (ERP Standard)
          </h2>
          <span className="text-xs text-gray-400">Click vào bước để lọc nhanh theo giai đoạn</span>
        </div>

        <div className="grid min-w-[900px] grid-cols-8 gap-2">
          {[
            { id: '1', title: 'Dự báo & Tồn kho', desc: 'Holt-Winters / Min-Max', icon: Sparkles, color: 'border-amber-400 bg-amber-50 text-amber-800' },
            { id: '2', title: 'Phiếu yêu cầu (PR)', desc: 'Dược sĩ lập dự trù', icon: ClipboardList, color: 'border-blue-400 bg-blue-50 text-blue-800', tab: 'pr' },
            { id: '3', title: 'Duyệt nhu cầu', desc: 'Ban Giám Đốc phê duyệt', icon: Check, color: 'border-indigo-400 bg-indigo-50 text-indigo-800', tab: 'pr' },
            { id: '4', title: 'Báo giá & So sánh', desc: 'Ma trận giá tối ưu', icon: TrendingUp, color: 'border-purple-400 bg-purple-50 text-purple-800', tab: 'po' },
            { id: '5', title: 'Đơn đặt hàng (PO)', desc: 'Phát hành PO cho NCC', icon: Send, color: 'border-cyan-400 bg-cyan-50 text-cyan-800', tab: 'po' },
            { id: '6', title: 'Kiểm nhận Y tế (4 nhánh)', desc: 'Lô, HSD, GSP QC', icon: PackageCheck, color: 'border-emerald-400 bg-emerald-50 text-emerald-800', tab: 'grn' },
            { id: '7', title: 'Đối chiếu 3 bên', desc: 'PO vs GRN vs Hóa đơn', icon: CircleCheck, color: 'border-teal-400 bg-teal-50 text-teal-800', tab: 'ap' },
            { id: '8', title: 'Hóa đơn & Chi trả', desc: 'Kế toán xuất phiếu chi', icon: Wallet, color: 'border-green-400 bg-green-50 text-green-800', tab: 'ap' },
          ].map((st, idx) => {
            const Icon = st.icon;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => st.tab && setActiveTab(st.tab)}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition hover:shadow-sm ${st.color} ${st.tab === activeTab ? 'ring-2 ring-blue-600' : ''}`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-sm">
                    {st.id}
                  </span>
                  <Icon className="h-3.5 w-3.5 opacity-70" />
                </div>
                <p className="mt-2 text-xs font-bold leading-snug">{st.title}</p>
                <p className="text-[10px] opacity-75">{st.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. TABS NAVIGATION & SEARCH ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          {[
            { id: 'tat_ca', label: 'Tất cả đơn', count: list.length },
            { id: 'pr', label: '1. Yêu cầu mua (PR)', count: list.filter((x) => ['cho_duyet', 'da_duyet', 'tu_choi'].includes(x.trangThai)).length },
            { id: 'po', label: '2. Báo giá & PO', count: list.filter((x) => ['da_duyet', 'dang_bao_gia', 'da_chon_nha_cung_cap', 'dang_giao'].includes(x.trangThai)).length },
            { id: 'grn', label: '3. Tiếp nhận & GSP', count: list.filter((x) => ['dang_giao', 'giao_mot_phan', 'da_nhap_kho', 'tu_choi_nhan'].includes(x.trangThai)).length },
            { id: 'ap', label: '4. Đối chiếu & Chi trả', count: list.filter((x) => ['da_nhap_kho', 'giao_mot_phan'].includes(x.trangThai)).length },
            { id: 'suppliers', label: '5. Nhà cung cấp', count: suppliers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab !== 'suppliers' && (
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã đơn, tên thuốc, NCC, hóa đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* ─── 5. MAIN CONTENT AREA ACCORDING TO TAB ─── */}
      {activeTab === 'suppliers' ? (
        /* TAB 5: QUẢN LÝ NHÀ CUNG CẤP */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              {editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Khai báo thông tin pháp lý và kênh liên lạc để gửi yêu cầu báo giá (RFQ) và đơn đặt hàng (PO).
            </p>

            <form onSubmit={addSupplier} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Tên công ty / Nhà cung cấp dược *</label>
                <input
                  required
                  placeholder="Ví dụ: Công ty Dược phẩm TW1 (Pharbaco)"
                  value={supplierForm.tenNhaCungCap}
                  onChange={(e) => setSupplierForm({ ...supplierForm, tenNhaCungCap: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Số điện thoại liên hệ</label>
                <input
                  placeholder="Ví dụ: 024.3825.xxxx / 0912.xxx.xxx"
                  value={supplierForm.soDienThoai}
                  onChange={(e) => setSupplierForm({ ...supplierForm, soDienThoai: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Email nhận đơn đặt hàng (PO / RFQ)</label>
                <input
                  type="email"
                  placeholder="kinhdoanh@duocphamtw1.vn"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  {editingSupplier ? 'Lưu cập nhật' : 'Thêm nhà cung cấp'}
                </button>
                {editingSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupplier(null);
                      setSupplierForm({ tenNhaCungCap: '', soDienThoai: '', email: '' });
                    }}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-600"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-base font-bold text-gray-900">
              Danh bạ đối tác cung ứng dược phẩm ({suppliers.length})
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Các nhà cung cấp đã ký hợp đồng nguyên tắc hoặc tham gia chào giá định kỳ.
            </p>

            <div className="mt-4 space-y-3">
              {suppliers.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">Chưa có nhà cung cấp nào trong hệ thống.</div>
              ) : (
                suppliers.map((s) => {
                  const hasPriceList = s.fileBangGiaTen && Array.isArray(s.bangGiaData) && s.bangGiaData.length > 0;
                  const drugCount = hasPriceList ? s.bangGiaData.length : 0;

                  return (
                    <div key={s.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition hover:border-blue-200 hover:bg-white">
                      {/* Header thẻ NCC */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                            {s.tenNhaCungCap.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-gray-900">{s.tenNhaCungCap}</h3>
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                                {s.maNhaCungCap || `NCC#${s.id}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              SĐT: <span className="font-medium text-gray-700">{s.soDienThoai || 'Chưa cập nhật'}</span> · Email: <span className="font-medium text-gray-700">{s.email || 'Chưa cập nhật'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplier(s);
                              setSupplierForm({
                                tenNhaCungCap: s.tenNhaCungCap || '',
                                soDienThoai: s.soDienThoai || '',
                                email: s.email || '',
                              });
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 shadow-xs"
                          >
                            Sửa thông tin
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSupplier(s)}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-xs"
                          >
                            Ngừng hợp tác
                          </button>
                        </div>
                      </div>

                      {/* Khu vực Quản lý Bảng Giá Dược Phẩm Excel của NCC */}
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${hasPriceList ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                              <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900">
                                  {hasPriceList ? s.fileBangGiaTen : 'Chưa có file bảng giá Excel'}
                                </span>
                                {hasPriceList && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                    {drugCount} mặt hàng thuốc
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500">
                                {hasPriceList ? (
                                  <>
                                    Cập nhật lúc: <b className="text-gray-700">{s.ngayCapNhatBangGia ? new Date(s.ngayCapNhatBangGia).toLocaleString('vi-VN') : 'Gần đây'}</b> · Tự động dùng để khớp giá khi mua hàng
                                  </>
                                ) : (
                                  'Tải lên file Excel (.xlsx, .xls) để hệ thống tự động so sánh giá khi phòng khám mua thuốc.'
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Nhóm nút thao tác Bảng giá Excel */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {hasPriceList ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewPriceListModal(s);
                                    setPriceListSearch('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                  title="Xem bảng thuốc trong file"
                                >
                                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                                  Xem thuốc
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadCurrentPriceList(s)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                  title="Tải về file Excel"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Tải về
                                </button>
                                <label className="inline-flex items-center gap-1 cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                                  <Upload className="h-3.5 w-3.5" />
                                  Đổi file
                                  <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={(e) => handleUploadPriceList(e, s)}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePriceList(s)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                  title="Xóa file bảng giá này"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Xóa
                                </button>
                              </>
                            ) : (
                              <>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition">
                                  <Upload className="h-3.5 w-3.5" />
                                  Tải lên file Excel
                                  <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={(e) => handleUploadPriceList(e, s)}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => downloadPriceListTemplate(s.tenNhaCungCap)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                  title="Tải file Excel mẫu để điền giá"
                                >
                                  <Download className="h-3.5 w-3.5 text-gray-500" />
                                  Tải file mẫu
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 1, 2, 3, 4: DANH SÁCH CHỨNG TỪ & TIẾN TRÌNH */
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-sm text-gray-500">Đang tải hồ sơ mua hàng dược phẩm...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-700">Không tìm thấy yêu cầu mua thuốc nào phù hợp.</p>
              <p className="text-xs text-gray-400">Hãy chọn tab khác hoặc nhấn "Lập phiếu yêu cầu (PR)" để khởi tạo luồng mua hàng.</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const statusCfg = STATUS_CONFIG[item.trangThai] || { label: item.trangThai, color: 'bg-gray-100 text-gray-700' };
              const paymentCfg = PAYMENT_CONFIG[item.trangThaiChiTra] || { label: item.trangThaiChiTra, color: 'bg-gray-100 text-gray-700' };

              return (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200">
                  {/* Item Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900">{item.maYeuCau}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paymentCfg.color}`}>
                        <Wallet className="h-3 w-3" /> {paymentCfg.label}
                      </span>
                      {item.ketQuaKiemNhan && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.ketQuaKiemNhan === 'dat_du' ? 'bg-emerald-100 text-emerald-800' :
                          item.ketQuaKiemNhan === 'dat_mot_phan' ? 'bg-blue-100 text-blue-800' :
                          item.ketQuaKiemNhan === 'co_hang_hong' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          QC: {
                            item.ketQuaKiemNhan === 'dat_du' ? 'Đạt 100%' :
                            item.ketQuaKiemNhan === 'dat_mot_phan' ? 'Đạt một phần (thiếu)' :
                            item.ketQuaKiemNhan === 'co_hang_hong' ? 'Có hàng hỏng lỗi' :
                            'Từ chối nhận toàn bộ'
                          }
                        </span>
                      )}
                    </div>

                    {/* Action Buttons for this item based on Role & State */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Document Viewer Buttons */}
                      <button
                        type="button"
                        onClick={() => setDocModal({ type: 'PR', data: item })}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        title="Xem Phiếu Yêu Cầu PR"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>Phiếu PR</span>
                      </button>

                      {['dang_giao', 'giao_mot_phan', 'da_nhap_kho', 'da_chon_nha_cung_cap'].includes(item.trangThai) && (
                        <button
                          type="button"
                          onClick={() => setDocModal({ type: 'PO', data: item })}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          title="Xem Đơn Đặt Hàng PO"
                        >
                          <Send className="h-3.5 w-3.5 text-purple-600" />
                          <span>Đơn PO</span>
                        </button>
                      )}

                      {['da_nhap_kho', 'giao_mot_phan', 'tu_choi_nhan'].includes(item.trangThai) && (
                        <button
                          type="button"
                          onClick={() => setDocModal({ type: 'GRN', data: item })}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          title="Xem Biên Bản Kiểm Nhận GRN"
                        >
                          <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Phiếu GRN</span>
                        </button>
                      )}

                      {item.bienBanTraHang && (
                        <button
                          type="button"
                          onClick={() => setDocModal({ type: 'RETURN', data: item })}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          title="Xem Biên Bản Trả Hàng / Lỗi"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Biên bản trả</span>
                        </button>
                      )}

                      {/* State Action: Duyệt / Từ chối (Ban Giám Đốc) */}
                      {isDirector && item.trangThai === 'cho_duyet' && (
                        <>
                          <button
                            onClick={() => approve(item.id, true)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" /> Duyệt PR
                          </button>
                          <button
                            onClick={() => approve(item.id, false)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            <X className="h-3.5 w-3.5" /> Từ chối
                          </button>
                        </>
                      )}

                      {/* State Action: Báo giá & Chọn NCC (Dược sĩ) */}
                      {isPharmacy && ['da_duyet', 'dang_bao_gia'].includes(item.trangThai) && (
                        <button
                          onClick={() => openQuotation(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          <TrendingUp className="h-3.5 w-3.5" /> So sánh báo giá & Chọn NCC
                        </button>
                      )}

                      {/* State Action: Phát hành Đơn Đặt Hàng PO */}
                      {isPharmacy && item.trangThai === 'da_chon_nha_cung_cap' && (
                        <button
                          onClick={() => issuePurchaseOrder(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                        >
                          <Send className="h-3.5 w-3.5" /> Phát hành PO gửi NCC
                        </button>
                      )}

                      {/* State Action: Tiếp nhận & Kiểm nhận Y tế GRN (Dược sĩ / Thủ kho) */}
                      {isPharmacy && ['dang_giao', 'da_chon_nha_cung_cap'].includes(item.trangThai) && (
                        <button
                          onClick={() => openReceiving(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" /> Tiếp nhận & Kiểm nhận y tế (GRN)
                        </button>
                      )}

                      {/* State Action: Đối chiếu 3 bên & Chi trả công nợ (Thu ngân / Kế toán) */}
                      {isCashier && ['da_nhap_kho', 'giao_mot_phan'].includes(item.trangThai) && item.trangThaiChiTra !== 'da_chi' && (
                        <button
                          onClick={() => openPayment(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          <Wallet className="h-3.5 w-3.5" /> Đối chiếu 3 bên & Lập phiếu chi
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Item Medicine Details Table */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500">
                          <th className="py-2 pl-3">Dược phẩm</th>
                          <th className="py-2 text-center">ĐVT</th>
                          <th className="py-2 text-right">SL Đặt (PO)</th>
                          <th className="py-2 text-right">SL Giao</th>
                          <th className="py-2 text-right text-emerald-700">SL Đạt QC</th>
                          <th className="py-2 text-right text-rose-700">Hỏng / Thiếu</th>
                          <th className="py-2 text-right">Đơn giá chốt</th>
                          <th className="py-2 text-right">Thành tiền</th>
                          <th className="py-2 pl-3">Lô SX & HSD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {item.chiTiet?.map((ct) => {
                          const thanhTienItem = (Number(ct.soLuongDatChatLuong ?? ct.soLuongDat) || 0) * (Number(ct.donGiaChon || ct.donGiaBao) || 0);
                          return (
                            <tr key={ct.id} className="hover:bg-gray-50/50">
                              <td className="py-2 pl-3 font-medium text-gray-900">
                                <div>{ct.tenThuoc || `Thuốc #${ct.thuocId}`}</div>
                                <div className="text-[10px] text-gray-400">{ct.maThuoc || ''}</div>
                                {ct.lyDoHongLoi && (
                                  <div className="mt-0.5 text-[10px] font-medium text-rose-600">
                                    Lỗi: {ct.lyDoHongLoi}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 text-center text-gray-500">{ct.donViTinh || 'Viên'}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">{ct.soLuongDat}</td>
                              <td className="py-2 text-right text-gray-700">{ct.soLuongGiao || '-'}</td>
                              <td className="py-2 text-right font-bold text-emerald-600">{ct.soLuongDatChatLuong ?? '-'}</td>
                              <td className="py-2 text-right">
                                {Number(ct.soLuongHong || 0) > 0 && <span className="font-semibold text-rose-600">Hỏng: {ct.soLuongHong} </span>}
                                {Number(ct.soLuongThieu || 0) > 0 && <span className="text-amber-600">Thiếu: {ct.soLuongThieu}</span>}
                                {!Number(ct.soLuongHong) && !Number(ct.soLuongThieu) && <span className="text-gray-400">-</span>}
                              </td>
                              <td className="py-2 text-right text-gray-700">{formatMoney(ct.donGiaChon || ct.donGiaBao)}</td>
                              <td className="py-2 text-right font-semibold text-gray-900">{formatMoney(thanhTienItem)}</td>
                              <td className="py-2 pl-3 text-gray-600">
                                {ct.maLo ? (
                                  <div>
                                    <span className="font-mono text-[11px] font-semibold text-gray-800">{ct.maLo}</span>
                                    {ct.ngayHetHan && <span className="block text-[10px] text-gray-500">Exp: {formatDate(ct.ngayHetHan)}</span>}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Chờ nhận hàng</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Item Footer Info & 3-Way Reconciliation Summary */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50/80 p-3 text-xs text-gray-700">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>Nhà cung cấp: <b className="text-gray-900">{item.nhaCungCap?.tenNhaCungCap || 'Chưa chốt'}</b></span>
                      <span>Dự toán PO: <b>{formatMoney(item.tongDuToan)}</b></span>
                      <span>Thực nhận (Giá trị kho): <b className="text-emerald-700">{formatMoney(item.tongThucTe)}</b></span>
                      {item.soHoaDonNcc && (
                        <span>Hóa đơn NCC: <b className="font-mono text-blue-700">{item.soHoaDonNcc}</b> ({formatDate(item.ngayHoaDonNcc)})</span>
                      )}
                      {item.soChungTuChi && (
                        <span>Phiếu chi: <b className="font-mono text-purple-700">{item.soChungTuChi}</b> ({PAYMENT_METHOD_LABELS[item.phuongThucChi] || item.phuongThucChi})</span>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-gray-500">
                      Tạo ngày {formatDate(item.ngayTao || item.taoLuc)}{item.nguoiLap?.hoTen ? ` (${item.nguoiLap.hoTen})` : ''} · Người duyệt: <span className="font-semibold text-gray-700">{item.nguoiDuyet?.hoTen || (item.nguoiDuyetId ? 'Ban Giám Đốc' : 'Chưa duyệt')}</span>{item.ngayDuyet ? ` (${formatDate(item.ngayDuyet)})` : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── MODAL 1: LẬP PHIẾU YÊU CẦU MUA (PR) ─── */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitRequest} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  Bước 1 & 2 · Khởi tạo quy trình
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Lập Phiếu Yêu Cầu Mua Thuốc (PR)</h2>
                <p className="text-xs text-gray-500">
                  Dược sĩ lập danh mục thuốc cần mua bổ sung kho, sau đó gửi Ban Giám Đốc phê duyệt ngân sách.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Danh mục thuốc yêu cầu ({form.chiTiet.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowForecastModal(true);
                    loadForecast();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Nhập nhanh từ Dự báo AI / Tồn kho thấp
                </button>
              </div>

              {form.chiTiet.map((item, index) => (
                <div key={index} className="grid items-end gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3 md:grid-cols-[2fr_100px_130px_1.5fr_36px]">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600">Tên thuốc & Quy cách *</label>
                    <select
                      required
                      value={item.thuocId}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, thuocId: e.target.value } : x),
                      }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn thuốc --</option>
                      {medicines.filter((m) => m.trangThai !== 'ngung_kinh_doanh').map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.maThuoc} - {m.tenThuoc} (Tồn: {m.tonKhoTong || 0} {m.donViTinh})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600">Số lượng đặt *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={item.soLuongDat}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, soLuongDat: e.target.value } : x),
                      }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600">Đơn giá dự toán (đ)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.donGiaBao}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, donGiaBao: e.target.value } : x),
                      }))}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600">NCC đề xuất (tùy chọn)</label>
                    <select
                      value={item.nhaCungCapId}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        chiTiet: f.chiTiet.map((x, i) => i === index ? { ...x, nhaCungCapId: e.target.value } : x),
                      }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Chưa chọn (sẽ lấy báo giá RFQ)</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {form.chiTiet.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, chiTiet: f.chiTiet.filter((_, i) => i !== index) }))}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        title="Xóa dòng"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, chiTiet: [...f.chiTiet, { ...emptyItem }] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm dòng thuốc khác
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-700">Mục đích mua / Lý do đề xuất / Yêu cầu tiêu chuẩn GSP</label>
              <textarea
                value={form.ghiChu}
                onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                placeholder="Ví dụ: Bổ sung cơ số thuốc điều trị cao huyết áp, hạn dùng tối thiểu 18 tháng..."
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowPrModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Gửi Phiếu PR cho Ban Giám Đốc
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL 2: DỰ BÁO NHU CẦU THUỐC AI & TỒN KHO THẤP ─── */}
      {showForecastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  <Sparkles className="h-3.5 w-3.5" /> Trợ lý Dược phẩm AI (Holt-Winters Drug Demand Estimator)
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Dự Báo Nhu Cầu & Cảnh Báo Điểm Đặt Hàng Lại</h2>
                <p className="text-xs text-gray-500">
                  Phân tích tốc độ tiêu thụ kê đơn 30 ngày qua kết hợp tồn kho an toàn để đề xuất số lượng mua tự động.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              {loadingForecast ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-600" />
                  <p className="mt-2">Đang chạy thuật toán dự báo nhu cầu thuốc...</p>
                </div>
              ) : forecastList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Chưa ghi nhận tiêu thụ đơn thuốc phát sinh trong 30 ngày qua để ước tính nhu cầu.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500">
                        <th className="py-2.5 pl-3">Thuốc</th>
                        <th className="py-2.5 text-center">Tồn kho hiện tại</th>
                        <th className="py-2.5 text-center">Tiêu thụ / ngày</th>
                        <th className="py-2.5 text-center">Dự báo 14 ngày</th>
                        <th className="py-2.5 text-center">Số ngày còn lại</th>
                        <th className="py-2.5 text-center">Trạng thái rủi ro</th>
                        <th className="py-2.5 text-right">Gợi ý đặt hàng</th>
                        <th className="py-2.5 text-center pr-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {forecastList.map((fc) => (
                        <tr key={fc.id} className="hover:bg-gray-50/60">
                          <td className="py-2.5 pl-3">
                            <span className="font-semibold text-gray-900">{fc.tenThuoc}</span>
                            <span className="block font-mono text-[10px] text-gray-400">{fc.maThuoc} ({fc.donViTinh})</span>
                          </td>
                          <td className="py-2.5 text-center font-bold text-gray-800">{fc.tonKhoHienTai}</td>
                          <td className="py-2.5 text-center text-gray-600">{fc.tieuThuTrungBinhNgay}</td>
                          <td className="py-2.5 text-center text-gray-600">{fc.duBaoTieuThu14Ngay}</td>
                          <td className="py-2.5 text-center">
                            <span className={`font-semibold ${fc.soNgayConLai <= 3 ? 'text-rose-600' : fc.soNgayConLai <= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                              {fc.soNgayConLai} ngày
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              fc.trangThai === 'het_hang' ? 'bg-rose-100 text-rose-800' :
                              fc.trangThai === 'nguy_cap' ? 'bg-rose-50 text-rose-700' :
                              fc.trangThai === 'canh_bao' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-50 text-emerald-700'
                            }`}>
                              {fc.trangThai === 'het_hang' ? 'Hết hàng' : fc.trangThai === 'nguy_cap' ? 'Nguy cấp (≤3 ngày)' : fc.trangThai === 'canh_bao' ? 'Cảnh báo (≤7 ngày)' : 'An toàn'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-blue-700">
                            {fc.soLuongDeXuatNhap > 0 ? `+${fc.soLuongDeXuatNhap} ${fc.donViTinh}` : 'Đủ tồn'}
                          </td>
                          <td className="py-2.5 text-center pr-3">
                            <button
                              type="button"
                              onClick={() => importFromForecast(fc)}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              + Thêm vào PR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SO SÁNH BÁO GIÁ NHÀ CUNG CẤP (RFQ & PO - CHUẨN ERP Y TẾ) ─── */}
      {quotationModal && (() => {
        const totalChot = quotationItems.reduce((sum, item, idx) => {
          const qty = Number(quotationModal?.chiTiet[idx]?.soLuongDat || 0);
          return sum + qty * Number(item.donGiaChon || 0);
        }, 0);

        const totalLichSu = quotationItems.reduce((sum, item, idx) => {
          const detail = quotationModal?.chiTiet[idx];
          const qty = Number(detail?.soLuongDat || 0);
          const giaLichSu = Number(detail?.giaNhapGanNhat || 0);
          return sum + (giaLichSu > 0 ? qty * giaLichSu : qty * Number(item.donGiaChon || 0));
        }, 0);

        const diffLichSu = totalChot - totalLichSu;

        // Thống kê phân bổ theo từng nhà cung cấp được chọn
        const supplierAllocMap = {};
        quotationItems.forEach((item, idx) => {
          if (!item.nhaCungCapId) return;
          const detail = quotationModal?.chiTiet[idx];
          const sup = suppliers.find((s) => String(s.id) === String(item.nhaCungCapId));
          const name = sup?.tenNhaCungCap || `NCC #${item.nhaCungCapId}`;
          const amount = Number(detail?.soLuongDat || 0) * Number(item.donGiaChon || 0);
          if (!supplierAllocMap[item.nhaCungCapId]) {
            supplierAllocMap[item.nhaCungCapId] = { name, count: 0, amount: 0 };
          }
          supplierAllocMap[item.nhaCungCapId].count += 1;
          supplierAllocMap[item.nhaCungCapId].amount += amount;
        });
        const supplierAllocList = Object.values(supplierAllocMap);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <form onSubmit={submitQuotation} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              {/* Header Modal */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      Bước 4 · So sánh ma trận giá & Chọn NCC
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Chuẩn ERP Dược Y Tế
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">Bảng So Sánh Báo Giá & Ma Trận Lựa Chọn Nhà Cung Cấp (RFQ)</h2>
                  <p className="text-xs text-gray-500">
                    Chứng từ: <span className="font-mono font-bold text-gray-800">{quotationModal.maYeuCau}</span> · Đối chiếu giá chào giữa các nhà cung cấp, phân tích biến động giá so với lịch sử và kiểm soát chi phí nhập dược phẩm.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={scanFromSupplierPriceLists}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                    title="Hệ thống tự động tra cứu danh sách thuốc cần mua trong Bảng giá Excel đã tải lên của tất cả Nhà cung cấp để điền vào ma trận so sánh"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                    Quét từ Bảng giá Excel NCC
                  </button>
                  <button
                    type="button"
                    onClick={autoSelectBestPrice}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                    title="Hệ thống tự động duyệt qua tất cả mặt hàng và chọn NCC có giá chào thấp nhất"
                  >
                    <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                    Tự động chọn giá tốt nhất
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuotationModal(null)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Danh sách từng loại thuốc */}
              <div className="mt-4 space-y-5">
                {quotationItems.map((quotation, index) => {
                  const detail = quotationModal.chiTiet[index] || {};
                  const validQuotes = quotation.baoGiaSoSanh.filter((q) => Number(q.donGia) > 0);
                  const lowestPrice = validQuotes.length ? Math.min(...validQuotes.map((q) => Number(q.donGia))) : Infinity;
                  const giaLichSu = Number(detail.giaNhapGanNhat || 0);
                  const giaBan = Number(detail.giaBan || 0);
                  const soLuongDat = Number(detail.soLuongDat || 1);

                  return (
                    <div key={quotation.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 transition hover:border-indigo-200">
                      {/* Header thuốc & Cơ sở đối chiếu giá */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm">
                              {detail.tenThuoc || `Thuốc #${detail.thuocId}`}
                            </h3>
                            <span className="rounded bg-gray-200/80 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                              #{detail.maThuoc || 'N/A'}
                            </span>
                            <span className="text-xs font-semibold text-gray-600">
                              · Số lượng: <b className="text-blue-700">{soLuongDat}</b> {detail.donViTinh || 'hộp'}
                            </span>
                          </div>
                          {/* Tham chiếu chuẩn ERP: Giá vốn lịch sử & Giá niêm yết bán */}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <History className="h-3 w-3 text-gray-400" />
                              Giá nhập gần nhất:
                              <b className={giaLichSu > 0 ? 'text-gray-800' : 'text-gray-400 font-normal italic'}>
                                {giaLichSu > 0 ? formatMoney(giaLichSu) : 'Chưa có lịch sử nhập'}
                              </b>
                            </span>
                            {giaBan > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-emerald-600" />
                                Giá bán niêm yết: <b className="text-emerald-700">{formatMoney(giaBan)}</b>
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setQuotationItems((items) => items.map((item, i) => i === index ? {
                            ...item,
                            baoGiaSoSanh: [...item.baoGiaSoSanh, { nhaCungCapId: '', donGia: 0, ghiChu: '', hanDungCamKet: '' }],
                          } : item))}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Thêm NCC chào giá
                        </button>
                      </div>

                      {/* Ma trận so sánh báo giá (Matrix Table) */}
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                              <th className="pb-2 w-[30%]">Nhà cung cấp chào giá</th>
                              <th className="pb-2 w-[22%]">Đơn giá chào (VNĐ)</th>
                              <th className="pb-2 w-[20%]">Cam kết HSD / Điều kiện</th>
                              <th className="pb-2 w-[18%] text-center">Biến động (vs Lịch sử)</th>
                              <th className="pb-2 w-[10%] text-right">Tác vụ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {quotation.baoGiaSoSanh.map((quote, quoteIdx) => {
                              const donGia = Number(quote.donGia) || 0;
                              const isBestPrice = donGia > 0 && donGia === lowestPrice;
                              const isSelected = String(quotation.nhaCungCapId) === String(quote.nhaCungCapId) && quote.nhaCungCapId !== '';

                              // Phân tích % biến động giá so với lịch sử gần nhất
                              let percentDiff = null;
                              if (giaLichSu > 0 && donGia > 0) {
                                percentDiff = Math.round(((donGia - giaLichSu) / giaLichSu) * 100);
                              }

                              return (
                                <tr key={quoteIdx} className={`hover:bg-white/80 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                                  {/* Cột 1: Chọn NCC */}
                                  <td className="py-2 pr-2">
                                    <select
                                      required
                                      value={quote.nhaCungCapId}
                                      onChange={(e) => setQuotationItems((items) => items.map((item, i) => i === index ? {
                                        ...item,
                                        baoGiaSoSanh: item.baoGiaSoSanh.map((q, qi) => qi === quoteIdx ? { ...q, nhaCungCapId: e.target.value } : q),
                                      } : item))}
                                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                                    >
                                      <option value="">-- Chọn Nhà Cung Cấp --</option>
                                      {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Cột 2: Đơn giá chào */}
                                  <td className="py-2 pr-2">
                                    <div className="relative">
                                      <input
                                        required
                                        type="number"
                                        min="0"
                                        placeholder="Đơn giá chào (đ)"
                                        value={quote.donGia}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuotationItems((items) => items.map((item, i) => {
                                            if (i !== index) return item;
                                            const updatedQuotes = item.baoGiaSoSanh.map((q, qi) => qi === quoteIdx ? { ...q, donGia: val } : q);
                                            // Nếu dòng này đang được chọn chốt, tự cập nhật luôn đơn giá chốt
                                            const isCurrSelected = String(item.nhaCungCapId) === String(quote.nhaCungCapId);
                                            return {
                                              ...item,
                                              baoGiaSoSanh: updatedQuotes,
                                              donGiaChon: isCurrSelected ? (Number(val) || 0) : item.donGiaChon,
                                            };
                                          }));
                                        }}
                                        className="w-full rounded-lg border border-gray-200 bg-white p-2 pr-12 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <span className="absolute right-2 top-2.5 text-[10px] text-gray-400">đ/đv</span>
                                    </div>
                                  </td>

                                  {/* Cột 3: Cam kết HSD / Điều kiện */}
                                  <td className="py-2 pr-2">
                                    <input
                                      type="text"
                                      placeholder="VD: HSD >= 24th, giao 24h"
                                      value={quote.hanDungCamKet || ''}
                                      onChange={(e) => setQuotationItems((items) => items.map((item, i) => i === index ? {
                                        ...item,
                                        baoGiaSoSanh: item.baoGiaSoSanh.map((q, qi) => qi === quoteIdx ? { ...q, hanDungCamKet: e.target.value } : q),
                                      } : item))}
                                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs placeholder:text-gray-400 focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>

                                  {/* Cột 4: Biến động giá */}
                                  <td className="py-2 px-2 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      {percentDiff !== null ? (
                                        percentDiff > 0 ? (
                                          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            percentDiff >= 10 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                          }`}>
                                            <ArrowUpRight className="h-3 w-3" /> +{percentDiff}%
                                            {percentDiff >= 10 && ' ⚠️'}
                                          </span>
                                        ) : percentDiff < 0 ? (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                            <ArrowDownRight className="h-3 w-3" /> {percentDiff}% (Tiết kiệm)
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                                            0% (Ổn định)
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[11px] text-gray-400 italic">Lần đầu nhập</span>
                                      )}

                                      {isBestPrice && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                          <Sparkles className="h-3 w-3 text-indigo-600" /> Giá tốt nhất
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Cột 5: Tác vụ & Chọn nhanh */}
                                  <td className="py-2 pl-2 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {quote.nhaCungCapId && donGia > 0 && !isSelected && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQuotationItems((items) => items.map((item, i) => i === index ? {
                                              ...item,
                                              nhaCungCapId: String(quote.nhaCungCapId),
                                              donGiaChon: donGia,
                                            } : item));
                                          }}
                                          className="rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 shadow-xs"
                                        >
                                          Chọn giá này
                                        </button>
                                      )}
                                      {isSelected && (
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs">
                                          <Check className="h-3 w-3" /> Đã chọn
                                        </span>
                                      )}
                                      {quotation.baoGiaSoSanh.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => setQuotationItems((items) => items.map((item, i) => i === index ? {
                                            ...item,
                                            baoGiaSoSanh: item.baoGiaSoSanh.filter((_, qi) => qi !== quoteIdx),
                                          } : item))}
                                          className="rounded p-1 text-rose-500 hover:bg-rose-50"
                                          title="Xóa dòng chào giá này"
                                        >
                                          <X className="h-4 w-4" />
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

                      {/* Hộp xác nhận lựa chọn Nhà cung cấp chốt hợp đồng (PO) */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                        <div className="flex-1 min-w-[280px]">
                          <label className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-700" />
                            Nhà cung cấp được chọn chốt hợp đồng (PO) *:
                          </label>
                          <select
                            required
                            value={quotation.nhaCungCapId}
                            onChange={(e) => {
                              const selectedSupplierId = e.target.value;
                              const foundQuote = quotation.baoGiaSoSanh.find((q) => String(q.nhaCungCapId) === selectedSupplierId);
                              setQuotationItems((items) => items.map((item, i) => i === index ? {
                                ...item,
                                nhaCungCapId: selectedSupplierId,
                                donGiaChon: foundQuote ? Number(foundQuote.donGia) : item.donGiaChon,
                              } : item));
                            }}
                            className="mt-1 w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs font-semibold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-- Bấm chọn nhà cung cấp trúng thầu/được duyệt --</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>
                            ))}
                          </select>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span className="text-[11px] text-gray-500">Đơn giá chốt:</span>
                            <p className="text-sm font-bold text-indigo-700">{formatMoney(quotation.donGiaChon)}</p>
                          </div>
                          <div className="border-l border-indigo-200 pl-4">
                            <span className="text-[11px] text-gray-500">Thành tiền thuốc:</span>
                            <p className="text-sm font-bold text-gray-900">
                              {formatMoney(soLuongDat * Number(quotation.donGiaChon || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bảng tổng hợp & Đánh giá tài chính toàn đơn mua */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Tổng hợp giá trị hợp đồng mua sắm
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <span>Tổng giá trị chốt: <b className="text-base font-bold text-indigo-700">{formatMoney(totalChot)}</b></span>
                      {totalLichSu > 0 && (
                        <span>
                          So với giá kỳ trước:{' '}
                          {diffLichSu < 0 ? (
                            <b className="text-emerald-700 font-bold">
                              Tiết kiệm {formatMoney(Math.abs(diffLichSu))} (-{Math.round((Math.abs(diffLichSu) / totalLichSu) * 100)}%)
                            </b>
                          ) : diffLichSu > 0 ? (
                            <b className="text-rose-700 font-bold">
                              Tăng +{formatMoney(diffLichSu)} (+{Math.round((diffLichSu / totalLichSu) * 100)}%)
                            </b>
                          ) : (
                            <b className="text-gray-700">Tương đương kỳ trước</b>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phân bổ đơn hàng theo từng NCC */}
                  {supplierAllocList.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {supplierAllocList.map((alloc, idx) => (
                        <div key={idx} className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-gray-700 shadow-xs">
                          <span className="font-semibold text-gray-900">{alloc.name}:</span> {alloc.count} thuốc ({formatMoney(alloc.amount)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setQuotationModal(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <FileCheck2 className="h-4 w-4" />
                  Lưu Bảng So Sánh Báo Giá & Chốt NCC
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ─── MODAL 4: TIẾP NHẬN & KIỂM NHẬN Y TẾ (GRN / QC - 4 NHÁNH PHÂN LOẠI) ─── */}
      {receivingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitReceiving} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  Bước 6 · Kiểm nghiệm GSP Dược phẩm & Phân loại 4 nhánh
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Phiếu Tiếp Nhận & Kiểm Nhận Y Tế (GRN / QC)</h2>
                <p className="text-xs text-gray-500">
                  Chứng từ: <span className="font-mono font-bold text-gray-800">{receivingModal.maYeuCau}</span> · NCC: <b>{receivingModal.nhaCungCap?.tenNhaCungCap}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingModal(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {receivingError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {receivingError}
              </div>
            )}

            {/* 4 Nhánh phân loại theo chuẩn GSP Y tế */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Kết quả kiểm nhận & Phân loại xử lý lô hàng:
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    id: 'dat_du',
                    title: '1. Đạt đủ 100%',
                    desc: 'Đúng số lượng, lô, HSD đạt chuẩn GSP -> Nhập kho',
                    color: 'border-emerald-300 bg-emerald-50 text-emerald-900',
                  },
                  {
                    id: 'dat_mot_phan',
                    title: '2. Đạt một phần',
                    desc: 'NCC giao thiếu số lượng -> Nhập phần đạt, ghi nhận thiếu',
                    color: 'border-blue-300 bg-blue-50 text-blue-900',
                  },
                  {
                    id: 'co_hang_hong',
                    title: '3. Có hàng hỏng/lỗi',
                    desc: 'Bao bì rách vỡ/lỗi cảm quan -> Lập biên bản trả hàng',
                    color: 'border-amber-300 bg-amber-50 text-amber-900',
                  },
                  {
                    id: 'tu_choi_nhan',
                    title: '4. Không phù hợp',
                    desc: 'Sai quy cách/hỏng toàn bộ -> Từ chối nhận, hủy công nợ',
                    color: 'border-rose-300 bg-rose-50 text-rose-900',
                  },
                ].map((b) => (
                  <label
                    key={b.id}
                    className={`cursor-pointer rounded-xl border p-3 transition ${b.color} ${receivingBranch === b.id ? 'ring-2 ring-blue-600 shadow-sm' : 'opacity-80'}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="receivingBranch"
                        value={b.id}
                        checked={receivingBranch === b.id}
                        onChange={() => handleBranchChange(b.id)}
                        className="text-blue-600"
                      />
                      <span className="text-xs font-bold">{b.title}</span>
                    </div>
                    <p className="mt-1 pl-5 text-[11px] leading-relaxed text-gray-600">{b.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Chi tiết từng thuốc */}
            {receivingBranch !== 'tu_choi_nhan' && (
              <div className="mt-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Chi tiết kiểm nhận từng mặt hàng</p>
                {receivingItems.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <p className="font-bold text-gray-900">
                        {item.tenThuoc || `Thuốc #${item.id}`}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          (Đơn PO: <b>{item.soLuongDat}</b> {item.donViTinh})
                        </span>
                      </p>
                      <span className="text-xs font-semibold text-emerald-700">
                        Nhập kho: {item.soLuongDatChatLuong} {item.donViTinh}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600">SL Giao thực tế *</label>
                        <input
                          required
                          type="number"
                          min="0"
                          max={item.soLuongDat}
                          value={item.soLuongGiao}
                          onChange={(e) => updateReceivingItem(index, 'soLuongGiao', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-emerald-700">SL Đạt chất lượng *</label>
                        <input
                          required
                          type="number"
                          min="0"
                          max={item.soLuongGiao}
                          value={item.soLuongDatChatLuong}
                          onChange={(e) => updateReceivingItem(index, 'soLuongDatChatLuong', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-emerald-300 bg-emerald-50/30 p-2 text-xs font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-rose-700">SL Hỏng / Lỗi</label>
                        <input
                          type="number"
                          min="0"
                          max={item.soLuongGiao}
                          value={item.soLuongHong}
                          onChange={(e) => updateReceivingItem(index, 'soLuongHong', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-rose-200 bg-rose-50/30 p-2 text-xs font-bold text-rose-800 focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600">Mã Lô SX *</label>
                        <input
                          required={item.soLuongDatChatLuong > 0}
                          placeholder="VD: LO202610A"
                          value={item.maLo}
                          onChange={(e) => updateReceivingItem(index, 'maLo', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600">Hạn dùng (GSP) *</label>
                        <input
                          required={item.soLuongDatChatLuong > 0}
                          type="date"
                          min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}
                          value={item.ngayHetHan}
                          onChange={(e) => updateReceivingItem(index, 'ngayHetHan', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {Number(item.soLuongHong) > 0 && (
                      <div className="mt-2.5">
                        <label className="text-[11px] font-semibold text-rose-700">Lý do hỏng / lỗi kỹ thuật (để ghi nhận vào biên bản trả hàng) *</label>
                        <input
                          required
                          value={item.lyDoHongLoi}
                          onChange={(e) => updateReceivingItem(index, 'lyDoHongLoi', e.target.value)}
                          placeholder="Ví dụ: Vỡ ống tiêm trong hộp, bao bì ẩm mốc do vận chuyển, vỉ rách màng nhôm..."
                          className="mt-1 w-full rounded-lg border border-rose-300 bg-white p-2 text-xs text-rose-900 focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Biên bản trả hàng nếu có hỏng lỗi hoặc từ chối nhận */}
            {(receivingBranch === 'co_hang_hong' || receivingBranch === 'tu_choi_nhan') && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertTriangle className="h-4 w-4" />
                  Nội dung Biên Bản Trả Hàng / Từ Chối Tiếp Nhận Dược Phẩm *
                </div>
                <textarea
                  required
                  value={bienBanTraHang}
                  onChange={(e) => setBienBanTraHang(e.target.value)}
                  placeholder="Ghi rõ tình trạng thực tế, kết luận của Hội đồng/Dược sĩ kiểm nhận và cam kết đổi hàng/trả hàng của đại diện nhà cung cấp..."
                  className="mt-2 w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs text-gray-800 focus:ring-1 focus:ring-rose-500"
                  rows={3}
                />
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setReceivingModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition ${
                  receivingBranch === 'tu_choi_nhan'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {receivingBranch === 'tu_choi_nhan' ? 'Xác nhận Từ Chối Nhận Hàng' : 'Xác nhận Kiểm Nhận & Nhập Kho'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL 5: ĐỐI CHIẾU 3 BÊN & CHI TRẢ CÔNG NỢ (3-WAY MATCHING & AP) ─── */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={submitPayment} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Bước 7 & 8 · Đối chiếu 3 bên (3-Way Matching) & Chi trả công nợ
                </span>
                <h2 className="mt-1 text-xl font-bold text-gray-900">Kiểm Tra Đối Chiếu & Lập Phiếu Chi Nhà Cung Cấp</h2>
                <p className="text-xs text-gray-500">
                  Chứng từ: <span className="font-mono font-bold text-gray-800">{paymentModal.maYeuCau}</span> · NCC: <b>{paymentModal.nhaCungCap?.tenNhaCungCap}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {paymentError}
              </div>
            )}

            {/* BẢNG ĐỐI CHIẾU 3 CỘT: PO vs GRN vs HÓA ĐƠN NCC */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Bảng đối chiếu 3 bên (3-Way Matching Verification)
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Cột 1: Đơn Đặt Hàng PO */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span>1. Đơn đặt hàng (PO)</span>
                    <Send className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Tổng dự toán PO: <b className="text-gray-900">{formatMoney(paymentModal.tongDuToan)}</b></p>
                    <p className="text-gray-600">Số lượng mặt hàng: <b className="text-gray-900">{paymentModal.chiTiet?.length}</b></p>
                    <p className="text-gray-600">NCC chỉ định: <b className="text-gray-900">{paymentModal.nhaCungCap?.tenNhaCungCap}</b></p>
                  </div>
                </div>

                {/* Cột 2: Phiếu Tiếp Nhận Thực Tế GRN */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span>2. Kiểm nhận thực tế (GRN)</span>
                    <PackageCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Giá trị thực tế nhập kho: <b className="text-blue-900">{formatMoney(paymentModal.tongThucTe)}</b></p>
                    <p className="text-gray-600">Kết quả QC: <b className="text-emerald-700">Đã kiểm nhận đạt tiêu chuẩn</b></p>
                    <p className="text-gray-600">Lô & HSD: <b className="text-gray-900">Đầy đủ theo GSP</b></p>
                  </div>
                </div>

                {/* Cột 3: Hóa Đơn & Quyết Toán Thanh Toán */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>3. Hóa đơn & Chi trả (AP)</span>
                    <Wallet className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-gray-600">Số tiền duyệt thanh toán: <b className="text-emerald-800 text-sm">{formatMoney(paymentModal.tongThucTe)}</b></p>
                    <p className="text-[11px] text-gray-500">Chỉ thanh toán số lượng đạt chất lượng</p>
                    <p className="text-[11px] text-gray-500">Miễn trừ hàng hỏng/thiếu nếu có</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist 3 tiêu chí */}
            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Cam kết đối chiếu kế toán (Checklist 3-Way) *
              </label>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                {[
                  { key: 'daDoiChieuNhapKho', title: 'Phiếu nhập kho hợp lệ', desc: 'Hàng đã được Dược sĩ kiểm nhận đủ điều kiện GSP' },
                  { key: 'daDoiChieuSoLuong', title: 'Khớp số lượng & đơn giá', desc: 'Đã đối trừ số lượng hỏng/thiếu theo đúng thực tế' },
                  { key: 'daDoiChieuHoaDon', title: 'Hóa đơn tài chính hợp pháp', desc: 'Có hóa đơn GTGT / Phiếu xuất kho NCC hợp lệ' },
                ].map((chk) => (
                  <label
                    key={chk.key}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      paymentChecks[chk.key] ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950' : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={paymentChecks[chk.key]}
                        onChange={(e) => setPaymentChecks((prev) => ({ ...prev, [chk.key]: e.target.checked }))}
                        className="text-emerald-600"
                      />
                      <span className="text-xs font-bold">{chk.title}</span>
                    </div>
                    <p className="mt-1 pl-5 text-[11px] text-gray-500">{chk.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Form Fields: Hóa đơn & Phiếu chi */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số Hóa Đơn NCC (VAT) *</label>
                <input
                  required
                  placeholder="Ví dụ: HD-0012948"
                  value={paymentForm.soHoaDonNcc}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soHoaDonNcc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Ngày hóa đơn NCC *</label>
                <input
                  required
                  type="date"
                  value={paymentForm.ngayHoaDonNcc}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ngayHoaDonNcc: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số Phiếu Chi (Kế toán) *</label>
                <input
                  required
                  placeholder="PC-..."
                  value={paymentForm.soChungTuChi}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soChungTuChi: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Số tiền chi (đ) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={paymentModal.tongThucTe}
                  value={paymentForm.soTien}
                  onChange={(e) => setPaymentForm({ ...paymentForm, soTien: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Phương thức thanh toán *</label>
                <select
                  value={paymentForm.phuongThucChi}
                  onChange={(e) => setPaymentForm({ ...paymentForm, phuongThucChi: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="chuyen_khoan">Chuyển khoản ngân hàng</option>
                  <option value="tien_mat">Tiền mặt tại quỹ</option>
                  <option value="the">Thẻ / POS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Ghi chú kế toán</label>
                <input
                  value={paymentForm.ghiChu}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ghiChu: e.target.value })}
                  placeholder="Thanh toán đợt 1 / đủ..."
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Lập Phiếu Chi & Xác Nhận Thanh Toán
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL 6: XEM VÀ IN ẤN CHỨNG TỪ CHUẨN ERP Y TẾ (DOCUMENT VIEWER & PRINT) ─── */}
      {docModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-xs overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in border border-gray-200">
            {/* Modal Controls - CỐ ĐỊNH Ở TRÊN CÙNG, KHÔNG BỊ CUỘN MẤT */}
            <div className="no-print flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Xem Trước & In Ấn Chứng Từ Điện Tử (Khổ A4)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Mã chứng từ: <span className="font-mono font-bold text-blue-600">{docModal.data.maYeuCau}</span> • Tiêu chuẩn WHO-GSP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDoc}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> In chứng từ (Ctrl+P)
                </button>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  className="rounded-xl p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Đóng cửa sổ (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Khung cuộn nội bộ cho bản xem trước */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100/70 flex justify-center">
              {/* Printable Document Body */}
              <div
                id="print-section"
                className="w-full max-w-[210mm] bg-white p-8 sm:p-12 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-6"
              >
                {/* Scoped CSS để in chuẩn khổ A4 không bị trang trắng */}
                <style>{`
                  @media print {
                    body { visibility: hidden !important; background: white !important; margin: 0 !important; }
                    #print-section, #print-section * { visibility: visible !important; }
                    #print-section {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 12mm 15mm !important;
                      margin: 0 !important;
                    }
                    .no-print { display: none !important; }
                  }
                `}</style>

                {/* Header Phòng khám */}
                <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">PHÒNG KHÁM ĐA KHOA QUỐC TẾ</h3>
                    <p className="text-xs text-gray-600">Kho Dược phẩm & Trang thiết bị y tế</p>
                    <p className="text-[11px] text-gray-500">Địa chỉ: 123 Đường Y Dược, Quận 1, TP. Hồ Chí Minh · Hotline: 1900.xxxx</p>
                  </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold">MÃ: {docModal.data.maYeuCau}</p>
                  <p className="text-[11px] text-gray-500">Ngày lập: {formatDate(docModal.data.ngayTao)}</p>
                  <p className="text-[10px] text-gray-400">Tiêu chuẩn: WHO-GSP / Bộ Y Tế</p>
                </div>
              </div>

              {/* Tên chứng từ */}
              <div className="my-6 text-center">
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-900">
                  {docModal.type === 'PR' && 'PHIẾU YÊU CẦU MUA DƯỢC PHẨM (PURCHASE REQUISITION)'}
                  {docModal.type === 'PO' && 'ĐƠN ĐẶT HÀNG THUỐC (PURCHASE ORDER)'}
                  {docModal.type === 'GRN' && 'BIÊN BẢN TIẾP NHẬN & KIỂM NHẬN Y TẾ (GSP GRN)'}
                  {docModal.type === 'RETURN' && 'BIÊN BẢN TRẢ HÀNG / TỪ CHỐI TIẾP NHẬN DƯỢC PHẨM'}
                </h2>
                <p className="mt-1 text-xs italic text-gray-500">
                  {docModal.type === 'PR' && 'Căn cứ nhu cầu điều trị và định mức dự trữ kho dược'}
                  {docModal.type === 'PO' && 'Hợp đồng đặt hàng theo kết quả so sánh báo giá đã duyệt'}
                  {docModal.type === 'GRN' && 'Biên bản kiểm tra ngoại quan, hạn dùng, nhãn mác và số lượng'}
                  {docModal.type === 'RETURN' && 'Ghi nhận sự cố chất lượng dược phẩm không đạt tiêu chuẩn tiếp nhận'}
                </p>
              </div>

              {/* Thông tin đối tác & Hóa đơn */}
              <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs">
                <div>
                  <p>Nhà cung cấp: <b className="text-gray-900">{docModal.data.nhaCungCap?.tenNhaCungCap || 'Chưa chỉ định'}</b></p>
                  <p className="mt-1">Điện thoại / Email: <span>{docModal.data.nhaCungCap?.soDienThoai || docModal.data.nhaCungCap?.email || '-'}</span></p>
                  <p className="mt-1">Ghi chú yêu cầu: <span>{docModal.data.ghiChu || 'Không có'}</span></p>
                </div>
                <div className="text-right">
                  <p>Trạng thái chứng từ: <b>{STATUS_CONFIG[docModal.data.trangThai]?.label || docModal.data.trangThai}</b></p>
                  {docModal.data.soHoaDonNcc && (
                    <p className="mt-1">Số hóa đơn VAT: <b className="font-mono">{docModal.data.soHoaDonNcc}</b> (Ngày: {formatDate(docModal.data.ngayHoaDonNcc)})</p>
                  )}
                  {docModal.data.soChungTuChi && (
                    <p className="mt-1">Số phiếu chi: <b className="font-mono">{docModal.data.soChungTuChi}</b></p>
                  )}
                </div>
              </div>

              {/* Bảng chi tiết thuốc */}
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-left font-bold text-gray-800">
                    <th className="border border-gray-300 p-2 text-center w-10">STT</th>
                    <th className="border border-gray-300 p-2">Tên thuốc & Nồng độ / Hàm lượng</th>
                    <th className="border border-gray-300 p-2 text-center w-16">ĐVT</th>
                    <th className="border border-gray-300 p-2 text-right">SL Đặt</th>
                    {docModal.type !== 'PR' && (
                      <>
                        <th className="border border-gray-300 p-2 text-right">SL Giao</th>
                        <th className="border border-gray-300 p-2 text-right">SL Đạt</th>
                        <th className="border border-gray-300 p-2 text-center">Mã Lô</th>
                        <th className="border border-gray-300 p-2 text-center">Hạn Dùng</th>
                      </>
                    )}
                    <th className="border border-gray-300 p-2 text-right">Đơn Giá</th>
                    <th className="border border-gray-300 p-2 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {docModal.data.chiTiet?.map((ct, idx) => {
                    const slTinh = docModal.type === 'PR' ? ct.soLuongDat : (ct.soLuongDatChatLuong ?? ct.soLuongDat);
                    const gia = ct.donGiaChon || ct.donGiaBao || 0;
                    const thanhTien = slTinh * gia;
                    return (
                      <tr key={ct.id}>
                        <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 p-2 font-medium">
                          {ct.tenThuoc || `Thuốc #${ct.thuocId}`}
                          {ct.maThuoc && <span className="text-[10px] text-gray-500 block">Mã: {ct.maThuoc}</span>}
                          {ct.lyDoHongLoi && <span className="text-[10px] text-rose-600 block">Lý do: {ct.lyDoHongLoi}</span>}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">{ct.donViTinh || 'Hộp'}</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">{ct.soLuongDat}</td>
                        {docModal.type !== 'PR' && (
                          <>
                            <td className="border border-gray-300 p-2 text-right">{ct.soLuongGiao || ct.soLuongDat}</td>
                            <td className="border border-gray-300 p-2 text-right font-bold text-emerald-800">{ct.soLuongDatChatLuong ?? ct.soLuongDat}</td>
                            <td className="border border-gray-300 p-2 text-center font-mono">{ct.maLo || '-'}</td>
                            <td className="border border-gray-300 p-2 text-center">{formatDate(ct.ngayHetHan)}</td>
                          </>
                        )}
                        <td className="border border-gray-300 p-2 text-right">{formatMoney(gia)}</td>
                        <td className="border border-gray-300 p-2 text-right font-bold">{formatMoney(thanhTien)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={docModal.type === 'PR' ? 4 : 8} className="border border-gray-300 p-2 text-right uppercase">
                      Tổng cộng tiền thanh toán:
                    </td>
                    <td colSpan={2} className="border border-gray-300 p-2 text-right text-sm text-blue-900">
                      {formatMoney(docModal.type === 'PR' ? docModal.data.tongDuToan : docModal.data.tongThucTe || docModal.data.tongDuToan)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Nội dung biên bản trả hàng nếu có */}
              {docModal.data.bienBanTraHang && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
                  <p className="font-bold text-rose-900">NỘI DUNG BIÊN BẢN TRẢ HÀNG / TỪ CHỐI TIẾP NHẬN:</p>
                  <p className="mt-1 whitespace-pre-wrap text-rose-800">{docModal.data.bienBanTraHang}</p>
                </div>
              )}

              {/* Chữ ký 4 bên chuẩn Bệnh viện / Phòng khám */}
              <div className="mt-12 grid grid-cols-4 gap-4 text-center text-xs">
                <div>
                  <p className="font-bold uppercase">Người lập biểu</p>
                  <p className="text-[11px] text-gray-500">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-semibold">{docModal.data.nguoiYeuCau?.hoTen || 'Dược sĩ lập'}</p>
                </div>

                <div>
                  <p className="font-bold uppercase">Thủ kho / Dược sĩ QC</p>
                  <p className="text-[11px] text-gray-500">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-semibold">{docModal.data.nguoiKiemNhan?.hoTen || 'Dược sĩ kiểm nhận'}</p>
                </div>

                <div>
                  <p className="font-bold uppercase">Kế toán / Thu ngân</p>
                  <p className="text-[11px] text-gray-500">(Ký, họ tên)</p>
                  <div className="h-16" />
                  <p className="font-semibold">Thủ quỹ phòng khám</p>
                </div>

                <div>
                  <p className="font-bold uppercase">Ban Giám Đốc</p>
                  <p className="text-[11px] text-gray-500">(Ký, đóng dấu)</p>
                  <div className="h-16" />
                  <p className="font-semibold">{docModal.data.nguoiDuyet?.hoTen || 'Giám đốc chuyên môn'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ─── MODAL 6: XEM DANH SÁCH THUỐC TRONG BẢNG GIÁ EXCEL CỦA NCC ─── */}
      {viewPriceListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Bảng Giá Dược Phẩm: {viewPriceListModal.tenNhaCungCap}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tên file: <span className="font-semibold text-gray-800">{viewPriceListModal.fileBangGiaTen}</span> · {Array.isArray(viewPriceListModal.bangGiaData) ? viewPriceListModal.bangGiaData.length : 0} mặt hàng · Cập nhật: {viewPriceListModal.ngayCapNhatBangGia ? new Date(viewPriceListModal.ngayCapNhatBangGia).toLocaleString('vi-VN') : 'Mới cập nhật'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCurrentPriceList(viewPriceListModal)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-4 w-4" /> Tải về Excel
                </button>
                <button
                  type="button"
                  onClick={() => setViewPriceListModal(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm thuốc */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thuốc theo tên, mã thuốc, hoạt chất..."
                  value={priceListSearch}
                  onChange={(e) => setPriceListSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Bảng danh mục */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const search = (priceListSearch || '').trim().toLowerCase();
                const list = (viewPriceListModal.bangGiaData || []).filter((item) => {
                  if (!search) return true;
                  return (
                    (item.tenThuoc || '').toLowerCase().includes(search) ||
                    (item.maThuoc || '').toLowerCase().includes(search) ||
                    (item.hoatChat || '').toLowerCase().includes(search)
                  );
                });

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-gray-400">
                      Không tìm thấy mặt hàng thuốc nào phù hợp với từ khóa tìm kiếm.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase">
                        <th className="pb-2 pl-2">Mã thuốc</th>
                        <th className="pb-2">Tên thuốc & Hàm lượng</th>
                        <th className="pb-2">Hoạt chất</th>
                        <th className="pb-2">ĐVT</th>
                        <th className="pb-2 text-right">Đơn giá chào</th>
                        <th className="pb-2 pl-4">Cam kết HSD / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {list.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 pl-2 font-mono text-[11px] text-gray-600">
                            {item.maThuoc || '-'}
                          </td>
                          <td className="py-2.5 font-bold text-gray-900">
                            {item.tenThuoc}
                          </td>
                          <td className="py-2.5 text-gray-600 italic">
                            {item.hoatChat || '-'}
                          </td>
                          <td className="py-2.5 text-gray-600">
                            {item.donViTinh || 'Hộp'}
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-700">
                            {formatMoney(item.donGia)}
                          </td>
                          <td className="py-2.5 pl-4 text-gray-500 text-[11px]">
                            {item.hanDungCamKet || item.ghiChu || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-4 bg-slate-50 flex items-center justify-between text-xs text-gray-500">
              <span>Hệ thống tự động sử dụng danh mục này để so khớp giá khi mua hàng (Bước 4).</span>
              <button
                type="button"
                onClick={() => setViewPriceListModal(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
