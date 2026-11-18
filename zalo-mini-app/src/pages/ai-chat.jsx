import React, { useEffect, useRef, useState } from "react";
import { Page, Text, Icon, useLocation, useNavigate } from "zmp-ui";
import { api, postChoThucDay } from "../lib/api";
import { useTieuDe } from "../lib/hooks";

const LOI_CHAO = {
  sender: "ai",
  text:
    "Xin chào! Tôi là **Trợ lý sức khỏe AI 24/7** của Phòng Khám Đa Khoa.\n\n" +
    "Tôi có thể giải thích bệnh án, kết quả xét nghiệm, hướng dẫn dùng thuốc và tư vấn ăn uống, sinh hoạt dựa trên hồ sơ của bạn. Bạn cần hỗ trợ gì hôm nay?",
};

const CAU_HOI_NHANH = [
  { nhan: "Giải thích bệnh án gần nhất", text: "Hãy đọc và giải thích chi tiết bệnh án khám và kết quả xét nghiệm gần nhất của tôi" },
  { nhan: "Cách uống thuốc hiện tại", text: "Hướng dẫn tôi cách uống các thuốc trong đơn hiện tại, uống trước hay sau ăn và có tác dụng phụ gì không?" },
  { nhan: "Ăn uống & kiêng khem", text: "Với tình trạng bệnh án của tôi, tôi nên ăn uống và kiêng khem những món gì?" },
  { nhan: "Dấu hiệu cần tái khám ngay", text: "Tôi uống thuốc xong nếu gặp những dấu hiệu nào thì phải đến phòng khám kiểm tra lại ngay?" },
];

// Markdown đơn giản: **in đậm**, gạch đầu dòng, xuống dòng (React tự escape nội dung)
function NoiDungTin({ text }) {
  return (
    <div className="chat-text">
      {String(text || "")
        .split("\n")
        .map((dong, i) => {
          const t = dong.trim();
          if (!t) return <div key={i} style={{ height: 6 }} />;
          const gach = /^[-*]\s+/.test(t);
          const noiDung = gach ? t.replace(/^[-*]\s+/, "") : t;
          const phan = noiDung.split(/(\*\*.*?\*\*)/g).map((p, j) =>
            p.startsWith("**") && p.endsWith("**") ? <b key={j}>{p.slice(2, -2)}</b> : <React.Fragment key={j}>{p}</React.Fragment>,
          );
          return gach ? (
            <div key={i} className="chat-bullet">
              <span>•</span>
              <span>{phan}</span>
            </div>
          ) : (
            <div key={i}>{phan}</div>
          );
        })}
    </div>
  );
}

