# Huong dan import CSDL Phong Kham

## Cach 1: Dung MySQL Workbench (de nhat)
1. Mo MySQL Workbench
2. Ket noi vao localhost voi user root
3. Vao menu: File > Open SQL Script
4. Chon file: d:\KLTN\database\schema.sql
5. Bam Ctrl+Shift+Enter de chay toan bo script
6. Kiem tra output: khong co loi la thanh cong

## Cach 2: Dung Command Line
```bash
# Thay <mat_khau_root> bang mat khau MySQL cua ban
mysql -u root -p<mat_khau_root> < "d:\KLTN\database\schema.sql"

# Hoac:
mysql -u root -p
# Nhap mat khau khi duoc hoi
# Sau do chay lenh:
source d:/KLTN/database/schema.sql
```

## Kiem tra sau khi import
```sql
USE phong_kham;
SHOW TABLES;
-- Phai hien thi 22 bang
```
