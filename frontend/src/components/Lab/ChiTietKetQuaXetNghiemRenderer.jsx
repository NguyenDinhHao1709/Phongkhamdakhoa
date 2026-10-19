import React, { Fragment } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';
import { parseAttachmentUrls, toAttachmentUrl } from '../../utils/fileAttachments';
import {
  parseResultConfig,
  getFallbackServiceConfig,
  evaluateLabValue,
} from '../../utils/labConfig';

/**
 * Component hiển thị đầy đủ các thông số xét nghiệm & kết quả cận lâm sàng
 * Chuẩn ERP Y tế / HIS / LIS
 * Dùng chung cho: Bác sĩ khám bệnh, Hồ sơ bệnh án của Bệnh nhân, Tiến độ khám bệnh
 */
export default function ChiTietKetQuaXetNghiemRenderer({
  chiDinh,
  ketQua,
  onPreviewFile,
  title = 'KẾT QUẢ CHI TIẾT TỪ PHÒNG XÉT NGHIỆM & CLS',
  theme = 'emerald', // 'emerald' | 'blue'
  showStatusBadge = true,
}) {
  if (!ketQua) return null;

  const rawChiTiet = ketQua?.ketQuaChiTiet ?? ketQua?.ket_qua_chi_tiet;
  let chiTiet = {};
  try {
    chiTiet = typeof rawChiTiet === 'string' ? JSON.parse(rawChiTiet) : (rawChiTiet || {});
  } catch {
    chiTiet = {};
  }

  const dv = chiDinh?.dichVu || {};
  const fallbackConfig = getFallbackServiceConfig(dv);
  const resultFields = parseResultConfig(dv?.cauHinhKetQua || dv?.cau_hinh_ket_qua);
  const configuredFields = resultFields.length > 0 ? resultFields : (fallbackConfig?.fields || []);
  const hasChiTiet = Object.keys(chiTiet).length > 0;
  const isCdhaOrTextual = dv?.loai === 'cdha' || configuredFields.some((f) => f.type === 'textarea');
  const fileUrls = parseAttachmentUrls(ketQua?.fileDinhKem ?? ketQua?.file_dinh_kem);

  const giaTri = ketQua?.giaTri ?? ketQua?.gia_tri;
  const donVi = ketQua?.donVi ?? ketQua?.don_vi ?? dv?.donViKetQua ?? '';
  const thamChieu = dv?.giaTriBinhThuong || fallbackConfig?.fields?.[0]?.reference || 'Bình thường';
  const nhanXet = ketQua?.nhanXet ?? ketQua?.nhan_xet;

  // Nhóm các chỉ số theo phân hệ (section)
  const groupedFields = configuredFields.reduce((acc, field) => {
    const sec = field.section || 'Thông số đo đạc';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(field);
    return acc;
  }, {});

  // Các keys trong chiTiet nhưng không nằm trong configuredFields
  const configuredKeys = new Set(configuredFields.map((f) => f.key));
  const extraEntries = Object.entries(chiTiet).filter(([k]) => !configuredKeys.has(k));

  const isBlue = theme === 'blue';
  const containerClasses = isBlue
    ? 'bg-blue-50/60 border-blue-200/90 text-blue-950'
    : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950';
  const headerBorder = isBlue ? 'border-blue-200/80' : 'border-emerald-200/80';
  const tableHeaderBg = isBlue ? 'bg-blue-100/80 text-blue-950' : 'bg-emerald-100/80 text-emerald-950';
  const pulseColor = isBlue ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 space-y-3.5 shadow-2xs transition-all ${containerClasses}`}>
      {/* 1. Header: Tiêu đề & Thời gian hoàn thành */}
      <div className={`flex items-center justify-between border-b ${headerBorder} pb-2.5 flex-wrap gap-2`}>
        <div className="flex items-center gap-2">
          <span className={`flex h-2.5 w-2.5 rounded-full ${pulseColor} animate-pulse`} />
          <span className="text-xs font-black tracking-wide uppercase">
            {title}
          </span>
          {showStatusBadge && (
            ketQua?.daGuiBacSi ? (
              <span className="text-[10px] bg-emerald-200/90 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                ✓ KTV đã duyệt & gửi
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                ✓ Đã có kết quả
              </span>
            )
          )}
        </div>
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md font-semibold bg-white/80 border border-gray-200/60 text-gray-700">
          🕒 {formatDateTime(ketQua.thoiGianNhap || ketQua.taoLuc || chiDinh?.thoiGianCoKetQua || new Date())}
        </span>
      </div>

      {/* 2. Hiển thị Toàn bộ Các Thông Số Đo Đạc / Mô tả */}
      {hasChiTiet ? (
        <div className="space-y-3">
          {isCdhaOrTextual ? (
            /* Dạng báo cáo chẩn đoán hình ảnh / mô tả giải phẫu (X-Quang, Siêu âm, ECG...) */
            <div className="space-y-2">
              {configuredFields.map((field) => {
                const val = chiTiet[field.key];
                if (!val) return null;
                return (
                  <div key={field.key} className="p-3 rounded-xl bg-white border border-gray-200/80 shadow-2xs">
                    <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wide block">
                      {field.label}:
                    </span>
                    <p className="text-xs text-gray-800 whitespace-pre-wrap mt-1 font-medium leading-relaxed">
                      {val}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Dạng bảng thông số xét nghiệm y khoa chuẩn LIS/HIS (Công thức máu CBC, Sinh hóa, Nước tiểu...) */
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
              <table className="min-w-full text-xs divide-y divide-gray-200">
                <thead className={`${tableHeaderBg} font-bold uppercase tracking-wider text-[11px]`}>
                  <tr>
                    <th className="py-2.5 px-3 text-left">Chỉ số / Thông số</th>
                    <th className="py-2.5 px-3 text-center">Kết quả đo</th>
                    <th className="py-2.5 px-3 text-center">Đơn vị</th>
                    <th className="py-2.5 px-3 text-center">Khoảng tham chiếu chuẩn</th>
                    <th className="py-2.5 px-3 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {Object.entries(groupedFields).map(([section, fields]) => {
                    const validFields = fields.filter((f) => chiTiet[f.key] !== undefined && chiTiet[f.key] !== null && chiTiet[f.key] !== '');
                    if (validFields.length === 0) return null;
                    return (
                      <Fragment key={section}>
                        {Object.keys(groupedFields).length > 1 && (
                          <tr className="bg-gray-50/90 font-bold text-gray-900 text-[11px]">
                            <td colSpan={5} className="py-1.5 px-3 uppercase tracking-wider text-blue-900 bg-blue-50/50">
                              • {section}
                            </td>
                          </tr>
                        )}
                        {validFields.map((field) => {
                          const val = chiTiet[field.key];
                          const evalResult = evaluateLabValue(val, field.reference);
                          return (
                            <tr key={field.key} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-2 px-3 text-gray-900 font-semibold">
                                {field.label}
                              </td>
                              <td className={`py-2 px-3 text-center font-bold text-sm ${
                                evalResult === 'high' ? 'text-rose-600 bg-rose-50/70' :
                                evalResult === 'low' ? 'text-amber-600 bg-amber-50/70' : 'text-gray-900 font-black'
                              }`}>
                                {val}
                              </td>
                              <td className="py-2 px-3 text-center text-gray-600 font-mono text-[11px]">
                                {field.unit || '—'}
                              </td>
                              <td className="py-2 px-3 text-center text-gray-600 text-[11px]">
                                {field.reference || '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {evalResult === 'high' ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                    ↑ Cao
                                  </span>
                                ) : evalResult === 'low' ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                    ↓ Thấp
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                    ✓ Bình thường
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {/* Các chỉ số ngoài cấu hình (nếu có) */}
                  {extraEntries.map(([k, v]) => (
                    <tr key={k} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900 font-semibold">{k}</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900 text-sm">{String(v)}</td>
                      <td className="py-2 px-3 text-center text-gray-400">—</td>
                      <td className="py-2 px-3 text-center text-gray-400">—</td>
                      <td className="py-2 px-3 text-center text-gray-400">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Khi chưa có cấu hình mảng chi tiết hoặc là chỉ số xét nghiệm đơn */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-xl border border-gray-200 text-xs shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Kết quả đo đạc:
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-blue-700">{giaTri || '—'}</span>
              {donVi && <span className="text-xs font-semibold text-blue-600">{donVi}</span>}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Khoảng tham chiếu chuẩn:
            </span>
            <span className="text-xs font-medium text-gray-700">{thamChieu}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Đánh giá:
            </span>
            {(() => {
              const res = evaluateLabValue(giaTri, thamChieu);
              if (res === 'high') {
                return <span className="text-xs font-bold text-rose-600">↑ Cao hơn mức chuẩn</span>;
              }
              if (res === 'low') {
                return <span className="text-xs font-bold text-amber-600">↓ Thấp hơn mức chuẩn</span>;
              }
              return <span className="text-xs font-semibold text-emerald-700">✓ Trong giới hạn bình thường</span>;
            })()}
          </div>
        </div>
      )}

      {/* 3. Đánh giá & Nhận xét của Kỹ thuật viên */}
      {nhanXet && (
        <div className="rounded-xl bg-white p-3 border border-gray-200 text-xs shadow-2xs space-y-1">
          <span className="font-bold text-gray-800 flex items-center gap-1.5">
            💬 Đánh giá & Kết luận của Kỹ thuật viên:
          </span>
          <p className="italic text-gray-700 pl-2.5 border-l-2 border-blue-400 font-medium leading-relaxed">
            "{nhanXet}"
          </p>
        </div>
      )}

      {/* 4. Hình ảnh & Tệp đính kèm kết quả */}
      {fileUrls.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-purple-600" />
              Hình ảnh & Tài liệu kết quả đính kèm ({fileUrls.length} tệp)
            </span>
            <span className="text-[11px] text-gray-500 italic">Bấm vào ảnh để phóng to</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {fileUrls.map((file, fileIndex) => {
              const fileUrl = toAttachmentUrl(file);
              const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(file);
              return isImage ? (
                <div
                  key={file}
                  onClick={() => onPreviewFile && onPreviewFile({
                    url: fileUrl,
                    name: `Ảnh kết quả ${fileIndex + 1}`,
                    type: 'image',
                  })}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <img
                    src={fileUrl}
                    alt={`Ảnh kết quả ${fileIndex + 1}`}
                    className="h-32 w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs">
                    <Eye className="h-4 w-4" /> Phóng to ảnh
                  </div>
                  <div className="p-1.5 text-[11px] text-gray-600 truncate bg-white border-t border-gray-100">
                    Ảnh {fileIndex + 1}
                  </div>
                </div>
              ) : (
                <a
                  key={file}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs text-blue-700 font-medium transition"
                >
                  <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="truncate flex-1">Tệp tài liệu {fileIndex + 1}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

