import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type BangCoBenhNhan = 'benh_nhan' | 'lich_hen' | 'hoa_don';

/**
 * Chặn IDOR: nếu người gọi là bệnh nhân thì bản ghi phải thuộc về chính họ.
 * Nhân viên (các vai trò khác) được bỏ qua — quyền đã do RolesGuard kiểm soát.
 */
export async function assertBenhNhanSoHuu(ds: DataSource, user: any, bang: BangCoBenhNhan, id: number) {
  if (user?.vai_tro !== 'benh_nhan') return;
  const cot = bang === 'benh_nhan' ? 'id' : 'benh_nhan_id';
  const rows = await ds.query(
    `SELECT 1 FROM ${bang} t JOIN benh_nhan bn ON bn.id = t.${cot} WHERE t.id = ? AND bn.nguoi_dung_id = ? LIMIT 1`,
    [id, user.id],
  );
  if (!rows.length) {
    throw new ForbiddenException({ code: 'KHONG_CO_QUYEN', message: 'Bạn chỉ được truy cập dữ liệu của chính mình' });
  }
}
