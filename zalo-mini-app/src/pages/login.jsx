import React, { useState } from "react";
import { Page, Box, Text, Button, Input, useSnackbar } from "zmp-ui";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { dangNhapBangZalo } from "../lib/zalo";
import { useTieuDe } from "../lib/hooks";

export default function LoginPage() {
  useTieuDe("Phòng Khám Đa Khoa");
  const { dangNhap } = useAuth();
  const { openSnackbar } = useSnackbar();
  const [dangXuLy, setDangXuLy] = useState(false);
  const [moFormTaiKhoan, setMoFormTaiKhoan] = useState(false);
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");

  const baoLoi = (err) => openSnackbar({ text: err?.message || "Đăng nhập thất bại", type: "error" });

  const xuLyDangNhapZalo = async () => {
    setDangXuLy(true);
    try {
      dangNhap(await dangNhapBangZalo());
    } catch (err) {
      baoLoi(err);
    } finally {
      setDangXuLy(false);
    }
  };

  const xuLyDangNhapTaiKhoan = async () => {
    if (!tenDangNhap.trim() || !matKhau) {
      openSnackbar({ text: "Nhập email/số điện thoại và mật khẩu", type: "warning" });
      return;
    }
    setDangXuLy(true);
    try {
      const res = await api.post("/auth/login", { tenDangNhap: tenDangNhap.trim(), matKhau }, { auth: false });
      if (res.data?.user?.vaiTro !== "benh_nhan") {
        throw new Error("Mini App dành cho bệnh nhân. Nhân viên vui lòng dùng trang quản lý trên web.");
      }
      dangNhap(res.data);
    } catch (err) {
      baoLoi(err);
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <Page className="page login-page">
      <Box className="login-hero">
        <div className="login-logo">+</div>
        <Text.Title size="xLarge" className="login-title">
          Phòng Khám Đa Khoa
        </Text.Title>
        <Text className="login-sub">Đặt lịch khám, nhận nhắc lịch và xem kết quả ngay trên Zalo</Text>
      </Box>

      <Box className="login-body">
        <Button fullWidth size="large" loading={dangXuLy && !moFormTaiKhoan} onClick={xuLyDangNhapZalo}>
          Đăng nhập bằng Zalo
        </Button>
        <Text size="xSmall" className="muted center-text" style={{ marginTop: 8 }}>
          Lần đầu đăng nhập, Zalo sẽ hỏi quyền chia sẻ số điện thoại để tìm hồ sơ khám của bạn.
        </Text>

        <div className="divider-text">hoặc</div>

        {!moFormTaiKhoan ? (
          <Button fullWidth variant="secondary" onClick={() => setMoFormTaiKhoan(true)}>
            Đăng nhập bằng tài khoản phòng khám
          </Button>
        ) : (
          <div className="stack-12">
            <Input
              label="Email hoặc số điện thoại"
              placeholder="vd: 0901234567"
              value={tenDangNhap}
              onChange={(e) => setTenDangNhap(e.target.value)}
            />
            <Input.Password label="Mật khẩu" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} />
            <Button fullWidth loading={dangXuLy} onClick={xuLyDangNhapTaiKhoan}>
              Đăng nhập
            </Button>
          </div>
        )}
      </Box>
    </Page>
  );
}
