import { Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * MySQL trên Clever Cloud chạy UTC nên CURRENT_TIMESTAMP / NOW() / CURDATE() lệch 7 giờ
 * so với driver (timezone '+07:00'). Đặt múi giờ +07:00 cho từng kết nối trong pool,
 * một lần / kết nối (không cần quyền SUPER để đổi global time_zone).
 */
export async function createVnTimezoneDataSource(options: DataSourceOptions): Promise<DataSource> {
  const dataSource = await new DataSource(options).initialize();
  const pool = (dataSource.driver as any).pool;
  pool?.on('acquire', (conn: any) => {
    if (conn.__vnTimezone) return;
    conn.__vnTimezone = true;
    conn.query("SET time_zone = '+07:00'", (err: Error | null) => {
      if (err) new Logger('Database').warn(`Không đặt được time_zone +07:00: ${err.message}`);
    });
  });
  return dataSource;
}
