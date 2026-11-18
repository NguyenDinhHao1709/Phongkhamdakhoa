import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../services/api';

/** Danh sách ca làm việc do giám đốc cấu hình: [{ id, tenCa, gioBatDau, gioKetThuc, nhan, slots }] */
export default function useCaKham() {
  const { data } = useQuery({
    queryKey: ['ca-kham'],
    queryFn: () => apiGet('/lich-hen/ca-kham'),
    staleTime: 5 * 60 * 1000,
  });
  const ds = data?.data?.data || data?.data || [];
  return Array.isArray(ds) ? ds : [];
}
