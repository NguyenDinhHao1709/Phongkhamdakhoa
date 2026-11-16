import { formatCurrency } from '../../utils/formatCurrency';
import { tamUngCuaHoaDon } from '../../utils/hoaDon';

/**
 * Tổng kết hóa đơn quyết toán theo góc nhìn bệnh nhân:
 * Tổng viện phí − BHYT = Bệnh nhân chi trả; trừ tạm ứng đã nộp → nộp thêm (thucThu) hoặc được hoàn (tienHoanTra).
 */
export default function TomTatThanhToan({ hoaDon }) {
  const tongTien = Number(hoaDon?.tongTien || 0);
  const giam = Number(hoaDon?.soTienGiam || 0);
  const benhNhanChiTra = Math.max(0, tongTien - giam);
  const tamUng = tamUngCuaHoaDon(hoaDon);
  const nopThem = Number(hoaDon?.thucThu || 0);
  const hoanTra = Number(hoaDon?.tienHoanTra || 0);

  return (
    <div className="pt-2 border-t border-gray-200 space-y-1">
      <div className="flex justify-between text-gray-600">
        <span>Tổng viện phí:</span>
        <span className="font-medium text-gray-800">{formatCurrency(tongTien)}</span>
      </div>
      {giam > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>BHYT chi trả:</span>
          <span className="font-medium">- {formatCurrency(giam)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
        <span>Bệnh nhân chi trả:</span>
        <span className="text-primary-600 font-bold">{formatCurrency(benhNhanChiTra)}</span>
      </div>
      {tamUng > 0 && (
        <>
          <div className="flex justify-between text-blue-700">
            <span>Đã nộp tạm ứng / cọc trước:</span>
            <span className="font-medium">{formatCurrency(tamUng)}</span>
          </div>
          {hoanTra > 0 ? (
            <div className="flex justify-between font-bold text-rose-600 text-sm">
              <span>Hoàn trả bệnh nhân (tạm ứng dư):</span>
              <span>{formatCurrency(hoanTra)}</span>
            </div>
          ) : (
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Nộp thêm khi thanh toán:</span>
              <span>{formatCurrency(nopThem)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
