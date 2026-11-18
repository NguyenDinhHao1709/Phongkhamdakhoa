import React from "react";
import { Page, Box, Text, Button, Icon, Avatar, useNavigate, useSnackbar } from "zmp-ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { ngayVN } from "../lib/format";
import { goiHotline, nhanTinPhongKham } from "../lib/zalo";
import { Card, DongThongTin, TieuDeMuc } from "../components/ui";

const GIOI_TINH = { nam: "Nam", nu: "Nữ", khac: "Khác" };

export default function ProfilePage() {
  useTieuDe("Cá nhân");
  const { user, dangXuat } = useAuth();
  const { openSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const { data: bn } = useTaiDuLieu(
    async () => (user?.benhNhanId ? (await api.get(`/benh-nhan/${user.benhNhanId}`)).data : null),
    [user?.benhNhanId],
  );

  const ten = bn?.hoTen || user?.hoTen || "Bệnh nhân";

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        <Card className="profile-card">
          <Avatar size={56}>{ten.trim().split(/\s+/).pop()?.[0]?.toUpperCase()}</Avatar>
          <div>
            <Text.Title size="normal">{ten}</Text.Title>
            {bn?.maBenhNhan && (
              <Text size="small" className="muted">
                Mã bệnh nhân: {bn.maBenhNhan}
              </Text>
            )}
          </div>
        </Card>

        <TieuDeMuc>Thông tin cá nhân</TieuDeMuc>
        <Card>
          <DongThongTin nhan="Số điện thoại" giaTri={bn?.soDienThoai} />
          <DongThongTin nhan="Email" giaTri={bn?.email} />
          <DongThongTin nhan="Ngày sinh" giaTri={bn?.ngaySinh ? ngayVN(bn.ngaySinh) : null} />
          <DongThongTin nhan="Giới tính" giaTri={GIOI_TINH[bn?.gioiTinh]} />
          <DongThongTin nhan="Số BHYT" giaTri={bn?.soBhyt} />
          <Text size="xSmall" className="muted" style={{ marginTop: 8 }}>
            Cần sửa thông tin? Vui lòng báo quầy tiếp tân khi đến khám.
          </Text>
        </Card>

        <TieuDeMuc>Tiện ích</TieuDeMuc>
        <div className="stack-12">
          <Button fullWidth variant="secondary" prefixIcon={<Icon icon="zi-notif" />} onClick={() => navigate("/thong-bao", { animate: false })}>
            Thông báo của tôi
          </Button>
          <Button
            fullWidth
            variant="secondary"
            prefixIcon={<Icon icon="zi-chat" />}
            onClick={() => nhanTinPhongKham().catch((e) => openSnackbar({ text: e.message, type: "warning" }))}
          >
            Nhắn tin cho phòng khám
          </Button>
          <Button fullWidth variant="secondary" prefixIcon={<Icon icon="zi-call" />} onClick={() => goiHotline().catch(() => {})}>
            Gọi hotline
          </Button>
          <Button fullWidth variant="tertiary" type="danger" prefixIcon={<Icon icon="zi-leave" />} onClick={dangXuat}>
            Đăng xuất
          </Button>
        </div>
      </Box>
    </Page>
  );
}
