import React, { useEffect, useRef, useState } from "react";
import { Sheet, Box, Text, Button, Spinner, useSnackbar } from "zmp-ui";
import { QRCodeCanvas } from "qrcode.react";
import { saveImageToGallery } from "zmp-sdk/apis";
import { api } from "../lib/api";
import { tien } from "../lib/format";
import { moTrangWeb } from "../lib/zalo";

async function saoChep(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

function DongSaoChep({ nhan, giaTri, hienThi }) {
  const { openSnackbar } = useSnackbar();
  return (
    <div className="pay-row">
      <div>
        <div className="info-label">{nhan}</div>
        <div className="pay-value">{hienThi || giaTri}</div>
      </div>
      <button
        type="button"
        className="copy-btn"
        onClick={async () => openSnackbar({ text: (await saoChep(String(giaTri))) ? `Đã sao chép ${nhan.toLowerCase()}` : "Không sao chép được", type: "success", duration: 1500 })}
      >
        Sao chép
      </button>
    </div>
  );
}

/**
 * Thanh toán tiền cọc ngay trong Mini App: QR VietQR, nút mở app ngân hàng (điền sẵn STK, số tiền, nội dung),
 * thông tin chuyển khoản; tự kiểm tra trạng thái mỗi 3 giây, tiền vào là tự đóng và báo thành công.
 */
export default function PaymentSheet({ lichHen, onClose, onPaid }) {
  const { openSnackbar } = useSnackbar();
  const [pay, setPay] = useState(null);
  const [loi, setLoi] = useState(null);
  const qrRef = useRef(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [daThanhToan, setDaThanhToan] = useState(false);
  const daBao = useRef(false);
  // Hạn thanh toán (backend đặt 15 phút sau khi đặt lịch); hết hạn backend tự hủy lịch
  const han = lichHen?.hanThanhToan ? new Date(lichHen.hanThanhToan).getTime() : null;
  const [conLai, setConLai] = useState(() => (han ? Math.max(0, Math.floor((han - Date.now()) / 1000)) : null));
  useEffect(() => {
    if (!han || daThanhToan) return;
    const t = setInterval(() => setConLai(Math.max(0, Math.floor((han - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [han, daThanhToan]);
  const hetHan = conLai === 0;

  // Tạo link PayOS khi mở
  useEffect(() => {
    if (!lichHen) return;
    let conMo = true;
    setPay(null);
    setLoi(null);
    api
      .post(`/payos/tao-link/${lichHen.id}`)
      .then((res) => conMo && setPay(res.data))
      .catch((e) => conMo && setLoi(e));
    return () => {
      conMo = false;
    };
  }, [lichHen?.id]);

  // Tự kiểm tra trạng thái thanh toán (webhook PayOS cũng tự xác nhận phía backend)
  useEffect(() => {
    if (!lichHen || !pay || daThanhToan || hetHan) return;
    const t = setInterval(async () => {
      try {
        const res = await api.get(`/payos/kiem-tra-lich-hen/${lichHen.id}`);
        if (res.data?.isPaid && !daBao.current) {
          daBao.current = true;
          setDaThanhToan(true);
          openSnackbar({ text: "Thanh toán thành công! Lịch khám đã được xác nhận.", type: "success", duration: 4000 });
          setTimeout(() => onPaid?.(), 1500);
        }
      } catch {
        // lỗi mạng tạm thời: lần sau kiểm tra lại
      }
    }, 3000);
    return () => clearInterval(t);
  }, [lichHen?.id, pay, daThanhToan, hetHan]);

  // Zalo chặn Mini App mở app ngân hàng (deeplink), nên lưu ảnh QR để bệnh nhân quét từ thư viện ảnh trong app ngân hàng
  const luuAnhQr = async () => {
    const qr = qrRef.current;
    if (!qr) return;
    setDangLuu(true);
    try {
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 820;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(qr, 60, 40, 520, 520);
      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(tien(pay.amount), 320, 630);
      ctx.font = "28px sans-serif";
      ctx.fillText(`Nội dung: ${pay.description}`, 320, 682);
      ctx.fillStyle = "#6b7280";
      ctx.font = "24px sans-serif";
      ctx.fillText(`${pay.accountName || ""} · ${pay.accountNumber}`, 320, 728);
      ctx.fillText("Phòng Khám Đa Khoa · Tiền cọc lịch khám", 320, 770);
      const dataUrl = c.toDataURL("image/png");
      try {
        await saveImageToGallery({ imageBase64Data: dataUrl });
        openSnackbar({ text: "Đã lưu mã QR vào thư viện ảnh. Mở app ngân hàng → Quét QR → chọn ảnh vừa lưu.", type: "success", duration: 6000 });
      } catch {
        // Chạy thử trên trình duyệt (ngoài Zalo): tải ảnh xuống
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `QR-${pay.description}.png`;
        a.click();
      }
    } catch (e) {
      openSnackbar({ text: `Không lưu được ảnh QR (${e?.message || "lỗi"}). Bạn có thể chụp màn hình mã QR.`, type: "error", duration: 6000 });
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Sheet visible={!!lichHen} onClose={onClose} mask handler swipeToClose title="Thanh toán tiền cọc" height="88vh">
      <Box className="sheet-body pay-sheet">
        {!pay && !loi && (
          <div className="center-box">
            <Spinner />
          </div>
        )}
        {loi && (
          <div className="center-box">
            <Text className="muted">{loi.message}</Text>
          </div>
        )}

        {pay && daThanhToan && (
          <div className="center-box">
            <div className="pay-success">✓</div>
            <Text bold>Đã nhận tiền cọc</Text>
            <Text size="small" className="muted">
              Lịch {lichHen.maLichHen} đã được xác nhận.
            </Text>
          </div>
        )}

        {pay && !daThanhToan && hetHan && (
          <div className="center-box">
            <Text bold>Đã hết hạn thanh toán</Text>
            <Text size="small" className="muted">
              Lịch {lichHen.maLichHen} được giữ chỗ 15 phút và sẽ tự hủy. Nếu bạn đã chuyển khoản, hệ thống vẫn tự xác nhận khi tiền vào.
            </Text>
          </div>
        )}

        {pay && !daThanhToan && !hetHan && (
          <>
            {conLai !== null && (
              <div className={`pay-countdown ${conLai <= 120 ? "pay-countdown-gap" : ""}`}>
                Giữ chỗ còn <b>{String(Math.floor(conLai / 60)).padStart(2, "0")}:{String(conLai % 60).padStart(2, "0")}</b>
              </div>
            )}
            <div className="pay-qr">
              <QRCodeCanvas ref={qrRef} value={pay.qrCode} size={220} level="M" marginSize={2} />
              <Text size="xSmall" className="muted">
                Quét bằng app ngân hàng bất kỳ
              </Text>
            </div>

            <Button fullWidth loading={dangLuu} onClick={luuAnhQr} style={{ marginTop: 12 }}>
              Lưu mã QR vào máy
            </Button>
            <div className="pay-steps">
              <div><b>1.</b> Bấm "Lưu mã QR vào máy"</div>
              <div><b>2.</b> Mở app ngân hàng → <b>Quét QR</b> → chọn <b>ảnh vừa lưu</b> trong thư viện</div>
              <div><b>3.</b> Quay lại đây, hệ thống tự xác nhận khi tiền vào</div>
            </div>

            <div className="pay-info">
              <div className="pay-row">
                <div>
                  <div className="info-label">Chủ tài khoản</div>
                  <div className="pay-value">{pay.accountName}</div>
                </div>
              </div>
              <DongSaoChep nhan="Số tài khoản" giaTri={pay.accountNumber} />
              <DongSaoChep nhan="Số tiền" giaTri={pay.amount} hienThi={tien(pay.amount)} />
              <DongSaoChep nhan="Nội dung" giaTri={pay.description} />
            </div>
            <Text size="xxSmall" className="muted center-text" style={{ marginTop: 8 }}>
              Nhập đúng số tiền và nội dung. Hệ thống tự xác nhận sau khi tiền vào, bạn không cần làm gì thêm.
            </Text>

            <div className="pay-waiting">
              <Spinner />
              <Text size="small">Đang chờ thanh toán...</Text>
            </div>

            {pay.checkoutUrl && (
              <Button fullWidth variant="tertiary" size="small" onClick={() => moTrangWeb(pay.checkoutUrl).catch(() => {})}>
                Mở trang thanh toán PayOS
              </Button>
            )}
          </>
        )}
      </Box>
    </Sheet>
  );
}
