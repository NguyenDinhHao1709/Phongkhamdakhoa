import React, { useMemo, useState } from "react";
import { Page, Box, Text, Button, Icon, useNavigate } from "zmp-ui";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { taiTomTatSucKhoe, chiaCuThuoc } from "../lib/suc-khoe";
import { docJson, ghiJson } from "../lib/storage";
import { ngayISO, ngayVN } from "../lib/format";
import { Card, Chip, DangTai, DongThongTin, LoiTai, TieuDeMuc } from "../components/ui";

const CU = [
  { id: "sang", nhan: "🌅 Sáng" },
  { id: "trua", nhan: "☀️ Trưa" },
  { id: "toi", nhan: "🌙 Tối" },
];

// Ngày từ API có thể là ISO (2026-11-18...) hoặc đã định dạng sẵn (18/11/2026)
const hienNgay = (v) => (!v ? null : /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? ngayVN(v) : String(v));

export default function HealthPage() {
  useTieuDe("Sức khỏe của tôi");
  const navigate = useNavigate();
  const homNay = ngayISO();
  const khoaUong = `pk_da_uong_${homNay}`;
  const [cu, setCu] = useState(() => {
    const h = new Date().getHours();
    return h < 11 ? "sang" : h < 16 ? "trua" : "toi";
  });
  const [daUong, setDaUong] = useState(() => docJson(khoaUong, {}));

  const { data: tt, loading, error, reload } = useTaiDuLieu(taiTomTatSucKhoe, []);
  const lich = useMemo(() => chiaCuThuoc(tt?.danhSachThuoc), [tt?.danhSachThuoc]);
  const tongCu = lich.sang.length + lich.trua.length + lich.toi.length;
  const soDaUong = CU.reduce((n, c) => n + lich[c.id].filter((t) => daUong[`${c.id}_${t.id}`]).length, 0);
  const phanTram = tongCu ? Math.round((soDaUong / tongCu) * 100) : 0;

  const doiTrangThai = (cuId, thuocId) => {
    const key = `${cuId}_${thuocId}`;
    const moi = { ...daUong, [key]: !daUong[key] };
    setDaUong(moi);
    ghiJson(khoaUong, moi);
  };

  const hoiAiVeThuoc = (t) =>
    navigate("/bac-si-ai", {
      animate: false,
      state: {
        cauHoi: `Giải thích giúp tôi thuốc "${t.tenThuoc}"${t.tenHoatChat ? ` (${t.tenHoatChat})` : ""} có công dụng gì, cách uống thế nào và cần lưu ý tác dụng phụ gì?`,
      },
    });

  if (loading)
    return (
      <Page className="page page-with-nav">
        <DangTai />
      </Page>
    );
  if (error)
    return (
      <Page className="page page-with-nav">
        <LoiTai error={error} onRetry={reload} />
      </Page>
    );

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        <Card className="health-card">
          <div className="row-between">
            <div>
              <Text size="xxSmall" className="muted">
                Bệnh nhân
              </Text>
              <Text.Title size="normal">{tt.hoTen}</Text.Title>
            </div>
            {tt.maBenhNhan && <span className="badge badge-info">{tt.maBenhNhan}</span>}
          </div>
          <div className="health-diag">
            <Text size="xxSmall" className="muted">
              Chẩn đoán gần nhất
            </Text>
            <Text bold>{tt.chanDoanGanNhat || "Chưa có chẩn đoán"}</Text>
          </div>
          <DongThongTin nhan="Khám gần nhất" giaTri={hienNgay(tt.ngayKham)} />
          <DongThongTin
            nhan="Bác sĩ điều trị"
            giaTri={tt.bacSiDieuTri ? `${tt.bacSiDieuTri.hoTen}${tt.bacSiDieuTri.chuyenKhoa ? ` · ${tt.bacSiDieuTri.chuyenKhoa}` : ""}` : null}
          />
          <DongThongTin nhan="Số lượt khám" giaTri={tt.soLuotKham ? `${tt.soLuotKham} lượt` : null} />
        </Card>

        <TieuDeMuc phai={tongCu > 0 && <span className={`badge ${phanTram === 100 ? "badge-success" : "badge-info"}`}>{phanTram}% hôm nay</span>}>
          Lịch uống thuốc hôm nay
        </TieuDeMuc>
        {tongCu === 0 ? (
          <Card>
            <Text size="small" className="muted">
              Bạn chưa có đơn thuốc nào đang dùng.
            </Text>
          </Card>
        ) : (
          <Card>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${phanTram}%` }} />
            </div>
            <Text size="xxSmall" className="muted" style={{ margin: "6px 0 10px" }}>
              Đã uống {soDaUong}/{tongCu} cữ · bấm vào thuốc để đánh dấu
            </Text>
            <div className="row-gap" style={{ marginBottom: 10 }}>
              {CU.map((c) => (
                <Chip key={c.id} active={cu === c.id} onClick={() => setCu(c.id)}>
                  {c.nhan} ({lich[c.id].length})
                </Chip>
              ))}
            </div>
            {lich[cu].length === 0 ? (
              <Text size="small" className="muted">
                Không có thuốc cần uống vào cữ này.
              </Text>
            ) : (
              lich[cu].map((t) => {
                const xong = !!daUong[`${cu}_${t.id}`];
                return (
                  <div key={t.id} className={`med-item ${xong ? "med-done" : ""}`}>
                    <button type="button" className="med-check" onClick={() => doiTrangThai(cu, t.id)} aria-label="Đánh dấu đã uống">
                      {xong ? "✓" : ""}
                    </button>
                    <div className="med-body" onClick={() => doiTrangThai(cu, t.id)}>
                      <div className="med-name">
                        {t.tenThuoc}
                        {t.tenHoatChat ? <span className="muted"> ({t.tenHoatChat})</span> : null}
                      </div>
                      <div className="med-dose">{t.lieuDung}</div>
                    </div>
                    <button type="button" className="med-ask" onClick={() => hoiAiVeThuoc(t)}>
                      Hỏi AI
                    </button>
                  </div>
                );
              })
            )}
          </Card>
        )}

        <TieuDeMuc>Tái khám</TieuDeMuc>
        <Card>
          <Text size="small">
            {tt.taiKham ? (
              <>
                Hẹn tái khám: <b>{hienNgay(tt.taiKham)}</b>
              </>
            ) : (
              "Bác sĩ chưa hẹn ngày tái khám."
            )}
          </Text>
          <Button
            size="small"
            style={{ marginTop: 10 }}
            onClick={() =>
              navigate("/dat-lich", { animate: false, state: { chuyenKhoa: tt.bacSiDieuTri?.chuyenKhoa, bacSiId: tt.bacSiDieuTri?.id } })
            }
          >
            Đặt lịch tái khám
          </Button>
        </Card>

        <TieuDeMuc>Hồ sơ khám bệnh</TieuDeMuc>
        <div className="stack-12">
          <Button fullWidth variant="secondary" prefixIcon={<Icon icon="zi-note" />} onClick={() => navigate("/ho-so", { animate: false })}>
            Lịch sử khám, kết quả xét nghiệm & đơn thuốc
          </Button>
          <Button fullWidth variant="secondary" prefixIcon={<Icon icon="zi-chat" />} onClick={() => navigate("/bac-si-ai", { animate: false })}>
            Hỏi Bác sĩ AI về sức khỏe của tôi
          </Button>
        </div>
      </Box>
    </Page>
  );
}
