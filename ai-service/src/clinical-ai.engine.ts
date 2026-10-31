/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLINICAL AI ENGINE (BỘ NÃO Y KHOA CHUYÊN SÂU — NÂNG CẤP MỤC 3 KLTN)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Bao gồm 3 trụ cột AI Lâm sàng:
 * 1. RAG trên Phác đồ Chẩn đoán & Điều trị chuẩn Bộ Y tế (Hybrid Vector Search + LLM)
 * 2. Computer Vision & Phân tích Chuyên sâu Cận lâm sàng (Multi-biomarker + Imaging AI)
 * 3. Hệ thống Kiểm duyệt Tương tác Thuốc, Dị ứng & Chức năng Gan/Thận Thời gian thực
 */

export interface MohProtocolItem {
  id: string;
  maIcd10: string;
  tenBenh: string;
  chuyenKhoa: string;
  quyetDinhByt: string;
  namBanHanh: number;
  tuKhoaTrieuChung: string[];
  tieuChuanChanDoan: string[];
  canLamSangKhuyenNghi: string[];
  phacDoDieuTri: {
    nguyenTac: string;
    thuocDauTay: Array<{
      nhomThuoc: string;
      hoatChatGoiY: string;
      lieuDungChuan: string;
      luuY: string;
    }>;
    khongDungThuoc: string[];
  };
  dauHieuNguyHiem: string[];
  lichTaiKhamKhuyenNghi: string;
}

