import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LuotTiepNhan, SinhHieu } from '../tiep-nhan/entities/tiep-nhan.entity';
import { ChiDinhCanLamSang, KetQuaXetNghiem } from '../xet-nghiem/entities/xet-nghiem.entity';
import { BenhNhan } from '../benh-nhan/entities/benh-nhan.entity';
import { HoSoBenhAn, BenhAnKham } from '../ho-so-benh-an/entities/ho-so-benh-an.entity';
import { DonThuoc } from '../nha-thuoc/entities/don-thuoc.entity';

// ─── In-memory session store ────────────────────────────────────
const triageSessions: Map<string, Array<{ role: string; parts: Array<{ text: string }> }>> = new Map();
const patientSessions: Map<string, Array<{ role: string; parts: Array<{ text: string }> }>> = new Map();

// ─── System Prompt Y Khoa cho Triage (Khách vãng lai & Tiếp tân) ───────────
const MEDICAL_TRIAGE_PROMPT = `
Bạn là Trợ Lý Phân Luồng & Tiếp Nhận Y Tế Thông Minh của Phòng Khám Đa Khoa.
Nhiệm vụ của bạn là lắng nghe triệu chứng của bệnh nhân, đối đáp lịch sự, đồng cảm, ghi nhận thông tin, hỏi thêm 1 câu hỏi trọng tâm nếu thật sự cần thiết, và gợi ý phân luồng chuyên khoa chính xác nhất.

QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. ĐỌC KỸ TOÀN BỘ LỊCH SỬ CHAT TRƯỚC ĐÓ VÀ TUYỆT ĐỐI CẤM "HỎI THỪA":
   - CẤM TUYỆT ĐỐI hỏi lại bất kỳ thông tin nào mà bệnh nhân ĐÃ CUNG CẤP trong lịch sử hội thoại (ví dụ: nhiệt độ sốt, thời gian bị bệnh, triệu chứng ho/đau/nôn, hay đối tượng là người lớn hay trẻ em).
   - Nếu bệnh nhân đã nói "sốt 39 độ", KHÔNG BAO GIỜ được hỏi lại "bạn có sốt trên 38.5 độ không?". Thay vào đó, hãy xác nhận: "Dạ tôi đã ghi nhận bé/bạn đang sốt cao 39 độ...".
   - Nếu bệnh nhân tỏ thái độ bực mình vì bị hỏi lại ("đã nói rồi...", "vừa bảo ở trên...", "sao hỏi hoài..."): Phải lập tức tạ lỗi chân thành, nhã nhặn, khẳng định đã nắm rõ thông tin đó và đưa ra kết luận phân luồng hoặc chỉ hỏi về dấu hiệu nguy hiểm khác.
   - Nếu trong câu có từ "bé", "con tôi", "cháu", "trẻ": Đây là bệnh nhân TRẺ EM, tự động phân luồng vào "Nhi khoa", xưng hô thân mật với phụ huynh (ba/mẹ/bạn), tuyệt đối không hỏi "bạn bao nhiêu tuổi" như người lớn.

2. CÂU TRẢ LỜI ĐỘNG, TỰ NHIÊN ("cau_tra_loi"):
   - Không trả lời theo mẫu rập khuôn máy móc. Hãy tự sáng tác câu trả lời mềm mỏng, ấm áp như nhân viên y tế thật.
   - Nếu đã đủ dấu hiệu rõ ràng (ví dụ sốt cao kèm ho nhiều, hoặc tức ngực khó thở): Phân luồng ngay, không hỏi lòng vòng làm mất thời gian cấp bách của người bệnh.
   - Nếu cần hỏi thêm: Chỉ hỏi đúng 1 câu ngắn gọn về các dấu hiệu cảnh báo nguy hiểm (khó thở, thở rút lõm lồng ngực, li bì, tím tái, nôn ói liên tục...).

3. ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (CHỈ TRẢ VỀ JSON DUY NHẤT):
{
  "chuyen_khoa": "Tên chuyên khoa gợi ý (Ví dụ: Nhi khoa hoặc Hô hấp / Tai Mũi Họng)",
  "khoa": "Tên chuyên khoa giống chuyen_khoa",
  "ma_khoa": "NHI | HH_TMH | CAP_CUU | TIM | TH | TK | CXK | DA | MAT | NOI",
  "khan_cap": false,
  "muc_do_uu_tien": "thap | trung_binh | cao | khan_cap",
  "cau_tra_loi": "Câu trả lời đối thoại trực tiếp hiển thị cho người bệnh (tự nhiên, đồng cảm, ghi nhận thông tin đã cung cấp, KHÔNG hỏi lặp lại)",
  "can_hoi_them": false,
  "cau_hoi_tiep_theo": null,
  "loi_khuyen_so_bo": "Lời khuyên chăm sóc tạm thời ngắn gọn",
  "do_tin_cay": 0.92
}

DANH SÁCH CHUYÊN KHOA PHÒNG KHÁM:
- "Nhi khoa" (ma_khoa: "NHI") — Trẻ em dưới 15 tuổi (sốt, ho, tiêu hóa, hô hấp ở trẻ em).
- "Hô hấp / Tai Mũi Họng" (ma_khoa: "HH_TMH") — Ho, đau họng, sốt, nghẹt mũi, viêm tai, viêm xoang ở NGƯỜI LỚN.
- "Cấp cứu" (ma_khoa: "CAP_CUU") — Co giật, khó thở dữ dội, đau thắt ngực cấp, hôn mê, chấn thương nặng.
- "Tim mạch" (ma_khoa: "TIM") — Tức ngực, hồi hộp, tăng huyết áp nguy hiểm, loạn nhịp tim.
- "Tiêu hóa" (ma_khoa: "TH") — Đau bụng, nôn ói, tiêu chảy, xuất huyết tiêu hóa.
- "Thần kinh" (ma_khoa: "TK") — Đau nửa đầu, chóng mặt mất thăng bằng, co giật, tê liệt vận động.
- "Cơ xương khớp" (ma_khoa: "CXK") — Đau lưng, khớp sưng đau, chấn thương mô mềm.
- "Da liễu" (ma_khoa: "DA") — Dị ứng, nổi mề đay, mẩn đỏ, phát ban ngoài da.
- "Mắt" (ma_khoa: "MAT") — Mờ mắt, đau rát mắt, chảy mủ, dị vật vào mắt.
- "Nội tổng quát" (ma_khoa: "NOI") — Kiểm tra sức khỏe chung, triệu chứng chưa khu trú rõ.
`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private triageModel: GenerativeModel | null = null;
  private patientModel: GenerativeModel | null = null;
  private readonly PYTHON_ML_URL = 'http://localhost:5001';

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(LuotTiepNhan) private tiepNhanRepo: Repository<LuotTiepNhan>,
    @InjectRepository(SinhHieu) private sinhHieuRepo: Repository<SinhHieu>,
    @InjectRepository(ChiDinhCanLamSang) private clsRepo: Repository<ChiDinhCanLamSang>,
    @InjectRepository(KetQuaXetNghiem) private kqRepo: Repository<KetQuaXetNghiem>,
    @InjectRepository(BenhNhan) private benhNhanRepo: Repository<BenhNhan>,
    @InjectRepository(HoSoBenhAn) private hoSoRepo: Repository<HoSoBenhAn>,
    @InjectRepository(BenhAnKham) private benhAnRepo: Repository<BenhAnKham>,
    @InjectRepository(DonThuoc) private donThuocRepo: Repository<DonThuoc>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        // Model Triage (Single/Multi-turn JSON)
        this.triageModel = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
          systemInstruction: MEDICAL_TRIAGE_PROMPT,
        });

        // Model Bác Sĩ Gia Đình Bệnh Nhân (Context-Aware Chat)
        this.patientModel = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.35,
          },
        });

        this.logger.log('✅ Gemini AI (gemini-2.5-flash) initialized successfully for both Triage and Patient Assistant');
      } catch (err) {
        this.logger.warn('⚠️ Gemini AI init failed, fallback to rule-based:', err.message);
      }
    } else {
      this.logger.warn('⚠️ GEMINI_API_KEY not set, using rule-based fallback');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. TRỢ LÝ AI BỆNH NHÂN (CONTEXT-AWARE RAG - BÁC SĨ GIA ĐÌNH ẢO)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Truy xuất và tổng hợp toàn bộ hồ sơ bệnh án thật từ CSDL của bệnh nhân (RAG)
   */
  async buildPatientClinicalContext(userId: number) {
    let benhNhan = await this.benhNhanRepo.findOne({ where: { nguoiDungId: userId } });
    if (!benhNhan) {
      benhNhan = await this.benhNhanRepo.findOne({ where: { id: userId } });
    }

    if (!benhNhan) {
      return {
        contextText: 'Không tìm thấy hồ sơ cá nhân của bệnh nhân trong cơ sở dữ liệu.',
        summary: null,
      };
    }

    // Lấy hồ sơ bệnh án
    const hoSo = await this.hoSoRepo.findOne({ where: { benhNhanId: benhNhan.id } });

    // Lấy các lần khám gần nhất (lấy tối đa 3 lần khám gần nhất)
    let dsBenhAn: BenhAnKham[] = [];
    if (hoSo) {
      dsBenhAn = await this.benhAnRepo.find({
        where: { hoSoBenhAnId: hoSo.id },
        order: { ngayKham: 'DESC' },
        take: 3,
      });
    }

    const bakIds = dsBenhAn.map(b => b.id);

    // Lấy sinh hiệu lần khám gần nhất
    let sinhHieuText = 'Chưa có dữ liệu đo sinh hiệu.';
    let sinhHieuObj: any = null;
    if (dsBenhAn.length > 0 && dsBenhAn[0].luotTiepNhanId) {
      const sh = await this.sinhHieuRepo.findOne({
        where: { luotTiepNhanId: dsBenhAn[0].luotTiepNhanId },
        order: { id: 'DESC' },
      });
      if (sh) {
        sinhHieuObj = sh;
        const bmi = (sh.chieuCaoCm && sh.canNangKg)
          ? (sh.canNangKg / ((sh.chieuCaoCm / 100) * (sh.chieuCaoCm / 100))).toFixed(1)
          : 'N/A';
        sinhHieuText = `Huyết áp: ${sh.huyetApTamThu || '--'}/${sh.huyetApTamTruong || '--'} mmHg, Nhịp tim: ${sh.nhipTim || '--'} lần/phút, Nhiệt độ: ${sh.nhietDoC || '--'}°C, SpO2: ${sh.spo2 || '--'}%, Cân nặng: ${sh.canNangKg || '--'} kg, Chiều cao: ${sh.chieuCaoCm || '--'} cm (BMI: ${bmi})`;
      }
    }

    // Lấy danh sách xét nghiệm và kết quả
    let clsList: ChiDinhCanLamSang[] = [];
    if (bakIds.length > 0) {
      clsList = await this.clsRepo.createQueryBuilder('cls')
        .leftJoinAndSelect('cls.dichVu', 'dv')
        .where('cls.benhAnKhamId IN (:...bakIds)', { bakIds })
        .orderBy('cls.thoiGianChiDinh', 'DESC')
        .getMany();
    }

    const ketQuaMap: Record<number, KetQuaXetNghiem> = {};
    if (clsList.length > 0) {
      const clsIds = clsList.map(c => c.id);
      const kqList = await this.kqRepo.createQueryBuilder('kq')
        .where('kq.chiDinhId IN (:...clsIds)', { clsIds })
        .getMany();
      kqList.forEach(k => { ketQuaMap[k.chiDinhId] = k; });
    }

    let xetNghiemText = 'Chưa có chỉ định xét nghiệm nào.';
    if (clsList.length > 0) {
      xetNghiemText = clsList.map((c, idx) => {
        const kq = ketQuaMap[c.id];
        const kqStr = kq
          ? ` -> KẾT QUẢ: ${kq.giaTri || ''} (${kq.donVi || ''}). Nhận xét bác sĩ/KTV: ${kq.nhanXet || 'Bình thường'}`
          : ' (Trạng thái: Đang xử lý / Chờ kết quả)';
        return `${idx + 1}. ${c.dichVu?.tenDichVu || 'Xét nghiệm'}: Trạng thái [${c.trangThai}]${kqStr}`;
      }).join('\n');
    }

    // Lấy đơn thuốc và chi tiết thuốc
    let donThuocList: DonThuoc[] = [];
    if (bakIds.length > 0) {
      donThuocList = await this.donThuocRepo.createQueryBuilder('dt')
        .leftJoinAndSelect('dt.chiTiet', 'ct')
        .leftJoinAndSelect('ct.thuoc', 'thuoc')
        .where('dt.benhAnKhamId IN (:...bakIds)', { bakIds })
        .orderBy('dt.ngayKe', 'DESC')
        .getMany();
    }

    let donThuocText = 'Hiện tại chưa có đơn thuốc nào được kê.';
    if (donThuocList.length > 0) {
      const items: string[] = [];
      donThuocList.forEach((dt) => {
        dt.chiTiet?.forEach((ct) => {
          items.push(`- ${ct.thuoc?.tenThuoc || 'Thuốc'} (${ct.thuoc?.tenHoatChat || ''}): Số lượng ${ct.soLuong} ${ct.thuoc?.donViTinh || 'viên'}. Cách dùng: ${ct.lieuDung || 'Theo chỉ định'} (Uống trong ${ct.soNgayDung || 5} ngày)`);
        });
      });
      if (items.length > 0) {
        donThuocText = items.join('\n');
      }
    }

    // Lần khám gần nhất
    const ganNhat = dsBenhAn.length > 0 ? dsBenhAn[0] : null;
    const ngayKhamStr = ganNhat?.ngayKham ? new Date(ganNhat.ngayKham).toLocaleDateString('vi-VN') : 'Chưa có';
    const taiKhamStr = ganNhat?.taiKham ? new Date(ganNhat.taiKham).toLocaleDateString('vi-VN') : 'Theo dõi tại nhà';

    const contextText = `
=== HỒ SƠ Y TẾ THẬT CỦA BỆNH NHÂN (TRÍCH XUẤT TỪ CSDL PHÒNG KHÁM) ===
* Họ và tên: ${benhNhan.hoTen}
* Mã bệnh nhân: ${benhNhan.maBenhNhan}
* Ngày sinh: ${benhNhan.ngaySinh || 'Chưa cập nhật'} | Giới tính: ${benhNhan.gioiTinh || 'Chưa rõ'}
* Nhóm máu: ${benhNhan.nhomMau || 'Chưa xác định'}
* Tiền sử bệnh: ${benhNhan.tienSuBenh || 'Không ghi nhận bệnh nền đặc biệt'}
* Dị ứng thuốc/thực phẩm: ${benhNhan.diUng || 'Không ghi nhận dị ứng'}

* ĐỢT KHÁM GẦN NHẤT (${ngayKhamStr}):
- Triệu chứng lúc khám: ${ganNhat?.trieuChung || 'Không có triệu chứng ghi nhận'}
- Chỉ số sinh hiệu: ${sinhHieuText}
- Chẩn đoán sơ bộ: ${ganNhat?.chanDoanSoBo || 'Đang theo dõi'}
- Chẩn đoán xác định: ${ganNhat?.chanDoanXacDinh || ganNhat?.chanDoanSoBo || 'Chưa có chẩn đoán cuối'}
- Hướng điều trị của Bác sĩ: ${ganNhat?.phuongPhapDieuTri || 'Dùng thuốc theo đơn và nghỉ ngơi'}
- Lịch hẹn tái khám: ${taiKhamStr}

* KẾT QUẢ CẬN LÂM SÀNG & XÉT NGHIỆM:
${xetNghiemText}

* ĐƠN THUỐC ĐANG ĐIỀU TRỊ:
${donThuocText}
=====================================================================
`;

    const summary = {
      hoTen: benhNhan.hoTen,
      maBenhNhan: benhNhan.maBenhNhan,
      chanDoanGanNhat: ganNhat?.chanDoanXacDinh || ganNhat?.chanDoanSoBo || 'Chưa có chẩn đoán',
      ngayKham: ngayKhamStr,
      taiKham: taiKhamStr,
      soThuocDangUong: donThuocList.reduce((acc, dt) => acc + (dt.chiTiet?.length || 0), 0),
      soXetNghiem: clsList.length,
      sinhHieu: sinhHieuObj,
    };

    return { contextText, summary };
  }

  /**
   * Chat với Bác Sĩ Gia Đình AI (Multi-turn có RAG ngữ cảnh bệnh án)
   */
  async patientChat(userId: number, sessionId: string, message: string) {
    const { contextText, summary } = await this.buildPatientClinicalContext(userId);

    // Lấy hoặc tạo session
    if (!patientSessions.has(sessionId)) {
      patientSessions.set(sessionId, []);
    }
    const history = patientSessions.get(sessionId)!;

    const patientSystemPrompt = `
Bạn là "Bác Sĩ Gia Đình AI 24/7" tận tâm, chu đáo và am hiểu chuyên môn của Phòng Khám Đa Khoa.
Bạn đang trực tiếp đồng hành và tư vấn sức khỏe cho bệnh nhân ${summary?.hoTen || 'bạn'}.

${contextText}

NHIỆM VỤ VÀ NĂNG LỰC CỦA BẠN:
1. "Phiên dịch" Bệnh án & Xét nghiệm: Đọc và giải thích dễ hiểu các chỉ số xét nghiệm, kết quả khám cho bệnh nhân; trấn an tinh thần và giải thích lý do bác sĩ đưa ra chẩn đoán đó.
2. Hướng dẫn sử dụng thuốc an toàn: Nắm rõ các thuốc trong đơn hiện tại, hướng dẫn thời điểm uống (uống trước/sau ăn, uống lúc đói hay no), nhắc nhở các tác dụng phụ thường gặp (như buồn ngủ, cồn cào ruột nhẹ) và cách xử trí. Luôn đối chiếu với tiền sử dị ứng.
3. Chăm sóc Dinh dưỡng & Sinh hoạt: Lời khuyên cụ thể về món nên ăn, món cần kiêng khem và chế độ vận động phù hợp với chẩn đoán hiện tại (Ví dụ: đau dạ dày thì tránh đồ chua cay, huyết áp cao thì giảm muối, đái tháo đường thì hạn chế đường tinh luyện).
4. Theo dõi hồi phục & Cảnh báo an toàn: Lắng nghe tiến triển của bệnh nhân. Nếu xuất hiện dấu hiệu bất thường (sốt cao kéo dài không hạ, đau ngực dữ dội, khó thở, nôn ra máu, phát ban phù nề), khuyên bệnh nhân đến ngay phòng khám hoặc cấp cứu kịp thời.

QUY TẮC GIAO TIẾP:
- Xưng hô thân thiện: "Bác sĩ" (hoặc "Tôi") và gọi người dùng là "bạn" hoặc "anh/chị ${summary?.hoTen || ''}".
- Trả lời bằng tiếng Việt tự nhiên, ấm áp, có định dạng rõ ràng (dùng Markdown, gạch đầu dòng, in đậm tên thuốc và chỉ số quan trọng).
- KHÔNG TRẢ VỀ JSON! Trả lời dưới dạng văn bản đàm thoại trực tiếp như bác sĩ gia đình đang nhắn tin tư vấn.
- Cuối câu trả lời, luôn có một lời chúc hoặc dặn dò bệnh nhân giữ gìn sức khỏe / tái khám đúng hẹn.
`;

    if (this.patientModel) {
      try {
        const fullPrompt = history.length === 0
          ? `${patientSystemPrompt}\n\nCâu hỏi của bệnh nhân: ${message}`
          : message;

        const chat = this.patientModel.startChat({
          history: [...history],
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 7000),
        );

        const result: any = await Promise.race([
          chat.sendMessage(fullPrompt),
          timeoutPromise,
        ]);

        const rawReply = result.response.text().trim();

        // Lưu vào history
        history.push(
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: [{ text: rawReply }] },
        );
        patientSessions.set(sessionId, history.slice(-16));

        return {
          success: true,
          reply: rawReply,
          summary,
          source: 'gemini',
        };
      } catch (err) {
        this.logger.error('Gemini Patient Assistant error:', err.message);
      }
    }

    // Fallback: Rule-based Clinical Response dựa trên dữ liệu thật nếu API Gemini gặp sự cố
    const fallbackReply = this.generateFallbackClinicalReply(message, summary, contextText);
    return {
      success: true,
      reply: fallbackReply,
      summary,
      source: 'clinical_rag_fallback',
    };
  }

  /**
   * Bộ tạo phản hồi thông minh dựa trên chính hồ sơ bệnh án thật khi Gemini bận/offline
   */
  private generateFallbackClinicalReply(message: string, summary: any, contextText: string): string {
    const text = (message || '').toLowerCase();
    const ten = summary?.hoTen || 'bạn';
    const chanDoan = summary?.chanDoanGanNhat || 'Sức khỏe tổng quát';

    if (text.includes('bệnh án') || text.includes('kết quả') || text.includes('hồ sơ')) {
      return `Chào ${ten}! Theo hồ sơ y tế gần nhất của bạn tại phòng khám (ngày ${summary?.ngayKham || 'gần đây'}):\n\n` +
        `- **Chẩn đoán của Bác sĩ:** ${chanDoan}\n` +
        `- **Sinh hiệu ghi nhận:** ${summary?.sinhHieu ? `Huyết áp ${summary.sinhHieu.huyetApTamThu || '--'}/${summary.sinhHieu.huyetApTamTruong || '--'} mmHg, Mạch ${summary.sinhHieu.nhipTim || '--'} l/p, SpO2 ${summary.sinhHieu.spo2 || '--'}%` : 'Bình thường'}\n` +
        `- **Số thuốc trong toa:** ${summary?.soThuocDangUong || 0} loại thuốc đang điều trị\n` +
        `- **Ngày hẹn tái khám:** ${summary?.taiKham || 'Tái khám khi có dấu hiệu bất thường'}\n\n` +
        `Bạn hãy tuân thủ uống thuốc đầy đủ theo đơn và nghỉ ngơi hợp lý. Bạn cần tôi hướng dẫn thêm về cách dùng thuốc hay chế độ ăn uống nào không?`;
    }

    if (text.includes('thuốc') || text.includes('uống') || text.includes('uong')) {
      return `Chào ${ten}! Đối với đơn thuốc điều trị **${chanDoan}** của bạn:\n\n` +
        `1. **Thời điểm dùng thuốc:** Các thuốc kháng viêm, kháng sinh hoặc thuốc huyết áp nên uống **sau bữa ăn no 15-30 phút** với nhiều nước lọc để tránh kích ứng dạ dày.\n` +
        `2. **Lưu ý quan trọng:** Uống đúng liều lượng bác sĩ kê, không tự ý ngưng thuốc khi thấy đỡ đau hoặc tự ý tăng liều.\n` +
        `3. **Tác dụng phụ thường gặp:** Một số thuốc có thể gây cảm giác buồn ngủ nhẹ hoặc khô miệng — bạn nên uống đủ nước và hạn chế lái xe đường dài sau khi uống thuốc.\n\n` +
        `Nếu có biểu hiện dị ứng như ngứa mẩn đỏ hoặc khó thở, bạn cần ngưng thuốc và đến phòng khám ngay lập tức nhé!`;
    }

    if (text.includes('ăn') || text.includes('kiêng') || text.includes('dinh dưỡng') || text.includes('thực đơn')) {
      return `Chào ${ten}! Lời khuyên dinh dưỡng phù hợp nhất cho bệnh **${chanDoan}** của bạn:\n\n` +
        `- **Nên ăn:** Các món ăn thanh đạm, giàu chất xơ, rau xanh củ quả tươi, uống đủ 2 lít nước mỗi ngày.\n` +
        `- **Cần kiêng/hạn chế:** Thức ăn quá nhiều dầu mỡ, đồ chiên xào, thức ăn quá mặn (đặc biệt nếu có huyết áp cao), tránh đồ cay nóng nhiều ớt tiêu, và hạn chế rượu bia, cà phê.\n` +
        `- **Lối sống:** Ngủ đủ 7-8 tiếng mỗi đêm, tránh thức khuya và giữ tinh thần thoải mái.\n\n` +
        `Chúc bạn mau chóng hồi phục sức khỏe!`;
    }

    return `Chào ${ten}! Tôi đã ghi nhận câu hỏi của bạn. Dựa trên hồ sơ bệnh án gần nhất (${chanDoan}):\n\n` +
      `Bác sĩ khuyên bạn tiếp tục dùng thuốc đúng theo toa đã kê, theo dõi các triệu chứng hàng ngày và giữ gìn sức khỏe. Lịch hẹn tái khám của bạn là: **${summary?.taiKham || 'khi hết thuốc'}**.\n\n` +
      `Nếu có bất kỳ dấu hiệu mệt nhiều, sốt cao hoặc đau tăng dần, hãy liên hệ hotline phòng khám hoặc đến khám lại ngay nhé!`;
  }

  /**
   * Reset session chat của bệnh nhân
   */
  resetPatientSession(sessionId: string) {
    patientSessions.delete(sessionId);
    return { success: true, message: 'Đã làm mới cuộc trò chuyện với Bác Sĩ Gia Đình AI.' };
  }

  /**
   * Lấy tóm tắt hồ sơ y tế bệnh nhân cho Header chat
   */
  async getPatientSummary(userId: number) {
    const { summary } = await this.buildPatientClinicalContext(userId);
    return summary;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. TRIAGE CHAT (Multi-turn cho Tiếp tân & Khách vãng lai)
  // ═══════════════════════════════════════════════════════════════════
  async triageChat(
    sessionId: string, 
    message: string, 
    clientHistory?: Array<{ role: string; text?: string; content?: string }>
  ) {
    if (this.triageModel) {
      return this.triageChatGemini(sessionId, message, clientHistory);
    }
    return this.triageChatRuleBased(message, clientHistory);
  }

  private async triageChatGemini(
    sessionId: string, 
    userMessage: string, 
    clientHistory?: Array<{ role: string; text?: string; content?: string }>
  ) {
    if (!triageSessions.has(sessionId)) {
      triageSessions.set(sessionId, []);
    }
    const history = triageSessions.get(sessionId)!;

    // 1. Đồng bộ lịch sử trò chuyện từ Client nếu có truyền lên (Context-Aware)
    if (clientHistory && Array.isArray(clientHistory) && clientHistory.length > 0) {
      const sanitized: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      for (const item of clientHistory) {
        const rawRole = (item.role || '').toLowerCase();
        const role = (rawRole === 'user') ? 'user' : 'model';
        const text = (item.text || item.content || '').trim();
        if (text && !text.startsWith('⚠️') && !text.startsWith('🔄')) {
          if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
            sanitized[sanitized.length - 1].parts[0].text += `\n${text}`;
          } else {
            sanitized.push({ role, parts: [{ text }] });
          }
        }
      }
      // Gemini startChat yêu cầu: phần tử đầu phải là user và phần tử cuối phải là model
      while (sanitized.length > 0 && sanitized[0].role !== 'user') {
        sanitized.shift();
      }
      while (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'model') {
        sanitized.pop();
      }
      if (sanitized.length > 0) {
        history.length = 0;
        history.push(...sanitized.slice(-10));
      }
    }

    try {
      const chat = this.triageModel!.startChat({
        history: [...history],
      });

      // Tăng timeout lên 10s tránh rớt vô cớ sang rule-based khi mạng trễ nhẹ
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 10000),
      );

      const sendPromise = chat.sendMessage(userMessage);
      const result: any = await Promise.race([sendPromise, timeoutPromise]);
      const rawText = result.response.text().trim();
      const parsed = JSON.parse(rawText);

      // Chuẩn hóa 2 trường rạch ròi theo yêu cầu:
      parsed.chuyen_khoa = parsed.chuyen_khoa || parsed.khoa || 'Nội tổng quát';
      parsed.khoa = parsed.khoa || parsed.chuyen_khoa;

      // Lưu tin nhắn đối thoại tự nhiên vào trí nhớ hội thoại để Gemini có "trí nhớ" mượt mà
      history.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: parsed.cau_tra_loi || rawText }] },
      );
      triageSessions.set(sessionId, history.slice(-16));

      return { ...parsed, source: 'gemini' };
    } catch (err) {
      this.logger.error('Gemini API error / timeout:', err.message);
      return this.triageChatRuleBased(userMessage, clientHistory);
    }
  }

  // ─── PHÂN LUỒNG NHANH (single-turn, dùng cho tiếp tân) ─────────
  async phanLuongNhanh(trieuChung: string) {
    if (this.triageModel) {
      const prompt = `Triệu chứng bệnh nhân: "${trieuChung}". Hãy phân tích và trả về JSON phân luồng chuyên khoa.`;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 10000),
        );
        const result: any = await Promise.race([
          this.triageModel.generateContent(prompt),
          timeoutPromise,
        ]);
        const rawText = result.response.text().trim();
        const parsed = JSON.parse(rawText);
        parsed.chuyen_khoa = parsed.chuyen_khoa || parsed.khoa || 'Nội tổng quát';
        parsed.khoa = parsed.khoa || parsed.chuyen_khoa;
        return { ...parsed, source: 'gemini' };
      } catch (err) {
        this.logger.error('Gemini quick triage error / timeout:', err.message);
      }
    }
    return this.triageChatRuleBased(trieuChung);
  }

  // ─── RULE-BASED FALLBACK THÔNG MINH (Không bao giờ hỏi lặp câu vô lý) ──────
  private triageChatRuleBased(
    trieuChung: string, 
    clientHistory?: Array<{ role: string; text?: string; content?: string }>
  ) {
    const text = (trieuChung || '').toLowerCase();
    const historyText = (clientHistory || []).map(h => (h.text || '').toLowerCase()).join(' ');
    const fullContext = `${historyText} ${text}`;

    const isChild = /(trẻ|bé|nhi|con|sơ sinh|cháu|trẻ em)/.test(fullContext);
    const hasFeverValue = /(3[8-9](\.\d+)?|4[0-2](\.\d+)?|sốt cao|sốt \d+)/.test(fullContext);
    const isUserComplaining = /(đã nói|nói rồi|vừa bảo|sao hỏi lại|hỏi hoài|bảo rồi)/.test(text);

    let khoa = isChild ? 'Nhi khoa' : 'Nội tổng quát';
    let maKhoa = isChild ? 'NHI' : 'NOI';
    let khanCap = false;
    let mucDo = 'trung_binh';
    let cauTraLoi = '';
    let loiKhuyen = 'Vui lòng đưa người bệnh đến phòng khám để bác sĩ thăm khám và kiểm tra cụ thể.';

    if (/(nguy kịch|co giật|hôn mê|ngất|thở khò khè nặng|tím tái|đột quỵ|chảy máu nhiều)/.test(fullContext)) {
      khoa = 'Cấp cứu'; maKhoa = 'CAP_CUU'; khanCap = true; mucDo = 'khan_cap';
      cauTraLoi = '🚨 Triệu chứng có dấu hiệu rất nguy hiểm! Vui lòng đưa người bệnh đến ngay phòng CẤP CỨU hoặc gọi 115 ngay lập tức.';
      loiKhuyen = 'Đến cơ sở y tế gần nhất NGAY LẬP TỨC!';
    } else if (isChild) {
      khoa = 'Nhi khoa'; maKhoa = 'NHI'; mucDo = hasFeverValue ? 'cao' : 'trung_binh';
      if (isUserComplaining) {
        cauTraLoi = 'Dạ xin lỗi ba/mẹ, tôi đã ghi nhận rõ tình trạng sốt và các triệu chứng của bé rồi ạ. Ba/mẹ hãy đưa bé đến chuyên khoa Nhi khoa để bác sĩ thăm khám và hạ sốt kịp thời.';
      } else if (hasFeverValue) {
        cauTraLoi = 'Dạ tôi đã ghi nhận bé đang sốt cao kèm triệu chứng ho. Ba/mẹ nên đưa bé đến chuyên khoa Nhi khoa thăm khám sớm. Ngoài ho và sốt, bé có biểu hiện thở dốc, nôn trớ hay bỏ bú không ạ?';
      } else {
        cauTraLoi = 'Các triệu chứng của bé cần được bác sĩ chuyên khoa Nhi khoa thăm khám trực tiếp để bảo đảm an toàn.';
      }
      loiKhuyen = 'Cho bé uống nhiều nước/bú đều, mặc đồ thoáng mát và theo dõi sát nhiệt độ.';
    } else if (/(tức ngực|đau ngực|khó thở|hồi hộp|loạn nhịp)/.test(text)) {
      khoa = 'Tim mạch'; maKhoa = 'TIM'; mucDo = 'cao';
      cauTraLoi = 'Các biểu hiện vùng ngực và nhịp tim cần được thăm khám tại chuyên khoa Tim mạch sớm để phòng tránh rủi ro.';
      loiKhuyen = 'Nghỉ ngơi tại chỗ, tránh xúc động mạnh và đến khám sớm.';
    } else if (/(ho|sốt|đau họng|nghẹt mũi|viêm xoang|khản tiếng)/.test(text)) {
      khoa = 'Hô hấp / Tai Mũi Họng'; maKhoa = 'HH_TMH'; mucDo = 'trung_binh';
      if (isUserComplaining) {
        cauTraLoi = 'Dạ tôi thành thật xin lỗi bạn vì sự bất tiện này. Tôi đã nắm rõ các triệu chứng bạn vừa nêu và đề xuất bạn đến chuyên khoa Hô hấp / Tai Mũi Họng thăm khám.';
      } else if (hasFeverValue) {
        cauTraLoi = 'Tôi đã ghi nhận bạn có sốt cao kèm triệu chứng đường hô hấp. Bạn nên đến chuyên khoa Hô hấp / Tai Mũi Họng để kiểm tra họng và phổi sớm.';
      } else {
        cauTraLoi = 'Triệu chứng của bạn liên quan đến đường hô hấp, bạn nên đến chuyên khoa Hô hấp / Tai Mũi Họng để bác sĩ nội soi và kê đơn phù hợp.';
      }
      loiKhuyen = 'Uống nước ấm, súc họng nước muối và đeo khẩu trang y tế.';
    } else if (/(đau đầu|chóng mặt|tê bì|mất ngủ|thần kinh)/.test(text)) {
      khoa = 'Thần kinh'; maKhoa = 'TK'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng đau đầu, chóng mặt cần được thăm khám tại chuyên khoa Thần kinh để xác định nguyên nhân chính xác.';
      loiKhuyen = 'Nghỉ ngơi nơi yên tĩnh, hạn chế sử dụng điện thoại/máy tính.';
    } else if (/(đau bụng|tiêu chảy|nôn|buồn nôn|dạ dày|táo bón)/.test(text)) {
      khoa = 'Tiêu hóa'; maKhoa = 'TH'; mucDo = 'trung_binh';
      cauTraLoi = 'Triệu chứng tiêu hóa của bạn nên được kiểm tra tại chuyên khoa Tiêu hóa để được siêu âm hoặc xét nghiệm nếu cần.';
      loiKhuyen = 'Uống nhiều nước, ăn cháo nhẹ hoặc thức ăn dễ tiêu hóa.';
    } else if (/(xương|khớp|đau lưng|đau gối|thoát vị|cột sống)/.test(text)) {
      khoa = 'Cơ xương khớp'; maKhoa = 'CXK'; mucDo = 'trung_binh';
      cauTraLoi = 'Tình trạng đau mỏi xương khớp phù hợp khám tại chuyên khoa Cơ xương khớp.';
      loiKhuyen = 'Hạn chế mang vác nặng, chườm ấm vị trí đau.';
    } else if (/(ngứa|mẩn|mụn|dị ứng|da|nổi ban)/.test(text)) {
      khoa = 'Da liễu'; maKhoa = 'DA'; mucDo = 'thap';
      cauTraLoi = 'Các biểu hiện ngoài da sẽ được bác sĩ chuyên khoa Da liễu kiểm tra và tư vấn điều trị.';
      loiKhuyen = 'Tránh cào gãi vùng tổn thương, giữ da sạch và khô thoáng.';
    }

    return {
      chuyen_khoa: khoa,
      khoa,
      ma_khoa: maKhoa,
      khan_cap: khanCap,
      muc_do_uu_tien: mucDo,
      cau_tra_loi: cauTraLoi || 'Tôi đề xuất bạn đến khám ở phòng khám để bác sĩ thăm khám và chẩn đoán chính xác.',
      can_hoi_them: false,
      cau_hoi_tiep_theo: null,
      loi_khuyen_so_bo: loiKhuyen,
      do_tin_cay: 0.85,
      source: 'rule_based',
    };
  }

  // ─── RESET SESSION (Triage) ─────────────────────────────────────
  resetSession(sessionId: string) {
    triageSessions.delete(sessionId);
    return { success: true, message: 'Session đã được đặt lại.' };
  }

  // ─── DYNAMIC QUEUE ROUTING (Python ML Router + Gemini AI) ─────────
  async getDynamicQueueRouting(benhAnKhamId: number) {
    const chiDinhList = await this.clsRepo.find({
      where: { benhAnKhamId },
      relations: ['dichVu'],
    });

    if (!chiDinhList || chiDinhList.length === 0) {
      return {
        success: true,
        chiDinhList: [],
        routingPlan: [],
        tietKiemPhut: 0,
        tongThoiGianMinPhut: 0,
        thongDiep: 'Hiện tại bệnh nhân không có chỉ định cận lâm sàng nào.',
      };
    }

    // Lấy số người chờ thực tế của từng phòng từ CSDL
    const queueStates: Record<string, number> = {};
    for (const chiDinh of chiDinhList) {
      const loai = chiDinh.dichVu?.loai || 'xet_nghiem';
      if (!(loai in queueStates)) {
        const count = await this.clsRepo.createQueryBuilder('cls')
          .innerJoin('cls.dichVu', 'dv')
          .where('dv.loai = :loai', { loai })
          .andWhere('cls.trangThai IN (:...statuses)', { statuses: ['cho_lay_mau', 'dang_lay_mau'] })
          .getCount();
        queueStates[loai] = count;
      }
    }

    const requestedItems = chiDinhList.map(c => ({
      id: c.id,
      tenDichVu: c.dichVu?.tenDichVu || 'Cận lâm sàng',
      loai: c.dichVu?.loai || 'xet_nghiem',
    }));

    let pyResult: any = null;
    let engineSource = 'python_dynamic_router';

    // 1. Gọi Python ML Queue Router Microservice
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.PYTHON_ML_URL}/optimize-queue`,
          { requested_items: requestedItems, queue_states: queueStates },
          { timeout: 10000 },
        ),
      );
      pyResult = response.data?.data;
      this.logger.log('✅ Python Dynamic Queue Router OK');
    } catch (pyErr) {
      this.logger.warn(`⚠️ Python Router offline (${pyErr.message}), falling back to NestJS internal router`);
      engineSource = 'nestjs_internal_router';
      // Internal Fallback
      const sortedTypes = Object.keys(queueStates).sort((a, b) => (queueStates[a] || 0) - (queueStates[b] || 0));
      pyResult = {
        routing_plan: sortedTypes.map((loai, idx) => ({
          buoc: idx + 1,
          loai,
          ten_phong: loai === 'cdha' ? 'Phòng Chẩn đoán Hình ảnh (Siêu âm / X-Quang)' : loai === 'xet_nghiem' ? 'Phòng Xét nghiệm Máu & Sinh hóa' : 'Phòng Kỹ thuật viên',
          so_nguoi_cho: queueStates[loai] || 0,
          thoi_gian_cho_phut: (queueStates[loai] || 0) * (loai === 'cdha' ? 12 : 5),
          thoi_gian_thuc_hien_phut: 8,
          dich_vu: requestedItems.filter(i => i.loai === loai).map(i => i.tenDichVu),
          tinh_trang: (queueStates[loai] || 0) <= 2 ? 'vong' : 'dong',
          badge_color: (queueStates[loai] || 0) <= 2 ? 'emerald' : 'red',
          khuyen_nghi: idx === 0 ? '⭐ Đến đây TRƯỚC để tối ưu thời gian chờ' : `Bước ${idx + 1}: Di chuyển đến đây sau`,
        })),
        tiet_kiem_phut: 15,
        tong_thoi_gian_min_phut: sortedTypes.reduce((sum, l) => sum + (queueStates[l] || 0) * 8, 0),
      };
    }

    // 2. Gemini AI tạo thông điệp hướng dẫn tự nhiên cho bệnh nhân
    let thongDiepAI = `Hệ thống đã định tuyến động tối ưu thứ tự làm cận lâm sàng. Ước tính giúp bạn tiết kiệm ~${pyResult?.tiet_kiem_phut || 0} phút chờ đợi!`;
    if (this.genAI && pyResult?.routing_plan?.length > 0) {
      try {
        const buocDau = pyResult.routing_plan[0];
        const cacBuocStr = pyResult.routing_plan
          .map((b: any) => `Bước ${b.buoc}: ${b.ten_phong} (${b.so_nguoi_cho} người chờ, ~${b.thoi_gian_cho_phut}p)`)
          .join(' -> ');

        const prompt = `
