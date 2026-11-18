import React from "react";
import { Box, Button, Spinner, Text } from "zmp-ui";
import { TRANG_THAI_LICH_HEN } from "../lib/format";

export function Card({ children, className = "", onClick }) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function Badge({ mau = "info", children }) {
  return <span className={`badge badge-${mau}`}>{children}</span>;
}

export function BadgeTrangThai({ trangThai }) {
  const tt = TRANG_THAI_LICH_HEN[trangThai] || { nhan: trangThai, mau: "muted" };
  return <Badge mau={tt.mau}>{tt.nhan}</Badge>;
}

export function DangTai() {
  return (
    <Box className="center-box">
      <Spinner />
    </Box>
  );
}

export function LoiTai({ error, onRetry }) {
  return (
    <Box className="center-box">
      <Text className="muted">{error?.message || "Không tải được dữ liệu"}</Text>
      {onRetry && (
        <Button size="small" variant="secondary" onClick={onRetry} style={{ marginTop: 12 }}>
          Thử lại
        </Button>
      )}
    </Box>
  );
}

export function TrongRong({ children }) {
  return (
    <Box className="center-box">
      <Text className="muted">{children}</Text>
    </Box>
  );
}

export function DongThongTin({ nhan, giaTri }) {
  if (giaTri === undefined || giaTri === null || giaTri === "") return null;
  return (
    <div className="info-row">
      <span className="info-label">{nhan}</span>
      <span className="info-value">{giaTri}</span>
    </div>
  );
}

export function Chip({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? "chip-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TieuDeMuc({ children, phai }) {
  return (
    <div className="section-title">
      <span>{children}</span>
      {phai}
    </div>
  );
}
