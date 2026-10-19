const { DataSource } = require('typeorm');

async function migrate() {
  const ds = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '123456',
    database: 'phong_kham',
  });

  await ds.initialize();
  console.log('Connected to MySQL.');

  try {
    console.log('Altering enum trang_thai...');
    await ds.query(`ALTER TABLE chot_ca_thu_ngan MODIFY COLUMN trang_thai ENUM('da_chot', 'da_ban_giao', 'da_nhan_ca') NOT NULL DEFAULT 'da_chot'`);
    console.log('Enum altered successfully.');
  } catch (err) {
    console.error('Error modifying enum:', err.message);
  }

  try {
    console.log('Checking column thoi_gian_nhan_ca...');
    const cols = await ds.query(`SHOW COLUMNS FROM chot_ca_thu_ngan LIKE 'thoi_gian_nhan_ca'`);
    if (cols.length === 0) {
      console.log('Adding thoi_gian_nhan_ca column...');
      await ds.query(`ALTER TABLE chot_ca_thu_ngan ADD COLUMN thoi_gian_nhan_ca DATETIME NULL AFTER trang_thai`);
      console.log('Column added successfully.');
    } else {
      console.log('Column thoi_gian_nhan_ca already exists.');
    }
  } catch (err) {
    console.error('Error adding column:', err.message);
  }

  const finalCols = await ds.query(`DESCRIBE chot_ca_thu_ngan`);
  console.log('Final columns:', finalCols.map(c => `${c.Field} (${c.Type})`));

  await ds.destroy();
  console.log('Done!');
}

migrate().catch(console.error);

