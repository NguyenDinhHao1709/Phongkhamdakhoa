import { Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * MySQL trên Clever Cloud chạy UTC nên CURRENT_TIMESTAMP / NOW() / CURDATE() lệch 7 giờ
 * so với driver (timezone '+07:00'). Đặt múi giờ +07:00 cho từng kết nối trong pool,
 * một lần / kết nối (không cần quyền SUPER để đổi global time_zone).
 *
 * Đồng thời: truy vấn quá giờ (PROTOCOL_SEQUENCE_TIMEOUT) thì hủy kết nối. mysql2 chỉ báo lỗi mà vẫn trả
 * kết nối chết về pool, khiến các request sau treo mãi (đã gặp 15/11/2026, phải restart Render mới hết).
 */
export async function createVnTimezoneDataSource(options: DataSourceOptions): Promise<DataSource> {
  const dataSource = await new DataSource(options).initialize();
  const pool = (dataSource.driver as any).pool;
  pool?.on('acquire', (conn: any) => {
    if (conn.__vnTimezone) return;
    conn.__vnTimezone = true;
    const queryGoc = conn.query.bind(conn);
    conn.query = (...args: any[]) => {
      const i = args.findIndex((a) => typeof a === 'function');
      if (i >= 0) {
        const cb = args[i];
        args[i] = (err: any, ...rest: any[]) => {
          if (err?.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
            new Logger('Database').warn('Truy vấn quá giờ, hủy kết nối khỏi pool');
            conn.destroy();
          }
          return cb(err, ...rest);
        };
      }
      return queryGoc(...args);
    };
    conn.query("SET time_zone = '+07:00'", (err: Error | null) => {
      if (err) new Logger('Database').warn(`Không đặt được time_zone +07:00: ${err.message}`);
    });
  });
  return dataSource;
}
