import React, { useState } from "react";
import { Page, Box, Text } from "zmp-ui";
import { api } from "../lib/api";
import { useTaiDuLieu, useTieuDe } from "../lib/hooks";
import { ngayVN } from "../lib/format";
import { Badge, Card, DangTai, DongThongTin, LoiTai, TrongRong } from "../components/ui";

function KetQuaXetNghiem({ ds }) {
  if (!ds?.length) return null;
  return (
    <div className="sub-block">
      <Text size="small" bold>
        Xét nghiệm / cận lâm sàng
      </Text>
      {ds.map((cd) => (
        <div key={cd.id} className="sub-item">
          <div className="row-between">
            <span>{cd.dichVu?.tenDichVu || "Chỉ định"}</span>
            {cd.ketQua ? <Badge mau="success">Có kết quả</Badge> : <Badge mau="warning">Chờ kết quả</Badge>}
          </div>
          {cd.ketQua && (
            <Text size="xSmall" className="muted">
              {[cd.ketQua.giaTri, cd.ketQua.donVi].filter(Boolean).join(" ")}
              {cd.dichVu?.giaTriBinhThuong ? ` (bình thường: ${cd.dichVu.giaTriBinhThuong})` : ""}
              {cd.ketQua.nhanXet ? ` · ${cd.ketQua.nhanXet}` : ""}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

function DonThuoc({ ds }) {
  const thuocs = (ds || []).flatMap((dt) => dt.chiTiet || dt.chiTietDonThuoc || []);
  if (!thuocs.length) return null;
  return (
    <div className="sub-block">
      <Text size="small" bold>
        Đơn thuốc
      </Text>
      {thuocs.map((ct) => (
        <div key={ct.id} className="sub-item">
          <div className="row-between">
            <span>
              {ct.thuoc?.tenThuoc}
              {ct.thuoc?.hamLuong ? ` ${ct.thuoc.hamLuong}` : ""}
            </span>
            <span className="muted">
              {ct.soLuong} {ct.thuoc?.donViTinh || ""}
            </span>
          </div>
          {ct.lieuDung && (
            <Text size="xSmall" className="muted">
              {ct.lieuDung}
              {ct.soNgayDung ? ` · ${ct.soNgayDung} ngày` : ""}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

function TheLuotKham({ lk }) {
  const [mo, setMo] = useState(false);
  const chanDoan = lk.chanDoanXacDinh || lk.chanDoanSoBo;
  return (
    <Card onClick={() => setMo((v) => !v)}>
      <div className="row-between">
        <Text bold>{ngayVN(lk.ngayKham)}</Text>
        <Text size="xSmall" className="muted">
          {mo ? "Thu gọn ▲" : "Xem chi tiết ▼"}
        </Text>
      </div>
      <DongThongTin nhan="Bác sĩ" giaTri={lk.bacSiTen} />
      <DongThongTin nhan="Chẩn đoán" giaTri={chanDoan || "Đang cập nhật"} />
      {mo && (
        <div onClick={(e) => e.stopPropagation()}>
          <DongThongTin nhan="Triệu chứng" giaTri={lk.trieuChung} />
          <DongThongTin nhan="Kết quả khám" giaTri={lk.ketQuaKham} />
          <DongThongTin nhan="Điều trị" giaTri={lk.phuongPhapDieuTri} />
          <DongThongTin nhan="Hẹn tái khám" giaTri={lk.taiKham} />
          <KetQuaXetNghiem ds={lk.xetNghiem} />
          <DonThuoc ds={lk.donThuoc} />
        </div>
      )}
    </Card>
  );
}

export default function RecordsPage() {
  useTieuDe("Hồ sơ khám bệnh");
  const { data, loading, error, reload } = useTaiDuLieu(async () => (await api.get("/ho-so-benh-an/cua-toi")).data, []);
  const ds = data?.lichSuKham || [];

  return (
    <Page className="page page-with-nav">
      <Box className="content">
        {data?.maHoSo && (
          <Text size="small" className="muted" style={{ marginBottom: 8 }}>
            Mã hồ sơ: {data.maHoSo}
          </Text>
        )}
        {loading && <DangTai />}
        {error && <LoiTai error={error} onRetry={reload} />}
        {!loading && !error && ds.length === 0 && <TrongRong>Bạn chưa có lượt khám nào tại phòng khám.</TrongRong>}
        {!loading && !error && ds.map((lk) => <TheLuotKham key={lk.id} lk={lk} />)}
      </Box>
    </Page>
  );
}
