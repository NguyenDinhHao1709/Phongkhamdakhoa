/**
 * Cấu hình mẫu chỉ số xét nghiệm & chẩn đoán hình ảnh (HIS/LIS Lab Templates)
 * Dùng chung giữa Kỹ thuật viên (nhập KQ) và Bác sĩ khám (xem toàn bộ thông số chi tiết)
 */

export const parseResultConfig = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const parseResultDetails = (value) => {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const DEFAULT_RESULT_CONFIG = {
  XN001: {
    department: 'Khoa Xét nghiệm',
    specimen: 'Máu tĩnh mạch - ống EDTA',
    fields: [
      ['WBC', 'Bạch cầu WBC', 'number', 'G/L', '4.0-10.0', 'Huyết học'],
      ['NEU_percent', 'Bạch cầu trung tính NEU%', 'number', '%', '40-75', 'Huyết học'],
      ['LYM_percent', 'Lympho LYM%', 'number', '%', '20-45', 'Huyết học'],
      ['MONO_percent', 'Mono MONO%', 'number', '%', '2-10', 'Huyết học'],
      ['EOS_percent', 'Eosinophil EOS%', 'number', '%', '0-6', 'Huyết học'],
      ['BASO_percent', 'Basophil BASO%', 'number', '%', '0-2', 'Huyết học'],
      ['RBC', 'Hồng cầu RBC', 'number', 'T/L', 'Nam 4.5-5.9; Nữ 4.0-5.2', 'Hồng cầu'],
      ['HGB', 'Hemoglobin HGB', 'number', 'g/dL', 'Nam 13-17; Nữ 12-16', 'Hồng cầu'],
      ['HCT', 'Hematocrit HCT', 'number', 'L/L', 'Nam 0.40-0.50; Nữ 0.35-0.47', 'Hồng cầu'],
      ['MCV', 'Thể tích trung bình hồng cầu MCV', 'number', 'fL', '80-100', 'Hồng cầu'],
      ['MCH', 'Lượng Hb trung bình hồng cầu MCH', 'number', 'pg', '27-33', 'Hồng cầu'],
      ['MCHC', 'Nồng độ Hb trung bình MCHC', 'number', 'g/dL', '32-36', 'Hồng cầu'],
      ['RDW_CV', 'Độ phân bố kích thước hồng cầu RDW-CV', 'number', '%', '11.5-14.5', 'Hồng cầu'],
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

export const getFallbackServiceConfig = (service) => {
  const fallback = DEFAULT_RESULT_CONFIG[service?.maDichVu];
  if (!fallback) return null;
  return {
    ...fallback,
    fields: fallback.fields.map(([key, label, type, unit, reference, section, options]) => ({
      key, label, type, unit, reference, section, options,
    })),
  };
};

/**
 * Đánh giá chỉ số là bình thường / cao / thấp theo khoảng tham chiếu chuẩn
 */
export const evaluateLabValue = (valStr, refStr) => {
  if (valStr === undefined || valStr === null || valStr === '' || !refStr) return 'normal';
  const val = parseFloat(String(valStr).replace(',', '.'));
  if (isNaN(val)) return 'normal';

  // Định dạng "4.0-10.0" hoặc "40-75"
  const rangeMatch = String(refStr).match(/^([0-9.]+)\s*-\s*([0-9.]+)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && val < min) return 'low';
    if (!isNaN(max) && val > max) return 'high';
    return 'normal';
  }

  // Định dạng "<5" hoặc "< 40"
  const ltMatch = String(refStr).match(/^<\s*([0-9.]+)$/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (!isNaN(max) && val > max) return 'high';
    return 'normal';
  }

  // Định dạng ">1.0"
  const gtMatch = String(refStr).match(/^>\s*([0-9.]+)$/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (!isNaN(min) && val < min) return 'low';
    return 'normal';
  }

  return 'normal';
};

