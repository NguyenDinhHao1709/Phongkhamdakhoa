import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Calendar, ShieldCheck, Heart, User, LogIn,
  Search, ArrowRight, Activity, PhoneCall, CheckCircle2,
  FileText, Clock, MapPin, Award, BookOpen, UserCheck, X,
  Video, Building2, Ticket, ChevronRight, Check, Pill,
  Layers, FlaskConical, Sparkles, MessageCircle, Bot, Zap
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { apiGet } from '../../services/api';
import SearchResultsModal from './SearchResultsModal';
import SpecialtyDetailModal from './SpecialtyDetailModal';
import PublicDatLichModal from './PublicDatLichModal';
import AiTriageChatbot from './AiTriageChatbot';
import MedButton from '../../design-system/components/Button/MedButton';

const ROLE_HOME = {
  tiep_tan: '/tiep-tan',
  bac_si: '/bac-si',
  ky_thuat_vien: '/ky-thuat-vien',
  nhan_vien_nha_thuoc: '/nha-thuoc',
  nha_thuoc: '/nha-thuoc',
  thu_ngan: '/thu-ngan',
  quan_tri_vien: '/quan-tri',
  quan_tri_vien_cap_cao: '/quan-tri',
  ban_giam_doc: '/ban-giam-doc',
  benh_nhan: '/benh-nhan',
};

