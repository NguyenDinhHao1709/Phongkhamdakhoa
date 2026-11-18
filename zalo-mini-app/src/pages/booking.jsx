import React, { useMemo, useState } from "react";
import { Page, Box, Text, Button, Input, useLocation, useNavigate, useSnackbar } from "zmp-ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { cacNgayToi, ngayVN, thuTrongTuan } from "../lib/format";
import { Card, Chip, DangTai, LoiTai, TieuDeMuc, TrongRong } from "../components/ui";

const HINH_THUC = [
  { id: "truc_tiep", nhan: "Khám tại phòng khám" },
  { id: "truc_tuyen", nhan: "Tư vấn trực tuyến" },
];

export default function BookingPage() {
  useTieuDe("Đặt lịch khám");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const ngays = useMemo(() => cacNgayToi(14), []);

  const [hinhThuc, setHinhThuc] = useState("truc_tiep");
  const [ngay, setNgay] = useState(ngays[0]);
  const location = useLocation();
  // Mở từ nút "Đặt lịch tái khám": lọc sẵn chuyên khoa của bác sĩ điều trị
  const [chuyenKhoa, setChuyenKhoa] = useState(location.state?.chuyenKhoa || "");
  const [chon, setChon] = useState(null); // { bacSi, gio }
  const [lyDo, setLyDo] = useState("");
  const [dangGui, setDangGui] = useState(false);

  const { data: bacSis, loading, error, reload } = useTaiDuLieu(async () => {
    setChon(null);
    const res = await api.get("/lich-hen/bac-si-ca-trong", { ngay, hinhThuc });
    return res.data || [];
  }, [ngay, hinhThuc]);

  const dsChuyenKhoa = useMemo(
    () => [...new Set((bacSis || []).map((b) => b.chuyenKhoa).filter(Boolean))],
    [bacSis],
  );
  const bacSiHienThi = (bacSis || []).filter((b) => !chuyenKhoa || b.chuyenKhoa === chuyenKhoa);

  const datLich = async () => {
    if (!chon) {
      openSnackbar({ text: "Vui lòng chọn bác sĩ và giờ khám", type: "warning" });
      return;
    }
    if (!lyDo.trim()) {
      openSnackbar({ text: "Vui lòng mô tả ngắn triệu chứng / lý do khám", type: "warning" });
      return;
    }
    setDangGui(true);
    try {
      const res = await api.post("/lich-hen", {
        benhNhanId: user?.benhNhanId || undefined,
        bacSiId: chon.bacSi.id,
        chuyenKhoa: chon.bacSi.chuyenKhoa,
        phongKhamId: hinhThuc === "truc_tiep" ? chon.bacSi.phongKham?.id : undefined,
        ngayHen: ngay,
        gioHen: chon.gio,
        hinhThuc,
        lyDoKham: lyDo.trim(),
      });
      const lh = res.data;
      openSnackbar({ text: `Đặt lịch thành công! Mã lịch hẹn ${lh?.maLichHen || ""}`, type: "success" });
      setLyDo("");
      // Chờ cọc → sang trang Lịch hẹn và mở ngay bảng thanh toán (QR + app ngân hàng)
      navigate("/lich-hen", {
        animate: false,
        state: lh?.trangThai === "cho_thanh_toan" ? { thanhToanId: lh.id } : undefined,
      });
    } catch (err) {
      openSnackbar({ text: err.message, type: "error" });
      if (["SLOT_DA_DUOC_DAT", "NGOAI_KHUNG_ONLINE", "SLOT_DANH_CHO_ONLINE"].includes(err.code)) reload();
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        <TieuDeMuc>1. Hình thức khám</TieuDeMuc>
        <div className="row-gap">
          {HINH_THUC.map((h) => (
            <Chip key={h.id} active={hinhThuc === h.id} onClick={() => setHinhThuc(h.id)}>
              {h.nhan}
            </Chip>
          ))}
        </div>

        <TieuDeMuc>2. Ngày khám</TieuDeMuc>
        <div className="scroll-x">
          {ngays.map((d) => (
            <button
              key={d}
              type="button"
              className={`date-chip ${d === ngay ? "date-chip-active" : ""}`}
              onClick={() => setNgay(d)}
            >
              <span className="date-thu">{thuTrongTuan(d)}</span>
              <span className="date-ngay">{ngayVN(d).slice(0, 5)}</span>
            </button>
          ))}
        </div>

        <TieuDeMuc>3. Bác sĩ và giờ khám</TieuDeMuc>
        {dsChuyenKhoa.length > 1 && (
          <div className="scroll-x" style={{ marginBottom: 12 }}>
            <Chip active={!chuyenKhoa} onClick={() => setChuyenKhoa("")}>
              Tất cả
            </Chip>
            {dsChuyenKhoa.map((ck) => (
              <Chip key={ck} active={chuyenKhoa === ck} onClick={() => setChuyenKhoa(ck)}>
                {ck}
              </Chip>
            ))}
          </div>
        )}

        {loading && <DangTai />}
        {error && <LoiTai error={error} onRetry={reload} />}
        {!loading && !error && bacSiHienThi.length === 0 && (
          <TrongRong>Ngày này chưa có bác sĩ nhận lịch {hinhThuc === "truc_tuyen" ? "tư vấn trực tuyến" : ""}. Vui lòng chọn ngày khác.</TrongRong>
        )}
        {!loading &&
          !error &&
          bacSiHienThi.map((bs) => {
            const slotTrong = (bs.slots || []).filter((s) => s.conTrong);
            return (
              <Card key={bs.id} className={chon?.bacSi.id === bs.id ? "card-selected" : ""}>
                <Text bold>{bs.hoTen}</Text>
                <Text size="small" className="muted">
                  {bs.chuyenKhoa}
                  {hinhThuc === "truc_tiep" && bs.phongKham ? ` · ${bs.phongKham.tenPhong}` : ""}
                </Text>
                {slotTrong.length === 0 ? (
                  <Text size="small" className="muted" style={{ marginTop: 8 }}>
                    Đã kín lịch ngày này
                  </Text>
                ) : (
                  <div className="slot-grid">
                    {slotTrong.map((s) => (
                      <Chip
                        key={s.gio}
                        active={chon?.bacSi.id === bs.id && chon?.gio === s.gio}
                        onClick={() => setChon({ bacSi: bs, gio: s.gio })}
                      >
                        {s.gio}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

        <TieuDeMuc>4. Triệu chứng / lý do khám</TieuDeMuc>
        <Input.TextArea
          placeholder="Ví dụ: đau đầu, sốt nhẹ 2 ngày nay..."
          value={lyDo}
          maxLength={500}
          showCount
          onChange={(e) => setLyDo(e.target.value)}
        />

        {chon && (
          <Card className="summary-card">
            <Text size="small">
              <b>{chon.bacSi.hoTen}</b> · {chon.gio} {thuTrongTuan(ngay)}, {ngayVN(ngay)} ·{" "}
              {hinhThuc === "truc_tuyen" ? "Tư vấn trực tuyến" : "Khám tại phòng khám"}
            </Text>
            <Text size="xSmall" className="muted" style={{ marginTop: 4 }}>
              Sau khi đặt, bạn thanh toán tiền cọc qua PayOS để giữ lịch.
            </Text>
          </Card>
        )}

        <Button fullWidth size="large" loading={dangGui} disabled={!chon} onClick={datLich} style={{ marginTop: 16 }}>
          Xác nhận đặt lịch
        </Button>
      </Box>
    </Page>
  );
}
