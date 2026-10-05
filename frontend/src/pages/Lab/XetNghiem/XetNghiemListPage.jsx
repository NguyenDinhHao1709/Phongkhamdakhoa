import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../services/api';
import { formatDateTime, formatDate } from '../../../utils/formatDate';
import { StatusBadge } from '../../../design-system/components/Badge/StatusBadge';
import {
  FlaskConical,
  Send,
  ChevronRight,
  Eye,
  UploadCloud,
  Image,
  FileText,
  CheckCircle2,
  ExternalLink,
  ClipboardList,
  UserRound,
  Clock3,
  AlertCircle,
  Search,
  Calendar,
  X,
  RefreshCw,
  Clock,
  Check,
  ChevronLeft,
  Filter,
  Activity,
  Phone,
  Scan,
} from 'lucide-react';

const TAB_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'cho_lay_mau', label: 'Chờ lấy mẫu' },
  { key: 'dang_xu_ly', label: 'Đang xử lý' },
  { key: 'co_ket_qua', label: 'Có kết quả' },
];

const ITEMS_PER_PAGE = 8;

const parseResultConfig = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseResultDetails = (value) => {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const parseAttachments = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Dữ liệu cũ là một URL đơn.
  }
  return typeof value === 'string' ? [value] : [];
};

const attachmentName = (url) => decodeURIComponent(String(url).split('/').pop() || 'Tệp kết quả');

const getApiErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message
    || error?.data?.message
    || error?.message
    || (typeof error === 'string' ? error : '');
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const DEFAULT_RESULT_CONFIG = {
  XN001: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - ống EDTA',
    fields: [
      ['WBC', 'Bạch cầu WBC', 'number', 'G/L', '4.0-10.0', 'Huyết học'],
      ['NEU_percent', 'Bạch cầu trung tính NEU%', 'number', '%', '40-75', 'Huyết học'],
      ['LYM_percent', 'Lympho LYM%', 'number', '%', '20-45', 'Huyết học'],
      ['RBC', 'Hồng cầu RBC', 'number', 'T/L', 'Nam 4.5-5.9; Nữ 4.0-5.2', 'Hồng cầu'],
      ['HGB', 'Hemoglobin HGB', 'number', 'g/dL', 'Nam 13-17; Nữ 12-16', 'Hồng cầu'],
      ['HCT', 'Hematocrit HCT', 'number', 'L/L', 'Nam 0.40-0.50; Nữ 0.35-0.47', 'Hồng cầu'],
      ['MCV', 'Thể tích trung bình hồng cầu MCV', 'number', 'fL', '80-100', 'Hồng cầu'],
      ['MCH', 'Lượng Hb trung bình hồng cầu MCH', 'number', 'pg', '27-33', 'Hồng cầu'],
      ['MCHC', 'Nồng độ Hb trung bình MCHC', 'number', 'g/dL', '32-36', 'Hồng cầu'],
      ['PLT', 'Tiểu cầu PLT', 'number', 'G/L', '150-450', 'Tiểu cầu'],
      ['MPV', 'Thể tích trung bình tiểu cầu MPV', 'number', 'fL', '7-12', 'Tiểu cầu'],
    ],
  },
  XN002: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - huyết thanh/huyết tương',
    fields: [
      ['Glucose', 'Glucose máu lúc đói', 'number', 'mmol/L', '3.9-5.5 lúc đói', 'Đường huyết'],
      ['Urea', 'Ure', 'number', 'mmol/L', '2.5-7.5', 'Chức năng thận'],
      ['Creatinine', 'Creatinine', 'number', 'µmol/L', 'Nam 62-115; Nữ 44-97', 'Chức năng thận'],
      ['AST', 'Aspartate aminotransferase AST', 'number', 'U/L', 'Nam <40; Nữ <35', 'Men gan'],
      ['ALT', 'Alanine aminotransferase ALT', 'number', 'U/L', 'Nam <41; Nữ <35', 'Men gan'],
      ['Bilirubin_total', 'Bilirubin toàn phần', 'number', 'µmol/L', '5-21', 'Gan-mật'],
      ['Bilirubin_direct', 'Bilirubin trực tiếp', 'number', 'µmol/L', '<5', 'Gan-mật'],
      ['Total_protein', 'Protein toàn phần', 'number', 'g/L', '64-83', 'Gan-mật'],
      ['Albumin', 'Albumin', 'number', 'g/L', '35-50', 'Gan-mật'],
    ],
  },
  XN003: {
    department: 'Phòng Thăm dò chức năng',
    specimen: 'Điện tâm đồ 12 chuyển đạo',
    fields: [
      ['Rate', 'Tần số tim', 'number', 'lần/phút', '60-100', 'Thông số đo'],
      ['Rhythm', 'Nhịp', 'select', '', 'Ghi theo bản đọc ECG', 'Phân tích nhịp', ['Nhịp xoang', 'Rung nhĩ', 'Cuồng nhĩ', 'Khác']],
      ['PR', 'Khoảng PR', 'number', 'ms', '120-200', 'Khoảng thời gian'],
      ['QRS', 'Thời gian QRS', 'number', 'ms', '<120', 'Khoảng thời gian'],
      ['QTc', 'QT hiệu chỉnh QTc', 'number', 'ms', 'Theo giới tính và máy đọc', 'Khoảng thời gian'],
      ['Axis', 'Trục QRS', 'number', 'độ', '-30 đến +90', 'Điện học'],
      ['ST_T', 'Đoạn ST và sóng T', 'textarea', '', 'Mô tả biến đổi nếu có', 'Điện học'],
      ['Conclusion', 'Kết luận điện tâm đồ', 'textarea', '', 'Kết luận chuyên môn', 'Kết luận'],
    ],
  },
  XN004: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Nước tiểu giữa dòng - lọ sạch chuyên dụng',
    fields: [
      ['Color', 'Màu sắc', 'select', '', 'Vàng nhạt', 'Vật lý', ['Vàng nhạt', 'Vàng', 'Vàng đậm', 'Đỏ/nâu', 'Khác']],
      ['Appearance', 'Độ trong', 'select', '', 'Trong', 'Vật lý', ['Trong', 'Hơi đục', 'Đục']],
      ['Specific_gravity', 'Tỷ trọng', 'number', '', '1.005-1.030', 'Hóa học'],
      ['pH', 'pH', 'number', '', '5.0-8.0', 'Hóa học'],
      ['Protein', 'Protein', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Vết', '1+', '2+', '3+', '4+']],
      ['Glucose', 'Glucose', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Vết', '1+', '2+', '3+', '4+']],
      ['Ketone', 'Ketone', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Vết', '1+', '2+', '3+', '4+']],
      ['Blood', 'Hồng cầu/hemoglobin', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Vết', '1+', '2+', '3+']],
      ['Nitrite', 'Nitrite', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Dương tính']],
      ['Leukocyte_esterase', 'Esterase bạch cầu', 'select', '', 'Âm tính', 'Hóa học', ['Âm tính', 'Vết', '1+', '2+', '3+']],
      ['RBC_microscopy', 'Hồng cầu soi cặn', 'text', 'TB/vi trường', '0-2', 'Soi cặn'],
      ['WBC_microscopy', 'Bạch cầu soi cặn', 'text', 'TB/vi trường', '0-5', 'Soi cặn'],
      ['Bacteria', 'Vi khuẩn', 'select', '', 'Không thấy', 'Soi cặn', ['Không thấy', 'Ít', 'Vừa', 'Nhiều']],
    ],
  },
  CD001: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Phổi, màng phổi, tim và trung thất trên X-quang ngực thẳng',
    fields: [
      ['Lungs', 'Nhu mô hai phổi', 'textarea', '', 'Mô tả tổn thương nếu có', 'Phổi'],
      ['Pleura', 'Màng phổi và góc sườn hoành', 'textarea', '', 'Tràn khí/tràn dịch hoặc không', 'Phổi'],
      ['Heart', 'Tim', 'textarea', '', 'Kích thước/chỉ số tim-ngực', 'Tim-trung thất'],
      ['Mediastinum', 'Trung thất/rốn phổi', 'textarea', '', 'Mô tả hình ảnh', 'Tim-trung thất'],
      ['Bones_soft_tissue', 'Xương và phần mềm', 'textarea', '', 'Mô tả bất thường nếu có', 'Khác'],
      ['Conclusion', 'Kết luận X-quang ngực', 'textarea', '', 'Kết luận chẩn đoán hình ảnh', 'Kết luận'],
    ],
  },
  CD002: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Gan, mật, tụy, lách, thận, bàng quang và dịch ổ bụng trên siêu âm',
    fields: [
      ['Liver', 'Gan', 'textarea', '', 'Kích thước, bờ, nhu mô, tổn thương khu trú', 'Tạng đặc'],
      ['Gallbladder', 'Túi mật', 'textarea', '', 'Thành, sỏi/bùn, dịch quanh túi mật', 'Đường mật'],
      ['Bile_duct', 'Đường mật', 'textarea', '', 'Đường mật trong/ngoài gan, ống mật chủ', 'Đường mật'],
      ['Pancreas', 'Tụy', 'textarea', '', 'Kích thước, nhu mô, ống tụy', 'Tạng đặc'],
      ['Spleen', 'Lách', 'textarea', '', 'Kích thước, nhu mô, tổn thương', 'Tạng đặc'],
      ['Right_kidney', 'Thận phải', 'textarea', '', 'Kích thước, nhu mô, sỏi, ứ nước', 'Thận-tiết niệu'],
      ['Left_kidney', 'Thận trái', 'textarea', '', 'Kích thước, nhu mô, sỏi, ứ nước', 'Thận-tiết niệu'],
      ['Bladder', 'Bàng quang', 'textarea', '', 'Mức độ căng, thành, lòng bàng quang', 'Thận-tiết niệu'],
      ['Aorta', 'Động mạch chủ bụng', 'textarea', '', 'Đường kính, phình/tắc nếu có', 'Mạch máu'],
      ['Ascites', 'Dịch ổ bụng', 'textarea', '', 'Vị trí/lượng dịch hoặc không có dịch', 'Phúc mạc'],
      ['Conclusion', 'Kết luận siêu âm ổ bụng', 'textarea', '', 'Kết luận chẩn đoán hình ảnh', 'Kết luận'],
    ],
  },
  XN005: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - huyết thanh/huyết tương',
    fields: [
      ['Cholesterol_total', 'Cholesterol toàn phần', 'number', 'mmol/L', '<5.2', 'Mỡ máu'],
      ['Triglyceride', 'Triglyceride', 'number', 'mmol/L', '<1.7', 'Mỡ máu'],
      ['HDL_C', 'HDL-C', 'number', 'mmol/L', '>1.0 nam; >1.3 nữ', 'Mỡ máu'],
      ['LDL_C', 'LDL-C', 'number', 'mmol/L', '<3.4', 'Mỡ máu'],
    ],
  },
  XN006: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - ống EDTA',
    fields: [
      ['HbA1c', 'Hemoglobin glycated HbA1c', 'number', '%', '<5.7', 'Đường huyết'],
      ['Estimated_average_glucose', 'Glucose trung bình ước tính', 'number', 'mmol/L', 'Theo HbA1c', 'Đường huyết'],
      ['Conclusion', 'Nhận định kiểm soát đường huyết', 'textarea', '', 'Ghi theo kết quả và chỉ định', 'Kết luận'],
    ],
  },
  XN007: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - huyết thanh/huyết tương',
    fields: [
      ['Sodium', 'Natri Na+', 'number', 'mmol/L', '135-145', 'Điện giải'],
      ['Potassium', 'Kali K+', 'number', 'mmol/L', '3.5-5.1', 'Điện giải'],
      ['Chloride', 'Clo Cl-', 'number', 'mmol/L', '98-107', 'Điện giải'],
      ['Calcium_total', 'Calci toàn phần', 'number', 'mmol/L', '2.15-2.55', 'Điện giải'],
    ],
  },
  XN008: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - huyết thanh/huyết tương',
    fields: [
      ['CRP', 'CRP định lượng', 'number', 'mg/L', '<5', 'Viêm'],
      ['Conclusion', 'Nhận định CRP', 'textarea', '', 'Đánh giá cùng lâm sàng', 'Kết luận'],
    ],
  },
  XN009: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - ống citrate',
    fields: [
      ['PT', 'Thời gian prothrombin PT', 'number', 'giây', '11-14', 'Đông máu'],
      ['INR', 'INR', 'number', '', '0.8-1.2 (không dùng thuốc chống đông)', 'Đông máu'],
      ['APTT', 'Thời gian thromboplastin từng phần hoạt hóa APTT', 'number', 'giây', '25-35', 'Đông máu'],
      ['Fibrinogen', 'Fibrinogen', 'number', 'g/L', '2.0-4.0', 'Đông máu'],
    ],
  },
  XN010: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Phân tươi - lọ đựng bệnh phẩm chuyên dụng',
    fields: [
      ['Color', 'Màu sắc phân', 'text', '', 'Nâu vàng thường gặp', 'Đại thể'],
      ['Consistency', 'Tính chất', 'select', '', 'Khuôn', 'Đại thể', ['Khuôn', 'Mềm', 'Lỏng', 'Nhầy', 'Khác']],
      ['Blood', 'Máu đại thể', 'select', '', 'Không thấy', 'Đại thể', ['Không thấy', 'Có']],
      ['WBC', 'Bạch cầu soi phân', 'text', 'TB/vi trường', 'Không thấy hoặc ít', 'Vi thể'],
      ['RBC', 'Hồng cầu soi phân', 'text', 'TB/vi trường', 'Không thấy', 'Vi thể'],
      ['Parasite', 'Ký sinh trùng/đơn bào', 'textarea', '', 'Không thấy', 'Vi thể'],
      ['Conclusion', 'Kết luận xét nghiệm phân', 'textarea', '', 'Kết luận chuyên môn', 'Kết luận'],
    ],
  },
  XN011: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - huyết thanh',
    fields: [
      ['HBsAg', 'Kháng nguyên bề mặt viêm gan B HBsAg', 'select', '', 'Âm tính', 'Viêm gan virus', ['Âm tính', 'Dương tính', 'Nghi ngờ']],
      ['Method', 'Phương pháp xét nghiệm', 'text', '', 'Ghi theo bộ xét nghiệm/máy', 'Thông tin xét nghiệm'],
      ['Conclusion', 'Kết luận HBsAg', 'textarea', '', 'Bác sĩ xét nghiệm kết luận', 'Kết luận'],
    ],
  },
  CD003: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Thận, niệu quản đoạn quan sát được và bàng quang',
    fields: [
      ['Right_kidney', 'Thận phải', 'textarea', '', 'Kích thước, nhu mô, sỏi, ứ nước', 'Thận'],
      ['Left_kidney', 'Thận trái', 'textarea', '', 'Kích thước, nhu mô, sỏi, ứ nước', 'Thận'],
      ['Ureters', 'Niệu quản', 'textarea', '', 'Giãn, sỏi nếu quan sát được', 'Tiết niệu'],
      ['Bladder', 'Bàng quang', 'textarea', '', 'Thành, lòng, tồn lưu sau tiểu nếu đo', 'Tiết niệu'],
      ['Conclusion', 'Kết luận siêu âm tiết niệu', 'textarea', '', 'Kết luận chẩn đoán hình ảnh', 'Kết luận'],
    ],
  },
  CD004: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Tuyến giáp và hạch vùng cổ trên siêu âm',
    fields: [
      ['Right_lobe', 'Thùy phải tuyến giáp', 'textarea', '', 'Kích thước, thể tích, nhu mô, nhân', 'Tuyến giáp'],
      ['Left_lobe', 'Thùy trái tuyến giáp', 'textarea', '', 'Kích thước, thể tích, nhu mô, nhân', 'Tuyến giáp'],
      ['Isthmus', 'Eo tuyến giáp', 'textarea', '', 'Bề dày và bất thường', 'Tuyến giáp'],
      ['Neck_nodes', 'Hạch vùng cổ', 'textarea', '', 'Vị trí, kích thước, hình thái nếu có', 'Hạch cổ'],
      ['Conclusion', 'Kết luận siêu âm tuyến giáp', 'textarea', '', 'Kết luận chẩn đoán hình ảnh', 'Kết luận'],
    ],
  },
  CD005: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Tử cung, phần phụ và thai (nếu có) trên siêu âm',
    fields: [
      ['Uterus', 'Tử cung', 'textarea', '', 'Tư thế, kích thước, cơ tử cung, nội mạc', 'Tử cung'],
      ['Right_adnexa', 'Phần phụ phải', 'textarea', '', 'Buồng trứng, nang/khối nếu có', 'Phần phụ'],
      ['Left_adnexa', 'Phần phụ trái', 'textarea', '', 'Buồng trứng, nang/khối nếu có', 'Phần phụ'],
      ['Pregnancy', 'Thai và phần phụ thai', 'textarea', '', 'Tuổi thai, tim thai, vị trí, nhau, ối nếu có', 'Thai kỳ'],
      ['Conclusion', 'Kết luận siêu âm sản-phụ khoa', 'textarea', '', 'Kết luận chẩn đoán hình ảnh', 'Kết luận'],
    ],
  },
  CD006: {
    department: 'Khoa Chẩn đoán hình ảnh',
    specimen: 'Hai tuyến vú và hạch vùng nách trên siêu âm',
    fields: [
      ['Right_breast', 'Vú phải', 'textarea', '', 'Mô tuyến, tổn thương, vị trí/kích thước nếu có', 'Tuyến vú'],
      ['Left_breast', 'Vú trái', 'textarea', '', 'Mô tuyến, tổn thương, vị trí/kích thước nếu có', 'Tuyến vú'],
      ['Axillary_nodes', 'Hạch nách', 'textarea', '', 'Kích thước, hình thái nếu có', 'Hạch vùng'],
      ['BIRADS', 'Phân loại BI-RADS siêu âm', 'select', '', 'Theo BI-RADS hiện hành', 'Phân loại', ['BI-RADS 1', 'BI-RADS 2', 'BI-RADS 3', 'BI-RADS 4', 'BI-RADS 5', 'Chưa phân loại']],
      ['Conclusion', 'Kết luận siêu âm tuyến vú', 'textarea', '', 'Kết luận và khuyến nghị theo dõi', 'Kết luận'],
    ],
  },
  CD007: {
    department: 'Phòng Thăm dò chức năng',
    specimen: 'Tim và mạch máu trên siêu âm Doppler tim',
    fields: [
      ['Chambers', 'Các buồng tim', 'textarea', '', 'Kích thước và hình thái', 'Cấu trúc tim'],
      ['Valves', 'Van tim', 'textarea', '', 'Hình thái, hở/hẹp nếu có', 'Van tim'],
      ['LVEF', 'Phân suất tống máu thất trái LVEF', 'number', '%', 'Tham chiếu theo phương pháp đo', 'Chức năng tim'],
      ['Pericardium', 'Màng ngoài tim', 'textarea', '', 'Dịch màng tim nếu có', 'Màng ngoài tim'],
      ['Conclusion', 'Kết luận siêu âm tim', 'textarea', '', 'Bác sĩ tim mạch kết luận', 'Kết luận'],
    ],
  },
};