const SPECIALTIES_DATA = [
  {
    id: 'noi-tong-quat',
    title: 'Nội Tổng Quát & Tim Mạch',
    phong: 'Phòng 101 - 102',
    tang: 'Tầng 1 - Khu Khám Lâm Sàng',
    shortDesc: 'Tầm soát huyết áp, tim mạch, đái tháo đường, bệnh lý dạ dày tá tràng và bệnh nội tiết.',
    laGi: 'Khoa Nội Tổng Quát & Tim Mạch là chuyên khoa nòng cốt tại Phòng Khám Đa Khoa, chịu trách nhiệm tiếp đón ban đầu, thăm khám toàn diện, phát hiện sớm và điều trị các bệnh lý nội khoa phổ biến cũng như mạn tính ở người lớn. Khoa phối hợp chặt chẽ cùng các chuyên khoa Cận lâm sàng để đưa ra phác đồ điều trị chuẩn mực và tư vấn lối sống khoa học.',
    linhVuc: [
      {
        nhom: 'Bệnh lý Tim mạch & Huyết áp',
        chiTiet: 'Tầm soát và kiểm soát tăng huyết áp, bệnh cơ tim thiếu máu cục bộ, rối loạn nhịp tim, xơ vữa động mạch, suy tim mạn tính.'
      },
      {
        nhom: 'Nội tiết & Rối loạn chuyển hóa',
        chiTiet: 'Chẩn đoán và quản lý đái tháo đường (tiểu đường Type 1, Type 2), rối loạn lipid máu (mỡ máu cao), bệnh lý tuyến giáp (bướu cổ, cường giáp, suy giáp), hội chứng chuyển hóa.'
      },
      {
        nhom: 'Tiêu hóa & Gan mật',
        chiTiet: 'Khám và điều trị viêm loét dạ dày - tá tràng, trào ngược dạ dày thực quản (GERD), hội chứng ruột kích thích (IBS), viêm đại tràng, men gan cao, gan nhiễm mỡ.'
      },
      {
        nhom: 'Hô hấp & Thận - Tiết niệu nội khoa',
        chiTiet: 'Điều trị viêm phế quản cấp/mạn, hen phế quản, COPD; nhiễm trùng đường tiết niệu, theo dõi chức năng thận và sỏi thận nhỏ.'
      },
      {
        nhom: 'Khám sức khỏe tổng quát',
        chiTiet: 'Đánh giá sức khỏe toàn diện định kỳ, khám tầm soát nguy cơ đột quỵ và tim mạch cho người trung niên và cao tuổi.'
      }
    ],
    trangThietBi: [
      'Máy đo điện tim ECG 12 cần kỹ thuật số độ phân giải cao',
      'Máy theo dõi huyết áp liên tục (Holter huyết áp 24h)',
      'Hệ thống máy đo đường huyết mao mạch tức thì',
      'Bộ dụng cụ khám nội khoa chuẩn Bộ Y Tế'
    ],
    doiTuong: 'Người lớn có các biểu hiện: mệt mỏi kéo dài, đau tức ngực, khó thở, hồi hộp tim đập nhanh, hoa mắt chóng mặt, đầy bụng khó tiêu, sút cân hoặc cần kiểm tra sức khỏe tổng quát.'
  },
  {
    id: 'tai-mui-hong',
    title: 'Tai Mũi Họng',
    phong: 'Phòng 104',
    tang: 'Tầng 1 - Hành lang phía Tây',
    shortDesc: 'Nội soi tầm soát ung thư vòm họng, điều trị viêm amidan, viêm xoang mũi, viêm tai giữa.',
    laGi: 'Khoa Tai Mũi Họng chuyên trách khám, phát hiện và điều trị toàn diện các bệnh lý cấp và mạn tính thuộc hệ thống Tai - Mũi - Xoang - Họng - Thanh quản ở cả người lớn và trẻ em. Khoa được trang bị hệ thống nội soi ống mềm tiên tiến, giúp phát hiện sớm các tổn thương tiền ung thư vùng tai mũi họng một cách êm ái, không đau rát.',
    linhVuc: [
      {
        nhom: 'Bệnh lý về Mũi & Xoang',
        chiTiet: 'Khám và điều trị viêm mũi dị ứng, viêm mũi vận mạch, viêm xoang cấp và mạn tính, polyp mũi, gai vách ngăn, phì đại cuốn mũi gây nghẹt thở.'
      },
      {
        nhom: 'Bệnh lý về Họng & Thanh quản',
        chiTiet: 'Điều trị viêm họng cấp/hạt mạn tính, viêm amidan hốc mủ, hạt xơ dây thanh, polyp dây thanh quản gây khàn tiếng kéo dài, trào ngược họng - thanh quản (LPR).'
      },
      {
        nhom: 'Bệnh lý về Tai',
        chiTiet: 'Chẩn đoán và điều trị viêm tai giữa cấp/mạn, viêm tai ngoài, thủng màng nhĩ, ù tai, suy giảm thính lực, nấm ống tai, lấy ráy tai tích tụ an toàn.'
      },
      {
        nhom: 'Nội soi & Tầm soát ung thư',
        chiTiet: 'Nội soi tầm soát sớm ung thư vòm họng, ung thư hạ họng - thanh quản, phát hiện u xơ vòm mũi họng ở giai đoạn sớm.'
      },
      {
        nhom: 'Thủ thuật can thiệp tại chỗ',
        chiTiet: 'Rửa xoang, hút dịch mũi xoang, làm thuốc tai, xông khí dung mũi họng, gắp dị vật tai - mũi - họng an toàn.'
      }
    ],
    trangThietBi: [
      'Hệ thống nội soi tai mũi họng ống mềm kỹ thuật số Full HD (Karl Storz)',
      'Máy hút rửa xoang áp lực âm điều chỉnh vi lượng',
      'Máy xông khí dung siêu âm hạt mịn khuếch tán sâu',
      'Kính hiển vi soi tai chuyên dụng'
    ],
    doiTuong: 'Người bị nghẹt mũi kéo dài, sổ mũi đục, đau nhức vùng mặt trán, khàn tiếng trên 2 tuần, đau rát họng khi nuốt, đau tai, chảy mủ tai hoặc nghe kém.'
  },
  {
    id: 'nhi-khoa',
    title: 'Nhi Khoa',
    phong: 'Phòng 103',
    tang: 'Tầng 1 - Khu vực thân thiện trẻ em',
    shortDesc: 'Khám và điều trị các bệnh lý hô hấp, tiêu hóa, dinh dưỡng và tiêm chủng cho trẻ nhỏ.',
    laGi: 'Khoa Nhi là chuyên khoa chăm sóc sức khỏe toàn diện cho trẻ em từ sơ sinh đến dưới 16 tuổi. Với không gian khám thân thiện, vui tươi cùng đội ngũ bác sĩ nhi giàu kinh nghiệm, thấu hiểu tâm lý trẻ nhỏ, khoa giúp các bé vượt qua nỗi sợ khám bệnh, chẩn đoán chính xác và hạn chế tối đa việc lạm dụng kháng sinh.',
    linhVuc: [
      {
        nhom: 'Bệnh lý Hô hấp Nhi',
        chiTiet: 'Khám và điều trị viêm đường hô hấp trên, viêm thanh khí phế quản, viêm tiểu phế quản, viêm phổi, hen suyễn trẻ em, ho kéo dài.'
      },
      {
        nhom: 'Bệnh lý Tiêu hóa & Chuyển hóa',
        chiTiet: 'Điều trị tiêu chảy cấp, rối loạn tiêu hóa, trào ngược dạ dày thực quản ở trẻ nhỏ, táo bón mạn tính, hội chứng kém hấp thu, đau bụng tái diễn.'
      },
      {
        nhom: 'Bệnh truyền nhiễm & Nhiệt đới',
        chiTiet: 'Chẩn đoán và theo dõi sốt phát ban, tay chân miệng, sốt xuất huyết Dengue, cúm mùa, thủy đậu, sởi, quai bị.'
      },
      {
        nhom: 'Tư vấn Dinh dưỡng & Phát triển thể chất',
        chiTiet: 'Đánh giá biểu đồ tăng trưởng, tư vấn điều trị biếng ăn, suy dinh dưỡng, còi xương thiếu vitamin D, béo phì, chậm tăng chiều cao.'
      },
      {
        nhom: 'Tư vấn tiêm chủng & Chăm sóc sơ sinh',
        chiTiet: 'Khám sàng lọc trước tiêm chủng, tư vấn phác đồ tiêm ngừa vắc xin theo độ tuổi, hướng dẫn nuôi con bằng sữa mẹ và ăn dặm khoa học.'
      }
    ],
    trangThietBi: [
      'Ống nghe tim phổi nhi chuyên dụng Littmann',
      'Hệ thống đo nồng độ SpO2 cảm ứng mềm dành riêng cho trẻ sơ sinh và trẻ nhỏ',
      'Cân điện tử và thước đo nhân trắc học tiêu chuẩn WHO',
      'Khu vực vui chơi và ghế khám bệnh hoạt hình giảm áp lực tâm lý'
    ],
    doiTuong: 'Trẻ em có triệu chứng: sốt, ho, thở khò khè, nôn trớ, tiêu chảy, phát ban da, biếng ăn, chậm tăng cân hoặc cần kiểm tra phát triển định kỳ.'
  },
  {
    id: 'co-xuong-khop',
    title: 'Cơ Xương Khớp & PHCN',
    phong: 'Phòng 106',
    tang: 'Tầng 1 - Cạnh khu vật lý trị liệu',
    shortDesc: 'Điều trị thoái hóa cột sống, viêm khớp, đau thần kinh tọa và phục hồi chức năng.',
    laGi: 'Chuyên khoa Cơ Xương Khớp & Phục Hồi Chức Năng kết hợp chặt chẽ giữa y học hiện đại và các liệu pháp vận động trị liệu không dùng thuốc, nhằm giảm đau an toàn, phục hồi biên độ vận động khớp và cải thiện chất lượng cuộc sống cho bệnh nhân gặp các vấn đề về hệ vận động, xương khớp và cột sống.',
    linhVuc: [
      {
        nhom: 'Bệnh lý Cột sống',
        chiTiet: 'Chẩn đoán và điều trị thoái hóa cột sống cổ, thắt lưng; thoát vị đĩa đệm; đau thần kinh tọa; đau mỏi vai gáy; vẹo cột sống tư thế.'
      },
      {
        nhom: 'Bệnh lý Khớp & Xương',
        chiTiet: 'Điều trị thoái hóa khớp gối, khớp háng; viêm khớp dạng thấp; viêm cột sống dính khớp; viêm gân gót; hội chứng ống cổ tay; loãng xương.'
      },
      {
        nhom: 'Bệnh lý Gout & Rối loạn Acid Uric',
        chiTiet: 'Kiểm soát cơn Gout cấp tính, điều trị hạ acid uric máu mạn tính, phòng ngừa biến dạng khớp và biến chứng thận do Gout.'
      },
      {
        nhom: 'Vật lý trị liệu & Phục hồi chức năng',
        chiTiet: 'Kéo giãn cột sống cổ - thắt lưng tự động, siêu âm trị liệu sâu, điện xung giảm đau TENS, sóng ngắn nhiệt trị liệu, laser công suất thấp.'
      },
      {
        nhom: 'Can thiệp giảm đau tại chỗ',
        chiTiet: 'Tiêm nội khớp dưới hướng dẫn siêu âm (tiêm chất nhờn Acid Hyaluronic, tiêm kháng viêm điểm bám gân, tiêm huyết tương giàu tiểu cầu PRP).'
      }
    ],
    trangThietBi: [
      'Máy kéo giãn cột sống cổ và thắt lưng điều khiển vi tính',
      'Máy siêu âm trị liệu đa tần số kết hợp điện xung TENS',
      'Hệ thống máy đo mật độ xương (DEXA) tầm soát loãng xương',
      'Bộ tạ, giường tập vận động phục hồi chức năng chuyên dụng'
    ],
    doiTuong: 'Người bị đau lưng, đau mỏi cổ vai gáy, cứng khớp buổi sáng, sưng đau khớp gối/ngón chân, tê bì chân tay, hạn chế vận động hoặc sau chấn thương thể thao.'
  },
  {
    id: 'da-lieu',
    title: 'Da Liễu & Thẩm Mỹ Y Khoa',
    phong: 'Phòng 105',
    tang: 'Tầng 1 - Khu Thẩm mỹ da',
    shortDesc: 'Khám và điều trị viêm da cơ địa, mụn trứng cá, nấm da, tầm soát dị ứng da.',
    laGi: 'Chuyên khoa Da Liễu & Thẩm Mỹ Y Khoa chuyên sâu trong việc khám, chẩn đoán căn nguyên và điều trị dứt điểm các bệnh lý da liễu tổng quát (da, tóc, móng) cũng như ứng dụng các công nghệ điều trị da thẩm mỹ an toàn, chuẩn y khoa do trực tiếp bác sĩ chuyên khoa da liễu thực hiện.',
    linhVuc: [
      {
        nhom: 'Bệnh lý Da liễu phổ biến',
        chiTiet: 'Khám và điều trị mụn trứng cá mọi mức độ (mụn bọc, mụn viêm, mụn ẩn), viêm da tiết bã, viêm da tiếp xúc, viêm nang lông, chốc lở.'
      },
      {
        nhom: 'Bệnh da dị ứng & Tự miễn',
        chiTiet: 'Điều trị viêm da cơ địa (chàm - Eczema), mề đay cấp và mạn tính, vảy nến, tổ đỉa, tầm soát nguyên nhân dị ứng mỹ phẩm và thời tiết.'
      },
      {
        nhom: 'Bệnh nhiễm trùng da do Vi nấm - Virus - Ký sinh trùng',
        chiTiet: 'Xét nghiệm và điều trị nấm da (hắc lào, lang ben, nấm móng), Zona thần kinh, thủy đậu, ghẻ, mụn cóc hạt cơm, u mềm lây.'
      },
      {
        nhom: 'Thẩm mỹ & Can thiệp da chuẩn Y khoa',
        chiTiet: 'Trị sẹo rỗ, trẻ hóa da bằng Laser CO2 Fractional; peel da sinh học y khoa; lấy nhân mụn chuẩn vô khuẩn; điện di dưỡng chất phục hồi da hư tổn.'
      },
      {
        nhom: 'Tiểu phẫu da liễu nhẹ',
        chiTiet: 'Đốt nốt ruồi, tẩy mụn thịt quanh mắt, đốt u nhú da, mắt cá chân bằng công nghệ Laser vi điểm không để lại sẹo xấu.'
      }
    ],
    trangThietBi: [
      'Hệ thống máy Laser CO2 Fractional vi điểm tái tạo bề mặt da',
      'Kính soi da kỹ thuật số phóng đại Dermatoscope tầm soát tổn thương hắc tố',
      'Đèn Wood soi phát hiện vi nấm và sắc tố da',
      'Tủ hấp vô trùng dụng cụ y tế và máy điện di ion dưỡng chất'
    ],
    doiTuong: 'Người bị mụn dai dẳng, ngứa da, nổi mẩn đỏ, bong tróc vảy, sạm nám tàn nhang, rụng tóc nhiều, có nốt ruồi bất thường hoặc cần phục hồi da.'
  },
  {
    id: 'cdha',
    title: 'Chẩn Đoán Hình Ảnh (CĐHA)',
    phong: 'Phòng 201 - 203',
    tang: 'Tầng 2 - Khu Cận Lâm Sàng Kỹ Thuật Cao',
    shortDesc: 'Siêu âm màu 4D, Doppler tim mạch máu, chụp X-quang kỹ thuật số DR cao tần.',
    laGi: 'Khoa Chẩn Đoán Hình Ảnh giữ vai trò "mắt thần" của phòng khám, ứng dụng các công nghệ chẩn đoán hình ảnh tiên tiến nhất hiện nay để cung cấp các hình ảnh trực quan, sắc nét về cấu trúc bên trong cơ thể. Kết quả hình ảnh chính xác giúp các bác sĩ lâm sàng phát hiện sớm bệnh lý ngay cả khi chưa có triệu chứng rõ ràng.',
    linhVuc: [
      {
        nhom: 'Siêu âm Tổng quát & Chuyên khoa',
        chiTiet: 'Siêu âm ổ bụng tổng quát (gan, mật, tụy, lách, thận, bàng quang, tiền liệt tuyến), siêu âm tuyến giáp, tuyến vú, tinh hoàn, phần mềm và khớp.'
      },
      {
        nhom: 'Siêu âm Doppler Tim & Mạch máu chuyên sâu',
        chiTiet: 'Siêu âm Doppler tim đánh giá chức năng tâm thu/tâm trương, bệnh van tim; siêu âm Doppler động mạch cảnh tầm soát nguy cơ đột quỵ; Doppler tĩnh mạch chi dưới phát hiện suy giãn tĩnh mạch và huyết khối.'
      },
      {
        nhom: 'Siêu âm Sản Phụ khoa & Dị tật thai nhi',
        chiTiet: 'Siêu âm thai màu 4D/5D theo dõi hình thái học thai nhi, siêu âm tử cung - buồng trứng qua đường bụng và đầu dò âm đạo.'
      },
      {
        nhom: 'X-quang Kỹ thuật số DR liều thấp',
        chiTiet: 'Chụp X-quang tim phổi thẳng/nghiêng tầm soát bệnh lý phổi; X-quang cột sống cổ, ngực, thắt lưng; X-quang hệ xương khớp; X-quang xoang sọ mặt và bụng không chuẩn bị.'
      }
    ],
    trangThietBi: [
      'Máy siêu âm màu 4D/5D Doppler GE Healthcare (Mỹ) với đa đầu dò chuyên dụng',
      'Hệ thống chụp X-quang kỹ thuật số DR cao tần liều bức xạ thấp an toàn tuyệt đối',
      'Phòng chụp chì đạt chuẩn kiểm định an toàn bức xạ của Sở Y Tế',
      'Hệ thống lưu trữ và truyền hình ảnh y khoa số hóa PACS'
    ],
    doiTuong: 'Bệnh nhân được bác sĩ chỉ định kiểm tra cận lâm sàng, người cần siêu âm kiểm tra sức khỏe định kỳ, phụ nữ mang thai hoặc nghi ngờ tổn thương xương khớp.'
  },
  {
    id: 'xet-nghiem',
    title: 'Xét Nghiệm Y Khoa',
    phong: 'Phòng 202',
    tang: 'Tầng 2 - Trung Tâm Xét Nghiệm Đạt Chuẩn',
    shortDesc: 'Hệ thống máy xét nghiệm huyết học 24 thông số, sinh hóa máu tự động, miễn dịch.',
    laGi: 'Khoa Xét Nghiệm Y Khoa đạt tiêu chuẩn An toàn sinh học Cấp II, cung cấp dịch vụ phân tích mẫu bệnh phẩm (máu, nước tiểu, dịch tiết) với độ tin cậy và độ lặp lại cao. Khoa áp dụng hệ thống kiểm chuẩn nội bộ và ngoại kiểm hàng ngày, đảm bảo kết quả chính xác và nhanh chóng nhất cho người bệnh.',
    linhVuc: [
      {
        nhom: 'Xét nghiệm Huyết học & Đông máu',
        chiTiet: 'Tổng phân tích tế bào máu ngoại vi 24 thông số (phát hiện thiếu máu, nhiễm trùng, bệnh bạch cầu), tốc độ máu lắng, xét nghiệm đông máu toàn bộ (PT, INR, APTT), định nhóm máu hệ ABO & Rh.'
      },
      {
        nhom: 'Xét nghiệm Sinh hóa Máu & Nước tiểu',
        chiTiet: 'Đánh giá chức năng gan (AST, ALT, GGT, Bilirubin); chức năng thận (Ure, Creatinine, Acid Uric); chuyển hóa đường (Glucose đói, HbA1c); bộ mỡ máu Bilan Lipid (Cholesterol toàn phần, Triglyceride, HDL-C, LDL-C); phân tích 10 thông số nước tiểu.'
      },
      {
        nhom: 'Xét nghiệm Miễn dịch & Tầm soát Ung thư sớm',
        chiTiet: 'Tầm soát ung thư gan (AFP), ung thư dạ dày - đại tràng (CEA, CA 19-9), ung thư phổi (Cyfra 21-1), ung thư tuyến tiền liệt (PSA), ung thư vú (CA 15-3); chức năng tuyến giáp (FT3, FT4, TSH); xét nghiệm viêm gan B, C, HIV.'
      },
      {
        nhom: 'Xét nghiệm Vi sinh & Ký sinh trùng',
        chiTiet: 'Test nhanh phát hiện vi khuẩn HP dạ dày qua máu/hơi thở; test cúm A/B; sốt xuất huyết Dengue NS1; xét nghiệm huyết thanh chẩn đoán giun đũa chó, sán lá gan.'
      }
    ],
    trangThietBi: [
      'Máy xét nghiệm huyết học tự động 24 thông số Sysmex (Nhật Bản)',
      'Hệ thống máy phân tích sinh hóa tự động hoàn toàn Roche Cobas (Thụy Sĩ)',
      'Máy xét nghiệm miễn dịch điện hóa phát quang thế hệ mới',
      'Máy ly tâm lạnh và tủ bảo quản mẫu bệnh phẩm chuyên dụng'
    ],
    doiTuong: 'Bệnh nhân có chỉ định xét nghiệm từ bác sĩ khám bệnh, người đăng ký gói khám sức khỏe tổng quát, phụ nữ chuẩn bị mang thai hoặc người cần kiểm tra chỉ số sinh hóa máu.'
  },
  {
    id: 'tieu-phau',
    title: 'Phòng Mổ Tiểu Phẫu & Hồi Tỉnh',
    phong: 'Phòng 204 - 205',
    tang: 'Tầng 2 - Khu Vô Trùng Cách Ly',
    shortDesc: 'Thực hiện thủ thuật ngoại khoa an toàn, phòng hồi tỉnh 8 giường theo dõi tích cực.',
    laGi: 'Phòng Mổ Tiểu Phẫu & Hồi Tỉnh là đơn vị ngoại khoa ban ngày của phòng khám, được xây dựng theo mô hình phòng mổ vô khuẩn một chiều đạt chuẩn Bộ Y Tế. Đơn vị chuyên tiếp nhận các ca tiểu phẫu, thủ thuật ngoại khoa nhẹ có thể ra về ngay trong ngày, kết hợp phòng hồi tỉnh tiện nghi giúp bệnh nhân nghỉ ngơi và theo dõi sát sao sau thủ thuật.',
    linhVuc: [
      {
        nhom: 'Tiểu phẫu Da & Mô dưới da',
        chiTiet: 'Phẫu thuật cắt bỏ bướu bã đậu (u bã đậu), bướu mỡ (Lipoma), nang bao hoạt dịch, u nhú da, nốt ruồi kích thước lớn; sinh thiết trọn u làm giải phẫu bệnh học.'
      },
      {
        nhom: 'Xử trí vết thương & Chấn thương phần mềm',
        chiTiet: 'Cắt lọc, làm sạch vết thương nhiễm trùng, khâu thẩm mỹ vết thương rách da vùng mặt và cơ thể bằng chỉ tự tiêu cao cấp; rút ống dẫn lưu; thay băng cắt chỉ vô khuẩn.'
      },
      {
        nhom: 'Tiểu phẫu Nam khoa & Móng',
        chiTiet: 'Cắt bao quy đầu thẩm mỹ bằng máy Stapler thế hệ mới (cắt và khâu tự động bằng ghim titan trong 5 phút, ít đau, không chảy máu, phục hồi nhanh); phẫu thuật tạo hình móng chọc thịt (chín mé) triệt để không tái phát.'
      },
      {
        nhom: 'Phòng Hồi Tỉnh Sau Thủ Thuật',
        chiTiet: 'Khu vực 8 giường bệnh hồi tỉnh đạt chuẩn tiện nghi, có hệ thống oxy đầu giường, máy theo dõi monitor sinh hiệu liên tục (mạch, nhiệt độ, huyết áp, SpO2) và điều dưỡng chăm sóc chu đáo trước khi bệnh nhân an tâm xuất viện.'
      }
    ],
    trangThietBi: [
      'Bàn mổ đa năng thủy lực điều khiển điện chuyên dụng',
      'Đèn mổ LED phẫu thuật hai nhánh ánh sáng lạnh không hắt bóng',
      'Hệ thống máy cắt đốt điện cao tần lưỡng cực cầm máu tức thì',
      'Máy theo dõi bệnh nhân đa thông số Monitor 5 thông số và hệ thống khử khuẩn không khí tia cực tím UV'
    ],
    doiTuong: 'Người có u nang dưới da cần bóc tách, vết thương phần mềm cần khâu tạo hình, nam giới cần cắt bao quy đầu hoặc bệnh nhân cần xử trí thủ thuật ngoại khoa nhẹ theo chỉ định.'
  }
];

