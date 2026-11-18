import React, { useEffect, useRef, useState } from "react";
import { Sheet, Box, Text, Button, Spinner, useSnackbar } from "zmp-ui";
import { QRCodeSVG } from "qrcode.react";
import { openOutApp } from "zmp-sdk/apis";
import { api } from "../lib/api";
import { tien } from "../lib/format";
import { moTrangWeb } from "../lib/zalo";

// Danh sách app ngân hàng hỗ trợ deeplink VietQR (giống bản web); tải 1 lần rồi dùng lại
const laNenIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
let huaApps = null;
let huaBanks = null;
function taiApps() {
  huaApps ||= fetch(`https://api.vietqr.io/v2/${laNenIOS ? "ios" : "android"}-app-deeplinks`)
    .then((r) => r.json())
    .then((j) => [...(j.apps || [])].sort((a, b) => b.autofill - a.autofill))
    .catch(() => {
      huaApps = null;
      return [];
    });
  return huaApps;
}
// BIN 6 số (vd 970422) → mã ngân hàng VietQR (vd "mb")
function taiBanks() {
  huaBanks ||= fetch("https://api.vietqr.io/v2/banks")
    .then((r) => r.json())
    .then((j) => new Map((j.data || []).map((b) => [b.bin, b.code.toLowerCase()])))
    .catch(() => {
      huaBanks = null;
      return new Map();
    });
  return huaBanks;
}

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
  const [apps, setApps] = useState([]);
  const [maNganHang, setMaNganHang] = useState(null);
  const [daThanhToan, setDaThanhToan] = useState(false);
  const daBao = useRef(false);

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
    taiApps().then((ds) => conMo && setApps(ds));
    return () => {
      conMo = false;
    };
  }, [lichHen?.id]);

  useEffect(() => {
    if (!pay?.bin) return;
    let conMo = true;
    taiBanks().then((m) => conMo && setMaNganHang(m.get(String(pay.bin)) || null));
    return () => {
      conMo = false;
    };
  }, [pay?.bin]);

  // Tự kiểm tra trạng thái thanh toán (webhook PayOS cũng tự xác nhận phía backend)
  useEffect(() => {
    if (!lichHen || !pay || daThanhToan) return;
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
  }, [lichHen?.id, pay, daThanhToan]);

  const moAppNganHang = (app) => {
    const params = new URLSearchParams({
      ba: `${pay.accountNumber}@${maNganHang}`,
      am: String(pay.amount),
      tn: pay.description,
      ...(pay.accountName ? { bn: pay.accountName } : {}),
    });
    const url = `${app.deeplink}&${params}`;
    openOutApp({ url }).catch(() => {
      window.location.href = url;
    });
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

        {pay && !daThanhToan && (
          <>
            <div className="pay-qr">
              <QRCodeSVG value={pay.qrCode} size={200} level="M" includeMargin />
              <Text size="xSmall" className="muted">
                Quét bằng app ngân hàng bất kỳ
              </Text>
            </div>

            {maNganHang && apps.length > 0 && (
              <>
                <Text size="small" bold style={{ margin: "14px 0 8px" }}>
                  Hoặc chuyển khoản ngay bằng app ngân hàng
                </Text>
                <div className="bank-grid">
                  {apps.map((a) => (
                    <button key={a.appId} type="button" className="bank-item" onClick={() => moAppNganHang(a)}>
                      {a.autofill === 1 && <span className="bank-auto">⚡</span>}
                      <img src={a.appLogo} alt={a.appName} loading="lazy" />
                      <span>{a.appName.replace(/ (SmartBanking|Mobile Banking|Digital|iPay).*$/i, "")}</span>
                    </button>
                  ))}
                </div>
                <Text size="xxSmall" className="muted" style={{ marginTop: 4 }}>
                  ⚡ app tự điền sẵn số tài khoản, số tiền và nội dung.
                </Text>
              </>
            )}

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
