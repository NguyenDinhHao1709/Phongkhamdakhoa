import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const DUOI_ANH = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * File lưu trên disk được phục vụ qua /uploads nên phải lọc theo ĐUÔI (tên file lưu dùng đuôi gốc);
 * mimetype do client tự khai nên không đủ — tránh upload .html/.svg/.js chạy được trên domain backend.
 */
export function chiChoPhepDuoi(duoiHopLe: string[], thongBao: string) {
  return (req: any, file: Express.Multer.File, cb: (err: Error | null, ok: boolean) => void) => {
    const duoi = extname(file.originalname || '').slice(1).toLowerCase();
    if (!duoiHopLe.includes(duoi)) return cb(new BadRequestException(thongBao), false);
    cb(null, true);
  };
}
