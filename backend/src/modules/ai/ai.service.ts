import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LuotTiepNhan } from '../tiep-nhan/entities/tiep-nhan.entity';
import { ChiDinhCanLamSang } from '../xet-nghiem/entities/xet-nghiem.entity';

// ─── In-memory session store (per Bệnh nhân / Tab) ──────────────
const chatSessions: Map<string, Array<{ role: string; parts: Array<{ text: string }> }>> = new Map();

// ─── System Prompt Y Khoa (Bộ não của AI Triage) ────────────────
const MEDICAL_SYSTEM_PROMPT = `
Bạn là trợ lý phân luồng y khoa thông minh của Phòng Khám Đa Khoa. 
Nhiệm vụ của bạn là phân tích triệu chứng bệnh nhân và đưa ra gợi ý chuyên khoa phù hợp.

QUY TẮC BẮT BUỘC:
1. Luôn trả lời bằng JSON hợp lệ (không có text thừa bên ngoài JSON).
2. Không được đưa ra chẩn đoán bệnh cụ thể — chỉ gợi ý chuyên khoa phù hợp.
3. Nếu triệu chứng nguy hiểm (đau ngực dữ dội, khó thở cấp, đột quỵ, co giật, chảy máu nặng), phải đặt khan_cap = true.
4. Hỏi thêm thông tin nếu triệu chứng chưa rõ ràng (tối đa 2-3 câu hỏi).
5. Ngôn ngữ: Tiếng Việt, thân thiện, chuyên nghiệp.

CÁC CHUYÊN KHOA CÓ TẠI PHÒNG KHÁM:
- "Nội tổng quát" (ma_khoa: "NOI") — Bệnh lý chung, huyết áp, tiểu đường, dạ dày.
- "Hô hấp / Tai Mũi Họng" (ma_khoa: "HH_TMH") — Ho, sốt, đau họng, viêm xoang, khó thở.
- "Tim mạch" (ma_khoa: "TIM") — Đau ngực, hồi hộp, tức ngực, huyết áp cao.
- "Thần kinh" (ma_khoa: "TK") — Đau đầu, chóng mặt, tê bì, mất ngủ.
- "Tiêu hóa" (ma_khoa: "TH") — Đau bụng, nôn ói, tiêu chảy, táo bón.
- "Cơ xương khớp" (ma_khoa: "CXK") — Đau lưng, đau khớp, thoát vị đĩa đệm.
- "Nhi khoa" (ma_khoa: "NHI") — Trẻ em dưới 15 tuổi.
- "Da liễu" (ma_khoa: "DA") — Ngứa, nổi mẩn, mụn, dị ứng da.
- "Mắt" (ma_khoa: "MAT") — Mờ mắt, đau mắt, viêm kết mạc.
- "Cấp cứu" (ma_khoa: "CAP_CUU") — Tình trạng khẩn cấp, đe dọa tính mạng.

ĐỊNH DẠNG JSON BẮT BUỘC:
{
  "khoa": "Tên chuyên khoa",
  "ma_khoa": "MÃ_KHOA",
  "khan_cap": false,
  "muc_do_uu_tien": "thap|trung_binh|cao|khan_cap",
  "cau_tra_loi": "Câu trả lời hiển thị cho bệnh nhân (thân thiện, tối đa 100 từ)",
  "can_hoi_them": true/false,
  "cau_hoi_tiep_theo": "Câu hỏi tiếp theo nếu cần làm rõ triệu chứng (null nếu đã đủ thông tin)",
  "loi_khuyen_so_bo": "Lời khuyên sơ bộ ngắn gọn",
  "do_tin_cay": 0.85
}
`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(LuotTiepNhan) private tiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(ChiDinhCanLamSang) private clsRepo: Repository<ChiDinhCanLamSang>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Sử dụng gemini-3.5-flash-lite: tốc độ siêu nhanh (~1.2s), hỗ trợ responseMimeType JSON
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
          systemInstruction: MEDICAL_SYSTEM_PROMPT,
        });
        this.logger.log('✅ Gemini AI (gemini-3.5-flash-lite) initialized successfully');
      } catch (err) {
        this.logger.warn('⚠️ Gemini AI init failed, fallback to rule-based:', err.message);
      }
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not set, using rule-based fallback');
    }
  }

  // ─── TRIAGE CHAT (Multi-turn với Gemini) ──────────────────────────
  async triageChat(sessionId: string, message: string) {
    if (this.model) {
      return this.triageChatGemini(sessionId, message);
    }
    return this.triageChatRuleBased(message);
  }

  private async triageChatGemini(sessionId: string, userMessage: string) {
    // Khởi tạo hoặc lấy lại session
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, []);
    }
    const history = chatSessions.get(sessionId)!;

    try {
      const chat = this.model!.startChat({
        history: [...history],
      });

      // Timeout bảo vệ 4 giây: nếu mạng chậm hoặc Google delay quá 4s → fallback ngay lập tức!
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 4000),
      );

      const sendPromise = chat.sendMessage(userMessage);
      const result: any = await Promise.race([sendPromise, timeoutPromise]);
      const rawText = result.response.text().trim();

      // Cập nhật history
      history.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: rawText }] },
      );
      chatSessions.set(sessionId, history.slice(-20)); // Giới hạn 20 lượt

      // Parse JSON từ Gemini
      const parsed = JSON.parse(rawText);
      return { ...parsed, source: 'gemini' };
    } catch (err) {
      this.logger.error('Gemini API error / timeout:', err.message);
      return this.triageChatRuleBased(userMessage);
    }
  }

  // ─── PHÂN LUỒNG NHANH (single-turn, dùng cho tiếp tân) ─────────
  async phanLuongNhanh(trieuChung: string) {
    if (this.model) {
      const prompt = `Triệu chứng bệnh nhân: "${trieuChung}". Hãy phân tích và trả về JSON phân luồng chuyên khoa.`;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 4000),
        );
        const result: any = await Promise.race([
          this.model.generateContent(prompt),
          timeoutPromise,
        ]);
        const rawText = result.response.text().trim();
        return { ...JSON.parse(rawText), source: 'gemini' };
      } catch (err) {
        this.logger.error('Gemini quick triage error / timeout:', err.message);
      }
    }
    return this.triageChatRuleBased(trieuChung);
  }

  // ─── RULE-BASED FALLBACK (hoạt động khi không có API key) ──────
  private triageChatRuleBased(trieuChung: string) {
    const text = (trieuChung || '').toLowerCase();
    let khoa = 'Nội tổng quát', maKhoa = 'NOI', khanCap = false, mucDo = 'thap';
    let cauTraLoi = 'Tôi đề xuất bạn đến khám ở phòng Nội tổng quát để bác sĩ thăm khám và làm các xét nghiệm cần thiết.';
    let loiKhuyen = 'Vui lòng đến phòng khám để được khám và tư vấn cụ thể.';

    if (/(tức ngực|đau ngực|khó thở|ngất|hôn mê|co giật|liệt|đột quỵ|chảy máu nhiều)/.test(text)) {
      khoa = 'Cấp cứu'; maKhoa = 'CAP_CUU'; khanCap = true; mucDo = 'khan_cap';
      cauTraLoi = '🚨 Triệu chứng của bạn có thể nghiêm trọng! Vui lòng đến ngay phòng Cấp cứu hoặc gọi 115.';
      loiKhuyen = 'Gọi 115 hoặc đến cơ sở y tế gần nhất NGAY LẬP TỨC!';
    } else if (/(ho|sốt|đau họng|nghẹt mũi|viêm xoang|khản tiếng|phổi|hô hấp)/.test(text)) {
      khoa = 'Hô hấp / Tai Mũi Họng'; maKhoa = 'HH_TMH'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng của bạn có vẻ liên quan đến đường hô hấp. Bạn có sốt trên 38.5°C không?';
      loiKhuyen = 'Uống đủ nước, giữ ấm vùng cổ và đeo khẩu trang khi ra ngoài.';
    } else if (/(tim|huyết áp|hồi hộp|loạn nhịp|phù chân)/.test(text)) {
      khoa = 'Tim mạch'; maKhoa = 'TIM'; khanCap = true; mucDo = 'cao';
      cauTraLoi = 'Các triệu chứng liên quan đến tim mạch cần được khám sớm. Bạn có tiền sử bệnh tim mạch không?';
      loiKhuyen = 'Hạn chế vận động mạnh và đến khám ngay.';
    } else if (/(đau đầu|chóng mặt|tê bì|mất ngủ|co giật nhẹ|thần kinh)/.test(text)) {
      khoa = 'Thần kinh'; maKhoa = 'TK'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng của bạn có vẻ liên quan đến hệ thần kinh. Cơn đau đầu có kèm buồn nôn không?';
      loiKhuyen = 'Nghỉ ngơi, tránh ánh sáng mạnh và tiếng ồn.';
    } else if (/(đau bụng|tiêu chảy|nôn|buồn nôn|dạ dày|táo bón|đầy hơi)/.test(text)) {
      khoa = 'Tiêu hóa'; maKhoa = 'TH'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng của bạn liên quan đến hệ tiêu hóa. Bạn có đau vùng nào cụ thể không?';
      loiKhuyen = 'Ăn nhẹ, uống nhiều nước, tránh đồ cay nóng.';
    } else if (/(xương|khớp|đau lưng|đau gối|thoát vị|cột sống|mỏi)/.test(text)) {
      khoa = 'Cơ xương khớp'; maKhoa = 'CXK'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng của bạn liên quan đến cơ xương khớp. Cơn đau xuất hiện khi nào (vận động/nghỉ ngơi)?';
      loiKhuyen = 'Tránh mang vác nặng, chườm ấm nhẹ nhàng.';
    } else if (/(trẻ|bé|nhi|con|sơ sinh|trẻ em)/.test(text)) {
      khoa = 'Nhi khoa'; maKhoa = 'NHI'; mucDo = 'trung_binh';
      cauTraLoi = 'Vấn đề sức khỏe của trẻ sẽ được khám tại phòng Nhi khoa. Trẻ bao nhiêu tháng/tuổi và triệu chứng như thế nào?';
      loiKhuyen = 'Theo dõi nhiệt độ của bé thường xuyên, cho bé uống đủ nước.';
    } else if (/(ngứa|mẩn|mụn|dị ứng|da|nổi ban)/.test(text)) {
      khoa = 'Da liễu'; maKhoa = 'DA'; mucDo = 'thap';
      cauTraLoi = 'Triệu chứng trên da của bạn sẽ được khám ở phòng Da liễu. Triệu chứng xuất hiện ở vùng nào?';
      loiKhuyen = 'Tránh gãi, giữ vùng da sạch và khô thoáng.';
    }

    return {
      khoa,
      ma_khoa: maKhoa,
      khan_cap: khanCap,
      muc_do_uu_tien: mucDo,
      cau_tra_loi: cauTraLoi,
      can_hoi_them: true,
      cau_hoi_tiep_theo: null,
      loi_khuyen_so_bo: loiKhuyen,
      do_tin_cay: 0.75,
      source: 'rule_based',
    };
  }

  // ─── RESET SESSION ──────────────────────────────────────────────
  resetSession(sessionId: string) {
    chatSessions.delete(sessionId);
    return { success: true, message: 'Session đã được đặt lại.' };
  }

  // ─── DYNAMIC QUEUE ROUTING ──────────────────────────────────────
  async getDynamicQueueRouting(benhAnKhamId: number) {
    // Lấy danh sách CLS đang được chỉ định cho bệnh nhân
    const chiDinhList = await this.clsRepo.find({
      where: { benhAnKhamId },
      relations: ['dichVu'],
    });

    if (!chiDinhList || chiDinhList.length === 0) {
      return { success: true, data: { chiDinhList: [], routingPlan: [], thongDiep: 'Không có chỉ định CLS nào.' } };
    }

    // Đếm số người đang chờ tại từng loại phòng CLS
    const queueCounts: Record<string, { soNguoiCho: number; thoiGianChoCungTinh: number; loai: string }> = {};

    for (const chiDinh of chiDinhList) {
      const loai = chiDinh.dichVu?.loai || 'xet_nghiem';
      if (!queueCounts[loai]) {
        const count = await this.clsRepo.createQueryBuilder('cls')
          .innerJoin('cls.dichVu', 'dv')
          .where('dv.loai = :loai', { loai })
          .andWhere('cls.trangThai IN (:...statuses)', { statuses: ['cho_lay_mau', 'dang_lay_mau'] })
          .getCount();
        queueCounts[loai] = {
          soNguoiCho: count,
          thoiGianChoCungTinh: count * (loai === 'cdha' ? 12 : 7), // Siêu âm ~12 phút/người, XN ~7 phút
          loai,
        };
      }
    }

    // Thuật toán Greedy: Xếp ưu tiên theo thời gian chờ tăng dần (Shortest Queue First)
    const routingPlan = Object.entries(queueCounts)
      .sort((a, b) => a[1].thoiGianChoCungTinh - b[1].thoiGianChoCungTinh)
      .map(([loai, info], index) => ({
        buoc: index + 1,
        loaiPhong: loai === 'cdha' ? 'Chẩn đoán hình ảnh (Siêu âm / X-Quang)' : loai === 'xet_nghiem' ? 'Phòng Xét nghiệm máu' : 'Phòng Kỹ thuật viên',
        soNguoiCho: info.soNguoiCho,
        thoiGianUocTinh: `~${info.thoiGianChoCungTinh} phút`,
        khuyen_nghi: index === 0 ? '⭐ Đến đây TRƯỚC để tối ưu thời gian chờ' : `Sau đó đến phòng này`,
      }));

    const tongThoiGian = Object.values(queueCounts).reduce((s, v) => s + v.thoiGianChoCungTinh, 0);

    return {
      success: true,
      data: {
        chiDinhList: chiDinhList.map(c => ({ id: c.id, dichVu: c.dichVu?.tenDichVu, trangThai: c.trangThai })),
        routingPlan,
        tongThoiGianUocTinh: `~${tongThoiGian} phút`,
        thongDiep: `Hệ thống đề xuất thứ tự khám tối ưu để giảm thiểu tổng thời gian chờ còn ~${tongThoiGian} phút.`,
      },
    };
  }

  // ─── PATIENT VOLUME FORECASTING ─────────────────────────────────
  async getForecastLuongBenhNhan() {
    // Lấy dữ liệu lịch sử 60 ngày gần nhất từ MySQL
    const rawData = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .select('DATE(ltn.thoiGianDen)', 'ngay')
      .addSelect('COUNT(*)', 'soLuong')
      .where('ltn.thoiGianDen >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)')
      .groupBy('DATE(ltn.thoiGianDen)')
      .orderBy('ngay', 'ASC')
      .getRawMany();

    // Lấy dữ liệu theo giờ trong ngày hôm nay
    const rawByHour = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .select('HOUR(ltn.thoiGianDen)', 'gio')
      .addSelect('COUNT(*)', 'soLuong')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .groupBy('HOUR(ltn.thoiGianDen)')
      .orderBy('gio', 'ASC')
      .getRawMany();

    // Tính trung bình 7 ngày gần nhất (Simple Moving Average)
    const recent7 = rawData.slice(-7);
    const avg7 = recent7.length > 0
      ? Math.round(recent7.reduce((s, d) => s + Number(d.soLuong), 0) / recent7.length)
      : 20;

    // Tính trung bình theo thứ trong tuần (Weekly Seasonality)
    const weeklyAvg: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    rawData.forEach(d => {
      const dow = new Date(d.ngay).getDay();
      weeklyAvg[dow].push(Number(d.soLuong));
    });

    // Dự báo 7 ngày tới
    const forecast7Days = [];
    for (let i = 1; i <= 7; i++) {
      const ngay = new Date();
      ngay.setDate(ngay.getDate() + i);
      const dow = ngay.getDay();
      const dowAvg = weeklyAvg[dow].length > 0
        ? Math.round(weeklyAvg[dow].reduce((a, b) => a + b, 0) / weeklyAvg[dow].length)
        : avg7;
      // Kết hợp 70% SMA + 30% Weekly Seasonality
      const forecast = Math.round(avg7 * 0.7 + dowAvg * 0.3);
      const mucDo = forecast >= 60 ? 'cao' : forecast >= 35 ? 'trung_binh' : 'thap';
      forecast7Days.push({
        ngay: ngay.toISOString().slice(0, 10),
        thuTrong_tuan: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow],
        du_bao: forecast,
        muc_do: mucDo,
        goi_y_nhan_su: forecast >= 60
          ? `Ngày đông bệnh nhân (dự báo ~${forecast}), nên tăng cường thêm 1-2 bác sĩ`
          : forecast >= 35
          ? `Lưu lượng trung bình (~${forecast}), nhân sự hiện tại phù hợp`
          : `Ngày ít bệnh nhân (~${forecast}), có thể điều phối nhân sự linh hoạt`,
      });
    }

    // Dữ liệu biểu đồ theo giờ hôm nay
    const heatmapHomNay = Array.from({ length: 10 }, (_, i) => {
      const gio = i + 8; // 8h - 17h
      const found = rawByHour.find(h => Number(h.gio) === gio);
      return { gio: `${gio}:00`, soLuong: found ? Number(found.soLuong) : 0 };
    });

    return {
      success: true,
      data: {
        tongQuan: {
          trungBinh7Ngay: avg7,
          tongHomNay: rawByHour.reduce((s, h) => s + Number(h.soLuong), 0),
        },
        forecast7Days,
        heatmapHomNay,
        lichSu60Ngay: rawData.map(d => ({ ngay: d.ngay, soLuong: Number(d.soLuong) })),
      },
    };
  }

  // ─── LEGACY API (backward compat) ────────────────────────────────
  async goiYChuyenKhoa(trieuChung: string) {
    const result = await this.phanLuongNhanh(trieuChung);
    const d = result.data;
    return {
      message: 'Phân tích triệu chứng thành công',
      data: {
        trieuChungGoc: trieuChung,
        chuyenKhoaGoiY: d.khoa,
        mucDoCanCap: d.khan_cap ? 'khan_cap' : d.muc_do_uu_tien,
        loiKhuyen: d.loi_khuyen_so_bo,
        moTa: d.cau_tra_loi,
        doChinhXac: `${Math.round(d.do_tin_cay * 100)}%`,
      },
    };
  }
}
