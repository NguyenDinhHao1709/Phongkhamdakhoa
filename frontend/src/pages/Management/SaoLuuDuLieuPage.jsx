import { useState, useEffect } from 'react';
import {
  Database, HardDrive, Download, RefreshCw, CheckCircle2, ShieldCheck,
  Server, AlertCircle, FileSpreadsheet, Lock
} from 'lucide-react';
import { apiGet } from '../../services/api';

export default function SaoLuuDuLieuPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupSuccess, setBackupSuccess] = useState(false);

  const fetchBackupInfo = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/quan-ly/backup-info');
      setData(res?.data || res);
    } catch (err) {
      console.error('Lỗi tải thông tin backup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupInfo();
  }, []);

  const handleDownloadSnapshot = () => {
    setBackupSuccess(true);
    // Export JSON metadata snapshot
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `phong_kham_backup_meta_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setTimeout(() => setBackupSuccess(false), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Database className="h-3.5 w-3.5" /> SYSTEM BACKUP & RECOVERY
          </div>
          <h1 className="text-2xl font-black text-gray-900">Sao Lưu & Giám Sát Cơ Sở Dữ Liệu</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản trị trạng thái lưu trữ các bảng, dung lượng dữ liệu và thực hiện xuất bản sao lưu bảo đảm an toàn thông tin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBackupInfo}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Làm mới
          </button>
          <button
            onClick={handleDownloadSnapshot}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Xuất bản sao lưu Snapshot
          </button>
        </div>
      </div>

      {backupSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Đã khởi tạo và tải xuống bản sao lưu metadata CSDL thành công!</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tên Cơ Sở Dữ Liệu</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{data?.dbName || 'phong_kham'}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">MySQL 8.0 • InnoDB Engine</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tổng Số Bảng Dữ Liệu</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{data?.totalTables || 31} bảng</p>
            <p className="text-xs text-gray-500 mt-1">{data?.totalRows?.toLocaleString('vi-VN') || 0} tổng bản ghi</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Ước Tính Dung Lượng</p>
            <p className="text-2xl font-black text-primary-700 mt-1 font-mono">{data?.totalSizeMB || '0.00'} MB</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Bao gồm Dữ liệu & Chỉ mục Index</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Database Tables Detail */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary-600" />
              Chi Tiết Kích Thước & Trạng Thái Các Bảng (MySQL Tables)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Truy vấn thời gian thực từ information_schema.tables</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Đang nạp thông số CSDL...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                <tr>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Tên bảng</th>
                  <th className="px-6 py-3 text-right">Số bản ghi (Rows)</th>
                  <th className="px-6 py-3 text-right">Dung lượng dữ liệu</th>
                  <th className="px-6 py-3 text-right">Tổng kích thước (MB)</th>
                  <th className="px-6 py-3">Cập nhật lần cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-xs">
                {data?.tables?.map((t, idx) => (
                  <tr key={t.tableName} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-400 font-normal">{idx + 1}</td>
                    <td className="px-6 py-3 font-bold text-gray-900">{t.tableName}</td>
                    <td className="px-6 py-3 text-right font-bold text-indigo-700">
                      {Number(t.tableRows || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">{t.dataSizeMB} MB</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-700">{t.totalSizeMB} MB</td>
                    <td className="px-6 py-3 text-gray-500 font-sans text-xs">
                      {t.updateTime ? new Date(t.updateTime).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
