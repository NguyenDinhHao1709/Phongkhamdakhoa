import * as XLSX from 'xlsx';
import { apiPost } from '../services/api';

/** Báo backend ghi nhật ký "Xuất file" (file được tạo ngay trên trình duyệt nên backend không tự biết) */
export function ghiNhanXuatFile(tenFile) {
  apiPost('/quan-ly/nhat-ky/xuat-file', { tenFile, trang: window.location.pathname }).catch(() => {});
}

/** Tải file Excel và ghi nhật ký xuất file */
export function xuatExcel(workbook, tenFile) {
  XLSX.writeFile(workbook, tenFile);
  ghiNhanXuatFile(tenFile);
}