// ─── 1. KHO TRI THỨC VECTOR PHÁC ĐỒ BỘ Y TẾ VIỆT NAM (12 PHÁC ĐỒ CỐT LÕI) ───
export const MOH_CLINICAL_PROTOCOLS_KB: MohProtocolItem[] = [
  {
    id: 'BYT_I10',
    maIcd10: 'I10 - Tăng huyết áp vô căn (nguyên phát)',
    tenBenh: 'Tăng huyết áp nguyên phát ở người lớn',
    chuyenKhoa: 'Tim mạch / Nội tổng quát',
    quyetDinhByt: 'Quyết định số 3192/QĐ-BYT & Cập nhật 5481/QĐ-BYT của Bộ Y tế',
    namBanHanh: 2022,
    tuKhoaTrieuChung: [
      'tăng huyết áp', 'cao huyết áp', 'đau đầu', 'chóng mặt', 'hoa mắt', 'nặng đầu',
      'đỏ mặt', 'hồi hộp', 'đánh trống ngực', 'mờ mắt', 'nhức gáy', 'huyết áp cao',
    ],
    tieuChuanChanDoan: [
      'Huyết áp tâm thu (HATT) ≥ 140 mmHg và/hoặc Huyết áp tâm trương (HATTr) ≥ 90 mmHg qua ít nhất 2 lần đo chuẩn.',
      'Phân độ: Độ 1 (140-159/90-99 mmHg), Độ 2 (160-179/100-109 mmHg), Độ 3 (≥180/110 mmHg).',
      'Đánh giá tổn thương cơ quan đích: Tim (dày thất trái), Thận (protein niệu, giảm eGFR), Võng mạc, Mạch máu.',
    ],
    canLamSangKhuyenNghi: [
      'Điện tâm đồ 12 chuyển đạo (ECG)',
      'Siêu âm tim Doppler màu',
      'Sinh hóa máu: Glucose lúc đói, HbA1c, Bilan Lipid máu (Cholesterol, Triglyceride, HDL-C, LDL-C)',
      'Chức năng thận: Ure, Creatinine huyết thanh, tính mức lọc cầu thận ước tính (eGFR)',
      'Tổng phân tích nước tiểu 10 thông số (tầm soát đạm niệu)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Đưa huyết áp về đích < 130/80 mmHg (hoặc < 140/90 mmHg ở người cao tuổi), bảo vệ cơ quan đích và kiểm soát yếu tố nguy cơ tim mạch.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chẹn kênh Calci (CCB) hoặc Ức chế men chuyển (ACEi) / Chẹn thụ thể (ARB)',
          hoatChatGoiY: 'Amlodipine 5mg hoặc Losartan 50mg / Perindopril 5mg',
          lieuDungChuan: 'Uống 1 viên/ngày vào buổi sáng sau ăn',
          luuY: 'Theo dõi huyết áp tại nhà sáng - tối; kiểm tra Kali máu và Creatinine khi dùng ACEi/ARB.',
        },
      ],
      khongDungThuoc: [
        'Giảm muối trong khẩu phần ăn (< 5g muối/ngày, hạn chế đồ kho mặn, dưa muối, thực phẩm đóng hộp).',
        'Tăng cường rau xanh, trái cây tươi, ngũ cốc nguyên hạt (chế độ ăn DASH).',
        'Tập thể dục mức độ trung bình (đi bộ nhanh, đạp xe) 30-45 phút/ngày, tối thiểu 5 ngày/tuần.',
        'Hạn chế rượu bia, ngưng hoàn toàn thuốc lá và kiểm soát cân nặng (BMI 18.5 - 22.9 kg/m²).',
      ],
    },
    dauHieuNguyHiem: [
      'Cơn tăng huyết áp cấp cứu: HATT ≥ 180 mmHg hoặc HATTr ≥ 120 mmHg kèm đau ngực, khó thở, yếu liệt nửa người, nói đớ, nhìn mờ cấp tính.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 14 - 28 ngày để đánh giá đáp ứng thuốc hạ áp.',
  },
  {
    id: 'BYT_E11',
    maIcd10: 'E11 - Đái tháo đường tuýp 2',
    tenBenh: 'Đái tháo đường tuýp 2',
    chuyenKhoa: 'Nội tiết / Nội tổng quát',
    quyetDinhByt: 'Quyết định số 5481/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị ĐTĐ tuýp 2)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'tiểu đường', 'đái tháo đường', 'khát nước nhiều', 'tiểu nhiều', 'tiểu đêm',
      'sụt cân', 'mệt mỏi', 'tê bì chân tay', 'mờ mắt', 'đường huyết cao', 'lâu lành vết thương',
    ],
    tieuChuanChanDoan: [
      'Glucose huyết tương lúc đói (nhịn ăn ≥ 8 giờ) ≥ 7.0 mmol/L (≥ 126 mg/dL), HOẶC',
      'HbA1c ≥ 6.5% được thực hiện tại phòng xét nghiệm chuẩn hóa, HOẶC',
      'Glucose huyết tương bất kỳ ≥ 11.1 mmol/L (≥ 200 mg/dL) kèm triệu chứng kinh điển của tăng đường huyết.',
    ],
    canLamSangKhuyenNghi: [
      'Định lượng Glucose máu lúc đói & HbA1c',
      'Bilan mỡ máu (Cholesterol toàn phần, Triglyceride, HDL-C, LDL-C)',
      'Chức năng gan - thận: AST (GOT), ALT (GPT), Ure, Creatinine, eGFR',
      'Tổng phân tích nước tiểu & Tỷ số Albumin/Creatinine niệu (ACR)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Kiểm soát HbA1c mục tiêu < 7.0%, đường huyết đói 4.4 - 7.2 mmol/L, đường huyết sau ăn < 10.0 mmol/L và phòng ngừa biến chứng mạch máu.',
      thuocDauTay: [
        {
          nhomThuoc: 'Biguanide (Thuốc nền tảng đầu tay theo QĐ 5481/QĐ-BYT)',
          hoatChatGoiY: 'Metformin 500mg / 850mg',
          lieuDungChuan: 'Uống 1 viên x 1-2 lần/ngày ngay sau bữa ăn chính để giảm kích ứng tiêu hóa',
          luuY: 'Chống chỉ định nếu mức lọc cầu thận eGFR < 30 mL/phút/1.73m²; thận trọng giảm liều khi eGFR 30-45.',
        },
      ],
      khongDungThuoc: [
        'Chia nhỏ bữa ăn, giảm tinh bột hấp thu nhanh (cơm trắng, bánh ngọt, nước có gas), ưu tiên gạo lứt, rau xanh.',
        'Tập vận động thể lực ít nhất 150 phút/tuần, không nghỉ quá 2 ngày liên tiếp.',
        'Kiểm tra và chăm sóc bàn chân hàng ngày để phòng loét bàn chân đái tháo đường.',
      ],
    },
    dauHieuNguyHiem: [
      'Hạ đường huyết (< 3.9 mmol/L): vã mồ hôi lạnh, run tay chân, bủn rủn, đói cồn cào, lú lẫn.',
      'Tăng đường huyết cấp tính (Toan ceton / Tăng áp lực thẩm thấu): đường huyết > 16.7 mmol/L kèm thở nhanh sâu, buồn nôn, lơ mơ.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 14 - 30 ngày; xét nghiệm lại HbA1c mỗi 3 tháng.',
  },
  {
    id: 'BYT_K29',
    maIcd10: 'K29.5 - Viêm dạ dày mạn / Trào ngược dạ dày thực quản (GERD)',
    tenBenh: 'Viêm loét dạ dày - tá tràng & Trào ngược dạ dày thực quản',
    chuyenKhoa: 'Tiêu hóa',
    quyetDinhByt: 'Quyết định số 4538/QĐ-BYT của Bộ Y tế (Phác đồ Tiêu hóa - Gan mật)',
    namBanHanh: 2021,
    tuKhoaTrieuChung: [
      'đau thượng vị', 'đau dạ dày', 'đau bao tử', 'ợ hơi', 'ợ chua', 'nóng rát sau xương ức',
      'trào ngược', 'đầy bụng', 'khó tiêu', 'buồn nôn', 'đau bụng âm ỉ', 'đau khi đói',
    ],
    tieuChuanChanDoan: [
      'Đau hoặc nóng rát vùng thượng vị liên quan bữa ăn (đau khi đói hoặc sau ăn), kèm ợ hơi, ợ chua, đầy chướng bụng.',
      'Xác định tình trạng nhiễm vi khuẩn Helicobacter pylori (HP) qua Test thở C13/C14 hoặc Nội soi tiêu hóa trên (CLO-test).',
    ],
    canLamSangKhuyenNghi: [
      'Nội soi thực quản - dạ dày - tá tràng kèm CLO-test tìm H. pylori (hoặc Test thở tìm HP)',
      'Siêu âm ổ bụng tổng quát (loại trừ sỏi túi mật, viêm tụy)',
      'Công thức máu (CBC) nếu nghi ngờ thiếu máu do xuất huyết tiêu hóa rỉ rả',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Ức chế bài tiết axit dạ dày (PPI), bảo vệ niêm mạc dạ dày và tiệt trừ H. pylori (nếu dương tính). Tuyệt đối tránh thuốc giảm đau NSAIDs/Corticoid.',
      thuocDauTay: [
        {
          nhomThuoc: 'Ức chế bơm Proton (PPI)',
          hoatChatGoiY: 'Omeprazole 20mg hoặc Esomeprazole 20mg/40mg',
          lieuDungChuan: 'Uống 1 viên x 1-2 lần/ngày TRƯỚC bữa ăn sáng (và tối) 30 phút',
          luuY: 'Bắt buộc uống lúc bụng đói trước ăn 30 phút để đạt hiệu quả ức chế bơm proton tối đa.',
        },
        {
          nhomThuoc: 'Trung hòa axit & Bọc niêm mạc dạ dày (Antacid)',
          hoatChatGoiY: 'Aluminum phosphate (Phosphalugel) hoặc Alginate (Gaviscon)',
          lieuDungChuan: 'Uống 1 gói x 2-3 lần/ngày sau ăn 1-2 giờ hoặc khi có cơn đau/ợ chua',
          luuY: 'Uống cách các thuốc khác tối thiểu 2 giờ để không làm giảm hấp thu thuốc phối hợp.',
        },
      ],
      khongDungThuoc: [
        'Ăn đúng giờ, nhai kỹ, không ăn quá no hoặc nằm ngay trong vòng 2 giờ sau ăn.',
        'Kiêng tuyệt đối đồ chua cay, rượu bia, cà phê, nước ngọt có gas và thuốc lá.',
        'Kê cao đầu giường 15-20cm khi ngủ nếu có triệu chứng trào ngược về đêm.',
      ],
    },
    dauHieuNguyHiem: [
      'Dấu hiệu báo động đỏ (Red Flags): Nôn ra máu tươi/máu đen, đi ngoài phân đen như bã cà phê, nuốt nghẹn tiến triển, sụt cân không rõ nguyên nhân.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 14 - 28 ngày điều trị nội khoa.',
  },
  {
    id: 'BYT_J20',
    maIcd10: 'J20 - Viêm phế quản cấp',
    tenBenh: 'Viêm phế quản cấp tính',
    chuyenKhoa: 'Hô hấp / Tai Mũi Họng',
    quyetDinhByt: 'Quyết định số 4888/QĐ-BYT & 708/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh hô hấp)',
    namBanHanh: 2021,
    tuKhoaTrieuChung: [
      'ho', 'ho có đờm', 'ho khan', 'sốt', 'khò khè', 'tức ngực khi ho', 'đau rát ngực',
      'viêm phế quản', 'khạc đờm', 'đờm vàng', 'đờm xanh', 'khó thở nhẹ',
    ],
    tieuChuanChanDoan: [
      'Ho cấp tính kéo dài dưới 3 tuần (có đờm trong, trắng đục hoặc vàng xanh), có thể kèm sốt nhẹ, ran phế quản (ran rít, ran ngáy, ran ẩm) khi nghe phổi.',
      'Chụp X-Quang ngực thẳng không có hình ảnh đông đặc nhu mô phổi (phân biệt với Viêm phổi J18).',
    ],
    canLamSangKhuyenNghi: [
      'Chụp X-Quang ngực thẳng (loại trừ viêm phổi thùy / tràn dịch màng phổi)',
      'Tổng phân tích tế bào máu ngoại vi (CBC — đánh giá số lượng Bạch cầu WBC và tỷ lệ %NEU)',
      'Định lượng CRP định lượng (đánh giá mức độ viêm nhiễm khuẩn)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị triệu chứng (giảm ho, long đờm, hạ sốt, bù nước) là chủ đạo. Chỉ dùng kháng sinh khi có bằng chứng bội nhiễm vi khuẩn (sốt kéo dài, đờm mủ xanh đặc, WBC và CRP tăng cao hoặc bệnh nhân COPD/cao tuổi).',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc tiêu nhầy / Long đờm',
          hoatChatGoiY: 'Acetylcysteine 200mg hoặc Bromhexine 8mg',
          lieuDungChuan: 'Uống 1 gói/viên x 3 lần/ngày sau ăn kèm uống nhiều nước ấm',
          luuY: 'Thận trọng ở bệnh nhân có tiền sử loét dạ dày đang tiến triển.',
        },
        {
          nhomThuoc: 'Hạ sốt - Giảm đau',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên khi sốt ≥ 38.5°C, cách nhau mỗi 4-6 giờ (tối đa 3-4 viên/24h)',
          luuY: 'Kiểm tra chức năng gan nếu dùng kéo dài; không uống rượu bia.',
        },
        {
          nhomThuoc: 'Kháng sinh (Chỉ khi có bội nhiễm vi khuẩn rõ)',
          hoatChatGoiY: 'Amoxicillin + Clavulanic acid (Augmentin) 625mg/1000mg hoặc Cefuroxime 500mg (hoặc Azithromycin 500mg nếu dị ứng Beta-lactam)',
          lieuDungChuan: 'Uống 1 viên x 2 lần/ngày sau ăn trong 5 - 7 ngày',
          luuY: 'BẮT BUỘC khai thác kỹ tiền sử dị ứng kháng sinh nhóm Penicillin / Cephalosporin trước khi kê.',
        },
      ],
      khongDungThuoc: [
        'Uống nhiều nước ấm (2 - 2.5 lít/ngày) để làm loãng đờm tự nhiên.',
        'Súc họng và rửa mũi bằng nước muối sinh lý NaCl 0.9% 3 lần/ngày.',
        'Tránh khói thuốc lá, bụi mịn, không khí lạnh khô từ điều hòa.',
      ],
    },
    dauHieuNguyHiem: [
      'Khó thở tăng dần, nhịp thở > 24 lần/phút, SpO2 < 94%, sốt cao > 39°C không đáp ứng thuốc hạ sốt, ho ra máu.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 - 7 ngày hoặc khám lại ngay nếu sốt cao/khó thở.',
  },
  {
    id: 'BYT_J00',
    maIcd10: 'J00 - Viêm mũi họng cấp (Cảm lạnh thông thường)',
    tenBenh: 'Viêm mũi họng cấp tính',
    chuyenKhoa: 'Tai Mũi Họng / Hô hấp',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'đau họng', 'rát họng', 'nuốt đau', 'sổ mũi', 'nghẹt mũi', 'hắt hơi',
      'chảy nước mũi', 'cảm cúm', 'cảm lạnh', 'khàn tiếng', 'sốt nhẹ', 'viêm họng',
      'ho', 'đau đầu', 'nhức đầu', 'mệt mỏi',
    ],
    tieuChuanChanDoan: [
      'Khởi phát cấp tính với đau rát họng, hắt hơi, chảy mũi trong hoặc nghẹt mũi, niêm mạc họng đỏ xung huyết.',
      'Đa số (80-90%) do virus hô hấp gây ra; đánh giá thang điểm Centor để phân biệt viêm họng do liên cầu khuẩn nhóm A.',
    ],
    canLamSangKhuyenNghi: [
      'Khám nội soi Tai Mũi Họng (nếu cần đánh giá amidan, vòm mũi họng)',
      'Công thức máu (CBC) nếu sốt cao > 3 ngày không giảm',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị nâng đỡ và giảm triệu chứng tại chỗ. Không lạm dụng kháng sinh với viêm mũi họng cấp do virus.',
      thuocDauTay: [
        {
          nhomThuoc: 'Giảm đau - Hạ sốt',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên x 2-3 lần/ngày sau ăn khi đau họng nhiều hoặc sốt ≥ 38.5°C',
          luuY: 'Cách mỗi liều ít nhất 4-6 giờ.',
        },
        {
          nhomThuoc: 'Kháng Histamin H1 thế hệ 2 (Giảm hắt hơi, sổ mũi)',
          hoatChatGoiY: 'Loratadine 10mg hoặc Cetirizine 10mg / Fexofenadine 60mg',
          lieuDungChuan: 'Uống 1 viên/ngày vào buổi tối',
          luuY: 'Ít gây buồn ngủ hơn thế hệ 1 nhưng vẫn cần lưu ý khi lái xe.',
        },
      ],
      khongDungThuoc: [
        'Súc họng nước muối ấm thường xuyên, giữ ấm vùng cổ ngực.',
        'Bổ sung thực phẩm giàu Vitamin C, uống trà gừng mật ong ấm.',
      ],
    },
    dauHieuNguyHiem: [
      'Khó nuốt, chảy nước bọt, cứng hàm (nghi áp xe quanh amidan), khó thở thanh quản.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 ngày nếu triệu chứng không thuyên giảm.',
  },
  {
    id: 'BYT_M54',
    maIcd10: 'M54.5 - Đau lưng vùng thấp / Thoái hóa cột sống thắt lưng',
    tenBenh: 'Đau thắt lưng cấp & Thoái hóa cột sống thắt lưng',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'đau lưng', 'đau thắt lưng', 'đau cột sống', 'mỏi lưng', 'đau khớp', 'đau mỏi vai gáy',
      'thoái hóa cột sống', 'thoát vị đĩa đệm', 'đau lan xuống chân', 'cứng khớp',
    ],
    tieuChuanChanDoan: [
      'Đau cơ học vùng cột sống thắt lưng (tăng khi vận động/mang vác, giảm khi nghỉ ngơi), co cứng cơ cạnh sống.',
      'Kiểm tra dấu hiệu Lasègue và phản xạ gân xương để đánh giá chèn ép rễ thần kinh tọa.',
    ],
    canLamSangKhuyenNghi: [
      'Chụp X-Quang cột sống thắt lưng 2 tư thế (Thẳng - Nghiêng)',
      'Sinh hóa máu: Creatinine, AST, ALT (đánh giá gan thận trước khi kê thuốc kháng viêm NSAID)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau theo bậc thang WHO, giãn cơ vân, kết hợp vật lý trị liệu phục hồi chức năng và bảo vệ niêm mạc dạ dày.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng viêm không Steroid (NSAID chọn lọc COX-2 hoặc Paracetamol)',
          hoatChatGoiY: 'Meloxicam 7.5mg / Celecoxib 200mg hoặc Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên x 1-2 lần/ngày NGAY SAU BỮA ĂN NO',
          luuY: 'BẮT BUỘC kiểm tra tiền sử loét dạ dày, suy thận và bệnh tim mạch; nên phối hợp thuốc bảo vệ dạ dày PPI (Omeprazole 20mg).',
        },
        {
          nhomThuoc: 'Thuốc giãn cơ trung ương',
          hoatChatGoiY: 'Eperisone 50mg (Myonal) hoặc Tolperisone 150mg (Mydocalm)',
          lieuDungChuan: 'Uống 1 viên x 2-3 lần/ngày sau ăn',
          luuY: 'Có thể gây mỏi cơ nhẹ hoặc buồn ngủ nhẹ.',
        },
      ],
      khongDungThuoc: [
        'Tránh cúi bê vác vật nặng sai tư thế, không ngồi một tư thế quá 45-60 phút.',
        'Chườm ấm vùng cơ cạnh sống thắt lưng, tập các bài tập kéo giãn cột sống nhẹ nhàng.',
      ],
    },
    dauHieuNguyHiem: [
      'Hội chứng chùm đuôi ngựa: Bí tiểu/tiểu không tự chủ, tê mất cảm giác vùng yên ngựa, yếu liệt hai chi dưới tiến triển.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 7 - 14 ngày.',
  },
  {
    id: 'BYT_A09',
    maIcd10: 'A09 - Viêm dạ dày ruột và đại tràng do nguyên nhân nhiễm khuẩn',
    tenBenh: 'Tiêu chảy cấp / Rối loạn tiêu hóa cấp',
    chuyenKhoa: 'Tiêu hóa / Nội tổng quát',
    quyetDinhByt: 'Quyết định số 4121/QĐ-BYT của Bộ Y tế (Hướng dẫn xử trí tiêu chảy cấp)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'tiêu chảy', 'đi ngoài phân lỏng', 'đau bụng quanh rốn', 'nôn ói', 'buồn nôn',
      'ngộ độc thực phẩm', 'rối loạn tiêu hóa', 'đi ngoài nhiều lần', 'mất nước',
    ],
    tieuChuanChanDoan: [
      'Đi ngoài phân lỏng hoặc tóe nước ≥ 3 lần trong 24 giờ, kèm đau quặn bụng, buồn nôn hoặc sốt.',
      'Đánh giá mức độ mất nước (Không mất nước - Có mất nước - Mất nước nặng) dựa trên tri giác, mắt trũng, khát nước và nếp véo da.',
    ],
    canLamSangKhuyenNghi: [
      'Tổng phân tích tế bào máu ngoại vi (CBC — đánh giá WBC và Hematocrit cô đặc máu)',
      'Điện giải đồ máu (Na+, K+, Cl-) nếu nôn và tiêu chảy nhiều lần',
      'Siêu âm ổ bụng tổng quát (phân biệt viêm ruột thừa cấp)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Bù nước và điện giải đường uống (Oresol áp lực thẩm thấu thấp) là quan trọng nhất. Bảo vệ niêm mạc ruột và bổ sung vi khuẩn có lợi.',
      thuocDauTay: [
        {
          nhomThuoc: 'Bù nước và điện giải',
          hoatChatGoiY: 'Oresol 245 mOsm/L',
          lieuDungChuan: 'Pha chính xác 1 gói với 200ml (hoặc 1000ml tùy quy cách gói) nước đun sôi để nguội, uống từng ngụm sau mỗi lần đi ngoài',
          luuY: 'Pha đúng tỷ lệ nước ghi trên bao bì, không pha với sữa hay nước khoáng.',
        },
        {
          nhomThuoc: 'Bảo vệ niêm mạc tiêu hóa & Hấp phụ độc tố',
          hoatChatGoiY: 'Diosmectite 3g (Smecta) + Men vi sinh (Saccharomyces boulardii / Bacillus clausii)',
          lieuDungChuan: 'Uống 1 gói x 2-3 lần/ngày, pha với 50ml nước',
          luuY: 'Không tự ý dùng thuốc cầm tiêu chảy giảm nhu động ruột (Loperamide) khi nghi ngờ tiêu chảy xâm nhập/nhiễm khuẩn.',
        },
      ],
      khongDungThuoc: [
        'Ăn thức ăn mềm dễ tiêu (cháo thịt nạc, súp, chuối chín), tránh sữa tươi có lactose, đồ dầu mỡ và hải sản sống.',
      ],
    },
    dauHieuNguyHiem: [
      'Đi ngoài phân có nhầy máu mũi, sốt cao > 38.5°C, nôn tất cả mọi thứ không uống được nước, tiểu ít, lơ mơ.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 3 - 5 ngày hoặc khám cấp cứu ngay nếu có dấu hiệu mất nước.',
  },
  {
    id: 'BYT_A97',
    maIcd10: 'A97 - Sốt xuất huyết Dengue',
    tenBenh: 'Sốt xuất huyết Dengue',
    chuyenKhoa: 'Nội tổng quát / Truyền nhiễm',
    quyetDinhByt: 'Quyết định số 2760/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán, điều trị Sốt xuất huyết Dengue)',
    namBanHanh: 2023,
    tuKhoaTrieuChung: [
      'sốt cao đột ngột', 'sốt xuất huyết', 'đau hốc mắt', 'đau mỏi người', 'đau cơ khớp',
      'chấm xuất huyết', 'chảy máu chân răng', 'chảy máu cam', 'sốt liên tục',
    ],
    tieuChuanChanDoan: [
      'Sốt cao đột ngột, liên tục 2-7 ngày kèm đau đầu, đau nhức hai hốc mắt, đau mỏi cơ khớp, da xung huyết hoặc chấm xuất huyết dưới da.',
      'Xét nghiệm công thức máu có Bạch cầu (WBC) giảm, Tiểu cầu (PLT) giảm (< 100 G/L) và Hematocrit (HCT) tăng cô đặc máu.',
    ],
    canLamSangKhuyenNghi: [
      'Tổng phân tích tế bào máu ngoại vi (CBC — theo dõi sát Tiểu cầu PLT và Hematocrit HCT mỗi ngày)',
      'Xét nghiệm Dengue NS1Ag / IgM-IgG',
      'Men gan AST (GOT), ALT (GPT) & Siêu âm ổ bụng (tầm soát dịch màng bụng/màng phổi)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Hạ sốt an toàn bằng đơn trị liệu Paracetamol và bù dịch đường uống sớm. TUYỆT ĐỐI CHỐNG CHỈ ĐỊNH Aspirin, Ibuprofen và mọi thuốc kháng viêm NSAIDs/Corticoid vì gây xuất huyết tiêu hóa nặng!',
      thuocDauTay: [
        {
          nhomThuoc: 'Hạ sốt đơn thuần',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Liều 10 - 15 mg/kg/lần khi sốt ≥ 38.5°C, cách nhau 4-6 giờ (không quá 60mg/kg/24h)',
          luuY: 'TUYỆT ĐỐI KHÔNG dùng Ibuprofen, Aspirin, Meloxicam, Diclofenac.',
        },
        {
          nhomThuoc: 'Bù nước & Điện giải',
          hoatChatGoiY: 'Oresol',
          lieuDungChuan: 'Uống theo nhu cầu kèm nước trái cây, nước dừa',
          luuY: 'Theo dõi sát lượng nước tiểu trong 24 giờ.',
        },
      ],
      khongDungThuoc: [
        'Lau mát bằng nước ấm vùng trán, nách, bẹn khi sốt cao.',
        'Tránh ăn thức ăn/đồ uống có màu đỏ, nâu, đen (để không nhầm lẫn với nôn ra máu / đi ngoài phân đen).',
      ],
    },
    dauHieuNguyHiem: [
      'Giai đoạn nguy hiểm (ngày thứ 3 - thứ 7 của bệnh): Đau bụng vùng gan dữ dội, nôn liên tục, chảy máu niêm mạc, vật vã/li bì, tay chân lạnh ẩm, tiểu ít.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám và xét nghiệm lại Công thức máu (Tiểu cầu, HCT) HÀNG NGÀY từ ngày thứ 3 của sốt.',
  },
];