export default function AiChatPage() {
  useTieuDe("Bác sĩ AI 24/7");
  const navigate = useNavigate();
  const location = useLocation();
  const [tinNhan, setTinNhan] = useState([LOI_CHAO]);
  const [noiDung, setNoiDung] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const khungRef = useRef(null);
  const daGuiCauHoiTruyenVao = useRef(false);

  // Hiển thị lại cuộc trò chuyện đang dở (lưu ở server, dùng chung với bản web)
  useEffect(() => {
    api
      .get("/ai/patient-history")
      .then((res) => {
        const cu = (Array.isArray(res.data) ? res.data : []).map((m) => ({
          sender: m.sender,
          text: m.text,
          messageId: m.sender === "ai" ? m.id : undefined,
          danhGia: m.danhGia,
        }));
        if (cu.length) setTinNhan([LOI_CHAO, ...cu]);
      })
      .catch(() => {});
    // Đánh thức AI service sớm (Render free ngủ sau 15 phút)
    api.get("/ai/health").catch(() => {});
  }, []);

  useEffect(() => {
    khungRef.current?.scrollTo({ top: khungRef.current.scrollHeight, behavior: "smooth" });
  }, [tinNhan, dangGui]);

  const gui = async (cauHoi) => {
    const text = String(cauHoi || "").trim();
    if (!text || dangGui) return;
    setTinNhan((ds) => [...ds, { sender: "user", text }]);
    setNoiDung("");
    setDangGui(true);
    const hienCho = () =>
      setTinNhan((ds) =>
        ds.some((m) => m.cho)
          ? ds
          : [...ds, { sender: "ai", cho: true, text: "⏳ Trợ lý AI đang khởi động, vui lòng chờ trong giây lát — tôi sẽ tự gửi lại câu hỏi của bạn..." }],
      );
    const thayTinCho = (m) => setTinNhan((ds) => [...ds.filter((x) => !x.cho), m]);
    try {
      const res = await postChoThucDay("/ai/patient-chat", { message: text }, hienCho);
      thayTinCho({
        sender: "ai",
        text: res.data?.reply || "Tôi đã nhận câu hỏi của bạn. Bạn vui lòng hỏi lại cụ thể hơn nhé.",
        messageId: res.data?.messageId,
      });
    } catch (err) {
      thayTinCho({
        sender: "ai",
        text:
          err.code === "TOO_MANY_REQUESTS"
            ? err.message
            : "Xin lỗi, kết nối tới trợ lý AI đang gián đoạn. Bạn thử gửi lại sau ít phút nhé!",
      });
    } finally {
      setDangGui(false);
    }
  };

  // Mở từ trang Sức khỏe kèm câu hỏi (vd: hỏi về một loại thuốc) → gửi luôn
  useEffect(() => {
    const cauHoi = location.state?.cauHoi;
    if (cauHoi && !daGuiCauHoiTruyenVao.current) {
      daGuiCauHoiTruyenVao.current = true;
      gui(cauHoi);
    }
  }, [location.state?.cauHoi]);

  const danhGia = (idx, messageId, diem) => {
    setTinNhan((ds) => ds.map((m, i) => (i === idx ? { ...m, danhGia: diem } : m)));
    api.post("/ai/patient-feedback", { messageId, danhGia: diem }).catch(() => {});
  };

  const lamMoi = async () => {
    await api.post("/ai/patient-reset-session", {}).catch(() => {});
    setTinNhan([{ sender: "ai", text: "Cuộc trò chuyện đã được làm mới. Tôi sẵn sàng giải đáp thắc mắc về bệnh án, đơn thuốc hay chế độ chăm sóc sức khỏe của bạn!" }]);
  };

  return (
    <Page className="page chat-page">
      <div className="chat-head">
        <div>
          <Text bold>Trợ lý sức khỏe AI</Text>
          <Text size="xxSmall" className="muted">
            Tư vấn dựa trên bệnh án và đơn thuốc của bạn · không thay thế chẩn đoán của bác sĩ
          </Text>
        </div>
        <button type="button" className="chat-reset" onClick={lamMoi}>
          Làm mới
        </button>
      </div>

      <div className="chat-feed" ref={khungRef}>
        {tinNhan.map((m, i) => (
          <div key={i} className={`chat-row ${m.sender === "user" ? "chat-row-user" : ""}`}>
            <div className={`chat-bubble ${m.sender === "user" ? "chat-user" : "chat-ai"}`}>
              <NoiDungTin text={m.text} />
              {m.sender === "ai" && m.messageId && (
                <div className="chat-rate">
                  <button type="button" className={m.danhGia === 1 ? "on" : ""} onClick={() => danhGia(i, m.messageId, 1)}>
                    👍
                  </button>
                  <button type="button" className={m.danhGia === -1 ? "on" : ""} onClick={() => danhGia(i, m.messageId, -1)}>
                    👎
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {dangGui && !tinNhan.some((m) => m.cho) && (
          <div className="chat-row">
            <div className="chat-bubble chat-ai chat-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {tinNhan.length <= 1 && (
          <div className="chat-quick">
            {CAU_HOI_NHANH.map((q) => (
              <button key={q.nhan} type="button" className="chip" onClick={() => gui(q.text)}>
                {q.nhan}
              </button>
            ))}
            <button type="button" className="chip" onClick={() => navigate("/dat-lich", { animate: false })}>
              📅 Đặt lịch khám
            </button>
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          gui(noiDung);
        }}
      >
        <input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder="Nhập câu hỏi về sức khỏe..." maxLength={1000} />
        <button type="submit" disabled={!noiDung.trim() || dangGui} aria-label="Gửi">
          <Icon icon="zi-send-solid" />
        </button>
      </form>
    </Page>
  );
}
