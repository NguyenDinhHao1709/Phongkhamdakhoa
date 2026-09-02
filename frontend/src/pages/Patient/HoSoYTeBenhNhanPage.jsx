import { useState, useEffect } from 'react';
import { FileText, Activity, Pill, FlaskConical, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

export default function HoSoYTeBenhNhanPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hồ sơ y tế cá nhân (EMR)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tra cứu lịch sử khám bệnh, chẩn đoán, đơn thuốc và kết quả xét nghiệm của bạn
        </p>
      </div>

      {/* Demo EMR Record Display */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 font-bold">
              HS01
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Lần khám gần nhất — Lượt tiếp nhận #TN20260001</h3>
              <p className="text-xs text-gray-500">Bác sĩ khám: Bác sĩ Nguyễn Văn A · Chuyên khoa Nội tổng quát</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-success-main bg-success-light px-3 py-1 rounded-full border border-success-main/20">
            Đã hoàn thành
          </span>
        </div>

        {/* Diagnostic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Chẩn đoán sơ bộ & xác định</p>
            <p className="font-semibold text-gray-900">Viêm họng cấp / Theo dõi suy nhược cơ thể</p>
            <p className="text-xs text-gray-600 mt-2">Triệu chứng: Đau họng, nuốt vướng, sốt nhẹ 38°C.</p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Chỉ số sinh hiệu ban đầu</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-700 mt-1">
              <span>Huyết áp: <strong>120/80 mmHg</strong></span>
              <span>Nhiệt độ: <strong>38.0 °C</strong></span>
              <span>Nhịp tim: <strong>78 bpm</strong></span>
              <span>SpO2: <strong>98%</strong></span>
            </div>
          </div>
        </div>

        {/* Prescription details */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-primary-600" /> Đơn thuốc đã kê (DT20260001)
          </h4>
          <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-4 py-2.5">Tên thuốc</th>
                  <th className="px-4 py-2.5 text-center">ĐVT</th>
                  <th className="px-4 py-2.5 text-center">SL</th>
                  <th className="px-4 py-2.5">Hướng dẫn sử dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900">Paracetamol 500mg</td>
                  <td className="px-4 py-3 text-center text-xs">Viên</td>
                  <td className="px-4 py-3 text-center font-bold">20</td>
                  <td className="px-4 py-3 text-xs text-gray-600">Ngày 2 lần, mỗi lần 1 viên sau ăn</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900">Vitamin C 1000mg</td>
                  <td className="px-4 py-3 text-center text-xs">Viên</td>
                  <td className="px-4 py-3 text-center font-bold">10</td>
                  <td className="px-4 py-3 text-xs text-gray-600">Ngày 1 lần, uống buổi sáng</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