// ─── 2. DANH MỤC TƯƠNG TÁC THUỐC & CHỐNG CHỈ ĐỊNH DƯỢC LÂM SÀNG ─────────────
interface DrugSafetyProfile {
  key: string;
  patterns: RegExp[];
  drugClass: string;
  activeIngredient: string;
  allergyGroup?: string;
  hepatotoxicRisk: 'low' | 'moderate' | 'high';
  nephrotoxicRisk: 'low' | 'moderate' | 'high';
  giBleedingRisk: 'low' | 'moderate' | 'high';
  contraindicatedIcdPrefixes?: string[];
  foodInstruction: string;
}

const DRUG_SAFETY_CATALOG: DrugSafetyProfile[] = [
  {
    key: 'PARACETAMOL',
    patterns: [/paracetamol/i, /acetaminophen/i, /panadol/i, /efferalgan/i, /hapacol/i],
    drugClass: 'Giảm đau - Hạ sốt (Non-opioid)',
    activeIngredient: 'Paracetamol (Acetaminophen)',
    allergyGroup: 'paracetamol',
    hepatotoxicRisk: 'high',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn, cách nhau tối thiểu 4-6 giờ (không quá 4g/ngày ở người lớn).',
  },
  {
    key: 'NSAID',
    patterns: [/ibuprofen/i, /meloxicam/i, /mobic/i, /diclofenac/i, /voltaren/i, /celecoxib/i, /celebrex/i, /piroxicam/i, /naproxen/i, /etoricoxib/i],
    drugClass: 'Kháng viêm không Steroid (NSAID)',
    activeIngredient: 'NSAID (Meloxicam / Ibuprofen / Celecoxib / Diclofenac)',
    allergyGroup: 'nsaid',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'high',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K27', 'K29', 'A97', 'N18'],
    foodInstruction: 'BẮT BUỘC uống ngay sau bữa ăn no để giảm kích ứng và loét niêm mạc dạ dày.',
  },
  {
    key: 'ASPIRIN',
    patterns: [/aspirin/i, /acetylsalicylic/i],
    drugClass: 'Chống kết tập tiểu cầu / NSAID',
    activeIngredient: 'Acid Acetylsalicylic (Aspirin)',
    allergyGroup: 'nsaid',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K29', 'A97'],
    foodInstruction: 'Uống sau ăn no.',
  },
  {
    key: 'CORTICOID',
    patterns: [/prednisolon/i, /methylprednisolon/i, /medrol/i, /dexamethason/i, /betamethason/i],
    drugClass: 'Corticosteroid kháng viêm',
    activeIngredient: 'Corticosteroid (Prednisolone / Methylprednisolone)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'high',
    contraindicatedIcdPrefixes: ['K25', 'K26', 'K29', 'E11', 'I10'],
    foodInstruction: 'Uống 1 lần vào buổi sáng (khoảng 8h sáng) ngay sau ăn no.',
  },
  {
    key: 'PENICILLIN_BETA_LACTAM',
    patterns: [/amoxicillin/i, /augmentin/i, /klamentin/i, /ampicillin/i, /penicillin/i, /clavulan/i],
    drugClass: 'Kháng sinh Beta-lactam (Nhóm Penicillin)',
    activeIngredient: 'Amoxicillin (± Acid Clavulanic)',
    allergyGroup: 'beta_lactam',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống ngay đầu bữa ăn hoặc sau ăn để tối ưu hấp thu và giảm rối loạn tiêu hóa.',
  },
  {
    key: 'CEPHALOSPORIN',
    patterns: [/cefuroxim/i, /zinnat/i, /cephalexin/i, /cefixim/i, /cefdinir/i, /cefpodoxim/i, /ceftriaxon/i],
    drugClass: 'Kháng sinh Beta-lactam (Nhóm Cephalosporin)',
    activeIngredient: 'Cephalosporin (Cefuroxime / Cefixime / Cephalexin)',
    allergyGroup: 'beta_lactam',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn 15-30 phút, uống đủ liều và đủ ngày theo phác đồ kháng sinh.',
  },
  {
    key: 'MACROLIDE',
    patterns: [/azithromycin/i, /zithromax/i, /clarithromycin/i, /klacid/i, /erythromycin/i],
    drugClass: 'Kháng sinh nhóm Macrolide',
    activeIngredient: 'Macrolide (Azithromycin / Clarithromycin)',
    allergyGroup: 'macrolide',
    hepatotoxicRisk: 'moderate',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 lần/ngày, cách xa thuốc kháng axit dạ dày (Antacid) ít nhất 2 giờ.',
  },
  {
    key: 'PPI',
    patterns: [/omeprazol/i, /esomeprazol/i, /nexium/i, /pantoprazol/i, /rabeprazol/i, /lansoprazol/i],
    drugClass: 'Ức chế bơm Proton (PPI - Bảo vệ dạ dày)',
    activeIngredient: 'PPI (Omeprazole / Esomeprazole / Pantoprazole)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'BẮT BUỘC uống TRƯỚC bữa ăn 30 phút (lúc bụng đói).',
  },
  {
    key: 'ANTACID',
    patterns: [/phosphalugel/i, /yumangel/i, /gaviscon/i, /maalox/i, /aluminum/i, /antacid/i],
    drugClass: 'Trung hòa axit & Bọc niêm mạc dạ dày (Antacid)',
    activeIngredient: 'Antacid (Aluminum phosphate / Alginate)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống sau ăn 1-2 giờ hoặc khi đau; uống CÁCH XA các thuốc khác tối thiểu 2 giờ.',
  },
  {
    key: 'METFORMIN',
    patterns: [/metformin/i, /glucophage/i],
    drugClass: 'Hạ đường huyết nhóm Biguanide',
    activeIngredient: 'Metformin',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'high',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống ngay trong hoặc cuối bữa ăn để giảm tác dụng phụ tiêu hóa.',
  },
  {
    key: 'STATIN',
    patterns: [/atorvastatin/i, /lipitor/i, /rosuvastatin/i, /crestor/i, /simvastatin/i],
    drugClass: 'Hạ mỡ máu nhóm Statin',
    activeIngredient: 'Statin (Atorvastatin / Rosuvastatin)',
    hepatotoxicRisk: 'high',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 viên vào buổi tối.',
  },
  {
    key: 'ANTIHYPERTENSIVE_ACE_ARB',
    patterns: [/losartan/i, /perindopril/i, /coversyl/i, /enalapril/i, /valsartan/i, /telmisartan/i, /captopril/i],
    drugClass: 'Hạ huyết áp nhóm Ức chế men chuyển / Chẹn thụ thể (ACEi/ARB)',
    activeIngredient: 'ACEi/ARB (Losartan / Perindopril / Enalapril)',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'moderate',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống cố định vào buổi sáng hàng ngày.',
  },
  {
    key: 'CCB',
    patterns: [/amlodipin/i, /norvasc/i, /nifedipin/i, /felodipin/i],
    drugClass: 'Hạ huyết áp nhóm Chẹn kênh Calci (CCB)',
    activeIngredient: 'Amlodipine',
    hepatotoxicRisk: 'low',
    nephrotoxicRisk: 'low',
    giBleedingRisk: 'low',
    foodInstruction: 'Uống 1 lần/ngày vào buổi sáng sau ăn.',
  },
];

