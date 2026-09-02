import { DataSource } from "typeorm";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, ".env") });

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  await dataSource.initialize();
  
  const bacSis = await dataSource.query("SELECT * FROM bac_si");
  console.log("Bac si:", bacSis);

  const ktv = await dataSource.query("SELECT * FROM ky_thuat_vien");
  console.log("KTV:", ktv);

  const nv = await dataSource.query("SELECT * FROM nhan_vien");
  console.log("NhanVien:", nv);
  
  await dataSource.destroy();
}
run();

