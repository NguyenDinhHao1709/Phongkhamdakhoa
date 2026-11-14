-- Embedding khuôn mặt mẫu của nhân viên (ArcFace 512 chiều, model buffalo_sc ở python-ml).
-- Chấm công và đối soát trùng khuôn mặt dùng thẳng embedding này thay vì tải ảnh đại diện và chạy lại model.
-- Backend tự điền dần: lần chấm công đầu tiên của mỗi nhân viên (hoặc sau khi đổi ảnh đại diện) sẽ ghi vào đây.
-- Chưa chạy file này thì hệ thống vẫn hoạt động như cũ (so khớp bằng ảnh).
-- Nếu đổi model nhận diện ở python-ml: TRUNCATE TABLE nhan_vien_khuon_mat; để tính lại.
CREATE TABLE IF NOT EXISTS nhan_vien_khuon_mat (
  nhan_vien_id INT NOT NULL PRIMARY KEY,
  anh VARCHAR(500) NOT NULL,                 -- nhan_vien.anh_dai_dien lúc tính; khác giá trị hiện tại → coi như chưa có
  embedding JSON NOT NULL,
  cap_nhat_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
