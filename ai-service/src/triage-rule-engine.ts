import {
  CHILD_WORDS,
  NguCanhPhongKham,
  PHI_DANG_CAP_NHAT,
  RED_FLAG_RE,
  boPhuDinhThaiKy,
  hasWord,
  moTaPhiTrucTiep,
  moTaPhiTrucTuyen,
  normalizeUnaccentedQuery,
  vnd,
} from './ai.helpers';

/**
 * Bộ trả lời theo luật (không gọi AI): dùng khi hỏi thông tin phòng khám,
 * có dấu hiệu cấp cứu, hoặc Gemini lỗi/hết hạn mức.
 */
export function traLoiTheoLuat(
  trieuChung: string,
  clientHistory: Array<{ role: string; text?: string; content?: string }> | undefined,
  clinicContext: NguCanhPhongKham,
) {
    const rawMsg = (trieuChung || '').trim();
    const normalizedRaw = normalizeUnaccentedQuery(rawMsg);
    const text = normalizedRaw.toLowerCase();
    const userHistory = (clientHistory || []).filter(h => h.role === 'user');
    const userHistoryText = userHistory.map(h => normalizeUnaccentedQuery(h.text || h.content || '').toLowerCase()).join(' ');

    const thuocList = clinicContext.thuocList || [];
    const dichVuList = clinicContext.dichVuList || [];
    const bacSiList = clinicContext.bacSiList || [];
    const { trucTiep, trucTuyen } = clinicContext.bieuPhi || {};

    const hasChildInCurrent = hasWord(text, CHILD_WORDS);
    const hasAdultSelfInCurrent = hasWord(text, 'tôi|mình|em|bản thân');
    const isChild = hasChildInCurrent || (!hasAdultSelfInCurrent && hasWord(userHistoryText, CHILD_WORDS));
    const hasFeverValue = /(3[8-9](\.\d+)?|4[0-2](\.\d+)?|sốt cao|sốt \d+)/.test(text) || /(3[8-9](\.\d+)?|4[0-2](\.\d+)?|sốt cao|sốt \d+)/.test(userHistoryText);
    const isAskingMedicine = /(uống thuốc gì|dùng thuốc gì|thuốc nào|mua thuốc gì|uống gì cho đỡ|uống gì hết|điều trị bằng thuốc)/.test(text);
    const isAskingHowToTake = /(uống như thế nào|uống sao|uống lúc nào|trước hay sau ăn|trước ăn hay sau ăn|liều lượng|mấy viên|cách mấy tiếng|quên uống|uống chung với|tác dụng phụ)/.test(text);

    // Tìm xem khách có nhắc trực tiếp tên thuốc nào trong danh mục nhà thuốc phòng khám không
    const matchedClinicMeds = thuocList.filter(t => {
      const ten = (t.tenThuoc || '').toLowerCase();
      const hoatChat = (t.tenHoatChat || '').toLowerCase();
      return (ten && text.includes(ten.split(' ')[0])) || (hoatChat && hoatChat.length > 3 && text.includes(hoatChat.split(' ')[0]));
    });

    const clinicMedNote = matchedClinicMeds.length > 0
      ? `\n\n🏥 **Thuốc có sẵn tại Nhà thuốc Phòng khám:**\n` + matchedClinicMeds.slice(0, 3).map(
          m => `• **${m.tenThuoc}** (${m.tenHoatChat || 'Hoạt chất chuẩn'} - ${m.hamLuong || ''}): Giá tham khảo **${Number(m.giaBan || 0).toLocaleString('vi-VN')}đ/${m.donViTinh || 'Viên'}** — Đường dùng: ${m.duongDung || 'Uống'}.`
        ).join('\n')
      : '';

    let loaiCauHoi = isAskingHowToTake ? 'cach_dung_thuoc' : isAskingMedicine ? 'hoi_thuoc' : 'trieu_chung';
    let khoa = isChild ? 'Nhi khoa' : 'Nội tổng quát';
    let maKhoa = isChild ? 'NHI' : 'NOI';
    let khanCap = false;
    let mucDo = 'trung_binh';
    let cauTraLoi = '';
    let luuYDungThuoc: string | null = null;
    let loiKhuyen = 'Nếu triệu chứng không thuyên giảm sau 2-3 ngày hoặc có dấu hiệu nặng lên, bạn nên đặt lịch khám chuyên khoa để bác sĩ chẩn đoán chính xác.';
    let hienThiDatLich = true;

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #1: CẤP CỨU Y KHOA (RED FLAGS - ĐE DỌA TÍNH MẠNG)
    // ══════════════════════════════════════════════════════════════════
    if (RED_FLAG_RE.test(text)) {
      khoa = 'Cấp cứu'; maKhoa = 'CAP_CUU'; khanCap = true; mucDo = 'khan_cap';
      cauTraLoi = `🚨 **CẢNH BÁO CẤP CỨU Y KHOA!**\n\n` +
        `Các triệu chứng bạn mô tả là **dấu hiệu nguy kịch đe dọa tính mạng** (nghi ngờ Cơn đau thắt ngực không ổn định / Nhồi máu cơ tim cấp, Tai biến mạch máu não / Đột quỵ hoặc Suy hô hấp cấp). Tuyệt đối không tự ý cho uống thuốc hay chờ đợi tại nhà!\n\n` +
        `**Hướng dẫn xử trí tức thời trong khi chờ xe cấp cứu:**\n` +
        `• **Tư thế người bệnh:** Đặt người bệnh nghỉ ngơi hoàn toàn ở tư thế nửa nằm nửa ngồi thoáng khí, nới lỏng cà vạt, cổ áo và thắt lưng.\n` +
        `• **Nếu nghi ngờ cơn đau tim:** Nếu người bệnh đã từng được bác sĩ tim mạch kê sẵn viên ngậm/xịt dưới lưỡi Nitroglycerin thì dùng ngay 1 liều theo chỉ định.\n` +
        `• **Nếu có co giật hoặc nôn ói:** Nghiêng đầu người bệnh sang một bên để tránh sặc chất nôn vào phổi gây ngạt thở. **Tuyệt đối không** cậy răng, không nhỏ chanh hay đổ bất kỳ chất lỏng/thuốc gì vào miệng người bệnh đang co giật hoặc lơ mơ.\n` +
        `• **Hành động ngay:** Gọi ngay **115** hoặc đưa đến **Khoa Cấp Cứu Bệnh viện** gần nhất ngay lập tức!`;
      loiKhuyen = 'Đưa người bệnh đến Khoa Cấp Cứu Bệnh viện gần nhất NGAY LẬP TỨC!';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #2: SƠ CỨU BỎNG & TAI NẠN THƯƠNG TÍCH
    // ══════════════════════════════════════════════════════════════════
    else if (/(bỏng|bị bỏng|nước sôi|bỏng bô|bỏng lửa|vết bỏng)/.test(text)) {
      khoa = 'Cấp cứu'; maKhoa = 'CAP_CUU'; mucDo = 'cao'; loaiCauHoi = 'so_cuu';
      cauTraLoi = `🩹 **HƯỚNG DẪN SƠ CỨU BỎNG NƯỚC SÔI / NHIỆT CHUẨN Y KHOA:**\n\n` +
        `**1. Các bước sơ cứu khẩn cấp tại chỗ (Thời gian vàng trong 15 - 30 phút đầu):**\n` +
        `• **Bước 1 - Hạ nhiệt vết bỏng:** Ngâm hoặc xối rửa nhẹ nhàng vùng da bị bỏng dưới **vòi nước sạch, mát (nhiệt độ khoảng 15 – 20°C)** liên tục trong **15 – 20 phút**. Điều này giúp hạ nhiệt độ mô sâu, giảm đau rát tức thì và ngăn vết bỏng ăn sâu vào da.\n` +
        `• **Bước 2 - Tháo bỏ vật cản:** Tháo nhẹ nhàng nhẫn, đồng hồ, vòng tay hoặc cắt bỏ lớp vải quần áo quanh vùng bỏng trước khi vết thương sưng nề.\n` +
        `• **Bước 3 - Bảo vệ vết bỏng:** Che phủ nhẹ nhàng vùng bỏng bằng **gạc vô trùng** hoặc một mảnh vải/khăn sạch ẩm. Không băng quá chặt.\n\n` +
        `**2. CẢNH BÁO NGUY HIỂM — NHỮNG ĐIỀU TUYỆT ĐỐI CẤM LÀM:**\n` +
        `• ❌ **KHÔNG** bôi kem đánh răng, nước mắm, mỡ trăn, dầu ăn, lòng đỏ trứng gà hoặc lá cây lên vết bỏng vì sẽ gây nhiễm trùng huyết hoại tử mô nghiêm trọng.\n` +
        `• ❌ **KHÔNG** chườm đá lạnh trực tiếp lên vết bỏng vì sẽ gây co mạch đột ngột, gây "bỏng lạnh" làm mô bị hoại tử nhanh hơn.\n` +
        `• ❌ **KHÔNG** tự ý chọc thủng hay bóc các bọng nước phồng rộp (lớp da này là màng bảo vệ tự nhiên chống vi khuẩn xâm nhập).\n\n` +
        `**3. Khi nào cần đến cơ sở y tế ngay?**\n` +
        `• Bỏng diện tích lớn (từ bằng lòng bàn tay trở lên), bỏng ở các vị trí nhạy cảm (mặt, mắt, cổ, bàn tay, vùng sinh dục), hoặc nạn nhân là trẻ nhỏ, người cao tuổi.`;
      luuYDungThuoc = 'Nếu đau nhiều, người lớn có thể uống 1 viên Paracetamol 500mg để giảm đau sau khi đã xối nước làm mát.';
      loiKhuyen = 'Đưa bệnh nhân đến cơ sở y tế gần nhất nếu vết bỏng phồng rộp diện rộng hoặc có dấu hiệu nhiễm trùng.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #3: CHÍNH SÁCH BHYT, HỦY LỊCH/HOÀN TIỀN, GIỜ LÀM VIỆC & DỊCH VỤ PHÒNG KHÁM
    // ══════════════════════════════════════════════════════════════════
    else if (/(bhyt|bảo hiểm y tế|bảo hiểm nhà nước|thẻ bảo hiểm)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `🏥 **CHÍNH SÁCH ÁP DỤNG BẢO HIỂM Y TẾ (BHYT) TẠI PHÒNG KHÁM MEDICARE:**\n\n` +
        `**1. Quyền lợi BHYT của Bệnh nhân:**\n` +
        `• Phòng khám Đa khoa MediCare **CÓ áp dụng thanh toán Bảo Hiểm Y Tế (BHYT)** theo đúng quy định hiện hành của Bộ Y Tế và Bảo hiểm Xã hội Việt Nam.\n` +
        `• Người bệnh được hưởng quyền lợi BHYT **theo mức hưởng ghi trên thẻ** (tùy theo đối tượng thẻ BHYT) đối với các danh mục: Tiền khám bệnh, Xét nghiệm cận lâm sàng, Chẩn đoán hình ảnh và Thuốc nằm trong danh mục BHYT chi trả.\n\n` +
        `**2. Giấy tờ cần chuẩn bị khi đến khám:**\n` +
        `• Thẻ BHYT bản cứng còn hạn sử dụng **HOẶC** hình ảnh thẻ BHYT trên ứng dụng **VssID / VNeID**.\n` +
        `• Căn cước công dân (CCCD) gắn chip hoặc giấy tờ tùy thân có dán ảnh hợp lệ.\n` +
        `• Giấy chuyển tuyến (nếu có, đối với các trường hợp vượt tuyến đặc thù để được hưởng quyền lợi tối đa).\n\n` +
        `**3. Quy trình tiếp nhận BHYT nhanh chóng:**\n` +
        `• Bạn chỉ cần xuất trình CCCD gắn chip hoặc thẻ BHYT tại Quầy Tiếp Đón, nhân viên y tế sẽ quét mã và tự động khấu trừ quyền lợi bảo hiểm trực tiếp vào viện phí của bạn.`;
      luuYDungThuoc = 'Lưu ý: Dịch vụ Khám Online từ xa (Telemedicine) hiện chưa thuộc phạm vi chi trả trực tiếp của quỹ BHYT nhà nước.';
      loiKhuyen = 'Bạn có thể bấm "Đặt lịch khám" bên dưới và mang theo CCCD/thẻ BHYT khi đến phòng khám để được hưởng đầy đủ quyền lợi bảo hiểm nhé!';
    }
    else if (/(hủy lịch|huỷ lịch|hoàn tiền|hoàn cọc|trả lại tiền|đổi lịch)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `🔄 **CHÍNH SÁCH HỦY LỊCH HẸN & HOÀN TIỀN 100% TẠI PHÒNG KHÁM:**\n\n` +
        `Phòng khám luôn hỗ trợ linh hoạt tối đa cho người bệnh khi có việc bận đột xuất:\n\n` +
        `**1. Đối với Khám trực tiếp tại phòng khám:**\n` +
        `• ${moTaPhiTrucTiep(trucTiep)}.\n` +
        `• Tiền hoàn được chuyển về tài khoản ngân hàng của bạn hoặc nhận tại quầy; bạn cũng có thể dời lịch sang khung giờ khác.\n\n` +
        `**2. Đối với Khám Online từ xa qua Video Call (Telemedicine):**\n` +
        `• ${moTaPhiTrucTuyen(trucTuyen)}.\n\n` +
        `**3. Hướng dẫn thao tác hủy lịch:**\n` +
        `• Bạn vào mục **"Lịch hẹn của tôi"** trên website/ứng dụng → Chọn lịch khám muốn hủy → Bấm **"Hủy lịch hẹn"**.\n` +
        `• Hoặc liên hệ trực tiếp số Hotline Phòng khám để bộ phận Lễ tân hỗ trợ xử lý ngay lập tức.`;
      loiKhuyen = 'Nếu cần đổi sang ngày hoặc giờ khám khác thuận tiện hơn, bạn cũng có thể thao tác dời lịch dễ dàng trong mục Lịch hẹn nhé!';
    }
    else if (/(giờ làm việc|thời gian làm việc|mấy giờ mở cửa|mấy giờ đóng cửa|địa chỉ|ở đâu|hotline|số điện thoại phòng khám)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `⏰ **THỜI GIAN LÀM VIỆC & THÔNG TIN LIÊN HỆ PHÒNG KHÁM ĐA KHOA MEDICARE:**\n\n` +
        `**1. Thời gian khám bệnh (Phục vụ tất cả các ngày trong tuần từ Thứ Hai đến Chủ Nhật):**\n` +
        `• **Ca Sáng:** 07:30 – 11:30\n` +
        `• **Ca Chiều:** 13:30 – 17:00\n` +
        `• *(Khoa Cấp cứu & Tiếp nhận bệnh nhân hoạt động liên tục hỗ trợ người bệnh)*.\n\n` +
        `**2. Hệ thống dịch vụ hoàn chỉnh tại chỗ:**\n` +
        `• Đầy đủ 10 Chuyên khoa lâm sàng (Nội tổng quát, Nhi, Tim mạch, Hô hấp - TMH, Tiêu hóa, Cơ xương khớp, Da liễu, Mắt, Sản phụ khoa, Ngoại khoa).\n` +
        `• Trung tâm Xét nghiệm tự động, Chẩn đoán hình ảnh (X-Quang kỹ thuật số, Siêu âm màu 4D, Điện tim ECG).\n` +
        `• Nhà thuốc phòng khám chuẩn GPP cung cấp thuốc chính hãng theo giá niêm yết.\n\n` +
        `**3. Kênh hỗ trợ trực tuyến:**\n` +
        `• Đặt lịch hẹn khám trước và tư vấn trực tuyến từ xa (Telemedicine) 24/7 trên hệ thống website phòng khám.`;
      loiKhuyen = 'Bạn có thể bấm "Đặt lịch khám" bên dưới để chọn khung giờ phù hợp và tránh phải chờ đợi khi đến khám!';
    }
    else if (/(khám online|khám từ xa|tư vấn online|tư vấn trực tuyến|telemedicine|telehealth|gọi video|video call)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `🎥 **DỊCH VỤ KHÁM & TƯ VẤN BÁC SĨ TRỰC TUYẾN TỪ XA (KHÁM ONLINE - TELEMEDICINE):**\n\n` +
        `**1. Chi phí Khám Online trọn gói:**\n` +
        `• ${moTaPhiTrucTuyen(trucTuyen)}.\n` +
        `• *(So sánh với **Khám trực tiếp tại phòng khám** — ${moTaPhiTrucTiep(trucTiep)})*.\n\n` +
        `**2. Quyền lợi & Quy trình Khám Online (4 bước đơn giản):**\n` +
        `• **Bước 1:** Chọn mục **"Đặt lịch khám"** → Chọn hình thức **"Tư vấn trực tuyến (Online)"**, chọn Bác sĩ và khung giờ phù hợp.\n` +
        `• **Bước 2:** Quét mã QR thanh toán phí tư vấn${trucTuyen ? ` **${vnd(trucTuyen.soTienCoc)}**` : ''} để hệ thống kích hoạt phòng khám trực tuyến.\n` +
        `• **Bước 3:** Đến giờ hẹn, đăng nhập vào cổng Bệnh nhân và bấm **"Vào phòng gọi Video"** để trao đổi trực tiếp 1-1 với Bác sĩ (hỗ trợ gửi hình ảnh kết quả xét nghiệm cũ, trò chuyện trực tiếp).\n` +
        `• **Bước 4:** Sau buổi khám, Bác sĩ sẽ **chẩn đoán và kê Đơn thuốc điện tử** gửi trực tiếp vào hồ sơ bệnh án của bạn.\n\n` +
        `**3. Chính sách Hoàn tiền:**\n` +
        (trucTuyen
          ? `• Nếu bạn bận đột xuất và hủy lịch trước giờ hẹn tối thiểu **${trucTuyen.thoiGianHuyHoanCocGio} giờ**, phòng khám **hoàn trả ${trucTuyen.phanTramHoanCoc}% số tiền đã thanh toán** về tài khoản ngân hàng của bạn.`
          : `• Chính sách hoàn tiền ${PHI_DANG_CAP_NHAT}.`);
      luuYDungThuoc = 'Khi khám Online, bạn nên chuẩn bị sẵn danh sách các thuốc đang uống hoặc hình ảnh đơn thuốc/kết quả xét nghiệm gần nhất để Bác sĩ tư vấn chính xác nhất.';
      loiKhuyen = 'Bạn có thể bấm nút "Đặt lịch khám" ngay bên dưới để chọn Bác sĩ và khung giờ Khám Online phù hợp nhé!';
    }
    else if (/(bảng giá|giá xét nghiệm|giá dịch vụ|dịch vụ xét nghiệm|giá siêu âm|giá chụp|chi phí xét nghiệm|giá khám|phí khám|bao nhiêu tiền)/.test(text) && !/(giá thuốc|bảng giá thuốc)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';

      const xnList = dichVuList.filter(d => d.loai === 'xet_nghiem' || !d.loai);
      const cdhaList = dichVuList.filter(d => d.loai === 'cdha' || d.loai === 'khac');

      const xnLines = xnList.length > 0
        ? xnList.map(d => `• **${d.tenDichVu}**: **${Number(d.gia || 0).toLocaleString('vi-VN')} VNĐ**${d.giaTriBinhThuong ? ` *(Chỉ số bình thường: ${d.giaTriBinhThuong} ${d.donViKetQua || ''})*` : ''}`).join('\n')
        : `• Bảng giá xét nghiệm ${PHI_DANG_CAP_NHAT}.`;

      const cdhaLines = cdhaList.length > 0
        ? cdhaList.map(d => `• **${d.tenDichVu}**: **${Number(d.gia || 0).toLocaleString('vi-VN')} VNĐ**`).join('\n')
        : `• Bảng giá chẩn đoán hình ảnh ${PHI_DANG_CAP_NHAT}.`;

      cauTraLoi = `📋 **BẢNG GIÁ NIÊM YẾT DỊCH VỤ KHÁM & XÉT NGHIỆM TẠI PHÒNG KHÁM:**\n\n` +
        `**1. Chi phí Khám lâm sàng & Khám Online (Telemedicine):**\n` +
        `• ${moTaPhiTrucTiep(trucTiep)}.\n` +
        `• ${moTaPhiTrucTuyen(trucTuyen)} *(Gọi Video 1-1 với Bác sĩ & nhận đơn thuốc điện tử)*.\n\n` +
        `**2. Bảng giá Xét nghiệm Sinh hóa & Huyết học:**\n${xnLines}\n\n` +
        `**3. Bảng giá Chẩn đoán Hình ảnh & Thăm dò chức năng:**\n${cdhaLines}`;
      luuYDungThuoc = 'Lưu ý trước khi xét nghiệm: Đối với xét nghiệm Đường huyết, Mỡ máu, Chức năng Gan - Mật và Siêu âm ổ bụng, bạn nên nhịn ăn sáng từ 6 – 8 tiếng (chỉ uống nước lọc trắng) để kết quả chính xác tuyệt đối.';
      loiKhuyen = 'Bạn có thể bấm nút "Đặt lịch khám" bên dưới để chọn Khám trực tiếp hoặc Khám Online qua Video Call.';
    }
    else if (/(bảng giá thuốc|giá thuốc|danh mục thuốc|nhà thuốc có những thuốc gì)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      const medLines = thuocList.length > 0
        ? thuocList.slice(0, 15).map(
            t => `• **${t.tenThuoc}** (${t.tenHoatChat || 'Hoạt chất chuẩn'} ${t.hamLuong || ''}): **${Number(t.giaBan || 0).toLocaleString('vi-VN')} VNĐ / ${t.donViTinh || 'Viên'}**`
          ).join('\n')
        : 'Đang cập nhật danh mục thuốc.';
      cauTraLoi = `💊 **BẢNG GIÁ THAM KHẢO DANH MỤC THUỐC TẠI NHÀ THUỐC PHÒNG KHÁM:**\n\n${medLines}\n\n` +
        `• Khi khám bệnh xong, bệnh nhân có thể **tùy chọn mua thuốc trực tiếp tại Nhà thuốc Phòng khám** (cam kết thuốc chuẩn GPP, quản lý hạn dùng FEFO) hoặc **nhận toa về tự mua bên ngoài**.`;
      luuYDungThuoc = 'Các thuốc kháng sinh và thuốc đặc trị chỉ được cấp phát khi có đơn chỉ định của Bác sĩ sau khi thăm khám.';
      loiKhuyen = 'Nếu bạn muốn hỏi giá hoặc cách dùng một loại thuốc cụ thể, hãy nhắn tên thuốc đó cho tôi nhé!';
    }
    else if (/(danh sách bác sĩ|đội ngũ bác sĩ|có bác sĩ nào|bác sĩ giỏi)/.test(text)) {
      loaiCauHoi = 'thong_tin_phong_kham';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      const bsLines = bacSiList.length > 0
        ? bacSiList.map(bs => `• **${bs.bangCap || 'BS.'} ${bs.nhanVien?.hoTen || 'Chuyên khoa'}** — Chuyên khoa: **${bs.chuyenKhoa}**`).join('\n')
        : 'Đội ngũ Bác sĩ Chuyên khoa I, Chuyên khoa II, Thạc sĩ giàu kinh nghiệm trực thuộc 10 chuyên khoa.';
      cauTraLoi = `👨‍⚕️ **ĐỘI NGŨ BÁC SĨ CHUYÊN KHOA TẠI PHÒNG KHÁM:**\n\n${bsLines}\n\n` +
        `**Thời gian làm việc:**\n` +
        `• **Ca Sáng:** 07:30 – 11:30\n` +
        `• **Ca Chiều:** 13:30 – 17:00`;
      loiKhuyen = `Bạn có thể chọn chuyên khoa phù hợp để đặt lịch khám trực tiếp${trucTiep ? ` (${vnd(trucTiep.phiKhamMacDinh)})` : ''} hoặc tư vấn trực tuyến qua Video Call${trucTuyen ? ` (${vnd(trucTuyen.phiKhamMacDinh)})` : ''} cùng Bác sĩ.`;
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #4: ĐỐI TƯỢNG ĐẶC BIỆT (PHỤ NỮ CÓ THAI & NGƯỜI SUY THẬN)
    // ══════════════════════════════════════════════════════════════════
    else if (/(mang thai|có thai|bầu|thai kỳ|cho con bú|đang nuôi con bằng sữa mẹ)/.test(boPhuDinhThaiKy(text)) || (isAskingMedicine && /(mang thai|có thai|bầu|thai kỳ|cho con bú)/.test(boPhuDinhThaiKy(userHistoryText)))) {
      khoa = 'Sản phụ khoa'; maKhoa = 'SAN'; mucDo = 'cao'; loaiCauHoi = 'canh_bao_dung_thuoc';
      cauTraLoi = `🤰 **CẢNH BÁO AN TOÀN SỬ DỤNG THUỐC TRONG THAI KỲ & CHO CON BÚ:**\n\n` +
        `**1. Thuốc hạ sốt, giảm đau an toàn nhất:**\n` +
        `• **Paracetamol (đơn chất):** Là lựa chọn đầu tay và được công nhận là **an toàn nhất** trong cả 3 tam cá nguyệt thai kỳ khi dùng đúng liều thông thường (500mg/lần, cách 4–6 tiếng, không quá 3000mg/ngày) trong thời gian ngắn nhất cần thiết.\n\n` +
        `**2. CẢNH BÁO NGUY HIỂM — CÁC THUỐC TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý DÙNG:**\n` +
        `• ⚠️ **Nhóm NSAIDs (Ibuprofen, Meloxicam, Diclofenac, Aspirin liều cao, Celecoxib):** TUYỆT ĐỐI CHỐNG CHỈ ĐỊNH trong thai kỳ (đặc biệt từ tuần 20 trở đi và 3 tháng cuối). Thuốc có thể gây đóng sớm ống động mạch thai nhi, thiểu ối, kéo dài thời gian chuyển dạ và xuất huyết sơ sinh nguy hiểm.\n` +
        `• ⚠️ Các kháng sinh nhóm Quinolone, Tetracycline (làm hỏng men răng và phát triển xương thai nhi), thuốc co mạch mũi (chứa Pseudoephedrine/Phenylephrine).\n\n` +
        `**3. Lời khuyên chăm sóc sức khỏe mẹ bầu:**\n` +
        `• Mọi loại thuốc khi dùng cho phụ nữ có thai bắt buộc phải có chỉ định trực tiếp từ Bác sĩ Chuyên khoa Sản.\n` +
        `• Giữ ấm, uống nhiều nước ấm, súc họng bằng nước muối sinh lý để hạn chế phụ thuộc vào thuốc.`;
      luuYDungThuoc = 'Tuyệt đối không tự ý uống các loại thuốc cảm cúm tổng hợp vì thường chứa kháng Histamin và chất co mạch gây co thắt tử cung.';
      loiKhuyen = 'Bạn nên đặt lịch khám Chuyên khoa Sản phụ khoa để Bác sĩ thăm khám cẩn thận cho cả mẹ và thai nhi.';
    }
    else if (/(suy thận|bệnh thận|thận mạn|creatinin cao|chạy thận)/.test(text) || (isAskingMedicine && /(suy thận|bệnh thận|thận mạn|chạy thận)/.test(userHistoryText))) {
      khoa = 'Nội tổng quát'; maKhoa = 'NOI'; mucDo = 'cao'; loaiCauHoi = 'canh_bao_dung_thuoc';
      cauTraLoi = `⚠️ **CẢNH BÁO DƯỢC LÂM SÀNG: LƯU Ý ĐẶC BIỆT VỀ DÙNG THUỐC Ở NGƯỜI SUY THẬN:**\n\n` +
        `Thận là cơ quan đào thải chính của đa số loại thuốc trong cơ thể. Khi chức năng thận suy giảm (Creatinine máu tăng, eGFR giảm):\n\n` +
        `**1. Thuốc TUYỆT ĐỐI CHỐNG CHỈ ĐỊNH / NGUY CƠ CAO:**\n` +
        `• 🚫 **Nhóm Giảm đau Kháng viêm NSAIDs (Ibuprofen, Meloxicam, Diclofenac, Celecoxib, Aspirin):** Người bệnh suy thận tuyệt đối KHÔNG ĐƯỢC DÙNG. NSAIDs làm ức chế Prostaglandin gây co thắt tiểu động mạch thận đến, làm giảm tưới máu thận đột ngột và gây **suy thận cấp không hồi phục**.\n` +
        `• Các kháng sinh nhóm Aminoglycosid (Gentamicin, Amikacin) gây độc tính trực tiếp lên tế bào ống thận.\n\n` +
        `**2. Thuốc hạ sốt, giảm đau thay thế:**\n` +
        `• **Paracetamol** là lựa chọn an toàn hơn rất nhiều, nhưng cần **giãn cách liều dùng** (uống cách nhau 6 – 8 tiếng/lần thay vì 4 tiếng) và không dùng liều cao kéo dài.\n\n` +
        `**3. Nguyên tắc điều trị:**\n` +
        `• Tất cả các loại thuốc kê đơn (kháng sinh, thuốc huyết áp, tiểu đường) bắt buộc phải được Bác sĩ hiệu chỉnh liều theo Mức lọc cầu thận (eGFR/ClCr).`;
      luuYDungThuoc = 'Luôn thông báo tiền sử suy thận cho bác sĩ và dược sĩ trước khi nhận bất kỳ đơn thuốc nào.';
      loiKhuyen = 'Nên định kỳ xét nghiệm Ure, Creatinine máu và Tổng phân tích nước tiểu để theo dõi sát chức năng thận.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #5: DƯỢC LÂM SÀNG CHUYÊN SÂU (QUÊN LIỀU, ĐỒ UỐNG, TÊN THUỐC CỤ THỂ)
    // ══════════════════════════════════════════════════════════════════
    else if (/(quên uống|quên 1 liều|quên liều|uống bù)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `💊 **HƯỚNG DẪN XỬ TRÍ KHI BỊ QUÊN 1 LIỀU THUỐC CHUẨN DƯỢC LÂM SÀNG:**\n\n` +
        `**1. Nguyên tắc vàng xử trí:**\n` +
        `• **Nếu vừa mới quên (cách giờ uống quy định dưới 2 – 4 tiếng):** Hãy uống ngay 1 liều bù khi nhớ ra.\n` +
        `• **Nếu đã gần sát giờ của liều kế tiếp (đã qua hơn một nửa khoảng cách giữa 2 liều):** Hãy **BỎ QUA liều đã quên** và chờ đến đúng giờ để uống liều kế tiếp theo lịch trình bình thường.\n\n` +
        `**2. CẢNH BÁO NGUY HIỂM TUYỆT ĐỐI:**\n` +
        `• ❌ **TUYỆT ĐỐI KHÔNG UỐNG GẤP ĐÔI LIỀU (2 viên cùng lúc)** để bù cho liều đã quên. Việc uống dồn liều sẽ làm tăng vọt nồng độ thuốc trong máu đột ngột, dẫn đến ngộ độc thuốc cấp, tụt huyết áp nghiêm trọng (đối với thuốc huyết áp), hạ đường huyết hôn mê (thuốc tiểu đường) hoặc suy gan, loét dạ dày.\n\n` +
        `**3. Mẹo để không bị quên liều:**\n` +
        `• Sử dụng hộp chia thuốc theo ngày/buổi (sáng - trưa - chiều - tối).\n` +
        `• Cài báo thức trên điện thoại cố định cùng một giờ mỗi ngày (ví dụ: 8h00 sáng sau ăn).`;
      luuYDungThuoc = 'Nếu bạn quên uống các loại thuốc đặc trị như thuốc tim mạch, thuốc chống đông máu hoặc thuốc ức chế miễn dịch, hãy liên hệ trực tiếp bác sĩ điều trị để được hướng dẫn chi tiết.';
      loiKhuyen = 'Duy trì giờ uống thuốc đều đặn là yếu tố quan trọng hàng đầu giúp kiểm soát bệnh mãn tính hiệu quả.';
    }
    else if (/(uống thuốc.*(với|chung|cùng|kèm)|uống.*(nước trà|trà|sữa|cà phê|bia|rượu|nước ngọt|nước bưởi))/i.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `💊 **HƯỚNG DẪN DƯỢC HỌC: UỐNG THUỐC CÙNG CÁC LOẠI ĐỒ UỐNG:**\n\n` +
        `**1. Uống thuốc với NƯỚC LỌC TRẮNG (Chuẩn Y khoa tốt nhất):**\n` +
        `• Luôn uống thuốc với một cốc đầy **nước lọc đun sôi để nguội hoặc nước ấm (khoảng 150 – 200ml)**. Nước lọc đóng vai trò trung tính, giúp viên thuốc trôi nhanh qua thực quản xuống dạ dày và tan đều mà không gây bất kỳ tương tác hóa học nào.\n\n` +
        `**2. Vì sao KHÔNG ĐƯỢC uống thuốc với các thức uống khác?**\n` +
        `• 🥛 **Sữa / Chế phẩm sữa:** Chứa hàm lượng Canxi cao, tạo phức chelate không tan với nhiều loại kháng sinh (Ciprofloxacin, Tetracycline, Doxycycline) và thuốc Sắt, làm thuốc không hấp thu được và bị đào thải ra ngoài vô tác dụng.\n` +
        `• ☕ **Cà phê / Trà xanh:** Chứa nhiều Tanin và Caffeine làm giảm hấp thu viên bổ Sắt, đồng thời gây kích ứng niêm mạc dạ dày và làm tim đập nhanh, hồi hộp khi dùng chung thuốc cảm cúm/giãn phế quản.\n` +
        `• 🍊 **Nước ép bưởi chùm (Grapefruit):** Ức chế mạnh men gan CYP3A4, làm nồng độ thuốc huyết áp (Amlodipine), thuốc mỡ máu (Atorvastatin) trong máu tăng vọt gấp nhiều lần, gây ngộ độc tiêu cơ vân và tụt huyết áp đột ngột.\n` +
        `• 🍺 **Rượu bia / Cồn:** Tuyệt đối cấm! Kết hợp rượu bia với Paracetamol gây hoại tử tế bào gan cấp tính; kết hợp với NSAIDs gây chảy máu dạ dày rầm rộ; kết hợp thuốc an thần gây ngừng thở.\n\n` +
        `**3. Thời gian giãn cách an toàn:**\n` +
        `• Nếu muốn uống sữa, nước trà hoặc cà phê, bạn nên uống **cách thời điểm uống thuốc ít nhất 02 tiếng**.`;
      luuYDungThuoc = 'Tập thói quen uống thuốc ở tư thế đứng hoặc ngồi thẳng lưng với nước lọc ấm để thuốc không bị dính vào niêm mạc thực quản.';
      loiKhuyen = 'Hãy hỏi ý kiến dược sĩ nếu bạn có thói quen sử dụng trà thảo mộc hoặc thực phẩm chức năng hàng ngày.';
    }
    else if (/(paracetamol|panadol|efferalgan|hapacol|tylenol|thuốc hạ sốt)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = isChild ? 'Nhi khoa' : 'Nội tổng quát';
      maKhoa = isChild ? 'NHI' : 'NOI';
      cauTraLoi = `💊 **Hướng dẫn sử dụng Paracetamol (Panadol / Efferalgan / Hapacol) an toàn:**\n\n` +
        `1. **Công dụng:** Hạ sốt (khi thân nhiệt **≥ 38.5°C**) và giảm đau nhẹ đến vừa (đau đầu, đau răng, đau cơ, đau họng).\n` +
        `2. **Liều lượng chuẩn:**\n` +
        `• **Người lớn & trẻ > 12 tuổi (trên 40kg):** Uống **500mg/lần** (1 viên 500mg). Nếu sốt cao hoặc đau nhiều có thể dùng 500mg – 1000mg tùy cân nặng.\n` +
        `• **Trẻ em:** Tính chính xác theo cân nặng **10 – 15 mg/kg/lần** (Ví dụ: bé 10kg dùng gói 150mg; bé 16-20kg dùng gói 250mg).\n` +
        `3. **Khoảng cách giữa các lần uống:** Cách nhau tối thiểu **4 đến 6 tiếng/lần**. Tuyệt đối **không uống quá 4 lần/ngày** (không quá 3000-4000mg/24h với người lớn).\n` +
        `4. **Thời điểm uống:** Có thể uống trước hoặc sau ăn đều được (nếu dạ dày nhạy cảm nên uống sau ăn nhẹ với 1 cốc nước lọc ấm).${clinicMedNote}`;
      luuYDungThuoc = 'Không uống cùng rượu bia hoặc dùng đồng thời nhiều loại thuốc cảm cúm có chứa sẵn Paracetamol để tránh ngộ độc gan. Chống chỉ định ở người suy gan nặng.';
      loiKhuyen = 'Kết hợp chườm ấm vùng trán, nách, bẹn và uống nhiều nước lọc/Oresol để hạ sốt hiệu quả hơn.';
    }
    else if (/(ibuprofen|diclofenac|meloxicam|celecoxib|aspirin|nsaid|kháng viêm giảm đau)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = 'Cơ xương khớp'; maKhoa = 'CXK';
      cauTraLoi = `💊 **Hướng dẫn sử dụng nhóm thuốc Giảm đau - Kháng viêm không Steroid (Ibuprofen / Meloxicam / Diclofenac):**\n\n` +
        `1. **Công dụng:** Giảm đau, kháng viêm trong đau khớp, đau cơ, đau bụng kinh, đau răng hoặc hạ sốt khi không đáp ứng với Paracetamol.\n` +
        `2. **Cách uống bắt buộc:** Phải uống **SAU BỮA ĂN NO (15 – 30 phút)** với 1 cốc nước đầy (200ml) và giữ tư thế thẳng lưng ít nhất 15 phút sau uống để tránh loét dạ dày.\n` +
        `3. **Khoảng cách liều:** Ibuprofen uống cách nhau **6 – 8 tiếng/lần**; Meloxicam thường chỉ dùng **1 lần/ngày** theo chỉ định.${clinicMedNote}`;
      luuYDungThuoc = '⚠️ CẤM TUYỆT ĐỐI tự ý dùng Ibuprofen/Aspirin khi nghi ngờ SỐT XUẤT HUYẾT (nguy cơ xuất huyết nội tạng tử vong) hoặc người đang bị viêm loét dạ dày - tá tràng, suy thận, phụ nữ mang thai 3 tháng cuối.';
      loiKhuyen = 'Nếu có tiền sử đau dạ dày, cần hỏi ý kiến bác sĩ để phối hợp thêm thuốc bảo vệ niêm mạc dạ dày (PPI).';
    }
    else if (/(amoxicillin|augmentin|cefuroxime|azithromycin|ciprofloxacin|cephalexin|kháng sinh)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = isChild ? 'Nhi khoa' : 'Hô hấp / Tai Mũi Họng';
      maKhoa = isChild ? 'NHI' : 'HH_TMH';
      cauTraLoi = `💊 **Nguyên tắc sử dụng Kháng sinh (Amoxicillin / Augmentin / Cefuroxime / Azithromycin):**\n\n` +
        `1. **Khi nào cần dùng:** Kháng sinh **CHỈ diệt được vi khuẩn** (viêm họng mủ, viêm phổi, nhiễm trùng tiết niệu...), hoàn toàn **KHÔNG có tác dụng với virus** (cảm lạnh, cúm thông thường, sốt siêu vi).\n` +
        `2. **Cách uống chuẩn xác:**\n` +
        `• **Amoxicillin / Augmentin / Cefuroxime:** Nên uống **ngay đầu bữa ăn hoặc sau ăn 15 phút** để tăng hấp thu và giảm cồn cào ruột, tiêu chảy.\n` +
        `• Chia đều khoảng cách giờ trong ngày (Ví dụ: đơn 2 lần/ngày thì uống cách nhau mỗi **12 tiếng**; đơn 3 lần/ngày uống cách nhau mỗi **8 tiếng**).\n` +
        `3. **Đủ liệu trình:** Phải uống **đủ từ 5 – 7 ngày** theo đúng toa bác sĩ. Tuyệt đối **không tự ý ngưng thuốc sớm** khi mới thấy hết sốt/đỡ đau họng vì sẽ gây kháng kháng sinh.${clinicMedNote}`;
      luuYDungThuoc = 'Có thể bổ sung thêm Men vi sinh (Probiotics) cách thời điểm uống kháng sinh ít nhất 2 tiếng để phòng ngừa loạn khuẩn đường ruột (tiêu chảy do kháng sinh). Không uống kháng sinh cùng sữa hoặc viên Canxi/Sắt.';
      loiKhuyen = 'Nếu sau khi uống kháng sinh xuất hiện nổi mề đay, ngứa, sưng môi/mắt hoặc khó thở, phải ngưng thuốc ngay và đến phòng khám kiểm tra dị ứng.';
    }
    else if (/(omeprazole|esomeprazole|pantoprazole|nexium|phosphalugel|gaviscon|yumangel|thuốc dạ dày|chữ p)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = 'Tiêu hóa'; maKhoa = 'TH';
      cauTraLoi = `💊 **Hướng dẫn cách uống Thuốc Dạ Dày & Trào Ngược đạt hiệu quả tối đa:**\n\n` +
        `Thuốc dạ dày chia làm 2 nhóm chính với **thời điểm uống hoàn toàn khác nhau**:\n\n` +
        `1. **Nhóm ức chế tiết axit (Omeprazole, Esomeprazole, Pantoprazole, Rabeprazole):**\n` +
        `• **Cách uống:** Bắt buộc uống **TRƯỚC BỮA ĂN SÁNG 30 – 60 PHÚT** (lúc bụng đói). Nuốt nguyên viên với nước lọc, không nhai hay nghiền nát viên thuốc.\n` +
        `2. **Nhóm trung hòa axit & Bọc niêm mạc (Phosphalugel - thuốc chữ P, Yumangel, Gaviscon):**\n` +
        `• **Cách uống:** Uống **SAU BỮA ĂN 1 – 2 GIỜ**, trước khi đi ngủ hoặc **ngay lúc đang lên cơn đau rát / ợ chua**.\n` +
        `• Lưu ý: Không uống nước quá nhiều ngay sau khi uống gói sữa dạ dày để lớp gel bám phủ bảo vệ vết loét.${clinicMedNote}`;
      luuYDungThuoc = 'Các gói sữa trung hòa axit (Phosphalugel/Gaviscon) làm cản trở hấp thu thuốc khác, nên phải uống CÁCH XA các loại thuốc khác ít nhất 2 tiếng.';
      loiKhuyen = 'Kiêng tuyệt đối đồ chua cay, rượu bia, cà phê, nước ngọt có gas; không nằm ngay sau khi ăn (nên đợi ít nhất 2 tiếng).';
    }
    else if (/(oresol|smecta|berberin|loperamid|imodum|men vi sinh|enterogermina|bioflora)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = isChild ? 'Nhi khoa' : 'Tiêu hóa';
      maKhoa = isChild ? 'NHI' : 'TH';
      cauTraLoi = `💊 **Hướng dẫn sử dụng Thuốc điều trị Tiêu chảy & Bù điện giải:**\n\n` +
        `1. **Oresol (Bù nước và điện giải — Quan trọng số 1):**\n` +
        `• **Cách pha:** Pha **toàn bộ 1 gói Oresol** với đúng lượng nước đun sôi để nguội ghi trên bao bì (thường là 200ml hoặc 1000ml). Không chia nhỏ gói thuốc, không pha với sữa hay nước ngọt.\n` +
        `• **Cách uống:** Uống từng ngụm nhỏ liên tục sau mỗi lần đi ngoài. Dung dịch đã pha chỉ dùng trong vòng 24 giờ.\n` +
        `2. **Smecta (Bảo vệ niêm mạc ruột & cầm tiêu chảy):**\n` +
        `• Hòa 1 gói với khoảng 50ml nước ấm, uống **xa bữa ăn** và **cách các thuốc khác ít nhất 1.5 – 2 tiếng**.\n` +
        `3. **Men vi sinh (Enterogermina / Probiotics):**\n` +
        `• Giúp cân bằng hệ vi sinh đường ruột, uống 1–2 ống/viên mỗi ngày.${clinicMedNote}`;
      luuYDungThuoc = '⚠️ Cẩn trọng với thuốc cầm tiêu chảy cấp tốc (Loperamide): KHÔNG dùng khi tiêu chảy do nhiễm khuẩn/ngộ độc thực phẩm (có sốt cao, đi ngoài phân nhầy máu) vì sẽ giữ độc tố lại trong ruột.';
      loiKhuyen = 'Ăn cháo trắng nấu thịt nạc/cà rốt dễ tiêu, tránh sữa tươi, đồ tanh, dầu mỡ trong những ngày đang tiêu chảy.';
    }
    else if (/(loratadin|cetirizin|fexofenadin|telfast|aerius|chlorpheniramin|thuốc dị ứng)/.test(text)) {
      loaiCauHoi = 'cach_dung_thuoc';
      khoa = 'Da liễu'; maKhoa = 'DA';
      cauTraLoi = `💊 **Hướng dẫn sử dụng Thuốc chống Dị ứng - Kháng Histamin (Loratadine / Cetirizine / Fexofenadine):**\n\n` +
        `1. **Công dụng:** Giảm nhanh triệu chứng ngứa da, nổi mề đay, viêm mũi dị ứng, hắt hơi, sổ mũi, ngứa mắt.\n` +
        `2. **Liều dùng phổ biến (Người lớn & trẻ > 12 tuổi):**\n` +
        `• **Loratadine 10mg** hoặc **Cetirizine 10mg**: Thường chỉ uống **1 viên duy nhất/ngày** (nên uống vào buổi tối).\n` +
        `• **Fexofenadine (60mg / 180mg)**: Uống 1 viên/lần với nước lọc (không uống cùng nước ép trái cây như cam, bưởi, táo vì làm giảm tác dụng thuốc).${clinicMedNote}`;
      luuYDungThuoc = 'Một số thuốc kháng dị ứng (như Chlorpheniramine hoặc Cetirizine ở người nhạy cảm) có thể gây buồn ngủ, giảm tập trung — cần thận trọng khi lái xe hoặc vận hành máy móc.';
      loiKhuyen = 'Tránh gãi mạnh vùng da mề đay, tắm nước mát hoặc ấm nhẹ, kiêng hải sản/thức ăn lạ đang nghi ngờ gây dị ứng.';
    }
    else if (isAskingHowToTake) {
      loaiCauHoi = 'cach_dung_thuoc';
      cauTraLoi = `💊 **Nguyên tắc Vàng khi uống thuốc để đạt hiệu quả cao & an toàn nhất:**\n\n` +
        `1. **Phân biệt thuốc uống TRƯỚC ĂN và SAU ĂN:**\n` +
        `• **Uống TRƯỚC ĂN 30 phút (lúc đói):** Thuốc dạ dày giảm tiết axit (Omeprazole, Esomeprazole), thuốc chống nôn/trào ngược (Domperidone, Motilium).\n` +
        `• **Uống SAU ĂN NO 15 – 30 phút:** Thuốc giảm đau kháng viêm (Ibuprofen, Meloxicam, Diclofenac), thuốc Corticoid (Medrol, Prednisolone), kháng sinh, thuốc bổ Sắt/Kẽm/Vitamin C.\n` +
        `2. **Khoảng cách giữa các cử thuốc trong ngày:**\n` +
        `• Đơn ghi **2 lần/ngày**: Uống sáng – tối cách nhau khoảng **10 – 12 tiếng**.\n` +
        `• Đơn ghi **3 lần/ngày**: Uống sáng – trưa – tối cách nhau khoảng **6 – 8 tiếng**.\n` +
        `• Thuốc hạ sốt (**Paracetamol**): Các lần uống phải cách nhau tối thiểu **4 – 6 tiếng**.\n` +
        `3. **Nước dùng để uống thuốc:**\n` +
        `• Luôn dùng **nước lọc ấm hoặc nguội (150 – 200ml)**. Tuyệt đối **không uống thuốc với sữa, nước trà, cà phê, nước ép bưởi/cam hoặc rượu bia** vì gây kết tủa hoặc làm mất tác dụng thuốc.\n` +
        `4. **Xử trí khi quên 1 liều:**\n` +
        `• Uống bù ngay khi nhớ ra. Tuy nhiên nếu đã gần sát giờ của liều kế tiếp thì **bỏ qua liều đã quên**, uống liều tiếp theo như bình thường — **tuyệt đối không uống gấp đôi liều**.${clinicMedNote}`;
      luuYDungThuoc = 'Nếu bạn đang thắc mắc về một loại thuốc cụ thể, hãy nhắn tên thuốc đó (ví dụ: Amoxicillin, Paracetamol, Omeprazole...) để tôi hướng dẫn liều lượng chi tiết nhé!';
      loiKhuyen = 'Luôn kiểm tra hạn sử dụng của thuốc và thông báo cho bác sĩ/dược sĩ nếu bạn có tiền sử dị ứng thuốc.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #5.5: TƯ VẤN DINH DƯỠNG & CHẾ ĐỘ ĂN THEO BỆNH HỌC (ĂN GÌ / KIÊNG GÌ)
    // ══════════════════════════════════════════════════════════════════
    else if (/(nên ăn gì|kiêng gì|kiêng ăn|chế độ ăn|thực đơn)/.test(text)) {
      loaiCauHoi = 'dinh_duong';
      khoa = /(dạ dày|bao tử|trào ngược|tiêu hóa)/.test(text) ? 'Tiêu hóa' : /(gout|gút|khớp)/.test(text) ? 'Cơ xương khớp' : 'Nội tổng quát';
      maKhoa = khoa === 'Tiêu hóa' ? 'TH' : khoa === 'Cơ xương khớp' ? 'CXK' : 'NOI';
      cauTraLoi = `🥗 **TƯ VẤN CHẾ ĐỘ DINH DƯỠNG & THỰC ĐƠN ĐIỀU TRỊ Y KHOA:**\n\n` +
        `**1. Đối với Bệnh Gout & Rối loạn Mỡ máu (Acid Uric & Cholesterol cao):**\n` +
        `• ❌ **Thực phẩm CẦN KIÊNG:**\n` +
        `  - Nội tạng động vật (gan, cật, tim, lòng), thịt đỏ (thịt bò, thịt dê, thịt chó).\n` +
        `  - Hải sản giàu purin (tôm, cua, ốc, cá cơm, cá trích).\n` +
        `  - Rượu bia tuyệt đối (đặc biệt là bia vì làm tăng sinh purin và ức chế thận đào thải acid uric).\n` +
        `  - Mỡ động vật, đồ chiên rán nhiều dầu mỡ, đồ ăn nhanh, thức uống có đường fructose cao (nước ngọt có gas).\n` +
        `• ✅ **Thực phẩm NÊN ĂN:**\n` +
        `  - Uống nhiều nước lọc (2 – 2.5 lít/ngày) giúp tăng đào thải acid uric qua đường tiểu.\n` +
        `  - Ăn nhiều rau xanh (cải bẹ xanh, dưa chuột, súp lơ trắng), trái cây tươi giàu vitamin C (cam, dâu tây, ổi, anh đào/cherry).\n` +
        `  - Sử dụng sữa ít béo/tách béo, trứng gà luộc, dầu ô liu hoặc dầu hạt.\n\n` +
        `**2. Đối với Bệnh lý Dạ Dày & Trào ngược dạ dày thực quản (GERD):**\n` +
        `• ❌ **Cần kiêng:** Đồ chua cay, chanh, xoài, ớt, tiêu, cà phê, nước ngọt có gas; không ăn quá no hoặc để bụng quá đói; không nằm ngay sau ăn trong vòng 2 giờ.\n` +
        `• ✅ **Nên ăn:** Cháo, súp, cơm mềm, bánh mì, chuối chín, sữa ấm không đường; chia nhỏ bữa ăn trong ngày.`;
      luuYDungThuoc = 'Chế độ dinh dưỡng đúng cách giúp giảm đến 50% nguy cơ bùng phát cơn Gout cấp và ổn định chỉ số mỡ máu, bảo vệ tim mạch.';
      loiKhuyen = 'Bạn nên kết hợp tập thể dục nhẹ nhàng 30 phút mỗi ngày và định kỳ xét nghiệm lại Mỡ máu, Acid Uric sau 1–3 tháng.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #5.6: HƯỚNG DẪN CHUẨN BỊ XÉT NGHIỆM & NHỊN ĂN SÁNG
    // ══════════════════════════════════════════════════════════════════
    else if (/(nhịn ăn|nhịn ăn sáng|uống nước lọc được không|chuẩn bị trước khi|lưu ý trước khi xét nghiệm)/.test(text)) {
      loaiCauHoi = 'huong_dan_xet_nghiem';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI';
      cauTraLoi = `🔬 **HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI XÉT NGHIỆM MÁU & SIÊU ÂM Ổ BỤNG:**\n\n` +
        `**1. Có cần NHỊN ĂN SÁNG không?**\n` +
        `• **CÓ, BẮT BUỘC PHẢI NHỊN ĂN TỪ 6 – 8 TIẾNG** trước khi lấy máu xét nghiệm. Việc ăn sáng (dù chỉ một mẩu bánh mì, ngụm sữa hay viên kẹo) sẽ làm tăng vọt lượng Đường huyết (Glucose) và Mỡ máu (Triglyceride), dẫn đến kết quả chẩn đoán bị sai lệch hoàn toàn.\n` +
        `• Đối với **Siêu âm ổ bụng tổng quát**: Cần nhịn ăn để túi mật căng to (dễ quan sát sỏi túi mật, polyp) và dạ dày, đường ruột không bị sinh hơi cản trở chùm sóng siêu âm.\n\n` +
        `**2. UỐNG NƯỚC LỌC ĐƯỢC KHÔNG?**\n` +
        `• **ĐƯỢC VÀ NÊN UỐNG:** Bạn **hoàn toàn có thể uống một lượng nước lọc trắng vừa phải (khoảng 100 – 200ml)**. Nước lọc trắng không làm thay đổi các chỉ số sinh hóa máu mà còn giúp tĩnh mạch căng phồng dễ lấy máu hơn.\n` +
        `• **TUYỆT ĐỐI KHÔNG UỐNG:** Sữa tươi, sữa đậu nành, nước ngọt có gas, cà phê, nước chè hoặc nước cam/chanh ép trước khi lấy máu.\n\n` +
        `**3. Lưu ý thêm trước khi Siêu âm:**\n` +
        `• Nếu có chỉ định siêu âm tiền liệt tuyến (ở nam) hoặc tử cung - phần phụ (ở nữ), bạn nên uống thêm nước và nhịn tiểu để bàng quang căng vừa đủ giúp bác sĩ quan sát rõ nét nhất.`;
      luuYDungThuoc = 'Tốt nhất bạn nên đến phòng khám vào đầu giờ sáng (từ 7h30) để được lấy máu xét nghiệm ngay, sau đó có thể ăn sáng nhẹ nhàng tại căng tin phòng khám.';
      loiKhuyen = 'Bạn có thể đặt lịch hẹn khám vào ca sáng sớm để không phải chờ đợi lâu khi đang nhịn đói nhé!';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #6: GIẢI THÍCH CHỈ SỐ XÉT NGHIỆM Y KHOA (MEN GAN, ACID URIC, ĐƯỜNG HUYẾT, MỠ MÁU)
    // ══════════════════════════════════════════════════════════════════
    else if (/(xét nghiệm|chỉ số|đường huyết|tiểu đường|đái tháo đường|hba1c|mỡ máu|cholesterol|triglyceride|men gan|ast|alt|creatinin|công thức máu|bạch cầu|tiểu cầu)/.test(text)) {
      loaiCauHoi = 'chi_so_xet_nghiem';
      khoa = 'Nội tổng quát'; maKhoa = 'NOI'; mucDo = 'trung_binh';

      const dvInfo = dichVuList.length > 0
        ? `\n\n🔬 **Một số dịch vụ Xét nghiệm & Ngưỡng tham chiếu tại Phòng khám:**\n` + dichVuList.slice(0, 5).map(
            d => `• **${d.tenDichVu}**: Giá **${Number(d.gia || 0).toLocaleString('vi-VN')}đ**${d.giaTriBinhThuong ? ` (Bình thường: ${d.giaTriBinhThuong} ${d.donViKetQua || ''})` : ''}`
          ).join('\n')
        : '';

      cauTraLoi = `🔬 **PHÂN TÍCH & GIẢI THÍCH CÁC CHỈ SỐ XÉT NGHIỆM Y KHOA QUAN TRỌNG:**\n\n` +
        `Dưới đây là ý nghĩa lâm sàng và khoảng giá trị chuẩn của các xét nghiệm phổ biến:\n\n` +
        `**1. Chức năng Gan & Gout (Acid Uric / AST / ALT):**\n` +
        `• **Men gan AST (GOT) & ALT (GPT):** Giá trị bình thường **< 40 U/L**. Nếu kết quả tăng cao (ví dụ: AST 85 U/L, ALT 92 U/L) là dấu hiệu tế bào gan đang bị tổn thương do viêm gan virus (B, C), gan nhiễm mỡ, lạm dụng rượu bia hoặc tác dụng phụ của thuốc.\n` +
        `• **Acid Uric máu:** Bình thường **210 – 420 µmol/L (ở nam)** và **150 – 360 µmol/L (ở nữ)**. Nếu vượt quá ngưỡng (ví dụ: 510 µmol/L) là tăng Acid Uric máu rõ rệt, nguy cơ cao kết tinh lắng đọng tinh thể Urat tại các khớp gây cơn **Gout cấp tính** hoặc tạo sỏi thận Urat.\n\n` +
        `**2. Đường huyết (Kiểm tra Tiểu đường / Đái tháo đường):**\n` +
        `• **Glucose máu lúc đói (Fasting Glucose):** Bình thường **3.9 – 5.6 mmol/L** (70 – 100 mg/dL). Tiền đái tháo đường: **5.6 – 6.9 mmol/L**. Nghi ngờ Đái tháo đường: **≥ 7.0 mmol/L** (cần xét nghiệm lặp lại 2 lần).\n` +
        `• **HbA1c (Đường huyết trung bình trong 3 tháng):** Bình thường **< 5.7%**; Tiền đái tháo đường: **5.7 – 6.4%**; Đái tháo đường: **≥ 6.5%**.\n\n` +
        `**3. Bộ Mỡ Máu (Lipid máu):**\n` +
        `• **Cholesterol toàn phần:** Bình thường **< 5.2 mmol/L** (< 200 mg/dL).\n` +
        `• **Triglyceride:** Bình thường **< 1.7 mmol/L** (< 150 mg/dL).\n` +
        `• **LDL-Cholesterol ("mỡ xấu"):** Tối ưu **< 2.6 – 3.4 mmol/L**.\n` +
        `• **HDL-Cholesterol ("mỡ tốt"):** Nên **> 1.0 mmol/L** ở nam và **> 1.3 mmol/L** ở nữ.\n\n` +
        `**4. Chức năng Thận & Tổng phân tích tế bào máu:**\n` +
        `• **Creatinine máu:** Bình thường **53 – 115 µmol/L** (dùng tính mức lọc cầu thận eGFR).\n` +
        `• **Bạch cầu (WBC):** Bình thường **4.0 – 10.0 G/L** (Tăng cao khi có phản ứng nhiễm khuẩn cấp tính).\n` +
        `• **Tiểu cầu (PLT):** Bình thường **150 – 450 G/L** (Giảm sâu dưới 100 G/L thường gặp trong Sốt xuất huyết).${dvInfo}`;
      luuYDungThuoc = 'Lưu ý trước khi xét nghiệm: Đối với xét nghiệm Đường huyết, Mỡ máu, Chức năng Gan và Acid Uric, bạn cần nhịn ăn sáng từ 8 – 10 tiếng (chỉ uống nước lọc trắng) để kết quả chính xác tuyệt đối.';
      loiKhuyen = 'Bạn nên đặt lịch khám Chuyên khoa Nội tổng quát để Bác sĩ kết hợp siêu âm ổ bụng và tư vấn phác đồ dinh dưỡng, dùng thuốc phù hợp.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #7: CHUYÊN KHOA MẮT (ĐẶT TRƯỚC DA LIỄU ĐỂ "NGỨA MẮT" ĐƯỢC ĐỊNH TUYẾN CHÍNH XÁC VÀO KHOA MẮT)
    // ══════════════════════════════════════════════════════════════════
    else if (/(mắt|đau mắt|đỏ mắt|mờ mắt|ngứa mắt|cộm mắt|viêm kết mạc|khô mắt|nhức mắt|chảy nước mắt|ghèn mắt)/.test(text)) {
      khoa = 'Mắt'; maKhoa = 'MAT'; mucDo = 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Chăm sóc & Sử dụng Thuốc Nhỏ Mắt an toàn:**\n\n` +
        `1. **Xử trí & Nhỏ mắt an toàn tại nhà:**\n` +
        `• **Rửa mắt & Làm sạch ghèn:** Dùng **Nước muối sinh lý nhãn khoa (NaCl 0.9%)** hoặc **Nước mắt nhân tạo** (Systane, Sanlein, Refresh Tears) nhỏ 4–6 lần/ngày để làm dịu mắt và rửa trôi bụi/tác nhân dị ứng.\n` +
        `• **Nếu đau mắt đỏ có ghèn vàng/xanh đặc (nghi nhiễm khuẩn):** Bác sĩ chuyên khoa Mắt sẽ kê thuốc nhỏ mắt kháng sinh chuyên dụng (như **Tobramycin / Tobrex** hoặc **Ofloxacin / Cravit** — nhỏ 1 giọt × 4 lần/ngày).\n\n` +
        `2. **Cách nhỏ mắt chuẩn Y khoa:**\n` +
        `• Rửa sạch tay bằng xà phòng trước khi nhỏ, kéo nhẹ mi dưới xuống và nhỏ 1 giọt vào cùng đồ kết mạc, không để đầu lọ thuốc chạm vào lông mi hoặc giác mạc.\n` +
        `• Nếu dùng 2 loại thuốc nhỏ mắt khác nhau, phải nhỏ **cách nhau ít nhất 5 – 10 phút**.${clinicMedNote}`;
      luuYDungThuoc = '⚠️ TUYỆT ĐỐI KHÔNG tự ý mua các loại thuốc nhỏ mắt có chứa Corticoid (như Polydexa, Tobradex, Dexacol) khi chưa có chỉ định của Bác sĩ chuyên khoa Mắt, vì nếu bị loét giác mạc do nấm hoặc virus Herpes sẽ gây thủng giác mạc, tăng nhãn áp (glaucoma) và mù lòa vĩnh viễn.';
      loiKhuyen = 'Không dụi mắt, dùng riêng khăn mặt/gối, đeo kính chắn bụi khi ra đường và đặt lịch khám Chuyên khoa Mắt nếu nhìn mờ hoặc chói sáng.';
    }

    // ══════════════════════════════════════════════════════════════════
    // ƯU TIÊN #8: CÁC CHUYÊN KHOA LÂM SÀNG & BỆNH HỌC KHÁC
    // ══════════════════════════════════════════════════════════════════
    else if (/(dạ dày|bao tử|ợ chua|ợ nóng|trào ngược|thượng vị|đau rát bụng trên)/.test(text)) {
      khoa = 'Tiêu hóa'; maKhoa = 'TH'; mucDo = 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Đau dạ dày / Trào ngược dạ dày - thực quản (GERD):**\n\n` +
        `1. **Nguyên nhân thường gặp:** Tăng tiết axit dịch vị, viêm loét niêm mạc dạ dày - tá tràng, nhiễm khuẩn *H. pylori*, căng thẳng thức khuya hoặc ăn đồ chua cay, dùng thuốc giảm đau lúc đói.\n\n` +
        `2. **Bị đau dạ dày uống thuốc gì & uống như thế nào?**\n` +
        `• **Giảm đau rát, ợ chua tức thì (Thuốc trung hòa axit OTC):** Dùng **Phosphalugel (thuốc chữ P)**, **Yumangel** hoặc **Gaviscon** — Uống **1 gói sau bữa ăn 1–2 tiếng** hoặc ngay khi đang đau rát/ợ chua.\n` +
        `• **Giảm tiết axit dạ dày (Nhóm PPI):** **Omeprazole 20mg** hoặc **Esomeprazole 20mg/40mg** — Uống **1 viên trước bữa ăn sáng 30 phút** (lúc bụng đói).\n` +
        `• **Nếu kèm đầy hơi, khó tiêu:** Có thể dùng thêm **Domperidone 10mg** (uống trước ăn 15–30 phút) hoặc men tiêu hóa sau ăn.\n\n` +
        `3. **Chế độ ăn uống & Sinh hoạt bắt buộc:**\n` +
        `• **Nên ăn:** Cháo, súp, cơm mềm, bánh mì, chuối chín, sữa ấm không đường; chia nhỏ bữa ăn, không để bụng quá đói hoặc ăn quá no.\n` +
        `• **Cần kiêng:** Đồ chua (chanh, xoài, dưa muối), đồ cay nóng (ớt, tiêu), cà phê, rượu bia, nước có gas. Không nằm ngay sau khi ăn trong vòng 2 giờ.${clinicMedNote}`;
      luuYDungThuoc = 'Tuyệt đối tránh dùng các thuốc giảm đau kháng viêm (Ibuprofen, Aspirin, Diclofenac, Corticoid) vì sẽ làm vết loét dạ dày nặng thêm hoặc gây xuất huyết tiêu hóa.';
      loiKhuyen = 'Nếu đau dạ dày kéo dài trên 1 tuần, đi ngoài phân đen hoặc sụt cân, bạn nên đặt lịch khám Chuyên khoa Tiêu hóa để nội soi dạ dày và test vi khuẩn HP (nhớ nhịn ăn sáng 6-8 tiếng trước khi khám).';
    }
    else if (/(tiêu chảy|đi ngoài|đau bụng|ngộ độc|nôn ói|buồn nôn|rối loạn tiêu hóa|táo bón)/.test(text)) {
      khoa = isChild ? 'Nhi khoa' : 'Tiêu hóa';
      maKhoa = isChild ? 'NHI' : 'TH';
      mucDo = 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Đau bụng / Tiêu chảy / Rối loạn tiêu hóa:**\n\n` +
        `1. **Phác đồ xử trí & Thuốc tham khảo tại nhà (OTC):**\n` +
        `• **Bước 1 - Bù nước & điện giải (Quan trọng nhất):** Uống dung dịch **Oresol** (pha đúng tỷ lệ 1 gói với 200ml hoặc 1 lít nước đun sôi để nguội theo nhãn, uống từng ngụm sau mỗi lần đi ngoài/nôn).\n` +
        `• **Bước 2 - Bảo vệ niêm mạc ruột:** Dùng **Smecta (Dioctahedral smectite)** 1 gói pha với 50ml nước ấm, ngày 2–3 lần (uống cách xa bữa ăn và cách thuốc khác 2 tiếng).\n` +
        `• **Bước 3 - Cân bằng hệ vi sinh:** Bổ sung **Men vi sinh (Enterogermina / Probiotics)** 1–2 ống/ngày và **Kẽm (Zinc)** (đặc biệt tốt cho trẻ em).\n` +
        `• **Nếu đau quặn bụng do co thắt:** Có thể tham khảo **rotundin / Alverine / Spasmaverine** (người lớn: 1–2 viên khi đau).\n\n` +
        `2. **Dấu hiệu cảnh báo cần đi khám ngay:**\n` +
        `• Đau bụng khu trú dữ dội ở vùng hố chậu phải (nghi **viêm ruột thừa**), sốt cao > 38.5°C, đi ngoài phân có nhầy máu, hoặc nôn mọi thứ không uống được nước.${clinicMedNote}`;
      luuYDungThuoc = 'Không tự ý uống thuốc cầm tiêu chảy Loperamide (Imodium) hoặc thuốc giảm đau mạnh khi chưa loại trừ nhiễm trùng ruột cấp hoặc viêm ruột thừa vì sẽ làm lu mờ triệu chứng nguy hiểm.';
      loiKhuyen = 'Ăn thức ăn chín kỹ, mềm lỏng như cháo trắng thịt bằm, cà rốt; kiêng sữa tươi, đồ ăn tanh, nhiều mỡ và rau sống.';
    }
    else if (/(\bho\b|ho đờm|ho khan|bị ho|đau họng|rát họng|viêm họng|viêm amidan|sổ mũi|nghẹt mũi|viêm xoang|cảm cúm|cảm lạnh|sốt)/.test(text)) {
      khoa = isChild ? 'Nhi khoa' : 'Hô hấp / Tai Mũi Họng';
      maKhoa = isChild ? 'NHI' : 'HH_TMH';
      mucDo = hasFeverValue ? 'cao' : 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Sốt / Ho / Viêm họng / Cảm cúm đường hô hấp${isChild ? ' (Trẻ em)' : ''}:**\n\n` +
        `1. **Thuốc điều trị triệu chứng an toàn không kê đơn (OTC):**\n` +
        `• **Khi có sốt (≥ 38.5°C) hoặc đau họng, đau mỏi người:** Dùng **Paracetamol** (${isChild ? 'liều 10–15 mg/kg cân nặng/lần' : 'viên 500mg/lần'}), uống cách nhau mỗi **4 – 6 tiếng** khi còn sốt.\n` +
        `• **Khi ho có đờm đặc:** Dùng thuốc tiêu nhầy/long đờm như **Acetylcysteine 200mg** hoặc **Bromhexine / Ambroxol** uống **sau ăn** ngày 2–3 lần, kết hợp uống nhiều nước ấm để loãng đờm.\n` +
        `• **Khi ho khan, ngứa rát cổ họng:** Dùng **Siro ho thảo dược (Prospan, Ích Nhi, Bảo Thanh)**, viên ngậm sát khuẩn họng (Strepsils, Dorithricin) và súc họng bằng **Nước muối sinh lý NaCl 0.9%** 3–4 lần/ngày.\n` +
        `• **Khi nghẹt mũi, sổ mũi, hắt hơi:** Rửa mũi bằng nước muối sinh lý; nếu sổ mũi nhiều có thể dùng kháng Histamin (**Loratadine 10mg** hoặc **Cetirizine 10mg** 1 viên/ngày vào buổi tối).\n\n` +
        `2. **Lưu ý về Kháng sinh:**\n` +
        `• 80% cảm cúm, đau họng ban đầu là do **Virus** nên kháng sinh không có tác dụng. Chỉ dùng kháng sinh (Amoxicillin/Augmentin/Azithromycin) khi bác sĩ khám thấy **viêm amidan hốc mủ, viêm xoang cấp mủ hoặc bội nhiễm vi khuẩn**.${clinicMedNote}`;
      luuYDungThuoc = 'Tuyệt đối không dùng Ibuprofen hoặc Aspirin để hạ sốt khi chưa loại trừ Sốt xuất huyết. Không dùng thuốc ức chế phản xạ ho mạnh (Dextromethorphan/Codein) cho người đang có nhiều đờm hoặc trẻ nhỏ.';
      loiKhuyen = isChild
        ? 'Cho bé uống nhiều nước ấm/sữa, mặc quần áo mỏng thoáng mát, theo dõi nhịp thở của bé. Nếu bé sốt cao trên 2 ngày hoặc thở nhanh/rút lõm lồng ngực, ba/mẹ hãy đưa bé khám Nhi khoa ngay.'
        : 'Giữ ấm vùng cổ ngực, uống nhiều nước ấm (trà gừng mật ong), nghỉ ngơi và đặt lịch khám Chuyên khoa Hô hấp / Tai Mũi Họng nếu sốt quá 48h hoặc ho kéo dài.';
    }
    else if (/(đau đầu|nhức đầu|đau nửa đầu|migraine|chóng mặt|hoa mắt|tiền đình|mất ngủ|tê bì|khó ngủ)/.test(text)) {
      khoa = 'Thần kinh'; maKhoa = 'TK'; mucDo = 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Đau đầu / Chóng mặt / Rối loạn tiền đình / Mất ngủ:**\n\n` +
        `1. **Nguyên nhân phổ biến:** Đau đầu căng cơ (do stress, thiếu ngủ, làm việc máy tính lâu), đau nửa đầu Migraine, rối loạn tiền đình, thiếu máu não hoặc tăng huyết áp.\n\n` +
        `2. **Thuốc giảm triệu chứng tham khảo & Cách dùng:**\n` +
        `• **Giảm đau đầu thông thường:** Uống **Paracetamol 500mg** (1 viên sau ăn nhẹ, cách nhau 4–6 tiếng nếu còn đau).\n` +
        `• **Nếu chóng mặt, quay cuồng do Tiền đình:** Bác sĩ thường chỉ định nhóm **Betahistine (Betaserc 16mg/24mg)** hoặc **Acetylleucine (Tanganil 500mg)** uống **sau bữa ăn** để giảm kích ứng dạ dày.\n` +
        `• **Hỗ trợ tuần hoàn não & giảm căng thẳng, mất ngủ:** Có thể bổ sung **Magie - Vitamin B6**, Ginkgo Biloba hoặc Rotundin thảo dược (uống trước khi đi ngủ).\n\n` +
        `3. **Việc cần làm ngay tại nhà:**\n` +
        `• Đo kiểm tra **Huyết áp** ngay lúc đang đau đầu/chóng mặt (vì huyết áp tăng cao đột ngột cũng gây đau đầu dữ dội).\n` +
        `• Nằm nghỉ trong phòng yên tĩnh, ánh sáng dịu, thay đổi tư thế (từ nằm sang ngồi/đứng) thật chậm rãi để tránh té ngã.${clinicMedNote}`;
      luuYDungThuoc = 'Không lạm dụng thuốc giảm đau đầu quá 3 ngày liên tiếp vì có thể gây "đau đầu dội ngược do lạm dụng thuốc" và che lấp các bệnh lý mạch máu não.';
      loiKhuyen = 'Nếu đau đầu dữ dội đột ngột, kèm nôn vọt, sốt cứng gáy, nhìn đôi hoặc tê yếu tay chân, cần đến khám ngay tại Chuyên khoa Thần kinh.';
    }
    else if (/(tức ngực|đau ngực|khó thở|hồi hộp|đánh trống ngực|tim đập nhanh|huyết áp|tăng huyết áp|cao huyết áp|amlodipin|losartan)/.test(text)) {
      khoa = 'Tim mạch'; maKhoa = 'TIM'; mucDo = 'cao';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Triệu chứng Tim mạch & Kiểm soát Huyết áp:**\n\n` +
        `1. **Phân loại chỉ số Huyết áp chuẩn Y khoa:**\n` +
        `• **Bình thường tối ưu:** < 120/80 mmHg.\n` +
        `• **Tiền tăng huyết áp:** 120–139 / 80–89 mmHg.\n` +
        `• **Tăng huyết áp Độ 1:** 140–159 / 90–99 mmHg.\n` +
        `• **Tăng huyết áp Độ 2 (Nguy cơ cao):** ≥ 160/100 mmHg (Nếu **≥ 180/120 mmHg** kèm đau đầu/tức ngực là cơn tăng huyết áp khẩn cấp!).\n\n` +
        `2. **Nguyên tắc dùng thuốc Huyết áp & Tim mạch (Amlodipine, Losartan, Perindopril, Bisoprolol...):**\n` +
        `• **Uống cố định 1 giờ mỗi ngày** (thường vào buổi sáng sau khi thức dậy hoặc theo đúng giờ bác sĩ dặn).\n` +
        `• **Tuyệt đối không tự ý bỏ thuốc** hoặc ngưng thuốc khi thấy huyết áp đã về bình thường (huyết áp bình thường là nhờ thuốc đang phát huy tác dụng).\n\n` +
        `3. **Xử trí khi đang tức ngực, hồi hộp hoặc huyết áp tăng:**\n` +
        `• Ngồi hoặc nằm nghỉ ngơi ở tư thế nửa nằm nửa ngồi, hít sâu thở chậm.\n` +
        `• Đo lại huyết áp và nhịp tim sau 10–15 phút nghỉ ngơi.${clinicMedNote}`;
      luuYDungThuoc = 'Thuốc huyết áp/tim mạch là thuốc kê đơn bắt buộc phải do Bác sĩ Tim mạch thăm khám (đo Điện tâm đồ ECG, Siêu âm tim) mới được chỉ định. Không mượn đơn thuốc huyết áp của người khác để uống.';
      loiKhuyen = 'Ăn nhạt (giảm muối < 5g/ngày, hạn chế nước chấm/đồ kho mặn), bỏ thuốc lá, hạn chế cà phê/rượu bia và đặt lịch khám Chuyên khoa Tim mạch để kiểm tra Điện tâm đồ.';
    }
    else if (/(đau lưng|đau khớp|xương khớp|thoát vị|thoái hóa|đau vai gáy|gout|gút|sưng khớp|viêm khớp)/.test(text)) {
      khoa = 'Cơ xương khớp'; maKhoa = 'CXK'; mucDo = 'trung_binh';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Bệnh lý Cơ Xương Khớp & Cơn Gout cấp:**\n\n` +
        `1. **Các nhóm thuốc điều trị thường dùng & Cách uống:**\n` +
        `• **Giảm đau thông thường (An toàn cho dạ dày):** **Paracetamol 500mg** (uống 1 viên sau ăn khi đau, cách 4–6h).\n` +
        `• **Giảm đau kháng viêm xương khớp (NSAIDs: Meloxicam, Celecoxib, Etoricoxib, Ibuprofen):** Giúp giảm sưng viêm khớp mạnh nhưng **BẮT BUỘC uống sau ăn no** và nên kèm thuốc bảo vệ dạ dày.\n` +
        `• **Thuốc giãn cơ (Eperisone / Myonal 50mg):** Dùng khi đau lưng, đau cổ vai gáy co cứng cơ — uống sau ăn.\n` +
        `• **Nếu là cơn Gout cấp (Sưng nóng đỏ đau ngón chân cái/khớp):** Dùng **Colchicine** hoặc NSAIDs trong cơn đau cấp theo chỉ định; thuốc hạ Acid Uric (**Allopurinol / Febuxostat**) dùng duy trì phòng ngừa tái phát.\n\n` +
        `2. **Chăm sóc & Giảm đau không dùng thuốc:**\n` +
        `• **Đau cơ mãn tính / thoái hóa khớp:** Chườm ấm 15–20 phút.\n` +
        `• **Chấn thương bong gân mới (< 48h) hoặc khớp đang sưng nóng đỏ cấp tính (Gout):** Chườm lạnh, kê cao chi và hạn chế vận động mạnh.${clinicMedNote}`;
      luuYDungThuoc = 'Không tự ý mua các loại "thuốc tàu, thuốc hoàn tán không rõ nguồn gốc" giảm đau xương khớp cấp tốc vì thường trộn Corticoid liều cao gây suy tuyến thượng thận, mục xương và thủng dạ dày.';
      loiKhuyen = 'Nếu có bệnh Gout: Kiêng nội tạng động vật, hải sản, thịt bò/thịt đỏ, bia rượu và uống trên 2–2.5 lít nước/ngày.';
    }
    else if (/(dị ứng|mề đay|nổi mề đay|mẩn ngứa|ngứa da|phát ban|viêm da|nấm da|zona|mụn trứng cá|mụn bọc|ngứa)/.test(text)) {
      khoa = 'Da liễu'; maKhoa = 'DA'; mucDo = 'thap';
      cauTraLoi = `🩺 **Tư vấn Y khoa: Dị ứng da / Nổi mề đay / Viêm da:**\n\n` +
        `1. **Bị ngứa / nổi mề đay uống thuốc gì & bôi thuốc gì?**\n` +
        `• **Thuốc uống giảm ngứa & mề đay (Kháng Histamin H1 không kê đơn):**\n` +
        `  - **Loratadine 10mg**, **Cetirizine 10mg** hoặc **Fexofenadine 60mg/180mg**: Người lớn uống **1 viên/ngày** (với Cetirizine nên uống buổi tối vì có thể gây buồn ngủ nhẹ).\n` +
        `• **Chăm sóc & Bôi ngoài da:**\n` +
        `  - Làm dịu da bằng kem dưỡng ẩm dịu nhẹ hoặc hồ nước / Phenergan bôi mỏng.\n` +
        `  - **Lưu ý quan trọng:** Không tự ý bôi các tuýp thuốc có chứa **Corticoid** (như Gentrisone, Silkron, Trangala, Eumovate...) lên mặt hoặc vùng da đang nhiễm nấm/mụn mủ/Zona thần kinh vì sẽ làm bệnh lan rộng nặng hơn.\n\n` +
        `2. **Khi nào cần đi khám ngay?**\n` +
        `• Nếu nổi mề đay kèm **sưng phù môi, mí mắt, khàn tiếng, khó thở hoặc đau quặn bụng** (dấu hiệu phản vệ độ 2) cần đến phòng khám/cấp cứu ngay lập tức!${clinicMedNote}`;
      luuYDungThuoc = 'Không cào gãi làm trầy xước da gây nhiễm trùng tụ cầu. Tránh tắm nước quá nóng hoặc chà xát xà phòng có tính kiềm mạnh lên vùng da tổn thương.';
      loiKhuyen = 'Tạm kiêng hải sản, đồ lên men, rượu bia, đậu phộng và mặc quần áo chất liệu cotton rộng rãi, thoáng mát.';
    }
    else if (isChild) {
      khoa = 'Nhi khoa'; maKhoa = 'NHI'; mucDo = hasFeverValue ? 'cao' : 'trung_binh';
      cauTraLoi = `👶 **Tư vấn Nhi khoa & Chăm sóc Trẻ em tại nhà:**\n\n` +
        `1. **Nguyên tắc dùng thuốc an toàn cho bé:**\n` +
        `• **Hạ sốt cho bé (Khi nhiệt độ nách ≥ 38.5°C):** Dùng **Paracetamol** (gói sủi/bột Hapacol, Efferalgan) tính theo cân nặng của bé: **10 – 15 mg/kg/lần**, các lần uống cách nhau **4 – 6 tiếng**.\n` +
        `• **Vệ sinh mũi họng:** Nhỏ hoặc xịt rửa mũi bằng **Nước muối sinh lý 0.9%** ấm, hút mũi nhẹ nhàng giúp bé dễ thở và bú/ăn tốt hơn.\n` +
        `• **Bù nước:** Cho bé bú mẹ tăng cường hoặc uống từng muỗng nhỏ dung dịch Oresol trẻ em / nước ấm.\n\n` +
        `2. **Dấu hiệu cần đưa bé đi khám Nhi khoa ngay:**\n` +
        `• Bé sốt cao ≥ 39°C không đáp ứng thuốc hạ sốt, sốt trên 48 giờ, thở nhanh, rút lõm lồng ngực, nôn mọi thứ, li bì khó đánh thức hoặc giật mình chới với.${clinicMedNote}`;
      luuYDungThuoc = 'Tuyệt đối không tự ý dùng kháng sinh, thuốc cầm tiêu chảy người lớn hoặc Aspirin/Ibuprofen cho trẻ nhỏ khi chưa có chỉ định của Bác sĩ Nhi khoa.';
      loiKhuyen = 'Mặc quần áo mỏng thoáng cho bé, không ủ ấm quá kỹ khi bé đang sốt cao và chườm ấm vùng trán, nách, bẹn.';
    }
    else {
      // Không khớp mẫu nào (thường do Gemini quá tải): báo thật thay vì đưa câu trả lời không liên quan
      khoa = 'Nội tổng quát'; maKhoa = 'NOI'; mucDo = 'trung_binh';
      cauTraLoi = `⏳ **Trợ lý AI đang quá tải nên chưa phân tích được câu hỏi của bạn.**\n\n` +
        `Vui lòng **gửi lại câu hỏi sau ít phút**, hoặc đặt lịch khám để bác sĩ tư vấn trực tiếp.\n\n` +
        `🚨 **Cần đi khám hoặc gọi cấp cứu 115 ngay nếu có:** chảy máu nhiều (nôn ra máu, đi ngoài ra máu, ho ra máu), khó thở, đau ngực dữ dội, ngất xỉu, co giật, yếu liệt nửa người, sốt cao li bì.`;
      luuYDungThuoc = null;
      loiKhuyen = 'Không tự ý dùng thuốc khi chưa rõ nguyên nhân; nếu triệu chứng nặng lên hãy đến cơ sở y tế gần nhất.';
    }

    return {
      loai_cau_hoi: loaiCauHoi,
      chuyen_khoa: khoa,
      khoa,
      ma_khoa: maKhoa,
      khan_cap: khanCap,
      muc_do_uu_tien: mucDo,
      cau_tra_loi: cauTraLoi,
      luu_y_dung_thuoc: luuYDungThuoc,
      can_hoi_them: false,
      cau_hoi_tiep_theo: null,
      loi_khuyen_so_bo: loiKhuyen,
      hien_thi_dat_lich: hienThiDatLich,
      do_tin_cay: 0.94,
      source: 'clinical_knowledge_engine',
    };
  
}