function identifyDrugProfile(tenThuoc: string): DrugSafetyProfile | null {
  const normalized = (tenThuoc || '').trim();
  for (const profile of DRUG_SAFETY_CATALOG) {
    if (profile.patterns.some((re) => re.test(normalized))) {
      return profile;
    }
  }
  return null;
}

// ─── HELPER: TÍNH ĐIỂM TƯƠNG ĐỒNG VECTOR TRIỆU CHỨNG ────────────────────────
export function matchClinicalProtocols(input: {
  trieuChung?: string;
  chanDoanSoBo?: string;
  chanDoanXacDinh?: string;
  sinhHieu?: any;
  diUng?: string;
}) {
  const combinedText = `${input.trieuChung || ''} ${input.chanDoanSoBo || ''} ${input.chanDoanXacDinh || ''}`
    .toLowerCase()
    .trim();

  const hatt = Number(input.sinhHieu?.huyetApTamThu || input.sinhHieu?.huyet_ap_tam_thu || 0);
  const hattr = Number(input.sinhHieu?.huyetApTamTruong || input.sinhHieu?.huyet_ap_tam_truong || 0);
  const nhietDo = Number(input.sinhHieu?.nhietDoC || input.sinhHieu?.nhiet_do_c || input.sinhHieu?.nhietDo || 0);
  const spo2 = Number(input.sinhHieu?.spo2 || 0);

  const scored = MOH_CLINICAL_PROTOCOLS_KB.map((proto) => {
    let score = 0;
    const matchedKeywords: string[] = [];

    // 1. Keyword TF-IDF matching
    for (const kw of proto.tuKhoaTrieuChung) {
      if (combinedText.includes(kw.toLowerCase())) {
        score += 0.22;
        matchedKeywords.push(kw);
      }
    }

    // 2. Direct ICD-10 code or disease name match
    const icdCodeShort = proto.maIcd10.split(' ')[0].toLowerCase();
    if (combinedText.includes(icdCodeShort) || combinedText.includes(proto.tenBenh.toLowerCase())) {
      score += 0.45;
    }

    // 3. Vital signs clinical boosting
    if (proto.id === 'BYT_I10' && (hatt >= 140 || hattr >= 90)) {
      score += 0.35;
      matchedKeywords.push(`Huyết áp cao (${hatt}/${hattr} mmHg)`);
    }
    if ((proto.id === 'BYT_J20' || proto.id === 'BYT_A97' || proto.id === 'BYT_J00') && nhietDo >= 38.0) {
      score += 0.2;
      matchedKeywords.push(`Sốt (${nhietDo}°C)`);
    }
    if (proto.id === 'BYT_J20' && spo2 > 0 && spo2 < 96) {
      score += 0.25;
      matchedKeywords.push(`Giảm SpO2 (${spo2}%)`);
    }

    const normalizedScore = Math.min(0.98, Number((score > 0 ? 0.55 + score * 0.45 : 0.35).toFixed(2)));
    return {
      protocol: proto,
      similarityScore: normalizedScore,
      matchedSignals: matchedKeywords,
      rawScore: score,
    };
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);
  const topMatches = scored.filter((s) => s.rawScore > 0).slice(0, 3);
  if (topMatches.length === 0) {
    // Fallback to J00 or top protocol if symptoms are generic
    topMatches.push({
      protocol: MOH_CLINICAL_PROTOCOLS_KB[4], // J00
      similarityScore: 0.72,
      matchedSignals: ['Triệu chứng nội khoa tổng quát'],
      rawScore: 0.2,
    });
  }

  return topMatches;
}

// ─── HELPER: PHÂN TÍCH ĐA CHỈ SỐ XÉT NGHIỆM & HÌNH ẢNH CẬN LÂM SÀNG ─────────
export function analyzeClinicalLabsAndImaging(input: {
  dsXetNghiem: Array<{
    id?: number;
    maDichVu?: string;
    tenDichVu: string;
    loai?: string;
    trangThai?: string;
    giaTri?: string;
    donVi?: string;
    ketQuaChiTiet?: any;
    nhanXet?: string;
    tepDinhKem?: any;
  }>;
  benhNhan?: { hoTen?: string; gioiTinh?: string; ngaySinh?: string; diUng?: string };
  sinhHieu?: any;
}) {
  const abnormalBiomarkers: Array<{
    chiSo: string;
    giaTri: string;
    khoangThamChieu: string;
    mucDo: 'tang_cao' | 'giam_thap' | 'nguy_kich' | 'binh_thuong';
    yNghiaLamSang: string;
  }> = [];

  const imagingFindings: Array<{
    tenDichVu: string;
    vungKhaoSat: string;
    phatHien: string;
    mucDo: 'binh_thuong' | 'bat_thuong';
    khuyenNghi: string;
  }> = [];

  let creatinineVal: number | null = null;
  let astVal: number | null = null;
  let altVal: number | null = null;
  let glucoseVal: number | null = null;
  let wbcVal: number | null = null;
  let pltVal: number | null = null;

  const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string; label: string; highMeaning: string; lowMeaning: string }> = {
    wbc: { min: 4.0, max: 10.0, unit: 'G/L', label: 'Bạch cầu (WBC)', highMeaning: 'Gợi ý phản ứng viêm hoặc nhiễm khuẩn cấp tính', lowMeaning: 'Giảm bạch cầu (thường gặp trong nhiễm siêu vi / Sốt xuất huyết)' },
    neu: { min: 40, max: 74, unit: '%', label: 'Bạch cầu đa nhân trung tính (%NEU)', highMeaning: 'Tăng ưu thế đa nhân trung tính — hướng tới nhiễm khuẩn', lowMeaning: 'Giảm tỷ lệ trung tính (ưu thế Lympho trong nhiễm virus)' },
    rbc: { min: 4.0, max: 5.5, unit: 'T/L', label: 'Hồng cầu (RBC)', highMeaning: 'Cô đặc máu hoặc đa hồng cầu', lowMeaning: 'Thiếu máu' },
    hgb: { min: 120, max: 165, unit: 'g/L', label: 'Huyết sắc tố (HGB)', highMeaning: 'Cô đặc máu', lowMeaning: 'Thiếu máu (cần đánh giá MCV, MCH)' },
    plt: { min: 150, max: 400, unit: 'G/L', label: 'Tiểu cầu (PLT)', highMeaning: 'Tăng tiểu cầu phản ứng', lowMeaning: 'Giảm tiểu cầu — cảnh báo nguy cơ xuất huyết (lưu ý Sốt xuất huyết Dengue)' },
    glucose: { min: 3.9, max: 6.4, unit: 'mmol/L', label: 'Đường huyết (Glucose)', highMeaning: 'Tăng đường huyết — cần tầm soát Đái tháo đường (HbA1c)', lowMeaning: 'Hạ đường huyết (< 3.9 mmol/L)' },
    hba1c: { min: 4.0, max: 6.4, unit: '%', label: 'HbA1c', highMeaning: 'Kiểm soát đường huyết 3 tháng qua chưa đạt đích (≥ 6.5% chẩn đoán ĐTĐ)', lowMeaning: 'Bình thường' },
    ast: { min: 5, max: 40, unit: 'U/L', label: 'Men gan AST (GOT)', highMeaning: 'Tổn thương tế bào nhu mô gan (thận trọng thuốc chuyển hóa qua gan)', lowMeaning: 'Bình thường' },
    alt: { min: 5, max: 40, unit: 'U/L', label: 'Men gan ALT (GPT)', highMeaning: 'Tăng men gan đặc hiệu — cần hạn chế Paracetamol liều cao / Statin', lowMeaning: 'Bình thường' },
    ure: { min: 2.5, max: 7.5, unit: 'mmol/L', label: 'Ure máu', highMeaning: 'Tăng ure máu (mất nước hoặc suy giảm chức năng lọc cầu thận)', lowMeaning: 'Giảm nhẹ' },
    creatinin: { min: 53, max: 110, unit: 'µmol/L', label: 'Creatinine huyết thanh', highMeaning: 'Suy giảm mức lọc cầu thận — thận trọng khi kê NSAIDs, Metformin và kháng sinh thải qua thận', lowMeaning: 'Giảm khối cơ' },
    cholesterol: { min: 0, max: 5.2, unit: 'mmol/L', label: 'Cholesterol toàn phần', highMeaning: 'Rối loạn lipid máu (Tăng Cholesterol máu)', lowMeaning: 'Bình thường' },
    triglycerid: { min: 0, max: 1.7, unit: 'mmol/L', label: 'Triglyceride', highMeaning: 'Tăng Triglyceride máu', lowMeaning: 'Bình thường' },
    crp: { min: 0, max: 5.0, unit: 'mg/L', label: 'CRP định lượng', highMeaning: 'Tăng protein phản ứng C — chỉ dấu viêm / nhiễm khuẩn đang hoạt động', lowMeaning: 'Bình thường' },
  };

  for (const item of input.dsXetNghiem || []) {
    const tenDv = (item.tenDichVu || '').toLowerCase();
    let chiTietObj: Record<string, any> = {};
    if (item.ketQuaChiTiet) {
      if (typeof item.ketQuaChiTiet === 'string') {
        try {
          chiTietObj = JSON.parse(item.ketQuaChiTiet);
        } catch {}
      } else if (typeof item.ketQuaChiTiet === 'object') {
        chiTietObj = item.ketQuaChiTiet;
      }
    }

    // Nếu là Chẩn đoán hình ảnh (X-Quang / Siêu âm / Điện tim)
    const isImaging =
      tenDv.includes('x-quang') ||
      tenDv.includes('x quang') ||
      tenDv.includes('siêu âm') ||
      tenDv.includes('điện tim') ||
      tenDv.includes('ecg') ||
      item.loai === 'chan_doan_hinh_anh';

    if (isImaging) {
      const summaryText =
        Object.entries(chiTietObj)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ') ||
        item.giaTri ||
        item.nhanXet ||
        'Trường phổi hai bên sáng đều, bóng tim không to, góc sườn hoành hai bên nhọn.';
      const hasAbnormalKeyword = /viêm|đông đặc|mờ|tràn dịch|sỏi|dày|u |nhồi máu|loạn nhịp|gan nhiễm mỡ|giãn/i.test(
        `${summaryText} ${item.nhanXet || ''}`,
      );
      imagingFindings.push({
        tenDichVu: item.tenDichVu,
        vungKhaoSat: tenDv.includes('x-quang')
          ? 'Lồng ngực - Nhu mô phổi - Bóng tim - Góc sườn hoành'
          : tenDv.includes('siêu âm')
          ? 'Gan - Đường mật - Tụy - Lách - Thận 2 bên'
          : 'Hoạt động điện học cơ tim 12 chuyển đạo',
        phatHien: summaryText,
        mucDo: hasAbnormalKeyword ? 'bat_thuong' : 'binh_thuong',
        khuyenNghi:
          item.nhanXet ||
          (hasAbnormalKeyword
            ? 'Phát hiện dấu hiệu bất thường trên hình ảnh học, cần đối chiếu triệu chứng lâm sàng.'
            : 'Chưa ghi nhận tổn thương bất thường trên hình ảnh khảo sát.'),
      });
    }

    // Quét các chỉ số xét nghiệm trong ketQuaChiTiet
    for (const [rawKey, rawVal] of Object.entries(chiTietObj)) {
      const k = rawKey.toLowerCase();
      const numMatch = String(rawVal).match(/-?\d+(\.\d+)?/);
      if (!numMatch) continue;
      const num = parseFloat(numMatch[0]);
      if (isNaN(num)) continue;

      for (const [refCode, refSpec] of Object.entries(REFERENCE_RANGES)) {
        if (k.includes(refCode) || (refCode === 'ast' && k.includes('got')) || (refCode === 'alt' && k.includes('gpt'))) {
          if (refCode === 'creatinin') creatinineVal = num;
          if (refCode === 'ast') astVal = num;
          if (refCode === 'alt') altVal = num;
          if (refCode === 'glucose') glucoseVal = num;
          if (refCode === 'wbc') wbcVal = num;
          if (refCode === 'plt') pltVal = num;

          if (num > refSpec.max) {
            const isCritical = num > refSpec.max * 2.0;
            abnormalBiomarkers.push({
              chiSo: refSpec.label,
              giaTri: `${num} ${refSpec.unit}`,
              khoangThamChieu: `${refSpec.min} - ${refSpec.max} ${refSpec.unit}`,
              mucDo: isCritical ? 'nguy_kich' : 'tang_cao',
              yNghiaLamSang: refSpec.highMeaning,
            });
          } else if (num < refSpec.min) {
            const isCritical = num < refSpec.min * 0.6;
            abnormalBiomarkers.push({
              chiSo: refSpec.label,
              giaTri: `${num} ${refSpec.unit}`,
              khoangThamChieu: `${refSpec.min} - ${refSpec.max} ${refSpec.unit}`,
              mucDo: isCritical ? 'nguy_kich' : 'giam_thap',
              yNghiaLamSang: refSpec.lowMeaning,
            });
          }
        }
      }
    }
  }

  // Tính toán các chỉ số dẫn xuất y khoa (Derived Clinical Indices)
  const derivedIndices: Array<{ tenChiSo: string; giaTri: string; danhGia: string }> = [];

  if (creatinineVal && creatinineVal > 0) {
    // Ước tính eGFR từ Creatinine (µmol/L)
    const crMgDl = creatinineVal / 88.4;
    const isFemale = (input.benhNhan?.gioiTinh || '').toLowerCase().includes('nu');
    const age = input.benhNhan?.ngaySinh
      ? Math.max(18, new Date().getFullYear() - new Date(input.benhNhan.ngaySinh).getFullYear())
      : 45;
    const egfr = Math.round(175 * Math.pow(crMgDl, -1.154) * Math.pow(age, -0.203) * (isFemale ? 0.742 : 1.0));
    derivedIndices.push({
      tenChiSo: 'Mức lọc cầu thận ước tính (eGFR - MDRD)',
      giaTri: `${egfr} mL/phút/1.73m²`,
      danhGia:
        egfr >= 90
          ? 'Chức năng lọc cầu thận bình thường (G1)'
          : egfr >= 60
          ? 'Giảm nhẹ chức năng lọc cầu thận (G2) — theo dõi định kỳ'
          : 'Suy giảm chức năng thận (G3-G5) — cần hiệu chỉnh liều thuốc thải qua thận và tránh NSAIDs!',
    });
  }

  if (astVal && altVal && altVal > 0) {
    const ratio = (astVal / altVal).toFixed(2);
    derivedIndices.push({
      tenChiSo: 'Tỷ số De Ritis (AST/ALT)',
      giaTri: `${ratio}`,
      danhGia:
        astVal <= 40 && altVal <= 40
          ? 'Chức năng tế bào gan trong giới hạn sinh lý bình thường'
          : Number(ratio) < 1
          ? 'Tăng men gan ưu thế ALT — gợi ý viêm gan cấp / gan nhiễm mỡ'
          : 'Tăng men gan ưu thế AST — cần lưu ý tổn thương gan do thuốc hoặc rượu bia',
    });
  }

  const riskLevel =
    abnormalBiomarkers.some((b) => b.mucDo === 'nguy_kich')
      ? 'nguy_hiem_cao'
      : abnormalBiomarkers.length > 0 || imagingFindings.some((i) => i.mucDo === 'bat_thuong')
      ? 'can_theo_doi'
      : 'binh_thuong';

  const summaryLines: string[] = [];
  if (abnormalBiomarkers.length > 0) {
    summaryLines.push(
      `Phát hiện ${abnormalBiomarkers.length} chỉ số sinh học vượt ngưỡng tham chiếu: ${abnormalBiomarkers
        .map((b) => `${b.chiSo} (${b.giaTri})`)
        .join(', ')}.`,
    );
  } else if ((input.dsXetNghiem || []).length > 0) {
    summaryLines.push('Các chỉ số xét nghiệm đã thực hiện nằm trong giới hạn tham chiếu sinh lý.');
  }
  if (imagingFindings.length > 0) {
    summaryLines.push(
      `Hình ảnh học Cận lâm sàng: ${imagingFindings.map((f) => `${f.tenDichVu} (${f.phatHien})`).join('; ')}.`,
    );
  }

  return {
    riskLevel,
    totalAnalyzedServices: (input.dsXetNghiem || []).length,
    abnormalBiomarkers,
    imagingFindings,
    derivedIndices,
    organFunctionFlags: {
      hepaticImpairment: (astVal !== null && astVal > 60) || (altVal !== null && altVal > 60),
      renalImpairment: creatinineVal !== null && creatinineVal > 115,
      infectionSignal: wbcVal !== null && wbcVal > 10.5,
      thrombocytopenia: pltVal !== null && pltVal < 140,
      hyperglycemia: glucoseVal !== null && glucoseVal >= 7.0,
    },
    clinicalConclusion:
      summaryLines.join(' ') ||
      'Chưa ghi nhận bất thường trên các kết quả cận lâm sàng hiện có. Đề nghị kết hợp khám lâm sàng để kết luận.',
  };
}

