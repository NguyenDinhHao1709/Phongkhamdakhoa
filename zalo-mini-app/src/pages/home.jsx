import React, { useEffect } from "react";
import { Page, Box, Text, Button, Icon, useNavigate, useSnackbar } from "zmp-ui";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { batThongBaoZalo, goiHotline, nhanTinPhongKham } from "../lib/zalo";
import { LICH_CON_HIEU_LUC, gio, ngayISO, ngayVN, thuTrongTuan } from "../lib/format";
import { BadgeTrangThai, Card, DongThongTin, TieuDeMuc } from "../components/ui";

const LOI_TAT = [
  { path: "/dat-lich", icon: "zi-plus-circle", nhan: "Đặt lịch khám" },
  { path: "/lich-hen", icon: "zi-calendar", nhan: "Lịch hẹn của tôi" },
  { path: "/ho-so", icon: "zi-note", nhan: "Kết quả & đơn thuốc" },
];

export default function HomePage() {
  useTieuDe("Phòng Khám Đa Khoa");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  const { data: lichSapToi } = useTaiDuLieu(async () => {
    const res = await api.get("/lich-hen/cua-toi");
    const homNay = ngayISO();
    return (res.data || [])
      .filter((lh) => LICH_CON_HIEU_LUC.includes(lh.trangThai) && String(lh.ngayHen).slice(0, 10) >= homNay)
      .sort((a, b) => `${a.ngayHen} ${a.gioHen}`.localeCompare(`${b.ngayHen} ${b.gioHen}`))[0] || null;
  }, []);

  // Số thông báo chưa đọc; tự làm mới mỗi 60 giây khi đang ở trang chủ
  const { data: thongBao, reload: taiLaiThongBao } = useTaiDuLieu(async () => (await api.get("/thong-bao", { limit: 1 })).data, []);
  useEffect(() => {
    const t = setInterval(taiLaiThongBao, 60000);
    return () => clearInterval(t);
  }, [taiLaiThongBao]);

  const bat = async () => {
    try {
      await batThongBaoZalo();
      openSnackbar({ text: "Đã bật nhận thông báo lịch khám qua Zalo", type: "success" });
    } catch {
      openSnackbar({ text: "Bạn chưa cho phép nhận thông báo", type: "warning" });
    }
  };

  return (
    <Page className="page page-with-nav">
      <Box className="home-header">
        <div className="row-between">
          <div>
            <Text size="small" className="home-hello">Xin chào,</Text>
            <Text.Title size="large" className="home-name">
              {user?.hoTen || "Quý khách"}
            </Text.Title>
          </div>
          <button type="button" className="bell-btn" aria-label="Thông báo" onClick={() => navigate("/thong-bao", { animate: false })}>
            <Icon icon="zi-notif" />
            {thongBao?.unreadCount > 0 && <span className="bell-badge">{thongBao.unreadCount > 9 ? "9+" : thongBao.unreadCount}</span>}
          </button>
        </div>
      </Box>

      <Box className="content">
        <div className="quick-grid">
          {LOI_TAT.map((l) => (
            <button key={l.path} type="button" className="quick-item" onClick={() => navigate(l.path, { animate: false })}>
              <span className="quick-icon">
                <Icon icon={l.icon} />
              </span>
              <span>{l.nhan}</span>
            </button>
          ))}
        </div>

        <TieuDeMuc>Lịch hẹn sắp tới</TieuDeMuc>
        {lichSapToi ? (
          <Card onClick={() => navigate("/lich-hen", { animate: false })}>
            <div className="row-between">
              <Text bold>
                {thuTrongTuan(lichSapToi.ngayHen)}, {ngayVN(lichSapToi.ngayHen)} · {gio(lichSapToi.gioHen)}
              </Text>
              <BadgeTrangThai trangThai={lichSapToi.trangThai} />
            </div>
            <DongThongTin nhan="Bác sĩ" giaTri={lichSapToi.bacSi?.nhanVien?.hoTen} />
            <DongThongTin nhan="Chuyên khoa" giaTri={lichSapToi.chuyenKhoa || lichSapToi.bacSi?.chuyenKhoa} />
            <DongThongTin
              nhan="Nơi khám"
              giaTri={lichSapToi.hinhThuc === "truc_tuyen" ? "Tư vấn trực tuyến" : lichSapToi.phongKham?.ten_phong}
            />
            <DongThongTin nhan="Mã lịch hẹn" giaTri={lichSapToi.maLichHen} />
          </Card>
        ) : (
          <Card>
            <Text className="muted">Bạn chưa có lịch hẹn nào sắp tới.</Text>
            <Button size="small" style={{ marginTop: 12 }} onClick={() => navigate("/dat-lich", { animate: false })}>
              Đặt lịch ngay
            </Button>
          </Card>
        )}

        <TieuDeMuc>Nhận thông báo qua Zalo</TieuDeMuc>
        <Card>
          <Text size="small">
            Nhận nhắc lịch trước giờ khám, thông báo có kết quả xét nghiệm và xác nhận thanh toán ngay trong Zalo.
          </Text>
          <Button size="small" variant="secondary" style={{ marginTop: 12 }} prefixIcon={<Icon icon="zi-notif" />} onClick={bat}>
            Bật thông báo
          </Button>
        </Card>

        <TieuDeMuc>Hỗ trợ</TieuDeMuc>
        <div className="row-gap">
          <Button fullWidth variant="tertiary" prefixIcon={<Icon icon="zi-call" />} onClick={() => goiHotline().catch(() => {})}>
            Gọi hotline
          </Button>
          <Button
            fullWidth
            variant="tertiary"
            prefixIcon={<Icon icon="zi-chat" />}
            onClick={() => nhanTinPhongKham().catch((e) => openSnackbar({ text: e.message, type: "warning" }))}
          >
            Nhắn tin
          </Button>
        </div>
      </Box>
    </Page>
  );
}
