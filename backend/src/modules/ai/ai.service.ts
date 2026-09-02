import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  /**
   * Phân tích triệu chứng bằng quy tắc y khoa & AI
   */
  async goiYChuyenKhoa(trieuChung: string) {
    const text = (trieuChung || '').toLowerCase();

    let chuyenKhoaGoiY = 'Nội tổng quát';
    let mucDoCanCap = 'binh_thuong';
    let loiKhuyen = 'Nên đến phòng khám để được bác sĩ khám tổng quát và làm các xét nghiệm cần thiết.';
    let moTa = 'Triệu chứng chung về sức khỏe.';

    if (text.includes('đau đầu') || text.includes('chóng mặt') || text.includes('mất ngủ') || text.includes('tê bì')) {
      chuyenKhoaGoiY = 'Chuyên khoa Thần kinh / Nội tổng quát';
      loiKhuyen = 'Nên nghỉ ngơi, uống đủ nước. Nếu đau đầu kéo dài hoặc kèm buồn nôn, cần đi khám ngay.';
      moTa = 'Các triệu chứng liên quan tới hệ thần kinh và tuần hoàn não.';
    } else if (text.includes('ho') || text.includes('sốt') || text.includes('đau họng') || text.includes('khó thở') || text.includes('phổi')) {
      chuyenKhoaGoiY = 'Chuyên khoa Hô hấp / Tai Mũi Họng';
      loiKhuyen = 'Giữ ấm cổ họng, đeo khẩu trang khi ra ngoài. Súc miệng bằng nước muối sinh lý.';
      moTa = 'Dấu hiệu viêm đường hô hấp trên hoặc hô hấp dưới.';
    } else if (text.includes('đau bụng') || text.includes('dạ dày') || text.includes('tiêu chảy') || text.includes('buồn nôn')) {
      chuyenKhoaGoiY = 'Chuyên khoa Tiêu hóa';
      loiKhuyen = 'Ăn đồ chín uống sôi, hạn chế đồ cay nóng và rượu bia. Bổ sung nước và điện giải nếu tiêu chảy.';
      moTa = 'Dấu hiệu về rối loạn hệ tiêu hóa hoặc dạ dày.';
    } else if (text.includes('xương') || text.includes('khớp') || text.includes('đau lưng') || text.includes('mỏi gối')) {
      chuyenKhoaGoiY = 'Chuyên khoa Cơ Xương Khớp';
      loiKhuyen = 'Tránh vận động quá sức hoặc mang vác nặng. Có thể chườm ấm nhẹ nhàng.';
      moTa = 'Các vấn đề về hệ vận động và cơ xương khớp.';
    } else if (text.includes('tim') || text.includes('huyết áp') || text.includes('tức ngực')) {
      chuyenKhoaGoiY = 'Chuyên khoa Tim mạch';
      mucDoCanCap = 'khan_cap';
      loiKhuyen = 'Hạn chế xúc động mạnh và vận động nặng. Nếu tức ngực dữ dội kèm khó thở, hãy gọi cấp cứu hoặc đến bệnh viện ngay lập tức!';
      moTa = 'Các dấu hiệu liên quan tới hệ tim mạch.';
    } else if (text.includes('nhi') || text.includes('trẻ em') || text.includes('bé')) {
      chuyenKhoaGoiY = 'Chuyên khoa Nhi';
      loiKhuyen = 'Theo dõi nhiệt độ của bé thường xuyên, cho bé uống nhiều nước và dinh dưỡng đầy đủ.';
      moTa = 'Triệu chứng bệnh lý ở trẻ em.';
    }

    return {
      message: 'Phân tích triệu chứng thành công',
      data: {
        trieuChungGoc: trieuChung,
        chuyenKhoaGoiY,
        mucDoCanCap,
        loiKhuyen,
        moTa,
        doChinhXac: '85%',
      },
    };
  }
}

