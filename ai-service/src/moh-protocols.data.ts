// Kho phác đồ Chẩn đoán & Điều trị Bộ Y tế dùng cho Clinical RAG (khớp từ khóa triệu chứng)

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

// ─── 1. KHO TRI THỨC VECTOR PHÁC ĐỒ BỘ Y TẾ VIỆT NAM  ───
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
  // ─── Tiêu hóa ───
  {
    id: 'BYT_K64',
    maIcd10: 'K64.9 - Bệnh trĩ, không xác định',
    tenBenh: 'Bệnh trĩ',
    chuyenKhoa: 'Tiêu hóa / Ngoại tiêu hóa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'trĩ', 'đi vệ sinh ra máu', 'đi ngoài ra máu', 'đại tiện ra máu', 'đi cầu ra máu', 'máu tươi',
      'sa búi', 'lòi dom', 'đau rát hậu môn', 'ngứa hậu môn', 'táo bón',
    ],
    tieuChuanChanDoan: [
      'Chảy máu tươi khi đại tiện (nhỏ giọt hoặc thành tia, dính giấy vệ sinh), không lẫn trong phân.',
      'Có thể kèm sa búi trĩ khi rặn; phân độ I-IV theo mức độ sa và khả năng tự co.',
      'Thăm trực tràng / soi hậu môn - trực tràng xác định búi trĩ và loại trừ nguyên nhân chảy máu khác.',
    ],
    canLamSangKhuyenNghi: [
      'Soi hậu môn - trực tràng ống cứng',
      'Công thức máu (đánh giá thiếu máu do chảy máu kéo dài)',
      'Nội soi đại tràng nếu ≥ 45 tuổi, thay đổi thói quen đại tiện, sụt cân hoặc thiếu máu (loại trừ ung thư đại trực tràng)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị nội khoa cho trĩ độ I-II; thủ thuật (thắt vòng cao su, chích xơ) hoặc phẫu thuật cho trĩ độ III-IV hoặc thất bại điều trị nội.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc bền thành mạch (Flavonoid)',
          hoatChatGoiY: 'Diosmin 450mg + Hesperidin 50mg',
          lieuDungChuan: 'Đợt cấp: 6 viên/ngày x 4 ngày, sau đó 4 viên/ngày x 3 ngày; duy trì 2 viên/ngày',
          luuY: 'Kết hợp thuốc đặt / bôi tại chỗ giảm đau, chống viêm khi có đợt cấp.',
        },
        {
          nhomThuoc: 'Chất xơ / nhuận tràng thẩm thấu',
          hoatChatGoiY: 'Psyllium hoặc Macrogol 4000',
          lieuDungChuan: 'Psyllium 1 gói x 1-2 lần/ngày hoặc Macrogol 10g x 1-2 gói/ngày',
          luuY: 'Uống đủ nước khi dùng chất xơ.',
        },
      ],
      khongDungThuoc: [
        'Ăn nhiều rau xanh, chất xơ (25-30g/ngày), uống 1.5-2 lít nước/ngày.',
        'Không rặn mạnh, không ngồi lâu khi đại tiện; ngâm hậu môn nước ấm 10-15 phút sau đại tiện.',
        'Hạn chế rượu bia, đồ cay nóng.',
      ],
    },
    dauHieuNguyHiem: [
      'Chảy máu nhiều, choáng váng, da xanh, mạch nhanh (thiếu máu cấp).',
      'Búi trĩ sa nghẹt, tím, đau dữ dội không đẩy lên được (trĩ tắc mạch / nghẹt).',
      'Phân đen hoặc máu lẫn trong phân, sụt cân — cần loại trừ xuất huyết tiêu hóa cao / ung thư.',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần đánh giá đáp ứng; khám ngay khi chảy máu nhiều.',
  },
  {
    id: 'BYT_K92',
    maIcd10: 'K92.2 - Xuất huyết tiêu hóa, không xác định',
    tenBenh: 'Xuất huyết tiêu hóa',
    chuyenKhoa: 'Tiêu hóa / Cấp cứu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'xuất huyết tiêu hóa', 'đi vệ sinh ra máu', 'đi ngoài ra máu', 'đại tiện ra máu', 'đi cầu ra máu',
      'phân đen', 'đi ngoài phân đen', 'nôn ra máu', 'ói ra máu', 'phân có máu', 'máu lẫn phân',
    ],
    tieuChuanChanDoan: [
      'Xuất huyết tiêu hóa trên: nôn ra máu và/hoặc đi ngoài phân đen như bã cà phê, mùi khắm.',
      'Xuất huyết tiêu hóa dưới: đi ngoài ra máu đỏ tươi hoặc máu lẫn phân.',
      'Đánh giá mức độ mất máu: mạch, huyết áp, Hb/Hct; thang điểm Glasgow-Blatchford.',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu, nhóm máu, đông máu cơ bản (PT, APTT)',
      'Ure, Creatinine, chức năng gan',
      'Nội soi dạ dày - tá tràng cấp cứu trong 24 giờ (xuất huyết tiêu hóa trên)',
      'Nội soi đại tràng (xuất huyết tiêu hóa dưới)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Đánh giá và hồi sức huyết động trước, xác định vị trí chảy máu bằng nội soi, cầm máu và điều trị nguyên nhân. Chuyển viện / cấp cứu nếu huyết động không ổn định.',
      thuocDauTay: [
        {
          nhomThuoc: 'Ức chế bơm proton (PPI) đường tĩnh mạch',
          hoatChatGoiY: 'Esomeprazole hoặc Pantoprazole 80mg',
          lieuDungChuan: 'Tiêm TM 80mg, sau đó truyền 8mg/giờ x 72 giờ (khi nghi loét dạ dày - tá tràng chảy máu)',
          luuY: 'Ngừng NSAID, Aspirin, thuốc chống đông nếu được; truyền máu khi Hb < 7 g/dL.',
        },
      ],
      khongDungThuoc: [
        'Nhịn ăn tạm thời đến khi nội soi đánh giá; nằm nghỉ, theo dõi mạch - huyết áp sát.',
        'Bỏ rượu bia, thuốc lá; tránh tự dùng thuốc giảm đau chống viêm.',
      ],
    },
    dauHieuNguyHiem: [
      'Mạch > 100 l/p, HATT < 90 mmHg, vã mồ hôi, chân tay lạnh, lơ mơ (sốc mất máu).',
      'Nôn ra máu lượng nhiều hoặc tái phát chảy máu.',
    ],
    lichTaiKhamKhuyenNghi: 'Cần xử trí cấp cứu / nhập viện; tái khám sau xuất viện 1 - 2 tuần.',
  },
  {
    id: 'BYT_K58',
    maIcd10: 'K58 - Hội chứng ruột kích thích',
    tenBenh: 'Hội chứng ruột kích thích',
    chuyenKhoa: 'Tiêu hóa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'ruột kích thích', 'đau bụng quặn', 'đau bụng khi đi ngoài', 'rối loạn tiêu hóa', 'đầy hơi',
      'chướng bụng', 'đi ngoài phân lỏng xen táo bón', 'đại tràng co thắt', 'sôi bụng',
    ],
    tieuChuanChanDoan: [
      'Tiêu chuẩn Rome IV: đau bụng tái diễn ≥ 1 ngày/tuần trong 3 tháng, liên quan đại tiện, thay đổi số lần hoặc hình dạng phân.',
      'Không có dấu hiệu báo động (sụt cân, thiếu máu, chảy máu, khởi phát > 50 tuổi).',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu, CRP',
      'Xét nghiệm phân (soi tươi, máu ẩn trong phân)',
      'Nội soi đại tràng khi có dấu hiệu báo động hoặc ≥ 45 tuổi',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị theo triệu chứng nổi trội (đau, tiêu chảy, táo bón), kết hợp điều chỉnh ăn uống và tâm lý.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chống co thắt cơ trơn',
          hoatChatGoiY: 'Mebeverine 135mg hoặc Trimebutine 100mg',
          lieuDungChuan: 'Uống 1 viên x 3 lần/ngày trước ăn 20 phút',
          luuY: 'Thể tiêu chảy có thể thêm Loperamide; thể táo bón dùng chất xơ / Macrogol.',
        },
      ],
      khongDungThuoc: [
        'Ăn uống đúng giờ, giảm thực phẩm FODMAP cao (đậu, hành tỏi, sữa, đồ uống có ga).',
        'Giảm căng thẳng, ngủ đủ giấc, tập thể dục đều đặn.',
      ],
    },
    dauHieuNguyHiem: ['Sụt cân không rõ nguyên nhân, đi ngoài ra máu, thiếu máu, sốt — cần loại trừ bệnh thực thể.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 4 tuần đánh giá đáp ứng điều trị.',
  },
  {
    id: 'BYT_K59',
    maIcd10: 'K59.0 - Táo bón',
    tenBenh: 'Táo bón chức năng',
    chuyenKhoa: 'Tiêu hóa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['táo bón', 'khó đi ngoài', 'đi ngoài khó', 'phân cứng', 'mấy ngày không đi ngoài', 'rặn nhiều'],
    tieuChuanChanDoan: [
      'Đại tiện < 3 lần/tuần, phân cứng, phải rặn nhiều, cảm giác đi không hết (Rome IV).',
      'Loại trừ táo bón thứ phát do thuốc, suy giáp, tổn thương thực thể đại trực tràng.',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu, Glucose, TSH (khi nghi suy giáp)',
      'Nội soi đại tràng khi có dấu hiệu báo động',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều chỉnh chế độ ăn và thói quen đại tiện là nền tảng; thêm thuốc nhuận tràng khi cần.',
      thuocDauTay: [
        {
          nhomThuoc: 'Nhuận tràng thẩm thấu',
          hoatChatGoiY: 'Macrogol 4000 hoặc Lactulose',
          lieuDungChuan: 'Macrogol 10g x 1-2 gói/ngày; Lactulose 15-30ml/ngày',
          luuY: 'Hạn chế dùng kéo dài thuốc nhuận tràng kích thích (Bisacodyl).',
        },
      ],
      khongDungThuoc: [
        'Ăn nhiều rau, trái cây, chất xơ; uống 1.5-2 lít nước/ngày.',
        'Tập đi đại tiện vào giờ cố định, vận động thể lực đều đặn.',
      ],
    },
    dauHieuNguyHiem: ['Đau bụng dữ dội, nôn, bí trung đại tiện (nghi tắc ruột); đi ngoài ra máu, sụt cân.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  // ─── Tiết niệu ───
  {
    id: 'BYT_N39',
    maIcd10: 'N39.0 - Nhiễm trùng đường tiết niệu, vị trí không xác định',
    tenBenh: 'Nhiễm khuẩn đường tiết niệu dưới (viêm bàng quang cấp)',
    chuyenKhoa: 'Thận - Tiết niệu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thận - Tiết niệu của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'tiểu buốt', 'tiểu rắt', 'tiểu gắt', 'tiểu nhiều lần', 'tiểu đục', 'nhiễm trùng tiểu',
      'nhiễm trùng đường tiết niệu', 'viêm bàng quang', 'đau trên xương mu', 'nước tiểu có mùi hôi',
    ],
    tieuChuanChanDoan: [
      'Hội chứng bàng quang: tiểu buốt, tiểu rắt, tiểu nhiều lần, đau hạ vị; có thể tiểu máu cuối bãi.',
      'Tổng phân tích nước tiểu: bạch cầu niệu (+), nitrit (+); cấy nước tiểu ≥ 10^5 CFU/ml.',
      'Sốt cao, đau hông lưng gợi ý viêm thận - bể thận (nhiễm khuẩn tiết niệu trên).',
    ],
    canLamSangKhuyenNghi: [
      'Tổng phân tích nước tiểu 10 thông số',
      'Cấy nước tiểu + kháng sinh đồ (tái phát, nam giới, phụ nữ có thai)',
      'Siêu âm hệ tiết niệu',
      'Công thức máu, CRP, Creatinine (khi sốt)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Kháng sinh theo kinh nghiệm, điều chỉnh theo kháng sinh đồ; tìm và xử trí yếu tố thuận lợi (sỏi, tắc nghẽn).',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh đường tiết niệu',
          hoatChatGoiY: 'Fosfomycin 3g hoặc Nitrofurantoin 100mg',
          lieuDungChuan: 'Fosfomycin 3g liều duy nhất; hoặc Nitrofurantoin 100mg x 2 lần/ngày x 5 ngày',
          luuY: 'Phụ nữ có thai, nam giới, viêm thận bể thận cần phác đồ khác và thời gian dài hơn.',
        },
      ],
      khongDungThuoc: [
        'Uống nhiều nước (2 - 2.5 lít/ngày), không nhịn tiểu.',
        'Vệ sinh vùng kín đúng cách, đi tiểu sau quan hệ tình dục.',
      ],
    },
    dauHieuNguyHiem: ['Sốt cao rét run, đau hông lưng, nôn, tụt huyết áp (viêm thận bể thận / nhiễm khuẩn huyết).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau khi hết kháng sinh; xét nghiệm lại nước tiểu nếu còn triệu chứng.',
  },
  {
    id: 'BYT_N20',
    maIcd10: 'N20 - Sỏi thận và/hoặc sỏi niệu quản',
    tenBenh: 'Sỏi thận - niệu quản',
    chuyenKhoa: 'Thận - Tiết niệu / Ngoại tiết niệu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thận - Tiết niệu của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'sỏi thận', 'sỏi niệu quản', 'cơn đau quặn thận', 'đau quặn thận', 'đau hông lưng',
      'đau lan xuống bẹn', 'tiểu ra sỏi', 'tiểu ra máu',
    ],
    tieuChuanChanDoan: [
      'Cơn đau quặn thận: đau dữ dội vùng hông lưng lan xuống hố chậu, bẹn, bộ phận sinh dục.',
      'Có thể kèm tiểu máu, buồn nôn; siêu âm / CT phát hiện sỏi và mức độ ứ nước thận.',
    ],
    canLamSangKhuyenNghi: [
      'Siêu âm hệ tiết niệu',
      'X-quang hệ tiết niệu không chuẩn bị (KUB) hoặc CT không cản quang',
      'Tổng phân tích nước tiểu, Creatinine, Acid uric, Calci máu',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau cơn quặn thận; sỏi < 6mm điều trị nội và theo dõi đào thải; sỏi lớn / biến chứng chuyển can thiệp (tán sỏi, nội soi, phẫu thuật).',
      thuocDauTay: [
        {
          nhomThuoc: 'Giảm đau NSAID + chẹn alpha (tống sỏi)',
          hoatChatGoiY: 'Diclofenac 75mg tiêm bắp / uống; Tamsulosin 0.4mg',
          lieuDungChuan: 'Diclofenac 75mg khi đau; Tamsulosin 0.4mg x 1 lần/ngày tối đa 4 tuần',
          luuY: 'Thận trọng NSAID khi suy thận, loét dạ dày; kèm Drotaverine nếu cần.',
        },
      ],
      khongDungThuoc: [
        'Uống nhiều nước để lượng nước tiểu > 2 lít/ngày.',
        'Giảm muối, giảm đạm động vật; hạn chế thực phẩm giàu oxalat theo loại sỏi.',
      ],
    },
    dauHieuNguyHiem: ['Sốt kèm đau quặn thận (thận ứ mủ), vô niệu, đau không đáp ứng thuốc giảm đau.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần, siêu âm lại đánh giá sỏi và ứ nước.',
  },
  {
    id: 'BYT_R31',
    maIcd10: 'R31 - Tiểu máu không xác định',
    tenBenh: 'Tiểu máu',
    chuyenKhoa: 'Thận - Tiết niệu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thận - Tiết niệu của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'tiểu máu', 'tiểu ra máu', 'đi tiểu ra máu', 'đái ra máu', 'nước tiểu đỏ', 'nước tiểu có máu',
      'đi vệ sinh ra máu',
    ],
    tieuChuanChanDoan: [
      'Tiểu máu đại thể (nước tiểu đỏ) hoặc vi thể (≥ 3 hồng cầu/vi trường khi soi cặn).',
      'Phân biệt tiểu máu đầu bãi (niệu đạo), cuối bãi (bàng quang), toàn bãi (thận - niệu quản).',
      'Loại trừ nước tiểu đỏ do thuốc, thực phẩm, kinh nguyệt.',
    ],
    canLamSangKhuyenNghi: [
      'Tổng phân tích nước tiểu + soi cặn',
      'Siêu âm hệ tiết niệu',
      'Creatinine, công thức máu, đông máu',
      'Soi bàng quang / CT hệ tiết niệu khi ≥ 40 tuổi hoặc tiểu máu đại thể không rõ nguyên nhân',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Tiểu máu là triệu chứng: tìm nguyên nhân (nhiễm khuẩn, sỏi, viêm cầu thận, u) và điều trị theo nguyên nhân.',
      thuocDauTay: [
        {
          nhomThuoc: 'Theo nguyên nhân',
          hoatChatGoiY: 'Kháng sinh nếu nhiễm khuẩn tiết niệu; giảm đau + tống sỏi nếu sỏi',
          lieuDungChuan: 'Theo phác đồ bệnh nguyên nhân',
          luuY: 'Không dùng thuốc cầm máu khi chưa xác định nguyên nhân.',
        },
      ],
      khongDungThuoc: ['Uống đủ nước, theo dõi màu sắc nước tiểu.'],
    },
    dauHieuNguyHiem: ['Tiểu máu nhiều có máu cục, bí tiểu, thiếu máu; tiểu máu kèm phù, tăng huyết áp (viêm cầu thận).'],
    lichTaiKhamKhuyenNghi: 'Tái khám khi có kết quả cận lâm sàng để xác định nguyên nhân.',
  },
  // ─── Hô hấp / Tai Mũi Họng ───
  {
    id: 'BYT_J02',
    maIcd10: 'J02.9 - Viêm họng cấp tính, không xác định',
    tenBenh: 'Viêm họng cấp',
    chuyenKhoa: 'Tai Mũi Họng',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['viêm họng', 'đau họng', 'rát họng', 'nuốt đau', 'nuốt vướng', 'họng đỏ', 'khàn tiếng'],
    tieuChuanChanDoan: [
      'Đau rát họng, nuốt đau, có thể sốt; niêm mạc họng đỏ, xung huyết.',
      'Thang điểm Centor/McIsaac giúp định hướng viêm họng do liên cầu (sốt, xuất tiết amidan, hạch cổ đau, không ho).',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu, CRP (khi nghi nhiễm khuẩn)',
      'Test nhanh kháng nguyên liên cầu nhóm A (nếu có)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Đa số do virus — điều trị triệu chứng; chỉ dùng kháng sinh khi nghi / xác định liên cầu nhóm A.',
      thuocDauTay: [
        {
          nhomThuoc: 'Giảm đau hạ sốt',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên mỗi 6 giờ khi đau / sốt > 38.5°C, tối đa 4g/ngày',
          luuY: 'Nếu liên cầu: Amoxicillin 500mg x 2 lần/ngày x 10 ngày (dị ứng penicillin dùng Azithromycin).',
        },
      ],
      khongDungThuoc: ['Súc họng nước muối ấm, uống nhiều nước ấm, nghỉ ngơi.', 'Tránh đồ lạnh, khói thuốc lá.'],
    },
    dauHieuNguyHiem: ['Khó thở, chảy nước dãi, không nuốt được, há miệng hạn chế (áp xe quanh amidan / viêm nắp thanh môn).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 3 - 5 ngày nếu không đỡ.',
  },
  {
    id: 'BYT_J03',
    maIcd10: 'J03.9 - Viêm amidan cấp, không xác định',
    tenBenh: 'Viêm amidan cấp',
    chuyenKhoa: 'Tai Mũi Họng',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['viêm amidan', 'amidan sưng', 'amidan có mủ', 'mủ trắng amidan', 'sưng hạch cổ', 'hôi miệng'],
    tieuChuanChanDoan: [
      'Sốt, đau họng, nuốt đau; amidan sưng to, đỏ, có thể có chấm mủ hoặc giả mạc.',
      'Hạch góc hàm sưng đau.',
    ],
    canLamSangKhuyenNghi: ['Công thức máu, CRP', 'Test nhanh liên cầu nhóm A'],
    phacDoDieuTri: {
      nguyenTac: 'Kháng sinh khi nghi do vi khuẩn; giảm đau hạ sốt; xem xét cắt amidan khi viêm tái phát nhiều lần.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh nhóm Penicillin',
          hoatChatGoiY: 'Amoxicillin 500mg',
          lieuDungChuan: 'Uống 500mg x 2-3 lần/ngày x 10 ngày',
          luuY: 'Dị ứng penicillin: Azithromycin 500mg/ngày x 3-5 ngày.',
        },
      ],
      khongDungThuoc: ['Súc họng nước muối, ăn thức ăn mềm, uống nhiều nước.'],
    },
    dauHieuNguyHiem: ['Sốt cao kéo dài, đau họng một bên dữ dội, khít hàm (áp xe quanh amidan).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 - 7 ngày.',
  },
  {
    id: 'BYT_J01',
    maIcd10: 'J01.9 - Viêm xoang cấp, không xác định',
    tenBenh: 'Viêm mũi xoang cấp',
    chuyenKhoa: 'Tai Mũi Họng',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'viêm xoang', 'nghẹt mũi', 'chảy mũi đặc', 'dịch mũi vàng', 'dịch mũi xanh', 'đau vùng mặt',
      'đau nhức trán', 'giảm khứu giác', 'mất mùi',
    ],
    tieuChuanChanDoan: [
      'Nghẹt mũi, chảy mũi đặc (trước hoặc xuống họng), đau / nặng vùng mặt, giảm ngửi.',
      'Nghi do vi khuẩn khi triệu chứng > 10 ngày, hoặc nặng lên sau khi đã đỡ, hoặc sốt ≥ 39°C kèm mũi mủ.',
    ],
    canLamSangKhuyenNghi: ['Nội soi mũi xoang', 'CT xoang khi biến chứng hoặc viêm xoang mạn'],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị triệu chứng và rửa mũi; kháng sinh khi đủ tiêu chuẩn nhiễm khuẩn.',
      thuocDauTay: [
        {
          nhomThuoc: 'Corticoid xịt mũi + kháng sinh khi nhiễm khuẩn',
          hoatChatGoiY: 'Mometasone xịt mũi; Amoxicillin/Clavulanate 875/125mg',
          lieuDungChuan: 'Mometasone 2 nhát/bên mũi/ngày; Amoxicillin/Clavulanate 1 viên x 2 lần/ngày x 5-7 ngày',
          luuY: 'Thuốc co mạch mũi không dùng quá 5 ngày.',
        },
      ],
      khongDungThuoc: ['Rửa mũi nước muối sinh lý 2-3 lần/ngày.', 'Tránh khói bụi, giữ ấm.'],
    },
    dauHieuNguyHiem: ['Sưng nề quanh mắt, nhìn mờ, đau đầu dữ dội, cứng gáy (biến chứng ổ mắt / nội sọ).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 7 - 10 ngày.',
  },
  {
    id: 'BYT_J45',
    maIcd10: 'J45 - Hen [suyễn]',
    tenBenh: 'Hen phế quản',
    chuyenKhoa: 'Hô hấp',
    quyetDinhByt: 'Quyết định số 1851/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị hen)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: ['hen', 'suyễn', 'khò khè', 'thở rít', 'nặng ngực', 'khó thở về đêm', 'khó thở khi gắng sức', 'cò cử'],
    tieuChuanChanDoan: [
      'Triệu chứng hô hấp thay đổi theo thời gian và cường độ: khò khè, khó thở, nặng ngực, ho, nặng về đêm / gần sáng.',
      'Giới hạn luồng khí thở ra dao động: test hồi phục phế quản dương tính (FEV1 tăng > 12% và > 200ml).',
    ],
    canLamSangKhuyenNghi: ['Đo chức năng hô hấp + test hồi phục phế quản', 'Lưu lượng đỉnh (PEF)', 'X-quang ngực', 'Công thức máu (bạch cầu ái toan)'],
    phacDoDieuTri: {
      nguyenTac: 'Kiểm soát triệu chứng và giảm nguy cơ cơn kịch phát; mọi bệnh nhân nên có corticoid dạng hít, không dùng đơn độc SABA.',
      thuocDauTay: [
        {
          nhomThuoc: 'Corticoid hít + cường beta2 tác dụng kéo dài (ICS-Formoterol)',
          hoatChatGoiY: 'Budesonide/Formoterol 160/4.5mcg',
          lieuDungChuan: 'Hít 1 nhát khi có triệu chứng (bậc 1-2) hoặc 1-2 nhát x 2 lần/ngày (bậc 3-4)',
          luuY: 'Hướng dẫn kỹ thuật hít; súc miệng sau hít corticoid.',
        },
      ],
      khongDungThuoc: ['Tránh dị nguyên, khói thuốc lá, khói bụi; tiêm vắc xin cúm hằng năm.', 'Có kế hoạch hành động hen bằng văn bản.'],
    },
    dauHieuNguyHiem: ['Nói từng từ, tím tái, SpO2 < 90%, lồng ngực im lặng, lơ mơ (cơn hen nặng / nguy kịch).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 3 tháng đánh giá mức kiểm soát hen.',
  },
  {
    id: 'BYT_J18',
    maIcd10: 'J18.9 - Viêm phổi, không xác định',
    tenBenh: 'Viêm phổi mắc phải cộng đồng',
    chuyenKhoa: 'Hô hấp',
    quyetDinhByt: 'Quyết định số 4815/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị viêm phổi mắc phải cộng đồng ở người lớn)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: ['viêm phổi', 'sốt cao', 'ho đờm đặc', 'đờm vàng', 'đờm xanh', 'đau ngực khi ho', 'thở nhanh', 'ran nổ'],
    tieuChuanChanDoan: [
      'Sốt, ho khạc đờm, đau ngực, khó thở; khám có ran nổ, hội chứng đông đặc.',
      'X-quang ngực có tổn thương thâm nhiễm mới.',
      'Đánh giá mức độ nặng theo CURB-65 để quyết định điều trị ngoại trú hay nhập viện.',
    ],
    canLamSangKhuyenNghi: ['X-quang ngực thẳng', 'Công thức máu, CRP, Procalcitonin', 'Ure, Creatinine', 'SpO2 / khí máu khi khó thở', 'Cấy đờm khi nhập viện'],
    phacDoDieuTri: {
      nguyenTac: 'CURB-65 0-1 điều trị ngoại trú; ≥ 2 nhập viện. Kháng sinh sớm theo kinh nghiệm, điều chỉnh theo đáp ứng và vi sinh.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh ngoại trú',
          hoatChatGoiY: 'Amoxicillin 1g hoặc Amoxicillin/Clavulanate; ± Azithromycin',
          lieuDungChuan: 'Amoxicillin 1g x 3 lần/ngày x 5-7 ngày',
          luuY: 'Có bệnh đồng mắc: Amoxicillin/Clavulanate + Macrolid hoặc Levofloxacin 750mg/ngày.',
        },
      ],
      khongDungThuoc: ['Nghỉ ngơi, uống đủ nước, dinh dưỡng đầy đủ; bỏ thuốc lá.'],
    },
    dauHieuNguyHiem: ['Lú lẫn, nhịp thở ≥ 30 l/p, HATT < 90 mmHg, SpO2 < 92%, CURB-65 ≥ 2 — cần nhập viện.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 48 - 72 giờ đánh giá đáp ứng; chụp lại X-quang sau 6 tuần nếu > 50 tuổi / hút thuốc.',
  },
  // ─── Nội tiết - Cơ xương khớp ───
  {
    id: 'BYT_E78',
    maIcd10: 'E78.5 - Tăng lipid máu, không xác định',
    tenBenh: 'Rối loạn lipid máu',
    chuyenKhoa: 'Nội tiết / Tim mạch',
    quyetDinhByt: 'Quyết định số 3879/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Nội tiết - Chuyển hóa)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: ['mỡ máu', 'mỡ máu cao', 'rối loạn lipid', 'cholesterol cao', 'triglyceride cao', 'máu nhiễm mỡ', 'gan nhiễm mỡ'],
    tieuChuanChanDoan: [
      'Một hoặc nhiều chỉ số bất thường: Cholesterol TP ≥ 5.2 mmol/L, LDL-C ≥ 3.4 mmol/L, Triglyceride ≥ 1.7 mmol/L, HDL-C < 1.0 mmol/L.',
      'Đánh giá nguy cơ tim mạch tổng thể để đặt mục tiêu LDL-C.',
    ],
    canLamSangKhuyenNghi: ['Bilan lipid máu lúc đói', 'Glucose, HbA1c', 'AST, ALT, CK (trước khi dùng statin)', 'TSH (loại trừ suy giáp)'],
    phacDoDieuTri: {
      nguyenTac: 'Thay đổi lối sống cho mọi bệnh nhân; statin là thuốc nền tảng, cường độ theo mức nguy cơ tim mạch.',
      thuocDauTay: [
        {
          nhomThuoc: 'Statin',
          hoatChatGoiY: 'Atorvastatin 10-20mg hoặc Rosuvastatin 5-10mg',
          lieuDungChuan: 'Uống 1 viên/ngày buổi tối',
          luuY: 'Theo dõi men gan, đau cơ; TG > 5.6 mmol/L ưu tiên Fenofibrate.',
        },
      ],
      khongDungThuoc: ['Giảm mỡ động vật, đồ chiên rán, đường; tăng rau xanh, cá.', 'Tập thể dục ≥ 150 phút/tuần, giảm cân, bỏ rượu bia.'],
    },
    dauHieuNguyHiem: ['Đau bụng dữ dội khi TG rất cao (viêm tụy cấp); đau cơ nhiều, nước tiểu sẫm màu khi dùng statin (tiêu cơ vân).'],
    lichTaiKhamKhuyenNghi: 'Xét nghiệm lại lipid máu sau 6 - 8 tuần điều trị.',
  },
  {
    id: 'BYT_M10',
    maIcd10: 'M10.9 - Bệnh gút, không xác định',
    tenBenh: 'Bệnh gút (Gout)',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: ['gout', 'gút', 'thống phong', 'acid uric cao', 'axit uric', 'sưng đỏ ngón chân cái', 'sưng đau khớp ngón chân', 'nốt tophi'],
    tieuChuanChanDoan: [
      'Viêm khớp cấp: sưng nóng đỏ đau dữ dội, khởi phát đột ngột, hay gặp khớp bàn ngón chân cái, thường sau bữa ăn nhiều đạm / rượu bia.',
      'Acid uric máu tăng (> 420 µmol/L ở nam, > 360 µmol/L ở nữ); tìm thấy tinh thể urat trong dịch khớp / hạt tophi.',
    ],
    canLamSangKhuyenNghi: ['Acid uric máu', 'Công thức máu, CRP, máu lắng', 'Creatinine, chức năng gan', 'X-quang / siêu âm khớp'],
    phacDoDieuTri: {
      nguyenTac: 'Cắt cơn viêm khớp cấp sớm; sau đó điều trị hạ acid uric lâu dài (mục tiêu < 360 µmol/L) kèm dự phòng cơn cấp.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chống viêm cắt cơn gút cấp',
          hoatChatGoiY: 'Colchicine 1mg hoặc NSAID (Etoricoxib 120mg)',
          lieuDungChuan: 'Colchicine 1mg ngay, thêm 0.5mg sau 1 giờ, sau đó 0.5-1mg/ngày',
          luuY: 'Giảm liều Colchicine khi suy thận; tiêu chảy là dấu hiệu quá liều.',
        },
        {
          nhomThuoc: 'Hạ acid uric (sau cơn cấp)',
          hoatChatGoiY: 'Allopurinol 100-300mg',
          lieuDungChuan: 'Khởi đầu 100mg/ngày, tăng dần mỗi 2-4 tuần theo acid uric',
          luuY: 'Theo dõi phản ứng dị ứng da nặng (SJS/TEN); chỉnh liều theo chức năng thận.',
        },
      ],
      khongDungThuoc: ['Hạn chế nội tạng động vật, hải sản, thịt đỏ, rượu bia, nước ngọt có đường.', 'Uống > 2 lít nước/ngày, giảm cân.'],
    },
    dauHieuNguyHiem: ['Sốt cao kèm khớp sưng đỏ (loại trừ viêm khớp nhiễm khuẩn); phát ban, bong da khi dùng Allopurinol.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần, định lượng lại acid uric.',
  },
  // ─── Da liễu - Mắt ───
  {
    id: 'BYT_L50',
    maIcd10: 'L50.9 - Bệnh mày đay, không xác định',
    tenBenh: 'Mày đay (Nổi mề đay)',
    chuyenKhoa: 'Da liễu / Dị ứng',
    quyetDinhByt: 'Quyết định số 75/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['mề đay', 'mày đay', 'nổi mẩn', 'mẩn ngứa', 'ngứa', 'phát ban', 'nổi sẩn', 'dị ứng da'],
    tieuChuanChanDoan: [
      'Sẩn phù màu hồng hoặc đỏ, ngứa nhiều, xuất hiện và mất đi nhanh trong vòng 24 giờ.',
      'Cấp tính < 6 tuần, mạn tính ≥ 6 tuần; tìm yếu tố khởi phát (thức ăn, thuốc, nhiễm trùng).',
    ],
    canLamSangKhuyenNghi: ['Công thức máu (bạch cầu ái toan)', 'IgE toàn phần (mày đay mạn)', 'Chức năng gan, TSH (mày đay mạn)'],
    phacDoDieuTri: {
      nguyenTac: 'Loại bỏ yếu tố khởi phát; kháng histamin H1 thế hệ 2 là lựa chọn đầu tay.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng histamin H1 thế hệ 2',
          hoatChatGoiY: 'Cetirizine 10mg, Loratadine 10mg hoặc Fexofenadine 180mg',
          lieuDungChuan: 'Uống 1 viên/ngày; có thể tăng đến 4 lần liều nếu chưa kiểm soát',
          luuY: 'Corticoid uống đợt ngắn chỉ khi đợt cấp nặng.',
        },
      ],
      khongDungThuoc: ['Tránh thức ăn / thuốc nghi gây dị ứng, không gãi, mặc quần áo thoáng mát.'],
    },
    dauHieuNguyHiem: ['Phù môi, lưỡi, khó thở, khàn tiếng, tụt huyết áp (phù mạch / sốc phản vệ) — xử trí cấp cứu Adrenalin.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 2 tuần.',
  },
  {
    id: 'BYT_H10',
    maIcd10: 'H10.9 - Viêm kết mạc, không xác định',
    tenBenh: 'Viêm kết mạc (Đau mắt đỏ)',
    chuyenKhoa: 'Mắt',
    quyetDinhByt: 'Quyết định số 40/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị một số bệnh về Mắt)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['đau mắt đỏ', 'viêm kết mạc', 'đỏ mắt', 'mắt đỏ', 'ghèn mắt', 'dử mắt', 'cộm mắt', 'chảy nước mắt', 'ngứa mắt'],
    tieuChuanChanDoan: [
      'Mắt đỏ, cộm như có cát, chảy nước mắt hoặc nhiều ghèn; thị lực bình thường.',
      'Do virus (tiết tố trong, hạch trước tai), vi khuẩn (ghèn mủ), dị ứng (ngứa nhiều, hai mắt).',
    ],
    canLamSangKhuyenNghi: ['Khám sinh hiển vi đèn khe', 'Đo thị lực', 'Xét nghiệm tiết tố khi nghi lậu cầu / chlamydia'],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị theo nguyên nhân; vệ sinh mắt, phòng lây lan.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh nhỏ mắt (khi do vi khuẩn)',
          hoatChatGoiY: 'Tobramycin 0.3% hoặc Moxifloxacin 0.5% nhỏ mắt',
          lieuDungChuan: 'Nhỏ 1 giọt x 4-6 lần/ngày x 5-7 ngày',
          luuY: 'Không tự ý dùng thuốc nhỏ mắt có corticoid. Dị ứng: Olopatadine nhỏ mắt.',
        },
      ],
      khongDungThuoc: ['Rửa mắt nước muối sinh lý, dùng khăn riêng, rửa tay thường xuyên.'],
    },
    dauHieuNguyHiem: ['Giảm thị lực, đau nhức mắt nhiều, sợ ánh sáng, giác mạc đục (viêm giác mạc / glôcôm cấp / viêm màng bồ đào).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 - 7 ngày hoặc sớm hơn nếu giảm thị lực.',
  },
  // ─── Thần kinh - Tâm thần - Sản phụ khoa ───
  {
    id: 'BYT_G43',
    maIcd10: 'G43.9 - Migraine, không xác định',
    tenBenh: 'Đau nửa đầu (Migraine)',
    chuyenKhoa: 'Thần kinh',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thần kinh của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['đau nửa đầu', 'migraine', 'đau đầu một bên', 'đau đầu theo nhịp mạch', 'sợ ánh sáng', 'đau đầu buồn nôn', 'nhức đầu'],
    tieuChuanChanDoan: [
      'Cơn đau đầu 4-72 giờ, một bên, theo nhịp mạch, mức độ vừa - nặng, tăng khi vận động.',
      'Kèm buồn nôn / nôn hoặc sợ ánh sáng, sợ tiếng động; có thể có tiền triệu (aura).',
    ],
    canLamSangKhuyenNghi: ['Khám thần kinh', 'CT / MRI sọ não khi có dấu hiệu báo động'],
    phacDoDieuTri: {
      nguyenTac: 'Cắt cơn sớm; điều trị dự phòng khi ≥ 4 cơn/tháng hoặc cơn nặng ảnh hưởng sinh hoạt.',
      thuocDauTay: [
        {
          nhomThuoc: 'Giảm đau / NSAID cắt cơn',
          hoatChatGoiY: 'Paracetamol 1g hoặc Ibuprofen 400mg',
          lieuDungChuan: 'Uống ngay khi bắt đầu cơn, có thể nhắc lại sau 6 giờ',
          luuY: 'Tránh lạm dụng thuốc giảm đau > 10-15 ngày/tháng (đau đầu do lạm dụng thuốc). Dự phòng: Propranolol / Flunarizine.',
        },
      ],
      khongDungThuoc: ['Ngủ đủ, ăn đúng giờ, tránh yếu tố khởi phát (căng thẳng, thiếu ngủ, rượu, ánh sáng mạnh).'],
    },
    dauHieuNguyHiem: ['Đau đầu dữ dội đột ngột "chưa từng có", kèm sốt, cứng gáy, yếu liệt, co giật, rối loạn ý thức.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 4 - 8 tuần, ghi nhật ký cơn đau.',
  },
  {
    id: 'BYT_F41',
    maIcd10: 'F41.9 - Rối loạn lo âu, không xác định',
    tenBenh: 'Rối loạn lo âu',
    chuyenKhoa: 'Tâm thần / Tâm lý',
    quyetDinhByt: 'Quyết định số 2058/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị một số rối loạn tâm thần thường gặp)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: ['lo âu', 'lo lắng', 'căng thẳng', 'stress', 'bồn chồn', 'mất ngủ', 'khó ngủ', 'hoảng sợ', 'tim đập nhanh khi lo lắng'],
    tieuChuanChanDoan: [
      'Lo âu quá mức, khó kiểm soát, kéo dài ≥ 6 tháng (lo âu lan tỏa), kèm bồn chồn, mệt mỏi, khó tập trung, căng cơ, rối loạn giấc ngủ.',
      'Loại trừ nguyên nhân thực thể (cường giáp, rối loạn nhịp tim) và do chất.',
    ],
    canLamSangKhuyenNghi: ['TSH, FT4', 'Điện tâm đồ', 'Thang đánh giá GAD-7'],
    phacDoDieuTri: {
      nguyenTac: 'Kết hợp liệu pháp tâm lý (CBT) và thuốc; SSRI là lựa chọn đầu tay, benzodiazepin chỉ dùng ngắn hạn.',
      thuocDauTay: [
        {
          nhomThuoc: 'Ức chế tái hấp thu chọn lọc serotonin (SSRI)',
          hoatChatGoiY: 'Sertraline 50mg hoặc Escitalopram 10mg',
          lieuDungChuan: 'Uống 1 viên/ngày, đánh giá đáp ứng sau 4-6 tuần',
          luuY: 'Theo dõi ý tưởng tự sát giai đoạn đầu; không ngừng thuốc đột ngột.',
        },
      ],
      khongDungThuoc: ['Thư giãn, hít thở sâu, tập thể dục đều đặn; hạn chế cà phê, rượu bia.', 'Liệu pháp nhận thức - hành vi.'],
    },
    dauHieuNguyHiem: ['Có ý tưởng hoặc hành vi tự sát, trầm cảm nặng — chuyển chuyên khoa tâm thần ngay.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  {
    id: 'BYT_N76',
    maIcd10: 'N76.0 - Viêm âm đạo cấp',
    tenBenh: 'Viêm âm đạo',
    chuyenKhoa: 'Sản phụ khoa',
    quyetDinhByt: 'Quyết định số 315/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Sản phụ khoa)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['viêm âm đạo', 'khí hư', 'huyết trắng', 'ra dịch âm đạo', 'ngứa vùng kín', 'viêm phụ khoa', 'nấm âm đạo', 'khí hư có mùi'],
    tieuChuanChanDoan: [
      'Khí hư bất thường về lượng, màu, mùi; ngứa, rát âm hộ - âm đạo.',
      'Phân loại theo tác nhân: nấm Candida (khí hư trắng đặc như bột), Trichomonas (khí hư vàng xanh, bọt), vi khuẩn (khí hư xám, mùi cá ươn).',
    ],
    canLamSangKhuyenNghi: ['Soi tươi dịch âm đạo, nhuộm Gram', 'Đo pH âm đạo, test Whiff', 'Xét nghiệm tế bào cổ tử cung (PAP smear) định kỳ'],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị theo tác nhân; điều trị bạn tình khi do Trichomonas.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc kháng nấm / kháng khuẩn tại chỗ hoặc toàn thân',
          hoatChatGoiY: 'Nấm: Fluconazole 150mg; Vi khuẩn / Trichomonas: Metronidazole 500mg',
          lieuDungChuan: 'Fluconazole 150mg liều duy nhất; Metronidazole 500mg x 2 lần/ngày x 7 ngày',
          luuY: 'Không uống rượu khi dùng Metronidazole; thận trọng khi mang thai.',
        },
      ],
      khongDungThuoc: ['Vệ sinh vùng kín đúng cách, không thụt rửa sâu, mặc đồ lót thoáng.'],
    },
    dauHieuNguyHiem: ['Sốt, đau bụng dưới nhiều, ra máu bất thường (viêm tiểu khung / bệnh lý khác).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau khi kết thúc đợt điều trị.',
  },
];