const DOCTOR_SPECIALTY_TABS = [
  { id: 'noi-tong-quat', label: 'Nội Tổng Quát & Tim Mạch', matchWords: ['nội', 'tim mạch', 'tổng quát'] },
  { id: 'ngoai-khoa', label: 'Ngoại Khoa', matchWords: ['ngoại'] },
  { id: 'nhi-khoa', label: 'Nhi Khoa', matchWords: ['nhi'] },
  { id: 'tai-mui-hong', label: 'Tai Mũi Họng', matchWords: ['tai mũi họng', 'tai', 'mũi', 'họng'] },
  { id: 'co-xuong-khop', label: 'Cơ Xương Khớp & PHCN', matchWords: ['cơ xương khớp', 'khớp', 'cột sống', 'phcn'] },
  { id: 'da-lieu', label: 'Da Liễu & Thẩm Mỹ', matchWords: ['da liễu', 'da'] },
  { id: 'cdha', label: 'Chẩn Đoán Hình Ảnh', matchWords: ['chẩn đoán hình ảnh', 'cđha', 'siêu âm', 'x-quang'] },
  { id: 'xet-nghiem', label: 'Xét Nghiệm Y Khoa', matchWords: ['xét nghiệm', 'huyết học', 'sinh hóa'] },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, setUser } = useAuthStore();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchKeyword, setActiveSearchKeyword] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Specialty Detail Modal State
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);

  // Doctor Specialty Filter State
  const [selectedDoctorSpecialty, setSelectedDoctorSpecialty] = useState('noi-tong-quat');

  // Doctors State
  const [dbDoctors, setDbDoctors] = useState([]);

  // Medical Guidance Modal (Chatbot)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showChatBubble, setShowChatBubble] = useState(true);

  // Article Modal State
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Public Booking Modal State
  const [isPublicBookingOpen, setIsPublicBookingOpen] = useState(false);
  const [bookingHinhThuc, setBookingHinhThuc] = useState('truc_tiep');
  const [bookingDoctor, setBookingDoctor] = useState(null);

  useEffect(() => {
    fetchPublicDoctors();
  }, []);

  useEffect(() => {
    if (isAuthenticated && (!user?.hoTen || user?.hoTen === user?.tenDangNhap)) {
      apiGet('/auth/me')
        .then((res) => {
          const userData = res?.data || res;
          if (userData && userData.hoTen) {
            setUser({ ...user, ...userData });
          }
        })
        .catch((err) => console.error('Lỗi nạp tên người dùng:', err));
    }
  }, [isAuthenticated, user?.hoTen, user?.tenDangNhap]);

  const fetchPublicDoctors = async () => {
    try {
      const res = await apiGet('/nhan-vien/bac-si-public');
      if (res.data) setDbDoctors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchKeyword(searchQuery.trim());
    setIsSearchModalOpen(true);
  };

  const handleBookingClick = (hinhThuc = 'truc_tiep', doctor = null, chuyenKhoa = null) => {
    const doctorParam = doctor?.id ? `&bacSiId=${doctor.id}` : '';
    const ckParam = chuyenKhoa ? `&chuyenKhoa=${encodeURIComponent(chuyenKhoa)}` : '';
    const target = `/benh-nhan/dat-lich?hinhThuc=${hinhThuc}${doctorParam}${ckParam}`;
    if (isAuthenticated && user?.vaiTro === 'benh_nhan') {
      navigate(target);
    } else {
      // Yêu cầu bắt buộc đăng nhập tài khoản trước khi đặt lịch khám
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
    }
  };

  const handleKioskClick = () => {
    if (isAuthenticated) {
      navigate('/kiosk');
    } else {
      // Yêu cầu bắt buộc đăng nhập trước khi dùng Kiosk & lấy số thứ tự
      navigate(`/login?redirect=${encodeURIComponent('/kiosk')}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-800 antialiased">
      {/* ─── MAIN HEALTHCARE NAVBAR ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3.5 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-gray-900 tracking-tight leading-none whitespace-nowrap">
                PHÒNG KHÁM ĐA KHOA
              </span>
              <span className="text-[11px] font-bold text-primary-700 tracking-wider uppercase mt-1 whitespace-nowrap">
                TRUNG TÂM Y KHOA CHẤT LƯỢNG CAO
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-8 text-sm font-bold text-gray-600 whitespace-nowrap">
            <a href="#hero" className="text-primary-700 hover:text-primary-800 transition-colors whitespace-nowrap">Trang chủ</a>
            <a href="#dich-vu" className="hover:text-primary-600 transition-colors whitespace-nowrap">Dịch vụ y tế</a>
            <a href="#chuyen-khoa" className="hover:text-primary-600 transition-colors whitespace-nowrap">Chuyên khoa</a>
            <a href="#bac-si" className="hover:text-primary-600 transition-colors whitespace-nowrap">Đội ngũ Bác sĩ</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  const targetHome = ROLE_HOME[user?.vaiTro] || '/';
                  navigate(targetHome);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <User className="h-4 w-4" />
                <span>{user?.vaiTro === 'benh_nhan' ? 'Cổng Bệnh Nhân' : 'Hệ Thống Làm Việc'} ({user?.hoTen || user?.tenDangNhap})</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="h-4 w-4 text-gray-500" /> Đăng nhập
                </button>
                <button
                  onClick={() => handleBookingClick('truc_tiep')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Calendar className="h-4 w-4" /> Đặt lịch khám
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION: Y TẾ ĐÍCH THỰC & UY TÍN ───────────────────── */}
      <section id="hero" className="bg-white py-12 lg:py-16 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary-800 border border-blue-100">
                <ShieldCheck className="h-4 w-4 text-primary-600" /> Giấy phép hoạt động Khám chữa bệnh số 08922/BYT-GPHĐ
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-[35px] font-extrabold text-slate-900 leading-tight tracking-tight">
                Chăm Sóc Sức Khỏe Toàn Diện <br className="hidden sm:inline" />
                <span className="text-primary-600 font-extrabold">Chuẩn Mực & Tận Tâm Y Đức</span>
              </h1>

              <p className="text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
                Đội ngũ Bác sĩ Chuyên khoa II, Thạc sĩ Y học giàu kinh nghiệm từ các bệnh viện tuyến đầu. Hệ thống tiếp đón thông minh, không phải chờ đợi lâu, minh bạch hồ sơ bệnh án và đơn thuốc điện tử.
              </p>

              {/* Main Medical Search Bar */}
              <form onSubmit={handleSearchSubmit} className="max-w-2xl">
                <div className="flex items-center rounded-2xl bg-white p-2 shadow-md border border-slate-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  <Search className="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bác sĩ, chuyên khoa khám bệnh, cẩm nang sức khỏe..."
                    className="w-full bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors flex-shrink-0 shadow-xs"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-center lg:justify-start gap-2.5 pt-1">
                <button
                  onClick={() => handleBookingClick('truc_tiep')}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Building2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> Đặt Lịch Khám Tại Viện
                </button>
                <button
                  onClick={() => handleBookingClick('truc_tuyen')}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-blue-50 text-primary-700 border border-blue-200 font-bold text-xs sm:text-sm shadow-xs transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary-600" /> Khám Từ Xa Telehealth
                </button>
                <button
                  onClick={handleKioskClick}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0"
                >
                  <Ticket className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary-600" /> Lấy STT Tự Động
                </button>
              </div>
            </div>

            {/* Right Healthcare Trust Box */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200 space-y-5">
                <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Cam Kết Chất Lượng Y Tế</h3>
                    <p className="text-xs text-gray-500">Phục vụ hơn 50.000 lượt bệnh nhân mỗi năm</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">Chủ động thời gian khám</strong>
                      <span className="text-gray-600">Hẹn giờ chính xác theo khung 15 phút, không phải chờ đợi mệt mỏi.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">Thủ tục BHYT thông tuyến</strong>
                      <span className="text-gray-600">Hỗ trợ đầy đủ quyền lợi bảo hiểm y tế và xuất hóa đơn điện tử VAT.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900 font-bold block">Hồ sơ bệnh án điện tử (EMR)</strong>
                      <span className="text-gray-600">Kết quả xét nghiệm, hình ảnh siêu âm và đơn thuốc lưu trữ bảo mật trọn đời.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                  <span>Hotline đặt hẹn: <strong className="text-primary-700 font-bold">1900 8888</strong></span>
                  <span className="text-emerald-700 font-bold">Trực 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 CORE MEDICAL SERVICES (THẺ DỊCH VỤ CỐT LÕI) ─────────── */}
      <section id="dich-vu" className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-1.5 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Dịch Vụ Y Tế Trọng Điểm</span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Tiện Ích Chăm Sóc Sức Khỏe Đa Năng</h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
              Ứng dụng các quy trình khám chữa bệnh hiện đại giúp người bệnh tiếp cận dịch vụ y tế nhanh chóng và thuận tiện nhất
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Đặt lịch trực tiếp */}
            <div
              onClick={() => handleBookingClick('truc_tiep')}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mt-4 group-hover:text-primary-600 transition-colors">
                  Đặt Lịch Khám Tại Viện
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Đăng ký trước theo chuyên khoa và Bác sĩ mong muốn. Lựa chọn khung giờ linh hoạt, giảm 80% thời gian chờ đợi tại quầy.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-primary-600">
                <span>Đặt hẹn khám</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Lấy số thứ tự Kiosk */}
            <div
              onClick={handleKioskClick}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-primary-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Ticket className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mt-4 group-hover:text-primary-700 transition-colors">
                  Kiosk Lấy Số Thứ Tự & Phân Luồng
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Tiếp đón tự động tại sảnh quầy. Quét thẻ CCCD/BHYT, hệ thống phân luồng chuyên khoa và cấp số thứ tự điện tử ngay lập tức.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-primary-700">
                <span>Lấy số thứ tự</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Khám từ xa Telehealth */}
            <div
              onClick={() => handleBookingClick('truc_tuyen')}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-primary-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Video className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mt-4 group-hover:text-primary-700 transition-colors">
                  Tư Vấn Khám Từ Xa (Telehealth)
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Kết nối trực tiếp với bác sĩ chuyên khoa qua cuộc gọi video bảo mật. Bác sĩ hội chẩn, tư vấn phác đồ và kê toa thuốc điện tử.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-primary-700">
                <span>Đăng ký khám từ xa</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4: Tra cứu hồ sơ & EMR */}
            <div
              onClick={() => {
                if (isAuthenticated) navigate('/benh-nhan/ho-so-y-te');
                else navigate('/login');
              }}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-primary-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mt-4 group-hover:text-primary-700 transition-colors">
                  Tra Cứu Hồ Sơ & Kết Quả CLS
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Truy cập kết quả xét nghiệm huyết học, sinh hóa máu, hình ảnh siêu âm 4D và lịch sử đơn thuốc điều trị mọi lúc, mọi nơi.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-primary-700">
                <span>Tra cứu hồ sơ</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHUYÊN KHOA MŨI NHỌN ──────────────────────────────────── */}
      <section id="chuyen-khoa" className="py-14 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-1.5 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Khoa Phòng Chuyên Môn</span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Các Chuyên Khoa Mũi Nhọn</h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
              Hệ thống phòng khám đa khoa đầy đủ các chuyên khoa trọng điểm với trang thiết bị chẩn đoán hiện đại
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPECIALTIES_DATA.map((ck) => (
              <div
                key={ck.id}
                onClick={() => setSelectedSpecialty(ck)}
                className="rounded-2xl bg-white p-5 shadow-2xs border border-slate-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer space-y-2 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-primary-700 flex items-center justify-center font-bold text-xs group-hover:scale-110 group-hover:bg-primary-600 group-hover:text-white transition-all">
                      <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {ck.phong}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-sm mt-3 group-hover:text-primary-700 transition-colors">
                    {ck.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1 line-clamp-2">
                    {ck.shortDesc}
                  </p>
                </div>
                <p className="text-[11px] font-bold text-primary-600 pt-2 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                  Xem chi tiết <ArrowRight className="h-3 w-3" />
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ĐỘI NGŨ BÁC SĨ CHUYÊN KHOA ĐẦU NGÀNH ──────────────────── */}
      <section id="bac-si" className="py-14 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-1.5 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Đội Ngũ Chuyên Gia</span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Bác Sĩ Chuyên Khoa Giàu Kinh Nghiệm</h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
              Đội ngũ bác sĩ chuyên khoa II, thạc sĩ y học tận tâm với nghề, luôn đặt sức khỏe người bệnh lên hàng đầu
            </p>
          </div>

          {/* Tabs Lọc Bác Sĩ Theo Chuyên Khoa */}
          {(() => {
            const allDoctors = dbDoctors.length > 0 ? dbDoctors : [
              { id: 1, hoTen: 'BS. CKII Nguyễn Văn A', chuyenKhoa: 'Nội tổng quát & Tim mạch', bangCap: 'Bác sĩ Chuyên khoa II - ĐH Y Dược TP.HCM', moTa: 'Nguyên Trưởng khoa Nội Tim Mạch với hơn 20 năm kinh nghiệm điều trị tăng huyết áp, suy tim và bệnh lý nội tiết.' },
              { id: 2, hoTen: 'BS. CKI Trần Thị B', chuyenKhoa: 'Tai Mũi Họng', bangCap: 'Bác sĩ Chuyên khoa I', moTa: 'Chuyên gia nội soi điều trị viêm tai giữa, viêm xoang mạn tính và phẫu thuật cắt amidan bằng công nghệ Plasma.' },
              { id: 3, hoTen: 'ThS. BS Lê Hoàng C', chuyenKhoa: 'Nhi Khoa', bangCap: 'Thạc sĩ Y học - ĐH Y Hà Nội', moTa: 'Hơn 15 năm khám và chăm sóc sức khỏe toàn diện cho trẻ sơ sinh và trẻ nhỏ, chuyên sâu về hô hấp và tiêu hóa nhi.' },
            ];

            const currentTab = DOCTOR_SPECIALTY_TABS.find(t => t.id === selectedDoctorSpecialty) || DOCTOR_SPECIALTY_TABS[0];

            const filteredDoctors = allDoctors.filter((doc) => {
              if (!doc.chuyenKhoa) return false;
              const ck = doc.chuyenKhoa.toLowerCase();
              return currentTab.matchWords.some(w => ck.includes(w.toLowerCase()));
            });

            return (
              <>
                {/* Thanh chọn chuyên khoa */}
                <div className="flex items-center justify-start md:justify-center gap-1.5 lg:gap-2 overflow-x-auto no-scrollbar py-1 mb-8 w-full">
                  {DOCTOR_SPECIALTY_TABS.map((tab) => {
                    const count = allDoctors.filter(b => {
                      if (!b.chuyenKhoa) return false;
                      const ck = b.chuyenKhoa.toLowerCase();
                      return tab.matchWords.some(w => ck.includes(w.toLowerCase()));
                    }).length;
                    const isActive = selectedDoctorSpecialty === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedDoctorSpecialty(tab.id)}
                        className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Danh sách Bác sĩ của khoa đã chọn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.length > 0 ? (
                    filteredDoctors.map((bs) => (
                      <div key={bs.id} className="rounded-2xl bg-slate-50 p-6 border border-slate-200 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 font-black text-sm flex-shrink-0 overflow-hidden">
                              {bs.anhDaiDien ? (
                                <img 
                                  src={bs.anhDaiDien.startsWith('http') ? bs.anhDaiDien : `http://localhost:5000${bs.anhDaiDien}`} 
                                  alt={bs.hoTen} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement.innerText = 'BS';
                                  }}
                                />
                              ) : (
                                'BS'
                              )}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-gray-900 text-base">{bs.hoTen}</h4>
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 mt-0.5">
                                {bs.chuyenKhoa}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-primary-800 font-semibold">{bs.bangCap || 'Bác sĩ chuyên khoa'}</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{bs.moTa || 'Bác sĩ giàu kinh nghiệm khám chữa bệnh tận tâm tại phòng khám.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleBookingClick('truc_tiep', bs, bs.chuyenKhoa)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <Building2 className="h-3.5 w-3.5" /> Khám tại viện
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookingClick('truc_tuyen', bs, bs.chuyenKhoa)}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white hover:bg-slate-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" /> Tư vấn Video
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                      <Stethoscope className="h-10 w-10 text-slate-400 mx-auto" />
                      <h4 className="font-bold text-gray-800 text-sm">
                        {currentTab.label} hiện đang cập nhật thêm danh sách bác sĩ trực ca
                      </h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Phòng khám luôn có đội ngũ bác sĩ chuyên khoa thường trực hỗ trợ người bệnh tại phòng khám. Quý khách có thể bấm đặt lịch khám tại khoa để được sắp xếp lịch sớm nhất.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleBookingClick('truc_tiep', null, currentTab.label)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <Calendar className="h-4 w-4" /> Đặt lịch khám {currentTab.label}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ─── HEALTHCARE FOOTER ───────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 text-xs pt-12 pb-8 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <Stethoscope className="h-5 w-5 text-primary-400" /> PHÒNG KHÁM ĐA KHOA
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Cơ sở khám chữa bệnh đa khoa kỹ thuật cao, đáp ứng các tiêu chuẩn y tế nghiêm ngặt của Bộ Y Tế.
              </p>
              <p className="text-emerald-400 text-[11px] font-semibold">
                Giấy phép hoạt động số 08922/BYT-GPHĐ
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Thông Tin Liên Hệ</h4>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-rose-400 mt-0.5" /> 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</li>
                <li className="flex items-center gap-2"><PhoneCall className="h-3.5 w-3.5 text-emerald-400" /> Tổng đài: 1900 8888</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-blue-400" /> Giờ làm: 07:00 – 20:00 (Thứ 2 - CN)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Dịch Vụ Nổi Bật</h4>
              <ul className="space-y-2 text-slate-400">
                <li>• Khám bệnh Nội tổng quát & Tim mạch</li>
                <li>• Khám Tai Mũi Họng & Nội soi</li>
                <li>• Khám Nhi khoa & Dinh dưỡng</li>
                <li>• Chẩn đoán hình ảnh & Xét nghiệm Laser</li>
                <li>• Khám tư vấn từ xa (Telehealth)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Đường Dây Nóng Khẩn Cấp</h4>
              <div className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <p className="text-slate-300 font-bold text-xs uppercase">Cấp Cứu 24/24</p>
                <p className="text-2xl font-black text-emerald-400">1900 8888</p>
                <p className="text-[11px] text-slate-400">Luôn sẵn sàng tiếp nhận & xử trí y tế</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-[11px]">
            © 2026 Hệ Thống Quản Lý Phòng Khám Đa Khoa. Bản quyền thuộc về Phòng Khám Đa Khoa.
          </div>
        </div>
      </footer>

      {/* ─── SEARCH RESULTS MODAL ───────────────────────────────────── */}
      {isSearchModalOpen && (
        <SearchResultsModal
          keyword={activeSearchKeyword}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectDoctor={() => handleBookingClick()}
          onSelectSpecialty={(ck) => {
            const found = SPECIALTIES_DATA.find(
              s => s.title.toLowerCase().includes(ck.ten.toLowerCase()) || ck.ten.toLowerCase().includes(s.title.toLowerCase())
            );
            if (found) {
              setIsSearchModalOpen(false);
              setSelectedSpecialty(found);
            } else {
              setActiveSearchKeyword(ck.ten);
            }
          }}
          onSelectArticle={(bv) => setSelectedArticle(bv)}
        />
      )}

      {/* ─── SPECIALTY DETAIL MODAL (XEM CHI TIẾT KHOA) ─────────────── */}
      {selectedSpecialty && (
        <SpecialtyDetailModal
          specialty={selectedSpecialty}
          onClose={() => setSelectedSpecialty(null)}
          onBooking={(title) => handleBookingClick('truc_tiep', null, title)}
        />
      )}

      {/* ─── ARTICLE DETAIL MODAL ──────────────────────────────────── */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-primary-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {selectedArticle.danhMuc}
              </span>
              <button onClick={() => setSelectedArticle(null)} className="text-gray-400 hover:text-gray-600 font-bold p-1">
                ✕
              </button>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">{selectedArticle.tieuDe}</h3>
            <p className="text-xs text-gray-500">Tác giả chuyên môn: <strong className="text-gray-800">{selectedArticle.tacGia}</strong></p>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-gray-700 leading-relaxed border border-slate-200">
              {selectedArticle.tomTat}
              <br /><br />
              Nội dung tư vấn chi tiết từ bác sĩ chuyên khoa của phòng khám nhằm giúp quý bệnh nhân và gia đình theo dõi, chăm sóc sức khỏe an toàn và khoa học nhất.
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PUBLIC BOOKING MODAL ───────────────────────────────────── */}
      {isPublicBookingOpen && (
        <PublicDatLichModal
          isOpen={isPublicBookingOpen}
          onClose={() => setIsPublicBookingOpen(false)}
          defaultHinhThuc={bookingHinhThuc}
          defaultDoctor={bookingDoctor}
        />
      )}

      {/* ─── FLOATING AI CHATBOT WIDGET (Vùng khoanh đỏ góc dưới bên phải) ─── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
        {/* Floating Chat Window */}
        {isChatbotOpen && (
          <div className="pointer-events-auto mb-2 animate-fade-in origin-bottom-right">
            <AiTriageChatbot
              mode="floating"
              onClose={() => setIsChatbotOpen(false)}
              onMinimize={() => setIsChatbotOpen(false)}
            />
          </div>
        )}

        {/* Floating Launcher Button & Tooltip Bubble */}
        {!isChatbotOpen && (
          <div className="pointer-events-auto flex flex-col items-end gap-2.5">
            {/* Friendly Speech Bubble */}
            {showChatBubble && (
              <div className="relative bg-white text-gray-800 px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 text-xs max-w-[270px] animate-fade-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChatBubble(false);
                  }}
                  className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold border border-slate-300 transition-colors shadow-xs"
                  title="Ẩn thông báo"
                >
                  ✕
                </button>
                <div 
                  onClick={() => setIsChatbotOpen(true)} 
                  className="cursor-pointer space-y-1"
                >
                  <p className="font-extrabold text-primary-700 flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Chatbot Gợi Ý Chuyên Khoa
                  </p>
                  <p className="text-gray-600 leading-relaxed text-[11px]">
                    Bạn có dấu hiệu khó chịu? Nhập triệu chứng để AI tư vấn chuyên khoa khám phù hợp!
                  </p>
                </div>
                {/* Arrow indicator */}
                <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-slate-200 transform rotate-45"></div>
              </div>
            )}

            {/* Launcher FAB Button */}
            <button
              onClick={() => setIsChatbotOpen(true)}
              className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
              title="Chat với AI Triage Phòng Khám"
            >
              <div className="relative">
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-primary-700"></span>
                </span>
              </div>
              <span className="font-extrabold text-xs sm:text-sm whitespace-nowrap pr-1 tracking-tight">
                Tư vấn triệu chứng AI
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
