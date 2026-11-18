import React, { useState } from "react";
import { Page, Box, Text, Button, useNavigate, useSnackbar } from "zmp-ui";
import { api } from "../lib/api";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { Card, DangTai, LoiTai, TrongRong } from "../components/ui";

function thoiGianTruoc(iso) {
  const d = new Date(iso);
  const phut = Math.floor((Date.now() - d.getTime()) / 60000);
  if (phut < 1) return "Vừa xong";
  if (phut < 60) return `${phut} phút trước`;
  if (phut < 1440) return `${Math.floor(phut / 60)} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

// Bấm vào thông báo: lịch hẹn → trang Lịch hẹn, kết quả xét nghiệm → trang Hồ sơ
function duongDan(tb) {
  if (tb.loai === "xet_nghiem") return "/ho-so";
  if (tb.loai === "lich_hen") return "/lich-hen";
  return null;
}

export default function NotificationsPage() {
  useTieuDe("Thông báo");
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [dangDoc, setDangDoc] = useState(false);

  const { data, loading, error, reload } = useTaiDuLieu(async () => (await api.get("/thong-bao", { limit: 50 })).data, []);
  const ds = data?.items || [];

  const moThongBao = async (tb) => {
    if (!tb.daDoc) await api.patch(`/thong-bao/${tb.id}/doc`).catch(() => {});
    const dich = duongDan(tb);
    if (dich) navigate(dich, { animate: false });
    else reload();
  };

  const docTatCa = async () => {
    setDangDoc(true);
    try {
      await api.patch("/thong-bao/doc-tat-ca");
      await reload();
    } catch (e) {
      openSnackbar({ text: e.message, type: "error" });
    } finally {
      setDangDoc(false);
    }
  };

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <Text size="small" className="muted">
            {data?.unreadCount ? `${data.unreadCount} thông báo chưa đọc` : "Không có thông báo chưa đọc"}
          </Text>
          <Button size="small" variant="tertiary" loading={dangDoc} disabled={!data?.unreadCount} onClick={docTatCa}>
            Đọc tất cả
          </Button>
        </div>

        {loading && <DangTai />}
        {error && <LoiTai error={error} onRetry={reload} />}
        {!loading && !error && ds.length === 0 && <TrongRong>Bạn chưa có thông báo nào.</TrongRong>}
        {!loading &&
          !error &&
          ds.map((tb) => (
            <Card key={tb.id} className={tb.daDoc ? "" : "noti-unread"} onClick={() => moThongBao(tb)}>
              <div className="row-between">
                <Text bold>
                  {!tb.daDoc && <span className="noti-dot" />}
                  {tb.tieuDe}
                </Text>
                <Text size="xxSmall" className="muted">
                  {thoiGianTruoc(tb.taoLuc)}
                </Text>
              </div>
              {tb.noiDung && (
                <Text size="small" className="muted" style={{ marginTop: 6 }}>
                  {tb.noiDung}
                </Text>
              )}
            </Card>
          ))}
      </Box>
    </Page>
  );
}
