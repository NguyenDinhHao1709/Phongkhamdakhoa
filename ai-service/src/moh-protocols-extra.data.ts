// Phác đồ bổ sung (mở rộng kho Clinical RAG) — các bệnh thường gặp tại phòng khám đa khoa
import type { MohProtocolItem } from './moh-protocols.data';

export const MOH_PROTOCOLS_EXTRA: MohProtocolItem[] = [
  // ─── Đau bụng / Tiêu hóa - Gan mật ───
  {
    id: 'BYT_K35',
    maIcd10: 'K35.8 - Viêm ruột thừa cấp, khác và không xác định',
    tenBenh: 'Viêm ruột thừa cấp',
    chuyenKhoa: 'Ngoại tiêu hóa / Cấp cứu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Ngoại khoa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'đau bụng', 'đau hố chậu phải', 'đau bụng dưới bên phải', 'đau quanh rốn', 'viêm ruột thừa',
      'đau bụng cấp', 'đau bụng cấp tính', 'đau bụng dữ dội', 'chán ăn', 'buồn nôn', 'sốt nhẹ',
    ],
    tieuChuanChanDoan: [
      'Đau bụng khởi phát vùng thượng vị / quanh rốn, sau vài giờ khu trú ở hố chậu phải; kèm chán ăn, buồn nôn, sốt nhẹ.',
      'Khám: ấn đau điểm McBurney, phản ứng thành bụng hố chậu phải, dấu Rovsing / Blumberg (+).',
      'Thang điểm Alvarado ≥ 7 gợi ý cao viêm ruột thừa; xác định bằng siêu âm hoặc CT ổ bụng.',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu (bạch cầu tăng, %NEU tăng), CRP',
      'Siêu âm ổ bụng (ruột thừa đường kính > 6mm, không đè xẹp)',
      'CT ổ bụng có cản quang khi siêu âm không rõ',
      'Test thai (β-hCG) ở nữ trong độ tuổi sinh sản — loại trừ chửa ngoài tử cung',
      'Tổng phân tích nước tiểu (loại trừ sỏi / nhiễm khuẩn tiết niệu)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Viêm ruột thừa cấp là cấp cứu ngoại khoa: chuyển ngoại khoa phẫu thuật cắt ruột thừa (ưu tiên nội soi). Không dùng thuốc giảm đau mạnh / kháng sinh tại phòng khám làm che lấp triệu chứng trước khi được bác sĩ ngoại khám.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh dự phòng / điều trị trước mổ (tại cơ sở ngoại khoa)',
          hoatChatGoiY: 'Cefoxitin 2g hoặc Ceftriaxone 2g + Metronidazole 500mg',
          lieuDungChuan: 'Tiêm tĩnh mạch 30-60 phút trước rạch da; kéo dài nếu ruột thừa vỡ / viêm phúc mạc',
          luuY: 'Khai thác tiền sử dị ứng Beta-lactam; nhịn ăn uống chờ phẫu thuật.',
        },
      ],
      khongDungThuoc: [
        'Nhịn ăn uống hoàn toàn, không chườm nóng, không tự uống thuốc giảm đau / thuốc nhuận tràng.',
        'Chuyển viện / chuyển khoa ngoại ngay khi nghi ngờ.',
      ],
    },
    dauHieuNguyHiem: [
      'Đau lan khắp bụng, bụng cứng như gỗ, sốt cao, mạch nhanh (nghi vỡ ruột thừa / viêm phúc mạc).',
      'Nữ trễ kinh + đau bụng dưới + choáng (loại trừ chửa ngoài tử cung vỡ).',
    ],
    lichTaiKhamKhuyenNghi: 'Xử trí cấp cứu; tái khám ngoại khoa 7 - 10 ngày sau mổ (cắt chỉ, kiểm tra vết mổ).',
  },
  {
    id: 'BYT_K80',
    maIcd10: 'K80.2 - Sỏi túi mật không viêm túi mật / K81.0 Viêm túi mật cấp',
    tenBenh: 'Sỏi túi mật & Viêm túi mật cấp',
    chuyenKhoa: 'Tiêu hóa - Gan mật / Ngoại tiêu hóa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế (Tokyo Guidelines 2018)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'đau bụng', 'đau hạ sườn phải', 'đau dưới sườn phải', 'đau bụng sau ăn', 'đau sau ăn nhiều mỡ',
      'sỏi mật', 'sỏi túi mật', 'viêm túi mật', 'cơn đau quặn mật', 'đau lan lên vai phải', 'vàng da',
    ],
    tieuChuanChanDoan: [
      'Cơn đau quặn mật: đau hạ sườn phải / thượng vị, xuất hiện sau bữa ăn nhiều mỡ, kéo dài > 30 phút, có thể lan lên vai phải.',
      'Viêm túi mật cấp: đau kéo dài > 6 giờ, sốt, dấu Murphy (+), bạch cầu và CRP tăng; siêu âm thành túi mật dày > 4mm, có sỏi kẹt cổ túi mật.',
      'Tam chứng Charcot (đau, sốt, vàng da) gợi ý viêm đường mật — cấp cứu.',
    ],
    canLamSangKhuyenNghi: [
      'Siêu âm gan mật (sỏi, thành túi mật, đường mật)',
      'Công thức máu, CRP',
      'Bilirubin toàn phần / trực tiếp, AST, ALT, GGT, ALP',
      'Amylase / Lipase máu (loại trừ viêm tụy do sỏi)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Sỏi túi mật không triệu chứng: theo dõi. Có cơn đau quặn mật: giảm đau, chống co thắt và hẹn phẫu thuật cắt túi mật nội soi. Viêm túi mật cấp: nhập viện, kháng sinh, cắt túi mật sớm.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chống co thắt cơ trơn',
          hoatChatGoiY: 'Drotaverine 40mg hoặc Alverine citrate 40mg / Hyoscine butylbromide 10mg',
          lieuDungChuan: 'Uống 1-2 viên x 2-3 lần/ngày khi đau',
          luuY: 'Hyoscine thận trọng ở người glôcôm góc đóng, phì đại tiền liệt tuyến.',
        },
        {
          nhomThuoc: 'Giảm đau NSAID (cơn đau quặn mật)',
          hoatChatGoiY: 'Diclofenac 75mg tiêm bắp hoặc Paracetamol 1g truyền TM',
          lieuDungChuan: 'Dùng khi cơn đau cấp, không quá 2 lần/ngày',
          luuY: 'Tránh NSAID khi có loét dạ dày, suy thận.',
        },
      ],
      khongDungThuoc: [
        'Giảm mỡ động vật, đồ chiên rán, ăn chia nhiều bữa nhỏ.',
        'Duy trì cân nặng hợp lý, tránh giảm cân quá nhanh.',
      ],
    },
    dauHieuNguyHiem: [
      'Sốt cao rét run, vàng da, đau hạ sườn phải (viêm đường mật cấp).',
      'Đau thượng vị dữ dội lan ra sau lưng, nôn nhiều (viêm tụy cấp do sỏi).',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám ngoại khoa trong 1 - 2 tuần để lên kế hoạch phẫu thuật; khám cấp cứu nếu sốt / vàng da.',
  },
  {
    id: 'BYT_K85',
    maIcd10: 'K85.9 - Viêm tụy cấp, không xác định',
    tenBenh: 'Viêm tụy cấp',
    chuyenKhoa: 'Tiêu hóa / Hồi sức cấp cứu',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'đau bụng', 'đau thượng vị dữ dội', 'đau bụng lan ra sau lưng', 'đau xuyên ra lưng', 'viêm tụy',
      'nôn nhiều', 'chướng bụng', 'đau bụng sau uống rượu', 'đau bụng sau ăn nhiều',
    ],
    tieuChuanChanDoan: [
      'Có ≥ 2/3 tiêu chuẩn (Atlanta 2012): (1) đau thượng vị cấp, dữ dội, lan ra sau lưng; (2) Amylase hoặc Lipase máu ≥ 3 lần giới hạn trên; (3) hình ảnh viêm tụy trên siêu âm / CT.',
      'Nguyên nhân hay gặp: rượu, sỏi mật, tăng Triglyceride máu (> 11.3 mmol/L).',
    ],
    canLamSangKhuyenNghi: [
      'Amylase, Lipase máu',
      'Công thức máu, Ure, Creatinine, Glucose, Calci, Triglyceride, điện giải đồ',
      'AST, ALT, Bilirubin (nghi do sỏi mật)',
      'Siêu âm ổ bụng; CT ổ bụng có cản quang sau 72 giờ đánh giá biến chứng',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Nhập viện. Bù dịch tích cực (Ringer lactat), giảm đau, cho ăn đường miệng sớm khi hết nôn; điều trị nguyên nhân (ERCP nếu sỏi kẹt kèm viêm đường mật, hạ Triglyceride).',
      thuocDauTay: [
        {
          nhomThuoc: 'Bù dịch',
          hoatChatGoiY: 'Ringer lactat',
          lieuDungChuan: '5 - 10 ml/kg/giờ trong 24 giờ đầu, điều chỉnh theo nước tiểu và huyết động',
          luuY: 'Theo dõi quá tải dịch ở người suy tim, suy thận.',
        },
        {
          nhomThuoc: 'Giảm đau',
          hoatChatGoiY: 'Paracetamol 1g truyền TM; Morphin / Pethidine nếu đau nhiều',
          lieuDungChuan: 'Paracetamol 1g mỗi 6-8 giờ',
          luuY: 'Không dùng kháng sinh dự phòng thường quy.',
        },
      ],
      khongDungThuoc: [
        'Kiêng rượu bia tuyệt đối.',
        'Chế độ ăn ít mỡ sau khi hồi phục.',
      ],
    },
    dauHieuNguyHiem: [
      'Tụt huyết áp, thở nhanh, SpO2 giảm, thiểu niệu (viêm tụy cấp nặng, suy đa tạng).',
    ],
    lichTaiKhamKhuyenNghi: 'Điều trị nội trú; tái khám 2 - 4 tuần sau ra viện.',
  },
  {
    id: 'BYT_N94_6',
    maIcd10: 'N94.6 - Đau bụng kinh, không xác định',
    tenBenh: 'Đau bụng kinh (thống kinh)',
    chuyenKhoa: 'Sản phụ khoa',
    quyetDinhByt: 'Quyết định số 315/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Sản phụ khoa)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'đau bụng', 'đau bụng kinh', 'đau bụng khi hành kinh', 'đau bụng dưới', 'đau hạ vị', 'thống kinh',
      'hành kinh đau', 'đau bụng trước kỳ kinh', 'kinh nguyệt',
    ],
    tieuChuanChanDoan: [
      'Đau quặn vùng hạ vị xuất hiện ngay trước hoặc trong những ngày đầu hành kinh, có thể lan xuống thắt lưng, đùi; kèm buồn nôn, mệt mỏi.',
      'Nguyên phát: không có tổn thương thực thể, thường ở nữ trẻ. Thứ phát: do lạc nội mạc tử cung, u xơ tử cung, viêm vùng chậu.',
    ],
    canLamSangKhuyenNghi: [
      'Siêu âm phụ khoa (tử cung - phần phụ) loại trừ nguyên nhân thực thể',
      'Test thai β-hCG nếu có trễ kinh',
    ],
    phacDoDieuTri: {
      nguyenTac: 'NSAID là lựa chọn đầu tay; thuốc tránh thai phối hợp nếu có nhu cầu tránh thai hoặc NSAID không hiệu quả; tìm nguyên nhân nếu đau thứ phát.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng viêm không Steroid (NSAID)',
          hoatChatGoiY: 'Ibuprofen 400mg hoặc Acid mefenamic 500mg',
          lieuDungChuan: 'Uống 1 viên x 3 lần/ngày sau ăn, bắt đầu 1-2 ngày trước kỳ kinh, dùng 2-3 ngày',
          luuY: 'Thận trọng khi có loét dạ dày, hen do Aspirin.',
        },
        {
          nhomThuoc: 'Chống co thắt',
          hoatChatGoiY: 'Drotaverine 40mg hoặc Alverine citrate 40mg',
          lieuDungChuan: 'Uống 1-2 viên x 2-3 lần/ngày khi đau',
          luuY: 'Có thể phối hợp với NSAID.',
        },
      ],
      khongDungThuoc: [
        'Chườm ấm vùng bụng dưới, nghỉ ngơi, tập thể dục nhẹ nhàng.',
        'Hạn chế đồ uống lạnh, cà phê trong kỳ kinh.',
      ],
    },
    dauHieuNguyHiem: [
      'Đau bụng dữ dội kèm trễ kinh, ra máu âm đạo, choáng (loại trừ chửa ngoài tử cung).',
      'Sốt, khí hư hôi (viêm vùng chậu).',
    ],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 3 chu kỳ kinh đánh giá đáp ứng.',
  },
  {
    id: 'BYT_K30',
    maIcd10: 'K30 - Khó tiêu chức năng',
    tenBenh: 'Khó tiêu chức năng (Dyspepsia)',
    chuyenKhoa: 'Tiêu hóa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'khó tiêu', 'đầy bụng', 'no sớm', 'đầy hơi', 'chậm tiêu', 'ăn không tiêu', 'đau bụng trên',
      'nóng rát thượng vị', 'đau thượng vị',
    ],
    tieuChuanChanDoan: [
      'Rome IV: đầy bụng sau ăn, no sớm, đau hoặc nóng rát thượng vị, kéo dài ≥ 3 tháng (khởi phát ≥ 6 tháng).',
      'Nội soi không thấy tổn thương thực thể giải thích triệu chứng.',
    ],
    canLamSangKhuyenNghi: [
      'Test thở tìm H. pylori',
      'Nội soi dạ dày khi ≥ 45 tuổi hoặc có dấu hiệu báo động',
      'Siêu âm ổ bụng',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Tiệt trừ H. pylori nếu dương tính; PPI cho thể đau thượng vị; thuốc tăng co bóp cho thể đầy bụng sau ăn.',
      thuocDauTay: [
        {
          nhomThuoc: 'Ức chế bơm proton (PPI)',
          hoatChatGoiY: 'Omeprazole 20mg hoặc Pantoprazole 40mg',
          lieuDungChuan: 'Uống 1 viên/ngày trước ăn sáng 30 phút, 4 - 8 tuần',
          luuY: 'Đánh giá lại sau 4 tuần.',
        },
        {
          nhomThuoc: 'Thuốc tăng co bóp (Prokinetic)',
          hoatChatGoiY: 'Domperidone 10mg hoặc Itopride 50mg',
          lieuDungChuan: 'Uống 1 viên x 3 lần/ngày trước ăn 15-30 phút, không quá 7 ngày với Domperidone',
          luuY: 'Domperidone: nguy cơ kéo dài QT, tránh ở người bệnh tim, người cao tuổi.',
        },
      ],
      khongDungThuoc: [
        'Ăn chậm, nhai kỹ, chia nhỏ bữa; tránh đồ nhiều dầu mỡ, cà phê, rượu bia.',
        'Giảm căng thẳng, ngủ đủ giấc.',
      ],
    },
    dauHieuNguyHiem: ['Sụt cân, nuốt nghẹn, nôn ra máu, phân đen, thiếu máu — cần nội soi sớm.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 4 tuần.',
  },
  {
    id: 'BYT_K76',
    maIcd10: 'K76.0 - Gan nhiễm mỡ, không phân loại nơi khác',
    tenBenh: 'Gan nhiễm mỡ không do rượu (NAFLD)',
    chuyenKhoa: 'Tiêu hóa - Gan mật',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Tiêu hóa của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'gan nhiễm mỡ', 'men gan cao', 'tăng men gan', 'nặng tức hạ sườn phải', 'béo phì', 'thừa cân',
    ],
    tieuChuanChanDoan: [
      'Siêu âm có hình ảnh gan tăng âm (gan sáng); loại trừ uống rượu nhiều, viêm gan virus, thuốc.',
      'Thường kèm hội chứng chuyển hóa: béo bụng, rối loạn lipid máu, đái tháo đường, tăng huyết áp.',
    ],
    canLamSangKhuyenNghi: [
      'AST, ALT, GGT, Bilirubin',
      'HBsAg, Anti-HCV',
      'Glucose, HbA1c, Bilan lipid máu',
      'Siêu âm gan; FibroScan đánh giá xơ hóa',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Thay đổi lối sống, giảm 7-10% cân nặng là điều trị nền tảng; kiểm soát các bệnh chuyển hóa đi kèm.',
      thuocDauTay: [
        {
          nhomThuoc: 'Điều trị bệnh chuyển hóa đi kèm',
          hoatChatGoiY: 'Statin nếu rối loạn lipid; Metformin nếu đái tháo đường; Vitamin E 800 UI/ngày (viêm gan nhiễm mỡ không đái tháo đường)',
          lieuDungChuan: 'Theo phác đồ bệnh đi kèm',
          luuY: 'Không lạm dụng thuốc "bổ gan" chưa có bằng chứng.',
        },
      ],
      khongDungThuoc: [
        'Giảm cân từ từ 0.5 - 1 kg/tuần, tập thể dục ≥ 150 phút/tuần.',
        'Giảm đường, nước ngọt, tinh bột tinh chế, mỡ động vật; kiêng rượu bia.',
      ],
    },
    dauHieuNguyHiem: ['Vàng da, cổ trướng, xuất huyết tiêu hóa (xơ gan mất bù).'],
    lichTaiKhamKhuyenNghi: 'Tái khám và xét nghiệm men gan mỗi 3 - 6 tháng.',
  },
  {
    id: 'BYT_B18',
    maIcd10: 'B18.1 - Viêm gan virus B mạn, không có tác nhân delta',
    tenBenh: 'Viêm gan virus B mạn tính',
    chuyenKhoa: 'Truyền nhiễm / Tiêu hóa - Gan mật',
    quyetDinhByt: 'Quyết định số 3310/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán, điều trị bệnh viêm gan vi rút B)',
    namBanHanh: 2019,
    tuKhoaTrieuChung: [
      'viêm gan b', 'viêm gan siêu vi b', 'hbsag dương tính', 'men gan cao', 'tăng men gan', 'vàng da',
      'vàng mắt', 'mệt mỏi chán ăn', 'nước tiểu sẫm màu',
    ],
    tieuChuanChanDoan: [
      'HBsAg (+) > 6 tháng hoặc HBsAg (+) và Anti-HBc IgG (+).',
      'Chỉ định điều trị: ALT > 2 lần giới hạn trên và HBV-DNA ≥ 10^5 copies/ml (HBeAg +) hoặc ≥ 10^4 copies/ml (HBeAg -); hoặc có xơ gan.',
    ],
    canLamSangKhuyenNghi: [
      'HBsAg, HBeAg, Anti-HBe, định lượng HBV-DNA',
      'AST, ALT, Bilirubin, Albumin, PT/INR, công thức máu',
      'AFP + Siêu âm gan mỗi 6 tháng (tầm soát ung thư gan)',
      'FibroScan / APRI đánh giá xơ hóa',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Ức chế virus lâu dài bằng thuốc kháng virus đường uống khi có chỉ định; theo dõi định kỳ người chưa điều trị.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc kháng virus (Nucleos(t)ide analogue)',
          hoatChatGoiY: 'Tenofovir disoproxil fumarate (TDF) 300mg hoặc Entecavir 0.5mg / Tenofovir alafenamide (TAF) 25mg',
          lieuDungChuan: 'Uống 1 viên/ngày, cố định giờ; Entecavir uống lúc đói',
          luuY: 'Không tự ý ngừng thuốc (nguy cơ bùng phát viêm gan); theo dõi Creatinine, Phospho khi dùng TDF.',
        },
      ],
      khongDungThuoc: [
        'Kiêng rượu bia, tránh dùng thuốc / thảo dược không rõ nguồn gốc.',
        'Tiêm vắc xin viêm gan B cho người thân trong gia đình.',
      ],
    },
    dauHieuNguyHiem: ['Vàng da tăng nhanh, rối loạn ý thức, xuất huyết, cổ trướng (đợt bùng phát / suy gan).'],
    lichTaiKhamKhuyenNghi: 'Tái khám mỗi 3 tháng khi đang điều trị; 6 tháng/lần nếu chưa có chỉ định điều trị.',
  },

  // ─── Hô hấp - Tai Mũi Họng ───
  {
    id: 'BYT_J11',
    maIcd10: 'J11.1 - Cúm có biểu hiện hô hấp khác, virus không được định danh',
    tenBenh: 'Cúm mùa',
    chuyenKhoa: 'Truyền nhiễm / Hô hấp',
    quyetDinhByt: 'Quyết định số 1906/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh cúm mùa)',
    namBanHanh: 2023,
    tuKhoaTrieuChung: [
      'cúm', 'sốt', 'sốt cao', 'đau mỏi người', 'đau nhức cơ', 'ớn lạnh', 'rét run', 'ho', 'đau họng',
      'sổ mũi', 'mệt mỏi', 'đau đầu', 'cúm a', 'cúm b',
    ],
    tieuChuanChanDoan: [
      'Sốt đột ngột ≥ 38°C, đau đầu, đau mỏi cơ toàn thân, ho, đau họng, sổ mũi trong mùa dịch.',
      'Test nhanh kháng nguyên cúm A/B hoặc RT-PCR (+).',
    ],
    canLamSangKhuyenNghi: [
      'Test nhanh cúm A/B',
      'Công thức máu, CRP',
      'X-quang ngực khi khó thở / nghi viêm phổi',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị triệu chứng, nghỉ ngơi, bù nước; dùng thuốc kháng virus sớm (trong 48 giờ) cho nhóm nguy cơ cao (≥ 65 tuổi, có thai, bệnh mạn tính, trẻ < 5 tuổi) hoặc bệnh nặng.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc kháng virus cúm',
          hoatChatGoiY: 'Oseltamivir 75mg',
          lieuDungChuan: 'Uống 1 viên x 2 lần/ngày x 5 ngày',
          luuY: 'Hiệu chỉnh liều khi Creatinine clearance < 60 ml/phút.',
        },
        {
          nhomThuoc: 'Hạ sốt - Giảm đau',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên khi sốt ≥ 38.5°C, cách 4-6 giờ (tối đa 4g/ngày)',
          luuY: 'Không dùng Aspirin cho trẻ em (hội chứng Reye).',
        },
      ],
      khongDungThuoc: [
        'Nghỉ ngơi, uống nhiều nước, ăn đủ dinh dưỡng.',
        'Đeo khẩu trang, hạn chế tiếp xúc người khác; tiêm vắc xin cúm hàng năm.',
      ],
    },
    dauHieuNguyHiem: ['Khó thở, SpO2 < 94%, sốt cao > 3 ngày, lơ mơ, đau ngực (viêm phổi do cúm).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 3 - 5 ngày hoặc ngay khi khó thở.',
  },
  {
    id: 'BYT_U07',
    maIcd10: 'U07.1 - COVID-19, đã xác định virus',
    tenBenh: 'COVID-19',
    chuyenKhoa: 'Truyền nhiễm / Hô hấp',
    quyetDinhByt: 'Quyết định số 1314/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị COVID-19)',
    namBanHanh: 2023,
    tuKhoaTrieuChung: [
      'covid', 'covid-19', 'sars-cov-2', 'mất vị giác', 'mất khứu giác', 'test covid dương tính',
    ],
    tieuChuanChanDoan: [
      'Test nhanh kháng nguyên hoặc RT-PCR SARS-CoV-2 (+).',
      'Phân độ: nhẹ (không viêm phổi), trung bình (viêm phổi, SpO2 ≥ 94%), nặng (SpO2 < 94%, nhịp thở > 20).',
    ],
    canLamSangKhuyenNghi: [
      'Test nhanh kháng nguyên SARS-CoV-2',
      'Công thức máu, CRP; D-dimer khi bệnh trung bình - nặng',
      'X-quang ngực',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Ca nhẹ: điều trị triệu chứng tại nhà. Nhóm nguy cơ cao: thuốc kháng virus sớm trong 5 ngày đầu. SpO2 < 94%: nhập viện, thở oxy, Corticoid.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc kháng virus (nhóm nguy cơ cao)',
          hoatChatGoiY: 'Molnupiravir 200mg hoặc Nirmatrelvir/Ritonavir',
          lieuDungChuan: 'Molnupiravir 4 viên x 2 lần/ngày x 5 ngày',
          luuY: 'Molnupiravir không dùng cho phụ nữ có thai; Nirmatrelvir/Ritonavir có nhiều tương tác thuốc.',
        },
        {
          nhomThuoc: 'Hạ sốt - Giảm đau',
          hoatChatGoiY: 'Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên khi sốt ≥ 38.5°C, cách 4-6 giờ',
          luuY: 'Tối đa 4g/ngày.',
        },
      ],
      khongDungThuoc: [
        'Cách ly, đeo khẩu trang, uống đủ nước, theo dõi SpO2 tại nhà.',
      ],
    },
    dauHieuNguyHiem: ['SpO2 < 94%, nhịp thở > 20 lần/phút, đau tức ngực, lơ mơ, tím tái.'],
    lichTaiKhamKhuyenNghi: 'Tự theo dõi tại nhà 7 - 10 ngày; khám ngay khi có dấu hiệu nặng.',
  },
  {
    id: 'BYT_J44',
    maIcd10: 'J44.9 - Bệnh phổi tắc nghẽn mạn tính, không xác định',
    tenBenh: 'Bệnh phổi tắc nghẽn mạn tính (COPD)',
    chuyenKhoa: 'Hô hấp',
    quyetDinhByt: 'Quyết định số 2767/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị COPD)',
    namBanHanh: 2023,
    tuKhoaTrieuChung: [
      'copd', 'phổi tắc nghẽn', 'khó thở khi gắng sức', 'ho khạc đờm kéo dài', 'ho mạn tính', 'khò khè',
      'hút thuốc lá lâu năm', 'khó thở', 'thở rít',
    ],
    tieuChuanChanDoan: [
      'Ho, khạc đờm, khó thở tiến triển ở người > 40 tuổi có tiền sử hút thuốc / tiếp xúc khói bụi.',
      'Hô hấp ký: FEV1/FVC < 0.7 sau test giãn phế quản; phân nhóm GOLD A-B-E theo triệu chứng (mMRC/CAT) và đợt cấp.',
    ],
    canLamSangKhuyenNghi: [
      'Đo chức năng hô hấp (hô hấp ký) có test giãn phế quản',
      'X-quang ngực thẳng',
      'Công thức máu (bạch cầu ái toan), SpO2',
      'Điện tâm đồ, siêu âm tim (tâm phế mạn)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Cai thuốc lá, thuốc giãn phế quản tác dụng kéo dài dạng hít là nền tảng; phục hồi chức năng hô hấp, tiêm vắc xin cúm / phế cầu.',
      thuocDauTay: [
        {
          nhomThuoc: 'Giãn phế quản tác dụng kéo dài (LAMA / LABA)',
          hoatChatGoiY: 'Tiotropium 2.5mcg hoặc Indacaterol/Glycopyrronium 110/50mcg',
          lieuDungChuan: 'Hít 1-2 nhát x 1 lần/ngày',
          luuY: 'Hướng dẫn kỹ thuật dùng bình hít và kiểm tra lại mỗi lần tái khám.',
        },
        {
          nhomThuoc: 'Giãn phế quản tác dụng ngắn (cắt cơn)',
          hoatChatGoiY: 'Salbutamol 100mcg (MDI)',
          lieuDungChuan: 'Hít 2 nhát khi khó thở, tối đa 8 nhát/ngày',
          luuY: 'Dùng nhiều hơn bình thường là dấu hiệu đợt cấp.',
        },
      ],
      khongDungThuoc: [
        'Ngừng hút thuốc lá hoàn toàn, tránh khói bụi, khói bếp than.',
        'Tập thở chúm môi, thở bụng; vận động thể lực phù hợp.',
      ],
    },
    dauHieuNguyHiem: ['Khó thở tăng, đờm mủ, tím môi, SpO2 < 90%, lơ mơ (đợt cấp COPD nặng).'],
    lichTaiKhamKhuyenNghi: 'Tái khám mỗi 1 - 3 tháng; đo lại hô hấp ký hàng năm.',
  },
  {
    id: 'BYT_J30',
    maIcd10: 'J30.4 - Viêm mũi dị ứng, không xác định',
    tenBenh: 'Viêm mũi dị ứng',
    chuyenKhoa: 'Tai Mũi Họng / Dị ứng',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'viêm mũi dị ứng', 'hắt hơi', 'hắt hơi liên tục', 'ngứa mũi', 'chảy nước mũi trong', 'nghẹt mũi',
      'dị ứng thời tiết', 'ngứa mắt', 'sổ mũi buổi sáng',
    ],
    tieuChuanChanDoan: [
      'Hắt hơi thành tràng, ngứa mũi, chảy mũi trong, nghẹt mũi; thường xuất hiện khi tiếp xúc dị nguyên (bụi nhà, phấn hoa, lông thú, thay đổi thời tiết).',
      'Khám: niêm mạc mũi nhợt, phù nề, cuốn mũi dưới quá phát.',
    ],
    canLamSangKhuyenNghi: [
      'Nội soi mũi',
      'Công thức máu (bạch cầu ái toan), IgE toàn phần',
      'Test lẩy da (skin prick test) tìm dị nguyên khi cần',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Tránh dị nguyên; Corticoid xịt mũi là thuốc hiệu quả nhất; phối hợp kháng Histamin H1 thế hệ 2.',
      thuocDauTay: [
        {
          nhomThuoc: 'Corticoid xịt mũi',
          hoatChatGoiY: 'Fluticasone propionate 50mcg hoặc Mometasone furoate 50mcg',
          lieuDungChuan: 'Xịt 2 nhát mỗi bên mũi x 1 lần/ngày',
          luuY: 'Hiệu quả tối đa sau vài ngày; xịt hướng ra phía ngoài vách ngăn.',
        },
        {
          nhomThuoc: 'Kháng Histamin H1 thế hệ 2',
          hoatChatGoiY: 'Desloratadine 5mg hoặc Fexofenadine 180mg / Levocetirizine 5mg',
          lieuDungChuan: 'Uống 1 viên/ngày',
          luuY: 'Không lạm dụng thuốc co mạch xịt mũi > 5-7 ngày.',
        },
      ],
      khongDungThuoc: [
        'Rửa mũi nước muối sinh lý hàng ngày; vệ sinh nhà cửa, chăn gối, tránh lông thú.',
        'Đeo khẩu trang khi ra đường, giữ ấm khi thay đổi thời tiết.',
      ],
    },
    dauHieuNguyHiem: ['Khó thở, khò khè (hen phế quản đi kèm), sưng mặt môi.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  {
    id: 'BYT_H66',
    maIcd10: 'H66.9 - Viêm tai giữa, không xác định',
    tenBenh: 'Viêm tai giữa cấp',
    chuyenKhoa: 'Tai Mũi Họng',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Phác đồ Tai Mũi Họng)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'đau tai', 'viêm tai giữa', 'chảy mủ tai', 'ù tai', 'nghe kém', 'chảy dịch tai', 'đau nhức tai',
    ],
    tieuChuanChanDoan: [
      'Đau tai, sốt, nghe kém, có thể chảy mủ tai; thường sau viêm mũi họng.',
      'Soi tai: màng nhĩ đỏ, phồng, mất tam giác sáng hoặc thủng màng nhĩ chảy mủ.',
    ],
    canLamSangKhuyenNghi: [
      'Nội soi tai mũi họng',
      'Đo thính lực / nhĩ lượng khi cần',
      'Cấy mủ tai làm kháng sinh đồ nếu chảy mủ kéo dài',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau, kháng sinh khi có chỉ định (đau nhiều, sốt cao, chảy mủ, trẻ < 2 tuổi); điều trị viêm mũi họng kèm theo.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng sinh',
          hoatChatGoiY: 'Amoxicillin 500mg hoặc Amoxicillin + Clavulanic acid 625mg (dị ứng Penicillin: Azithromycin / Clarithromycin)',
          lieuDungChuan: 'Người lớn: Amoxicillin 500-1000mg x 3 lần/ngày x 7-10 ngày',
          luuY: 'Khai thác tiền sử dị ứng Penicillin.',
        },
        {
          nhomThuoc: 'Giảm đau - Hạ sốt',
          hoatChatGoiY: 'Paracetamol 500mg hoặc Ibuprofen 400mg',
          lieuDungChuan: 'Uống khi đau / sốt, cách 6 giờ',
          luuY: 'Không nhỏ thuốc tai có kháng sinh độc tai (Aminoglycosid) khi thủng màng nhĩ.',
        },
      ],
      khongDungThuoc: [
        'Giữ tai khô, không tự ngoáy tai; vệ sinh mũi họng bằng nước muối sinh lý.',
      ],
    },
    dauHieuNguyHiem: ['Sưng đau sau tai, đau đầu dữ dội, cứng gáy, liệt mặt (viêm xương chũm / biến chứng nội sọ).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 - 7 ngày kiểm tra màng nhĩ.',
  },

  // ─── Tim mạch ───
  {
    id: 'BYT_I20',
    maIcd10: 'I20.9 - Cơn đau thắt ngực, không xác định',
    tenBenh: 'Bệnh động mạch vành mạn / Đau thắt ngực ổn định',
    chuyenKhoa: 'Tim mạch',
    quyetDinhByt: 'Quyết định số 2248/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị Hội chứng mạch vành mạn)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'đau ngực', 'đau thắt ngực', 'tức ngực', 'nặng ngực', 'đau sau xương ức', 'đau ngực khi gắng sức',
      'đau ngực lan tay trái', 'khó thở khi gắng sức', 'bệnh mạch vành',
    ],
    tieuChuanChanDoan: [
      'Đau thắt ngực điển hình: đau / nặng sau xương ức, xuất hiện khi gắng sức hoặc xúc động, giảm khi nghỉ hoặc dùng Nitroglycerin.',
      'Loại trừ hội chứng mạch vành cấp: đau > 20 phút lúc nghỉ, ECG biến đổi ST, Troponin tăng.',
    ],
    canLamSangKhuyenNghi: [
      'Điện tâm đồ 12 chuyển đạo',
      'Troponin T/I hs (khi nghi hội chứng mạch vành cấp)',
      'Siêu âm tim, nghiệm pháp gắng sức / CT mạch vành',
      'Bilan lipid, Glucose, HbA1c, Creatinine',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm triệu chứng thiếu máu cơ tim và phòng ngừa biến cố tim mạch: chống ngưng tập tiểu cầu, Statin liều cao, chẹn beta; kiểm soát yếu tố nguy cơ.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chống ngưng tập tiểu cầu',
          hoatChatGoiY: 'Aspirin 75-100mg',
          lieuDungChuan: 'Uống 1 viên/ngày sau ăn',
          luuY: 'Phối hợp PPI nếu nguy cơ xuất huyết tiêu hóa; Clopidogrel 75mg nếu không dung nạp Aspirin.',
        },
        {
          nhomThuoc: 'Statin cường độ cao',
          hoatChatGoiY: 'Atorvastatin 40-80mg hoặc Rosuvastatin 20mg',
          lieuDungChuan: 'Uống 1 viên/ngày buổi tối',
          luuY: 'Mục tiêu LDL-C < 1.4 mmol/L; theo dõi men gan, CK khi đau cơ.',
        },
        {
          nhomThuoc: 'Chẹn beta / Nitrat cắt cơn',
          hoatChatGoiY: 'Bisoprolol 2.5-5mg; Nitroglycerin 0.5mg ngậm dưới lưỡi',
          lieuDungChuan: 'Bisoprolol 1 viên/ngày; Nitroglycerin ngậm khi đau, tối đa 3 lần cách 5 phút',
          luuY: 'Không dùng Nitrat cùng thuốc ức chế PDE5 (Sildenafil).',
        },
      ],
      khongDungThuoc: [
        'Ngừng thuốc lá, ăn nhạt, giảm mỡ động vật; vận động thể lực phù hợp.',
        'Kiểm soát huyết áp, đường huyết, cân nặng.',
      ],
    },
    dauHieuNguyHiem: ['Đau ngực dữ dội > 20 phút lúc nghỉ, vã mồ hôi, khó thở, ngất (nhồi máu cơ tim — gọi cấp cứu 115).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần, sau đó mỗi 1 - 3 tháng.',
  },
  {
    id: 'BYT_I50',
    maIcd10: 'I50.9 - Suy tim, không xác định',
    tenBenh: 'Suy tim mạn',
    chuyenKhoa: 'Tim mạch',
    quyetDinhByt: 'Quyết định số 1762/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị suy tim mạn)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'suy tim', 'khó thở khi nằm', 'khó thở về đêm', 'phù chân', 'phù hai chân', 'khó thở khi gắng sức',
      'mệt khi gắng sức', 'tăng cân nhanh', 'ho về đêm',
    ],
    tieuChuanChanDoan: [
      'Triệu chứng: khó thở khi gắng sức / khi nằm, phù chi dưới, mệt mỏi; dấu hiệu: tĩnh mạch cổ nổi, ran ẩm đáy phổi, gan to.',
      'NT-proBNP > 125 pg/ml; siêu âm tim phân loại theo EF (giảm ≤ 40%, giảm nhẹ 41-49%, bảo tồn ≥ 50%).',
    ],
    canLamSangKhuyenNghi: [
      'NT-proBNP',
      'Siêu âm tim',
      'Điện tâm đồ, X-quang ngực',
      'Điện giải đồ, Creatinine, công thức máu, chức năng tuyến giáp',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Suy tim EF giảm: phối hợp 4 nhóm nền tảng (ARNI/ACEi/ARB, chẹn beta, kháng Aldosterone, SGLT2i); lợi tiểu khi ứ dịch; điều trị nguyên nhân.',
      thuocDauTay: [
        {
          nhomThuoc: 'Lợi tiểu quai (giảm ứ dịch)',
          hoatChatGoiY: 'Furosemide 40mg',
          lieuDungChuan: 'Uống 1/2 - 1 viên buổi sáng, điều chỉnh theo cân nặng và phù',
          luuY: 'Theo dõi Kali, Natri, Creatinine.',
        },
        {
          nhomThuoc: 'Ức chế SGLT2',
          hoatChatGoiY: 'Dapagliflozin 10mg hoặc Empagliflozin 10mg',
          lieuDungChuan: 'Uống 1 viên/ngày',
          luuY: 'Không dùng khi eGFR < 20-25; nguy cơ nhiễm nấm sinh dục.',
        },
        {
          nhomThuoc: 'Chẹn beta + Ức chế hệ RAA + Kháng Aldosterone',
          hoatChatGoiY: 'Bisoprolol 1.25mg; Sacubitril/Valsartan 50mg hoặc Perindopril; Spironolactone 25mg',
          lieuDungChuan: 'Khởi đầu liều thấp, tăng dần mỗi 2-4 tuần đến liều đích dung nạp',
          luuY: 'Theo dõi huyết áp, nhịp tim, Kali máu.',
        },
      ],
      khongDungThuoc: [
        'Ăn nhạt < 5g muối/ngày, hạn chế nước khi phù nhiều; cân nặng mỗi sáng.',
        'Tránh NSAID; tiêm vắc xin cúm, phế cầu.',
      ],
    },
    dauHieuNguyHiem: ['Khó thở khi nghỉ, phải ngồi dậy để thở, khạc bọt hồng, tăng > 2kg trong 3 ngày (suy tim cấp / phù phổi).'],
    lichTaiKhamKhuyenNghi: 'Tái khám mỗi 2 - 4 tuần trong giai đoạn chỉnh liều.',
  },

  // ─── Nội tiết - Huyết học ───
  {
    id: 'BYT_E03',
    maIcd10: 'E03.9 - Suy giáp, không xác định',
    tenBenh: 'Suy giáp',
    chuyenKhoa: 'Nội tiết',
    quyetDinhByt: 'Quyết định số 3879/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Nội tiết - Chuyển hóa)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'suy giáp', 'sợ lạnh', 'tăng cân', 'da khô', 'rụng tóc', 'phù mặt', 'chậm chạp', 'táo bón', 'mệt mỏi', 'tsh cao',
    ],
    tieuChuanChanDoan: [
      'Triệu chứng giảm chuyển hóa: mệt mỏi, sợ lạnh, tăng cân, da khô, táo bón, nhịp tim chậm, phù niêm.',
      'TSH tăng, FT4 giảm (suy giáp nguyên phát); TSH tăng, FT4 bình thường (suy giáp dưới lâm sàng).',
    ],
    canLamSangKhuyenNghi: [
      'TSH, FT4',
      'Anti-TPO (viêm giáp Hashimoto)',
      'Siêu âm tuyến giáp, Bilan lipid',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Bổ sung hormone giáp suốt đời, chỉnh liều theo TSH.',
      thuocDauTay: [
        {
          nhomThuoc: 'Hormone giáp tổng hợp',
          hoatChatGoiY: 'Levothyroxine 50mcg / 100mcg',
          lieuDungChuan: '1.6 mcg/kg/ngày; người cao tuổi / bệnh tim khởi đầu 25-50mcg, uống lúc đói trước ăn sáng 30-60 phút',
          luuY: 'Uống cách sắt, calci, PPI ≥ 4 giờ; định lượng lại TSH sau 6-8 tuần.',
        },
      ],
      khongDungThuoc: ['Tuân thủ uống thuốc hàng ngày cố định giờ.'],
    },
    dauHieuNguyHiem: ['Lơ mơ, hạ thân nhiệt, nhịp chậm, thở chậm (hôn mê phù niêm).'],
    lichTaiKhamKhuyenNghi: 'Tái khám và xét nghiệm TSH sau 6 - 8 tuần, ổn định thì 6 - 12 tháng/lần.',
  },
  {
    id: 'BYT_E05',
    maIcd10: 'E05.9 - Nhiễm độc giáp, không xác định',
    tenBenh: 'Cường giáp / Basedow',
    chuyenKhoa: 'Nội tiết',
    quyetDinhByt: 'Quyết định số 3879/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Nội tiết - Chuyển hóa)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'cường giáp', 'basedow', 'bướu cổ', 'run tay', 'sụt cân', 'hồi hộp', 'tim đập nhanh', 'ra nhiều mồ hôi',
      'sợ nóng', 'lồi mắt', 'mất ngủ', 'đánh trống ngực',
    ],
    tieuChuanChanDoan: [
      'Hội chứng cường giáp: hồi hộp, nhịp nhanh, run tay, sụt cân dù ăn nhiều, sợ nóng, ra mồ hôi.',
      'TSH giảm, FT4 / FT3 tăng; Basedow: bướu giáp lan tỏa, lồi mắt, TRAb (+).',
    ],
    canLamSangKhuyenNghi: [
      'TSH, FT4, FT3, TRAb',
      'Siêu âm tuyến giáp',
      'Công thức máu, men gan (trước khi dùng thuốc kháng giáp)',
      'Điện tâm đồ',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Thuốc kháng giáp tổng hợp 12-18 tháng, chẹn beta kiểm soát triệu chứng; xem xét I-131 hoặc phẫu thuật nếu tái phát.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc kháng giáp tổng hợp',
          hoatChatGoiY: 'Methimazole (Thiamazole) 5mg',
          lieuDungChuan: '10-30mg/ngày tùy mức độ, giảm dần theo FT4',
          luuY: 'Nguy cơ mất bạch cầu hạt: ngừng thuốc và khám ngay nếu sốt, đau họng. PTU ưu tiên ở 3 tháng đầu thai kỳ.',
        },
        {
          nhomThuoc: 'Chẹn beta',
          hoatChatGoiY: 'Propranolol 40mg',
          lieuDungChuan: 'Uống 1/2 - 1 viên x 2-3 lần/ngày',
          luuY: 'Chống chỉ định khi hen phế quản.',
        },
      ],
      khongDungThuoc: ['Tránh thực phẩm / thuốc chứa nhiều iod, nghỉ ngơi, ăn đủ năng lượng.'],
    },
    dauHieuNguyHiem: ['Sốt cao, nhịp tim > 140, kích thích, vật vã, tiêu chảy (cơn bão giáp).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 4 - 6 tuần kiểm tra FT4 và công thức máu.',
  },
  {
    id: 'BYT_D50',
    maIcd10: 'D50.9 - Thiếu máu thiếu sắt, không xác định',
    tenBenh: 'Thiếu máu thiếu sắt',
    chuyenKhoa: 'Huyết học / Nội tổng quát',
    quyetDinhByt: 'Quyết định số 1494/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh lý Huyết học)',
    namBanHanh: 2022,
    tuKhoaTrieuChung: [
      'thiếu máu', 'da xanh', 'niêm mạc nhợt', 'hoa mắt', 'chóng mặt khi đứng lên', 'mệt mỏi', 'kinh nguyệt nhiều',
      'rụng tóc', 'móng tay giòn', 'hồi hộp',
    ],
    tieuChuanChanDoan: [
      'Hb < 130 g/L (nam), < 120 g/L (nữ); hồng cầu nhỏ (MCV < 80 fL), nhược sắc (MCH < 27 pg).',
      'Ferritin huyết thanh < 30 ng/ml; cần tìm nguyên nhân mất máu (tiêu hóa, kinh nguyệt) hoặc kém hấp thu.',
    ],
    canLamSangKhuyenNghi: [
      'Công thức máu, hồng cầu lưới',
      'Sắt huyết thanh, Ferritin, Transferrin',
      'Tìm máu ẩn trong phân; nội soi tiêu hóa ở nam giới / nữ mãn kinh',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Bổ sung sắt đường uống và điều trị nguyên nhân gây mất máu.',
      thuocDauTay: [
        {
          nhomThuoc: 'Sắt đường uống',
          hoatChatGoiY: 'Sắt fumarat / sắt sulfat (60-65mg sắt nguyên tố) + Acid folic',
          lieuDungChuan: 'Uống 1 viên/ngày hoặc cách ngày, lúc đói hoặc giữa các bữa ăn, kéo dài 3 tháng sau khi Hb về bình thường',
          luuY: 'Phân đen do sắt là bình thường; không uống cùng trà, sữa, thuốc kháng acid.',
        },
      ],
      khongDungThuoc: ['Ăn thịt đỏ, gan, rau xanh đậm; bổ sung Vitamin C giúp hấp thu sắt.'],
    },
    dauHieuNguyHiem: ['Hb < 70 g/L, khó thở, đau ngực, ngất; đi ngoài phân đen (xuất huyết tiêu hóa).'],
    lichTaiKhamKhuyenNghi: 'Tái khám và xét nghiệm công thức máu sau 4 tuần.',
  },

  // ─── Thần kinh - Tâm thần ───
  {
    id: 'BYT_H81',
    maIcd10: 'H81.1 - Chóng mặt kịch phát lành tính',
    tenBenh: 'Chóng mặt tư thế kịch phát lành tính (BPPV) / Hội chứng tiền đình',
    chuyenKhoa: 'Thần kinh / Tai Mũi Họng',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thần kinh của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'chóng mặt', 'rối loạn tiền đình', 'tiền đình', 'quay cuồng', 'chóng mặt khi thay đổi tư thế',
      'chóng mặt khi nằm', 'chóng mặt buồn nôn', 'mất thăng bằng', 'hoa mắt',
    ],
    tieuChuanChanDoan: [
      'Chóng mặt quay cuồng ngắn (< 1 phút) khi thay đổi tư thế đầu (nằm xuống, trở mình, ngẩng đầu), kèm buồn nôn.',
      'Nghiệm pháp Dix-Hallpike (+): rung giật nhãn cầu xoay. Khám thần kinh không có dấu hiệu khu trú.',
    ],
    canLamSangKhuyenNghi: [
      'Nghiệm pháp Dix-Hallpike / Supine roll test',
      'Đo huyết áp tư thế, đường huyết mao mạch',
      'MRI sọ não khi có dấu hiệu thần kinh khu trú (loại trừ đột quỵ tuần hoàn sau)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'BPPV: thủ thuật tái định vị sỏi tai (Epley) là điều trị chính; thuốc chỉ giảm triệu chứng ngắn hạn.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc điều trị chóng mặt',
          hoatChatGoiY: 'Betahistine 16mg hoặc Acetyl-DL-leucine 500mg',
          lieuDungChuan: 'Betahistine 1 viên x 2-3 lần/ngày sau ăn; Acetyl-leucine 2-3 viên x 2 lần/ngày',
          luuY: 'Betahistine thận trọng ở người loét dạ dày, hen.',
        },
        {
          nhomThuoc: 'Chống nôn (khi nôn nhiều, ngắn ngày)',
          hoatChatGoiY: 'Dimenhydrinate 50mg hoặc Metoclopramide 10mg',
          lieuDungChuan: 'Uống 1 viên khi buồn nôn, tối đa 3 lần/ngày, không quá 3-5 ngày',
          luuY: 'Gây buồn ngủ, không lái xe.',
        },
      ],
      khongDungThuoc: [
        'Thực hiện thủ thuật Epley; tập bài tập Brandt-Daroff tại nhà.',
        'Đứng dậy từ từ, tránh cúi ngửa đầu đột ngột.',
      ],
    },
    dauHieuNguyHiem: ['Chóng mặt kèm nói khó, nhìn đôi, yếu liệt, đi loạng choạng, đau đầu dữ dội (nghi đột quỵ).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 2 tuần.',
  },
  {
    id: 'BYT_G47',
    maIcd10: 'G47.0 - Mất ngủ',
    tenBenh: 'Mất ngủ',
    chuyenKhoa: 'Thần kinh / Tâm thần',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thần kinh của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'mất ngủ', 'khó ngủ', 'khó vào giấc', 'ngủ không sâu', 'thức giấc giữa đêm', 'dậy sớm', 'ngủ ít',
      'trằn trọc', 'mệt mỏi ban ngày',
    ],
    tieuChuanChanDoan: [
      'Khó vào giấc, khó duy trì giấc ngủ hoặc thức dậy sớm ≥ 3 đêm/tuần, kéo dài ≥ 3 tháng (mạn tính), gây ảnh hưởng chức năng ban ngày.',
      'Tìm nguyên nhân: lo âu, trầm cảm, đau mạn tính, ngưng thở khi ngủ, cường giáp, thuốc, cà phê.',
    ],
    canLamSangKhuyenNghi: [
      'Thang điểm PSQI / ISI đánh giá mức độ',
      'TSH, Glucose, công thức máu khi nghi nguyên nhân thực thể',
      'Sàng lọc lo âu - trầm cảm (GAD-7, PHQ-9)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Liệu pháp nhận thức hành vi (CBT-I) và vệ sinh giấc ngủ là ưu tiên; thuốc ngủ chỉ dùng ngắn ngày, liều thấp nhất.',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc gây ngủ non-benzodiazepine (ngắn hạn)',
          hoatChatGoiY: 'Zolpidem 5-10mg',
          lieuDungChuan: 'Uống 1 viên ngay trước khi đi ngủ, không quá 2-4 tuần',
          luuY: 'Nguy cơ lệ thuộc, té ngã ở người cao tuổi; không phối hợp rượu.',
        },
        {
          nhomThuoc: 'Thuốc hỗ trợ (khi kèm lo âu / trầm cảm)',
          hoatChatGoiY: 'Mirtazapine 7.5-15mg hoặc Trazodone 25-50mg',
          lieuDungChuan: 'Uống buổi tối trước khi ngủ',
          luuY: 'Mirtazapine có thể gây tăng cân.',
        },
      ],
      khongDungThuoc: [
        'Đi ngủ và thức dậy đúng giờ; hạn chế ngủ ngày > 30 phút.',
        'Tránh cà phê, trà, rượu sau 14 giờ; không dùng điện thoại trên giường.',
        'Tập thể dục ban ngày, thư giãn trước khi ngủ.',
      ],
    },
    dauHieuNguyHiem: ['Có ý tưởng tự sát, trầm cảm nặng; ngáy to kèm ngưng thở khi ngủ.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  {
    id: 'BYT_F32',
    maIcd10: 'F32.9 - Giai đoạn trầm cảm, không xác định',
    tenBenh: 'Rối loạn trầm cảm',
    chuyenKhoa: 'Tâm thần',
    quyetDinhByt: 'Quyết định số 2058/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các rối loạn tâm thần thường gặp)',
    namBanHanh: 2020,
    tuKhoaTrieuChung: [
      'trầm cảm', 'buồn chán', 'mất hứng thú', 'chán nản', 'không muốn làm gì', 'tự ti', 'muốn chết',
      'ý nghĩ tự sát', 'mất ngủ', 'chán ăn', 'mệt mỏi kéo dài', 'giảm tập trung',
    ],
    tieuChuanChanDoan: [
      'ICD-10: ≥ 2 triệu chứng chính (khí sắc trầm, mất hứng thú, giảm năng lượng) + ≥ 2 triệu chứng phổ biến khác, kéo dài ≥ 2 tuần.',
      'Đánh giá mức độ bằng PHQ-9; luôn hỏi ý tưởng / hành vi tự sát.',
    ],
    canLamSangKhuyenNghi: [
      'Thang PHQ-9 / Beck / Hamilton',
      'TSH, công thức máu, Glucose (loại trừ nguyên nhân thực thể)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Liệu pháp tâm lý + thuốc chống trầm cảm (SSRI là lựa chọn đầu tay); duy trì ≥ 6-12 tháng sau khi thuyên giảm.',
      thuocDauTay: [
        {
          nhomThuoc: 'Ức chế tái hấp thu chọn lọc Serotonin (SSRI)',
          hoatChatGoiY: 'Sertraline 50mg hoặc Escitalopram 10mg / Fluoxetine 20mg',
          lieuDungChuan: 'Uống 1 viên/ngày buổi sáng sau ăn; tác dụng sau 2-4 tuần',
          luuY: 'Theo dõi ý tưởng tự sát trong những tuần đầu, đặc biệt người < 25 tuổi; không ngừng đột ngột.',
        },
      ],
      khongDungThuoc: [
        'Tư vấn, liệu pháp nhận thức hành vi; tăng hoạt động thể chất, duy trì kết nối xã hội.',
        'Tránh rượu bia, chất kích thích.',
      ],
    },
    dauHieuNguyHiem: ['Có ý tưởng / kế hoạch tự sát, loạn thần, bỏ ăn uống — chuyển chuyên khoa Tâm thần ngay.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 tuần, sau đó mỗi 4 tuần.',
  },
  {
    id: 'BYT_G51',
    maIcd10: 'G51.0 - Liệt Bell (liệt dây thần kinh VII ngoại biên)',
    tenBenh: 'Liệt dây thần kinh mặt ngoại biên (Liệt Bell)',
    chuyenKhoa: 'Thần kinh',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thần kinh của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'liệt mặt', 'méo miệng', 'méo mặt', 'không nhắm được mắt', 'liệt dây 7', 'liệt dây thần kinh số 7',
      'trúng gió', 'mặt lệch',
    ],
    tieuChuanChanDoan: [
      'Liệt nửa mặt khởi phát cấp (< 72 giờ): mất nếp nhăn trán, mắt nhắm không kín (dấu Charles Bell), miệng méo sang bên lành.',
      'Không có dấu hiệu thần kinh khu trú khác (loại trừ đột quỵ — liệt mặt trung ương không mất nếp nhăn trán).',
    ],
    canLamSangKhuyenNghi: [
      'Khám thần kinh toàn diện',
      'Glucose máu, HbA1c',
      'CT / MRI sọ não khi có dấu hiệu bất thường khác',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Corticoid đường uống sớm trong 72 giờ đầu, bảo vệ mắt, phục hồi chức năng.',
      thuocDauTay: [
        {
          nhomThuoc: 'Corticoid',
          hoatChatGoiY: 'Prednisolone 5mg',
          lieuDungChuan: '50-60mg/ngày x 5 ngày, sau đó giảm liều dần trong 5 ngày; uống buổi sáng sau ăn',
          luuY: 'Thận trọng đái tháo đường, loét dạ dày, tăng huyết áp; có thể phối hợp Valacyclovir khi liệt nặng.',
        },
        {
          nhomThuoc: 'Bảo vệ giác mạc',
          hoatChatGoiY: 'Nước mắt nhân tạo + mỡ tra mắt ban đêm',
          lieuDungChuan: 'Nhỏ 1-2 giọt x 4-6 lần/ngày',
          luuY: 'Đeo kính râm, băng mắt khi ngủ.',
        },
      ],
      khongDungThuoc: ['Xoa bóp, tập cơ mặt, châm cứu / vật lý trị liệu phục hồi chức năng.'],
    },
    dauHieuNguyHiem: ['Kèm yếu liệt tay chân, nói khó, đau đầu dữ dội (nghi đột quỵ); mụn nước ở tai (Zona tai).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 2 tuần.',
  },

  // ─── Cơ xương khớp ───
  {
    id: 'BYT_M17',
    maIcd10: 'M17.9 - Thoái hóa khớp gối, không xác định',
    tenBenh: 'Thoái hóa khớp gối',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'đau khớp gối', 'đau gối', 'đau đầu gối', 'thoái hóa khớp gối', 'lục cục khớp gối', 'sưng gối',
      'cứng khớp buổi sáng', 'đau khi lên xuống cầu thang', 'đau khớp',
    ],
    tieuChuanChanDoan: [
      'ACR: đau khớp gối + ≥ 1 trong: tuổi > 38, cứng khớp buổi sáng < 30 phút, lạo xạo khi cử động, gai xương trên X-quang.',
      'X-quang: hẹp khe khớp, gai xương, đặc xương dưới sụn (phân độ Kellgren-Lawrence).',
    ],
    canLamSangKhuyenNghi: [
      'X-quang khớp gối thẳng - nghiêng (tư thế đứng)',
      'Siêu âm khớp gối (tràn dịch)',
      'Công thức máu, CRP, Acid uric (phân biệt viêm khớp khác)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau, duy trì vận động; giảm cân, tập cơ tứ đầu đùi; thuốc giảm đau theo bậc, NSAID ngắn ngày; thay khớp khi giai đoạn muộn.',
      thuocDauTay: [
        {
          nhomThuoc: 'Giảm đau / NSAID',
          hoatChatGoiY: 'Paracetamol 500mg; Celecoxib 200mg hoặc Meloxicam 7.5mg; NSAID bôi tại chỗ (Diclofenac gel)',
          lieuDungChuan: 'Celecoxib 1 viên/ngày sau ăn trong đợt đau, 7-14 ngày',
          luuY: 'Kiểm tra tiền sử loét dạ dày, suy thận, bệnh tim mạch.',
        },
        {
          nhomThuoc: 'Thuốc chống thoái hóa tác dụng chậm (SYSADOA)',
          hoatChatGoiY: 'Glucosamine sulfate 1500mg hoặc Diacerein 50mg',
          lieuDungChuan: 'Glucosamine 1500mg/ngày; Diacerein 50mg x 2 lần/ngày',
          luuY: 'Diacerein có thể gây tiêu chảy.',
        },
      ],
      khongDungThuoc: [
        'Giảm cân, tránh ngồi xổm, quỳ gối, leo cầu thang nhiều.',
        'Tập mạnh cơ tứ đầu đùi, đạp xe, bơi lội; dùng gậy khi đau nhiều.',
      ],
    },
    dauHieuNguyHiem: ['Khớp sưng nóng đỏ, sốt (nghi viêm khớp nhiễm khuẩn).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  {
    id: 'BYT_M47',
    maIcd10: 'M47.8 - Thoái hóa cột sống cổ / Đau vai gáy',
    tenBenh: 'Thoái hóa cột sống cổ / Hội chứng cổ vai',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'đau vai gáy', 'đau cổ', 'mỏi cổ', 'cứng cổ', 'đau cổ vai', 'thoái hóa đốt sống cổ', 'tê tay',
      'đau lan xuống tay', 'vẹo cổ', 'đau mỏi vai gáy',
    ],
    tieuChuanChanDoan: [
      'Đau vùng cổ gáy, hạn chế vận động cổ, có thể lan xuống vai tay kèm tê bì (chèn ép rễ thần kinh).',
      'X-quang cột sống cổ: gai xương, hẹp khe đĩa đệm, mất đường cong sinh lý.',
    ],
    canLamSangKhuyenNghi: [
      'X-quang cột sống cổ thẳng - nghiêng - chếch 3/4',
      'MRI cột sống cổ khi có dấu hiệu chèn ép rễ / tủy',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau, giãn cơ, vật lý trị liệu; điều chỉnh tư thế làm việc.',
      thuocDauTay: [
        {
          nhomThuoc: 'NSAID / Giảm đau',
          hoatChatGoiY: 'Meloxicam 7.5mg hoặc Etoricoxib 60mg / Paracetamol 500mg',
          lieuDungChuan: 'Uống 1 viên/ngày sau ăn no, 5-10 ngày',
          luuY: 'Phối hợp PPI nếu nguy cơ dạ dày.',
        },
        {
          nhomThuoc: 'Giãn cơ',
          hoatChatGoiY: 'Eperisone 50mg',
          lieuDungChuan: 'Uống 1 viên x 3 lần/ngày sau ăn',
          luuY: 'Có thể buồn ngủ nhẹ.',
        },
        {
          nhomThuoc: 'Vitamin nhóm B (khi tê bì)',
          hoatChatGoiY: 'Vitamin B1 + B6 + B12',
          lieuDungChuan: 'Uống 1 viên x 2 lần/ngày',
          luuY: '',
        },
      ],
      khongDungThuoc: [
        'Không cúi đầu dùng điện thoại lâu, chỉnh màn hình máy tính ngang tầm mắt, gối thấp.',
        'Chườm ấm, tập các bài vận động cổ nhẹ nhàng.',
      ],
    },
    dauHieuNguyHiem: ['Yếu tay chân, đi lại khó khăn, rối loạn tiểu tiện (chèn ép tủy cổ).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 1 - 2 tuần.',
  },
  {
    id: 'BYT_M75',
    maIcd10: 'M75.0 - Viêm quanh khớp vai / Đông cứng khớp vai',
    tenBenh: 'Viêm quanh khớp vai',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'đau vai', 'đau khớp vai', 'không giơ tay được', 'cứng vai', 'đông cứng vai', 'đau vai về đêm',
      'hạn chế vận động vai', 'viêm quanh khớp vai',
    ],
    tieuChuanChanDoan: [
      'Đau vùng khớp vai, tăng khi vận động (giơ tay, chải đầu, mặc áo), đau về đêm; có thể hạn chế vận động thụ động (đông cứng vai).',
      'Siêu âm: viêm gân chóp xoay, viêm gân nhị đầu, viêm túi thanh dịch dưới mỏm cùng vai.',
    ],
    canLamSangKhuyenNghi: [
      'Siêu âm khớp vai',
      'X-quang khớp vai (vôi hóa gân)',
      'MRI khớp vai khi nghi rách chóp xoay',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Giảm đau chống viêm, vật lý trị liệu và tập vận động sớm; tiêm Corticoid tại chỗ khi cần (do bác sĩ chuyên khoa).',
      thuocDauTay: [
        {
          nhomThuoc: 'NSAID',
          hoatChatGoiY: 'Celecoxib 200mg hoặc Meloxicam 15mg',
          lieuDungChuan: 'Uống 1 viên/ngày sau ăn, 7-14 ngày',
          luuY: 'Thận trọng dạ dày, tim mạch, thận.',
        },
      ],
      khongDungThuoc: [
        'Tập con lắc Codman, leo tường bằng ngón tay; chườm ấm / lạnh.',
        'Tránh mang vác nặng, tránh động tác giơ tay quá đầu lặp lại.',
      ],
    },
    dauHieuNguyHiem: ['Mất hoàn toàn khả năng giơ tay sau chấn thương (rách chóp xoay); đau vai trái kèm khó thở, vã mồ hôi (loại trừ bệnh tim).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 tuần.',
  },
  {
    id: 'BYT_M06',
    maIcd10: 'M06.9 - Viêm khớp dạng thấp, không xác định',
    tenBenh: 'Viêm khớp dạng thấp',
    chuyenKhoa: 'Cơ xương khớp',
    quyetDinhByt: 'Quyết định số 361/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh Cơ xương khớp)',
    namBanHanh: 2014,
    tuKhoaTrieuChung: [
      'viêm khớp dạng thấp', 'sưng đau nhiều khớp', 'đau khớp ngón tay', 'cứng khớp buổi sáng',
      'sưng khớp cổ tay', 'đau khớp đối xứng', 'biến dạng khớp', 'đau khớp',
    ],
    tieuChuanChanDoan: [
      'ACR/EULAR 2010 (≥ 6/10 điểm): số khớp viêm (ưu tiên khớp nhỏ bàn tay, cổ tay, đối xứng), RF / Anti-CCP, CRP / tốc độ máu lắng, thời gian ≥ 6 tuần.',
      'Cứng khớp buổi sáng > 1 giờ.',
    ],
    canLamSangKhuyenNghi: [
      'RF, Anti-CCP',
      'CRP, tốc độ máu lắng, công thức máu',
      'Men gan, Creatinine (trước khi dùng Methotrexate)',
      'X-quang hai bàn tay',
      'HBsAg, Anti-HCV, X-quang phổi (sàng lọc trước điều trị)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị sớm bằng thuốc chống thấp làm thay đổi bệnh (DMARDs), Methotrexate là thuốc nền; Corticoid liều thấp ngắn hạn kiểm soát đợt viêm.',
      thuocDauTay: [
        {
          nhomThuoc: 'DMARDs kinh điển',
          hoatChatGoiY: 'Methotrexate 2.5mg + Acid folic 5mg',
          lieuDungChuan: 'Methotrexate 10-15mg MỘT LẦN/TUẦN, tăng dần đến 20-25mg/tuần; Acid folic 5mg/tuần (ngày khác)',
          luuY: 'Chỉ uống 1 lần mỗi tuần — dặn kỹ bệnh nhân; theo dõi công thức máu, men gan mỗi 1-3 tháng; chống chỉ định khi có thai.',
        },
        {
          nhomThuoc: 'Corticoid liều thấp (bắc cầu)',
          hoatChatGoiY: 'Methylprednisolone 4mg / Prednisolone 5mg',
          lieuDungChuan: '5-10mg/ngày buổi sáng, giảm dần và ngừng trong 3 tháng',
          luuY: 'Bổ sung Calci, Vitamin D khi dùng kéo dài.',
        },
      ],
      khongDungThuoc: ['Tập vận động khớp nhẹ nhàng, giữ ấm, bỏ thuốc lá.'],
    },
    dauHieuNguyHiem: ['Sốt, ho, khó thở khi dùng Methotrexate (viêm phổi do thuốc); loét miệng, bầm tím (ức chế tủy).'],
    lichTaiKhamKhuyenNghi: 'Tái khám mỗi 1 - 3 tháng.',
  },

  // ─── Da liễu ───
  {
    id: 'BYT_L20',
    maIcd10: 'L20.9 - Viêm da cơ địa, không xác định',
    tenBenh: 'Viêm da cơ địa (Chàm thể tạng)',
    chuyenKhoa: 'Da liễu',
    quyetDinhByt: 'Quyết định số 75/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'chàm', 'eczema', 'viêm da cơ địa', 'ngứa', 'da khô', 'mẩn đỏ', 'bong vảy', 'nổi mụn nước ngứa',
      'da dày sần', 'chảy dịch ở da',
    ],
    tieuChuanChanDoan: [
      'Ngứa mạn tính, tái phát; tổn thương dát đỏ, mụn nước, chảy dịch (cấp) hoặc da dày, liken hóa (mạn) ở nếp gấp, mặt, cổ.',
      'Tiền sử bản thân / gia đình có cơ địa dị ứng (hen, viêm mũi dị ứng).',
    ],
    canLamSangKhuyenNghi: [
      'IgE toàn phần, công thức máu (bạch cầu ái toan)',
      'Soi nấm (phân biệt nấm da)',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Dưỡng ẩm hàng ngày là nền tảng; Corticoid bôi đợt cấp; kháng Histamin giảm ngứa; tránh yếu tố kích thích.',
      thuocDauTay: [
        {
          nhomThuoc: 'Corticoid bôi',
          hoatChatGoiY: 'Hydrocortisone 1% (mặt, nếp gấp) hoặc Mometasone 0.1% / Betamethasone (thân mình)',
          lieuDungChuan: 'Bôi lớp mỏng 1-2 lần/ngày, 1-2 tuần',
          luuY: 'Không bôi kéo dài (teo da, giãn mạch); tránh Corticoid mạnh ở mặt.',
        },
        {
          nhomThuoc: 'Kháng Histamin H1',
          hoatChatGoiY: 'Cetirizine 10mg hoặc Desloratadine 5mg',
          lieuDungChuan: 'Uống 1 viên/ngày buổi tối',
          luuY: '',
        },
      ],
      khongDungThuoc: [
        'Bôi kem dưỡng ẩm ≥ 2 lần/ngày, tắm nước ấm ngắn, dùng sữa tắm dịu nhẹ.',
        'Mặc quần áo cotton, tránh xà phòng, hóa chất, len dạ.',
      ],
    },
    dauHieuNguyHiem: ['Tổn thương chảy mủ, đóng vảy vàng, sốt (bội nhiễm); mụn nước lan nhanh (nghi chàm Kaposi do herpes).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 tuần.',
  },
  {
    id: 'BYT_B35',
    maIcd10: 'B35.4 - Nấm da thân / B35.6 Nấm bẹn',
    tenBenh: 'Nấm da (Hắc lào, nấm bẹn)',
    chuyenKhoa: 'Da liễu',
    quyetDinhByt: 'Quyết định số 75/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'nấm da', 'hắc lào', 'lác', 'nấm bẹn', 'ngứa bẹn', 'vòng tròn đỏ ngứa', 'nấm kẽ chân', 'ngứa kẽ chân',
      'lang ben', 'ngứa',
    ],
    tieuChuanChanDoan: [
      'Mảng đỏ hình tròn / bầu dục, bờ rõ có mụn nước, vảy, ranh giới lan rộng ra ngoài, trung tâm lành; rất ngứa.',
      'Soi tươi KOH thấy sợi nấm.',
    ],
    canLamSangKhuyenNghi: ['Soi tươi tìm nấm (KOH)', 'Nuôi cấy nấm khi tổn thương lan rộng / kháng trị'],
    phacDoDieuTri: {
      nguyenTac: 'Thuốc kháng nấm bôi cho tổn thương khu trú; kháng nấm đường uống khi lan rộng, tái phát, nấm tóc / móng.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng nấm bôi',
          hoatChatGoiY: 'Terbinafine 1% hoặc Ketoconazole 2% / Clotrimazole 1%',
          lieuDungChuan: 'Bôi 1-2 lần/ngày, rộng hơn tổn thương 2cm, 2-4 tuần, tiếp tục 1-2 tuần sau khi hết',
          luuY: 'Không bôi Corticoid đơn thuần lên tổn thương nấm.',
        },
        {
          nhomThuoc: 'Kháng nấm uống (lan rộng)',
          hoatChatGoiY: 'Itraconazole 100mg hoặc Terbinafine 250mg',
          lieuDungChuan: 'Itraconazole 100mg x 2 lần/ngày x 7 ngày; Terbinafine 250mg/ngày x 2 tuần',
          luuY: 'Kiểm tra men gan; Itraconazole có nhiều tương tác thuốc.',
        },
      ],
      khongDungThuoc: ['Giữ da khô thoáng, mặc đồ cotton, không dùng chung khăn, quần áo.'],
    },
    dauHieuNguyHiem: ['Tổn thương lan rộng toàn thân ở người suy giảm miễn dịch, bội nhiễm mủ.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 2 - 4 tuần.',
  },
  {
    id: 'BYT_B02',
    maIcd10: 'B02.9 - Zona không biến chứng',
    tenBenh: 'Zona thần kinh (Herpes Zoster)',
    chuyenKhoa: 'Da liễu / Truyền nhiễm',
    quyetDinhByt: 'Quyết định số 75/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'zona', 'giời leo', 'mụn nước thành chùm', 'đau rát da', 'mụn nước một bên', 'đau dây thần kinh',
      'bỏng rát da', 'herpes',
    ],
    tieuChuanChanDoan: [
      'Đau rát, tăng cảm giác da một bên cơ thể, sau 1-3 ngày xuất hiện mụn nước thành chùm trên nền da đỏ, phân bố theo dải thần kinh, không vượt quá đường giữa.',
    ],
    canLamSangKhuyenNghi: ['Chẩn đoán lâm sàng; Tzanck / PCR VZV khi không điển hình', 'HIV, Glucose ở người trẻ hoặc tái phát'],
    phacDoDieuTri: {
      nguyenTac: 'Thuốc kháng virus sớm trong 72 giờ, giảm đau, phòng bội nhiễm; zona mắt cần khám chuyên khoa mắt.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng virus',
          hoatChatGoiY: 'Acyclovir 800mg hoặc Valacyclovir 1000mg',
          lieuDungChuan: 'Acyclovir 800mg x 5 lần/ngày x 7 ngày; hoặc Valacyclovir 1g x 3 lần/ngày x 7 ngày',
          luuY: 'Hiệu chỉnh liều theo chức năng thận; uống nhiều nước.',
        },
        {
          nhomThuoc: 'Giảm đau (đau thần kinh)',
          hoatChatGoiY: 'Paracetamol 500mg; Gabapentin 300mg hoặc Pregabalin 75mg',
          lieuDungChuan: 'Gabapentin bắt đầu 300mg tối, tăng dần',
          luuY: 'Gây chóng mặt, buồn ngủ; giảm liều ở người suy thận.',
        },
      ],
      khongDungThuoc: ['Giữ sạch, không chọc vỡ mụn nước, bôi dung dịch sát khuẩn; mặc quần áo rộng.'],
    },
    dauHieuNguyHiem: ['Zona vùng mắt (nhánh V1), zona lan toàn thân, liệt mặt, người suy giảm miễn dịch.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 7 ngày.',
  },
  {
    id: 'BYT_L70',
    maIcd10: 'L70.0 - Trứng cá thông thường',
    tenBenh: 'Mụn trứng cá',
    chuyenKhoa: 'Da liễu',
    quyetDinhByt: 'Quyết định số 75/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['mụn trứng cá', 'nổi mụn', 'mụn mủ', 'mụn đầu đen', 'mụn bọc', 'mụn viêm', 'da dầu'],
    tieuChuanChanDoan: [
      'Nhân trứng cá (đầu đen, đầu trắng), sẩn viêm, mụn mủ, nang ở mặt, ngực, lưng; phân độ nhẹ - trung bình - nặng.',
    ],
    canLamSangKhuyenNghi: ['Chẩn đoán lâm sàng; xét nghiệm nội tiết khi nghi buồng trứng đa nang (nữ, kinh không đều)'],
    phacDoDieuTri: {
      nguyenTac: 'Nhẹ: thuốc bôi Retinoid / Benzoyl peroxide. Trung bình: thêm kháng sinh uống ngắn hạn. Nặng: Isotretinoin (chuyên khoa).',
      thuocDauTay: [
        {
          nhomThuoc: 'Thuốc bôi',
          hoatChatGoiY: 'Adapalene 0.1% + Benzoyl peroxide 2.5%',
          lieuDungChuan: 'Bôi lớp mỏng buổi tối',
          luuY: 'Gây khô, kích ứng; dùng kem chống nắng ban ngày.',
        },
        {
          nhomThuoc: 'Kháng sinh uống (mức độ trung bình)',
          hoatChatGoiY: 'Doxycycline 100mg',
          lieuDungChuan: 'Uống 1 viên/ngày sau ăn, tối đa 3 tháng, phối hợp thuốc bôi',
          luuY: 'Không dùng cho phụ nữ có thai, trẻ < 8 tuổi; uống với nhiều nước, không nằm ngay.',
        },
      ],
      khongDungThuoc: ['Rửa mặt 2 lần/ngày bằng sữa rửa mặt dịu nhẹ, không nặn mụn; hạn chế đồ ngọt, sữa.'],
    },
    dauHieuNguyHiem: ['Mụn bọc lớn, sẹo lõm tiến triển — chuyển chuyên khoa Da liễu.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 6 - 8 tuần.',
  },

  // ─── Truyền nhiễm ───
  {
    id: 'BYT_B01',
    maIcd10: 'B01.9 - Thủy đậu không biến chứng',
    tenBenh: 'Thủy đậu',
    chuyenKhoa: 'Truyền nhiễm / Da liễu',
    quyetDinhByt: 'Quyết định số 5642/QĐ-BYT của Bộ Y tế (Hướng dẫn chẩn đoán và điều trị bệnh truyền nhiễm)',
    namBanHanh: 2015,
    tuKhoaTrieuChung: ['thủy đậu', 'trái rạ', 'phỏng rạ', 'nổi mụn nước toàn thân', 'mụn nước', 'sốt nổi ban', 'ngứa'],
    tieuChuanChanDoan: [
      'Sốt nhẹ, sau đó nổi ban dát sẩn → mụn nước → đóng vảy, nhiều lứa tuổi tổn thương cùng lúc, mọc ở da đầu, mặt, thân mình, niêm mạc miệng.',
      'Có tiền sử tiếp xúc người bệnh thủy đậu 10-21 ngày trước.',
    ],
    canLamSangKhuyenNghi: ['Chẩn đoán lâm sàng; PCR VZV khi không điển hình', 'Công thức máu, X-quang phổi khi ho / khó thở'],
    phacDoDieuTri: {
      nguyenTac: 'Điều trị triệu chứng, chống bội nhiễm; kháng virus cho người lớn, phụ nữ có thai, suy giảm miễn dịch, trong 24-72 giờ đầu.',
      thuocDauTay: [
        {
          nhomThuoc: 'Kháng virus',
          hoatChatGoiY: 'Acyclovir 800mg',
          lieuDungChuan: 'Người lớn: 800mg x 5 lần/ngày x 7 ngày',
          luuY: 'Hiệu chỉnh liều theo chức năng thận.',
        },
        {
          nhomThuoc: 'Hạ sốt / Giảm ngứa',
          hoatChatGoiY: 'Paracetamol 500mg; Cetirizine 10mg; dung dịch Calamine bôi',
          lieuDungChuan: 'Paracetamol khi sốt ≥ 38.5°C; Cetirizine 1 viên/ngày',
          luuY: 'KHÔNG dùng Aspirin (hội chứng Reye), tránh NSAID (tăng nguy cơ nhiễm khuẩn da nặng).',
        },
      ],
      khongDungThuoc: ['Cách ly đến khi mụn nước đóng vảy hết; cắt ngắn móng tay, không gãi; tắm nước ấm nhẹ nhàng.'],
    },
    dauHieuNguyHiem: ['Ho, khó thở (viêm phổi thủy đậu); co giật, lơ mơ (viêm não); mụn nước có mủ, sưng đỏ lan (bội nhiễm).'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 5 - 7 ngày hoặc ngay khi có dấu hiệu nặng.',
  },

  // ─── Tiết niệu nam ───
  {
    id: 'BYT_N40',
    maIcd10: 'N40 - Tăng sản tuyến tiền liệt',
    tenBenh: 'Phì đại lành tính tuyến tiền liệt',
    chuyenKhoa: 'Thận - Tiết niệu / Nam khoa',
    quyetDinhByt: 'Hướng dẫn chẩn đoán và điều trị bệnh Thận - Tiết niệu của Bộ Y tế',
    namBanHanh: 2015,
    tuKhoaTrieuChung: [
      'phì đại tiền liệt tuyến', 'tiền liệt tuyến', 'tiểu đêm', 'tiểu khó', 'tiểu yếu', 'tiểu ngắt quãng',
      'tiểu không hết', 'tiểu nhiều lần', 'bí tiểu', 'tia nước tiểu yếu',
    ],
    tieuChuanChanDoan: [
      'Nam > 50 tuổi có triệu chứng đường tiểu dưới: tiểu đêm, tiểu khó, tia yếu, tiểu không hết; đánh giá bằng thang IPSS.',
      'Thăm trực tràng: tuyến tiền liệt to, mật độ chắc đều, không có nhân cứng.',
    ],
    canLamSangKhuyenNghi: [
      'Siêu âm tuyến tiền liệt và đo nước tiểu tồn lưu',
      'PSA toàn phần',
      'Tổng phân tích nước tiểu, Creatinine',
    ],
    phacDoDieuTri: {
      nguyenTac: 'Triệu chứng nhẹ: theo dõi. Trung bình - nặng: chẹn alpha ± ức chế 5-alpha reductase; phẫu thuật (TURP) khi bí tiểu tái diễn hoặc biến chứng.',
      thuocDauTay: [
        {
          nhomThuoc: 'Chẹn alpha-1',
          hoatChatGoiY: 'Tamsulosin 0.4mg hoặc Alfuzosin 10mg',
          lieuDungChuan: 'Uống 1 viên/ngày sau bữa ăn tối',
          luuY: 'Hạ huyết áp tư thế; báo bác sĩ nhãn khoa trước mổ đục thủy tinh thể.',
        },
        {
          nhomThuoc: 'Ức chế 5-alpha reductase (tuyến > 40ml)',
          hoatChatGoiY: 'Dutasteride 0.5mg hoặc Finasteride 5mg',
          lieuDungChuan: 'Uống 1 viên/ngày, hiệu quả sau 3-6 tháng',
          luuY: 'Làm giảm PSA khoảng 50% — nhân đôi giá trị PSA khi tầm soát ung thư.',
        },
      ],
      khongDungThuoc: ['Hạn chế uống nước buổi tối, giảm cà phê, rượu bia; không nhịn tiểu lâu.'],
    },
    dauHieuNguyHiem: ['Bí tiểu hoàn toàn, tiểu máu, sốt, suy thận.'],
    lichTaiKhamKhuyenNghi: 'Tái khám sau 4 - 6 tuần, sau đó 6 - 12 tháng/lần.',
  },
];
