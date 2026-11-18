import React, { useState } from "react";
import { Page, Box, Text, Button, Input, Sheet, useSnackbar } from "zmp-ui";
import { api } from "../lib/api";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { LICH_CON_HIEU_LUC, gio, ngayISO, ngayVN, thuTrongTuan, tien } from "../lib/format";
import { kiemTraThanhToan, thanhToanCoc } from "../lib/thanh-toan";
import { Badge, BadgeTrangThai, Card, Chip, DangTai, DongThongTin, LoiTai, TrongRong } from "../components/ui";

const CO_THE_HUY = ["cho_thanh_toan", "cho_xac_nhan", "da_xac_nhan"];

function SheetHuyLich({ lich, onClose, onDone }) {
  const { openSnackbar } = useSnackbar();
  const daThanhToan = lich && lich.trangThai !== "cho_thanh_toan";
  const [phuongThucNhan, setPhuongThucNhan] = useState("tien_mat");
  const [nganHang, setNganHang] = useState("");
  const [soTaiKhoan, setSoTaiKhoan] = useState("");
  const [chuTaiKhoan, setChuTaiKhoan] = useState("");
  const [lyDoHuy, setLyDoHuy] = useState("");
  const [dangGui, setDangGui] = useState(false);

  const xacNhan = async () => {
    setDangGui(true);
    try {
      const body = daThanhToan
        ? { phuongThucNhan, nganHang, soTaiKhoan, chuTaiKhoan, lyDoHuy: lyDoHuy || undefined }
        : { lyDoHuy: lyDoHuy || undefined };
      const res = await api.patch(`/lich-hen/${lich.id}/huy`, body);
      openSnackbar({ text: res.message || "Đã hủy lịch hẹn", type: "success", duration: 5000 });
      onDone();
    } catch (err) {
      openSnackbar({ text: err.message, type: "error", duration: 5000 });
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Sheet visible={!!lich} onClose={onClose} autoHeight mask handler swipeToClose title="Hủy lịch hẹn">
      {lich && (
        <Box className="sheet-body stack-12">
          <Text size="small">
            Lịch {lich.maLichHen} lúc {gio(lich.gioHen)} ngày {ngayVN(lich.ngayHen)}.
          </Text>
          {daThanhToan && (
            <>
              <Text size="small" className="muted">
                Bạn đã đóng cọc {tien(lich.soTienCoc)}. Chọn cách nhận lại tiền cọc (áp dụng khi hủy đúng thời hạn quy định):
              </Text>
              <div className="row-gap">
                <Chip active={phuongThucNhan === "tien_mat"} onClick={() => setPhuongThucNhan("tien_mat")}>
                  Nhận tại quầy
                </Chip>
                <Chip active={phuongThucNhan === "chuyen_khoan"} onClick={() => setPhuongThucNhan("chuyen_khoan")}>
                  Chuyển khoản
                </Chip>
              </div>
              {phuongThucNhan === "chuyen_khoan" && (
                <>
                  <Input label="Ngân hàng" placeholder="vd: Vietcombank" value={nganHang} onChange={(e) => setNganHang(e.target.value)} />
                  <Input label="Số tài khoản" value={soTaiKhoan} onChange={(e) => setSoTaiKhoan(e.target.value)} />
                  <Input label="Chủ tài khoản" value={chuTaiKhoan} onChange={(e) => setChuTaiKhoan(e.target.value)} />
                </>
              )}
            </>
          )}
          <Input label="Lý do hủy (không bắt buộc)" value={lyDoHuy} onChange={(e) => setLyDoHuy(e.target.value)} />
          <Button fullWidth type="danger" loading={dangGui} onClick={xacNhan}>
            Xác nhận hủy lịch
          </Button>
        </Box>
      )}
    </Sheet>
  );
}

function TheLichHen({ lh, onThanhToan, onKiemTra, onHuy }) {
  const online = lh.hinhThuc === "truc_tuyen";
  const choThanhToan = lh.trangThai === "cho_thanh_toan";
  const coTheHuy = CO_THE_HUY.includes(lh.trangThai);
  return (
    <Card>
      <div className="row-between">
        <Text bold>
          {thuTrongTuan(lh.ngayHen)}, {ngayVN(lh.ngayHen)} · {gio(lh.gioHen)}
        </Text>
        <BadgeTrangThai trangThai={lh.trangThai} />
      </div>
      <DongThongTin nhan="Mã lịch hẹn" giaTri={lh.maLichHen} />
      <DongThongTin nhan="Bác sĩ" giaTri={lh.bacSi?.nhanVien?.hoTen || "Phòng khám sẽ phân công"} />
      <DongThongTin nhan="Chuyên khoa" giaTri={lh.chuyenKhoa || lh.bacSi?.chuyenKhoa} />
      <DongThongTin
        nhan="Nơi khám"
        giaTri={online ? "Tư vấn trực tuyến" : [lh.phongKham?.ten_phong, lh.phongKham?.vi_tri].filter(Boolean).join(" - ")}
      />
      {!online && LICH_CON_HIEU_LUC.includes(lh.trangThai) && <DongThongTin nhan="Số thứ tự" giaTri={lh.soThuTu} />}
      <DongThongTin nhan="Tiền cọc" giaTri={tien(lh.soTienCoc)} />
      {lh.trangThaiHoanCoc && (
        <div style={{ marginTop: 6 }}>
          <Badge mau={lh.trangThaiHoanCoc === "da_hoan_coc" ? "success" : "warning"}>
            {lh.trangThaiHoanCoc === "da_hoan_coc" ? "Đã hoàn cọc" : "Đang chờ hoàn cọc"}
          </Badge>
        </div>
      )}

      {(choThanhToan || coTheHuy) && (
        <div className="row-gap" style={{ marginTop: 12 }}>
          {choThanhToan && (
            <>
              <Button size="small" onClick={() => onThanhToan(lh)}>
                Thanh toán cọc
              </Button>
              <Button size="small" variant="secondary" onClick={() => onKiemTra(lh)}>
                Đã thanh toán?
              </Button>
            </>
          )}
          {coTheHuy && (
            <Button size="small" variant="tertiary" type="danger" onClick={() => onHuy(lh)}>
              Hủy lịch
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AppointmentsPage() {
  useTieuDe("Lịch hẹn của tôi");
  const { openSnackbar } = useSnackbar();
  const [tab, setTab] = useState("sap_toi");
  const [lichHuy, setLichHuy] = useState(null);

  const { data, loading, error, reload } = useTaiDuLieu(async () => (await api.get("/lich-hen/cua-toi")).data || [], []);

  const homNay = ngayISO();
  const sapToi = (data || [])
    .filter((lh) => LICH_CON_HIEU_LUC.includes(lh.trangThai) && String(lh.ngayHen).slice(0, 10) >= homNay)
    .sort((a, b) => `${a.ngayHen} ${a.gioHen}`.localeCompare(`${b.ngayHen} ${b.gioHen}`));
  const daQua = (data || []).filter((lh) => !sapToi.includes(lh));
  const ds = tab === "sap_toi" ? sapToi : daQua;

  const thanhToan = (lh) => thanhToanCoc(lh.id).catch((e) => openSnackbar({ text: e.message, type: "error" }));

  const kiemTra = async (lh) => {
    try {
      const res = await kiemTraThanhToan(lh.id);
      openSnackbar({ text: res.message || "Đã cập nhật trạng thái thanh toán", type: "success" });
    } catch (e) {
      openSnackbar({ text: e.message, type: "error" });
    }
    reload();
  };

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        <div className="row-gap" style={{ marginBottom: 12 }}>
          <Chip active={tab === "sap_toi"} onClick={() => setTab("sap_toi")}>
            Sắp tới ({sapToi.length})
          </Chip>
          <Chip active={tab === "da_qua"} onClick={() => setTab("da_qua")}>
            Lịch sử ({daQua.length})
          </Chip>
          <Button size="small" variant="tertiary" onClick={reload} style={{ marginLeft: "auto" }}>
            Làm mới
          </Button>
        </div>

        {loading && <DangTai />}
        {error && <LoiTai error={error} onRetry={reload} />}
        {!loading && !error && ds.length === 0 && (
          <TrongRong>{tab === "sap_toi" ? "Chưa có lịch hẹn sắp tới." : "Chưa có lịch hẹn nào trước đây."}</TrongRong>
        )}
        {!loading &&
          !error &&
          ds.map((lh) => <TheLichHen key={lh.id} lh={lh} onThanhToan={thanhToan} onKiemTra={kiemTra} onHuy={setLichHuy} />)}
      </Box>

      <SheetHuyLich
        key={lichHuy?.id || "none"}
        lich={lichHuy}
        onClose={() => setLichHuy(null)}
        onDone={() => {
          setLichHuy(null);
          reload();
        }}
      />
    </Page>
  );
}