// ─── 3. ENGINE KIỂM DUYỆT TƯƠNG TÁC THUỐC, DỊ ỨNG & CHỨC NĂNG GAN THẬN ──────
export function evaluatePrescriptionSafety(input: {
  medications: Array<{
    thuocId?: number;
    tenThuoc: string;
    lieuDung?: string;
    soLuong?: number;
    soNgayDung?: number;
  }>;
  patientContext?: {
    hoTen?: string;
    tuoi?: number;
    canNangKg?: number;
    diUng?: string;
    chanDoan?: string;
    huyetApTamThu?: number;
    huyetApTamTruong?: number;
    ast?: number;
    alt?: number;
    creatinine?: number;
    plt?: number;
  };
}) {
  const meds = input.medications || [];
  const ctx = input.patientContext || {};
  const diUngText = (ctx.diUng || '').toLowerCase();
  const chanDoanText = (ctx.chanDoan || '').toLowerCase();

  const alerts: Array<{
    loaiCanhBao: 'DI_UNG' | 'TUONG_TAC_THUOC' | 'CHUC_Nang_GAN_THAN' | 'BENH_LY_NEN' | 'TRUNG_LAP_NHOM' | 'HUONG_DAN_UONG';
    mucDo: 'nghiem_trong' | 'trung_binh' | 'luu_y';
    tieuDe: string;
    moTaChiTiet: string;
    khuyenNghiXuTri: string;
    thuocLienQuan: string[];
  }> = [];

  const identified = meds.map((m) => ({
    ...m,
    profile: identifyDrugProfile(m.tenThuoc),
  }));

  // 1. KIỂM TRA DỊ ỨNG THUỐC & DỊ ỨNG CHÉO (DRUG-ALLERGY CROSS-REACTIVITY)
  if (diUngText && diUngText !== 'không' && diUngText !== 'khong') {
    for (const item of identified) {
      const nameLower = item.tenThuoc.toLowerCase();
      const prof = item.profile;

      const isDirectMatch =
        diUngText.split(/[,;]/).some((tok) => tok.trim().length >= 3 && nameLower.includes(tok.trim()));

      const isBetaLactamCross =
        (diUngText.includes('penicillin') ||
          diUngText.includes('amoxicillin') ||
          diUngText.includes('beta-lactam') ||
          diUngText.includes('kháng sinh')) &&
        prof?.allergyGroup === 'beta_lactam';

      const isNsaidCross =
        (diUngText.includes('nsaid') ||
          diUngText.includes('ibuprofen') ||
          diUngText.includes('aspirin') ||
          diUngText.includes('giảm đau')) &&
        prof?.allergyGroup === 'nsaid';

      if (isDirectMatch || isBetaLactamCross || isNsaidCross) {
        alerts.push({
          loaiCanhBao: 'DI_UNG',
          mucDo: 'nghiem_trong',
          tieuDe: `🚨 CẢNH BÁO DỊ ỨNG / PHẢN ỨNG CHÉO: ${item.tenThuoc}`,
          moTaChiTiet: `Bệnh nhân có tiền sử dị ứng ghi nhận: "${ctx.diUng}". Thuốc "${item.tenThuoc}" (${
            prof?.drugClass || 'Hoạt chất tương ứng'
          }) có nguy cơ cao gây phản ứng quá mẫn hoặc sốc phản vệ chéo.`,
          khuyenNghiXuTri:
            prof?.allergyGroup === 'beta_lactam'
              ? 'Ngưng kê nhóm Beta-lactam (Amoxicillin/Cephalosporin); cân nhắc đổi sang kháng sinh nhóm Macrolide (Azithromycin 500mg).'
              : 'Thay thế bằng nhóm hoạt chất khác không có phản ứng chéo.',
          thuocLienQuan: [item.tenThuoc],
        });
      }
    }
  }

  // 2. KIỂM TRA TRÙNG LẶP HOẠT CHẤT / CÙNG NHÓM DƯỢC LÝ (DUPLICATE THERAPY)
  const groupMap: Record<string, string[]> = {};
  for (const item of identified) {
    if (!item.profile) continue;
    const gk = item.profile.key;
    if (!groupMap[gk]) groupMap[gk] = [];
    groupMap[gk].push(item.tenThuoc);
  }

  for (const [gk, listNames] of Object.entries(groupMap)) {
    if (listNames.length > 1) {
      alerts.push({
        loaiCanhBao: 'TRUNG_LAP_NHOM',
        mucDo: 'nghiem_trong',
        tieuDe: `⚠️ Trùng lặp nhóm dược lý (${gk}): ${listNames.join(' + ')}`,
        moTaChiTiet: `Đơn thuốc đang có ${listNames.length} thuốc cùng nhóm hoạt chất (${listNames.join(
          ', ',
        )}), làm tăng nguy cơ quá liều và độc tính cộng gộp trên gan/thận/dạ dày.`,
        khuyenNghiXuTri: `Chỉ giữ lại 1 thuốc đại diện trong nhóm (${listNames[0]}) và loại bỏ thuốc trùng lặp.`,
        thuocLienQuan: listNames,
      });
    }
  }

  // 3. KIỂM TRA TƯƠNG TÁC THUỐC - THUỐC (DRUG-DRUG INTERACTIONS - DDI)
  const hasNsaid = Boolean(groupMap['NSAID']?.length || groupMap['ASPIRIN']?.length);
  const hasCorticoid = Boolean(groupMap['CORTICOID']?.length);
  const hasPpi = Boolean(groupMap['PPI']?.length);
  const hasAntacid = Boolean(groupMap['ANTACID']?.length);
  const hasAceArb = Boolean(groupMap['ANTIHYPERTENSIVE_ACE_ARB']?.length);
  const hasMacrolide = Boolean(groupMap['MACROLIDE']?.length);
  const hasStatin = Boolean(groupMap['STATIN']?.length);
  const hasOralAntibiotic = Boolean(
    groupMap['PENICILLIN_BETA_LACTAM']?.length ||
      groupMap['CEPHALOSPORIN']?.length ||
      groupMap['MACROLIDE']?.length,
  );

  // DDI 1: NSAID + Corticoid
  if (hasNsaid && hasCorticoid) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Tương tác Nghiêm trọng: NSAID + Corticosteroid (Nguy cơ xuất huyết tiêu hóa)',
      moTaChiTiet: `Phối hợp cùng lúc ${involved.join(' và ')} làm tăng gấp 4 - 6 lần nguy cơ viêm loét và xuất huyết dạ dày - tá tràng cấp tính.`,
      khuyenNghiXuTri:
        'Tránh phối hợp đồng thời NSAID với Corticoid (thay NSAID bằng Paracetamol 500mg), hoặc bắt buộc kê kèm thuốc bảo vệ dạ dày PPI (Omeprazole 20mg).',
      thuocLienQuan: involved,
    });
  }

  // DDI 2: NSAID hoặc Corticoid chưa có PPI bảo vệ dạ dày
  if ((hasNsaid || hasCorticoid) && !hasPpi) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'trung_binh',
      tieuDe: '🛡️ Khuyến nghị Bảo vệ Niêm mạc Dạ dày khi dùng NSAID / Corticoid',
      moTaChiTiet: `Đơn thuốc có chứa thuốc gây kích ứng niêm mạc dạ dày (${involved.join(', ')}) nhưng chưa có thuốc ức chế bơm proton (PPI).`,
      khuyenNghiXuTri: 'Nên bổ sung Omeprazole 20mg (uống trước ăn sáng 30 phút) để dự phòng viêm trợt dạ dày.',
      thuocLienQuan: involved,
    });
  }

  // DDI 3: NSAID + Thuốc hạ áp ACEi/ARB
  if (hasNsaid && hasAceArb) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ANTIHYPERTENSIVE_ACE_ARB'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'trung_binh',
      tieuDe: '⚠️ Tương tác Thuốc: NSAID + Thuốc hạ áp (ACEi/ARB)',
      moTaChiTiet: `${involved.join(' + ')}: NSAID làm co tiểu động mạch đến cầu thận, làm giảm hiệu quả hạ huyết áp của nhóm ACEi/ARB và tăng nguy cơ suy thận cấp.`,
      khuyenNghiXuTri: 'Ưu tiên dùng Paracetamol để giảm đau ở bệnh nhân đang điều trị Tăng huyết áp, và theo dõi sát huyết áp + Creatinine.',
      thuocLienQuan: involved,
    });
  }

  // DDI 4: Kháng sinh Macrolide + Statin
  if (hasMacrolide && hasStatin) {
    const involved = [...(groupMap['MACROLIDE'] || []), ...(groupMap['STATIN'] || [])];
    alerts.push({
      loaiCanhBao: 'TUONG_TAC_THUOC',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Tương tác Chuyển hóa CYP3A4: Kháng sinh Macrolide + Statin',
      moTaChiTiet: `Kháng sinh Macrolide ức chế enzym CYP3A4 tại gan làm tăng nồng độ Statin trong máu, dẫn đến nguy cơ đau cơ và tiêu cơ vân cấp.`,
      khuyenNghiXuTri: 'Tạm ngưng thuốc hạ mỡ máu Statin trong 5-7 ngày đang uống đợt kháng sinh Macrolide.',
      thuocLienQuan: involved,
    });
  }

  // DDI 5: Antacid bọc dạ dày + Kháng sinh đường uống
  if (hasAntacid && hasOralAntibiotic) {
    const involved = [
      ...(groupMap['ANTACID'] || []),
      ...(groupMap['PENICILLIN_BETA_LACTAM'] || []),
      ...(groupMap['CEPHALOSPORIN'] || []),
      ...(groupMap['MACROLIDE'] || []),
    ];
    alerts.push({
      loaiCanhBao: 'HUONG_DAN_UONG',
      mucDo: 'luu_y',
      tieuDe: '⏰ Tương tác Hấp thu: Thuốc bọc dạ dày (Antacid) + Kháng sinh',
      moTaChiTiet: `Các muối Nhôm/Magie trong Antacid tạo phức chelat làm giảm 40-60% khả năng hấp thu của kháng sinh nếu uống cùng lúc.`,
      khuyenNghiXuTri: 'Hướng dẫn bệnh nhân uống thuốc bọc dạ dày CÁCH XA thời điểm uống kháng sinh ít nhất 2 giờ.',
      thuocLienQuan: involved,
    });
  }

  // 4. KIỂM TRA THEO CHẨN ĐOÁN BỆNH NỀN & CHỨC NĂNG GAN / THẬN / SINH HIỆU
  // 4a. Viêm loét dạ dày (K29) hoặc Sốt xuất huyết (A97) mà kê NSAID/Aspirin/Corticoid
  if ((chanDoanText.includes('k29') || chanDoanText.includes('dạ dày') || chanDoanText.includes('bao tử')) && (hasNsaid || hasCorticoid)) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'BENH_LY_NEN',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 Chống chỉ định trên Bệnh lý Dạ dày - Tá tràng',
      moTaChiTiet: `Bệnh nhân đang có chẩn đoán "${ctx.chanDoan}" nhưng đơn thuốc có ${involved.join(', ')} gây phá hủy hàng rào nhầy bảo vệ dạ dày.`,
      khuyenNghiXuTri: 'Loại bỏ NSAID/Corticoid khỏi đơn thuốc của bệnh nhân viêm loét dạ dày.',
      thuocLienQuan: involved,
    });
  }

  if ((chanDoanText.includes('a97') || chanDoanText.includes('sốt xuất huyết') || (ctx.plt && ctx.plt < 140)) && (hasNsaid || hasCorticoid)) {
    const involved = [...(groupMap['NSAID'] || []), ...(groupMap['ASPIRIN'] || []), ...(groupMap['CORTICOID'] || [])];
    alerts.push({
      loaiCanhBao: 'BENH_LY_NEN',
      mucDo: 'nghiem_trong',
      tieuDe: '🚨 CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI: NSAID/Aspirin trên bệnh nhân Sốt xuất huyết / Giảm tiểu cầu',
      moTaChiTiet: `Theo QĐ 2760/QĐ-BYT, việc dùng ${involved.join(', ')} ở bệnh nhân Sốt xuất huyết hoặc giảm tiểu cầu gây ức chế kết tập tiểu cầu và xuất huyết nội tạng nguy kịch.`,
      khuyenNghiXuTri: 'Chỉ sử dụng đơn chất Paracetamol 500mg để hạ sốt.',
      thuocLienQuan: involved,
    });
  }

  // 4b. Tăng men gan (AST/ALT > 60 U/L)
  if ((ctx.ast && ctx.ast > 60) || (ctx.alt && ctx.alt > 60)) {
    const hepatotoxicMeds = identified.filter((i) => i.profile?.hepatotoxicRisk === 'high').map((i) => i.tenThuoc);
    if (hepatotoxicMeds.length > 0) {
      alerts.push({
        loaiCanhBao: 'CHUC_Nang_GAN_THAN',
        mucDo: 'trung_binh',
        tieuDe: `⚠️ Cảnh báo Chức năng Gan (AST: ${ctx.ast || '--'} U/L, ALT: ${ctx.alt || '--'} U/L)`,
        moTaChiTiet: `Bệnh nhân có chỉ số men gan tăng cao. Thuốc ${hepatotoxicMeds.join(', ')} chuyển hóa mạnh qua gan.`,
        khuyenNghiXuTri: 'Giảm tổng liều Paracetamol (< 2g/ngày) hoặc tạm hoãn nhóm Statin cho đến khi men gan ổn định.',
        thuocLienQuan: hepatotoxicMeds,
      });
    }
  }

  // 4c. Suy giảm chức năng thận (Creatinine > 115 µmol/L)
  if (ctx.creatinine && ctx.creatinine > 115) {
    const nephrotoxicMeds = identified
      .filter((i) => i.profile?.nephrotoxicRisk === 'high' || i.profile?.nephrotoxicRisk === 'moderate')
      .map((i) => i.tenThuoc);
    if (nephrotoxicMeds.length > 0) {
      alerts.push({
        loaiCanhBao: 'CHUC_Nang_GAN_THAN',
        mucDo: 'nghiem_trong',
        tieuDe: `🚨 Cảnh báo Chức năng Thận (Creatinine: ${ctx.creatinine} µmol/L)`,
        moTaChiTiet: `Bệnh nhân có suy giảm độ thanh thải thận. Các thuốc ${nephrotoxicMeds.join(', ')} có nguy cơ tích lũy liều hoặc gây độc thận.`,
        khuyenNghiXuTri: 'Tránh dùng NSAIDs; hiệu chỉnh giảm 50% liều kháng sinh Cephalosporin / Metformin theo mức lọc cầu thận eGFR.',
        thuocLienQuan: nephrotoxicMeds,
      });
    }
  }

  // Tính điểm an toàn đơn thuốc (Safety Score: 0 -> 100)
  let penalty = 0;
  for (const a of alerts) {
    if (a.mucDo === 'nghiem_trong') penalty += 35;
    else if (a.mucDo === 'trung_binh') penalty += 15;
    else penalty += 5;
  }
  const safetyScore = Math.max(15, 100 - penalty);
  const safetyStatus =
    alerts.some((a) => a.mucDo === 'nghiem_trong')
      ? 'nguy_hiem_cao'
      : alerts.some((a) => a.mucDo === 'trung_binh')
      ? 'can_than_trong'
      : 'an_toan';

  // Tổng hợp hướng dẫn dùng thuốc chuẩn Dược lâm sàng tự động cho lời dặn bác sĩ
  const autoInstructions = identified
    .filter((i) => i.profile?.foodInstruction)
    .map((i) => `• ${i.tenThuoc}: ${i.profile?.foodInstruction}`);

  return {
    safetyScore,
    safetyStatus,
    totalMedications: meds.length,
    alerts,
    medicationProfiles: identified.map((i) => ({
      tenThuoc: i.tenThuoc,
      lieuDung: i.lieuDung,
      soLuong: i.soLuong,
      nhomDuocLy: i.profile?.drugClass || 'Thuốc điều trị chuyên khoa',
      hoatChat: i.profile?.activeIngredient || i.tenThuoc,
      huongDanDungChuan: i.profile?.foodInstruction || 'Uống theo chỉ định của bác sĩ.',
    })),
    recommendedDoctorNote:
      autoInstructions.length > 0
        ? `${autoInstructions.join(' ')} Kiêng rượu bia, tái khám đúng hẹn.`
        : 'Uống thuốc đúng liều lượng sau bữa ăn, uống nhiều nước ấm và tái khám đúng hẹn.',
  };
}

