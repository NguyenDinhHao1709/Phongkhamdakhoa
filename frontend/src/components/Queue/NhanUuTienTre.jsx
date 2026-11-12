import { DOI_TUONG_UU_TIEN } from '../../utils/constants';

// Nhãn đối tượng ưu tiên khám và số phút bác sĩ chậm so với giờ hẹn (hàng đợi lễ tân & bác sĩ)
export default function NhanUuTienTre({ luot }) {
  return (
    <>
      {luot.uuTien && (
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${luot.uuTien === 'cap_cuu' ? 'bg-red-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
          {DOI_TUONG_UU_TIEN[luot.uuTien]}
        </span>
      )}
      {luot.treHenPhut >= 5 && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
          Trễ hẹn {luot.treHenPhut} phút
        </span>
      )}
    </>
  );
}