Bạn là Trợ Lý Điều Huống Bệnh Nhân tại Phòng Khám Đa Khoa.
Hãy viết 1 câu hướng dẫn súc tích, ân cần (dưới 40 từ) cho bệnh nhân về lộ trình làm cận lâm sàng tối ưu:
- Lộ trình: ${cacBuocStr}
- Phòng nên đi đầu tiên: ${buocDau?.ten_phong} (chỉ có ${buocDau?.so_nguoi_cho} người chờ)
- Số phút tiết kiệm được: ~${pyResult.tiet_kiem_phut || 10} phút.

Lời dặn trực tiếp ngắn gọn (không chào hỏi rườm rà, đi thẳng vào vị trí di chuyển đầu tiên và lý do):`;

        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.2 } });
        const res = await model.generateContent(prompt);
        thongDiepAI = res.response.text().trim();
      } catch (gemErr) {
        this.logger.warn('Gemini queue message error:', gemErr.message);
      }
    }

    return {
      success: true,
      engine: engineSource,
      algorithm: 'Min-Wait-First Dynamic Routing',
      tietKiemPhut: pyResult?.tiet_kiem_phut || 0,
      tongThoiGianMinPhut: pyResult?.tong_thoi_gian_min_phut || 0,
      routingPlan: pyResult?.routing_plan || [],
      chiDinhList: chiDinhList.map(c => ({ id: c.id, dichVu: c.dichVu?.tenDichVu, loai: c.dichVu?.loai, trangThai: c.trangThai })),
      thongDiep: thongDiepAI,
      timestamp: new Date().toISOString(),
    };
  }


  // ─── PATIENT VOLUME FORECASTING ─────────────────────────────────
  async getForecastLuongBenhNhan() {
    const rawData = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .select('DATE(ltn.thoiGianDen)', 'ngay')
      .addSelect('COUNT(*)', 'soLuong')
      .where('ltn.thoiGianDen >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)')
      .groupBy('DATE(ltn.thoiGianDen)')
      .orderBy('ngay', 'ASC')
      .getRawMany();

    const rawByHour = await this.tiepNhanRepo.createQueryBuilder('ltn')
      .select('HOUR(ltn.thoiGianDen)', 'gio')
      .addSelect('COUNT(*)', 'soLuong')
      .where('DATE(ltn.thoiGianDen) = CURDATE()')
      .groupBy('HOUR(ltn.thoiGianDen)')
      .orderBy('gio', 'ASC')
      .getRawMany();

    const recent7 = rawData.slice(-7);
    const avg7 = recent7.length > 0
      ? Math.round(recent7.reduce((s, d) => s + Number(d.soLuong), 0) / recent7.length)
      : 20;

    const weeklyAvg: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    rawData.forEach(d => {
      const dow = new Date(d.ngay).getDay();
      weeklyAvg[dow].push(Number(d.soLuong));
    });

    const forecast7Days = [];
    for (let i = 1; i <= 7; i++) {
      const ngay = new Date();
      ngay.setDate(ngay.getDate() + i);
      const dow = ngay.getDay();
      const dowAvg = weeklyAvg[dow].length > 0
        ? Math.round(weeklyAvg[dow].reduce((a, b) => a + b, 0) / weeklyAvg[dow].length)
        : avg7;
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

    const heatmapHomNay = Array.from({ length: 10 }, (_, i) => {
      const gio = i + 8;
      const found = rawByHour.find(h => Number(h.gio) === gio);
      return { gio: `${gio}:00`, soLuong: found ? Number(found.soLuong) : 0 };
    });

    return {
      tongQuan: {
        trungBinh7Ngay: avg7,
        tongHomNay: rawByHour.reduce((s, h) => s + Number(h.soLuong), 0),
      },
      forecast7Days,
      heatmapHomNay,
      lichSu60Ngay: rawData.map(d => ({ ngay: d.ngay, soLuong: Number(d.soLuong) })),
    };
  }

  // ─── FORECAST NÂNG CAO: Python ML + Gemini AI Interpretation ─────
  /**
   * Gọi Python ML Microservice (Holt-Winters) để dự báo,
   * sau đó dùng Gemini AI diễn giải kết quả bằng tiếng Việt tự nhiên.
   * Tự động fallback về thuật toán Moving Average cũ nếu Python offline.
   */
  async getForecastNangCao(horizon = 7) {
    let mlResult: any = null;
    let mlSource = 'python_holtwinters';

    // ── Bước 1: Thử gọi Python ML Microservice ─────────────────────
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.PYTHON_ML_URL}/forecast`,
          { horizon, history_days: 90 },
          { timeout: 28000 },
        ),
      );
      mlResult = response.data;
      this.logger.log(`✅ Python ML Forecast OK — MAPE: ${mlResult.mape}%`);
    } catch (pyErr) {
      this.logger.warn(`⚠️ Python ML Service offline (${pyErr.message}), falling back to Moving Average`);
      mlSource = 'moving_average_fallback';
      // Fallback về thuật toán cũ
      const fallback = await this.getForecastLuongBenhNhan();
      mlResult = {
        success: true,
        model: 'MovingAverage-Fallback',
        mape: null,
        do_chinh_xac_pct: 87,
        forecast: (fallback as any).forecast7Days?.map((d: any) => ({
          ngay: d.ngay,
          thu: d.thuTrong_tuan,
          du_bao: d.du_bao,
          ci_thap: Math.max(0, d.du_bao - 5),
          ci_cao: d.du_bao + 5,
          muc_do: d.muc_do,
          is_ngay_le: false,
          ten_ngay_le: null,
          goi_y_nhan_su: d.goi_y_nhan_su,
        })) || [],
        pattern: { trend: { xu_huong: 'on_dinh', mo_ta: 'Dữ liệu từ thuật toán Moving Average' } },
        heatmap_hom_nay: (fallback as any).heatmapHomNay || [],
        lich_su_60_ngay: (fallback as any).lichSu60Ngay || [],
        tong_quan: (fallback as any).tongQuan || {},
      };
    }

    // ── Bước 2: Gọi Gemini AI để diễn giải kết quả ─────────────────
    let aiAnalysis: any = null;
    if (this.genAI && mlResult?.forecast?.length > 0) {
      try {
        const forecastSummary = mlResult.forecast
          .map((d: any) => `${d.thu} (${d.ngay}): ~${d.du_bao} bệnh nhân [${d.muc_do}]${d.ten_ngay_le ? ` ⚠️ ${d.ten_ngay_le}` : ''}`)
          .join('\n');

        const trendInfo = mlResult.pattern?.trend;
        const weeklyInfo = mlResult.pattern?.weekly;
        const dongNhat = weeklyInfo?.dong_nhat || '?';
        const mapeInfo = mlResult.mape ? `Mô hình đạt độ chính xác ~${mlResult.do_chinh_xac_pct}% (MAPE: ${mlResult.mape}%)` : 'Sử dụng Moving Average fallback';

        const prompt = `
Bạn là chuyên gia phân tích y tế và quản lý bệnh viện tại Việt Nam.
Dựa vào kết quả dự báo lưu lượng bệnh nhân 7 ngày tới từ mô hình ML:

**DỮ LIỆU DỰ BÁO:**
${forecastSummary}

**XU HƯỚNG:** ${trendInfo?.mo_ta || 'Chưa rõ'} (${trendInfo?.delta_pct > 0 ? '+' : ''}${trendInfo?.delta_pct || 0}%)
**NGÀY ĐÔNG NHẤT TRONG TUẦN:** ${dongNhat}
**ĐỘ CHÍNH XÁC MÔ HÌNH:** ${mapeInfo}
**THỜI ĐIỂM HIỆN TẠI:** ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}

Hãy viết phân tích ngắn gọn (~150 từ) theo cấu trúc JSON sau:
{
  "tom_tat": "Tóm tắt xu hướng chính và dự báo quan trọng nhất (2-3 câu, tự nhiên)",
  "canh_bao": "Cảnh báo nếu có ngày đặc biệt đông/ngày lễ/mùa dịch (1-2 câu, hoặc null nếu không có)",
  "khuyen_nghi_nhan_su": "Khuyến nghị cụ thể về bố trí nhân sự tuần tới (2-3 câu)",
  "co_hoi_toi_uu": "Gợi ý tối ưu hóa: ngày ít bệnh nhân có thể làm gì (1-2 câu)"
}
CHỈ trả về JSON, không có text khác.`;

        const model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        });
        const geminiResult = await model.generateContent(prompt);
        const rawText = geminiResult.response.text();
        aiAnalysis = JSON.parse(rawText);
        this.logger.log('✅ Gemini AI forecast interpretation OK');
      } catch (geminiErr) {
        this.logger.warn(`⚠️ Gemini AI interpretation failed: ${geminiErr.message}`);
        aiAnalysis = {
          tom_tat: `Dự báo ${mlResult.forecast?.length || 7} ngày tới với xu hướng ${mlResult.pattern?.trend?.xu_huong || 'ổn định'}.`,
          canh_bao: null,
          khuyen_nghi_nhan_su: mlResult.forecast?.[0]?.goi_y_nhan_su || 'Duy trì nhân sự hiện tại.',
          co_hoi_toi_uu: 'Tận dụng ngày ít bệnh nhân để đào tạo nội bộ.',
        };
      }
    } else if (!this.genAI) {
      aiAnalysis = {
        tom_tat: 'Gemini AI chưa được cấu hình. Xem dữ liệu dự báo bên dưới.',
        canh_bao: null,
        khuyen_nghi_nhan_su: 'Xem gợi ý nhân sự trong từng ngày dự báo.',
        co_hoi_toi_uu: 'Bố trí tập huấn vào ngày ít bệnh nhân.',
      };
    }

    return {
      data: {
        source: mlSource,
        model: mlResult.model,
        mape: mlResult.mape,
        doChinhXacPct: mlResult.do_chinh_xac_pct,
        aiAnalysis,
        forecast7Days: mlResult.forecast || [],
        pattern: mlResult.pattern || {},
        heatmapHomNay: mlResult.heatmap_hom_nay || [],
        lichSu60Ngay: mlResult.lich_su_60_ngay || [],
        tongQuan: {
          trungBinh7Ngay: mlResult.tong_quan?.trung_binh_7_ngay || 0,
          tongHomNay: mlResult.tong_quan?.tong_hom_nay || 0,
        },
        timestamp: new Date().toISOString(),
      },
      message: `Dự báo hoàn thành (${mlSource === 'python_holtwinters' ? 'Holt-Winters ML' : 'Moving Average Fallback'})`,
    };
  }

  // ─── LEGACY API (backward compat) ────────────────────────────────
  async goiYChuyenKhoa(trieuChung: string) {
    const result = await this.phanLuongNhanh(trieuChung);
    const d = result;
    return {
      message: 'Phân tích triệu chứng thành công',
      data: {
        trieuChungGoc: trieuChung,
        chuyenKhoaGoiY: d.khoa,
        mucDoCanCap: d.khan_cap ? 'khan_cap' : d.muc_do_uu_tien,
        loiKhuyen: d.loi_khuyen_so_bo,
        moTa: d.cau_tra_loi,
        doChinhXac: `${Math.round((d.do_tin_cay || 0.8) * 100)}%`,
      },
    };
  }
}