const getFallbackServiceConfig = (service) => {
  const fallback = DEFAULT_RESULT_CONFIG[service?.maDichVu];
  if (!fallback) return null;
  return {
    ...fallback,
    fields: fallback.fields.map(([key, label, type, unit, reference, section, options]) => ({
      key, label, type, unit, reference, section, options,
    })),
  };
};

export default function XetNghiemListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLoai, setFilterLoai] = useState('all');
  const [filterNhom, setFilterNhom] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Tự động mở chỉ định xét nghiệm từ URL (khi bấm vào từ Thông báo)
  useEffect(() => {
    const idFromParam = searchParams.get('chiDinhId');
    if (idFromParam) {
      setSelectedId(Number(idFromParam));
      setFilterStatus('all');
    }
  }, [searchParams]);

  // Query dữ liệu
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['chi-dinh-list'],
    queryFn: () => apiGet('/xet-nghiem/chi-dinh?limit=200'),
  });

  const rawList = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data)
    ? data
    : [];

  const normalizeText = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };

  const getServiceGroup = (service) => {
    const name = normalizeText(service?.tenDichVu);
    if (name.includes('sieu am')) return 'sieu_am';
    if (name.includes('x-quang') || name.includes('x quang')) return 'x_quang';
    if (name.includes('dien tam do') || name.includes('ecg')) return 'ecg';
    if (service?.loai === 'xet_nghiem') return 'xet_nghiem';
    return 'khac';
  };

  const getInitials = (name) => {
    if (!name) return 'BN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarBg = (name) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Hàm kiểm tra ngày tháng
  const matchesDate = (d, from, to) => {
    if (!from && !to) return true;
    if (!d.thoiGianChiDinh) return false;
    const dStr =
      typeof d.thoiGianChiDinh === 'string'
        ? d.thoiGianChiDinh.substring(0, 10)
        : new Date(d.thoiGianChiDinh).toISOString().substring(0, 10);
    if (from && dStr < from) return false;
    if (to && dStr > to) return false;
    return true;
  };

  // Lọc đa tiêu chí
  const filteredList = useMemo(() => {
    let result = rawList;

    // 1. Trạng thái
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter((item) => {
        if (filterStatus === 'cho_lay_mau') {
          return item.trangThai === 'cho_lay_mau' || item.trangThai === 'dang_lay_mau';
        }
        return item.trangThai === filterStatus;
      });
    }

    // 2. Loại dịch vụ (Xét nghiệm / CĐHA)
    if (filterLoai && filterLoai !== 'all') {
      result = result.filter((item) => item.dichVu?.loai === filterLoai);
    }

    // 3. Nhóm dịch vụ cụ thể
    if (filterNhom && filterNhom !== 'all') {
      result = result.filter((item) => getServiceGroup(item.dichVu) === filterNhom);
    }

    // 4. Ngày tháng
    if (filterDateFrom || filterDateTo) {
      result = result.filter((item) => matchesDate(item, filterDateFrom, filterDateTo));
    }

    // 5. Tìm kiếm từ khóa
    if (debouncedKeyword.trim()) {
      const kw = normalizeText(debouncedKeyword);
      result = result.filter((item) => {
        const bn = item.benhAnKham?.hoSoBenhAn?.benhNhan;
        const name = normalizeText(bn?.hoTen);
        const phone = normalizeText(bn?.soDienThoai);
        const maBn = normalizeText(bn?.maBenhNhan);
        const tenDv = normalizeText(item.dichVu?.tenDichVu);
        const idStr = String(item.id);
        return name.includes(kw) || phone.includes(kw) || maBn.includes(kw) || tenDv.includes(kw) || idStr.includes(kw);
      });
    }

    return result;
  }, [rawList, filterStatus, filterLoai, filterNhom, filterDateFrom, filterDateTo, debouncedKeyword]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = rawList.length;
    const choLayMau = rawList.filter(
      (i) => i.trangThai === 'cho_lay_mau' || i.trangThai === 'dang_lay_mau'
    ).length;
    const dangXuLy = rawList.filter((i) => i.trangThai === 'dang_xu_ly').length;
    const coKetQua = rawList.filter((i) => i.trangThai === 'co_ket_qua').length;
    const todayCount = rawList.filter(
      (i) => i.thoiGianChiDinh && i.thoiGianChiDinh.startsWith(todayStr)
    ).length;

    return { total, choLayMau, dangXuLy, coKetQua, todayCount };
  }, [rawList, todayStr]);

  // Phân trang
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredList, currentPage]);

  const handleQuickDate = (daysAgo) => {
    const now = new Date();
    if (daysAgo === 0) {
      const today = now.toISOString().split('T')[0];
      setFilterDateFrom(today);
      setFilterDateTo(today);
    } else if (daysAgo === 7) {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else if (daysAgo === 30) {
      const past = new Date();
      past.setDate(1);
      setFilterDateFrom(past.toISOString().split('T')[0]);
      setFilterDateTo(now.toISOString().split('T')[0]);
    } else {
      setFilterDateFrom('');
      setFilterDateTo('');
    }
    setCurrentPage(1);
  };

  const isFiltered =
    filterStatus !== 'all' || filterLoai !== 'all' || filterNhom !== 'all' || filterDateFrom || filterDateTo || searchKeyword;

  return (
    <div className="space-y-4 pb-10 animate-fade-in">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary-600" />
              Quản lý Xét nghiệm & Chẩn đoán hình ảnh
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Kỹ thuật viên
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tiếp nhận mẫu bệnh phẩm, thực hiện phân tích cận lâm sàng và trả kết quả cho bác sĩ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê trạng thái nhanh (Click để lọc) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tổng chỉ định */}
        <div
          onClick={() => {
            setFilterStatus('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'all'
              ? 'bg-primary-50/80 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Tổng chỉ định</span>
            <Activity className="h-4 w-4 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Hôm nay: +{stats.todayCount} ca mới</div>
        </div>

        {/* Chờ lấy mẫu */}
        <div
          onClick={() => {
            setFilterStatus('cho_lay_mau');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'cho_lay_mau'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Chờ lấy mẫu</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.choLayMau}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Chưa lấy bệnh phẩm</div>
        </div>

        {/* Đang xử lý */}
        <div
          onClick={() => {
            setFilterStatus('dang_xu_ly');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'dang_xu_ly'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">Đang xử lý / Đọc KQ</span>
            <FlaskConical className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{stats.dangXuLy}</div>
          <div className="text-[11px] text-blue-700/80 mt-0.5">Đang chạy máy / Chờ nhập</div>
        </div>

        {/* Đã có kết quả */}
        <div
          onClick={() => {
            setFilterStatus('co_ket_qua');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'co_ket_qua'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Đã có kết quả</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.coKetQua}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Đã hoàn thành</div>
        </div>
      </div>

      {/* 3. Bộ lọc Đa năng: Ngày tháng, Loại dịch vụ, Tìm kiếm */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          {/* Tìm kiếm */}
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo Mã CĐ, Tên BN, SĐT, Tên XN..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all placeholder:text-gray-400"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Loại dịch vụ */}
          <div className="lg:col-span-2">
            <select
              value={filterLoai}
              onChange={(e) => {
                setFilterLoai(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">🔬 Tất cả loại cận lâm sàng</option>
              <option value="xet_nghiem">🧪 Xét nghiệm (Máu, Sinh hóa, Nước tiểu)</option>
              <option value="cdha">📷 CĐHA (X-Quang, Siêu âm, CT)</option>
            </select>
          </div>

          {/* Lọc nhóm dịch vụ cụ thể */}
          <div className="lg:col-span-2">
            <select
              value={filterNhom}
              onChange={(e) => {
                setFilterNhom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">Tất cả nhóm dịch vụ</option>
              <option value="xet_nghiem">Xét nghiệm máu/nước tiểu/phân</option>
              <option value="sieu_am">Siêu âm</option>
              <option value="x_quang">X-quang</option>
              <option value="ecg">Điện tâm đồ</option>
              <option value="khac">Nhóm khác</option>
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="lg:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-800 transition-all font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="cho_lay_mau">⏳ Chờ lấy mẫu / Đang lấy mẫu</option>
              <option value="dang_xu_ly">🔬 Đang xử lý</option>
              <option value="co_ket_qua">✅ Đã có kết quả</option>
            </select>
          </div>

          {/* Nút reset nhanh */}
          <div className="lg:col-span-2 flex items-center justify-end">
            {isFiltered && (
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterLoai('all');
                  setFilterNhom('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchKeyword('');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors text-center cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Lọc Ngày tháng & Preset nhanh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-medium">Lọc theo ngày chỉ định:</span>
            <div className="flex items-center gap-1.5 bg-gray-50/80 p-1 rounded-xl border border-gray-200">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Từ ngày"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-0 text-xs text-gray-700 focus:outline-none p-1"
                placeholder="Đến ngày"
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick date chips */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickDate(0)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterDateFrom === todayStr && filterDateTo === todayStr
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => handleQuickDate(7)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                7 ngày qua
              </button>
              <button
                onClick={() => handleQuickDate(30)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
              >
                Tháng này
              </button>
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => handleQuickDate(-1)}
                  className="px-2 py-1 text-xs text-primary-600 hover:underline font-semibold"
                >
                  Tất cả ngày
                </button>
              )}
            </div>
          </div>

          <div className="text-gray-500">
            Hiển thị <strong className="text-gray-900">{filteredList.length}</strong> / {rawList.length} chỉ định
          </div>
        </div>
      </div>

      {/* 4. Split Layout: Left Table List + Right Detail/Result Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Danh sách chỉ định */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto mb-3" />
                <p className="text-xs font-medium">Đang tải danh sách chỉ định...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
                  <FlaskConical className="h-6 w-6" />
                </div>
                <p className="font-bold text-gray-700 text-sm">Không tìm thấy chỉ định cận lâm sàng nào</p>
                <p className="text-xs text-gray-400">
                  Vui lòng thử điều chỉnh lại bộ lọc ngày tháng hoặc từ khóa tìm kiếm.
                </p>
                {isFiltered && (
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterLoai('all');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                      setSearchKeyword('');
                    }}
                    className="text-xs font-semibold text-primary-600 hover:underline pt-1 inline-block cursor-pointer"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="py-3 px-3.5">Mã CĐ</th>
                      <th className="py-3 px-3.5">Bệnh nhân</th>
                      <th className="py-3 px-3.5">Tên xét nghiệm</th>
                      <th className="py-3 px-3.5">Trạng thái</th>
                      <th className="py-3 px-3.5">Thời gian</th>
                      <th className="py-3 px-3.5 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
                    {paginatedList.map((cd) => {
                      const bn = cd.benhAnKham?.hoSoBenhAn?.benhNhan;
                      const patientName = bn?.hoTen || 'Bệnh nhân';
                      const initials = getInitials(patientName);
                      const avatarBg = getAvatarBg(patientName);
                      const isSelected = selectedId === cd.id;
                      const isToday = cd.thoiGianChiDinh && cd.thoiGianChiDinh.startsWith(todayStr);
                      const isCdha = cd.dichVu?.loai === 'cdha';

                      return (
                        <tr
                          key={cd.id}
                          onClick={() => {
                            setSelectedId(cd.id);
                            setSearchParams({ chiDinhId: cd.id });
                          }}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-50/80 border-l-4 border-l-primary-600 shadow-2xs'
                              : 'hover:bg-blue-50/30'
                          }`}
                        >
                          {/* Mã CĐ */}
                          <td className="py-3 px-3.5">
                            <span
                              className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                isSelected
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              #{cd.id}
                            </span>
                          </td>

                          {/* Bệnh nhân */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${avatarBg}`}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-xs truncate max-w-[120px]">
                                  {patientName}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.2">
                                  {bn?.maBenhNhan || '---'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Tên dịch vụ */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              {isCdha ? (
                                <Scan className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              ) : (
                                <FlaskConical className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              )}
                              <span className="font-semibold text-gray-900 line-clamp-1 max-w-[160px]">
                                {cd.dichVu?.tenDichVu || '—'}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {isCdha ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm'}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3 px-3.5">
                            <StatusBadge status={cd.trangThai} size="sm" />
                          </td>

                          {/* Thời gian */}
                          <td className="py-3 px-3.5">
                            <div className="text-gray-700 font-medium whitespace-nowrap">
                              {formatDateTime(cd.thoiGianChiDinh)}
                            </div>
                            {isToday && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded mt-0.5 inline-block">
                                Hôm nay
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(cd.id);
                                setSearchParams({ chiDinhId: cd.id });
                              }}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100 border-gray-200'
                              }`}
                              title="Xem chi tiết & nhập kết quả"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Phân trang */}
            {filteredList.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50/40">
                <div>
                  Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (
                  <strong>{filteredList.length}</strong> chỉ định)
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chi tiết chỉ định & Nhập kết quả */}
        <div className="lg:col-span-5">
          {selectedId ? (
            <ChiDinhDetailPanel id={selectedId} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
                <FlaskConical className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Chưa chọn chỉ định cận lâm sàng</p>
              <p className="text-xs text-gray-400">
                Nhấp vào bất kỳ dòng nào trong bảng danh sách bên trái để xem hồ sơ và nhập kết quả phân tích.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChiDinhDetailPanel({ id }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['chi-dinh-detail', id],
    queryFn: () => apiGet(`/xet-nghiem/chi-dinh/${id}`),
  });

  const cd = data?.data?.chiDinh;
  const kq = data?.data?.ketQua;

  const [result, setResult] = useState({
    giaTri: '',
    donVi: '',
    nhanXet: '',
    fileDinhKem: '',
    ketQuaChiTiet: {},
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [correctionMode, setCorrectionMode] = useState(false);

  useEffect(() => {
    if (kq) {
      setResult({
        giaTri: kq.giaTri || '',
        donVi: kq.donVi || cd?.dichVu?.donViKetQua || '',
        nhanXet: kq.nhanXet || '',
        fileDinhKem: kq.fileDinhKem || '',
        ketQuaChiTiet: parseResultDetails(kq.ketQuaChiTiet ?? kq.ket_qua_chi_tiet),
      });
      setAttachments(parseAttachments(kq.fileDinhKem ?? kq.file_dinh_kem));
    } else if (cd?.dichVu) {
      // Chỉ định mới phải bắt đầu với biểu mẫu trống, không dùng lại dữ liệu
      // của chỉ định vừa mở trước đó.
      setResult({
        giaTri: '',
        donVi: cd.dichVu.donViKetQua || '',
        nhanXet: '',
        fileDinhKem: '',
        ketQuaChiTiet: {},
      });
      setAttachments([]);
      setCorrectionMode(false);
    }
  }, [kq, cd]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFile(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiPost('/xet-nghiem/upload', formData);
        return res?.data?.url || res?.url;
      }));
      setAttachments((prev) => [...prev, ...uploaded.filter(Boolean)]);
    } catch (err) {
      console.error('Lỗi tải file:', err);
      alert('Không thể upload file: ' + getApiErrorMessage(err, 'Máy chủ không phản hồi'));
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (url) => {
    if (!window.confirm(`Xóa tệp "${attachmentName(url)}"?`)) return;
    try {
      await apiDelete(`/xet-nghiem/upload/${encodeURIComponent(attachmentName(url))}`);
      setAttachments((prev) => prev.filter((item) => item !== url));
    } catch (err) {
      console.error('Lỗi xóa file:', err);
      alert('Không thể xóa file: ' + getApiErrorMessage(err, 'Máy chủ không phản hồi'));
    }
  };

  const statusMut = useMutation({
    mutationFn: (trangThai) => apiPatch(`/xet-nghiem/chi-dinh/${id}/trang-thai`, { trangThai }),
    onSuccess: () => {
      qc.invalidateQueries(['chi-dinh-list']);
      qc.invalidateQueries(['chi-dinh-detail', id]);
    },
  });

  const resultMut = useMutation({
    mutationFn: (data) => apiPost(`/xet-nghiem/chi-dinh/${id}/ket-qua`, data),
    onSuccess: () => {
      qc.invalidateQueries(['chi-dinh-list']);
      qc.invalidateQueries(['chi-dinh-detail', id]);
      alert('Đã lưu kết quả xét nghiệm thành công!');
    },
  });

  const sendMut = useMutation({
    mutationFn: () => apiPatch(`/xet-nghiem/chi-dinh/${id}/gui-bac-si`),
    onSuccess: () => {
      qc.invalidateQueries(['chi-dinh-list']);
      qc.invalidateQueries(['chi-dinh-detail', id]);
      qc.invalidateQueries({ queryKey: ['thong-bao'] });
      alert('Đã chuyển phát kết quả cho Bác sĩ điều trị!');
    },
  });

  const correctionMut = useMutation({
    mutationFn: ({ nhanXet, lyDo }) => apiPatch(`/xet-nghiem/chi-dinh/${id}/hieu-chinh`, { nhanXet, lyDo }),
    onSuccess: (res) => {
      setCorrectionMode(false);
      qc.invalidateQueries(['chi-dinh-detail', id]);
      qc.invalidateQueries({ queryKey: ['thong-bao'] });
      alert(res?.message || 'Đã hiệu chỉnh nhận xét và gửi lại thông tin cho bác sĩ.');
    },
    onError: (err) => alert(getApiErrorMessage(err, 'Không thể hiệu chỉnh nhận xét')),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 shadow-xs">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent mx-auto mb-2" />
        <p className="text-xs">Đang tải thông tin chỉ định...</p>
      </div>
    );
  }

  if (!cd) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 shadow-xs">
        <p className="text-xs">Không tìm thấy thông tin chỉ định #{id}</p>
      </div>
    );
  }

  const bn = cd.benhAnKham?.hoSoBenhAn?.benhNhan;

  const STATUS_FLOW = {
    cho_lay_mau: { next: 'dang_lay_mau', label: 'Bắt đầu lấy mẫu' },
    dang_lay_mau: { next: 'dang_xu_ly', label: 'Chuyển sang máy xử lý' },
    dang_xu_ly: null,
    co_ket_qua: null,
  };

  const nextStep = STATUS_FLOW[cd.trangThai];
  const isCdha = cd.dichVu?.loai === 'cdha';
  const isUltrasound = isCdha && (
    /^CD00[2-7]$/i.test(String(cd.dichVu?.maDichVu || '')) ||
    String(cd.dichVu?.tenDichVu || '').toLowerCase().includes('siêu âm')
  );
  const fallbackConfig = getFallbackServiceConfig(cd.dichVu);
  const resultFields = parseResultConfig(cd.dichVu?.cauHinhKetQua || cd.dichVu?.cau_hinh_ket_qua);
  const configuredFields = resultFields.length > 0 ? resultFields : fallbackConfig?.fields || [];
  const hasStructuredFields = configuredFields.length > 0;
  const resultSections = configuredFields.reduce((sections, field) => {
    const section = field.section || 'Kết quả';
    if (!sections[section]) sections[section] = [];
    sections[section].push(field);
    return sections;
  }, {});

  return (
    <div className="space-y-3.5">
      {/* 1. Thẻ Bệnh nhân & Chỉ định */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Header dịch vụ */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200">
                #{cd.id}
              </span>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {isCdha ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm cận lâm sàng'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
              {cd.dichVu?.tenDichVu}
            </h3>
          </div>
          <StatusBadge status={cd.trangThai} />
        </div>

        {/* Thông tin người bệnh */}
        {bn && (
          <div className="p-3.5 bg-blue-50/60 border border-blue-100/80 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-blue-900 font-bold uppercase tracking-wide text-[11px]">
              <span className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-blue-700" /> Hồ sơ bệnh nhân
              </span>
              <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                {bn.maBenhNhan}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-gray-700 pt-0.5">
              <p className="col-span-2">
                Họ và tên: <strong className="text-gray-900 text-sm">{bn.hoTen}</strong>
              </p>
              <p>
                Giới tính:{' '}
                <strong className="text-gray-900">
                  {bn.gioiTinh === 'nam' ? 'Nam' : bn.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}
                </strong>
              </p>
              <p>
                Ngày sinh:{' '}
                <strong className="text-gray-900">
                  {bn.ngaySinh ? formatDate(bn.ngaySinh) : '---'}
                </strong>
              </p>
              <p className="col-span-2 flex items-center gap-1">
                <Phone className="h-3 w-3 text-gray-400" /> SĐT:{' '}
                <strong className="text-gray-900">{bn.soDienThoai || '---'}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Ghi chú & Triệu chứng */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Thời gian chỉ định</span>
            <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
              <Clock3 className="h-3 w-3 text-gray-500" /> {formatDateTime(cd.thoiGianChiDinh)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Bộ phận thực hiện</span>
            <span className="font-semibold text-gray-800 block mt-0.5">
              {cd.dichVu?.boPhanThucHien || cd.dichVu?.bo_phan_thuc_hien || fallbackConfig?.department || 'Chưa cấu hình'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Bệnh phẩm/đối tượng khảo sát</span>
            <span className="font-semibold text-gray-800 block mt-0.5">
              {cd.dichVu?.mauBenhPham || cd.dichVu?.mau_benh_pham || fallbackConfig?.specimen || (isCdha ? 'Cơ quan khảo sát trên hình ảnh' : 'Chưa cấu hình')}
            </span>
          </div>
          {cd.ghiChuChiDinh && (
            <div className="col-span-2 pt-1 border-t border-gray-100 text-gray-700">
              <span className="font-bold text-gray-800">Chẩn đoán sơ bộ / Yêu cầu:</span>{' '}
              <em>{cd.ghiChuChiDinh}</em>
            </div>
          )}
        </div>

        {/* Nút chuyển trạng thái nhanh */}
        {nextStep && (
          <button
            onClick={() => statusMut.mutate(nextStep.next)}
            disabled={statusMut.isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs shadow-primary-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <span>{nextStep.label}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 2. Phiếu nhập / xem kết quả */}
      {(cd.trangThai === 'dang_xu_ly' || cd.trangThai === 'co_ket_qua') && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary-600" />
              {isCdha ? 'Kết quả Chẩn đoán hình ảnh' : 'Phiếu nhập Kết quả Xét nghiệm'}
            </h4>
            {cd.trangThai === 'co_ket_qua' && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Đã có KQ
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              resultMut.mutate({
                ...result,
                fileDinhKem: JSON.stringify(attachments),
                ketQuaChiTiet: JSON.stringify(result.ketQuaChiTiet || {}),
              });
            }}
            className="space-y-3 text-xs"
          >
            <div className="p-3 bg-primary-50/40 border border-primary-100/70 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {hasStructuredFields ? (
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-700">Các chỉ số cần nhập</label>
                      <span className="text-[11px] text-gray-500">
                        Nhập theo mẫu của labo; khoảng tham chiếu chỉ mang tính tham khảo.
                      </span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(resultSections).map(([section, fields]) => (
                        <div key={section} className="rounded-lg border border-primary-100 bg-white p-2.5">
                          <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary-800">{section}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {fields.map((field) => (
                              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                  {field.label} {field.unit ? `(${field.unit})` : ''}
                                  {field.required !== false && <span className="text-red-500"> *</span>}
                                </label>
                                {field.type === 'select' ? (
                            <select
                              required={field.required !== false}
                              value={result.ketQuaChiTiet?.[field.key] || ''}
                              onChange={(e) =>
                                setResult((r) => ({
                                  ...r,
                                  ketQuaChiTiet: { ...r.ketQuaChiTiet, [field.key]: e.target.value },
                                }))
                              }
                              className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">-- Chọn kết quả --</option>
                              {(field.options || []).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                                ) : field.type === 'textarea' ? (
                            <textarea
                              rows={2}
                              required={field.required !== false}
                              value={result.ketQuaChiTiet?.[field.key] || ''}
                              onChange={(e) =>
                                setResult((r) => ({
                                  ...r,
                                  ketQuaChiTiet: { ...r.ketQuaChiTiet, [field.key]: e.target.value },
                                }))
                              }
                              placeholder={field.reference ? `Tham chiếu: ${field.reference}` : 'Nhập kết quả'}
                              className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-primary-500"
                            />
                                ) : (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              step={field.type === 'number' ? 'any' : undefined}
                              required={field.required !== false}
                              value={result.ketQuaChiTiet?.[field.key] || ''}
                              onChange={(e) =>
                                setResult((r) => ({
                                  ...r,
                                  ketQuaChiTiet: { ...r.ketQuaChiTiet, [field.key]: e.target.value },
                                }))
                              }
                              placeholder={field.reference ? `Tham chiếu: ${field.reference}` : 'Nhập kết quả'}
                              className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-primary-500"
                            />
                                )}
                                {field.reference && (
                                  <p className="mt-1 text-[10px] text-gray-500">TGĐC tham khảo: {field.reference}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Trị số / Kết quả <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={result.giaTri}
                        onChange={(e) => setResult((r) => ({ ...r, giaTri: e.target.value }))}
                        placeholder={isCdha ? 'VD: Bình thường, không u hạt...' : 'VD: 4.5, Âm tính, Dương tính...'}
                        className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Đơn vị đo</label>
                      <input
                        type="text"
                        value={result.donVi}
                        onChange={(e) => setResult((r) => ({ ...r, donVi: e.target.value }))}
                        placeholder={cd.dichVu?.donViKetQua || 'VD: mmol/L, G/L...'}
                        className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Khoảng tham chiếu */}
              <div className="flex items-start gap-1.5 p-2 bg-white rounded-lg border border-amber-200/80 text-[11px] text-amber-900">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Khoảng tham chiếu chuẩn:{' '}
                  <strong className="text-gray-900">
                    {cd.dichVu?.giaTriBinhThuong || 'Theo khoảng tham chiếu trên từng chỉ số'}
                  </strong>
                  .
                </span>
              </div>
            </div>

            {/* Nhận xét chuyên môn */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Nhận xét chuyên môn & Kết luận
              </label>
              <textarea
                rows={3}
                value={result.nhanXet}
                onChange={(e) => setResult((r) => ({ ...r, nhanXet: e.target.value }))}
                disabled={Boolean(kq?.daGuiBacSi) && !correctionMode}
                placeholder={
                  isCdha
                    ? 'Mô tả chi tiết phát hiện hình ảnh, cấu trúc giải phẫu và kết luận...'
                    : 'Ghi chú các bất thường hoặc diễn giải kết quả...'
                }
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Đính kèm ảnh siêu âm hoặc file kết quả */}
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-700">
                {isUltrasound
                  ? 'Ảnh siêu âm (nên tải đầy đủ ảnh chụp khảo sát)'
                  : isCdha
                    ? 'Ảnh / PDF kết quả chẩn đoán hình ảnh'
                    : 'Tài liệu kết quả đính kèm'}
              </label>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer transition-colors shadow-2xs">
                  <UploadCloud className={`h-4 w-4 ${isUltrasound ? 'text-purple-600' : 'text-primary-600'}`} />
                  <span>
                    {uploadingFile
                      ? 'Đang tải lên...'
                      : isUltrasound
                        ? 'Tải ảnh siêu âm lên'
                        : 'Tải ảnh / PDF lên'}
                  </span>
                  <input
                    type="file"
                    accept={isUltrasound ? 'image/*' : 'image/*,.pdf'}
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>

                {attachments.length > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="h-3 w-3" /> {attachments.length} tệp đã tải
                  </span>
                )}
              </div>
              {isUltrasound && (
                <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2">
                  Có thể chọn nhiều ảnh siêu âm cùng lúc. Ảnh sẽ được lưu cùng phiếu kết quả để bác sĩ xem lại từng ảnh.
                </p>
              )}

              {/* Preview */}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-1.5">
                  {attachments.map((url) => {
                    const fileUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
                    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
                    return (
                      <div key={url} className="p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          {isImage ? (
                            <img src={fileUrl} alt={attachmentName(url)} className="h-10 w-10 object-cover rounded-lg border shrink-0 bg-white" />
                          ) : (
                            <FileText className="h-7 w-7 text-primary-600 shrink-0" />
                          )}
                          <span className="text-xs text-gray-600 font-mono truncate">{attachmentName(url)}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1 text-xs font-semibold">
                            <ExternalLink className="h-3.5 w-3.5" /> Xem
                          </a>
                          <button type="button" onClick={() => handleRemoveAttachment(url)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold">
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {!kq?.daGuiBacSi && <button
                type="submit"
                disabled={resultMut.isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{resultMut.isLoading ? 'Đang lưu...' : 'Lưu kết quả'}</span>
              </button>}
            </div>
          </form>

          {/* Gửi cho bác sĩ */}
          {kq && !kq.daGuiBacSi && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => sendMut.mutate()}
                disabled={sendMut.isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span>Gửi kết quả cho Bác sĩ điều trị</span>
              </button>
            </div>
          )}

          {kq?.daGuiBacSi && (
            <div className="space-y-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Đã chuyển phát kết quả cho Bác sĩ</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!correctionMode) {
                    setCorrectionMode(true);
                    return;
                  }
                  const lyDo = window.prompt('Nhập lý do hiệu chỉnh nhận xét:');
                  if (!lyDo?.trim()) return;
                  correctionMut.mutate({ nhanXet: result.nhanXet, lyDo: lyDo.trim() });
                }}
                disabled={correctionMut.isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
              >
                {correctionMut.isLoading
                  ? 'Đang lưu hiệu chỉnh...'
                  : correctionMode
                    ? 'Lưu hiệu chỉnh và gửi lại bác sĩ'
                    : 'Mở khóa để hiệu chỉnh nhận xét'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
