-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: phong_kham
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bac_si`
--

DROP TABLE IF EXISTS `bac_si`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bac_si` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nhan_vien_id` int NOT NULL,
  `chuyen_khoa` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bang_cap` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_chung_chi_hanh_nghe` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nhanvien` (`nhan_vien_id`),
  UNIQUE KEY `uq_chung_chi` (`so_chung_chi_hanh_nghe`),
  KEY `idx_chuyen_khoa` (`chuyen_khoa`),
  CONSTRAINT `fk_bs_nhanvien` FOREIGN KEY (`nhan_vien_id`) REFERENCES `nhan_vien` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thong tin chuyen mon bac si';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bac_si`
--

LOCK TABLES `bac_si` WRITE;
/*!40000 ALTER TABLE `bac_si` DISABLE KEYS */;
INSERT INTO `bac_si` VALUES (1,2,'Nội tổng quát & Tim mạch','Thạc sĩ Bác sĩ CKII','012345/BYT-CCHN','Hơn 15 năm kinh nghiệm điều trị tim mạch và các bệnh mạn tính');
/*!40000 ALTER TABLE `bac_si` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bai_viet`
--

DROP TABLE IF EXISTS `bai_viet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bai_viet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tieu_de` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tom_tat` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noi_dung` longtext COLLATE utf8mb4_unicode_ci,
  `anh_dai_dien` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL Object Storage',
  `tac_gia_id` int DEFAULT NULL,
  `trang_thai` enum('nhap','xuat_ban','an') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nhap',
  `luot_xem` int NOT NULL DEFAULT '0',
  `xuat_ban_luc` datetime DEFAULT NULL,
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `fk_bv_tacgia` (`tac_gia_id`),
  FULLTEXT KEY `ft_noidung` (`tieu_de`,`tom_tat`,`noi_dung`),
  CONSTRAINT `fk_bv_tacgia` FOREIGN KEY (`tac_gia_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bai viet suc khoe - phuc vu chuc nang Tim kiem (UC4) va trang Gioi thieu';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bai_viet`
--

LOCK TABLES `bai_viet` WRITE;
/*!40000 ALTER TABLE `bai_viet` DISABLE KEYS */;
INSERT INTO `bai_viet` VALUES (1,'5 Thói quen đơn giản giúp phòng ngừa tăng huyết áp','5-thoi-quen-phong-ngua-tang-huyet-ap','Tăng huyết áp là kẻ giết người thầm lặng. Hãy chủ động phòng tránh với 5 thói quen lành mạnh mỗi ngày.','<p>Tăng huyết áp là một trong những bệnh lý tim mạch phổ biến nhất hiện nay. Để phòng ngừa hiệu quả, người bệnh cần kiểm soát lượng muối ăn hàng ngày, tập thể dục ít nhất 30 phút mỗi ngày, hạn chế rượu bia và duy trì cân nặng lý tưởng.</p>','https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',2,'xuat_ban',142,'2026-09-05 16:10:34','2026-09-05 16:10:34'),(2,'Dinh dưỡng chuẩn cho người bệnh đái tháo đường','dinh-duong-chuan-cho-nguoi-dai-thao-duong','Chế độ ăn uống đóng vai trò then chốt trong việc kiểm soát chỉ số đường huyết ổn định.','<p>Người bệnh tiểu đường nên ưu tiên các loại ngũ cốc nguyên hạt, rau xanh giàu chất xơ, hạn chế đồ ngọt và tinh bột hấp thu nhanh. Chia nhỏ bữa ăn trong ngày giúp đường huyết không bị tăng vọt sau ăn.</p>','https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800',2,'xuat_ban',98,'2026-09-05 16:10:34','2026-09-05 16:10:34'),(3,'Hướng dẫn chăm sóc trẻ bị sốt virus tại nhà','huong-dan-cham-soc-tre-sot-virus-tai-nha','Những lưu ý quan trọng cha mẹ cần biết khi trẻ nhỏ bị sốt virus mùa giao mùa.','<p>Khi trẻ bị sốt virus, cha mẹ cần cho trẻ uống nhiều nước oresol, lau mát bằng nước ấm và dùng thuốc hạ sốt paracetamol theo đúng liều lượng cân nặng. Đưa trẻ đến cơ sở y tế ngay nếu trẻ co giật, thở gấp hoặc li bì.</p>','https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',2,'xuat_ban',215,'2026-09-05 16:10:34','2026-09-05 16:10:34');
/*!40000 ALTER TABLE `bai_viet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `benh_an_kham`
--

DROP TABLE IF EXISTS `benh_an_kham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `benh_an_kham` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ho_so_benh_an_id` int NOT NULL,
  `luot_tiep_nhan_id` int NOT NULL,
  `bac_si_id` int NOT NULL,
  `ngay_kham` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trieu_chung` text COLLATE utf8mb4_unicode_ci,
  `chan_doan_so_bo` text COLLATE utf8mb4_unicode_ci,
  `chan_doan_xac_dinh` text COLLATE utf8mb4_unicode_ci,
  `ket_qua_kham` text COLLATE utf8mb4_unicode_ci,
  `phuong_phap_dieu_tri` text COLLATE utf8mb4_unicode_ci,
  `tai_kham` date DEFAULT NULL,
  `hinh_thuc_kham` enum('truc_tiep','truc_tuyen') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trang_thai` enum('dang_kham','da_hoan_thanh') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dang_kham',
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_bacsi_ngay` (`bac_si_id`,`ngay_kham`),
  KEY `idx_hsba` (`ho_so_benh_an_id`),
  KEY `idx_luot_tiep_nhan` (`luot_tiep_nhan_id`),
  CONSTRAINT `fk_bak_bacsi` FOREIGN KEY (`bac_si_id`) REFERENCES `bac_si` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_bak_hoso` FOREIGN KEY (`ho_so_benh_an_id`) REFERENCES `ho_so_benh_an` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_bak_luot` FOREIGN KEY (`luot_tiep_nhan_id`) REFERENCES `luot_tiep_nhan` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phieu kham benh (moi lan kham)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `benh_an_kham`
--

LOCK TABLES `benh_an_kham` WRITE;
/*!40000 ALTER TABLE `benh_an_kham` DISABLE KEYS */;
INSERT INTO `benh_an_kham` VALUES (42,1,74,1,'2026-09-02 19:54:28','Đau đầu âm ỉ vùng trán, nghẹt mũi, sốt nhẹ 38 độ C trong 3 ngày qua','Viêm xoang cấp / Theo dõi nhiễm trùng đường hô hấp trên','Viêm mũi xoang cấp tính do vi khuẩn (J01.0)','Niêm mạc mũi phù nề, xuất tiết nhầy vàng, họng đỏ nhẹ, tim phổi bình thường','Kháng sinh đường uống 7 ngày, thuốc kháng viêm, xịt rửa mũi nước muối sinh lý','2026-09-12','truc_tiep','da_hoan_thanh',NULL),(43,1,67,1,'2026-09-02 19:56:51','Tức ngực trái khi gắng sức, hồi hộp, đo huyết áp tại nhà 150/95 mmHg','Tăng huyết áp độ 2 / Theo dõi thiếu máu cơ tim','Tăng huyết áp nguyên phát (I10) - Thiếu máu cục bộ cơ tim mạn','HA: 155/92 mmHg, nhịp tim đều 88 l/p, T1 T2 rõ, không tiếng thổi bệnh lý','Dùng thuốc hạ áp hằng ngày Amlodipine 5mg, điều chỉnh chế độ ăn giảm muối','2026-10-05','truc_tiep','da_hoan_thanh',NULL),(44,3,68,1,'2026-09-02 21:01:47','Đau vùng thượng vị âm ỉ sau khi ăn, ợ chua, buồn nôn','Viêm loét dạ dày tá tràng / Trào ngược dạ dày thực quản (GERD)','Viêm dạ dày tá tràng mạn tính (K29.5) - GERD độ A','Bụng mềm, ấn đau tức nhẹ vùng thượng vị, không đề kháng thành bụng','Dùng thuốc ức chế bơm Proton (PPI) 4 tuần kết hợp kháng acid','2026-09-19','truc_tiep','dang_kham',NULL);
/*!40000 ALTER TABLE `benh_an_kham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `benh_nhan`
--

DROP TABLE IF EXISTS `benh_nhan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `benh_nhan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_benh_nhan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nguoi_dung_id` int DEFAULT NULL COMMENT 'NULL neu BN vang lai duoc tiep tan tao ho so, khong tu dang ky online',
  `ho_ten` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_sinh` date DEFAULT NULL,
  `gioi_tinh` enum('nam','nu','khac') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_cmnd` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_dien_thoai` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dia_chi` text COLLATE utf8mb4_unicode_ci,
  `nhom_mau` enum('A','B','AB','O') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `di_ung` text COLLATE utf8mb4_unicode_ci,
  `tien_su_benh` text COLLATE utf8mb4_unicode_ci,
  `nghe_nghiep` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nguoi_than_lien_he` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sdt_nguoi_than` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cap_nhat_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_benh_nhan` (`ma_benh_nhan`),
  UNIQUE KEY `uq_so_cmnd` (`so_cmnd`),
  UNIQUE KEY `uq_nguoi_dung` (`nguoi_dung_id`),
  KEY `idx_ho_ten` (`ho_ten`),
  KEY `idx_so_dien_thoai` (`so_dien_thoai`),
  CONSTRAINT `fk_bn_nguoidung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thong tin hanh chinh benh nhan (tach khoi du lieu lam sang)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `benh_nhan`
--

LOCK TABLES `benh_nhan` WRITE;
/*!40000 ALTER TABLE `benh_nhan` DISABLE KEYS */;
INSERT INTO `benh_nhan` VALUES (1,'BN000001',3,'Nguyễn Đình Hào','2026-09-25','nam',NULL,'0354162165',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-01 19:12:14','2026-09-01 19:12:14'),(2,'BN000002',9,'nguyễn văn a','2026-06-01','nam',NULL,'0999888777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-01 21:51:39','2026-09-01 21:51:39'),(3,'BN000003',NULL,'Bệnh Nhân Đặt Tại Quầy Test',NULL,NULL,NULL,'0988777666',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 10:46:01','2026-09-02 10:46:01'),(4,'BN000004',NULL,'hic',NULL,NULL,NULL,'0365985135',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 10:48:07','2026-09-02 10:48:07'),(5,'BN000005',13,'benhnhan',NULL,'nam',NULL,'0369325698',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 12:07:31','2026-09-02 12:07:31'),(6,'BN000006',14,'Bệnh Nhân Test Reg',NULL,'nam',NULL,'0987654321',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 12:09:39','2026-09-02 12:09:39'),(7,'BN000007',15,'bn2',NULL,NULL,NULL,'0999888777',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 12:23:49','2026-09-02 12:23:49'),(8,'BN000008',16,'bênhnhan3','2026-09-02','nu',NULL,'0354169985',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 12:24:42','2026-09-02 12:24:42'),(9,'BN000009',17,'bệnh nhân 4','2025-06-20','nam',NULL,'0375711222',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 12:27:55','2026-09-02 15:35:59'),(10,'BN000010',18,'Nguyễn Văn A','2026-06-26','nam',NULL,'0354162169','hackhack1709@gmail.com',NULL,NULL,'dị ứng  bia',NULL,'giang hồ ',NULL,NULL,'2026-09-02 14:30:14','2026-09-02 15:31:07');
/*!40000 ALTER TABLE `benh_nhan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ca_lam_viec`
--

DROP TABLE IF EXISTS `ca_lam_viec`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ca_lam_viec` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_ca` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gio_bat_dau` time NOT NULL,
  `gio_ket_thuc` time NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh muc ca lam viec';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ca_lam_viec`
--

LOCK TABLES `ca_lam_viec` WRITE;
/*!40000 ALTER TABLE `ca_lam_viec` DISABLE KEYS */;
INSERT INTO `ca_lam_viec` VALUES (1,'Ca Sáng','07:30:00','11:30:00'),(2,'Ca Chiều','13:00:00','17:00:00'),(3,'Ca Tối / Trực cấp cứu','17:30:00','21:30:00');
/*!40000 ALTER TABLE `ca_lam_viec` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_dinh_can_lam_sang`
--

DROP TABLE IF EXISTS `chi_dinh_can_lam_sang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chi_dinh_can_lam_sang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `benh_an_kham_id` int NOT NULL,
  `dich_vu_xet_nghiem_id` int NOT NULL,
  `bac_si_chi_dinh_id` int NOT NULL,
  `ky_thuat_vien_id` int DEFAULT NULL,
  `ghi_chu_chi_dinh` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('cho_lay_mau','dang_lay_mau','dang_xu_ly','co_ket_qua','huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_lay_mau',
  `thoi_gian_chi_dinh` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `thoi_gian_lay_mau` datetime DEFAULT NULL,
  `thoi_gian_co_ket_qua` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `idx_ktv` (`ky_thuat_vien_id`),
  KEY `idx_benh_an` (`benh_an_kham_id`),
  KEY `idx_bacsi_chidinh` (`bac_si_chi_dinh_id`),
  KEY `fk_cdcls_dichvu` (`dich_vu_xet_nghiem_id`),
  CONSTRAINT `fk_cdcls_bacsi` FOREIGN KEY (`bac_si_chi_dinh_id`) REFERENCES `bac_si` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cdcls_bak` FOREIGN KEY (`benh_an_kham_id`) REFERENCES `benh_an_kham` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cdcls_dichvu` FOREIGN KEY (`dich_vu_xet_nghiem_id`) REFERENCES `dich_vu_xet_nghiem` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cdcls_ktv` FOREIGN KEY (`ky_thuat_vien_id`) REFERENCES `ky_thuat_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi dinh xet nghiem / CDHA tu bac si';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_dinh_can_lam_sang`
--

LOCK TABLES `chi_dinh_can_lam_sang` WRITE;
/*!40000 ALTER TABLE `chi_dinh_can_lam_sang` DISABLE KEYS */;
INSERT INTO `chi_dinh_can_lam_sang` VALUES (4,42,1,1,2,'Nghi ngờ viêm phổi','co_ket_qua','2026-09-02 19:59:55','2026-09-05 14:11:26','2026-09-05 15:11:26'),(5,43,2,1,2,'','co_ket_qua','2026-09-02 20:00:26','2026-09-05 14:11:26','2026-09-05 15:11:26'),(6,44,2,1,NULL,'','cho_lay_mau','2026-09-02 21:01:50',NULL,NULL),(7,43,5,1,1,'Điện tâm đồ kiểm tra thiếu máu cơ tim','dang_xu_ly','2026-09-05 15:24:39','2026-09-05 15:49:39',NULL);
/*!40000 ALTER TABLE `chi_dinh_can_lam_sang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dich_vu_xet_nghiem`
--

DROP TABLE IF EXISTS `dich_vu_xet_nghiem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dich_vu_xet_nghiem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_dich_vu` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_dich_vu` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loai` enum('xet_nghiem','cdha','khac') COLLATE utf8mb4_unicode_ci NOT NULL,
  `gia` decimal(12,2) NOT NULL DEFAULT '0.00',
  `don_vi_ket_qua` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gia_tri_binh_thuong` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('hoat_dong','ngung') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hoat_dong',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_dich_vu` (`ma_dich_vu`),
  KEY `idx_loai` (`loai`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh muc dich vu xet nghiem va CDHA - cache tren Redis';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dich_vu_xet_nghiem`
--

LOCK TABLES `dich_vu_xet_nghiem` WRITE;
/*!40000 ALTER TABLE `dich_vu_xet_nghiem` DISABLE KEYS */;
INSERT INTO `dich_vu_xet_nghiem` VALUES (1,'XN001','Công thức máu toàn phần (CBC)','xet_nghiem',120000.00,'G/L','4.0 - 10.0',NULL,'hoat_dong'),(2,'XN002','Sinh hóa máu (Đường huyết, Men gan, Ure, Creatinine)','xet_nghiem',250000.00,'mmol/L','3.9 - 6.4',NULL,'hoat_dong'),(3,'CD001','X-Quang ngực thẳng','cdha',150000.00,'Hình ảnh','Bình thường',NULL,'hoat_dong'),(4,'CD002','Siêu âm ổ bụng tổng quát','cdha',200000.00,'Hình ảnh','Bình thường',NULL,'hoat_dong'),(5,'XN003','Điện tâm đồ (ECG)','xet_nghiem',100000.00,'Nhịp tim','60 - 100 bpm',NULL,'hoat_dong');
/*!40000 ALTER TABLE `dich_vu_xet_nghiem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `don_gui`
--

DROP TABLE IF EXISTS `don_gui`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `don_gui` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nguoi_gui_id` int NOT NULL,
  `loai_don` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_dinh_kem` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL Object Storage, toi da 5MB (kiem tra o app)',
  `ngay_gui` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('cho_xu_ly','da_xu_ly','tu_choi','da_huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_xu_ly',
  `ghi_chu_xu_ly` text COLLATE utf8mb4_unicode_ci,
  `ngay_xu_ly` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nguoi_gui` (`nguoi_gui_id`),
  KEY `idx_trang_thai` (`trang_thai`),
  CONSTRAINT `fk_dg_nguoigui` FOREIGN KEY (`nguoi_gui_id`) REFERENCES `nhan_vien` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Don gui giam doc (nghi phep, khieu nai, de xuat...)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `don_gui`
--

LOCK TABLES `don_gui` WRITE;
/*!40000 ALTER TABLE `don_gui` DISABLE KEYS */;
INSERT INTO `don_gui` VALUES (1,2,'Đơn xin nghỉ phép','Kính gửi Ban Giám Đốc, tôi xin phép nghỉ phép năm 02 ngày (Thứ Năm và Thứ Sáu tuần tới) vì việc gia đình. Công việc khám bệnh tại Phòng 101 đã bàn giao cho BS. Trần.',NULL,'2026-09-03 16:09:39','cho_xu_ly',NULL,NULL),(2,1,'Đơn đề xuất mua sắm thiết bị','Đề xuất Ban Giám Đốc phê duyệt mua bổ sung 02 máy đo SpO2 cầm tay và 500 ống nghiệm chân không nắp tím EDTA cho khu vực tiếp đón và phòng xét nghiệm.',NULL,'2026-09-04 16:09:39','cho_xu_ly',NULL,NULL),(3,3,'Đơn xin đổi ca trực','Kính gửi BGĐ, tôi xin đổi ca trực ngày Chủ nhật tuần này sang ca sáng Thứ Hai cùng tuần với KTV2 do trùng lịch học bồi dưỡng chuyên môn.',NULL,'2026-09-02 16:09:39','da_xu_ly','Ban Giám Đốc đồng ý phê duyệt đổi ca trực theo đề xuất.','2026-09-03 16:09:39'),(4,4,'Đề xuất bổ sung danh mục thuốc','Nhà thuốc xin kính gửi đề xuất dự trù thuốc quý 4, bổ sung các thuốc kiểm soát huyết áp Amlodipine và kháng sinh hô hấp chuẩn bị cho mùa lạnh.',NULL,'2026-09-01 16:09:39','da_xu_ly','Đã duyệt kế hoạch dự trù kinh phí thuốc quý 4.','2026-09-02 16:09:39');
/*!40000 ALTER TABLE `don_gui` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `don_thuoc`
--

DROP TABLE IF EXISTS `don_thuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `don_thuoc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_don_thuoc` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `benh_an_kham_id` int NOT NULL,
  `bac_si_ke_id` int NOT NULL,
  `ngay_ke` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('cho_duyet','da_duyet','da_cap_phat','huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_duyet',
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_don_thuoc` (`ma_don_thuoc`),
  KEY `idx_benh_an` (`benh_an_kham_id`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `idx_bacsi_ke` (`bac_si_ke_id`),
  CONSTRAINT `fk_dt_bacsi` FOREIGN KEY (`bac_si_ke_id`) REFERENCES `bac_si` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_dt_bak` FOREIGN KEY (`benh_an_kham_id`) REFERENCES `benh_an_kham` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Don thuoc dien tu';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `don_thuoc`
--

LOCK TABLES `don_thuoc` WRITE;
/*!40000 ALTER TABLE `don_thuoc` DISABLE KEYS */;
INSERT INTO `don_thuoc` VALUES (2,'DT202609020001',43,1,'2026-09-02 20:00:42','da_cap_phat',''),(3,'DT202609020002',44,1,'2026-09-02 21:02:08','cho_duyet',''),(4,'DT202609020003',44,1,'2026-09-02 21:02:27','cho_duyet',''),(5,'DT202609020004',44,1,'2026-09-02 21:03:41','cho_duyet',''),(6,'DT202609020005',44,1,'2026-09-02 21:03:54','cho_duyet',''),(7,'DT202609020006',44,1,'2026-09-02 21:06:15','da_cap_phat',''),(8,'DT202609020007',44,1,'2026-09-02 21:07:06','da_cap_phat',''),(9,'DT202609020008',44,1,'2026-09-02 22:08:26','da_cap_phat','');
/*!40000 ALTER TABLE `don_thuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `don_thuoc_chi_tiet`
--

DROP TABLE IF EXISTS `don_thuoc_chi_tiet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `don_thuoc_chi_tiet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `don_thuoc_id` int NOT NULL,
  `thuoc_id` int NOT NULL,
  `lo_thuoc_id` int DEFAULT NULL COMMENT 'Lo thuc te duoc cap phat theo thuat toan FEFO, gan luc cap phat (khong gan luc ke don)',
  `so_luong` int NOT NULL,
  `lieu_dung` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_ngay_dung` smallint DEFAULT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_don_thuoc` (`don_thuoc_id`),
  KEY `fk_dtct_thuoc` (`thuoc_id`),
  KEY `fk_dtct_lothuoc` (`lo_thuoc_id`),
  CONSTRAINT `fk_dtct_don` FOREIGN KEY (`don_thuoc_id`) REFERENCES `don_thuoc` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dtct_lothuoc` FOREIGN KEY (`lo_thuoc_id`) REFERENCES `lo_thuoc` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_dtct_thuoc` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiet thuoc trong don thuoc, truy vet duoc lo thuoc da xuat';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `don_thuoc_chi_tiet`
--

LOCK TABLES `don_thuoc_chi_tiet` WRITE;
/*!40000 ALTER TABLE `don_thuoc_chi_tiet` DISABLE KEYS */;
INSERT INTO `don_thuoc_chi_tiet` VALUES (1,2,1,1,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(2,3,5,NULL,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(3,4,5,NULL,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(4,5,5,NULL,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(5,6,1,NULL,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(6,6,5,NULL,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(7,7,1,1,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(8,7,3,3,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(9,8,1,1,10,'Uống 1v x 2 lần/ngày sau ăn',5,''),(10,9,4,4,1,'Uống 1v x 2 lần/ngày sau ăn',5,'');
/*!40000 ALTER TABLE `don_thuoc_chi_tiet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `du_bao_y_te`
--

DROP TABLE IF EXISTS `du_bao_y_te`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `du_bao_y_te` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loai_du_bao` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'luu_luong_benh_nhan, xu_huong_dich_benh',
  `ky_du_bao` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'vd: 2026-09, Q4-2026',
  `du_lieu_json` json NOT NULL COMMENT 'Ket qua chi tiet tu model Prophet/ARIMA chay ngam',
  `do_tin_cay` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'vd: uoc luong tho (chua du du lieu lich su)',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loai_ky` (`loai_du_bao`,`ky_du_bao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ket qua du bao AI chay ngam dinh ky, Ban giam doc chi doc (khong chay real-time)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `du_bao_y_te`
--

LOCK TABLES `du_bao_y_te` WRITE;
/*!40000 ALTER TABLE `du_bao_y_te` DISABLE KEYS */;
/*!40000 ALTER TABLE `du_bao_y_te` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ho_so_benh_an`
--

DROP TABLE IF EXISTS `ho_so_benh_an`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ho_so_benh_an` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_ho_so` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `benh_nhan_id` int NOT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('hoat_dong','luu_tru') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hoat_dong',
  `ghi_chu_tong_quat` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_ho_so` (`ma_ho_so`),
  UNIQUE KEY `uq_benh_nhan` (`benh_nhan_id`),
  CONSTRAINT `fk_hsba_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ho so benh an tong hop';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ho_so_benh_an`
--

LOCK TABLES `ho_so_benh_an` WRITE;
/*!40000 ALTER TABLE `ho_so_benh_an` DISABLE KEYS */;
INSERT INTO `ho_so_benh_an` VALUES (1,'HS000001',8,'2026-09-02 16:08:36','hoat_dong',NULL),(2,'HS000002',9,'2026-09-02 16:45:34','hoat_dong',NULL),(3,'HS000003',10,'2026-09-02 18:08:13','hoat_dong',NULL),(4,'HS000004',6,'2026-09-02 18:14:38','hoat_dong',NULL);
/*!40000 ALTER TABLE `ho_so_benh_an` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoa_don`
--

DROP TABLE IF EXISTS `hoa_don`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hoa_don` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_hoa_don` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `benh_nhan_id` int NOT NULL,
  `luot_tiep_nhan_id` int DEFAULT NULL COMMENT 'NULL neu la hoa don tam ung dat lich (chua tiep nhan)',
  `lich_hen_id` int DEFAULT NULL COMMENT 'Lien ket khi la bien lai tam ung dat lich online',
  `thu_ngan_id` int DEFAULT NULL,
  `tong_tien` decimal(14,2) NOT NULL DEFAULT '0.00',
  `so_tien_giam` decimal(14,2) NOT NULL DEFAULT '0.00',
  `thuc_thu` decimal(14,2) NOT NULL DEFAULT '0.00',
  `phuong_thuc_thanh_toan` enum('tien_mat','chuyen_khoan','the','bao_hiem','vnpay','momo') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ma_giao_dich_cong` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ma giao dich tra ve tu VNPay/MoMo',
  `trang_thai` enum('cho_thanh_toan','dang_xu_ly','da_thanh_toan','that_bai','huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_thanh_toan',
  `phien_ban` int NOT NULL DEFAULT '0' COMMENT 'Optimistic lock chong xac nhan thanh toan trung',
  `ngay_tao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ngay_thanh_toan` datetime DEFAULT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_hoa_don` (`ma_hoa_don`),
  KEY `idx_ngay_tt` (`ngay_thanh_toan`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `idx_benh_nhan` (`benh_nhan_id`),
  KEY `idx_lich_hen` (`lich_hen_id`),
  KEY `fk_hd_luot` (`luot_tiep_nhan_id`),
  KEY `fk_hd_thungan` (`thu_ngan_id`),
  CONSTRAINT `fk_hd_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_hd_lichhen` FOREIGN KEY (`lich_hen_id`) REFERENCES `lich_hen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hd_luot` FOREIGN KEY (`luot_tiep_nhan_id`) REFERENCES `luot_tiep_nhan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_hd_thungan` FOREIGN KEY (`thu_ngan_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hoa don / Thanh toan vien phi - co optimistic lock';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoa_don`
--

LOCK TABLES `hoa_don` WRITE;
/*!40000 ALTER TABLE `hoa_don` DISABLE KEYS */;
INSERT INTO `hoa_don` VALUES (3,'HD20260901-001',2,5,NULL,7,470000.00,50000.00,420000.00,'chuyen_khoan',NULL,'da_thanh_toan',1,'2026-09-04 16:09:39','2026-09-05 16:09:39','Thanh toán viện phí khám bệnh và xét nghiệm máu tổng quát'),(4,'HD20260901-002',1,6,NULL,7,650000.00,0.00,650000.00,'tien_mat',NULL,'da_thanh_toan',1,'2026-09-04 16:09:39','2026-09-05 16:09:39','Khám tim mạch chuyên sâu và điện tâm đồ'),(5,'HD20260902-001',8,67,NULL,7,350000.00,0.00,350000.00,'vnpay',NULL,'da_thanh_toan',1,'2026-09-04 16:09:39','2026-09-05 16:09:39','Khám nhi khoa và tư vấn dinh dưỡng'),(6,'HD20260903-001',10,68,NULL,7,520000.00,20000.00,500000.00,'the',NULL,'da_thanh_toan',1,'2026-09-04 16:09:39','2026-09-05 16:09:39','Tiền thuốc kê đơn và khám hô hấp'),(7,'HD20260905-001',10,69,NULL,7,320000.00,0.00,320000.00,'momo',NULL,'da_thanh_toan',1,'2026-09-04 16:09:39','2026-09-05 16:09:39','Viện phí khám tổng quát buổi sáng'),(8,'HD20260905-002',6,70,NULL,7,450000.00,0.00,450000.00,NULL,NULL,'cho_thanh_toan',1,'2026-09-04 16:09:39',NULL,'Chờ bệnh nhân thanh toán tại quầy thu ngân');
/*!40000 ALTER TABLE `hoa_don` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoa_don_chi_tiet`
--

DROP TABLE IF EXISTS `hoa_don_chi_tiet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hoa_don_chi_tiet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hoa_don_id` int NOT NULL,
  `loai_phi` enum('kham_benh','xet_nghiem','thuoc','cdha','tam_ung','khac') COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_luong` int NOT NULL DEFAULT '1',
  `don_gia` decimal(12,2) NOT NULL,
  `thanh_tien` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_hoa_don` (`hoa_don_id`),
  CONSTRAINT `fk_hdct_hoadon` FOREIGN KEY (`hoa_don_id`) REFERENCES `hoa_don` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiet khoan phi trong hoa don';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoa_don_chi_tiet`
--

LOCK TABLES `hoa_don_chi_tiet` WRITE;
/*!40000 ALTER TABLE `hoa_don_chi_tiet` DISABLE KEYS */;
INSERT INTO `hoa_don_chi_tiet` VALUES (4,3,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(5,3,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,320000.00,320000.00),(6,4,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(7,4,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,500000.00,500000.00),(8,5,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(9,5,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,200000.00,200000.00),(10,6,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(11,6,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,370000.00,370000.00),(12,7,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(13,7,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,170000.00,170000.00),(14,8,'kham_benh','Phí khám bác sĩ chuyên khoa',1,150000.00,150000.00),(15,8,'xet_nghiem','Xét nghiệm cận lâm sàng / sinh hóa',1,300000.00,300000.00);
/*!40000 ALTER TABLE `hoa_don_chi_tiet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ket_qua_xet_nghiem`
--

DROP TABLE IF EXISTS `ket_qua_xet_nghiem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ket_qua_xet_nghiem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chi_dinh_id` int NOT NULL,
  `gia_tri` text COLLATE utf8mb4_unicode_ci,
  `don_vi` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nhan_xet` text COLLATE utf8mb4_unicode_ci,
  `file_dinh_kem` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL Object Storage - anh Xquang/sieu am, KHONG luu BLOB',
  `nhap_boi_id` int DEFAULT NULL,
  `thoi_gian_nhap` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `da_gui_bac_si` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chi_dinh` (`chi_dinh_id`),
  KEY `fk_kqxn_ktv` (`nhap_boi_id`),
  CONSTRAINT `fk_kqxn_chidinh` FOREIGN KEY (`chi_dinh_id`) REFERENCES `chi_dinh_can_lam_sang` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_kqxn_ktv` FOREIGN KEY (`nhap_boi_id`) REFERENCES `ky_thuat_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ket qua xet nghiem / CDHA';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ket_qua_xet_nghiem`
--

LOCK TABLES `ket_qua_xet_nghiem` WRITE;
/*!40000 ALTER TABLE `ket_qua_xet_nghiem` DISABLE KEYS */;
INSERT INTO `ket_qua_xet_nghiem` VALUES (1,4,'Bạch cầu (WBC): 11.8 (Tăng nhẹ), Hồng cầu: 4.65 T/L, Huyết sắc tố (Hb): 138 g/L, Tiểu cầu: 245 G/L','G/L, T/L, g/L','Bạch cầu tăng nhẹ phù hợp phản ứng viêm hô hấp cấp tính. Các dòng tế bào khác bình thường.',NULL,2,'2026-09-05 15:09:39',1),(2,5,'Glucose máu đói: 5.6 mmol/L, Ure: 5.2 mmol/L, Creatinine: 78 umol/L, SGOT (AST): 24 U/L, SGPT (ALT): 28 U/L, Cholesterol TP: 5.8 mmol/L, Triglyceride: 2.1 mmol/L','mmol/L, U/L','Đường huyết và chức năng gan thận bình thường. Rối loạn lipid máu nhẹ (Cholesterol và Triglyceride hơi tăng).',NULL,2,'2026-09-05 15:09:39',1);
/*!40000 ALTER TABLE `ket_qua_xet_nghiem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ky_thuat_vien`
--

DROP TABLE IF EXISTS `ky_thuat_vien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ky_thuat_vien` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nhan_vien_id` int NOT NULL,
  `chuyen_mon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nhanvien` (`nhan_vien_id`),
  CONSTRAINT `fk_ktv_nhanvien` FOREIGN KEY (`nhan_vien_id`) REFERENCES `nhan_vien` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ky thuat vien xet nghiem';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ky_thuat_vien`
--

LOCK TABLES `ky_thuat_vien` WRITE;
/*!40000 ALTER TABLE `ky_thuat_vien` DISABLE KEYS */;
INSERT INTO `ky_thuat_vien` VALUES (1,5,'siêu âm'),(2,3,'Xét nghiệm huyết học & Sinh hóa');
/*!40000 ALTER TABLE `ky_thuat_vien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_hen`
--

DROP TABLE IF EXISTS `lich_hen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lich_hen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_lich_hen` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `benh_nhan_id` int NOT NULL,
  `bac_si_id` int DEFAULT NULL,
  `phong_kham_id` int DEFAULT NULL,
  `ngay_hen` date NOT NULL,
  `gio_hen` time NOT NULL,
  `hinh_thuc` enum('truc_tiep','truc_tuyen') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'truc_tiep',
  `ly_do_kham` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('cho_thanh_toan','cho_xac_nhan','da_xac_nhan','da_huy','hoan_thanh','vang_mat') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_xac_nhan',
  `nguon_dat` enum('benh_nhan_tu_dat','tiep_tan_dat','bac_si_dat') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dat_boi_nhan_vien_id` int DEFAULT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  `phien_ban` int NOT NULL DEFAULT '0' COMMENT 'Optimistic lock: kiem tra truoc khi UPDATE, WHERE id=? AND phien_ban=?, SET phien_ban=phien_ban+1',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cap_nhat_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_lich_hen` (`ma_lich_hen`),
  UNIQUE KEY `uq_bacsi_ngay_gio` (`bac_si_id`,`ngay_hen`,`gio_hen`),
  KEY `idx_ngay_hen_tt` (`ngay_hen`,`trang_thai`),
  KEY `idx_bacsi_ngayhen` (`bac_si_id`,`ngay_hen`),
  KEY `idx_benhnhan` (`benh_nhan_id`),
  KEY `fk_lh_phongkham` (`phong_kham_id`),
  KEY `fk_lh_datboi` (`dat_boi_nhan_vien_id`),
  CONSTRAINT `fk_lh_bacsi` FOREIGN KEY (`bac_si_id`) REFERENCES `bac_si` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_lh_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lh_datboi` FOREIGN KEY (`dat_boi_nhan_vien_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_lh_phongkham` FOREIGN KEY (`phong_kham_id`) REFERENCES `phong_kham` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lich hen kham benh - co optimistic lock + unique slot bac si';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_hen`
--

LOCK TABLES `lich_hen` WRITE;
/*!40000 ALTER TABLE `lich_hen` DISABLE KEYS */;
INSERT INTO `lich_hen` VALUES (1,'LH20260001',1,NULL,NULL,'2026-09-10','09:00:00','truc_tiep','khó thở ','da_xac_nhan','benh_nhan_tu_dat',NULL,NULL,1,'2026-09-02 09:29:14','2026-09-02 10:41:41'),(2,'LH20260002',1,NULL,NULL,'2026-09-02','08:00:00','truc_tiep','d','cho_xac_nhan','benh_nhan_tu_dat',NULL,NULL,0,'2026-09-02 09:29:47','2026-09-02 09:29:47'),(3,'LH20260003',1,NULL,NULL,'2026-09-02','15:00:00','truc_tiep','dsf','cho_xac_nhan','benh_nhan_tu_dat',NULL,NULL,0,'2026-09-02 09:55:26','2026-09-02 09:55:26'),(4,'LH20260004',1,NULL,NULL,'2026-09-02','14:30:00','truc_tiep','[Chuyên khoa: Tim mạch] hic','da_huy','benh_nhan_tu_dat',NULL,' [Hủy bởi Bệnh nhân trước giờ khám > 2 tiếng - Đã gọi API hoàn tiền 100% khoản tạm ứng 40.000đ qua VNPay/MoMo]',0,'2026-09-02 10:04:49','2026-09-02 10:14:02'),(5,'LH20260005',1,1,NULL,'2026-09-02','14:30:00','truc_tiep','[Chuyên khoa: Nội tổng quát] dfgs','da_huy','benh_nhan_tu_dat',NULL,' [Hủy bởi Bệnh nhân trước giờ khám > 2 tiếng - Đã gọi API hoàn tiền 100% khoản tạm ứng 40.000đ qua VNPay/MoMo]',0,'2026-09-02 10:14:48','2026-09-02 10:15:06'),(6,'LH20260006',1,1,NULL,'2026-09-02','15:30:00','truc_tiep','[Đặt tại quầy tiếp tân - BN: df - SDT: 036953162] dfg','da_huy','tiep_tan_dat',4,NULL,1,'2026-09-02 10:26:49','2026-09-02 14:58:33'),(7,'LH20260007',1,NULL,NULL,'2026-09-02','15:30:00','truc_tiep','[Đặt tại quầy tiếp tân - BN: hào - SDT: 0123456988] ho','cho_thanh_toan','tiep_tan_dat',4,NULL,0,'2026-09-02 10:42:07','2026-09-02 10:42:07'),(8,'LH20260008',1,NULL,NULL,'2026-09-09','15:30:00','truc_tiep','[Đặt tại quầy tiếp tân - BN: hào - SDT: 0123456988] ho','cho_thanh_toan','tiep_tan_dat',4,NULL,0,'2026-09-02 10:42:41','2026-09-02 10:42:41'),(9,'LH20260009',3,NULL,NULL,'2026-09-02','16:00:00','truc_tiep','Đau đầu chóng mặt','da_xac_nhan','tiep_tan_dat',4,NULL,0,'2026-09-02 10:46:01','2026-09-02 10:46:01'),(10,'LH20260010',4,NULL,NULL,'2026-09-30','08:00:00','truc_tiep','đau đầu','da_xac_nhan','tiep_tan_dat',4,NULL,0,'2026-09-02 10:48:07','2026-09-02 10:48:07'),(11,'LH20260011',1,1,NULL,'2026-09-03','08:00:00','truc_tiep','[Chuyên khoa: Nội tổng quát] bị ốm thèm bia ','cho_thanh_toan','benh_nhan_tu_dat',NULL,NULL,0,'2026-09-02 18:07:32','2026-09-02 18:07:32');
/*!40000 ALTER TABLE `lich_hen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_lam_viec`
--

DROP TABLE IF EXISTS `lich_lam_viec`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lich_lam_viec` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nhan_vien_id` int NOT NULL,
  `ca_lam_viec_id` int NOT NULL,
  `ngay_lam` date NOT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nv_ca_ngay` (`nhan_vien_id`,`ca_lam_viec_id`,`ngay_lam`),
  KEY `idx_ngay_lam` (`ngay_lam`),
  KEY `fk_llv_calamviec` (`ca_lam_viec_id`),
  CONSTRAINT `fk_llv_calamviec` FOREIGN KEY (`ca_lam_viec_id`) REFERENCES `ca_lam_viec` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_llv_nhanvien` FOREIGN KEY (`nhan_vien_id`) REFERENCES `nhan_vien` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phan cong lich lam viec';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_lam_viec`
--

LOCK TABLES `lich_lam_viec` WRITE;
/*!40000 ALTER TABLE `lich_lam_viec` DISABLE KEYS */;
INSERT INTO `lich_lam_viec` VALUES (4,1,1,'2026-09-05','Trực tiếp đón sảnh A'),(5,1,1,'2026-09-06','Trực quầy số 1'),(6,1,2,'2026-09-07','Trực ca chiều sảnh A'),(7,1,1,'2026-09-08','Trực quầy số 1'),(8,1,1,'2026-09-09','Trực tiếp đón cuối tuần'),(9,2,1,'2026-09-05','Khám bệnh Phòng 101 (Sáng)'),(10,2,2,'2026-09-05','Khám bệnh Phòng 101 (Chiều)'),(11,2,1,'2026-09-06','Khám bệnh Phòng 101'),(12,2,2,'2026-09-06','Khám bệnh Phòng 101'),(13,2,1,'2026-09-07','Khám bệnh Phòng 101'),(14,2,1,'2026-09-08','Khám chuyên khoa Tim mạch'),(15,3,1,'2026-09-05','Trực phòng lấy mẫu & XN máu'),(16,3,1,'2026-09-06','Trực phòng phân tích sinh hóa'),(17,3,2,'2026-09-07','Trực ca chiều XN'),(18,5,2,'2026-09-05','Trực phòng X-Quang & Siêu âm'),(19,5,1,'2026-09-06','Trực phòng Chẩn đoán hình ảnh'),(20,4,1,'2026-09-05','Cấp phát thuốc theo đơn'),(21,4,2,'2026-09-05','Kiểm kê kho lẻ ca chiều'),(22,4,1,'2026-09-06','Cấp phát thuốc sảnh 1'),(23,4,1,'2026-09-07','Nhập thuốc đợt mới'),(24,7,1,'2026-09-05','Trực quầy thu viện phí 01'),(25,7,2,'2026-09-05','Bàn giao ca thu ngân chiều'),(26,7,1,'2026-09-06','Thu ngân quầy 01'),(27,7,1,'2026-09-07','Thu ngân quầy 01');
/*!40000 ALTER TABLE `lich_lam_viec` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lo_thuoc`
--

DROP TABLE IF EXISTS `lo_thuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lo_thuoc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thuoc_id` int NOT NULL,
  `ma_lo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_san_xuat` date DEFAULT NULL,
  `ngay_het_han` date NOT NULL,
  `so_luong_nhap` int NOT NULL,
  `so_luong_ton` int NOT NULL DEFAULT '0',
  `gia_nhap` decimal(12,2) DEFAULT NULL,
  `nha_cung_cap` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trang_thai` enum('con_hang','het_hang','het_han','thu_hoi') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'con_hang',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_thuoc_lo` (`thuoc_id`,`ma_lo`),
  KEY `idx_fefo` (`thuoc_id`,`so_luong_ton`,`ngay_het_han`),
  KEY `idx_het_han` (`ngay_het_han`),
  CONSTRAINT `fk_lothuoc_thuoc` FOREIGN KEY (`thuoc_id`) REFERENCES `thuoc` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lo thuoc - moi lo co han dung rieng, xuat kho theo FEFO (First-Expired-First-Out)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lo_thuoc`
--

LOCK TABLES `lo_thuoc` WRITE;
/*!40000 ALTER TABLE `lo_thuoc` DISABLE KEYS */;
INSERT INTO `lo_thuoc` VALUES (1,1,'LO2026A','2025-01-01','2026-09-03',500,7,1200.00,'---','con_hang','2026-09-02 08:53:49'),(2,2,'LO2026B','2025-02-01','2026-10-15',300,300,3500.00,'---','con_hang','2026-09-02 08:53:49'),(3,3,'LO2026C','2025-03-01','2027-01-01',200,190,2000.00,'---','con_hang','2026-09-02 08:53:49'),(4,4,'LO2026D','2025-04-01','2026-11-20',50,49,30000.00,'---','con_hang','2026-09-02 08:53:49');
/*!40000 ALTER TABLE `lo_thuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loai_thuoc`
--

DROP TABLE IF EXISTS `loai_thuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loai_thuoc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_loai` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phan loai thuoc';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loai_thuoc`
--

LOCK TABLES `loai_thuoc` WRITE;
/*!40000 ALTER TABLE `loai_thuoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `loai_thuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `luot_tiep_nhan`
--

DROP TABLE IF EXISTS `luot_tiep_nhan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `luot_tiep_nhan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_so_thu_tu` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `benh_nhan_id` int NOT NULL,
  `lich_hen_id` int DEFAULT NULL,
  `tiep_tan_id` int DEFAULT NULL,
  `phong_kham_id` int DEFAULT NULL,
  `bac_si_id` int DEFAULT NULL,
  `thoi_gian_den` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trang_thai` enum('cho_kham','dang_kham','hoan_thanh','da_huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_kham',
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_so_thu_tu` (`ma_so_thu_tu`),
  KEY `idx_phong_trang_thai` (`phong_kham_id`,`trang_thai`),
  KEY `idx_thoi_gian_den` (`thoi_gian_den`),
  KEY `idx_benhnhan` (`benh_nhan_id`),
  KEY `fk_ltn_lichhen` (`lich_hen_id`),
  KEY `fk_ltn_tieptan` (`tiep_tan_id`),
  KEY `fk_ltn_bacsi` (`bac_si_id`),
  CONSTRAINT `fk_ltn_bacsi` FOREIGN KEY (`bac_si_id`) REFERENCES `bac_si` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ltn_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ltn_lichhen` FOREIGN KEY (`lich_hen_id`) REFERENCES `lich_hen` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ltn_phongkham` FOREIGN KEY (`phong_kham_id`) REFERENCES `phong_kham` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ltn_tieptan` FOREIGN KEY (`tiep_tan_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1751 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Luot tiep nhan benh nhan';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `luot_tiep_nhan`
--

LOCK TABLES `luot_tiep_nhan` WRITE;
/*!40000 ALTER TABLE `luot_tiep_nhan` DISABLE KEYS */;
INSERT INTO `luot_tiep_nhan` VALUES (5,'A001',2,NULL,4,NULL,NULL,'2026-09-01 21:56:42','cho_kham',NULL),(6,'A002',1,NULL,4,NULL,NULL,'2026-09-01 21:57:53','cho_kham',NULL),(67,'A003',8,NULL,4,NULL,NULL,'2026-09-02 14:52:33','cho_kham',NULL),(68,'A004',10,NULL,4,NULL,NULL,'2026-09-02 14:53:05','dang_kham',NULL),(69,'A005',10,NULL,4,NULL,NULL,'2026-09-02 14:53:44','cho_kham',NULL),(70,'A006',6,NULL,4,NULL,NULL,'2026-09-02 14:54:02','cho_kham',NULL),(71,'A007',7,NULL,4,NULL,NULL,'2026-09-02 14:54:46','cho_kham',NULL),(72,'A008',10,NULL,4,NULL,NULL,'2026-09-02 14:55:01','cho_kham',NULL),(73,'A009',9,NULL,4,NULL,NULL,'2026-09-02 15:16:38','cho_kham',NULL),(74,'A010',10,NULL,4,NULL,NULL,'2026-09-02 18:17:40','cho_kham',NULL),(185,'TN20260806-001',5,NULL,NULL,NULL,NULL,'2026-08-06 09:30:00','hoan_thanh',NULL),(186,'TN20260806-002',9,NULL,NULL,NULL,NULL,'2026-08-06 13:24:00','hoan_thanh',NULL),(187,'TN20260806-003',6,NULL,NULL,NULL,NULL,'2026-08-06 11:23:00','hoan_thanh',NULL),(188,'TN20260806-004',5,NULL,NULL,NULL,NULL,'2026-08-06 16:22:00','hoan_thanh',NULL),(189,'TN20260806-005',4,NULL,NULL,NULL,NULL,'2026-08-06 10:45:00','hoan_thanh',NULL),(190,'TN20260806-006',5,NULL,NULL,NULL,NULL,'2026-08-06 13:01:00','hoan_thanh',NULL),(191,'TN20260806-007',8,NULL,NULL,NULL,NULL,'2026-08-06 07:13:00','hoan_thanh',NULL),(192,'TN20260806-008',1,NULL,NULL,NULL,NULL,'2026-08-06 13:50:00','hoan_thanh',NULL),(193,'TN20260806-009',5,NULL,NULL,NULL,NULL,'2026-08-06 08:17:00','hoan_thanh',NULL),(194,'TN20260806-010',7,NULL,NULL,NULL,NULL,'2026-08-06 11:21:00','hoan_thanh',NULL),(195,'TN20260806-011',7,NULL,NULL,NULL,NULL,'2026-08-06 08:10:00','hoan_thanh',NULL),(196,'TN20260806-012',2,NULL,NULL,NULL,NULL,'2026-08-06 12:15:00','hoan_thanh',NULL),(197,'TN20260806-013',4,NULL,NULL,NULL,NULL,'2026-08-06 10:18:00','hoan_thanh',NULL),(198,'TN20260806-014',7,NULL,NULL,NULL,NULL,'2026-08-06 15:50:00','hoan_thanh',NULL),(199,'TN20260806-015',3,NULL,NULL,NULL,NULL,'2026-08-06 07:00:00','hoan_thanh',NULL),(200,'TN20260806-016',7,NULL,NULL,NULL,NULL,'2026-08-06 09:44:00','hoan_thanh',NULL),(201,'TN20260806-017',4,NULL,NULL,NULL,NULL,'2026-08-06 11:52:00','hoan_thanh',NULL),(202,'TN20260806-018',6,NULL,NULL,NULL,NULL,'2026-08-06 16:12:00','hoan_thanh',NULL),(203,'TN20260806-019',5,NULL,NULL,NULL,NULL,'2026-08-06 14:55:00','hoan_thanh',NULL),(204,'TN20260806-020',7,NULL,NULL,NULL,NULL,'2026-08-06 08:14:00','hoan_thanh',NULL),(205,'TN20260806-021',6,NULL,NULL,NULL,NULL,'2026-08-06 08:14:00','hoan_thanh',NULL),(206,'TN20260806-022',8,NULL,NULL,NULL,NULL,'2026-08-06 14:16:00','hoan_thanh',NULL),(207,'TN20260806-023',8,NULL,NULL,NULL,NULL,'2026-08-06 08:31:00','hoan_thanh',NULL),(208,'TN20260806-024',9,NULL,NULL,NULL,NULL,'2026-08-06 14:06:00','hoan_thanh',NULL),(209,'TN20260806-025',6,NULL,NULL,NULL,NULL,'2026-08-06 09:11:00','hoan_thanh',NULL),(210,'TN20260806-026',3,NULL,NULL,NULL,NULL,'2026-08-06 10:41:00','hoan_thanh',NULL),(211,'TN20260806-027',10,NULL,NULL,NULL,NULL,'2026-08-06 15:45:00','hoan_thanh',NULL),(212,'TN20260806-028',4,NULL,NULL,NULL,NULL,'2026-08-06 10:07:00','hoan_thanh',NULL),(213,'TN20260806-029',10,NULL,NULL,NULL,NULL,'2026-08-06 11:37:00','hoan_thanh',NULL),(214,'TN20260806-030',3,NULL,NULL,NULL,NULL,'2026-08-06 09:58:00','hoan_thanh',NULL),(215,'TN20260806-031',10,NULL,NULL,NULL,NULL,'2026-08-06 09:19:00','hoan_thanh',NULL),(216,'TN20260806-032',5,NULL,NULL,NULL,NULL,'2026-08-06 13:58:00','hoan_thanh',NULL),(217,'TN20260806-033',5,NULL,NULL,NULL,NULL,'2026-08-06 15:13:00','hoan_thanh',NULL),(218,'TN20260806-034',3,NULL,NULL,NULL,NULL,'2026-08-06 09:24:00','hoan_thanh',NULL),(219,'TN20260806-035',8,NULL,NULL,NULL,NULL,'2026-08-06 15:33:00','hoan_thanh',NULL),(220,'TN20260806-036',2,NULL,NULL,NULL,NULL,'2026-08-06 07:14:00','hoan_thanh',NULL),(221,'TN20260806-037',9,NULL,NULL,NULL,NULL,'2026-08-06 15:36:00','hoan_thanh',NULL),(222,'TN20260806-038',10,NULL,NULL,NULL,NULL,'2026-08-06 15:43:00','hoan_thanh',NULL),(223,'TN20260806-039',2,NULL,NULL,NULL,NULL,'2026-08-06 15:50:00','hoan_thanh',NULL),(224,'TN20260806-040',2,NULL,NULL,NULL,NULL,'2026-08-06 10:29:00','hoan_thanh',NULL),(225,'TN20260806-041',2,NULL,NULL,NULL,NULL,'2026-08-06 15:04:00','hoan_thanh',NULL),(226,'TN20260806-042',7,NULL,NULL,NULL,NULL,'2026-08-06 12:13:00','hoan_thanh',NULL),(227,'TN20260806-043',2,NULL,NULL,NULL,NULL,'2026-08-06 08:51:00','hoan_thanh',NULL),(228,'TN20260806-044',8,NULL,NULL,NULL,NULL,'2026-08-06 11:27:00','hoan_thanh',NULL),(229,'TN20260806-045',8,NULL,NULL,NULL,NULL,'2026-08-06 07:23:00','hoan_thanh',NULL),(230,'TN20260806-046',3,NULL,NULL,NULL,NULL,'2026-08-06 09:03:00','hoan_thanh',NULL),(231,'TN20260806-047',8,NULL,NULL,NULL,NULL,'2026-08-06 16:21:00','hoan_thanh',NULL),(232,'TN20260806-048',1,NULL,NULL,NULL,NULL,'2026-08-06 14:23:00','hoan_thanh',NULL),(233,'TN20260806-049',2,NULL,NULL,NULL,NULL,'2026-08-06 15:23:00','hoan_thanh',NULL),(234,'TN20260806-050',4,NULL,NULL,NULL,NULL,'2026-08-06 12:24:00','hoan_thanh',NULL),(235,'TN20260806-051',10,NULL,NULL,NULL,NULL,'2026-08-06 12:29:00','hoan_thanh',NULL),(236,'TN20260806-052',9,NULL,NULL,NULL,NULL,'2026-08-06 16:25:00','hoan_thanh',NULL),(237,'TN20260807-001',3,NULL,NULL,NULL,NULL,'2026-08-07 12:37:00','hoan_thanh',NULL),(238,'TN20260807-002',1,NULL,NULL,NULL,NULL,'2026-08-07 14:51:00','hoan_thanh',NULL),(239,'TN20260807-003',4,NULL,NULL,NULL,NULL,'2026-08-07 16:49:00','hoan_thanh',NULL),(240,'TN20260807-004',4,NULL,NULL,NULL,NULL,'2026-08-07 10:04:00','hoan_thanh',NULL),(241,'TN20260807-005',3,NULL,NULL,NULL,NULL,'2026-08-07 13:55:00','hoan_thanh',NULL),(242,'TN20260807-006',6,NULL,NULL,NULL,NULL,'2026-08-07 16:26:00','hoan_thanh',NULL),(243,'TN20260807-007',1,NULL,NULL,NULL,NULL,'2026-08-07 08:08:00','hoan_thanh',NULL),(244,'TN20260807-008',10,NULL,NULL,NULL,NULL,'2026-08-07 07:28:00','hoan_thanh',NULL),(245,'TN20260807-009',9,NULL,NULL,NULL,NULL,'2026-08-07 11:50:00','hoan_thanh',NULL),(246,'TN20260807-010',9,NULL,NULL,NULL,NULL,'2026-08-07 15:44:00','hoan_thanh',NULL),(247,'TN20260807-011',4,NULL,NULL,NULL,NULL,'2026-08-07 16:29:00','hoan_thanh',NULL),(248,'TN20260807-012',7,NULL,NULL,NULL,NULL,'2026-08-07 11:57:00','hoan_thanh',NULL),(249,'TN20260807-013',6,NULL,NULL,NULL,NULL,'2026-08-07 13:50:00','hoan_thanh',NULL),(250,'TN20260807-014',9,NULL,NULL,NULL,NULL,'2026-08-07 09:23:00','hoan_thanh',NULL),(251,'TN20260807-015',1,NULL,NULL,NULL,NULL,'2026-08-07 14:03:00','hoan_thanh',NULL),(252,'TN20260807-016',5,NULL,NULL,NULL,NULL,'2026-08-07 14:23:00','hoan_thanh',NULL),(253,'TN20260807-017',2,NULL,NULL,NULL,NULL,'2026-08-07 13:01:00','hoan_thanh',NULL),(254,'TN20260807-018',10,NULL,NULL,NULL,NULL,'2026-08-07 10:03:00','hoan_thanh',NULL),(255,'TN20260807-019',3,NULL,NULL,NULL,NULL,'2026-08-07 15:18:00','hoan_thanh',NULL),(256,'TN20260807-020',7,NULL,NULL,NULL,NULL,'2026-08-07 07:48:00','hoan_thanh',NULL),(257,'TN20260807-021',10,NULL,NULL,NULL,NULL,'2026-08-07 15:23:00','hoan_thanh',NULL),(258,'TN20260807-022',5,NULL,NULL,NULL,NULL,'2026-08-07 11:58:00','hoan_thanh',NULL),(259,'TN20260807-023',1,NULL,NULL,NULL,NULL,'2026-08-07 10:41:00','hoan_thanh',NULL),(260,'TN20260807-024',6,NULL,NULL,NULL,NULL,'2026-08-07 13:24:00','hoan_thanh',NULL),(261,'TN20260807-025',2,NULL,NULL,NULL,NULL,'2026-08-07 11:39:00','hoan_thanh',NULL),(262,'TN20260807-026',3,NULL,NULL,NULL,NULL,'2026-08-07 09:21:00','hoan_thanh',NULL),(263,'TN20260807-027',8,NULL,NULL,NULL,NULL,'2026-08-07 09:25:00','hoan_thanh',NULL),(264,'TN20260807-028',5,NULL,NULL,NULL,NULL,'2026-08-07 10:08:00','hoan_thanh',NULL),(265,'TN20260807-029',7,NULL,NULL,NULL,NULL,'2026-08-07 14:28:00','hoan_thanh',NULL),(266,'TN20260807-030',5,NULL,NULL,NULL,NULL,'2026-08-07 08:30:00','hoan_thanh',NULL),(267,'TN20260807-031',5,NULL,NULL,NULL,NULL,'2026-08-07 14:15:00','hoan_thanh',NULL),(268,'TN20260807-032',6,NULL,NULL,NULL,NULL,'2026-08-07 09:01:00','hoan_thanh',NULL),(269,'TN20260807-033',3,NULL,NULL,NULL,NULL,'2026-08-07 12:13:00','hoan_thanh',NULL),(270,'TN20260807-034',8,NULL,NULL,NULL,NULL,'2026-08-07 13:40:00','hoan_thanh',NULL),(271,'TN20260807-035',10,NULL,NULL,NULL,NULL,'2026-08-07 07:27:00','hoan_thanh',NULL),(272,'TN20260807-036',6,NULL,NULL,NULL,NULL,'2026-08-07 15:26:00','hoan_thanh',NULL),(273,'TN20260807-037',4,NULL,NULL,NULL,NULL,'2026-08-07 08:45:00','hoan_thanh',NULL),(274,'TN20260807-038',4,NULL,NULL,NULL,NULL,'2026-08-07 12:04:00','hoan_thanh',NULL),(275,'TN20260807-039',8,NULL,NULL,NULL,NULL,'2026-08-07 09:36:00','hoan_thanh',NULL),(276,'TN20260807-040',8,NULL,NULL,NULL,NULL,'2026-08-07 13:01:00','hoan_thanh',NULL),(277,'TN20260807-041',8,NULL,NULL,NULL,NULL,'2026-08-07 14:05:00','hoan_thanh',NULL),(278,'TN20260807-042',6,NULL,NULL,NULL,NULL,'2026-08-07 08:09:00','hoan_thanh',NULL),(279,'TN20260807-043',7,NULL,NULL,NULL,NULL,'2026-08-07 16:05:00','hoan_thanh',NULL),(280,'TN20260807-044',5,NULL,NULL,NULL,NULL,'2026-08-07 10:57:00','hoan_thanh',NULL),(281,'TN20260807-045',10,NULL,NULL,NULL,NULL,'2026-08-07 12:52:00','hoan_thanh',NULL),(282,'TN20260807-046',3,NULL,NULL,NULL,NULL,'2026-08-07 07:56:00','hoan_thanh',NULL),(283,'TN20260807-047',7,NULL,NULL,NULL,NULL,'2026-08-07 12:24:00','hoan_thanh',NULL),(284,'TN20260808-001',4,NULL,NULL,NULL,NULL,'2026-08-08 09:43:00','hoan_thanh',NULL),(285,'TN20260808-002',3,NULL,NULL,NULL,NULL,'2026-08-08 10:57:00','hoan_thanh',NULL),(286,'TN20260808-003',1,NULL,NULL,NULL,NULL,'2026-08-08 10:16:00','hoan_thanh',NULL),(287,'TN20260808-004',5,NULL,NULL,NULL,NULL,'2026-08-08 07:17:00','hoan_thanh',NULL),(288,'TN20260808-005',8,NULL,NULL,NULL,NULL,'2026-08-08 13:32:00','hoan_thanh',NULL),(289,'TN20260808-006',10,NULL,NULL,NULL,NULL,'2026-08-08 14:41:00','hoan_thanh',NULL),(290,'TN20260808-007',10,NULL,NULL,NULL,NULL,'2026-08-08 13:20:00','hoan_thanh',NULL),(291,'TN20260808-008',2,NULL,NULL,NULL,NULL,'2026-08-08 10:07:00','hoan_thanh',NULL),(292,'TN20260808-009',1,NULL,NULL,NULL,NULL,'2026-08-08 10:48:00','hoan_thanh',NULL),(293,'TN20260808-010',5,NULL,NULL,NULL,NULL,'2026-08-08 12:40:00','hoan_thanh',NULL),(294,'TN20260808-011',1,NULL,NULL,NULL,NULL,'2026-08-08 16:14:00','hoan_thanh',NULL),(295,'TN20260808-012',3,NULL,NULL,NULL,NULL,'2026-08-08 09:45:00','hoan_thanh',NULL),(296,'TN20260808-013',4,NULL,NULL,NULL,NULL,'2026-08-08 09:15:00','hoan_thanh',NULL),(297,'TN20260808-014',6,NULL,NULL,NULL,NULL,'2026-08-08 10:06:00','hoan_thanh',NULL),(298,'TN20260808-015',7,NULL,NULL,NULL,NULL,'2026-08-08 13:38:00','hoan_thanh',NULL),(299,'TN20260808-016',1,NULL,NULL,NULL,NULL,'2026-08-08 16:20:00','hoan_thanh',NULL),(300,'TN20260808-017',10,NULL,NULL,NULL,NULL,'2026-08-08 07:05:00','hoan_thanh',NULL),(301,'TN20260808-018',8,NULL,NULL,NULL,NULL,'2026-08-08 16:04:00','hoan_thanh',NULL),(302,'TN20260808-019',10,NULL,NULL,NULL,NULL,'2026-08-08 10:13:00','hoan_thanh',NULL),(303,'TN20260808-020',10,NULL,NULL,NULL,NULL,'2026-08-08 13:58:00','hoan_thanh',NULL),(304,'TN20260808-021',5,NULL,NULL,NULL,NULL,'2026-08-08 08:51:00','hoan_thanh',NULL),(305,'TN20260808-022',2,NULL,NULL,NULL,NULL,'2026-08-08 11:32:00','hoan_thanh',NULL),(306,'TN20260808-023',1,NULL,NULL,NULL,NULL,'2026-08-08 12:47:00','hoan_thanh',NULL),(307,'TN20260808-024',5,NULL,NULL,NULL,NULL,'2026-08-08 12:14:00','hoan_thanh',NULL),(308,'TN20260808-025',7,NULL,NULL,NULL,NULL,'2026-08-08 13:09:00','hoan_thanh',NULL),(309,'TN20260808-026',8,NULL,NULL,NULL,NULL,'2026-08-08 11:38:00','hoan_thanh',NULL),(310,'TN20260808-027',2,NULL,NULL,NULL,NULL,'2026-08-08 13:11:00','hoan_thanh',NULL),(311,'TN20260808-028',8,NULL,NULL,NULL,NULL,'2026-08-08 16:29:00','hoan_thanh',NULL),(312,'TN20260808-029',3,NULL,NULL,NULL,NULL,'2026-08-08 10:02:00','hoan_thanh',NULL),(313,'TN20260808-030',2,NULL,NULL,NULL,NULL,'2026-08-08 11:11:00','hoan_thanh',NULL),(314,'TN20260808-031',5,NULL,NULL,NULL,NULL,'2026-08-08 12:07:00','hoan_thanh',NULL),(315,'TN20260808-032',5,NULL,NULL,NULL,NULL,'2026-08-08 10:42:00','hoan_thanh',NULL),(316,'TN20260808-033',10,NULL,NULL,NULL,NULL,'2026-08-08 07:17:00','hoan_thanh',NULL),(317,'TN20260808-034',7,NULL,NULL,NULL,NULL,'2026-08-08 11:33:00','hoan_thanh',NULL),(318,'TN20260808-035',10,NULL,NULL,NULL,NULL,'2026-08-08 11:23:00','hoan_thanh',NULL),(319,'TN20260808-036',2,NULL,NULL,NULL,NULL,'2026-08-08 08:49:00','hoan_thanh',NULL),(320,'TN20260808-037',7,NULL,NULL,NULL,NULL,'2026-08-08 07:31:00','hoan_thanh',NULL),(321,'TN20260808-038',8,NULL,NULL,NULL,NULL,'2026-08-08 13:45:00','hoan_thanh',NULL),(322,'TN20260808-039',10,NULL,NULL,NULL,NULL,'2026-08-08 10:29:00','hoan_thanh',NULL),(323,'TN20260808-040',1,NULL,NULL,NULL,NULL,'2026-08-08 11:28:00','hoan_thanh',NULL),(324,'TN20260808-041',3,NULL,NULL,NULL,NULL,'2026-08-08 14:58:00','hoan_thanh',NULL),(325,'TN20260808-042',6,NULL,NULL,NULL,NULL,'2026-08-08 09:23:00','hoan_thanh',NULL),(326,'TN20260808-043',4,NULL,NULL,NULL,NULL,'2026-08-08 07:48:00','hoan_thanh',NULL),(327,'TN20260808-044',2,NULL,NULL,NULL,NULL,'2026-08-08 07:12:00','hoan_thanh',NULL),(328,'TN20260808-045',9,NULL,NULL,NULL,NULL,'2026-08-08 16:12:00','hoan_thanh',NULL),(329,'TN20260808-046',7,NULL,NULL,NULL,NULL,'2026-08-08 13:25:00','hoan_thanh',NULL),(330,'TN20260808-047',4,NULL,NULL,NULL,NULL,'2026-08-08 13:46:00','hoan_thanh',NULL),(331,'TN20260808-048',1,NULL,NULL,NULL,NULL,'2026-08-08 12:11:00','hoan_thanh',NULL),(332,'TN20260808-049',9,NULL,NULL,NULL,NULL,'2026-08-08 07:24:00','hoan_thanh',NULL),(333,'TN20260808-050',1,NULL,NULL,NULL,NULL,'2026-08-08 11:47:00','hoan_thanh',NULL),(334,'TN20260808-051',2,NULL,NULL,NULL,NULL,'2026-08-08 11:35:00','hoan_thanh',NULL),(335,'TN20260808-052',3,NULL,NULL,NULL,NULL,'2026-08-08 07:48:00','hoan_thanh',NULL),(336,'TN20260808-053',6,NULL,NULL,NULL,NULL,'2026-08-08 16:10:00','hoan_thanh',NULL),(337,'TN20260808-054',3,NULL,NULL,NULL,NULL,'2026-08-08 14:36:00','hoan_thanh',NULL),(338,'TN20260808-055',8,NULL,NULL,NULL,NULL,'2026-08-08 16:22:00','hoan_thanh',NULL),(339,'TN20260808-056',1,NULL,NULL,NULL,NULL,'2026-08-08 14:14:00','hoan_thanh',NULL),(340,'TN20260808-057',5,NULL,NULL,NULL,NULL,'2026-08-08 07:39:00','hoan_thanh',NULL),(341,'TN20260808-058',4,NULL,NULL,NULL,NULL,'2026-08-08 14:25:00','hoan_thanh',NULL),(342,'TN20260808-059',2,NULL,NULL,NULL,NULL,'2026-08-08 10:09:00','hoan_thanh',NULL),(343,'TN20260808-060',1,NULL,NULL,NULL,NULL,'2026-08-08 16:36:00','hoan_thanh',NULL),(344,'TN20260808-061',4,NULL,NULL,NULL,NULL,'2026-08-08 16:23:00','hoan_thanh',NULL),(345,'TN20260808-062',1,NULL,NULL,NULL,NULL,'2026-08-08 09:31:00','hoan_thanh',NULL),(346,'TN20260808-063',5,NULL,NULL,NULL,NULL,'2026-08-08 14:33:00','hoan_thanh',NULL),(347,'TN20260808-064',6,NULL,NULL,NULL,NULL,'2026-08-08 11:52:00','hoan_thanh',NULL),(348,'TN20260808-065',4,NULL,NULL,NULL,NULL,'2026-08-08 12:13:00','hoan_thanh',NULL),(349,'TN20260808-066',5,NULL,NULL,NULL,NULL,'2026-08-08 13:54:00','hoan_thanh',NULL),(350,'TN20260808-067',5,NULL,NULL,NULL,NULL,'2026-08-08 14:42:00','hoan_thanh',NULL),(351,'TN20260808-068',9,NULL,NULL,NULL,NULL,'2026-08-08 07:30:00','hoan_thanh',NULL),(352,'TN20260808-069',1,NULL,NULL,NULL,NULL,'2026-08-08 10:08:00','hoan_thanh',NULL),(353,'TN20260808-070',6,NULL,NULL,NULL,NULL,'2026-08-08 08:00:00','hoan_thanh',NULL),(354,'TN20260808-071',7,NULL,NULL,NULL,NULL,'2026-08-08 16:07:00','hoan_thanh',NULL),(355,'TN20260808-072',4,NULL,NULL,NULL,NULL,'2026-08-08 12:17:00','hoan_thanh',NULL),(356,'TN20260808-073',6,NULL,NULL,NULL,NULL,'2026-08-08 14:24:00','hoan_thanh',NULL),(357,'TN20260808-074',1,NULL,NULL,NULL,NULL,'2026-08-08 09:03:00','hoan_thanh',NULL),(358,'TN20260808-075',9,NULL,NULL,NULL,NULL,'2026-08-08 07:08:00','hoan_thanh',NULL),(359,'TN20260809-001',5,NULL,NULL,NULL,NULL,'2026-08-09 09:44:00','hoan_thanh',NULL),(360,'TN20260809-002',6,NULL,NULL,NULL,NULL,'2026-08-09 11:44:00','hoan_thanh',NULL),(361,'TN20260809-003',4,NULL,NULL,NULL,NULL,'2026-08-09 16:22:00','hoan_thanh',NULL),(362,'TN20260809-004',3,NULL,NULL,NULL,NULL,'2026-08-09 11:08:00','hoan_thanh',NULL),(363,'TN20260809-005',7,NULL,NULL,NULL,NULL,'2026-08-09 15:13:00','hoan_thanh',NULL),(364,'TN20260809-006',8,NULL,NULL,NULL,NULL,'2026-08-09 09:54:00','hoan_thanh',NULL),(365,'TN20260809-007',7,NULL,NULL,NULL,NULL,'2026-08-09 13:01:00','hoan_thanh',NULL),(366,'TN20260809-008',10,NULL,NULL,NULL,NULL,'2026-08-09 08:48:00','hoan_thanh',NULL),(367,'TN20260809-009',9,NULL,NULL,NULL,NULL,'2026-08-09 12:15:00','hoan_thanh',NULL),(368,'TN20260809-010',1,NULL,NULL,NULL,NULL,'2026-08-09 12:56:00','hoan_thanh',NULL),(369,'TN20260809-011',10,NULL,NULL,NULL,NULL,'2026-08-09 09:37:00','hoan_thanh',NULL),(370,'TN20260809-012',7,NULL,NULL,NULL,NULL,'2026-08-09 12:02:00','hoan_thanh',NULL),(371,'TN20260809-013',10,NULL,NULL,NULL,NULL,'2026-08-09 15:07:00','hoan_thanh',NULL),(372,'TN20260809-014',4,NULL,NULL,NULL,NULL,'2026-08-09 08:10:00','hoan_thanh',NULL),(373,'TN20260809-015',3,NULL,NULL,NULL,NULL,'2026-08-09 12:09:00','hoan_thanh',NULL),(374,'TN20260809-016',8,NULL,NULL,NULL,NULL,'2026-08-09 15:17:00','hoan_thanh',NULL),(375,'TN20260809-017',10,NULL,NULL,NULL,NULL,'2026-08-09 10:45:00','hoan_thanh',NULL),(376,'TN20260809-018',7,NULL,NULL,NULL,NULL,'2026-08-09 10:50:00','hoan_thanh',NULL),(377,'TN20260809-019',4,NULL,NULL,NULL,NULL,'2026-08-09 12:33:00','hoan_thanh',NULL),(378,'TN20260809-020',9,NULL,NULL,NULL,NULL,'2026-08-09 15:51:00','hoan_thanh',NULL),(379,'TN20260809-021',8,NULL,NULL,NULL,NULL,'2026-08-09 12:03:00','hoan_thanh',NULL),(380,'TN20260809-022',5,NULL,NULL,NULL,NULL,'2026-08-09 11:31:00','hoan_thanh',NULL),(381,'TN20260809-023',2,NULL,NULL,NULL,NULL,'2026-08-09 08:24:00','hoan_thanh',NULL),(382,'TN20260810-001',5,NULL,NULL,NULL,NULL,'2026-08-10 14:43:00','hoan_thanh',NULL),(383,'TN20260810-002',9,NULL,NULL,NULL,NULL,'2026-08-10 11:24:00','hoan_thanh',NULL),(384,'TN20260810-003',8,NULL,NULL,NULL,NULL,'2026-08-10 16:57:00','hoan_thanh',NULL),(385,'TN20260810-004',10,NULL,NULL,NULL,NULL,'2026-08-10 16:13:00','hoan_thanh',NULL),(386,'TN20260810-005',5,NULL,NULL,NULL,NULL,'2026-08-10 10:04:00','hoan_thanh',NULL),(387,'TN20260810-006',6,NULL,NULL,NULL,NULL,'2026-08-10 16:00:00','hoan_thanh',NULL),(388,'TN20260810-007',5,NULL,NULL,NULL,NULL,'2026-08-10 09:19:00','hoan_thanh',NULL),(389,'TN20260810-008',9,NULL,NULL,NULL,NULL,'2026-08-10 16:30:00','hoan_thanh',NULL),(390,'TN20260810-009',10,NULL,NULL,NULL,NULL,'2026-08-10 10:31:00','hoan_thanh',NULL),(391,'TN20260810-010',9,NULL,NULL,NULL,NULL,'2026-08-10 12:50:00','hoan_thanh',NULL),(392,'TN20260810-011',7,NULL,NULL,NULL,NULL,'2026-08-10 16:21:00','hoan_thanh',NULL),(393,'TN20260810-012',2,NULL,NULL,NULL,NULL,'2026-08-10 16:11:00','hoan_thanh',NULL),(394,'TN20260810-013',9,NULL,NULL,NULL,NULL,'2026-08-10 08:18:00','hoan_thanh',NULL),(395,'TN20260810-014',6,NULL,NULL,NULL,NULL,'2026-08-10 08:22:00','hoan_thanh',NULL),(396,'TN20260810-015',8,NULL,NULL,NULL,NULL,'2026-08-10 16:48:00','hoan_thanh',NULL),(397,'TN20260810-016',5,NULL,NULL,NULL,NULL,'2026-08-10 09:55:00','hoan_thanh',NULL),(398,'TN20260810-017',8,NULL,NULL,NULL,NULL,'2026-08-10 12:28:00','hoan_thanh',NULL),(399,'TN20260810-018',8,NULL,NULL,NULL,NULL,'2026-08-10 07:01:00','hoan_thanh',NULL),(400,'TN20260810-019',7,NULL,NULL,NULL,NULL,'2026-08-10 13:17:00','hoan_thanh',NULL),(401,'TN20260810-020',3,NULL,NULL,NULL,NULL,'2026-08-10 08:04:00','hoan_thanh',NULL),(402,'TN20260810-021',6,NULL,NULL,NULL,NULL,'2026-08-10 09:57:00','hoan_thanh',NULL),(403,'TN20260810-022',9,NULL,NULL,NULL,NULL,'2026-08-10 14:19:00','hoan_thanh',NULL),(404,'TN20260810-023',9,NULL,NULL,NULL,NULL,'2026-08-10 13:40:00','hoan_thanh',NULL),(405,'TN20260810-024',10,NULL,NULL,NULL,NULL,'2026-08-10 08:06:00','hoan_thanh',NULL),(406,'TN20260810-025',1,NULL,NULL,NULL,NULL,'2026-08-10 16:49:00','hoan_thanh',NULL),(407,'TN20260810-026',10,NULL,NULL,NULL,NULL,'2026-08-10 10:43:00','hoan_thanh',NULL),(408,'TN20260810-027',8,NULL,NULL,NULL,NULL,'2026-08-10 07:17:00','hoan_thanh',NULL),(409,'TN20260810-028',4,NULL,NULL,NULL,NULL,'2026-08-10 13:23:00','hoan_thanh',NULL),(410,'TN20260810-029',7,NULL,NULL,NULL,NULL,'2026-08-10 16:48:00','hoan_thanh',NULL),(411,'TN20260810-030',10,NULL,NULL,NULL,NULL,'2026-08-10 09:52:00','hoan_thanh',NULL),(412,'TN20260810-031',10,NULL,NULL,NULL,NULL,'2026-08-10 08:30:00','hoan_thanh',NULL),(413,'TN20260810-032',1,NULL,NULL,NULL,NULL,'2026-08-10 08:29:00','hoan_thanh',NULL),(414,'TN20260810-033',5,NULL,NULL,NULL,NULL,'2026-08-10 16:19:00','hoan_thanh',NULL),(415,'TN20260810-034',7,NULL,NULL,NULL,NULL,'2026-08-10 16:22:00','hoan_thanh',NULL),(416,'TN20260810-035',2,NULL,NULL,NULL,NULL,'2026-08-10 08:44:00','hoan_thanh',NULL),(417,'TN20260810-036',4,NULL,NULL,NULL,NULL,'2026-08-10 14:39:00','hoan_thanh',NULL),(418,'TN20260810-037',6,NULL,NULL,NULL,NULL,'2026-08-10 14:40:00','hoan_thanh',NULL),(419,'TN20260810-038',2,NULL,NULL,NULL,NULL,'2026-08-10 16:31:00','hoan_thanh',NULL),(420,'TN20260810-039',3,NULL,NULL,NULL,NULL,'2026-08-10 10:42:00','hoan_thanh',NULL),(421,'TN20260810-040',7,NULL,NULL,NULL,NULL,'2026-08-10 07:41:00','hoan_thanh',NULL),(422,'TN20260810-041',5,NULL,NULL,NULL,NULL,'2026-08-10 12:31:00','hoan_thanh',NULL),(423,'TN20260810-042',9,NULL,NULL,NULL,NULL,'2026-08-10 14:09:00','hoan_thanh',NULL),(424,'TN20260810-043',3,NULL,NULL,NULL,NULL,'2026-08-10 15:52:00','hoan_thanh',NULL),(425,'TN20260810-044',7,NULL,NULL,NULL,NULL,'2026-08-10 10:03:00','hoan_thanh',NULL),(426,'TN20260810-045',4,NULL,NULL,NULL,NULL,'2026-08-10 08:55:00','hoan_thanh',NULL),(427,'TN20260810-046',1,NULL,NULL,NULL,NULL,'2026-08-10 15:12:00','hoan_thanh',NULL),(428,'TN20260810-047',10,NULL,NULL,NULL,NULL,'2026-08-10 12:28:00','hoan_thanh',NULL),(429,'TN20260810-048',6,NULL,NULL,NULL,NULL,'2026-08-10 11:16:00','hoan_thanh',NULL),(430,'TN20260810-049',7,NULL,NULL,NULL,NULL,'2026-08-10 09:14:00','hoan_thanh',NULL),(431,'TN20260810-050',1,NULL,NULL,NULL,NULL,'2026-08-10 09:36:00','hoan_thanh',NULL),(432,'TN20260810-051',10,NULL,NULL,NULL,NULL,'2026-08-10 13:12:00','hoan_thanh',NULL),(433,'TN20260810-052',2,NULL,NULL,NULL,NULL,'2026-08-10 12:52:00','hoan_thanh',NULL),(434,'TN20260810-053',1,NULL,NULL,NULL,NULL,'2026-08-10 09:20:00','hoan_thanh',NULL),(435,'TN20260810-054',6,NULL,NULL,NULL,NULL,'2026-08-10 13:25:00','hoan_thanh',NULL),(436,'TN20260810-055',6,NULL,NULL,NULL,NULL,'2026-08-10 08:01:00','hoan_thanh',NULL),(437,'TN20260810-056',3,NULL,NULL,NULL,NULL,'2026-08-10 12:31:00','hoan_thanh',NULL),(438,'TN20260810-057',2,NULL,NULL,NULL,NULL,'2026-08-10 08:40:00','hoan_thanh',NULL),(439,'TN20260810-058',6,NULL,NULL,NULL,NULL,'2026-08-10 08:24:00','hoan_thanh',NULL),(440,'TN20260810-059',9,NULL,NULL,NULL,NULL,'2026-08-10 14:50:00','hoan_thanh',NULL),(441,'TN20260810-060',5,NULL,NULL,NULL,NULL,'2026-08-10 11:23:00','hoan_thanh',NULL),(442,'TN20260810-061',2,NULL,NULL,NULL,NULL,'2026-08-10 14:33:00','hoan_thanh',NULL),(443,'TN20260810-062',2,NULL,NULL,NULL,NULL,'2026-08-10 13:04:00','hoan_thanh',NULL),(444,'TN20260810-063',9,NULL,NULL,NULL,NULL,'2026-08-10 15:45:00','hoan_thanh',NULL),(445,'TN20260811-001',1,NULL,NULL,NULL,NULL,'2026-08-11 09:51:00','hoan_thanh',NULL),(446,'TN20260811-002',6,NULL,NULL,NULL,NULL,'2026-08-11 14:50:00','hoan_thanh',NULL),(447,'TN20260811-003',1,NULL,NULL,NULL,NULL,'2026-08-11 10:34:00','hoan_thanh',NULL),(448,'TN20260811-004',7,NULL,NULL,NULL,NULL,'2026-08-11 11:47:00','hoan_thanh',NULL),(449,'TN20260811-005',3,NULL,NULL,NULL,NULL,'2026-08-11 09:15:00','hoan_thanh',NULL),(450,'TN20260811-006',10,NULL,NULL,NULL,NULL,'2026-08-11 08:09:00','hoan_thanh',NULL),(451,'TN20260811-007',2,NULL,NULL,NULL,NULL,'2026-08-11 07:46:00','hoan_thanh',NULL),(452,'TN20260811-008',1,NULL,NULL,NULL,NULL,'2026-08-11 16:49:00','hoan_thanh',NULL),(453,'TN20260811-009',5,NULL,NULL,NULL,NULL,'2026-08-11 11:57:00','hoan_thanh',NULL),(454,'TN20260811-010',4,NULL,NULL,NULL,NULL,'2026-08-11 10:44:00','hoan_thanh',NULL),(455,'TN20260811-011',8,NULL,NULL,NULL,NULL,'2026-08-11 16:56:00','hoan_thanh',NULL),(456,'TN20260811-012',6,NULL,NULL,NULL,NULL,'2026-08-11 14:27:00','hoan_thanh',NULL),(457,'TN20260811-013',5,NULL,NULL,NULL,NULL,'2026-08-11 13:32:00','hoan_thanh',NULL),(458,'TN20260811-014',9,NULL,NULL,NULL,NULL,'2026-08-11 07:32:00','hoan_thanh',NULL),(459,'TN20260811-015',8,NULL,NULL,NULL,NULL,'2026-08-11 10:37:00','hoan_thanh',NULL),(460,'TN20260811-016',4,NULL,NULL,NULL,NULL,'2026-08-11 07:44:00','hoan_thanh',NULL),(461,'TN20260811-017',5,NULL,NULL,NULL,NULL,'2026-08-11 12:55:00','hoan_thanh',NULL),(462,'TN20260811-018',10,NULL,NULL,NULL,NULL,'2026-08-11 11:42:00','hoan_thanh',NULL),(463,'TN20260811-019',2,NULL,NULL,NULL,NULL,'2026-08-11 14:18:00','hoan_thanh',NULL),(464,'TN20260811-020',9,NULL,NULL,NULL,NULL,'2026-08-11 12:55:00','hoan_thanh',NULL),(465,'TN20260811-021',10,NULL,NULL,NULL,NULL,'2026-08-11 11:36:00','hoan_thanh',NULL),(466,'TN20260811-022',9,NULL,NULL,NULL,NULL,'2026-08-11 09:16:00','hoan_thanh',NULL),(467,'TN20260811-023',3,NULL,NULL,NULL,NULL,'2026-08-11 10:55:00','hoan_thanh',NULL),(468,'TN20260811-024',8,NULL,NULL,NULL,NULL,'2026-08-11 15:23:00','hoan_thanh',NULL),(469,'TN20260811-025',4,NULL,NULL,NULL,NULL,'2026-08-11 13:45:00','hoan_thanh',NULL),(470,'TN20260811-026',3,NULL,NULL,NULL,NULL,'2026-08-11 11:42:00','hoan_thanh',NULL),(471,'TN20260811-027',5,NULL,NULL,NULL,NULL,'2026-08-11 16:14:00','hoan_thanh',NULL),(472,'TN20260811-028',4,NULL,NULL,NULL,NULL,'2026-08-11 08:56:00','hoan_thanh',NULL),(473,'TN20260811-029',7,NULL,NULL,NULL,NULL,'2026-08-11 14:15:00','hoan_thanh',NULL),(474,'TN20260811-030',4,NULL,NULL,NULL,NULL,'2026-08-11 12:35:00','hoan_thanh',NULL),(475,'TN20260811-031',5,NULL,NULL,NULL,NULL,'2026-08-11 07:14:00','hoan_thanh',NULL),(476,'TN20260811-032',4,NULL,NULL,NULL,NULL,'2026-08-11 10:09:00','hoan_thanh',NULL),(477,'TN20260811-033',7,NULL,NULL,NULL,NULL,'2026-08-11 08:43:00','hoan_thanh',NULL),(478,'TN20260811-034',3,NULL,NULL,NULL,NULL,'2026-08-11 15:01:00','hoan_thanh',NULL),(479,'TN20260811-035',8,NULL,NULL,NULL,NULL,'2026-08-11 16:20:00','hoan_thanh',NULL),(480,'TN20260811-036',4,NULL,NULL,NULL,NULL,'2026-08-11 15:04:00','hoan_thanh',NULL),(481,'TN20260811-037',6,NULL,NULL,NULL,NULL,'2026-08-11 11:02:00','hoan_thanh',NULL),(482,'TN20260811-038',5,NULL,NULL,NULL,NULL,'2026-08-11 11:35:00','hoan_thanh',NULL),(483,'TN20260811-039',1,NULL,NULL,NULL,NULL,'2026-08-11 09:26:00','hoan_thanh',NULL),(484,'TN20260811-040',1,NULL,NULL,NULL,NULL,'2026-08-11 11:15:00','hoan_thanh',NULL),(485,'TN20260811-041',3,NULL,NULL,NULL,NULL,'2026-08-11 14:58:00','hoan_thanh',NULL),(486,'TN20260811-042',3,NULL,NULL,NULL,NULL,'2026-08-11 10:54:00','hoan_thanh',NULL),(487,'TN20260811-043',6,NULL,NULL,NULL,NULL,'2026-08-11 16:53:00','hoan_thanh',NULL),(488,'TN20260811-044',4,NULL,NULL,NULL,NULL,'2026-08-11 14:12:00','hoan_thanh',NULL),(489,'TN20260811-045',1,NULL,NULL,NULL,NULL,'2026-08-11 09:44:00','hoan_thanh',NULL),(490,'TN20260811-046',6,NULL,NULL,NULL,NULL,'2026-08-11 10:30:00','hoan_thanh',NULL),(491,'TN20260811-047',2,NULL,NULL,NULL,NULL,'2026-08-11 12:42:00','hoan_thanh',NULL),(492,'TN20260811-048',5,NULL,NULL,NULL,NULL,'2026-08-11 10:48:00','hoan_thanh',NULL),(493,'TN20260811-049',7,NULL,NULL,NULL,NULL,'2026-08-11 11:26:00','hoan_thanh',NULL),(494,'TN20260811-050',3,NULL,NULL,NULL,NULL,'2026-08-11 10:42:00','hoan_thanh',NULL),(495,'TN20260811-051',8,NULL,NULL,NULL,NULL,'2026-08-11 16:55:00','hoan_thanh',NULL),(496,'TN20260811-052',10,NULL,NULL,NULL,NULL,'2026-08-11 12:29:00','hoan_thanh',NULL),(497,'TN20260811-053',9,NULL,NULL,NULL,NULL,'2026-08-11 08:17:00','hoan_thanh',NULL),(498,'TN20260811-054',4,NULL,NULL,NULL,NULL,'2026-08-11 12:58:00','hoan_thanh',NULL),(499,'TN20260811-055',9,NULL,NULL,NULL,NULL,'2026-08-11 07:47:00','hoan_thanh',NULL),(500,'TN20260812-001',3,NULL,NULL,NULL,NULL,'2026-08-12 07:46:00','hoan_thanh',NULL),(501,'TN20260812-002',6,NULL,NULL,NULL,NULL,'2026-08-12 09:04:00','hoan_thanh',NULL),(502,'TN20260812-003',6,NULL,NULL,NULL,NULL,'2026-08-12 16:32:00','hoan_thanh',NULL),(503,'TN20260812-004',3,NULL,NULL,NULL,NULL,'2026-08-12 09:08:00','hoan_thanh',NULL),(504,'TN20260812-005',6,NULL,NULL,NULL,NULL,'2026-08-12 08:21:00','hoan_thanh',NULL),(505,'TN20260812-006',6,NULL,NULL,NULL,NULL,'2026-08-12 08:18:00','hoan_thanh',NULL),(506,'TN20260812-007',10,NULL,NULL,NULL,NULL,'2026-08-12 10:32:00','hoan_thanh',NULL),(507,'TN20260812-008',3,NULL,NULL,NULL,NULL,'2026-08-12 12:35:00','hoan_thanh',NULL),(508,'TN20260812-009',7,NULL,NULL,NULL,NULL,'2026-08-12 12:45:00','hoan_thanh',NULL),(509,'TN20260812-010',7,NULL,NULL,NULL,NULL,'2026-08-12 12:55:00','hoan_thanh',NULL),(510,'TN20260812-011',10,NULL,NULL,NULL,NULL,'2026-08-12 09:40:00','hoan_thanh',NULL),(511,'TN20260812-012',9,NULL,NULL,NULL,NULL,'2026-08-12 10:05:00','hoan_thanh',NULL),(512,'TN20260812-013',7,NULL,NULL,NULL,NULL,'2026-08-12 13:25:00','hoan_thanh',NULL),(513,'TN20260812-014',3,NULL,NULL,NULL,NULL,'2026-08-12 13:19:00','hoan_thanh',NULL),(514,'TN20260812-015',2,NULL,NULL,NULL,NULL,'2026-08-12 14:37:00','hoan_thanh',NULL),(515,'TN20260812-016',4,NULL,NULL,NULL,NULL,'2026-08-12 11:54:00','hoan_thanh',NULL),(516,'TN20260812-017',3,NULL,NULL,NULL,NULL,'2026-08-12 14:43:00','hoan_thanh',NULL),(517,'TN20260812-018',4,NULL,NULL,NULL,NULL,'2026-08-12 10:17:00','hoan_thanh',NULL),(518,'TN20260812-019',2,NULL,NULL,NULL,NULL,'2026-08-12 14:28:00','hoan_thanh',NULL),(519,'TN20260812-020',1,NULL,NULL,NULL,NULL,'2026-08-12 13:33:00','hoan_thanh',NULL),(520,'TN20260812-021',5,NULL,NULL,NULL,NULL,'2026-08-12 10:17:00','hoan_thanh',NULL),(521,'TN20260812-022',5,NULL,NULL,NULL,NULL,'2026-08-12 08:01:00','hoan_thanh',NULL),(522,'TN20260812-023',9,NULL,NULL,NULL,NULL,'2026-08-12 11:53:00','hoan_thanh',NULL),(523,'TN20260812-024',4,NULL,NULL,NULL,NULL,'2026-08-12 10:47:00','hoan_thanh',NULL),(524,'TN20260812-025',10,NULL,NULL,NULL,NULL,'2026-08-12 15:07:00','hoan_thanh',NULL),(525,'TN20260812-026',7,NULL,NULL,NULL,NULL,'2026-08-12 08:43:00','hoan_thanh',NULL),(526,'TN20260812-027',3,NULL,NULL,NULL,NULL,'2026-08-12 08:24:00','hoan_thanh',NULL),(527,'TN20260812-028',7,NULL,NULL,NULL,NULL,'2026-08-12 12:17:00','hoan_thanh',NULL),(528,'TN20260812-029',7,NULL,NULL,NULL,NULL,'2026-08-12 11:29:00','hoan_thanh',NULL),(529,'TN20260812-030',7,NULL,NULL,NULL,NULL,'2026-08-12 07:24:00','hoan_thanh',NULL),(530,'TN20260812-031',7,NULL,NULL,NULL,NULL,'2026-08-12 11:46:00','hoan_thanh',NULL),(531,'TN20260812-032',4,NULL,NULL,NULL,NULL,'2026-08-12 13:17:00','hoan_thanh',NULL),(532,'TN20260812-033',10,NULL,NULL,NULL,NULL,'2026-08-12 10:39:00','hoan_thanh',NULL),(533,'TN20260812-034',6,NULL,NULL,NULL,NULL,'2026-08-12 09:09:00','hoan_thanh',NULL),(534,'TN20260812-035',6,NULL,NULL,NULL,NULL,'2026-08-12 14:41:00','hoan_thanh',NULL),(535,'TN20260812-036',9,NULL,NULL,NULL,NULL,'2026-08-12 07:52:00','hoan_thanh',NULL),(536,'TN20260812-037',7,NULL,NULL,NULL,NULL,'2026-08-12 08:13:00','hoan_thanh',NULL),(537,'TN20260812-038',5,NULL,NULL,NULL,NULL,'2026-08-12 14:25:00','hoan_thanh',NULL),(538,'TN20260812-039',5,NULL,NULL,NULL,NULL,'2026-08-12 07:53:00','hoan_thanh',NULL),(539,'TN20260812-040',3,NULL,NULL,NULL,NULL,'2026-08-12 15:26:00','hoan_thanh',NULL),(540,'TN20260812-041',5,NULL,NULL,NULL,NULL,'2026-08-12 08:21:00','hoan_thanh',NULL),(541,'TN20260812-042',7,NULL,NULL,NULL,NULL,'2026-08-12 09:49:00','hoan_thanh',NULL),(542,'TN20260812-043',5,NULL,NULL,NULL,NULL,'2026-08-12 09:57:00','hoan_thanh',NULL),(543,'TN20260812-044',6,NULL,NULL,NULL,NULL,'2026-08-12 08:23:00','hoan_thanh',NULL),(544,'TN20260812-045',5,NULL,NULL,NULL,NULL,'2026-08-12 15:14:00','hoan_thanh',NULL),(545,'TN20260813-001',4,NULL,NULL,NULL,NULL,'2026-08-13 08:54:00','hoan_thanh',NULL),(546,'TN20260813-002',1,NULL,NULL,NULL,NULL,'2026-08-13 15:24:00','hoan_thanh',NULL),(547,'TN20260813-003',4,NULL,NULL,NULL,NULL,'2026-08-13 10:48:00','hoan_thanh',NULL),(548,'TN20260813-004',8,NULL,NULL,NULL,NULL,'2026-08-13 11:15:00','hoan_thanh',NULL),(549,'TN20260813-005',5,NULL,NULL,NULL,NULL,'2026-08-13 11:00:00','hoan_thanh',NULL),(550,'TN20260813-006',7,NULL,NULL,NULL,NULL,'2026-08-13 14:37:00','hoan_thanh',NULL),(551,'TN20260813-007',6,NULL,NULL,NULL,NULL,'2026-08-13 09:53:00','hoan_thanh',NULL),(552,'TN20260813-008',6,NULL,NULL,NULL,NULL,'2026-08-13 07:34:00','hoan_thanh',NULL),(553,'TN20260813-009',7,NULL,NULL,NULL,NULL,'2026-08-13 10:22:00','hoan_thanh',NULL),(554,'TN20260813-010',3,NULL,NULL,NULL,NULL,'2026-08-13 15:20:00','hoan_thanh',NULL),(555,'TN20260813-011',1,NULL,NULL,NULL,NULL,'2026-08-13 12:36:00','hoan_thanh',NULL),(556,'TN20260813-012',8,NULL,NULL,NULL,NULL,'2026-08-13 14:42:00','hoan_thanh',NULL),(557,'TN20260813-013',8,NULL,NULL,NULL,NULL,'2026-08-13 15:28:00','hoan_thanh',NULL),(558,'TN20260813-014',3,NULL,NULL,NULL,NULL,'2026-08-13 16:28:00','hoan_thanh',NULL),(559,'TN20260813-015',10,NULL,NULL,NULL,NULL,'2026-08-13 09:45:00','hoan_thanh',NULL),(560,'TN20260813-016',1,NULL,NULL,NULL,NULL,'2026-08-13 12:45:00','hoan_thanh',NULL),(561,'TN20260813-017',10,NULL,NULL,NULL,NULL,'2026-08-13 07:55:00','hoan_thanh',NULL),(562,'TN20260813-018',7,NULL,NULL,NULL,NULL,'2026-08-13 14:12:00','hoan_thanh',NULL),(563,'TN20260813-019',3,NULL,NULL,NULL,NULL,'2026-08-13 11:47:00','hoan_thanh',NULL),(564,'TN20260813-020',1,NULL,NULL,NULL,NULL,'2026-08-13 15:04:00','hoan_thanh',NULL),(565,'TN20260813-021',4,NULL,NULL,NULL,NULL,'2026-08-13 09:52:00','hoan_thanh',NULL),(566,'TN20260813-022',6,NULL,NULL,NULL,NULL,'2026-08-13 16:23:00','hoan_thanh',NULL),(567,'TN20260813-023',9,NULL,NULL,NULL,NULL,'2026-08-13 16:17:00','hoan_thanh',NULL),(568,'TN20260813-024',10,NULL,NULL,NULL,NULL,'2026-08-13 14:23:00','hoan_thanh',NULL),(569,'TN20260813-025',5,NULL,NULL,NULL,NULL,'2026-08-13 14:30:00','hoan_thanh',NULL),(570,'TN20260813-026',4,NULL,NULL,NULL,NULL,'2026-08-13 07:26:00','hoan_thanh',NULL),(571,'TN20260813-027',1,NULL,NULL,NULL,NULL,'2026-08-13 10:36:00','hoan_thanh',NULL),(572,'TN20260813-028',10,NULL,NULL,NULL,NULL,'2026-08-13 12:29:00','hoan_thanh',NULL),(573,'TN20260813-029',6,NULL,NULL,NULL,NULL,'2026-08-13 11:35:00','hoan_thanh',NULL),(574,'TN20260813-030',2,NULL,NULL,NULL,NULL,'2026-08-13 09:04:00','hoan_thanh',NULL),(575,'TN20260813-031',5,NULL,NULL,NULL,NULL,'2026-08-13 15:53:00','hoan_thanh',NULL),(576,'TN20260813-032',9,NULL,NULL,NULL,NULL,'2026-08-13 13:08:00','hoan_thanh',NULL),(577,'TN20260813-033',5,NULL,NULL,NULL,NULL,'2026-08-13 13:10:00','hoan_thanh',NULL),(578,'TN20260813-034',8,NULL,NULL,NULL,NULL,'2026-08-13 16:55:00','hoan_thanh',NULL),(579,'TN20260813-035',8,NULL,NULL,NULL,NULL,'2026-08-13 16:31:00','hoan_thanh',NULL),(580,'TN20260813-036',8,NULL,NULL,NULL,NULL,'2026-08-13 10:02:00','hoan_thanh',NULL),(581,'TN20260813-037',8,NULL,NULL,NULL,NULL,'2026-08-13 15:48:00','hoan_thanh',NULL),(582,'TN20260813-038',4,NULL,NULL,NULL,NULL,'2026-08-13 10:47:00','hoan_thanh',NULL),(583,'TN20260813-039',8,NULL,NULL,NULL,NULL,'2026-08-13 12:49:00','hoan_thanh',NULL),(584,'TN20260813-040',10,NULL,NULL,NULL,NULL,'2026-08-13 11:55:00','hoan_thanh',NULL),(585,'TN20260813-041',2,NULL,NULL,NULL,NULL,'2026-08-13 11:52:00','hoan_thanh',NULL),(586,'TN20260813-042',5,NULL,NULL,NULL,NULL,'2026-08-13 09:01:00','hoan_thanh',NULL),(587,'TN20260813-043',5,NULL,NULL,NULL,NULL,'2026-08-13 08:36:00','hoan_thanh',NULL),(588,'TN20260813-044',1,NULL,NULL,NULL,NULL,'2026-08-13 15:06:00','hoan_thanh',NULL),(589,'TN20260813-045',1,NULL,NULL,NULL,NULL,'2026-08-13 13:33:00','hoan_thanh',NULL),(590,'TN20260813-046',4,NULL,NULL,NULL,NULL,'2026-08-13 08:43:00','hoan_thanh',NULL),(591,'TN20260813-047',4,NULL,NULL,NULL,NULL,'2026-08-13 16:47:00','hoan_thanh',NULL),(592,'TN20260813-048',2,NULL,NULL,NULL,NULL,'2026-08-13 13:33:00','hoan_thanh',NULL),(593,'TN20260814-001',7,NULL,NULL,NULL,NULL,'2026-08-14 08:04:00','hoan_thanh',NULL),(594,'TN20260814-002',1,NULL,NULL,NULL,NULL,'2026-08-14 11:34:00','hoan_thanh',NULL),(595,'TN20260814-003',1,NULL,NULL,NULL,NULL,'2026-08-14 11:49:00','hoan_thanh',NULL),(596,'TN20260814-004',4,NULL,NULL,NULL,NULL,'2026-08-14 08:43:00','hoan_thanh',NULL),(597,'TN20260814-005',5,NULL,NULL,NULL,NULL,'2026-08-14 11:13:00','hoan_thanh',NULL),(598,'TN20260814-006',8,NULL,NULL,NULL,NULL,'2026-08-14 07:03:00','hoan_thanh',NULL),(599,'TN20260814-007',3,NULL,NULL,NULL,NULL,'2026-08-14 14:52:00','hoan_thanh',NULL),(600,'TN20260814-008',5,NULL,NULL,NULL,NULL,'2026-08-14 08:01:00','hoan_thanh',NULL),(601,'TN20260814-009',7,NULL,NULL,NULL,NULL,'2026-08-14 12:56:00','hoan_thanh',NULL),(602,'TN20260814-010',7,NULL,NULL,NULL,NULL,'2026-08-14 11:38:00','hoan_thanh',NULL),(603,'TN20260814-011',1,NULL,NULL,NULL,NULL,'2026-08-14 10:26:00','hoan_thanh',NULL),(604,'TN20260814-012',1,NULL,NULL,NULL,NULL,'2026-08-14 08:08:00','hoan_thanh',NULL),(605,'TN20260814-013',8,NULL,NULL,NULL,NULL,'2026-08-14 08:36:00','hoan_thanh',NULL),(606,'TN20260814-014',5,NULL,NULL,NULL,NULL,'2026-08-14 14:58:00','hoan_thanh',NULL),(607,'TN20260814-015',1,NULL,NULL,NULL,NULL,'2026-08-14 09:36:00','hoan_thanh',NULL),(608,'TN20260814-016',6,NULL,NULL,NULL,NULL,'2026-08-14 16:00:00','hoan_thanh',NULL),(609,'TN20260814-017',1,NULL,NULL,NULL,NULL,'2026-08-14 16:15:00','hoan_thanh',NULL),(610,'TN20260814-018',9,NULL,NULL,NULL,NULL,'2026-08-14 14:44:00','hoan_thanh',NULL),(611,'TN20260814-019',1,NULL,NULL,NULL,NULL,'2026-08-14 14:38:00','hoan_thanh',NULL),(612,'TN20260814-020',5,NULL,NULL,NULL,NULL,'2026-08-14 13:26:00','hoan_thanh',NULL),(613,'TN20260814-021',6,NULL,NULL,NULL,NULL,'2026-08-14 07:38:00','hoan_thanh',NULL),(614,'TN20260814-022',3,NULL,NULL,NULL,NULL,'2026-08-14 09:06:00','hoan_thanh',NULL),(615,'TN20260814-023',2,NULL,NULL,NULL,NULL,'2026-08-14 08:05:00','hoan_thanh',NULL),(616,'TN20260814-024',3,NULL,NULL,NULL,NULL,'2026-08-14 10:04:00','hoan_thanh',NULL),(617,'TN20260814-025',5,NULL,NULL,NULL,NULL,'2026-08-14 13:22:00','hoan_thanh',NULL),(618,'TN20260814-026',5,NULL,NULL,NULL,NULL,'2026-08-14 08:04:00','hoan_thanh',NULL),(619,'TN20260814-027',5,NULL,NULL,NULL,NULL,'2026-08-14 11:49:00','hoan_thanh',NULL),(620,'TN20260814-028',2,NULL,NULL,NULL,NULL,'2026-08-14 13:41:00','hoan_thanh',NULL),(621,'TN20260814-029',4,NULL,NULL,NULL,NULL,'2026-08-14 10:28:00','hoan_thanh',NULL),(622,'TN20260814-030',3,NULL,NULL,NULL,NULL,'2026-08-14 12:33:00','hoan_thanh',NULL),(623,'TN20260814-031',4,NULL,NULL,NULL,NULL,'2026-08-14 14:23:00','hoan_thanh',NULL),(624,'TN20260814-032',6,NULL,NULL,NULL,NULL,'2026-08-14 10:11:00','hoan_thanh',NULL),(625,'TN20260814-033',9,NULL,NULL,NULL,NULL,'2026-08-14 10:50:00','hoan_thanh',NULL),(626,'TN20260814-034',5,NULL,NULL,NULL,NULL,'2026-08-14 14:09:00','hoan_thanh',NULL),(627,'TN20260814-035',3,NULL,NULL,NULL,NULL,'2026-08-14 10:49:00','hoan_thanh',NULL),(628,'TN20260814-036',2,NULL,NULL,NULL,NULL,'2026-08-14 13:10:00','hoan_thanh',NULL),(629,'TN20260814-037',1,NULL,NULL,NULL,NULL,'2026-08-14 11:28:00','hoan_thanh',NULL),(630,'TN20260814-038',3,NULL,NULL,NULL,NULL,'2026-08-14 16:41:00','hoan_thanh',NULL),(631,'TN20260814-039',10,NULL,NULL,NULL,NULL,'2026-08-14 16:04:00','hoan_thanh',NULL),(632,'TN20260814-040',5,NULL,NULL,NULL,NULL,'2026-08-14 07:43:00','hoan_thanh',NULL),(633,'TN20260814-041',10,NULL,NULL,NULL,NULL,'2026-08-14 12:00:00','hoan_thanh',NULL),(634,'TN20260814-042',7,NULL,NULL,NULL,NULL,'2026-08-14 14:13:00','hoan_thanh',NULL),(635,'TN20260814-043',10,NULL,NULL,NULL,NULL,'2026-08-14 10:25:00','hoan_thanh',NULL),(636,'TN20260814-044',4,NULL,NULL,NULL,NULL,'2026-08-14 16:21:00','hoan_thanh',NULL),(637,'TN20260814-045',8,NULL,NULL,NULL,NULL,'2026-08-14 16:00:00','hoan_thanh',NULL),(638,'TN20260814-046',7,NULL,NULL,NULL,NULL,'2026-08-14 09:07:00','hoan_thanh',NULL),(639,'TN20260814-047',9,NULL,NULL,NULL,NULL,'2026-08-14 10:01:00','hoan_thanh',NULL),(640,'TN20260814-048',8,NULL,NULL,NULL,NULL,'2026-08-14 14:17:00','hoan_thanh',NULL),(641,'TN20260814-049',2,NULL,NULL,NULL,NULL,'2026-08-14 15:50:00','hoan_thanh',NULL),(642,'TN20260814-050',8,NULL,NULL,NULL,NULL,'2026-08-14 10:46:00','hoan_thanh',NULL),(643,'TN20260814-051',7,NULL,NULL,NULL,NULL,'2026-08-14 12:51:00','hoan_thanh',NULL),(644,'TN20260815-001',8,NULL,NULL,NULL,NULL,'2026-08-15 08:32:00','hoan_thanh',NULL),(645,'TN20260815-002',5,NULL,NULL,NULL,NULL,'2026-08-15 09:09:00','hoan_thanh',NULL),(646,'TN20260815-003',2,NULL,NULL,NULL,NULL,'2026-08-15 07:41:00','hoan_thanh',NULL),(647,'TN20260815-004',1,NULL,NULL,NULL,NULL,'2026-08-15 16:19:00','hoan_thanh',NULL),(648,'TN20260815-005',3,NULL,NULL,NULL,NULL,'2026-08-15 11:25:00','hoan_thanh',NULL),(649,'TN20260815-006',8,NULL,NULL,NULL,NULL,'2026-08-15 14:24:00','hoan_thanh',NULL),(650,'TN20260815-007',10,NULL,NULL,NULL,NULL,'2026-08-15 11:38:00','hoan_thanh',NULL),(651,'TN20260815-008',5,NULL,NULL,NULL,NULL,'2026-08-15 13:42:00','hoan_thanh',NULL),(652,'TN20260815-009',2,NULL,NULL,NULL,NULL,'2026-08-15 12:27:00','hoan_thanh',NULL),(653,'TN20260815-010',8,NULL,NULL,NULL,NULL,'2026-08-15 15:05:00','hoan_thanh',NULL),(654,'TN20260815-011',7,NULL,NULL,NULL,NULL,'2026-08-15 10:53:00','hoan_thanh',NULL),(655,'TN20260815-012',1,NULL,NULL,NULL,NULL,'2026-08-15 07:55:00','hoan_thanh',NULL),(656,'TN20260815-013',8,NULL,NULL,NULL,NULL,'2026-08-15 16:48:00','hoan_thanh',NULL),(657,'TN20260815-014',1,NULL,NULL,NULL,NULL,'2026-08-15 11:28:00','hoan_thanh',NULL),(658,'TN20260815-015',5,NULL,NULL,NULL,NULL,'2026-08-15 09:10:00','hoan_thanh',NULL),(659,'TN20260815-016',3,NULL,NULL,NULL,NULL,'2026-08-15 07:19:00','hoan_thanh',NULL),(660,'TN20260815-017',10,NULL,NULL,NULL,NULL,'2026-08-15 11:32:00','hoan_thanh',NULL),(661,'TN20260815-018',2,NULL,NULL,NULL,NULL,'2026-08-15 14:24:00','hoan_thanh',NULL),(662,'TN20260815-019',8,NULL,NULL,NULL,NULL,'2026-08-15 14:55:00','hoan_thanh',NULL),(663,'TN20260815-020',10,NULL,NULL,NULL,NULL,'2026-08-15 09:40:00','hoan_thanh',NULL),(664,'TN20260815-021',5,NULL,NULL,NULL,NULL,'2026-08-15 15:47:00','hoan_thanh',NULL),(665,'TN20260815-022',5,NULL,NULL,NULL,NULL,'2026-08-15 14:30:00','hoan_thanh',NULL),(666,'TN20260815-023',1,NULL,NULL,NULL,NULL,'2026-08-15 16:32:00','hoan_thanh',NULL),(667,'TN20260815-024',8,NULL,NULL,NULL,NULL,'2026-08-15 13:11:00','hoan_thanh',NULL),(668,'TN20260815-025',10,NULL,NULL,NULL,NULL,'2026-08-15 15:38:00','hoan_thanh',NULL),(669,'TN20260815-026',1,NULL,NULL,NULL,NULL,'2026-08-15 10:25:00','hoan_thanh',NULL),(670,'TN20260815-027',6,NULL,NULL,NULL,NULL,'2026-08-15 15:52:00','hoan_thanh',NULL),(671,'TN20260815-028',3,NULL,NULL,NULL,NULL,'2026-08-15 13:51:00','hoan_thanh',NULL),(672,'TN20260815-029',8,NULL,NULL,NULL,NULL,'2026-08-15 11:31:00','hoan_thanh',NULL),(673,'TN20260815-030',3,NULL,NULL,NULL,NULL,'2026-08-15 12:11:00','hoan_thanh',NULL),(674,'TN20260815-031',2,NULL,NULL,NULL,NULL,'2026-08-15 10:49:00','hoan_thanh',NULL),(675,'TN20260815-032',2,NULL,NULL,NULL,NULL,'2026-08-15 15:48:00','hoan_thanh',NULL),(676,'TN20260815-033',3,NULL,NULL,NULL,NULL,'2026-08-15 08:49:00','hoan_thanh',NULL),(677,'TN20260815-034',10,NULL,NULL,NULL,NULL,'2026-08-15 14:10:00','hoan_thanh',NULL),(678,'TN20260815-035',1,NULL,NULL,NULL,NULL,'2026-08-15 12:03:00','hoan_thanh',NULL),(679,'TN20260815-036',7,NULL,NULL,NULL,NULL,'2026-08-15 14:07:00','hoan_thanh',NULL),(680,'TN20260815-037',5,NULL,NULL,NULL,NULL,'2026-08-15 07:49:00','hoan_thanh',NULL),(681,'TN20260815-038',3,NULL,NULL,NULL,NULL,'2026-08-15 14:17:00','hoan_thanh',NULL),(682,'TN20260815-039',5,NULL,NULL,NULL,NULL,'2026-08-15 09:17:00','hoan_thanh',NULL),(683,'TN20260815-040',3,NULL,NULL,NULL,NULL,'2026-08-15 14:06:00','hoan_thanh',NULL),(684,'TN20260815-041',4,NULL,NULL,NULL,NULL,'2026-08-15 11:17:00','hoan_thanh',NULL),(685,'TN20260815-042',9,NULL,NULL,NULL,NULL,'2026-08-15 08:58:00','hoan_thanh',NULL),(686,'TN20260815-043',1,NULL,NULL,NULL,NULL,'2026-08-15 15:53:00','hoan_thanh',NULL),(687,'TN20260815-044',10,NULL,NULL,NULL,NULL,'2026-08-15 13:11:00','hoan_thanh',NULL),(688,'TN20260815-045',10,NULL,NULL,NULL,NULL,'2026-08-15 14:02:00','hoan_thanh',NULL),(689,'TN20260815-046',8,NULL,NULL,NULL,NULL,'2026-08-15 09:53:00','hoan_thanh',NULL),(690,'TN20260815-047',8,NULL,NULL,NULL,NULL,'2026-08-15 14:00:00','hoan_thanh',NULL),(691,'TN20260815-048',6,NULL,NULL,NULL,NULL,'2026-08-15 15:11:00','hoan_thanh',NULL),(692,'TN20260815-049',1,NULL,NULL,NULL,NULL,'2026-08-15 09:45:00','hoan_thanh',NULL),(693,'TN20260815-050',1,NULL,NULL,NULL,NULL,'2026-08-15 10:07:00','hoan_thanh',NULL),(694,'TN20260815-051',5,NULL,NULL,NULL,NULL,'2026-08-15 12:45:00','hoan_thanh',NULL),(695,'TN20260815-052',7,NULL,NULL,NULL,NULL,'2026-08-15 14:51:00','hoan_thanh',NULL),(696,'TN20260815-053',8,NULL,NULL,NULL,NULL,'2026-08-15 10:48:00','hoan_thanh',NULL),(697,'TN20260815-054',1,NULL,NULL,NULL,NULL,'2026-08-15 10:41:00','hoan_thanh',NULL),(698,'TN20260815-055',8,NULL,NULL,NULL,NULL,'2026-08-15 14:15:00','hoan_thanh',NULL),(699,'TN20260815-056',1,NULL,NULL,NULL,NULL,'2026-08-15 15:50:00','hoan_thanh',NULL),(700,'TN20260815-057',7,NULL,NULL,NULL,NULL,'2026-08-15 08:25:00','hoan_thanh',NULL),(701,'TN20260815-058',4,NULL,NULL,NULL,NULL,'2026-08-15 12:45:00','hoan_thanh',NULL),(702,'TN20260815-059',4,NULL,NULL,NULL,NULL,'2026-08-15 15:51:00','hoan_thanh',NULL),(703,'TN20260815-060',5,NULL,NULL,NULL,NULL,'2026-08-15 16:33:00','hoan_thanh',NULL),(704,'TN20260815-061',5,NULL,NULL,NULL,NULL,'2026-08-15 15:41:00','hoan_thanh',NULL),(705,'TN20260815-062',3,NULL,NULL,NULL,NULL,'2026-08-15 15:14:00','hoan_thanh',NULL),(706,'TN20260815-063',3,NULL,NULL,NULL,NULL,'2026-08-15 11:43:00','hoan_thanh',NULL),(707,'TN20260815-064',7,NULL,NULL,NULL,NULL,'2026-08-15 13:32:00','hoan_thanh',NULL),(708,'TN20260815-065',2,NULL,NULL,NULL,NULL,'2026-08-15 12:29:00','hoan_thanh',NULL),(709,'TN20260815-066',10,NULL,NULL,NULL,NULL,'2026-08-15 08:01:00','hoan_thanh',NULL),(710,'TN20260815-067',9,NULL,NULL,NULL,NULL,'2026-08-15 07:47:00','hoan_thanh',NULL),(711,'TN20260815-068',5,NULL,NULL,NULL,NULL,'2026-08-15 15:32:00','hoan_thanh',NULL),(712,'TN20260815-069',7,NULL,NULL,NULL,NULL,'2026-08-15 07:56:00','hoan_thanh',NULL),(713,'TN20260815-070',10,NULL,NULL,NULL,NULL,'2026-08-15 08:13:00','hoan_thanh',NULL),(714,'TN20260815-071',8,NULL,NULL,NULL,NULL,'2026-08-15 08:48:00','hoan_thanh',NULL),(715,'TN20260815-072',9,NULL,NULL,NULL,NULL,'2026-08-15 12:32:00','hoan_thanh',NULL),(716,'TN20260815-073',2,NULL,NULL,NULL,NULL,'2026-08-15 10:37:00','hoan_thanh',NULL),(717,'TN20260815-074',8,NULL,NULL,NULL,NULL,'2026-08-15 07:48:00','hoan_thanh',NULL),(718,'TN20260815-075',6,NULL,NULL,NULL,NULL,'2026-08-15 12:49:00','hoan_thanh',NULL),(719,'TN20260815-076',2,NULL,NULL,NULL,NULL,'2026-08-15 10:03:00','hoan_thanh',NULL),(720,'TN20260815-077',4,NULL,NULL,NULL,NULL,'2026-08-15 16:56:00','hoan_thanh',NULL),(721,'TN20260816-001',4,NULL,NULL,NULL,NULL,'2026-08-16 16:28:00','hoan_thanh',NULL),(722,'TN20260816-002',6,NULL,NULL,NULL,NULL,'2026-08-16 15:30:00','hoan_thanh',NULL),(723,'TN20260816-003',2,NULL,NULL,NULL,NULL,'2026-08-16 09:30:00','hoan_thanh',NULL),(724,'TN20260816-004',8,NULL,NULL,NULL,NULL,'2026-08-16 11:25:00','hoan_thanh',NULL),(725,'TN20260816-005',5,NULL,NULL,NULL,NULL,'2026-08-16 16:41:00','hoan_thanh',NULL),(726,'TN20260816-006',7,NULL,NULL,NULL,NULL,'2026-08-16 16:06:00','hoan_thanh',NULL),(727,'TN20260816-007',1,NULL,NULL,NULL,NULL,'2026-08-16 12:24:00','hoan_thanh',NULL),(728,'TN20260816-008',3,NULL,NULL,NULL,NULL,'2026-08-16 15:39:00','hoan_thanh',NULL),(729,'TN20260816-009',1,NULL,NULL,NULL,NULL,'2026-08-16 12:08:00','hoan_thanh',NULL),(730,'TN20260816-010',8,NULL,NULL,NULL,NULL,'2026-08-16 12:29:00','hoan_thanh',NULL),(731,'TN20260816-011',3,NULL,NULL,NULL,NULL,'2026-08-16 07:43:00','hoan_thanh',NULL),(732,'TN20260816-012',5,NULL,NULL,NULL,NULL,'2026-08-16 16:17:00','hoan_thanh',NULL),(733,'TN20260816-013',4,NULL,NULL,NULL,NULL,'2026-08-16 15:50:00','hoan_thanh',NULL),(734,'TN20260816-014',7,NULL,NULL,NULL,NULL,'2026-08-16 12:25:00','hoan_thanh',NULL),(735,'TN20260816-015',2,NULL,NULL,NULL,NULL,'2026-08-16 14:51:00','hoan_thanh',NULL),(736,'TN20260816-016',2,NULL,NULL,NULL,NULL,'2026-08-16 14:22:00','hoan_thanh',NULL),(737,'TN20260816-017',3,NULL,NULL,NULL,NULL,'2026-08-16 12:35:00','hoan_thanh',NULL),(738,'TN20260816-018',10,NULL,NULL,NULL,NULL,'2026-08-16 07:16:00','hoan_thanh',NULL),(739,'TN20260816-019',2,NULL,NULL,NULL,NULL,'2026-08-16 10:55:00','hoan_thanh',NULL),(740,'TN20260816-020',10,NULL,NULL,NULL,NULL,'2026-08-16 09:05:00','hoan_thanh',NULL),(741,'TN20260816-021',10,NULL,NULL,NULL,NULL,'2026-08-16 12:21:00','hoan_thanh',NULL),(742,'TN20260816-022',2,NULL,NULL,NULL,NULL,'2026-08-16 16:36:00','hoan_thanh',NULL),(743,'TN20260817-001',8,NULL,NULL,NULL,NULL,'2026-08-17 14:08:00','hoan_thanh',NULL),(744,'TN20260817-002',3,NULL,NULL,NULL,NULL,'2026-08-17 08:43:00','hoan_thanh',NULL),(745,'TN20260817-003',2,NULL,NULL,NULL,NULL,'2026-08-17 07:49:00','hoan_thanh',NULL),(746,'TN20260817-004',2,NULL,NULL,NULL,NULL,'2026-08-17 11:36:00','hoan_thanh',NULL),(747,'TN20260817-005',8,NULL,NULL,NULL,NULL,'2026-08-17 10:34:00','hoan_thanh',NULL),(748,'TN20260817-006',8,NULL,NULL,NULL,NULL,'2026-08-17 11:46:00','hoan_thanh',NULL),(749,'TN20260817-007',2,NULL,NULL,NULL,NULL,'2026-08-17 16:08:00','hoan_thanh',NULL),(750,'TN20260817-008',8,NULL,NULL,NULL,NULL,'2026-08-17 15:31:00','hoan_thanh',NULL),(751,'TN20260817-009',3,NULL,NULL,NULL,NULL,'2026-08-17 16:17:00','hoan_thanh',NULL),(752,'TN20260817-010',4,NULL,NULL,NULL,NULL,'2026-08-17 07:06:00','hoan_thanh',NULL),(753,'TN20260817-011',6,NULL,NULL,NULL,NULL,'2026-08-17 11:49:00','hoan_thanh',NULL),(754,'TN20260817-012',9,NULL,NULL,NULL,NULL,'2026-08-17 16:24:00','hoan_thanh',NULL),(755,'TN20260817-013',3,NULL,NULL,NULL,NULL,'2026-08-17 10:15:00','hoan_thanh',NULL),(756,'TN20260817-014',4,NULL,NULL,NULL,NULL,'2026-08-17 07:42:00','hoan_thanh',NULL),(757,'TN20260817-015',10,NULL,NULL,NULL,NULL,'2026-08-17 11:02:00','hoan_thanh',NULL),(758,'TN20260817-016',6,NULL,NULL,NULL,NULL,'2026-08-17 09:06:00','hoan_thanh',NULL),(759,'TN20260817-017',10,NULL,NULL,NULL,NULL,'2026-08-17 14:31:00','hoan_thanh',NULL),(760,'TN20260817-018',5,NULL,NULL,NULL,NULL,'2026-08-17 07:21:00','hoan_thanh',NULL),(761,'TN20260817-019',7,NULL,NULL,NULL,NULL,'2026-08-17 12:44:00','hoan_thanh',NULL),(762,'TN20260817-020',3,NULL,NULL,NULL,NULL,'2026-08-17 15:29:00','hoan_thanh',NULL),(763,'TN20260817-021',9,NULL,NULL,NULL,NULL,'2026-08-17 15:30:00','hoan_thanh',NULL),(764,'TN20260817-022',5,NULL,NULL,NULL,NULL,'2026-08-17 14:19:00','hoan_thanh',NULL),(765,'TN20260817-023',5,NULL,NULL,NULL,NULL,'2026-08-17 12:24:00','hoan_thanh',NULL),(766,'TN20260817-024',4,NULL,NULL,NULL,NULL,'2026-08-17 14:36:00','hoan_thanh',NULL),(767,'TN20260817-025',1,NULL,NULL,NULL,NULL,'2026-08-17 16:17:00','hoan_thanh',NULL),(768,'TN20260817-026',10,NULL,NULL,NULL,NULL,'2026-08-17 10:44:00','hoan_thanh',NULL),(769,'TN20260817-027',4,NULL,NULL,NULL,NULL,'2026-08-17 15:23:00','hoan_thanh',NULL),(770,'TN20260817-028',2,NULL,NULL,NULL,NULL,'2026-08-17 15:10:00','hoan_thanh',NULL),(771,'TN20260817-029',2,NULL,NULL,NULL,NULL,'2026-08-17 09:12:00','hoan_thanh',NULL),(772,'TN20260817-030',5,NULL,NULL,NULL,NULL,'2026-08-17 12:02:00','hoan_thanh',NULL),(773,'TN20260817-031',8,NULL,NULL,NULL,NULL,'2026-08-17 13:35:00','hoan_thanh',NULL),(774,'TN20260817-032',10,NULL,NULL,NULL,NULL,'2026-08-17 11:03:00','hoan_thanh',NULL),(775,'TN20260817-033',8,NULL,NULL,NULL,NULL,'2026-08-17 13:19:00','hoan_thanh',NULL),(776,'TN20260817-034',8,NULL,NULL,NULL,NULL,'2026-08-17 10:55:00','hoan_thanh',NULL),(777,'TN20260817-035',6,NULL,NULL,NULL,NULL,'2026-08-17 08:16:00','hoan_thanh',NULL),(778,'TN20260817-036',2,NULL,NULL,NULL,NULL,'2026-08-17 14:15:00','hoan_thanh',NULL),(779,'TN20260817-037',9,NULL,NULL,NULL,NULL,'2026-08-17 11:36:00','hoan_thanh',NULL),(780,'TN20260817-038',6,NULL,NULL,NULL,NULL,'2026-08-17 12:25:00','hoan_thanh',NULL),(781,'TN20260817-039',6,NULL,NULL,NULL,NULL,'2026-08-17 08:56:00','hoan_thanh',NULL),(782,'TN20260817-040',3,NULL,NULL,NULL,NULL,'2026-08-17 11:12:00','hoan_thanh',NULL),(783,'TN20260817-041',10,NULL,NULL,NULL,NULL,'2026-08-17 12:17:00','hoan_thanh',NULL),(784,'TN20260817-042',1,NULL,NULL,NULL,NULL,'2026-08-17 14:16:00','hoan_thanh',NULL),(785,'TN20260817-043',2,NULL,NULL,NULL,NULL,'2026-08-17 11:26:00','hoan_thanh',NULL),(786,'TN20260817-044',2,NULL,NULL,NULL,NULL,'2026-08-17 11:06:00','hoan_thanh',NULL),(787,'TN20260817-045',5,NULL,NULL,NULL,NULL,'2026-08-17 09:49:00','hoan_thanh',NULL),(788,'TN20260817-046',10,NULL,NULL,NULL,NULL,'2026-08-17 14:11:00','hoan_thanh',NULL),(789,'TN20260817-047',5,NULL,NULL,NULL,NULL,'2026-08-17 12:33:00','hoan_thanh',NULL),(790,'TN20260817-048',7,NULL,NULL,NULL,NULL,'2026-08-17 15:36:00','hoan_thanh',NULL),(791,'TN20260817-049',4,NULL,NULL,NULL,NULL,'2026-08-17 08:41:00','hoan_thanh',NULL),(792,'TN20260817-050',6,NULL,NULL,NULL,NULL,'2026-08-17 14:04:00','hoan_thanh',NULL),(793,'TN20260817-051',7,NULL,NULL,NULL,NULL,'2026-08-17 15:49:00','hoan_thanh',NULL),(794,'TN20260817-052',1,NULL,NULL,NULL,NULL,'2026-08-17 09:39:00','hoan_thanh',NULL),(795,'TN20260817-053',3,NULL,NULL,NULL,NULL,'2026-08-17 09:00:00','hoan_thanh',NULL),(796,'TN20260817-054',1,NULL,NULL,NULL,NULL,'2026-08-17 16:16:00','hoan_thanh',NULL),(797,'TN20260817-055',8,NULL,NULL,NULL,NULL,'2026-08-17 14:49:00','hoan_thanh',NULL),(798,'TN20260817-056',7,NULL,NULL,NULL,NULL,'2026-08-17 13:21:00','hoan_thanh',NULL),(799,'TN20260817-057',8,NULL,NULL,NULL,NULL,'2026-08-17 12:05:00','hoan_thanh',NULL),(800,'TN20260817-058',6,NULL,NULL,NULL,NULL,'2026-08-17 15:50:00','hoan_thanh',NULL),(801,'TN20260817-059',6,NULL,NULL,NULL,NULL,'2026-08-17 07:40:00','hoan_thanh',NULL),(802,'TN20260817-060',8,NULL,NULL,NULL,NULL,'2026-08-17 10:02:00','hoan_thanh',NULL),(803,'TN20260817-061',10,NULL,NULL,NULL,NULL,'2026-08-17 13:33:00','hoan_thanh',NULL),(804,'TN20260817-062',7,NULL,NULL,NULL,NULL,'2026-08-17 12:57:00','hoan_thanh',NULL),(805,'TN20260817-063',7,NULL,NULL,NULL,NULL,'2026-08-17 12:01:00','hoan_thanh',NULL),(806,'TN20260817-064',7,NULL,NULL,NULL,NULL,'2026-08-17 11:25:00','hoan_thanh',NULL),(807,'TN20260817-065',2,NULL,NULL,NULL,NULL,'2026-08-17 07:31:00','hoan_thanh',NULL),(808,'TN20260818-001',8,NULL,NULL,NULL,NULL,'2026-08-18 14:31:00','hoan_thanh',NULL),(809,'TN20260818-002',7,NULL,NULL,NULL,NULL,'2026-08-18 14:53:00','hoan_thanh',NULL),(810,'TN20260818-003',4,NULL,NULL,NULL,NULL,'2026-08-18 08:02:00','hoan_thanh',NULL),(811,'TN20260818-004',1,NULL,NULL,NULL,NULL,'2026-08-18 13:58:00','hoan_thanh',NULL),(812,'TN20260818-005',7,NULL,NULL,NULL,NULL,'2026-08-18 11:55:00','hoan_thanh',NULL),(813,'TN20260818-006',2,NULL,NULL,NULL,NULL,'2026-08-18 08:52:00','hoan_thanh',NULL),(814,'TN20260818-007',6,NULL,NULL,NULL,NULL,'2026-08-18 13:54:00','hoan_thanh',NULL),(815,'TN20260818-008',3,NULL,NULL,NULL,NULL,'2026-08-18 16:44:00','hoan_thanh',NULL),(816,'TN20260818-009',6,NULL,NULL,NULL,NULL,'2026-08-18 13:48:00','hoan_thanh',NULL),(817,'TN20260818-010',3,NULL,NULL,NULL,NULL,'2026-08-18 08:43:00','hoan_thanh',NULL),(818,'TN20260818-011',6,NULL,NULL,NULL,NULL,'2026-08-18 09:45:00','hoan_thanh',NULL),(819,'TN20260818-012',4,NULL,NULL,NULL,NULL,'2026-08-18 07:24:00','hoan_thanh',NULL),(820,'TN20260818-013',4,NULL,NULL,NULL,NULL,'2026-08-18 15:58:00','hoan_thanh',NULL),(821,'TN20260818-014',10,NULL,NULL,NULL,NULL,'2026-08-18 13:19:00','hoan_thanh',NULL),(822,'TN20260818-015',8,NULL,NULL,NULL,NULL,'2026-08-18 11:39:00','hoan_thanh',NULL),(823,'TN20260818-016',8,NULL,NULL,NULL,NULL,'2026-08-18 09:56:00','hoan_thanh',NULL),(824,'TN20260818-017',2,NULL,NULL,NULL,NULL,'2026-08-18 08:42:00','hoan_thanh',NULL),(825,'TN20260818-018',4,NULL,NULL,NULL,NULL,'2026-08-18 07:19:00','hoan_thanh',NULL),(826,'TN20260818-019',9,NULL,NULL,NULL,NULL,'2026-08-18 13:20:00','hoan_thanh',NULL),(827,'TN20260818-020',6,NULL,NULL,NULL,NULL,'2026-08-18 16:43:00','hoan_thanh',NULL),(828,'TN20260818-021',9,NULL,NULL,NULL,NULL,'2026-08-18 10:53:00','hoan_thanh',NULL),(829,'TN20260818-022',9,NULL,NULL,NULL,NULL,'2026-08-18 15:33:00','hoan_thanh',NULL),(830,'TN20260818-023',2,NULL,NULL,NULL,NULL,'2026-08-18 14:53:00','hoan_thanh',NULL),(831,'TN20260818-024',7,NULL,NULL,NULL,NULL,'2026-08-18 09:51:00','hoan_thanh',NULL),(832,'TN20260818-025',7,NULL,NULL,NULL,NULL,'2026-08-18 07:28:00','hoan_thanh',NULL),(833,'TN20260818-026',10,NULL,NULL,NULL,NULL,'2026-08-18 13:38:00','hoan_thanh',NULL),(834,'TN20260818-027',5,NULL,NULL,NULL,NULL,'2026-08-18 15:37:00','hoan_thanh',NULL),(835,'TN20260818-028',8,NULL,NULL,NULL,NULL,'2026-08-18 07:22:00','hoan_thanh',NULL),(836,'TN20260818-029',9,NULL,NULL,NULL,NULL,'2026-08-18 13:00:00','hoan_thanh',NULL),(837,'TN20260818-030',2,NULL,NULL,NULL,NULL,'2026-08-18 09:44:00','hoan_thanh',NULL),(838,'TN20260818-031',2,NULL,NULL,NULL,NULL,'2026-08-18 12:48:00','hoan_thanh',NULL),(839,'TN20260818-032',6,NULL,NULL,NULL,NULL,'2026-08-18 16:03:00','hoan_thanh',NULL),(840,'TN20260818-033',10,NULL,NULL,NULL,NULL,'2026-08-18 09:37:00','hoan_thanh',NULL),(841,'TN20260818-034',6,NULL,NULL,NULL,NULL,'2026-08-18 07:39:00','hoan_thanh',NULL),(842,'TN20260818-035',5,NULL,NULL,NULL,NULL,'2026-08-18 09:15:00','hoan_thanh',NULL),(843,'TN20260818-036',10,NULL,NULL,NULL,NULL,'2026-08-18 14:11:00','hoan_thanh',NULL),(844,'TN20260818-037',9,NULL,NULL,NULL,NULL,'2026-08-18 12:33:00','hoan_thanh',NULL),(845,'TN20260818-038',2,NULL,NULL,NULL,NULL,'2026-08-18 08:28:00','hoan_thanh',NULL),(846,'TN20260818-039',1,NULL,NULL,NULL,NULL,'2026-08-18 07:38:00','hoan_thanh',NULL),(847,'TN20260818-040',6,NULL,NULL,NULL,NULL,'2026-08-18 07:33:00','hoan_thanh',NULL),(848,'TN20260818-041',9,NULL,NULL,NULL,NULL,'2026-08-18 07:21:00','hoan_thanh',NULL),(849,'TN20260818-042',5,NULL,NULL,NULL,NULL,'2026-08-18 08:03:00','hoan_thanh',NULL),(850,'TN20260818-043',3,NULL,NULL,NULL,NULL,'2026-08-18 11:14:00','hoan_thanh',NULL),(851,'TN20260818-044',1,NULL,NULL,NULL,NULL,'2026-08-18 11:45:00','hoan_thanh',NULL),(852,'TN20260818-045',5,NULL,NULL,NULL,NULL,'2026-08-18 11:43:00','hoan_thanh',NULL),(853,'TN20260818-046',5,NULL,NULL,NULL,NULL,'2026-08-18 10:34:00','hoan_thanh',NULL),(854,'TN20260818-047',9,NULL,NULL,NULL,NULL,'2026-08-18 16:49:00','hoan_thanh',NULL),(855,'TN20260818-048',1,NULL,NULL,NULL,NULL,'2026-08-18 09:00:00','hoan_thanh',NULL),(856,'TN20260818-049',7,NULL,NULL,NULL,NULL,'2026-08-18 07:38:00','hoan_thanh',NULL),(857,'TN20260818-050',5,NULL,NULL,NULL,NULL,'2026-08-18 09:32:00','hoan_thanh',NULL),(858,'TN20260819-001',1,NULL,NULL,NULL,NULL,'2026-08-19 16:58:00','hoan_thanh',NULL),(859,'TN20260819-002',2,NULL,NULL,NULL,NULL,'2026-08-19 09:41:00','hoan_thanh',NULL),(860,'TN20260819-003',8,NULL,NULL,NULL,NULL,'2026-08-19 13:04:00','hoan_thanh',NULL),(861,'TN20260819-004',5,NULL,NULL,NULL,NULL,'2026-08-19 14:06:00','hoan_thanh',NULL),(862,'TN20260819-005',2,NULL,NULL,NULL,NULL,'2026-08-19 10:01:00','hoan_thanh',NULL),(863,'TN20260819-006',5,NULL,NULL,NULL,NULL,'2026-08-19 16:54:00','hoan_thanh',NULL),(864,'TN20260819-007',7,NULL,NULL,NULL,NULL,'2026-08-19 07:13:00','hoan_thanh',NULL),(865,'TN20260819-008',2,NULL,NULL,NULL,NULL,'2026-08-19 16:07:00','hoan_thanh',NULL),(866,'TN20260819-009',6,NULL,NULL,NULL,NULL,'2026-08-19 15:08:00','hoan_thanh',NULL),(867,'TN20260819-010',7,NULL,NULL,NULL,NULL,'2026-08-19 10:50:00','hoan_thanh',NULL),(868,'TN20260819-011',2,NULL,NULL,NULL,NULL,'2026-08-19 14:11:00','hoan_thanh',NULL),(869,'TN20260819-012',7,NULL,NULL,NULL,NULL,'2026-08-19 07:23:00','hoan_thanh',NULL),(870,'TN20260819-013',2,NULL,NULL,NULL,NULL,'2026-08-19 12:57:00','hoan_thanh',NULL),(871,'TN20260819-014',10,NULL,NULL,NULL,NULL,'2026-08-19 15:27:00','hoan_thanh',NULL),(872,'TN20260819-015',6,NULL,NULL,NULL,NULL,'2026-08-19 08:14:00','hoan_thanh',NULL),(873,'TN20260819-016',7,NULL,NULL,NULL,NULL,'2026-08-19 11:36:00','hoan_thanh',NULL),(874,'TN20260819-017',1,NULL,NULL,NULL,NULL,'2026-08-19 10:03:00','hoan_thanh',NULL),(875,'TN20260819-018',10,NULL,NULL,NULL,NULL,'2026-08-19 13:55:00','hoan_thanh',NULL),(876,'TN20260819-019',8,NULL,NULL,NULL,NULL,'2026-08-19 10:39:00','hoan_thanh',NULL),(877,'TN20260819-020',3,NULL,NULL,NULL,NULL,'2026-08-19 14:28:00','hoan_thanh',NULL),(878,'TN20260819-021',8,NULL,NULL,NULL,NULL,'2026-08-19 08:13:00','hoan_thanh',NULL),(879,'TN20260819-022',4,NULL,NULL,NULL,NULL,'2026-08-19 16:28:00','hoan_thanh',NULL),(880,'TN20260819-023',9,NULL,NULL,NULL,NULL,'2026-08-19 16:00:00','hoan_thanh',NULL),(881,'TN20260819-024',5,NULL,NULL,NULL,NULL,'2026-08-19 14:42:00','hoan_thanh',NULL),(882,'TN20260819-025',8,NULL,NULL,NULL,NULL,'2026-08-19 08:44:00','hoan_thanh',NULL),(883,'TN20260819-026',4,NULL,NULL,NULL,NULL,'2026-08-19 09:03:00','hoan_thanh',NULL),(884,'TN20260819-027',3,NULL,NULL,NULL,NULL,'2026-08-19 11:20:00','hoan_thanh',NULL),(885,'TN20260819-028',5,NULL,NULL,NULL,NULL,'2026-08-19 11:56:00','hoan_thanh',NULL),(886,'TN20260819-029',1,NULL,NULL,NULL,NULL,'2026-08-19 15:36:00','hoan_thanh',NULL),(887,'TN20260819-030',1,NULL,NULL,NULL,NULL,'2026-08-19 16:19:00','hoan_thanh',NULL),(888,'TN20260819-031',7,NULL,NULL,NULL,NULL,'2026-08-19 10:08:00','hoan_thanh',NULL),(889,'TN20260819-032',4,NULL,NULL,NULL,NULL,'2026-08-19 15:05:00','hoan_thanh',NULL),(890,'TN20260819-033',2,NULL,NULL,NULL,NULL,'2026-08-19 14:24:00','hoan_thanh',NULL),(891,'TN20260819-034',5,NULL,NULL,NULL,NULL,'2026-08-19 16:06:00','hoan_thanh',NULL),(892,'TN20260819-035',2,NULL,NULL,NULL,NULL,'2026-08-19 14:50:00','hoan_thanh',NULL),(893,'TN20260819-036',7,NULL,NULL,NULL,NULL,'2026-08-19 14:48:00','hoan_thanh',NULL),(894,'TN20260819-037',6,NULL,NULL,NULL,NULL,'2026-08-19 08:10:00','hoan_thanh',NULL),(895,'TN20260819-038',10,NULL,NULL,NULL,NULL,'2026-08-19 07:06:00','hoan_thanh',NULL),(896,'TN20260819-039',1,NULL,NULL,NULL,NULL,'2026-08-19 08:13:00','hoan_thanh',NULL),(897,'TN20260819-040',8,NULL,NULL,NULL,NULL,'2026-08-19 08:08:00','hoan_thanh',NULL),(898,'TN20260819-041',3,NULL,NULL,NULL,NULL,'2026-08-19 13:40:00','hoan_thanh',NULL),(899,'TN20260819-042',5,NULL,NULL,NULL,NULL,'2026-08-19 11:55:00','hoan_thanh',NULL),(900,'TN20260820-001',5,NULL,NULL,NULL,NULL,'2026-08-20 13:57:00','hoan_thanh',NULL),(901,'TN20260820-002',1,NULL,NULL,NULL,NULL,'2026-08-20 14:57:00','hoan_thanh',NULL),(902,'TN20260820-003',4,NULL,NULL,NULL,NULL,'2026-08-20 11:24:00','hoan_thanh',NULL),(903,'TN20260820-004',2,NULL,NULL,NULL,NULL,'2026-08-20 09:13:00','hoan_thanh',NULL),(904,'TN20260820-005',9,NULL,NULL,NULL,NULL,'2026-08-20 11:54:00','hoan_thanh',NULL),(905,'TN20260820-006',8,NULL,NULL,NULL,NULL,'2026-08-20 08:20:00','hoan_thanh',NULL),(906,'TN20260820-007',5,NULL,NULL,NULL,NULL,'2026-08-20 10:36:00','hoan_thanh',NULL),(907,'TN20260820-008',7,NULL,NULL,NULL,NULL,'2026-08-20 11:40:00','hoan_thanh',NULL),(908,'TN20260820-009',9,NULL,NULL,NULL,NULL,'2026-08-20 13:00:00','hoan_thanh',NULL),(909,'TN20260820-010',5,NULL,NULL,NULL,NULL,'2026-08-20 09:21:00','hoan_thanh',NULL),(910,'TN20260820-011',9,NULL,NULL,NULL,NULL,'2026-08-20 10:45:00','hoan_thanh',NULL),(911,'TN20260820-012',2,NULL,NULL,NULL,NULL,'2026-08-20 13:51:00','hoan_thanh',NULL),(912,'TN20260820-013',1,NULL,NULL,NULL,NULL,'2026-08-20 07:22:00','hoan_thanh',NULL),(913,'TN20260820-014',2,NULL,NULL,NULL,NULL,'2026-08-20 09:41:00','hoan_thanh',NULL),(914,'TN20260820-015',2,NULL,NULL,NULL,NULL,'2026-08-20 11:00:00','hoan_thanh',NULL),(915,'TN20260820-016',3,NULL,NULL,NULL,NULL,'2026-08-20 12:55:00','hoan_thanh',NULL),(916,'TN20260820-017',9,NULL,NULL,NULL,NULL,'2026-08-20 11:40:00','hoan_thanh',NULL),(917,'TN20260820-018',6,NULL,NULL,NULL,NULL,'2026-08-20 15:50:00','hoan_thanh',NULL),(918,'TN20260820-019',9,NULL,NULL,NULL,NULL,'2026-08-20 14:45:00','hoan_thanh',NULL),(919,'TN20260820-020',4,NULL,NULL,NULL,NULL,'2026-08-20 08:20:00','hoan_thanh',NULL),(920,'TN20260820-021',9,NULL,NULL,NULL,NULL,'2026-08-20 07:09:00','hoan_thanh',NULL),(921,'TN20260820-022',5,NULL,NULL,NULL,NULL,'2026-08-20 13:41:00','hoan_thanh',NULL),(922,'TN20260820-023',8,NULL,NULL,NULL,NULL,'2026-08-20 15:41:00','hoan_thanh',NULL),(923,'TN20260820-024',2,NULL,NULL,NULL,NULL,'2026-08-20 16:38:00','hoan_thanh',NULL),(924,'TN20260820-025',5,NULL,NULL,NULL,NULL,'2026-08-20 14:25:00','hoan_thanh',NULL),(925,'TN20260820-026',5,NULL,NULL,NULL,NULL,'2026-08-20 16:26:00','hoan_thanh',NULL),(926,'TN20260820-027',2,NULL,NULL,NULL,NULL,'2026-08-20 12:56:00','hoan_thanh',NULL),(927,'TN20260820-028',6,NULL,NULL,NULL,NULL,'2026-08-20 14:37:00','hoan_thanh',NULL),(928,'TN20260820-029',6,NULL,NULL,NULL,NULL,'2026-08-20 11:39:00','hoan_thanh',NULL),(929,'TN20260820-030',6,NULL,NULL,NULL,NULL,'2026-08-20 08:24:00','hoan_thanh',NULL),(930,'TN20260820-031',2,NULL,NULL,NULL,NULL,'2026-08-20 16:15:00','hoan_thanh',NULL),(931,'TN20260820-032',6,NULL,NULL,NULL,NULL,'2026-08-20 10:14:00','hoan_thanh',NULL),(932,'TN20260820-033',7,NULL,NULL,NULL,NULL,'2026-08-20 09:08:00','hoan_thanh',NULL),(933,'TN20260820-034',9,NULL,NULL,NULL,NULL,'2026-08-20 07:01:00','hoan_thanh',NULL),(934,'TN20260820-035',5,NULL,NULL,NULL,NULL,'2026-08-20 15:53:00','hoan_thanh',NULL),(935,'TN20260820-036',1,NULL,NULL,NULL,NULL,'2026-08-20 15:27:00','hoan_thanh',NULL),(936,'TN20260820-037',6,NULL,NULL,NULL,NULL,'2026-08-20 08:05:00','hoan_thanh',NULL),(937,'TN20260820-038',2,NULL,NULL,NULL,NULL,'2026-08-20 13:54:00','hoan_thanh',NULL),(938,'TN20260820-039',1,NULL,NULL,NULL,NULL,'2026-08-20 09:19:00','hoan_thanh',NULL),(939,'TN20260820-040',10,NULL,NULL,NULL,NULL,'2026-08-20 10:15:00','hoan_thanh',NULL),(940,'TN20260820-041',2,NULL,NULL,NULL,NULL,'2026-08-20 08:48:00','hoan_thanh',NULL),(941,'TN20260820-042',7,NULL,NULL,NULL,NULL,'2026-08-20 08:57:00','hoan_thanh',NULL),(942,'TN20260820-043',4,NULL,NULL,NULL,NULL,'2026-08-20 10:31:00','hoan_thanh',NULL),(943,'TN20260820-044',2,NULL,NULL,NULL,NULL,'2026-08-20 10:45:00','hoan_thanh',NULL),(944,'TN20260820-045',6,NULL,NULL,NULL,NULL,'2026-08-20 08:55:00','hoan_thanh',NULL),(945,'TN20260820-046',5,NULL,NULL,NULL,NULL,'2026-08-20 09:44:00','hoan_thanh',NULL),(946,'TN20260821-001',2,NULL,NULL,NULL,NULL,'2026-08-21 11:07:00','hoan_thanh',NULL),(947,'TN20260821-002',5,NULL,NULL,NULL,NULL,'2026-08-21 10:53:00','hoan_thanh',NULL),(948,'TN20260821-003',10,NULL,NULL,NULL,NULL,'2026-08-21 14:36:00','hoan_thanh',NULL),(949,'TN20260821-004',2,NULL,NULL,NULL,NULL,'2026-08-21 13:22:00','hoan_thanh',NULL),(950,'TN20260821-005',5,NULL,NULL,NULL,NULL,'2026-08-21 11:30:00','hoan_thanh',NULL),(951,'TN20260821-006',6,NULL,NULL,NULL,NULL,'2026-08-21 11:32:00','hoan_thanh',NULL),(952,'TN20260821-007',3,NULL,NULL,NULL,NULL,'2026-08-21 11:56:00','hoan_thanh',NULL),(953,'TN20260821-008',4,NULL,NULL,NULL,NULL,'2026-08-21 09:40:00','hoan_thanh',NULL),(954,'TN20260821-009',9,NULL,NULL,NULL,NULL,'2026-08-21 12:46:00','hoan_thanh',NULL),(955,'TN20260821-010',10,NULL,NULL,NULL,NULL,'2026-08-21 10:23:00','hoan_thanh',NULL),(956,'TN20260821-011',1,NULL,NULL,NULL,NULL,'2026-08-21 10:08:00','hoan_thanh',NULL),(957,'TN20260821-012',1,NULL,NULL,NULL,NULL,'2026-08-21 08:15:00','hoan_thanh',NULL),(958,'TN20260821-013',5,NULL,NULL,NULL,NULL,'2026-08-21 14:46:00','hoan_thanh',NULL),(959,'TN20260821-014',7,NULL,NULL,NULL,NULL,'2026-08-21 10:55:00','hoan_thanh',NULL),(960,'TN20260821-015',2,NULL,NULL,NULL,NULL,'2026-08-21 13:43:00','hoan_thanh',NULL),(961,'TN20260821-016',4,NULL,NULL,NULL,NULL,'2026-08-21 13:53:00','hoan_thanh',NULL),(962,'TN20260821-017',2,NULL,NULL,NULL,NULL,'2026-08-21 12:14:00','hoan_thanh',NULL),(963,'TN20260821-018',5,NULL,NULL,NULL,NULL,'2026-08-21 09:03:00','hoan_thanh',NULL),(964,'TN20260821-019',10,NULL,NULL,NULL,NULL,'2026-08-21 15:15:00','hoan_thanh',NULL),(965,'TN20260821-020',3,NULL,NULL,NULL,NULL,'2026-08-21 15:47:00','hoan_thanh',NULL),(966,'TN20260821-021',6,NULL,NULL,NULL,NULL,'2026-08-21 14:14:00','hoan_thanh',NULL),(967,'TN20260821-022',6,NULL,NULL,NULL,NULL,'2026-08-21 12:09:00','hoan_thanh',NULL),(968,'TN20260821-023',6,NULL,NULL,NULL,NULL,'2026-08-21 09:15:00','hoan_thanh',NULL),(969,'TN20260821-024',3,NULL,NULL,NULL,NULL,'2026-08-21 14:55:00','hoan_thanh',NULL),(970,'TN20260821-025',7,NULL,NULL,NULL,NULL,'2026-08-21 08:52:00','hoan_thanh',NULL),(971,'TN20260821-026',2,NULL,NULL,NULL,NULL,'2026-08-21 12:50:00','hoan_thanh',NULL),(972,'TN20260821-027',1,NULL,NULL,NULL,NULL,'2026-08-21 11:08:00','hoan_thanh',NULL),(973,'TN20260821-028',2,NULL,NULL,NULL,NULL,'2026-08-21 14:39:00','hoan_thanh',NULL),(974,'TN20260821-029',4,NULL,NULL,NULL,NULL,'2026-08-21 07:35:00','hoan_thanh',NULL),(975,'TN20260821-030',10,NULL,NULL,NULL,NULL,'2026-08-21 12:53:00','hoan_thanh',NULL),(976,'TN20260821-031',7,NULL,NULL,NULL,NULL,'2026-08-21 11:56:00','hoan_thanh',NULL),(977,'TN20260821-032',5,NULL,NULL,NULL,NULL,'2026-08-21 11:29:00','hoan_thanh',NULL),(978,'TN20260821-033',6,NULL,NULL,NULL,NULL,'2026-08-21 07:45:00','hoan_thanh',NULL),(979,'TN20260821-034',8,NULL,NULL,NULL,NULL,'2026-08-21 13:29:00','hoan_thanh',NULL),(980,'TN20260821-035',7,NULL,NULL,NULL,NULL,'2026-08-21 08:34:00','hoan_thanh',NULL),(981,'TN20260821-036',10,NULL,NULL,NULL,NULL,'2026-08-21 12:18:00','hoan_thanh',NULL),(982,'TN20260821-037',6,NULL,NULL,NULL,NULL,'2026-08-21 15:04:00','hoan_thanh',NULL),(983,'TN20260821-038',2,NULL,NULL,NULL,NULL,'2026-08-21 14:41:00','hoan_thanh',NULL),(984,'TN20260821-039',7,NULL,NULL,NULL,NULL,'2026-08-21 08:28:00','hoan_thanh',NULL),(985,'TN20260821-040',8,NULL,NULL,NULL,NULL,'2026-08-21 16:20:00','hoan_thanh',NULL),(986,'TN20260821-041',6,NULL,NULL,NULL,NULL,'2026-08-21 07:53:00','hoan_thanh',NULL),(987,'TN20260821-042',6,NULL,NULL,NULL,NULL,'2026-08-21 11:13:00','hoan_thanh',NULL),(988,'TN20260821-043',7,NULL,NULL,NULL,NULL,'2026-08-21 07:03:00','hoan_thanh',NULL),(989,'TN20260821-044',4,NULL,NULL,NULL,NULL,'2026-08-21 07:43:00','hoan_thanh',NULL),(990,'TN20260821-045',3,NULL,NULL,NULL,NULL,'2026-08-21 16:22:00','hoan_thanh',NULL),(991,'TN20260821-046',1,NULL,NULL,NULL,NULL,'2026-08-21 11:26:00','hoan_thanh',NULL),(992,'TN20260821-047',10,NULL,NULL,NULL,NULL,'2026-08-21 14:18:00','hoan_thanh',NULL),(993,'TN20260822-001',4,NULL,NULL,NULL,NULL,'2026-08-22 09:03:00','hoan_thanh',NULL),(994,'TN20260822-002',7,NULL,NULL,NULL,NULL,'2026-08-22 15:02:00','hoan_thanh',NULL),(995,'TN20260822-003',2,NULL,NULL,NULL,NULL,'2026-08-22 12:04:00','hoan_thanh',NULL),(996,'TN20260822-004',1,NULL,NULL,NULL,NULL,'2026-08-22 15:23:00','hoan_thanh',NULL),(997,'TN20260822-005',8,NULL,NULL,NULL,NULL,'2026-08-22 09:49:00','hoan_thanh',NULL),(998,'TN20260822-006',7,NULL,NULL,NULL,NULL,'2026-08-22 09:16:00','hoan_thanh',NULL),(999,'TN20260822-007',6,NULL,NULL,NULL,NULL,'2026-08-22 12:32:00','hoan_thanh',NULL),(1000,'TN20260822-008',4,NULL,NULL,NULL,NULL,'2026-08-22 10:53:00','hoan_thanh',NULL),(1001,'TN20260822-009',2,NULL,NULL,NULL,NULL,'2026-08-22 10:42:00','hoan_thanh',NULL),(1002,'TN20260822-010',1,NULL,NULL,NULL,NULL,'2026-08-22 14:08:00','hoan_thanh',NULL),(1003,'TN20260822-011',9,NULL,NULL,NULL,NULL,'2026-08-22 13:36:00','hoan_thanh',NULL),(1004,'TN20260822-012',10,NULL,NULL,NULL,NULL,'2026-08-22 15:28:00','hoan_thanh',NULL),(1005,'TN20260822-013',3,NULL,NULL,NULL,NULL,'2026-08-22 15:10:00','hoan_thanh',NULL),(1006,'TN20260822-014',9,NULL,NULL,NULL,NULL,'2026-08-22 13:24:00','hoan_thanh',NULL),(1007,'TN20260822-015',4,NULL,NULL,NULL,NULL,'2026-08-22 15:03:00','hoan_thanh',NULL),(1008,'TN20260822-016',5,NULL,NULL,NULL,NULL,'2026-08-22 16:40:00','hoan_thanh',NULL),(1009,'TN20260822-017',5,NULL,NULL,NULL,NULL,'2026-08-22 16:42:00','hoan_thanh',NULL),(1010,'TN20260822-018',8,NULL,NULL,NULL,NULL,'2026-08-22 08:02:00','hoan_thanh',NULL),(1011,'TN20260822-019',5,NULL,NULL,NULL,NULL,'2026-08-22 14:31:00','hoan_thanh',NULL),(1012,'TN20260822-020',5,NULL,NULL,NULL,NULL,'2026-08-22 12:37:00','hoan_thanh',NULL),(1013,'TN20260822-021',4,NULL,NULL,NULL,NULL,'2026-08-22 11:19:00','hoan_thanh',NULL),(1014,'TN20260822-022',2,NULL,NULL,NULL,NULL,'2026-08-22 13:12:00','hoan_thanh',NULL),(1015,'TN20260822-023',5,NULL,NULL,NULL,NULL,'2026-08-22 10:33:00','hoan_thanh',NULL),(1016,'TN20260822-024',10,NULL,NULL,NULL,NULL,'2026-08-22 08:37:00','hoan_thanh',NULL),(1017,'TN20260822-025',8,NULL,NULL,NULL,NULL,'2026-08-22 12:57:00','hoan_thanh',NULL),(1018,'TN20260822-026',10,NULL,NULL,NULL,NULL,'2026-08-22 10:17:00','hoan_thanh',NULL),(1019,'TN20260822-027',10,NULL,NULL,NULL,NULL,'2026-08-22 10:33:00','hoan_thanh',NULL),(1020,'TN20260822-028',6,NULL,NULL,NULL,NULL,'2026-08-22 09:57:00','hoan_thanh',NULL),(1021,'TN20260822-029',8,NULL,NULL,NULL,NULL,'2026-08-22 11:57:00','hoan_thanh',NULL),(1022,'TN20260822-030',10,NULL,NULL,NULL,NULL,'2026-08-22 16:07:00','hoan_thanh',NULL),(1023,'TN20260822-031',1,NULL,NULL,NULL,NULL,'2026-08-22 10:48:00','hoan_thanh',NULL),(1024,'TN20260822-032',9,NULL,NULL,NULL,NULL,'2026-08-22 13:34:00','hoan_thanh',NULL),(1025,'TN20260822-033',1,NULL,NULL,NULL,NULL,'2026-08-22 11:28:00','hoan_thanh',NULL),(1026,'TN20260822-034',6,NULL,NULL,NULL,NULL,'2026-08-22 15:37:00','hoan_thanh',NULL),(1027,'TN20260822-035',1,NULL,NULL,NULL,NULL,'2026-08-22 16:03:00','hoan_thanh',NULL),(1028,'TN20260822-036',3,NULL,NULL,NULL,NULL,'2026-08-22 13:12:00','hoan_thanh',NULL),(1029,'TN20260822-037',9,NULL,NULL,NULL,NULL,'2026-08-22 13:22:00','hoan_thanh',NULL),(1030,'TN20260822-038',9,NULL,NULL,NULL,NULL,'2026-08-22 09:20:00','hoan_thanh',NULL),(1031,'TN20260822-039',3,NULL,NULL,NULL,NULL,'2026-08-22 13:56:00','hoan_thanh',NULL),(1032,'TN20260822-040',7,NULL,NULL,NULL,NULL,'2026-08-22 13:16:00','hoan_thanh',NULL),(1033,'TN20260822-041',3,NULL,NULL,NULL,NULL,'2026-08-22 15:29:00','hoan_thanh',NULL),(1034,'TN20260822-042',9,NULL,NULL,NULL,NULL,'2026-08-22 10:52:00','hoan_thanh',NULL),(1035,'TN20260822-043',3,NULL,NULL,NULL,NULL,'2026-08-22 09:20:00','hoan_thanh',NULL),(1036,'TN20260822-044',3,NULL,NULL,NULL,NULL,'2026-08-22 15:07:00','hoan_thanh',NULL),(1037,'TN20260822-045',7,NULL,NULL,NULL,NULL,'2026-08-22 16:31:00','hoan_thanh',NULL),(1038,'TN20260822-046',9,NULL,NULL,NULL,NULL,'2026-08-22 16:48:00','hoan_thanh',NULL),(1039,'TN20260822-047',3,NULL,NULL,NULL,NULL,'2026-08-22 15:52:00','hoan_thanh',NULL),(1040,'TN20260822-048',4,NULL,NULL,NULL,NULL,'2026-08-22 08:44:00','hoan_thanh',NULL),(1041,'TN20260822-049',1,NULL,NULL,NULL,NULL,'2026-08-22 14:45:00','hoan_thanh',NULL),(1042,'TN20260822-050',8,NULL,NULL,NULL,NULL,'2026-08-22 08:49:00','hoan_thanh',NULL),(1043,'TN20260822-051',7,NULL,NULL,NULL,NULL,'2026-08-22 15:14:00','hoan_thanh',NULL),(1044,'TN20260822-052',4,NULL,NULL,NULL,NULL,'2026-08-22 08:39:00','hoan_thanh',NULL),(1045,'TN20260822-053',3,NULL,NULL,NULL,NULL,'2026-08-22 14:05:00','hoan_thanh',NULL),(1046,'TN20260822-054',1,NULL,NULL,NULL,NULL,'2026-08-22 10:27:00','hoan_thanh',NULL),(1047,'TN20260822-055',4,NULL,NULL,NULL,NULL,'2026-08-22 14:29:00','hoan_thanh',NULL),(1048,'TN20260822-056',10,NULL,NULL,NULL,NULL,'2026-08-22 11:38:00','hoan_thanh',NULL),(1049,'TN20260822-057',5,NULL,NULL,NULL,NULL,'2026-08-22 10:27:00','hoan_thanh',NULL),(1050,'TN20260822-058',3,NULL,NULL,NULL,NULL,'2026-08-22 13:12:00','hoan_thanh',NULL),(1051,'TN20260822-059',2,NULL,NULL,NULL,NULL,'2026-08-22 12:34:00','hoan_thanh',NULL),(1052,'TN20260822-060',1,NULL,NULL,NULL,NULL,'2026-08-22 08:52:00','hoan_thanh',NULL),(1053,'TN20260822-061',1,NULL,NULL,NULL,NULL,'2026-08-22 07:49:00','hoan_thanh',NULL),(1054,'TN20260822-062',5,NULL,NULL,NULL,NULL,'2026-08-22 12:13:00','hoan_thanh',NULL),(1055,'TN20260822-063',6,NULL,NULL,NULL,NULL,'2026-08-22 11:21:00','hoan_thanh',NULL),(1056,'TN20260822-064',3,NULL,NULL,NULL,NULL,'2026-08-22 12:32:00','hoan_thanh',NULL),(1057,'TN20260822-065',8,NULL,NULL,NULL,NULL,'2026-08-22 11:58:00','hoan_thanh',NULL),(1058,'TN20260822-066',8,NULL,NULL,NULL,NULL,'2026-08-22 11:23:00','hoan_thanh',NULL),(1059,'TN20260822-067',1,NULL,NULL,NULL,NULL,'2026-08-22 10:52:00','hoan_thanh',NULL),(1060,'TN20260822-068',8,NULL,NULL,NULL,NULL,'2026-08-22 08:24:00','hoan_thanh',NULL),(1061,'TN20260822-069',10,NULL,NULL,NULL,NULL,'2026-08-22 10:49:00','hoan_thanh',NULL),(1062,'TN20260822-070',4,NULL,NULL,NULL,NULL,'2026-08-22 09:35:00','hoan_thanh',NULL),(1063,'TN20260822-071',10,NULL,NULL,NULL,NULL,'2026-08-22 12:52:00','hoan_thanh',NULL),(1064,'TN20260823-001',5,NULL,NULL,NULL,NULL,'2026-08-23 10:29:00','hoan_thanh',NULL),(1065,'TN20260823-002',3,NULL,NULL,NULL,NULL,'2026-08-23 10:57:00','hoan_thanh',NULL),(1066,'TN20260823-003',9,NULL,NULL,NULL,NULL,'2026-08-23 14:38:00','hoan_thanh',NULL),(1067,'TN20260823-004',10,NULL,NULL,NULL,NULL,'2026-08-23 10:16:00','hoan_thanh',NULL),(1068,'TN20260823-005',2,NULL,NULL,NULL,NULL,'2026-08-23 11:28:00','hoan_thanh',NULL),(1069,'TN20260823-006',9,NULL,NULL,NULL,NULL,'2026-08-23 13:38:00','hoan_thanh',NULL),(1070,'TN20260823-007',5,NULL,NULL,NULL,NULL,'2026-08-23 10:02:00','hoan_thanh',NULL),(1071,'TN20260823-008',8,NULL,NULL,NULL,NULL,'2026-08-23 11:31:00','hoan_thanh',NULL),(1072,'TN20260823-009',9,NULL,NULL,NULL,NULL,'2026-08-23 13:56:00','hoan_thanh',NULL),(1073,'TN20260823-010',1,NULL,NULL,NULL,NULL,'2026-08-23 07:42:00','hoan_thanh',NULL),(1074,'TN20260823-011',2,NULL,NULL,NULL,NULL,'2026-08-23 15:44:00','hoan_thanh',NULL),(1075,'TN20260823-012',5,NULL,NULL,NULL,NULL,'2026-08-23 08:31:00','hoan_thanh',NULL),(1076,'TN20260823-013',3,NULL,NULL,NULL,NULL,'2026-08-23 12:53:00','hoan_thanh',NULL),(1077,'TN20260823-014',3,NULL,NULL,NULL,NULL,'2026-08-23 10:22:00','hoan_thanh',NULL),(1078,'TN20260823-015',6,NULL,NULL,NULL,NULL,'2026-08-23 09:32:00','hoan_thanh',NULL),(1079,'TN20260823-016',1,NULL,NULL,NULL,NULL,'2026-08-23 15:33:00','hoan_thanh',NULL),(1080,'TN20260823-017',5,NULL,NULL,NULL,NULL,'2026-08-23 14:56:00','hoan_thanh',NULL),(1081,'TN20260823-018',1,NULL,NULL,NULL,NULL,'2026-08-23 14:08:00','hoan_thanh',NULL),(1082,'TN20260823-019',7,NULL,NULL,NULL,NULL,'2026-08-23 13:29:00','hoan_thanh',NULL),(1083,'TN20260823-020',1,NULL,NULL,NULL,NULL,'2026-08-23 15:28:00','hoan_thanh',NULL),(1084,'TN20260823-021',6,NULL,NULL,NULL,NULL,'2026-08-23 15:44:00','hoan_thanh',NULL),(1085,'TN20260823-022',4,NULL,NULL,NULL,NULL,'2026-08-23 08:29:00','hoan_thanh',NULL),(1086,'TN20260823-023',7,NULL,NULL,NULL,NULL,'2026-08-23 14:12:00','hoan_thanh',NULL),(1087,'TN20260823-024',9,NULL,NULL,NULL,NULL,'2026-08-23 08:38:00','hoan_thanh',NULL),(1088,'TN20260823-025',9,NULL,NULL,NULL,NULL,'2026-08-23 16:04:00','hoan_thanh',NULL),(1089,'TN20260823-026',7,NULL,NULL,NULL,NULL,'2026-08-23 10:26:00','hoan_thanh',NULL),(1090,'TN20260823-027',2,NULL,NULL,NULL,NULL,'2026-08-23 15:10:00','hoan_thanh',NULL),(1091,'TN20260823-028',6,NULL,NULL,NULL,NULL,'2026-08-23 11:33:00','hoan_thanh',NULL),(1092,'TN20260823-029',10,NULL,NULL,NULL,NULL,'2026-08-23 09:56:00','hoan_thanh',NULL),(1093,'TN20260823-030',7,NULL,NULL,NULL,NULL,'2026-08-23 08:32:00','hoan_thanh',NULL),(1094,'TN20260824-001',2,NULL,NULL,NULL,NULL,'2026-08-24 16:56:00','hoan_thanh',NULL),(1095,'TN20260824-002',4,NULL,NULL,NULL,NULL,'2026-08-24 12:13:00','hoan_thanh',NULL),(1096,'TN20260824-003',3,NULL,NULL,NULL,NULL,'2026-08-24 16:41:00','hoan_thanh',NULL),(1097,'TN20260824-004',3,NULL,NULL,NULL,NULL,'2026-08-24 15:36:00','hoan_thanh',NULL),(1098,'TN20260824-005',2,NULL,NULL,NULL,NULL,'2026-08-24 11:36:00','hoan_thanh',NULL),(1099,'TN20260824-006',1,NULL,NULL,NULL,NULL,'2026-08-24 16:09:00','hoan_thanh',NULL),(1100,'TN20260824-007',6,NULL,NULL,NULL,NULL,'2026-08-24 08:26:00','hoan_thanh',NULL),(1101,'TN20260824-008',1,NULL,NULL,NULL,NULL,'2026-08-24 09:01:00','hoan_thanh',NULL),(1102,'TN20260824-009',7,NULL,NULL,NULL,NULL,'2026-08-24 13:29:00','hoan_thanh',NULL),(1103,'TN20260824-010',6,NULL,NULL,NULL,NULL,'2026-08-24 12:54:00','hoan_thanh',NULL),(1104,'TN20260824-011',4,NULL,NULL,NULL,NULL,'2026-08-24 16:37:00','hoan_thanh',NULL),(1105,'TN20260824-012',10,NULL,NULL,NULL,NULL,'2026-08-24 09:57:00','hoan_thanh',NULL),(1106,'TN20260824-013',2,NULL,NULL,NULL,NULL,'2026-08-24 13:15:00','hoan_thanh',NULL),(1107,'TN20260824-014',6,NULL,NULL,NULL,NULL,'2026-08-24 14:17:00','hoan_thanh',NULL),(1108,'TN20260824-015',10,NULL,NULL,NULL,NULL,'2026-08-24 13:29:00','hoan_thanh',NULL),(1109,'TN20260824-016',6,NULL,NULL,NULL,NULL,'2026-08-24 14:19:00','hoan_thanh',NULL),(1110,'TN20260824-017',4,NULL,NULL,NULL,NULL,'2026-08-24 07:02:00','hoan_thanh',NULL),(1111,'TN20260824-018',8,NULL,NULL,NULL,NULL,'2026-08-24 10:43:00','hoan_thanh',NULL),(1112,'TN20260824-019',5,NULL,NULL,NULL,NULL,'2026-08-24 13:58:00','hoan_thanh',NULL),(1113,'TN20260824-020',8,NULL,NULL,NULL,NULL,'2026-08-24 15:08:00','hoan_thanh',NULL),(1114,'TN20260824-021',10,NULL,NULL,NULL,NULL,'2026-08-24 12:36:00','hoan_thanh',NULL),(1115,'TN20260824-022',1,NULL,NULL,NULL,NULL,'2026-08-24 13:45:00','hoan_thanh',NULL),(1116,'TN20260824-023',7,NULL,NULL,NULL,NULL,'2026-08-24 13:31:00','hoan_thanh',NULL),(1117,'TN20260824-024',7,NULL,NULL,NULL,NULL,'2026-08-24 07:46:00','hoan_thanh',NULL),(1118,'TN20260824-025',7,NULL,NULL,NULL,NULL,'2026-08-24 13:50:00','hoan_thanh',NULL),(1119,'TN20260824-026',6,NULL,NULL,NULL,NULL,'2026-08-24 12:38:00','hoan_thanh',NULL),(1120,'TN20260824-027',10,NULL,NULL,NULL,NULL,'2026-08-24 10:29:00','hoan_thanh',NULL),(1121,'TN20260824-028',9,NULL,NULL,NULL,NULL,'2026-08-24 10:50:00','hoan_thanh',NULL),(1122,'TN20260824-029',6,NULL,NULL,NULL,NULL,'2026-08-24 07:57:00','hoan_thanh',NULL),(1123,'TN20260824-030',1,NULL,NULL,NULL,NULL,'2026-08-24 12:22:00','hoan_thanh',NULL),(1124,'TN20260824-031',10,NULL,NULL,NULL,NULL,'2026-08-24 16:32:00','hoan_thanh',NULL),(1125,'TN20260824-032',10,NULL,NULL,NULL,NULL,'2026-08-24 15:05:00','hoan_thanh',NULL),(1126,'TN20260824-033',1,NULL,NULL,NULL,NULL,'2026-08-24 08:14:00','hoan_thanh',NULL),(1127,'TN20260824-034',4,NULL,NULL,NULL,NULL,'2026-08-24 07:09:00','hoan_thanh',NULL),(1128,'TN20260824-035',5,NULL,NULL,NULL,NULL,'2026-08-24 12:25:00','hoan_thanh',NULL),(1129,'TN20260824-036',1,NULL,NULL,NULL,NULL,'2026-08-24 08:34:00','hoan_thanh',NULL),(1130,'TN20260824-037',6,NULL,NULL,NULL,NULL,'2026-08-24 16:28:00','hoan_thanh',NULL),(1131,'TN20260824-038',4,NULL,NULL,NULL,NULL,'2026-08-24 11:46:00','hoan_thanh',NULL),(1132,'TN20260824-039',9,NULL,NULL,NULL,NULL,'2026-08-24 09:56:00','hoan_thanh',NULL),(1133,'TN20260824-040',2,NULL,NULL,NULL,NULL,'2026-08-24 11:09:00','hoan_thanh',NULL),(1134,'TN20260824-041',9,NULL,NULL,NULL,NULL,'2026-08-24 09:00:00','hoan_thanh',NULL),(1135,'TN20260824-042',8,NULL,NULL,NULL,NULL,'2026-08-24 07:29:00','hoan_thanh',NULL),(1136,'TN20260824-043',4,NULL,NULL,NULL,NULL,'2026-08-24 07:36:00','hoan_thanh',NULL),(1137,'TN20260824-044',5,NULL,NULL,NULL,NULL,'2026-08-24 11:06:00','hoan_thanh',NULL),(1138,'TN20260824-045',1,NULL,NULL,NULL,NULL,'2026-08-24 15:07:00','hoan_thanh',NULL),(1139,'TN20260824-046',1,NULL,NULL,NULL,NULL,'2026-08-24 15:19:00','hoan_thanh',NULL),(1140,'TN20260824-047',1,NULL,NULL,NULL,NULL,'2026-08-24 10:05:00','hoan_thanh',NULL),(1141,'TN20260824-048',1,NULL,NULL,NULL,NULL,'2026-08-24 07:04:00','hoan_thanh',NULL),(1142,'TN20260824-049',3,NULL,NULL,NULL,NULL,'2026-08-24 16:49:00','hoan_thanh',NULL),(1143,'TN20260824-050',10,NULL,NULL,NULL,NULL,'2026-08-24 08:34:00','hoan_thanh',NULL),(1144,'TN20260824-051',10,NULL,NULL,NULL,NULL,'2026-08-24 07:18:00','hoan_thanh',NULL),(1145,'TN20260824-052',6,NULL,NULL,NULL,NULL,'2026-08-24 10:43:00','hoan_thanh',NULL),(1146,'TN20260824-053',7,NULL,NULL,NULL,NULL,'2026-08-24 12:26:00','hoan_thanh',NULL),(1147,'TN20260824-054',7,NULL,NULL,NULL,NULL,'2026-08-24 07:01:00','hoan_thanh',NULL),(1148,'TN20260824-055',8,NULL,NULL,NULL,NULL,'2026-08-24 14:29:00','hoan_thanh',NULL),(1149,'TN20260824-056',4,NULL,NULL,NULL,NULL,'2026-08-24 09:04:00','hoan_thanh',NULL),(1150,'TN20260824-057',3,NULL,NULL,NULL,NULL,'2026-08-24 14:14:00','hoan_thanh',NULL),(1151,'TN20260824-058',3,NULL,NULL,NULL,NULL,'2026-08-24 09:28:00','hoan_thanh',NULL),(1152,'TN20260824-059',9,NULL,NULL,NULL,NULL,'2026-08-24 10:10:00','hoan_thanh',NULL),(1153,'TN20260824-060',10,NULL,NULL,NULL,NULL,'2026-08-24 10:16:00','hoan_thanh',NULL),(1154,'TN20260824-061',1,NULL,NULL,NULL,NULL,'2026-08-24 16:33:00','hoan_thanh',NULL),(1155,'TN20260824-062',10,NULL,NULL,NULL,NULL,'2026-08-24 12:42:00','hoan_thanh',NULL),(1156,'TN20260824-063',7,NULL,NULL,NULL,NULL,'2026-08-24 07:02:00','hoan_thanh',NULL),(1157,'TN20260824-064',6,NULL,NULL,NULL,NULL,'2026-08-24 15:14:00','hoan_thanh',NULL),(1158,'TN20260824-065',2,NULL,NULL,NULL,NULL,'2026-08-24 11:43:00','hoan_thanh',NULL),(1159,'TN20260824-066',9,NULL,NULL,NULL,NULL,'2026-08-24 11:04:00','hoan_thanh',NULL),(1160,'TN20260824-067',9,NULL,NULL,NULL,NULL,'2026-08-24 16:35:00','hoan_thanh',NULL),(1161,'TN20260824-068',10,NULL,NULL,NULL,NULL,'2026-08-24 12:34:00','hoan_thanh',NULL),(1162,'TN20260824-069',2,NULL,NULL,NULL,NULL,'2026-08-24 14:32:00','hoan_thanh',NULL),(1163,'TN20260824-070',2,NULL,NULL,NULL,NULL,'2026-08-24 11:06:00','hoan_thanh',NULL),(1164,'TN20260824-071',4,NULL,NULL,NULL,NULL,'2026-08-24 11:22:00','hoan_thanh',NULL),(1165,'TN20260824-072',1,NULL,NULL,NULL,NULL,'2026-08-24 12:29:00','hoan_thanh',NULL),(1166,'TN20260825-001',6,NULL,NULL,NULL,NULL,'2026-08-25 07:14:00','hoan_thanh',NULL),(1167,'TN20260825-002',10,NULL,NULL,NULL,NULL,'2026-08-25 10:13:00','hoan_thanh',NULL),(1168,'TN20260825-003',6,NULL,NULL,NULL,NULL,'2026-08-25 10:29:00','hoan_thanh',NULL),(1169,'TN20260825-004',6,NULL,NULL,NULL,NULL,'2026-08-25 16:16:00','hoan_thanh',NULL),(1170,'TN20260825-005',4,NULL,NULL,NULL,NULL,'2026-08-25 14:19:00','hoan_thanh',NULL),(1171,'TN20260825-006',1,NULL,NULL,NULL,NULL,'2026-08-25 14:47:00','hoan_thanh',NULL),(1172,'TN20260825-007',10,NULL,NULL,NULL,NULL,'2026-08-25 07:22:00','hoan_thanh',NULL),(1173,'TN20260825-008',5,NULL,NULL,NULL,NULL,'2026-08-25 09:21:00','hoan_thanh',NULL),(1174,'TN20260825-009',8,NULL,NULL,NULL,NULL,'2026-08-25 10:02:00','hoan_thanh',NULL),(1175,'TN20260825-010',5,NULL,NULL,NULL,NULL,'2026-08-25 11:37:00','hoan_thanh',NULL),(1176,'TN20260825-011',6,NULL,NULL,NULL,NULL,'2026-08-25 16:01:00','hoan_thanh',NULL),(1177,'TN20260825-012',1,NULL,NULL,NULL,NULL,'2026-08-25 12:10:00','hoan_thanh',NULL),(1178,'TN20260825-013',9,NULL,NULL,NULL,NULL,'2026-08-25 11:23:00','hoan_thanh',NULL),(1179,'TN20260825-014',6,NULL,NULL,NULL,NULL,'2026-08-25 13:30:00','hoan_thanh',NULL),(1180,'TN20260825-015',7,NULL,NULL,NULL,NULL,'2026-08-25 16:30:00','hoan_thanh',NULL),(1181,'TN20260825-016',10,NULL,NULL,NULL,NULL,'2026-08-25 07:36:00','hoan_thanh',NULL),(1182,'TN20260825-017',10,NULL,NULL,NULL,NULL,'2026-08-25 09:24:00','hoan_thanh',NULL),(1183,'TN20260825-018',6,NULL,NULL,NULL,NULL,'2026-08-25 12:58:00','hoan_thanh',NULL),(1184,'TN20260825-019',9,NULL,NULL,NULL,NULL,'2026-08-25 14:29:00','hoan_thanh',NULL),(1185,'TN20260825-020',1,NULL,NULL,NULL,NULL,'2026-08-25 08:00:00','hoan_thanh',NULL),(1186,'TN20260825-021',1,NULL,NULL,NULL,NULL,'2026-08-25 08:00:00','hoan_thanh',NULL),(1187,'TN20260825-022',2,NULL,NULL,NULL,NULL,'2026-08-25 10:41:00','hoan_thanh',NULL),(1188,'TN20260825-023',6,NULL,NULL,NULL,NULL,'2026-08-25 11:18:00','hoan_thanh',NULL),(1189,'TN20260825-024',2,NULL,NULL,NULL,NULL,'2026-08-25 10:33:00','hoan_thanh',NULL),(1190,'TN20260825-025',1,NULL,NULL,NULL,NULL,'2026-08-25 14:35:00','hoan_thanh',NULL),(1191,'TN20260825-026',4,NULL,NULL,NULL,NULL,'2026-08-25 13:25:00','hoan_thanh',NULL),(1192,'TN20260825-027',7,NULL,NULL,NULL,NULL,'2026-08-25 15:54:00','hoan_thanh',NULL),(1193,'TN20260825-028',3,NULL,NULL,NULL,NULL,'2026-08-25 08:14:00','hoan_thanh',NULL),(1194,'TN20260825-029',1,NULL,NULL,NULL,NULL,'2026-08-25 09:54:00','hoan_thanh',NULL),(1195,'TN20260825-030',5,NULL,NULL,NULL,NULL,'2026-08-25 13:37:00','hoan_thanh',NULL),(1196,'TN20260825-031',2,NULL,NULL,NULL,NULL,'2026-08-25 11:33:00','hoan_thanh',NULL),(1197,'TN20260825-032',5,NULL,NULL,NULL,NULL,'2026-08-25 12:44:00','hoan_thanh',NULL),(1198,'TN20260825-033',8,NULL,NULL,NULL,NULL,'2026-08-25 14:24:00','hoan_thanh',NULL),(1199,'TN20260825-034',1,NULL,NULL,NULL,NULL,'2026-08-25 11:17:00','hoan_thanh',NULL),(1200,'TN20260825-035',1,NULL,NULL,NULL,NULL,'2026-08-25 10:47:00','hoan_thanh',NULL),(1201,'TN20260825-036',9,NULL,NULL,NULL,NULL,'2026-08-25 12:03:00','hoan_thanh',NULL),(1202,'TN20260825-037',4,NULL,NULL,NULL,NULL,'2026-08-25 07:11:00','hoan_thanh',NULL),(1203,'TN20260825-038',9,NULL,NULL,NULL,NULL,'2026-08-25 09:20:00','hoan_thanh',NULL),(1204,'TN20260825-039',1,NULL,NULL,NULL,NULL,'2026-08-25 10:30:00','hoan_thanh',NULL),(1205,'TN20260825-040',7,NULL,NULL,NULL,NULL,'2026-08-25 09:51:00','hoan_thanh',NULL),(1206,'TN20260825-041',5,NULL,NULL,NULL,NULL,'2026-08-25 11:16:00','hoan_thanh',NULL),(1207,'TN20260825-042',2,NULL,NULL,NULL,NULL,'2026-08-25 10:54:00','hoan_thanh',NULL),(1208,'TN20260825-043',2,NULL,NULL,NULL,NULL,'2026-08-25 13:51:00','hoan_thanh',NULL),(1209,'TN20260825-044',2,NULL,NULL,NULL,NULL,'2026-08-25 16:42:00','hoan_thanh',NULL),(1210,'TN20260825-045',7,NULL,NULL,NULL,NULL,'2026-08-25 10:13:00','hoan_thanh',NULL),(1211,'TN20260825-046',10,NULL,NULL,NULL,NULL,'2026-08-25 13:12:00','hoan_thanh',NULL),(1212,'TN20260825-047',9,NULL,NULL,NULL,NULL,'2026-08-25 10:31:00','hoan_thanh',NULL),(1213,'TN20260825-048',5,NULL,NULL,NULL,NULL,'2026-08-25 07:26:00','hoan_thanh',NULL),(1214,'TN20260825-049',6,NULL,NULL,NULL,NULL,'2026-08-25 10:27:00','hoan_thanh',NULL),(1215,'TN20260825-050',9,NULL,NULL,NULL,NULL,'2026-08-25 13:49:00','hoan_thanh',NULL),(1216,'TN20260825-051',3,NULL,NULL,NULL,NULL,'2026-08-25 14:26:00','hoan_thanh',NULL),(1217,'TN20260825-052',6,NULL,NULL,NULL,NULL,'2026-08-25 13:39:00','hoan_thanh',NULL),(1218,'TN20260825-053',6,NULL,NULL,NULL,NULL,'2026-08-25 10:06:00','hoan_thanh',NULL),(1219,'TN20260826-001',4,NULL,NULL,NULL,NULL,'2026-08-26 08:10:00','hoan_thanh',NULL),(1220,'TN20260826-002',2,NULL,NULL,NULL,NULL,'2026-08-26 08:42:00','hoan_thanh',NULL),(1221,'TN20260826-003',7,NULL,NULL,NULL,NULL,'2026-08-26 07:54:00','hoan_thanh',NULL),(1222,'TN20260826-004',7,NULL,NULL,NULL,NULL,'2026-08-26 12:24:00','hoan_thanh',NULL),(1223,'TN20260826-005',9,NULL,NULL,NULL,NULL,'2026-08-26 08:49:00','hoan_thanh',NULL),(1224,'TN20260826-006',8,NULL,NULL,NULL,NULL,'2026-08-26 10:21:00','hoan_thanh',NULL),(1225,'TN20260826-007',1,NULL,NULL,NULL,NULL,'2026-08-26 15:34:00','hoan_thanh',NULL),(1226,'TN20260826-008',2,NULL,NULL,NULL,NULL,'2026-08-26 08:30:00','hoan_thanh',NULL),(1227,'TN20260826-009',9,NULL,NULL,NULL,NULL,'2026-08-26 08:12:00','hoan_thanh',NULL),(1228,'TN20260826-010',5,NULL,NULL,NULL,NULL,'2026-08-26 15:11:00','hoan_thanh',NULL),(1229,'TN20260826-011',4,NULL,NULL,NULL,NULL,'2026-08-26 10:22:00','hoan_thanh',NULL),(1230,'TN20260826-012',4,NULL,NULL,NULL,NULL,'2026-08-26 10:46:00','hoan_thanh',NULL),(1231,'TN20260826-013',5,NULL,NULL,NULL,NULL,'2026-08-26 09:26:00','hoan_thanh',NULL),(1232,'TN20260826-014',8,NULL,NULL,NULL,NULL,'2026-08-26 13:42:00','hoan_thanh',NULL),(1233,'TN20260826-015',4,NULL,NULL,NULL,NULL,'2026-08-26 11:01:00','hoan_thanh',NULL),(1234,'TN20260826-016',1,NULL,NULL,NULL,NULL,'2026-08-26 11:45:00','hoan_thanh',NULL),(1235,'TN20260826-017',9,NULL,NULL,NULL,NULL,'2026-08-26 10:40:00','hoan_thanh',NULL),(1236,'TN20260826-018',6,NULL,NULL,NULL,NULL,'2026-08-26 16:21:00','hoan_thanh',NULL),(1237,'TN20260826-019',5,NULL,NULL,NULL,NULL,'2026-08-26 09:22:00','hoan_thanh',NULL),(1238,'TN20260826-020',5,NULL,NULL,NULL,NULL,'2026-08-26 15:07:00','hoan_thanh',NULL),(1239,'TN20260826-021',8,NULL,NULL,NULL,NULL,'2026-08-26 07:32:00','hoan_thanh',NULL),(1240,'TN20260826-022',9,NULL,NULL,NULL,NULL,'2026-08-26 16:58:00','hoan_thanh',NULL),(1241,'TN20260826-023',1,NULL,NULL,NULL,NULL,'2026-08-26 13:01:00','hoan_thanh',NULL),(1242,'TN20260826-024',8,NULL,NULL,NULL,NULL,'2026-08-26 08:44:00','hoan_thanh',NULL),(1243,'TN20260826-025',9,NULL,NULL,NULL,NULL,'2026-08-26 14:50:00','hoan_thanh',NULL),(1244,'TN20260826-026',9,NULL,NULL,NULL,NULL,'2026-08-26 10:17:00','hoan_thanh',NULL),(1245,'TN20260826-027',1,NULL,NULL,NULL,NULL,'2026-08-26 12:48:00','hoan_thanh',NULL),(1246,'TN20260826-028',2,NULL,NULL,NULL,NULL,'2026-08-26 07:16:00','hoan_thanh',NULL),(1247,'TN20260826-029',3,NULL,NULL,NULL,NULL,'2026-08-26 15:15:00','hoan_thanh',NULL),(1248,'TN20260826-030',6,NULL,NULL,NULL,NULL,'2026-08-26 15:24:00','hoan_thanh',NULL),(1249,'TN20260826-031',2,NULL,NULL,NULL,NULL,'2026-08-26 16:12:00','hoan_thanh',NULL),(1250,'TN20260826-032',9,NULL,NULL,NULL,NULL,'2026-08-26 11:24:00','hoan_thanh',NULL),(1251,'TN20260826-033',7,NULL,NULL,NULL,NULL,'2026-08-26 10:03:00','hoan_thanh',NULL),(1252,'TN20260826-034',9,NULL,NULL,NULL,NULL,'2026-08-26 08:11:00','hoan_thanh',NULL),(1253,'TN20260826-035',6,NULL,NULL,NULL,NULL,'2026-08-26 12:53:00','hoan_thanh',NULL),(1254,'TN20260826-036',1,NULL,NULL,NULL,NULL,'2026-08-26 14:57:00','hoan_thanh',NULL),(1255,'TN20260826-037',1,NULL,NULL,NULL,NULL,'2026-08-26 11:06:00','hoan_thanh',NULL),(1256,'TN20260826-038',9,NULL,NULL,NULL,NULL,'2026-08-26 11:17:00','hoan_thanh',NULL),(1257,'TN20260826-039',3,NULL,NULL,NULL,NULL,'2026-08-26 09:58:00','hoan_thanh',NULL),(1258,'TN20260826-040',8,NULL,NULL,NULL,NULL,'2026-08-26 11:09:00','hoan_thanh',NULL),(1259,'TN20260826-041',6,NULL,NULL,NULL,NULL,'2026-08-26 12:30:00','hoan_thanh',NULL),(1260,'TN20260826-042',4,NULL,NULL,NULL,NULL,'2026-08-26 14:10:00','hoan_thanh',NULL),(1261,'TN20260826-043',6,NULL,NULL,NULL,NULL,'2026-08-26 16:12:00','hoan_thanh',NULL),(1262,'TN20260826-044',8,NULL,NULL,NULL,NULL,'2026-08-26 14:56:00','hoan_thanh',NULL),(1263,'TN20260826-045',1,NULL,NULL,NULL,NULL,'2026-08-26 16:43:00','hoan_thanh',NULL),(1264,'TN20260826-046',5,NULL,NULL,NULL,NULL,'2026-08-26 15:21:00','hoan_thanh',NULL),(1265,'TN20260826-047',9,NULL,NULL,NULL,NULL,'2026-08-26 16:14:00','hoan_thanh',NULL),(1266,'TN20260826-048',1,NULL,NULL,NULL,NULL,'2026-08-26 07:49:00','hoan_thanh',NULL),(1267,'TN20260826-049',2,NULL,NULL,NULL,NULL,'2026-08-26 08:04:00','hoan_thanh',NULL),(1268,'TN20260827-001',4,NULL,NULL,NULL,NULL,'2026-08-27 08:32:00','hoan_thanh',NULL),(1269,'TN20260827-002',9,NULL,NULL,NULL,NULL,'2026-08-27 10:26:00','hoan_thanh',NULL),(1270,'TN20260827-003',9,NULL,NULL,NULL,NULL,'2026-08-27 10:17:00','hoan_thanh',NULL),(1271,'TN20260827-004',4,NULL,NULL,NULL,NULL,'2026-08-27 13:09:00','hoan_thanh',NULL),(1272,'TN20260827-005',9,NULL,NULL,NULL,NULL,'2026-08-27 10:42:00','hoan_thanh',NULL),(1273,'TN20260827-006',4,NULL,NULL,NULL,NULL,'2026-08-27 16:00:00','hoan_thanh',NULL),(1274,'TN20260827-007',9,NULL,NULL,NULL,NULL,'2026-08-27 14:37:00','hoan_thanh',NULL),(1275,'TN20260827-008',8,NULL,NULL,NULL,NULL,'2026-08-27 13:17:00','hoan_thanh',NULL),(1276,'TN20260827-009',3,NULL,NULL,NULL,NULL,'2026-08-27 16:04:00','hoan_thanh',NULL),(1277,'TN20260827-010',8,NULL,NULL,NULL,NULL,'2026-08-27 09:58:00','hoan_thanh',NULL),(1278,'TN20260827-011',6,NULL,NULL,NULL,NULL,'2026-08-27 16:48:00','hoan_thanh',NULL),(1279,'TN20260827-012',4,NULL,NULL,NULL,NULL,'2026-08-27 16:12:00','hoan_thanh',NULL),(1280,'TN20260827-013',8,NULL,NULL,NULL,NULL,'2026-08-27 15:41:00','hoan_thanh',NULL),(1281,'TN20260827-014',3,NULL,NULL,NULL,NULL,'2026-08-27 11:37:00','hoan_thanh',NULL),(1282,'TN20260827-015',8,NULL,NULL,NULL,NULL,'2026-08-27 15:44:00','hoan_thanh',NULL),(1283,'TN20260827-016',6,NULL,NULL,NULL,NULL,'2026-08-27 08:29:00','hoan_thanh',NULL),(1284,'TN20260827-017',7,NULL,NULL,NULL,NULL,'2026-08-27 12:29:00','hoan_thanh',NULL),(1285,'TN20260827-018',4,NULL,NULL,NULL,NULL,'2026-08-27 15:18:00','hoan_thanh',NULL),(1286,'TN20260827-019',9,NULL,NULL,NULL,NULL,'2026-08-27 11:26:00','hoan_thanh',NULL),(1287,'TN20260827-020',10,NULL,NULL,NULL,NULL,'2026-08-27 09:53:00','hoan_thanh',NULL),(1288,'TN20260827-021',2,NULL,NULL,NULL,NULL,'2026-08-27 09:00:00','hoan_thanh',NULL),(1289,'TN20260827-022',2,NULL,NULL,NULL,NULL,'2026-08-27 14:06:00','hoan_thanh',NULL),(1290,'TN20260827-023',3,NULL,NULL,NULL,NULL,'2026-08-27 16:01:00','hoan_thanh',NULL),(1291,'TN20260827-024',5,NULL,NULL,NULL,NULL,'2026-08-27 08:09:00','hoan_thanh',NULL),(1292,'TN20260827-025',5,NULL,NULL,NULL,NULL,'2026-08-27 09:25:00','hoan_thanh',NULL),(1293,'TN20260827-026',6,NULL,NULL,NULL,NULL,'2026-08-27 11:17:00','hoan_thanh',NULL),(1294,'TN20260827-027',10,NULL,NULL,NULL,NULL,'2026-08-27 15:01:00','hoan_thanh',NULL),(1295,'TN20260827-028',10,NULL,NULL,NULL,NULL,'2026-08-27 11:20:00','hoan_thanh',NULL),(1296,'TN20260827-029',8,NULL,NULL,NULL,NULL,'2026-08-27 08:11:00','hoan_thanh',NULL),(1297,'TN20260827-030',2,NULL,NULL,NULL,NULL,'2026-08-27 12:44:00','hoan_thanh',NULL),(1298,'TN20260827-031',10,NULL,NULL,NULL,NULL,'2026-08-27 13:31:00','hoan_thanh',NULL),(1299,'TN20260827-032',5,NULL,NULL,NULL,NULL,'2026-08-27 07:06:00','hoan_thanh',NULL),(1300,'TN20260827-033',6,NULL,NULL,NULL,NULL,'2026-08-27 09:03:00','hoan_thanh',NULL),(1301,'TN20260827-034',6,NULL,NULL,NULL,NULL,'2026-08-27 08:30:00','hoan_thanh',NULL),(1302,'TN20260827-035',4,NULL,NULL,NULL,NULL,'2026-08-27 08:11:00','hoan_thanh',NULL),(1303,'TN20260827-036',4,NULL,NULL,NULL,NULL,'2026-08-27 10:40:00','hoan_thanh',NULL),(1304,'TN20260827-037',9,NULL,NULL,NULL,NULL,'2026-08-27 13:04:00','hoan_thanh',NULL),(1305,'TN20260827-038',3,NULL,NULL,NULL,NULL,'2026-08-27 10:58:00','hoan_thanh',NULL),(1306,'TN20260827-039',1,NULL,NULL,NULL,NULL,'2026-08-27 14:13:00','hoan_thanh',NULL),(1307,'TN20260827-040',6,NULL,NULL,NULL,NULL,'2026-08-27 08:09:00','hoan_thanh',NULL),(1308,'TN20260827-041',6,NULL,NULL,NULL,NULL,'2026-08-27 16:29:00','hoan_thanh',NULL),(1309,'TN20260827-042',6,NULL,NULL,NULL,NULL,'2026-08-27 11:07:00','hoan_thanh',NULL),(1310,'TN20260827-043',3,NULL,NULL,NULL,NULL,'2026-08-27 13:09:00','hoan_thanh',NULL),(1311,'TN20260827-044',8,NULL,NULL,NULL,NULL,'2026-08-27 15:29:00','hoan_thanh',NULL),(1312,'TN20260827-045',9,NULL,NULL,NULL,NULL,'2026-08-27 13:23:00','hoan_thanh',NULL),(1313,'TN20260827-046',9,NULL,NULL,NULL,NULL,'2026-08-27 08:33:00','hoan_thanh',NULL),(1314,'TN20260827-047',10,NULL,NULL,NULL,NULL,'2026-08-27 09:03:00','hoan_thanh',NULL),(1315,'TN20260827-048',4,NULL,NULL,NULL,NULL,'2026-08-27 08:13:00','hoan_thanh',NULL),(1316,'TN20260827-049',5,NULL,NULL,NULL,NULL,'2026-08-27 12:37:00','hoan_thanh',NULL),(1317,'TN20260827-050',5,NULL,NULL,NULL,NULL,'2026-08-27 13:25:00','hoan_thanh',NULL),(1318,'TN20260827-051',3,NULL,NULL,NULL,NULL,'2026-08-27 15:58:00','hoan_thanh',NULL),(1319,'TN20260827-052',7,NULL,NULL,NULL,NULL,'2026-08-27 15:35:00','hoan_thanh',NULL),(1320,'TN20260828-001',7,NULL,NULL,NULL,NULL,'2026-08-28 11:14:00','hoan_thanh',NULL),(1321,'TN20260828-002',4,NULL,NULL,NULL,NULL,'2026-08-28 13:33:00','hoan_thanh',NULL),(1322,'TN20260828-003',4,NULL,NULL,NULL,NULL,'2026-08-28 10:21:00','hoan_thanh',NULL),(1323,'TN20260828-004',7,NULL,NULL,NULL,NULL,'2026-08-28 16:29:00','hoan_thanh',NULL),(1324,'TN20260828-005',1,NULL,NULL,NULL,NULL,'2026-08-28 10:25:00','hoan_thanh',NULL),(1325,'TN20260828-006',4,NULL,NULL,NULL,NULL,'2026-08-28 11:53:00','hoan_thanh',NULL),(1326,'TN20260828-007',1,NULL,NULL,NULL,NULL,'2026-08-28 12:37:00','hoan_thanh',NULL),(1327,'TN20260828-008',7,NULL,NULL,NULL,NULL,'2026-08-28 13:13:00','hoan_thanh',NULL),(1328,'TN20260828-009',5,NULL,NULL,NULL,NULL,'2026-08-28 12:18:00','hoan_thanh',NULL),(1329,'TN20260828-010',6,NULL,NULL,NULL,NULL,'2026-08-28 13:00:00','hoan_thanh',NULL),(1330,'TN20260828-011',6,NULL,NULL,NULL,NULL,'2026-08-28 15:51:00','hoan_thanh',NULL),(1331,'TN20260828-012',7,NULL,NULL,NULL,NULL,'2026-08-28 08:57:00','hoan_thanh',NULL),(1332,'TN20260828-013',1,NULL,NULL,NULL,NULL,'2026-08-28 08:48:00','hoan_thanh',NULL),(1333,'TN20260828-014',2,NULL,NULL,NULL,NULL,'2026-08-28 10:05:00','hoan_thanh',NULL),(1334,'TN20260828-015',7,NULL,NULL,NULL,NULL,'2026-08-28 15:54:00','hoan_thanh',NULL),(1335,'TN20260828-016',3,NULL,NULL,NULL,NULL,'2026-08-28 15:49:00','hoan_thanh',NULL),(1336,'TN20260828-017',2,NULL,NULL,NULL,NULL,'2026-08-28 07:45:00','hoan_thanh',NULL),(1337,'TN20260828-018',4,NULL,NULL,NULL,NULL,'2026-08-28 13:41:00','hoan_thanh',NULL),(1338,'TN20260828-019',3,NULL,NULL,NULL,NULL,'2026-08-28 11:15:00','hoan_thanh',NULL),(1339,'TN20260828-020',1,NULL,NULL,NULL,NULL,'2026-08-28 11:50:00','hoan_thanh',NULL),(1340,'TN20260828-021',2,NULL,NULL,NULL,NULL,'2026-08-28 07:17:00','hoan_thanh',NULL),(1341,'TN20260828-022',3,NULL,NULL,NULL,NULL,'2026-08-28 14:09:00','hoan_thanh',NULL),(1342,'TN20260828-023',5,NULL,NULL,NULL,NULL,'2026-08-28 16:56:00','hoan_thanh',NULL),(1343,'TN20260828-024',7,NULL,NULL,NULL,NULL,'2026-08-28 10:57:00','hoan_thanh',NULL),(1344,'TN20260828-025',5,NULL,NULL,NULL,NULL,'2026-08-28 13:02:00','hoan_thanh',NULL),(1345,'TN20260828-026',4,NULL,NULL,NULL,NULL,'2026-08-28 08:11:00','hoan_thanh',NULL),(1346,'TN20260828-027',5,NULL,NULL,NULL,NULL,'2026-08-28 07:47:00','hoan_thanh',NULL),(1347,'TN20260828-028',8,NULL,NULL,NULL,NULL,'2026-08-28 11:26:00','hoan_thanh',NULL),(1348,'TN20260828-029',7,NULL,NULL,NULL,NULL,'2026-08-28 14:04:00','hoan_thanh',NULL),(1349,'TN20260828-030',2,NULL,NULL,NULL,NULL,'2026-08-28 15:41:00','hoan_thanh',NULL),(1350,'TN20260828-031',2,NULL,NULL,NULL,NULL,'2026-08-28 12:03:00','hoan_thanh',NULL),(1351,'TN20260828-032',5,NULL,NULL,NULL,NULL,'2026-08-28 11:35:00','hoan_thanh',NULL),(1352,'TN20260828-033',6,NULL,NULL,NULL,NULL,'2026-08-28 12:15:00','hoan_thanh',NULL),(1353,'TN20260828-034',9,NULL,NULL,NULL,NULL,'2026-08-28 12:29:00','hoan_thanh',NULL),(1354,'TN20260828-035',7,NULL,NULL,NULL,NULL,'2026-08-28 15:29:00','hoan_thanh',NULL),(1355,'TN20260828-036',8,NULL,NULL,NULL,NULL,'2026-08-28 09:12:00','hoan_thanh',NULL),(1356,'TN20260828-037',7,NULL,NULL,NULL,NULL,'2026-08-28 14:33:00','hoan_thanh',NULL),(1357,'TN20260828-038',4,NULL,NULL,NULL,NULL,'2026-08-28 14:11:00','hoan_thanh',NULL),(1358,'TN20260828-039',4,NULL,NULL,NULL,NULL,'2026-08-28 09:02:00','hoan_thanh',NULL),(1359,'TN20260828-040',2,NULL,NULL,NULL,NULL,'2026-08-28 11:06:00','hoan_thanh',NULL),(1360,'TN20260828-041',6,NULL,NULL,NULL,NULL,'2026-08-28 08:41:00','hoan_thanh',NULL),(1361,'TN20260828-042',4,NULL,NULL,NULL,NULL,'2026-08-28 16:28:00','hoan_thanh',NULL),(1362,'TN20260828-043',9,NULL,NULL,NULL,NULL,'2026-08-28 15:56:00','hoan_thanh',NULL),(1363,'TN20260828-044',10,NULL,NULL,NULL,NULL,'2026-08-28 10:13:00','hoan_thanh',NULL),(1364,'TN20260828-045',1,NULL,NULL,NULL,NULL,'2026-08-28 10:27:00','hoan_thanh',NULL),(1365,'TN20260828-046',4,NULL,NULL,NULL,NULL,'2026-08-28 15:57:00','hoan_thanh',NULL),(1366,'TN20260829-001',8,NULL,NULL,NULL,NULL,'2026-08-29 10:15:00','hoan_thanh',NULL),(1367,'TN20260829-002',2,NULL,NULL,NULL,NULL,'2026-08-29 09:35:00','hoan_thanh',NULL),(1368,'TN20260829-003',3,NULL,NULL,NULL,NULL,'2026-08-29 16:57:00','hoan_thanh',NULL),(1369,'TN20260829-004',4,NULL,NULL,NULL,NULL,'2026-08-29 14:01:00','hoan_thanh',NULL),(1370,'TN20260829-005',6,NULL,NULL,NULL,NULL,'2026-08-29 16:07:00','hoan_thanh',NULL),(1371,'TN20260829-006',3,NULL,NULL,NULL,NULL,'2026-08-29 08:09:00','hoan_thanh',NULL),(1372,'TN20260829-007',9,NULL,NULL,NULL,NULL,'2026-08-29 16:37:00','hoan_thanh',NULL),(1373,'TN20260829-008',2,NULL,NULL,NULL,NULL,'2026-08-29 08:55:00','hoan_thanh',NULL),(1374,'TN20260829-009',1,NULL,NULL,NULL,NULL,'2026-08-29 07:49:00','hoan_thanh',NULL),(1375,'TN20260829-010',6,NULL,NULL,NULL,NULL,'2026-08-29 14:00:00','hoan_thanh',NULL),(1376,'TN20260829-011',8,NULL,NULL,NULL,NULL,'2026-08-29 13:11:00','hoan_thanh',NULL),(1377,'TN20260829-012',5,NULL,NULL,NULL,NULL,'2026-08-29 10:16:00','hoan_thanh',NULL),(1378,'TN20260829-013',2,NULL,NULL,NULL,NULL,'2026-08-29 13:28:00','hoan_thanh',NULL),(1379,'TN20260829-014',9,NULL,NULL,NULL,NULL,'2026-08-29 16:34:00','hoan_thanh',NULL),(1380,'TN20260829-015',2,NULL,NULL,NULL,NULL,'2026-08-29 11:40:00','hoan_thanh',NULL),(1381,'TN20260829-016',9,NULL,NULL,NULL,NULL,'2026-08-29 15:09:00','hoan_thanh',NULL),(1382,'TN20260829-017',10,NULL,NULL,NULL,NULL,'2026-08-29 08:54:00','hoan_thanh',NULL),(1383,'TN20260829-018',9,NULL,NULL,NULL,NULL,'2026-08-29 07:16:00','hoan_thanh',NULL),(1384,'TN20260829-019',4,NULL,NULL,NULL,NULL,'2026-08-29 13:54:00','hoan_thanh',NULL),(1385,'TN20260829-020',3,NULL,NULL,NULL,NULL,'2026-08-29 07:30:00','hoan_thanh',NULL),(1386,'TN20260829-021',2,NULL,NULL,NULL,NULL,'2026-08-29 15:48:00','hoan_thanh',NULL),(1387,'TN20260829-022',3,NULL,NULL,NULL,NULL,'2026-08-29 11:03:00','hoan_thanh',NULL),(1388,'TN20260829-023',2,NULL,NULL,NULL,NULL,'2026-08-29 12:46:00','hoan_thanh',NULL),(1389,'TN20260829-024',5,NULL,NULL,NULL,NULL,'2026-08-29 15:15:00','hoan_thanh',NULL),(1390,'TN20260829-025',10,NULL,NULL,NULL,NULL,'2026-08-29 10:45:00','hoan_thanh',NULL),(1391,'TN20260829-026',3,NULL,NULL,NULL,NULL,'2026-08-29 09:07:00','hoan_thanh',NULL),(1392,'TN20260829-027',4,NULL,NULL,NULL,NULL,'2026-08-29 10:39:00','hoan_thanh',NULL),(1393,'TN20260829-028',5,NULL,NULL,NULL,NULL,'2026-08-29 14:50:00','hoan_thanh',NULL),(1394,'TN20260829-029',9,NULL,NULL,NULL,NULL,'2026-08-29 15:19:00','hoan_thanh',NULL),(1395,'TN20260829-030',4,NULL,NULL,NULL,NULL,'2026-08-29 07:17:00','hoan_thanh',NULL),(1396,'TN20260829-031',9,NULL,NULL,NULL,NULL,'2026-08-29 16:28:00','hoan_thanh',NULL),(1397,'TN20260829-032',10,NULL,NULL,NULL,NULL,'2026-08-29 13:34:00','hoan_thanh',NULL),(1398,'TN20260829-033',7,NULL,NULL,NULL,NULL,'2026-08-29 09:44:00','hoan_thanh',NULL),(1399,'TN20260829-034',1,NULL,NULL,NULL,NULL,'2026-08-29 12:52:00','hoan_thanh',NULL),(1400,'TN20260829-035',6,NULL,NULL,NULL,NULL,'2026-08-29 14:01:00','hoan_thanh',NULL),(1401,'TN20260829-036',10,NULL,NULL,NULL,NULL,'2026-08-29 10:17:00','hoan_thanh',NULL),(1402,'TN20260829-037',10,NULL,NULL,NULL,NULL,'2026-08-29 10:04:00','hoan_thanh',NULL),(1403,'TN20260829-038',7,NULL,NULL,NULL,NULL,'2026-08-29 14:01:00','hoan_thanh',NULL),(1404,'TN20260829-039',7,NULL,NULL,NULL,NULL,'2026-08-29 08:58:00','hoan_thanh',NULL),(1405,'TN20260829-040',10,NULL,NULL,NULL,NULL,'2026-08-29 16:24:00','hoan_thanh',NULL),(1406,'TN20260829-041',1,NULL,NULL,NULL,NULL,'2026-08-29 09:47:00','hoan_thanh',NULL),(1407,'TN20260829-042',1,NULL,NULL,NULL,NULL,'2026-08-29 13:35:00','hoan_thanh',NULL),(1408,'TN20260829-043',2,NULL,NULL,NULL,NULL,'2026-08-29 07:24:00','hoan_thanh',NULL),(1409,'TN20260829-044',1,NULL,NULL,NULL,NULL,'2026-08-29 14:11:00','hoan_thanh',NULL),(1410,'TN20260829-045',1,NULL,NULL,NULL,NULL,'2026-08-29 08:36:00','hoan_thanh',NULL),(1411,'TN20260829-046',10,NULL,NULL,NULL,NULL,'2026-08-29 09:17:00','hoan_thanh',NULL),(1412,'TN20260829-047',7,NULL,NULL,NULL,NULL,'2026-08-29 16:27:00','hoan_thanh',NULL),(1413,'TN20260829-048',5,NULL,NULL,NULL,NULL,'2026-08-29 16:50:00','hoan_thanh',NULL),(1414,'TN20260829-049',8,NULL,NULL,NULL,NULL,'2026-08-29 14:36:00','hoan_thanh',NULL),(1415,'TN20260829-050',5,NULL,NULL,NULL,NULL,'2026-08-29 09:44:00','hoan_thanh',NULL),(1416,'TN20260829-051',7,NULL,NULL,NULL,NULL,'2026-08-29 16:43:00','hoan_thanh',NULL),(1417,'TN20260829-052',4,NULL,NULL,NULL,NULL,'2026-08-29 10:25:00','hoan_thanh',NULL),(1418,'TN20260829-053',2,NULL,NULL,NULL,NULL,'2026-08-29 13:23:00','hoan_thanh',NULL),(1419,'TN20260829-054',1,NULL,NULL,NULL,NULL,'2026-08-29 10:41:00','hoan_thanh',NULL),(1420,'TN20260829-055',3,NULL,NULL,NULL,NULL,'2026-08-29 11:01:00','hoan_thanh',NULL),(1421,'TN20260829-056',7,NULL,NULL,NULL,NULL,'2026-08-29 07:24:00','hoan_thanh',NULL),(1422,'TN20260829-057',4,NULL,NULL,NULL,NULL,'2026-08-29 07:26:00','hoan_thanh',NULL),(1423,'TN20260829-058',6,NULL,NULL,NULL,NULL,'2026-08-29 11:57:00','hoan_thanh',NULL),(1424,'TN20260829-059',7,NULL,NULL,NULL,NULL,'2026-08-29 13:06:00','hoan_thanh',NULL),(1425,'TN20260829-060',4,NULL,NULL,NULL,NULL,'2026-08-29 07:54:00','hoan_thanh',NULL),(1426,'TN20260829-061',10,NULL,NULL,NULL,NULL,'2026-08-29 16:28:00','hoan_thanh',NULL),(1427,'TN20260829-062',4,NULL,NULL,NULL,NULL,'2026-08-29 10:18:00','hoan_thanh',NULL),(1428,'TN20260829-063',8,NULL,NULL,NULL,NULL,'2026-08-29 08:46:00','hoan_thanh',NULL),(1429,'TN20260829-064',3,NULL,NULL,NULL,NULL,'2026-08-29 11:11:00','hoan_thanh',NULL),(1430,'TN20260829-065',8,NULL,NULL,NULL,NULL,'2026-08-29 14:50:00','hoan_thanh',NULL),(1431,'TN20260829-066',2,NULL,NULL,NULL,NULL,'2026-08-29 07:22:00','hoan_thanh',NULL),(1432,'TN20260830-001',3,NULL,NULL,NULL,NULL,'2026-08-30 15:28:00','hoan_thanh',NULL),(1433,'TN20260830-002',1,NULL,NULL,NULL,NULL,'2026-08-30 07:43:00','hoan_thanh',NULL),(1434,'TN20260830-003',10,NULL,NULL,NULL,NULL,'2026-08-30 09:09:00','hoan_thanh',NULL),(1435,'TN20260830-004',2,NULL,NULL,NULL,NULL,'2026-08-30 11:24:00','hoan_thanh',NULL),(1436,'TN20260830-005',3,NULL,NULL,NULL,NULL,'2026-08-30 16:41:00','hoan_thanh',NULL),(1437,'TN20260830-006',5,NULL,NULL,NULL,NULL,'2026-08-30 13:26:00','hoan_thanh',NULL),(1438,'TN20260830-007',8,NULL,NULL,NULL,NULL,'2026-08-30 08:25:00','hoan_thanh',NULL),(1439,'TN20260830-008',3,NULL,NULL,NULL,NULL,'2026-08-30 15:18:00','hoan_thanh',NULL),(1440,'TN20260830-009',8,NULL,NULL,NULL,NULL,'2026-08-30 07:50:00','hoan_thanh',NULL),(1441,'TN20260830-010',6,NULL,NULL,NULL,NULL,'2026-08-30 12:02:00','hoan_thanh',NULL),(1442,'TN20260830-011',2,NULL,NULL,NULL,NULL,'2026-08-30 09:13:00','hoan_thanh',NULL),(1443,'TN20260830-012',4,NULL,NULL,NULL,NULL,'2026-08-30 16:27:00','hoan_thanh',NULL),(1444,'TN20260830-013',9,NULL,NULL,NULL,NULL,'2026-08-30 14:27:00','hoan_thanh',NULL),(1445,'TN20260830-014',4,NULL,NULL,NULL,NULL,'2026-08-30 10:02:00','hoan_thanh',NULL),(1446,'TN20260830-015',7,NULL,NULL,NULL,NULL,'2026-08-30 16:18:00','hoan_thanh',NULL),(1447,'TN20260830-016',5,NULL,NULL,NULL,NULL,'2026-08-30 13:10:00','hoan_thanh',NULL),(1448,'TN20260830-017',10,NULL,NULL,NULL,NULL,'2026-08-30 08:43:00','hoan_thanh',NULL),(1449,'TN20260830-018',6,NULL,NULL,NULL,NULL,'2026-08-30 13:15:00','hoan_thanh',NULL),(1450,'TN20260830-019',9,NULL,NULL,NULL,NULL,'2026-08-30 12:21:00','hoan_thanh',NULL),(1451,'TN20260830-020',2,NULL,NULL,NULL,NULL,'2026-08-30 13:03:00','hoan_thanh',NULL),(1452,'TN20260830-021',5,NULL,NULL,NULL,NULL,'2026-08-30 12:51:00','hoan_thanh',NULL),(1453,'TN20260830-022',2,NULL,NULL,NULL,NULL,'2026-08-30 11:41:00','hoan_thanh',NULL),(1454,'TN20260830-023',1,NULL,NULL,NULL,NULL,'2026-08-30 12:03:00','hoan_thanh',NULL),(1455,'TN20260831-001',5,NULL,NULL,NULL,NULL,'2026-08-31 15:18:00','hoan_thanh',NULL),(1456,'TN20260831-002',5,NULL,NULL,NULL,NULL,'2026-08-31 12:04:00','hoan_thanh',NULL),(1457,'TN20260831-003',3,NULL,NULL,NULL,NULL,'2026-08-31 09:45:00','hoan_thanh',NULL),(1458,'TN20260831-004',5,NULL,NULL,NULL,NULL,'2026-08-31 10:57:00','hoan_thanh',NULL),(1459,'TN20260831-005',4,NULL,NULL,NULL,NULL,'2026-08-31 07:39:00','hoan_thanh',NULL),(1460,'TN20260831-006',4,NULL,NULL,NULL,NULL,'2026-08-31 09:45:00','hoan_thanh',NULL),(1461,'TN20260831-007',4,NULL,NULL,NULL,NULL,'2026-08-31 13:16:00','hoan_thanh',NULL),(1462,'TN20260831-008',8,NULL,NULL,NULL,NULL,'2026-08-31 11:47:00','hoan_thanh',NULL),(1463,'TN20260831-009',2,NULL,NULL,NULL,NULL,'2026-08-31 16:57:00','hoan_thanh',NULL),(1464,'TN20260831-010',7,NULL,NULL,NULL,NULL,'2026-08-31 15:23:00','hoan_thanh',NULL),(1465,'TN20260831-011',7,NULL,NULL,NULL,NULL,'2026-08-31 15:46:00','hoan_thanh',NULL),(1466,'TN20260831-012',3,NULL,NULL,NULL,NULL,'2026-08-31 12:22:00','hoan_thanh',NULL),(1467,'TN20260831-013',7,NULL,NULL,NULL,NULL,'2026-08-31 10:09:00','hoan_thanh',NULL),(1468,'TN20260831-014',2,NULL,NULL,NULL,NULL,'2026-08-31 09:49:00','hoan_thanh',NULL),(1469,'TN20260831-015',2,NULL,NULL,NULL,NULL,'2026-08-31 12:09:00','hoan_thanh',NULL),(1470,'TN20260831-016',7,NULL,NULL,NULL,NULL,'2026-08-31 12:02:00','hoan_thanh',NULL),(1471,'TN20260831-017',2,NULL,NULL,NULL,NULL,'2026-08-31 07:40:00','hoan_thanh',NULL),(1472,'TN20260831-018',6,NULL,NULL,NULL,NULL,'2026-08-31 10:54:00','hoan_thanh',NULL),(1473,'TN20260831-019',1,NULL,NULL,NULL,NULL,'2026-08-31 07:03:00','hoan_thanh',NULL),(1474,'TN20260831-020',4,NULL,NULL,NULL,NULL,'2026-08-31 08:53:00','hoan_thanh',NULL),(1475,'TN20260831-021',4,NULL,NULL,NULL,NULL,'2026-08-31 14:55:00','hoan_thanh',NULL),(1476,'TN20260831-022',2,NULL,NULL,NULL,NULL,'2026-08-31 07:32:00','hoan_thanh',NULL),(1477,'TN20260831-023',4,NULL,NULL,NULL,NULL,'2026-08-31 14:31:00','hoan_thanh',NULL),(1478,'TN20260831-024',8,NULL,NULL,NULL,NULL,'2026-08-31 13:08:00','hoan_thanh',NULL),(1479,'TN20260831-025',8,NULL,NULL,NULL,NULL,'2026-08-31 11:09:00','hoan_thanh',NULL),(1480,'TN20260831-026',5,NULL,NULL,NULL,NULL,'2026-08-31 11:40:00','hoan_thanh',NULL),(1481,'TN20260831-027',2,NULL,NULL,NULL,NULL,'2026-08-31 07:53:00','hoan_thanh',NULL),(1482,'TN20260831-028',8,NULL,NULL,NULL,NULL,'2026-08-31 08:57:00','hoan_thanh',NULL),(1483,'TN20260831-029',1,NULL,NULL,NULL,NULL,'2026-08-31 09:41:00','hoan_thanh',NULL),(1484,'TN20260831-030',4,NULL,NULL,NULL,NULL,'2026-08-31 07:18:00','hoan_thanh',NULL),(1485,'TN20260831-031',6,NULL,NULL,NULL,NULL,'2026-08-31 09:29:00','hoan_thanh',NULL),(1486,'TN20260831-032',4,NULL,NULL,NULL,NULL,'2026-08-31 09:55:00','hoan_thanh',NULL),(1487,'TN20260831-033',1,NULL,NULL,NULL,NULL,'2026-08-31 07:02:00','hoan_thanh',NULL),(1488,'TN20260831-034',5,NULL,NULL,NULL,NULL,'2026-08-31 14:35:00','hoan_thanh',NULL),(1489,'TN20260831-035',4,NULL,NULL,NULL,NULL,'2026-08-31 14:58:00','hoan_thanh',NULL),(1490,'TN20260831-036',8,NULL,NULL,NULL,NULL,'2026-08-31 09:43:00','hoan_thanh',NULL),(1491,'TN20260831-037',10,NULL,NULL,NULL,NULL,'2026-08-31 11:40:00','hoan_thanh',NULL),(1492,'TN20260831-038',9,NULL,NULL,NULL,NULL,'2026-08-31 12:58:00','hoan_thanh',NULL),(1493,'TN20260831-039',8,NULL,NULL,NULL,NULL,'2026-08-31 14:32:00','hoan_thanh',NULL),(1494,'TN20260831-040',10,NULL,NULL,NULL,NULL,'2026-08-31 15:26:00','hoan_thanh',NULL),(1495,'TN20260831-041',8,NULL,NULL,NULL,NULL,'2026-08-31 11:24:00','hoan_thanh',NULL),(1496,'TN20260831-042',2,NULL,NULL,NULL,NULL,'2026-08-31 16:01:00','hoan_thanh',NULL),(1497,'TN20260831-043',3,NULL,NULL,NULL,NULL,'2026-08-31 14:29:00','hoan_thanh',NULL),(1498,'TN20260831-044',8,NULL,NULL,NULL,NULL,'2026-08-31 08:51:00','hoan_thanh',NULL),(1499,'TN20260831-045',8,NULL,NULL,NULL,NULL,'2026-08-31 11:14:00','hoan_thanh',NULL),(1500,'TN20260831-046',5,NULL,NULL,NULL,NULL,'2026-08-31 12:35:00','hoan_thanh',NULL),(1501,'TN20260831-047',2,NULL,NULL,NULL,NULL,'2026-08-31 12:31:00','hoan_thanh',NULL),(1502,'TN20260831-048',4,NULL,NULL,NULL,NULL,'2026-08-31 10:17:00','hoan_thanh',NULL),(1503,'TN20260831-049',9,NULL,NULL,NULL,NULL,'2026-08-31 12:08:00','hoan_thanh',NULL),(1504,'TN20260831-050',5,NULL,NULL,NULL,NULL,'2026-08-31 12:47:00','hoan_thanh',NULL),(1505,'TN20260831-051',1,NULL,NULL,NULL,NULL,'2026-08-31 16:04:00','hoan_thanh',NULL),(1506,'TN20260831-052',4,NULL,NULL,NULL,NULL,'2026-08-31 13:20:00','hoan_thanh',NULL),(1507,'TN20260831-053',6,NULL,NULL,NULL,NULL,'2026-08-31 13:53:00','hoan_thanh',NULL),(1508,'TN20260831-054',1,NULL,NULL,NULL,NULL,'2026-08-31 07:13:00','hoan_thanh',NULL),(1509,'TN20260831-055',7,NULL,NULL,NULL,NULL,'2026-08-31 11:30:00','hoan_thanh',NULL),(1510,'TN20260831-056',5,NULL,NULL,NULL,NULL,'2026-08-31 13:28:00','hoan_thanh',NULL),(1511,'TN20260831-057',5,NULL,NULL,NULL,NULL,'2026-08-31 15:33:00','hoan_thanh',NULL),(1512,'TN20260831-058',5,NULL,NULL,NULL,NULL,'2026-08-31 07:26:00','hoan_thanh',NULL),(1513,'TN20260831-059',9,NULL,NULL,NULL,NULL,'2026-08-31 16:12:00','hoan_thanh',NULL),(1514,'TN20260831-060',5,NULL,NULL,NULL,NULL,'2026-08-31 12:56:00','hoan_thanh',NULL),(1515,'TN20260831-061',1,NULL,NULL,NULL,NULL,'2026-08-31 08:58:00','hoan_thanh',NULL),(1516,'TN20260831-062',5,NULL,NULL,NULL,NULL,'2026-08-31 12:14:00','hoan_thanh',NULL),(1517,'TN20260831-063',4,NULL,NULL,NULL,NULL,'2026-08-31 13:29:00','hoan_thanh',NULL),(1518,'TN20260831-064',9,NULL,NULL,NULL,NULL,'2026-08-31 13:18:00','hoan_thanh',NULL),(1519,'TN20260831-065',3,NULL,NULL,NULL,NULL,'2026-08-31 14:27:00','hoan_thanh',NULL),(1520,'TN20260831-066',9,NULL,NULL,NULL,NULL,'2026-08-31 16:04:00','hoan_thanh',NULL),(1521,'TN20260831-067',7,NULL,NULL,NULL,NULL,'2026-08-31 14:08:00','hoan_thanh',NULL),(1522,'TN20260831-068',8,NULL,NULL,NULL,NULL,'2026-08-31 14:34:00','hoan_thanh',NULL),(1523,'TN20260831-069',5,NULL,NULL,NULL,NULL,'2026-08-31 12:56:00','hoan_thanh',NULL),(1524,'TN20260831-070',2,NULL,NULL,NULL,NULL,'2026-08-31 15:48:00','hoan_thanh',NULL),(1525,'TN20260831-071',10,NULL,NULL,NULL,NULL,'2026-08-31 11:55:00','hoan_thanh',NULL),(1526,'TN20260831-072',5,NULL,NULL,NULL,NULL,'2026-08-31 12:08:00','hoan_thanh',NULL),(1527,'TN20260901-001',4,NULL,NULL,NULL,NULL,'2026-09-01 08:47:00','hoan_thanh',NULL),(1528,'TN20260901-002',5,NULL,NULL,NULL,NULL,'2026-09-01 13:19:00','hoan_thanh',NULL),(1529,'TN20260901-003',5,NULL,NULL,NULL,NULL,'2026-09-01 09:37:00','hoan_thanh',NULL),(1530,'TN20260901-004',9,NULL,NULL,NULL,NULL,'2026-09-01 12:33:00','hoan_thanh',NULL),(1531,'TN20260901-005',8,NULL,NULL,NULL,NULL,'2026-09-01 08:01:00','hoan_thanh',NULL),(1532,'TN20260901-006',7,NULL,NULL,NULL,NULL,'2026-09-01 07:53:00','hoan_thanh',NULL),(1533,'TN20260901-007',1,NULL,NULL,NULL,NULL,'2026-09-01 15:25:00','hoan_thanh',NULL),(1534,'TN20260901-008',2,NULL,NULL,NULL,NULL,'2026-09-01 07:45:00','hoan_thanh',NULL),(1535,'TN20260901-009',10,NULL,NULL,NULL,NULL,'2026-09-01 14:21:00','hoan_thanh',NULL),(1536,'TN20260901-010',3,NULL,NULL,NULL,NULL,'2026-09-01 10:28:00','hoan_thanh',NULL),(1537,'TN20260901-011',3,NULL,NULL,NULL,NULL,'2026-09-01 10:41:00','hoan_thanh',NULL),(1538,'TN20260901-012',5,NULL,NULL,NULL,NULL,'2026-09-01 08:13:00','hoan_thanh',NULL),(1539,'TN20260901-013',7,NULL,NULL,NULL,NULL,'2026-09-01 12:51:00','hoan_thanh',NULL),(1540,'TN20260901-014',3,NULL,NULL,NULL,NULL,'2026-09-01 12:41:00','hoan_thanh',NULL),(1541,'TN20260901-015',10,NULL,NULL,NULL,NULL,'2026-09-01 11:57:00','hoan_thanh',NULL),(1542,'TN20260901-016',4,NULL,NULL,NULL,NULL,'2026-09-01 13:24:00','hoan_thanh',NULL),(1543,'TN20260901-017',6,NULL,NULL,NULL,NULL,'2026-09-01 16:46:00','hoan_thanh',NULL),(1544,'TN20260901-018',7,NULL,NULL,NULL,NULL,'2026-09-01 08:49:00','hoan_thanh',NULL),(1545,'TN20260901-019',9,NULL,NULL,NULL,NULL,'2026-09-01 16:43:00','hoan_thanh',NULL),(1546,'TN20260901-020',7,NULL,NULL,NULL,NULL,'2026-09-01 15:25:00','hoan_thanh',NULL),(1547,'TN20260901-021',3,NULL,NULL,NULL,NULL,'2026-09-01 16:17:00','hoan_thanh',NULL),(1548,'TN20260901-022',7,NULL,NULL,NULL,NULL,'2026-09-01 07:10:00','hoan_thanh',NULL),(1549,'TN20260901-023',8,NULL,NULL,NULL,NULL,'2026-09-01 15:33:00','hoan_thanh',NULL),(1550,'TN20260901-024',1,NULL,NULL,NULL,NULL,'2026-09-01 07:10:00','hoan_thanh',NULL),(1551,'TN20260901-025',10,NULL,NULL,NULL,NULL,'2026-09-01 08:03:00','hoan_thanh',NULL),(1552,'TN20260901-026',3,NULL,NULL,NULL,NULL,'2026-09-01 08:44:00','hoan_thanh',NULL),(1553,'TN20260901-027',9,NULL,NULL,NULL,NULL,'2026-09-01 16:36:00','hoan_thanh',NULL),(1554,'TN20260901-028',7,NULL,NULL,NULL,NULL,'2026-09-01 10:33:00','hoan_thanh',NULL),(1555,'TN20260901-029',6,NULL,NULL,NULL,NULL,'2026-09-01 08:14:00','hoan_thanh',NULL),(1556,'TN20260901-030',2,NULL,NULL,NULL,NULL,'2026-09-01 08:14:00','hoan_thanh',NULL),(1557,'TN20260901-031',1,NULL,NULL,NULL,NULL,'2026-09-01 13:39:00','hoan_thanh',NULL),(1558,'TN20260901-032',2,NULL,NULL,NULL,NULL,'2026-09-01 12:16:00','hoan_thanh',NULL),(1559,'TN20260901-033',3,NULL,NULL,NULL,NULL,'2026-09-01 09:44:00','hoan_thanh',NULL),(1560,'TN20260901-034',8,NULL,NULL,NULL,NULL,'2026-09-01 11:20:00','hoan_thanh',NULL),(1561,'TN20260901-035',8,NULL,NULL,NULL,NULL,'2026-09-01 08:19:00','hoan_thanh',NULL),(1562,'TN20260901-036',7,NULL,NULL,NULL,NULL,'2026-09-01 10:29:00','hoan_thanh',NULL),(1563,'TN20260901-037',3,NULL,NULL,NULL,NULL,'2026-09-01 15:17:00','hoan_thanh',NULL),(1564,'TN20260901-038',10,NULL,NULL,NULL,NULL,'2026-09-01 08:54:00','hoan_thanh',NULL),(1565,'TN20260901-039',4,NULL,NULL,NULL,NULL,'2026-09-01 15:05:00','hoan_thanh',NULL),(1566,'TN20260901-040',7,NULL,NULL,NULL,NULL,'2026-09-01 13:42:00','hoan_thanh',NULL),(1567,'TN20260901-041',1,NULL,NULL,NULL,NULL,'2026-09-01 09:07:00','hoan_thanh',NULL),(1568,'TN20260901-042',5,NULL,NULL,NULL,NULL,'2026-09-01 12:45:00','hoan_thanh',NULL),(1569,'TN20260901-043',6,NULL,NULL,NULL,NULL,'2026-09-01 11:40:00','hoan_thanh',NULL),(1570,'TN20260901-044',6,NULL,NULL,NULL,NULL,'2026-09-01 10:56:00','hoan_thanh',NULL),(1571,'TN20260901-045',8,NULL,NULL,NULL,NULL,'2026-09-01 08:14:00','hoan_thanh',NULL),(1572,'TN20260901-046',9,NULL,NULL,NULL,NULL,'2026-09-01 16:37:00','hoan_thanh',NULL),(1573,'TN20260901-047',5,NULL,NULL,NULL,NULL,'2026-09-01 15:08:00','hoan_thanh',NULL),(1574,'TN20260901-048',8,NULL,NULL,NULL,NULL,'2026-09-01 16:02:00','hoan_thanh',NULL),(1575,'TN20260901-049',8,NULL,NULL,NULL,NULL,'2026-09-01 16:29:00','hoan_thanh',NULL),(1576,'TN20260901-050',2,NULL,NULL,NULL,NULL,'2026-09-01 13:45:00','hoan_thanh',NULL),(1577,'TN20260901-051',5,NULL,NULL,NULL,NULL,'2026-09-01 14:34:00','hoan_thanh',NULL),(1578,'TN20260901-052',10,NULL,NULL,NULL,NULL,'2026-09-01 15:04:00','hoan_thanh',NULL),(1579,'TN20260902-001',7,NULL,NULL,NULL,NULL,'2026-09-02 10:39:00','hoan_thanh',NULL),(1580,'TN20260902-002',7,NULL,NULL,NULL,NULL,'2026-09-02 07:34:00','hoan_thanh',NULL),(1581,'TN20260902-003',1,NULL,NULL,NULL,NULL,'2026-09-02 08:24:00','hoan_thanh',NULL),(1582,'TN20260902-004',2,NULL,NULL,NULL,NULL,'2026-09-02 08:12:00','hoan_thanh',NULL),(1583,'TN20260902-005',2,NULL,NULL,NULL,NULL,'2026-09-02 11:44:00','hoan_thanh',NULL),(1584,'TN20260902-006',4,NULL,NULL,NULL,NULL,'2026-09-02 11:28:00','hoan_thanh',NULL),(1585,'TN20260902-007',5,NULL,NULL,NULL,NULL,'2026-09-02 12:14:00','hoan_thanh',NULL),(1586,'TN20260902-008',3,NULL,NULL,NULL,NULL,'2026-09-02 14:28:00','hoan_thanh',NULL),(1587,'TN20260902-009',3,NULL,NULL,NULL,NULL,'2026-09-02 09:41:00','hoan_thanh',NULL),(1588,'TN20260902-010',3,NULL,NULL,NULL,NULL,'2026-09-02 08:03:00','hoan_thanh',NULL),(1589,'TN20260902-011',1,NULL,NULL,NULL,NULL,'2026-09-02 09:23:00','hoan_thanh',NULL),(1590,'TN20260902-012',5,NULL,NULL,NULL,NULL,'2026-09-02 15:46:00','hoan_thanh',NULL),(1591,'TN20260902-013',4,NULL,NULL,NULL,NULL,'2026-09-02 08:53:00','hoan_thanh',NULL),(1592,'TN20260902-014',7,NULL,NULL,NULL,NULL,'2026-09-02 12:00:00','hoan_thanh',NULL),(1593,'TN20260902-015',2,NULL,NULL,NULL,NULL,'2026-09-02 10:45:00','hoan_thanh',NULL),(1594,'TN20260902-016',10,NULL,NULL,NULL,NULL,'2026-09-02 13:07:00','hoan_thanh',NULL),(1595,'TN20260902-017',6,NULL,NULL,NULL,NULL,'2026-09-02 16:08:00','hoan_thanh',NULL),(1596,'TN20260902-018',4,NULL,NULL,NULL,NULL,'2026-09-02 07:30:00','hoan_thanh',NULL),(1597,'TN20260902-019',5,NULL,NULL,NULL,NULL,'2026-09-02 08:00:00','hoan_thanh',NULL),(1598,'TN20260902-020',2,NULL,NULL,NULL,NULL,'2026-09-02 13:19:00','hoan_thanh',NULL),(1599,'TN20260902-021',5,NULL,NULL,NULL,NULL,'2026-09-02 08:22:00','hoan_thanh',NULL),(1600,'TN20260902-022',2,NULL,NULL,NULL,NULL,'2026-09-02 15:25:00','hoan_thanh',NULL),(1601,'TN20260902-023',10,NULL,NULL,NULL,NULL,'2026-09-02 11:38:00','hoan_thanh',NULL),(1602,'TN20260902-024',9,NULL,NULL,NULL,NULL,'2026-09-02 08:22:00','hoan_thanh',NULL),(1603,'TN20260902-025',3,NULL,NULL,NULL,NULL,'2026-09-02 13:38:00','hoan_thanh',NULL),(1604,'TN20260902-026',5,NULL,NULL,NULL,NULL,'2026-09-02 13:20:00','hoan_thanh',NULL),(1605,'TN20260902-027',3,NULL,NULL,NULL,NULL,'2026-09-02 15:30:00','hoan_thanh',NULL),(1606,'TN20260902-028',4,NULL,NULL,NULL,NULL,'2026-09-02 15:52:00','hoan_thanh',NULL),(1607,'TN20260902-029',5,NULL,NULL,NULL,NULL,'2026-09-02 12:19:00','hoan_thanh',NULL),(1608,'TN20260902-030',4,NULL,NULL,NULL,NULL,'2026-09-02 14:51:00','hoan_thanh',NULL),(1609,'TN20260902-031',5,NULL,NULL,NULL,NULL,'2026-09-02 15:10:00','hoan_thanh',NULL),(1610,'TN20260902-032',6,NULL,NULL,NULL,NULL,'2026-09-02 14:21:00','hoan_thanh',NULL),(1611,'TN20260902-033',1,NULL,NULL,NULL,NULL,'2026-09-02 13:31:00','hoan_thanh',NULL),(1612,'TN20260902-034',2,NULL,NULL,NULL,NULL,'2026-09-02 07:21:00','hoan_thanh',NULL),(1613,'TN20260902-035',6,NULL,NULL,NULL,NULL,'2026-09-02 12:00:00','hoan_thanh',NULL),(1614,'TN20260902-036',4,NULL,NULL,NULL,NULL,'2026-09-02 07:33:00','hoan_thanh',NULL),(1615,'TN20260902-037',1,NULL,NULL,NULL,NULL,'2026-09-02 14:42:00','hoan_thanh',NULL),(1616,'TN20260902-038',8,NULL,NULL,NULL,NULL,'2026-09-02 14:12:00','hoan_thanh',NULL),(1617,'TN20260902-039',2,NULL,NULL,NULL,NULL,'2026-09-02 12:07:00','hoan_thanh',NULL),(1618,'TN20260902-040',7,NULL,NULL,NULL,NULL,'2026-09-02 16:55:00','hoan_thanh',NULL),(1619,'TN20260902-041',1,NULL,NULL,NULL,NULL,'2026-09-02 14:21:00','hoan_thanh',NULL),(1620,'TN20260902-042',6,NULL,NULL,NULL,NULL,'2026-09-02 10:02:00','hoan_thanh',NULL),(1621,'TN20260902-043',3,NULL,NULL,NULL,NULL,'2026-09-02 10:00:00','hoan_thanh',NULL),(1622,'TN20260902-044',6,NULL,NULL,NULL,NULL,'2026-09-02 15:48:00','hoan_thanh',NULL),(1623,'TN20260902-045',1,NULL,NULL,NULL,NULL,'2026-09-02 08:58:00','hoan_thanh',NULL),(1624,'TN20260903-001',3,NULL,NULL,NULL,NULL,'2026-09-03 16:28:00','hoan_thanh',NULL),(1625,'TN20260903-002',10,NULL,NULL,NULL,NULL,'2026-09-03 09:33:00','hoan_thanh',NULL),(1626,'TN20260903-003',6,NULL,NULL,NULL,NULL,'2026-09-03 11:18:00','hoan_thanh',NULL),(1627,'TN20260903-004',9,NULL,NULL,NULL,NULL,'2026-09-03 14:55:00','hoan_thanh',NULL),(1628,'TN20260903-005',5,NULL,NULL,NULL,NULL,'2026-09-03 14:14:00','hoan_thanh',NULL),(1629,'TN20260903-006',4,NULL,NULL,NULL,NULL,'2026-09-03 13:39:00','hoan_thanh',NULL),(1630,'TN20260903-007',3,NULL,NULL,NULL,NULL,'2026-09-03 08:05:00','hoan_thanh',NULL),(1631,'TN20260903-008',7,NULL,NULL,NULL,NULL,'2026-09-03 09:56:00','hoan_thanh',NULL),(1632,'TN20260903-009',5,NULL,NULL,NULL,NULL,'2026-09-03 15:22:00','hoan_thanh',NULL),(1633,'TN20260903-010',6,NULL,NULL,NULL,NULL,'2026-09-03 16:48:00','hoan_thanh',NULL),(1634,'TN20260903-011',5,NULL,NULL,NULL,NULL,'2026-09-03 11:55:00','hoan_thanh',NULL),(1635,'TN20260903-012',8,NULL,NULL,NULL,NULL,'2026-09-03 12:03:00','hoan_thanh',NULL),(1636,'TN20260903-013',1,NULL,NULL,NULL,NULL,'2026-09-03 10:07:00','hoan_thanh',NULL),(1637,'TN20260903-014',3,NULL,NULL,NULL,NULL,'2026-09-03 07:42:00','hoan_thanh',NULL),(1638,'TN20260903-015',9,NULL,NULL,NULL,NULL,'2026-09-03 07:37:00','hoan_thanh',NULL),(1639,'TN20260903-016',6,NULL,NULL,NULL,NULL,'2026-09-03 15:43:00','hoan_thanh',NULL),(1640,'TN20260903-017',5,NULL,NULL,NULL,NULL,'2026-09-03 08:44:00','hoan_thanh',NULL),(1641,'TN20260903-018',10,NULL,NULL,NULL,NULL,'2026-09-03 09:45:00','hoan_thanh',NULL),(1642,'TN20260903-019',5,NULL,NULL,NULL,NULL,'2026-09-03 10:27:00','hoan_thanh',NULL),(1643,'TN20260903-020',1,NULL,NULL,NULL,NULL,'2026-09-03 10:43:00','hoan_thanh',NULL),(1644,'TN20260903-021',9,NULL,NULL,NULL,NULL,'2026-09-03 11:34:00','hoan_thanh',NULL),(1645,'TN20260903-022',1,NULL,NULL,NULL,NULL,'2026-09-03 10:19:00','hoan_thanh',NULL),(1646,'TN20260903-023',3,NULL,NULL,NULL,NULL,'2026-09-03 09:08:00','hoan_thanh',NULL),(1647,'TN20260903-024',8,NULL,NULL,NULL,NULL,'2026-09-03 08:53:00','hoan_thanh',NULL),(1648,'TN20260903-025',2,NULL,NULL,NULL,NULL,'2026-09-03 11:48:00','hoan_thanh',NULL),(1649,'TN20260903-026',10,NULL,NULL,NULL,NULL,'2026-09-03 15:38:00','hoan_thanh',NULL),(1650,'TN20260903-027',8,NULL,NULL,NULL,NULL,'2026-09-03 09:30:00','hoan_thanh',NULL),(1651,'TN20260903-028',3,NULL,NULL,NULL,NULL,'2026-09-03 08:40:00','hoan_thanh',NULL),(1652,'TN20260903-029',6,NULL,NULL,NULL,NULL,'2026-09-03 08:39:00','hoan_thanh',NULL),(1653,'TN20260903-030',6,NULL,NULL,NULL,NULL,'2026-09-03 11:35:00','hoan_thanh',NULL),(1654,'TN20260903-031',9,NULL,NULL,NULL,NULL,'2026-09-03 16:49:00','hoan_thanh',NULL),(1655,'TN20260903-032',10,NULL,NULL,NULL,NULL,'2026-09-03 15:29:00','hoan_thanh',NULL),(1656,'TN20260903-033',7,NULL,NULL,NULL,NULL,'2026-09-03 16:28:00','hoan_thanh',NULL),(1657,'TN20260903-034',4,NULL,NULL,NULL,NULL,'2026-09-03 13:35:00','hoan_thanh',NULL),(1658,'TN20260903-035',1,NULL,NULL,NULL,NULL,'2026-09-03 12:21:00','hoan_thanh',NULL),(1659,'TN20260903-036',6,NULL,NULL,NULL,NULL,'2026-09-03 12:55:00','hoan_thanh',NULL),(1660,'TN20260903-037',9,NULL,NULL,NULL,NULL,'2026-09-03 16:34:00','hoan_thanh',NULL),(1661,'TN20260903-038',8,NULL,NULL,NULL,NULL,'2026-09-03 12:05:00','hoan_thanh',NULL),(1662,'TN20260903-039',8,NULL,NULL,NULL,NULL,'2026-09-03 11:58:00','hoan_thanh',NULL),(1663,'TN20260903-040',9,NULL,NULL,NULL,NULL,'2026-09-03 13:07:00','hoan_thanh',NULL),(1664,'TN20260903-041',6,NULL,NULL,NULL,NULL,'2026-09-03 11:35:00','hoan_thanh',NULL),(1665,'TN20260903-042',4,NULL,NULL,NULL,NULL,'2026-09-03 10:35:00','hoan_thanh',NULL),(1666,'TN20260903-043',2,NULL,NULL,NULL,NULL,'2026-09-03 10:07:00','hoan_thanh',NULL),(1667,'TN20260903-044',2,NULL,NULL,NULL,NULL,'2026-09-03 12:37:00','hoan_thanh',NULL),(1668,'TN20260903-045',10,NULL,NULL,NULL,NULL,'2026-09-03 07:51:00','hoan_thanh',NULL),(1669,'TN20260903-046',6,NULL,NULL,NULL,NULL,'2026-09-03 12:58:00','hoan_thanh',NULL),(1670,'TN20260903-047',7,NULL,NULL,NULL,NULL,'2026-09-03 12:09:00','hoan_thanh',NULL),(1671,'TN20260903-048',10,NULL,NULL,NULL,NULL,'2026-09-03 14:07:00','hoan_thanh',NULL),(1672,'TN20260903-049',4,NULL,NULL,NULL,NULL,'2026-09-03 10:19:00','hoan_thanh',NULL),(1673,'TN20260903-050',9,NULL,NULL,NULL,NULL,'2026-09-03 16:41:00','hoan_thanh',NULL),(1674,'TN20260903-051',9,NULL,NULL,NULL,NULL,'2026-09-03 11:39:00','hoan_thanh',NULL),(1675,'TN20260903-052',6,NULL,NULL,NULL,NULL,'2026-09-03 16:29:00','hoan_thanh',NULL),(1676,'TN20260904-001',1,NULL,NULL,NULL,NULL,'2026-09-04 15:39:00','hoan_thanh',NULL),(1677,'TN20260904-002',10,NULL,NULL,NULL,NULL,'2026-09-04 08:44:00','hoan_thanh',NULL),(1678,'TN20260904-003',4,NULL,NULL,NULL,NULL,'2026-09-04 12:58:00','hoan_thanh',NULL),(1679,'TN20260904-004',6,NULL,NULL,NULL,NULL,'2026-09-04 12:49:00','hoan_thanh',NULL),(1680,'TN20260904-005',4,NULL,NULL,NULL,NULL,'2026-09-04 15:25:00','hoan_thanh',NULL),(1681,'TN20260904-006',2,NULL,NULL,NULL,NULL,'2026-09-04 13:06:00','hoan_thanh',NULL),(1682,'TN20260904-007',4,NULL,NULL,NULL,NULL,'2026-09-04 15:21:00','hoan_thanh',NULL),(1683,'TN20260904-008',10,NULL,NULL,NULL,NULL,'2026-09-04 10:49:00','hoan_thanh',NULL),(1684,'TN20260904-009',3,NULL,NULL,NULL,NULL,'2026-09-04 07:47:00','hoan_thanh',NULL),(1685,'TN20260904-010',10,NULL,NULL,NULL,NULL,'2026-09-04 16:52:00','hoan_thanh',NULL),(1686,'TN20260904-011',9,NULL,NULL,NULL,NULL,'2026-09-04 10:34:00','hoan_thanh',NULL),(1687,'TN20260904-012',4,NULL,NULL,NULL,NULL,'2026-09-04 12:47:00','hoan_thanh',NULL),(1688,'TN20260904-013',7,NULL,NULL,NULL,NULL,'2026-09-04 16:35:00','hoan_thanh',NULL),(1689,'TN20260904-014',2,NULL,NULL,NULL,NULL,'2026-09-04 14:07:00','hoan_thanh',NULL),(1690,'TN20260904-015',9,NULL,NULL,NULL,NULL,'2026-09-04 13:32:00','hoan_thanh',NULL),(1691,'TN20260904-016',4,NULL,NULL,NULL,NULL,'2026-09-04 14:00:00','hoan_thanh',NULL),(1692,'TN20260904-017',1,NULL,NULL,NULL,NULL,'2026-09-04 12:18:00','hoan_thanh',NULL),(1693,'TN20260904-018',3,NULL,NULL,NULL,NULL,'2026-09-04 16:54:00','hoan_thanh',NULL),(1694,'TN20260904-019',5,NULL,NULL,NULL,NULL,'2026-09-04 11:26:00','hoan_thanh',NULL),(1695,'TN20260904-020',2,NULL,NULL,NULL,NULL,'2026-09-04 16:53:00','hoan_thanh',NULL),(1696,'TN20260904-021',6,NULL,NULL,NULL,NULL,'2026-09-04 11:09:00','hoan_thanh',NULL),(1697,'TN20260904-022',6,NULL,NULL,NULL,NULL,'2026-09-04 15:05:00','hoan_thanh',NULL),(1698,'TN20260904-023',4,NULL,NULL,NULL,NULL,'2026-09-04 08:56:00','hoan_thanh',NULL),(1699,'TN20260904-024',5,NULL,NULL,NULL,NULL,'2026-09-04 09:13:00','hoan_thanh',NULL),(1700,'TN20260904-025',1,NULL,NULL,NULL,NULL,'2026-09-04 12:45:00','hoan_thanh',NULL),(1701,'TN20260904-026',9,NULL,NULL,NULL,NULL,'2026-09-04 15:13:00','hoan_thanh',NULL),(1702,'TN20260904-027',9,NULL,NULL,NULL,NULL,'2026-09-04 16:42:00','hoan_thanh',NULL),(1703,'TN20260904-028',3,NULL,NULL,NULL,NULL,'2026-09-04 14:19:00','hoan_thanh',NULL),(1704,'TN20260904-029',1,NULL,NULL,NULL,NULL,'2026-09-04 16:31:00','hoan_thanh',NULL),(1705,'TN20260904-030',1,NULL,NULL,NULL,NULL,'2026-09-04 10:58:00','hoan_thanh',NULL),(1706,'TN20260904-031',9,NULL,NULL,NULL,NULL,'2026-09-04 16:00:00','hoan_thanh',NULL),(1707,'TN20260904-032',9,NULL,NULL,NULL,NULL,'2026-09-04 09:08:00','hoan_thanh',NULL),(1708,'TN20260904-033',4,NULL,NULL,NULL,NULL,'2026-09-04 12:55:00','hoan_thanh',NULL),(1709,'TN20260904-034',8,NULL,NULL,NULL,NULL,'2026-09-04 16:09:00','hoan_thanh',NULL),(1710,'TN20260904-035',8,NULL,NULL,NULL,NULL,'2026-09-04 07:46:00','hoan_thanh',NULL),(1711,'TN20260904-036',7,NULL,NULL,NULL,NULL,'2026-09-04 15:05:00','hoan_thanh',NULL),(1712,'TN20260904-037',10,NULL,NULL,NULL,NULL,'2026-09-04 07:18:00','hoan_thanh',NULL),(1713,'TN20260904-038',8,NULL,NULL,NULL,NULL,'2026-09-04 11:38:00','hoan_thanh',NULL),(1714,'TN20260904-039',6,NULL,NULL,NULL,NULL,'2026-09-04 08:51:00','hoan_thanh',NULL),(1715,'TN20260904-040',7,NULL,NULL,NULL,NULL,'2026-09-04 08:52:00','hoan_thanh',NULL),(1716,'TN20260904-041',4,NULL,NULL,NULL,NULL,'2026-09-04 12:56:00','hoan_thanh',NULL),(1717,'TN20260904-042',6,NULL,NULL,NULL,NULL,'2026-09-04 13:07:00','hoan_thanh',NULL),(1718,'TN20260904-043',6,NULL,NULL,NULL,NULL,'2026-09-04 08:35:00','hoan_thanh',NULL),(1719,'TN20260904-044',8,NULL,NULL,NULL,NULL,'2026-09-04 16:58:00','hoan_thanh',NULL),(1720,'TN20260904-045',9,NULL,NULL,NULL,NULL,'2026-09-04 12:09:00','hoan_thanh',NULL),(1721,'TN20260904-046',1,NULL,NULL,NULL,NULL,'2026-09-04 14:37:00','hoan_thanh',NULL),(1722,'TN20260904-047',1,NULL,NULL,NULL,NULL,'2026-09-04 07:41:00','hoan_thanh',NULL),(1723,'TN20260905-001',3,NULL,NULL,NULL,NULL,'2026-09-05 08:31:00','hoan_thanh',NULL),(1724,'TN20260905-002',4,NULL,NULL,NULL,NULL,'2026-09-05 08:50:00','hoan_thanh',NULL),(1725,'TN20260905-003',7,NULL,NULL,NULL,NULL,'2026-09-05 08:31:00','hoan_thanh',NULL),(1726,'TN20260905-004',10,NULL,NULL,NULL,NULL,'2026-09-05 08:30:00','hoan_thanh',NULL),(1727,'TN20260905-005',2,NULL,NULL,NULL,NULL,'2026-09-05 09:20:00','hoan_thanh',NULL),(1728,'TN20260905-006',6,NULL,NULL,NULL,NULL,'2026-09-05 09:49:00','hoan_thanh',NULL),(1729,'TN20260905-007',8,NULL,NULL,NULL,NULL,'2026-09-05 09:37:00','hoan_thanh',NULL),(1730,'TN20260905-008',7,NULL,NULL,NULL,NULL,'2026-09-05 09:36:00','hoan_thanh',NULL),(1731,'TN20260905-009',10,NULL,NULL,NULL,NULL,'2026-09-05 09:45:00','hoan_thanh',NULL),(1732,'TN20260905-010',5,NULL,NULL,NULL,NULL,'2026-09-05 09:05:00','hoan_thanh',NULL),(1733,'TN20260905-011',7,NULL,NULL,NULL,NULL,'2026-09-05 09:14:00','hoan_thanh',NULL),(1734,'TN20260905-012',1,NULL,NULL,NULL,NULL,'2026-09-05 10:34:00','hoan_thanh',NULL),(1735,'TN20260905-013',6,NULL,NULL,NULL,NULL,'2026-09-05 10:10:00','hoan_thanh',NULL),(1736,'TN20260905-014',10,NULL,NULL,NULL,NULL,'2026-09-05 10:39:00','hoan_thanh',NULL),(1737,'TN20260905-015',3,NULL,NULL,NULL,NULL,'2026-09-05 10:16:00','hoan_thanh',NULL),(1738,'TN20260905-016',3,NULL,NULL,NULL,NULL,'2026-09-05 10:36:00','hoan_thanh',NULL),(1739,'TN20260905-017',5,NULL,NULL,NULL,NULL,'2026-09-05 10:39:00','hoan_thanh',NULL),(1740,'TN20260905-018',8,NULL,NULL,NULL,NULL,'2026-09-05 11:08:00','hoan_thanh',NULL),(1741,'TN20260905-019',6,NULL,NULL,NULL,NULL,'2026-09-05 11:00:00','hoan_thanh',NULL),(1742,'TN20260905-020',1,NULL,NULL,NULL,NULL,'2026-09-05 11:12:00','hoan_thanh',NULL),(1743,'TN20260905-021',10,NULL,NULL,NULL,NULL,'2026-09-05 11:29:00','dang_kham',NULL),(1744,'TN20260905-022',7,NULL,NULL,NULL,NULL,'2026-09-05 13:25:00','dang_kham',NULL),(1745,'TN20260905-023',7,NULL,NULL,NULL,NULL,'2026-09-05 13:36:00','dang_kham',NULL),(1746,'TN20260905-024',10,NULL,NULL,NULL,NULL,'2026-09-05 13:33:00','dang_kham',NULL),(1747,'TN20260905-025',9,NULL,NULL,NULL,NULL,'2026-09-05 14:52:00','cho_kham',NULL),(1748,'TN20260905-026',4,NULL,NULL,NULL,NULL,'2026-09-05 14:02:00','cho_kham',NULL),(1749,'TN20260905-027',8,NULL,NULL,NULL,NULL,'2026-09-05 14:11:00','cho_kham',NULL),(1750,'TN20260905-028',10,NULL,NULL,NULL,NULL,'2026-09-05 15:04:00','cho_kham',NULL);
/*!40000 ALTER TABLE `luot_tiep_nhan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ma_xac_thuc_otp`
--

DROP TABLE IF EXISTS `ma_xac_thuc_otp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ma_xac_thuc_otp` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ma_otp` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loai` enum('dang_ky','quen_mat_khau','xac_thuc_khac') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dang_ky',
  `het_han_luc` datetime NOT NULL,
  `da_su_dung` tinyint(1) NOT NULL DEFAULT '0',
  `so_lan_thu` tinyint NOT NULL DEFAULT '0',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_loai` (`email`,`loai`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ma OTP xac thuc email khi dang ky/quen mat khau';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ma_xac_thuc_otp`
--

LOCK TABLES `ma_xac_thuc_otp` WRITE;
/*!40000 ALTER TABLE `ma_xac_thuc_otp` DISABLE KEYS */;
INSERT INTO `ma_xac_thuc_otp` VALUES (1,'nguyendinhhao170909@gmail.com','206377','dang_ky','2026-09-02 14:33:05',0,0,'2026-09-02 14:28:05'),(2,'hackhack170909@gmail.com','921298','dang_ky','2026-09-02 14:34:17',0,0,'2026-09-02 14:29:17'),(3,'hackhack1709@gmail.com','874470','dang_ky','2026-09-02 14:34:48',1,0,'2026-09-02 14:29:47'),(4,'hackhack1709@gmail.com','550338','quen_mat_khau','2026-09-02 16:04:52',1,0,'2026-09-02 15:59:51'),(5,'hackhack1709@gmail.com','589596','quen_mat_khau','2026-09-02 16:05:57',0,0,'2026-09-02 16:00:56');
/*!40000 ALTER TABLE `ma_xac_thuc_otp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoi_dung`
--

DROP TABLE IF EXISTS `nguoi_dung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nguoi_dung` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_dang_nhap` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email hoac SDT dung dang nhap',
  `mat_khau_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bcrypt hash',
  `vai_tro_id` int NOT NULL,
  `loai_tai_khoan` enum('noi_bo','benh_nhan') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'noi_bo' COMMENT 'noi_bo=nhan vien/admin, benh_nhan=tu dang ky online',
  `trang_thai` enum('hoat_dong','khoa','cho_xac_thuc') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cho_xac_thuc',
  `email_da_xac_thuc` tinyint(1) NOT NULL DEFAULT '0',
  `lan_dang_nhap_cuoi` datetime DEFAULT NULL,
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cap_nhat_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ten_dang_nhap` (`ten_dang_nhap`),
  KEY `idx_vai_tro` (`vai_tro_id`),
  KEY `idx_trang_thai` (`trang_thai`),
  CONSTRAINT `fk_nd_vaitro` FOREIGN KEY (`vai_tro_id`) REFERENCES `vai_tro` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tai khoan dang nhap he thong (dung chung nhan vien + benh nhan)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoi_dung`
--

LOCK TABLES `nguoi_dung` WRITE;
/*!40000 ALTER TABLE `nguoi_dung` DISABLE KEYS */;
INSERT INTO `nguoi_dung` VALUES (1,'admin','$2a$10$XsS1lze65s9/Lmd6f4tSnuoP7gcLLH8HplCHCvh4kw5FLn475gv/S',2,'noi_bo','hoat_dong',0,'2026-09-05 15:17:34','2026-09-01 18:55:05','2026-09-05 15:17:33'),(3,'dinhhao','$2a$10$2oBLz33IBjdalhzkD3QO6OppClF0bO3523YIc97PihQwQ0XsU1NVm',9,'benh_nhan','hoat_dong',0,'2026-09-05 14:56:02','2026-09-01 19:12:14','2026-09-05 14:56:01'),(4,'tieptan','$2a$10$Tftl0Jnpp5x9YoVeE.Z6EuNRMgBr1LNwNWGZXNmb4uKROk0IhfPNe',5,'noi_bo','hoat_dong',0,'2026-09-05 15:26:50','2026-09-01 19:23:21','2026-09-05 15:26:49'),(5,'bacsi','$2a$10$Tftl0Jnpp5x9YoVeE.Z6EuNRMgBr1LNwNWGZXNmb4uKROk0IhfPNe',4,'noi_bo','hoat_dong',0,'2026-09-05 15:26:33','2026-09-01 19:23:21','2026-09-05 15:26:32'),(6,'xetnghiem','$2a$10$Tftl0Jnpp5x9YoVeE.Z6EuNRMgBr1LNwNWGZXNmb4uKROk0IhfPNe',6,'noi_bo','hoat_dong',0,'2026-09-01 21:50:20','2026-09-01 19:23:21','2026-09-01 21:50:20'),(7,'nv1','$2a$10$T91gfyErnRN81iIEdTKq2OsabZ/9cTzM/tAAls/BhSzcRQtLsSTSK',7,'noi_bo','hoat_dong',0,'2026-09-02 22:09:50','2026-09-01 20:10:29','2026-09-02 22:09:49'),(8,'ktv2','$2a$10$DJoY01TeiDjdPMngEUfPA.LdpFqBlyKSQBAKPIUVKFEL689yZLtQ.',6,'noi_bo','hoat_dong',0,'2026-09-02 20:01:02','2026-09-01 21:49:39','2026-09-02 20:01:01'),(9,'nguyễn văn a','$2a$10$OBPTUc5tDq/CRP2zQ.uiRubdkcx86F3bzLLjuxHKPbBQHUNUQ9sFC',9,'benh_nhan','hoat_dong',0,'2026-09-01 21:52:19','2026-09-01 21:51:39','2026-09-01 21:52:19'),(10,'thungan','$2a$10$h97gE5uEfokY0wpCgZdGJ.TVM2.31wQ0dcF6FB99h.9rKeh2H8Bf6',8,'noi_bo','hoat_dong',0,NULL,'2026-09-02 08:56:09','2026-09-02 08:56:09'),(11,'thungan1','$2a$10$e0kJco60q6KIwHWxgfiiKukIxME0.TWgZYXO5S0hfulsB9lrMd/ZC',8,'noi_bo','hoat_dong',0,NULL,'2026-09-02 08:58:19','2026-09-02 08:58:19'),(12,'thng','$2a$10$aAKeKW3dwQjrwCf.3L4Fru0ElSj6wiu88bcN2X3kmeLsXb2UK6Jn.',8,'noi_bo','hoat_dong',0,'2026-09-05 15:27:24','2026-09-02 09:15:06','2026-09-05 15:27:24'),(13,'benhnhan1','$2a$10$snez7P8qgMd8acfuHfVB6.92CiR8qqAbIbWaXG.40HC/zJQvCvaXG',9,'benh_nhan','hoat_dong',0,NULL,'2026-09-02 12:07:31','2026-09-02 12:07:31'),(14,'testregpatient123','$2a$10$vOmVc5rKp1N5tX.9vTL8h.lvzQKMknRadFVrVBTGvAlgHl.154.lS',9,'benh_nhan','hoat_dong',0,NULL,'2026-09-02 12:09:39','2026-09-02 12:09:39'),(15,'benhnhan2','$2a$10$leIq4Dw7pHowrzZ1H8YRj.Wi8Y5S00deSScP5ESruhu6bO0Vl0FbO',9,'benh_nhan','hoat_dong',0,NULL,'2026-09-02 12:23:49','2026-09-02 12:23:49'),(16,'benhnhan3','$2a$10$OSja04F2KkgbRaPmxL2phetW0/1TgCZkrccR2v4.dYQd80G9aydde',9,'benh_nhan','hoat_dong',0,NULL,'2026-09-02 12:24:42','2026-09-02 12:24:42'),(17,'benhnhan4','$2a$10$98PLrHc7O3.ZILurweIyMuZlH1fCPWSphOtmPTorDjPRseSuQ.sLK',9,'benh_nhan','hoat_dong',0,'2026-09-02 14:41:59','2026-09-02 12:27:55','2026-09-02 14:41:58'),(18,'hackhack1709@gmail.com','$2a$10$6E9cZDvtyP94qF0s9TtzPufK9uN6d1EYvLjoyeOrJbBDh1M3aGJta',9,'benh_nhan','hoat_dong',1,'2026-09-02 16:46:29','2026-09-02 14:30:14','2026-09-02 16:46:29'),(19,'giamdoc','$2a$10$M2.s88zP.xqR2NJKowEghOEpj6BqL6ndKPGTlYgaKrd.H5f3oGSw2',3,'noi_bo','hoat_dong',1,'2026-09-05 15:57:56','2026-09-05 15:11:59','2026-09-05 15:57:56');
/*!40000 ALTER TABLE `nguoi_dung` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nhan_vien`
--

DROP TABLE IF EXISTS `nhan_vien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nhan_vien` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nguoi_dung_id` int NOT NULL,
  `ho_ten` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ngay_sinh` date DEFAULT NULL,
  `gioi_tinh` enum('nam','nu','khac') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_cmnd` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `so_dien_thoai` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dia_chi` text COLLATE utf8mb4_unicode_ci,
  `chuc_vu` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phong_ban_id` int DEFAULT NULL,
  `ngay_vao_lam` date DEFAULT NULL,
  `anh_dai_dien` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL Object Storage',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cap_nhat_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nguoi_dung` (`nguoi_dung_id`),
  UNIQUE KEY `uq_so_cmnd` (`so_cmnd`),
  KEY `idx_phong_ban` (`phong_ban_id`),
  CONSTRAINT `fk_nv_nguoidung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_nv_phongban` FOREIGN KEY (`phong_ban_id`) REFERENCES `phong_ban` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thong tin nhan vien';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nhan_vien`
--

LOCK TABLES `nhan_vien` WRITE;
/*!40000 ALTER TABLE `nhan_vien` DISABLE KEYS */;
INSERT INTO `nhan_vien` VALUES (1,4,'Lễ Tân Y Tế','2026-08-14','nu','0402030536','0999888777','tieptan@phongkham.vn',NULL,'tiep_tan',NULL,NULL,'/uploads/avatars/1788273624645-807638740.jpg','2026-09-01 19:23:21','2026-09-01 21:40:28'),(2,5,'Bác sĩ Nguyễn Văn A','2026-06-20','nam',NULL,'0999888777','bacsi@phongkham.vn',NULL,'bac_si',NULL,NULL,'/uploads/avatars/1788335810593-275219428.jpg','2026-09-01 19:23:21','2026-09-02 14:56:53'),(3,6,'Kỹ Thuật Viên B',NULL,'nam','040203053692','0999888777','xetnghiem@phongkham.vn',NULL,'ky_thuat_vien',NULL,NULL,NULL,'2026-09-01 19:23:21','2026-09-01 20:34:39'),(4,7,'Nhân viên thuốc 1','2026-09-01','nam','040203053698','0123456789','nv1@gmail.com',NULL,'Nhan vien nha thuoc',NULL,NULL,NULL,'2026-09-01 20:10:29','2026-09-01 20:40:17'),(5,8,'ktv2','2022-02-01','nu','','0354162165','ktv2@gmail.com',NULL,'Ky thuat vien xet nghiem',NULL,'2026-08-31','/uploads/avatars/1788274152703-69554024.jpg','2026-09-01 21:49:39','2026-09-01 21:49:39'),(7,12,'thutien','2022-02-02','nu','0403069863','0369874562','thutien@gmail.com',NULL,'Thu ngan',NULL,'2026-09-02',NULL,'2026-09-02 09:15:06','2026-09-02 09:15:06'),(8,19,'BS.CKII Nguyễn Văn Giám Đốc',NULL,NULL,NULL,'0901234567','giamdoc@phongkham.vn',NULL,'Giám Đốc Điều Hành',NULL,NULL,NULL,'2026-09-05 15:11:59','2026-09-05 15:11:59');
/*!40000 ALTER TABLE `nhan_vien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phien_chat_ai`
--

DROP TABLE IF EXISTS `phien_chat_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `phien_chat_ai` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nguoi_dung_id` int DEFAULT NULL COMMENT 'NULL neu la khach vang lai (chua dang nhap)',
  `benh_nhan_id` int DEFAULT NULL,
  `loai` enum('khai_bao_trieu_chung','tu_van_ca_nhan') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nguoidung` (`nguoi_dung_id`),
  KEY `idx_benhnhan` (`benh_nhan_id`),
  CONSTRAINT `fk_pca_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pca_nguoidung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phien chat voi tro ly AI - UC2 (khach vang lai) va UC10 (benh nhan da dang nhap)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phien_chat_ai`
--

LOCK TABLES `phien_chat_ai` WRITE;
/*!40000 ALTER TABLE `phien_chat_ai` DISABLE KEYS */;
/*!40000 ALTER TABLE `phien_chat_ai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phong_ban`
--

DROP TABLE IF EXISTS `phong_ban`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `phong_ban` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_phong_ban` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `truong_phong_id` int DEFAULT NULL,
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_pb_truongphong` (`truong_phong_id`),
  CONSTRAINT `fk_pb_truongphong` FOREIGN KEY (`truong_phong_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phong ban / Khoa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phong_ban`
--

LOCK TABLES `phong_ban` WRITE;
/*!40000 ALTER TABLE `phong_ban` DISABLE KEYS */;
INSERT INTO `phong_ban` VALUES (1,'Khoa Khám Bệnh','Tiếp nhận khám ban đầu các chuyên khoa Nội, Ngoại, Nhi',NULL,'2026-09-05 16:04:31'),(2,'Khoa Cận Lâm Sàng & Xét Nghiệm','Thực hiện xét nghiệm huyết học, sinh hóa, X-Quang, siêu âm',NULL,'2026-09-05 16:04:31'),(3,'Khoa Dược & Nhà Thuốc','Quản lý, bảo quản và cấp phát thuốc theo đơn',NULL,'2026-09-05 16:04:31'),(4,'Phòng Kế Toán & Thu Ngân','Thu viện phí, thanh toán BHYT, xuất hóa đơn chứng từ',NULL,'2026-09-05 16:04:31'),(5,'Phòng Tiếp Đón & CSKH','Hướng dẫn, phân luồng bệnh nhân và hỗ trợ đặt lịch',NULL,'2026-09-05 16:04:31');
/*!40000 ALTER TABLE `phong_ban` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phong_kham`
--

DROP TABLE IF EXISTS `phong_kham`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `phong_kham` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ten_phong` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vi_tri` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chuyen_khoa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trang_thai` enum('hoat_dong','bao_tri','dong_cua') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hoat_dong',
  `phong_ban_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `fk_pk_phongban` (`phong_ban_id`),
  CONSTRAINT `fk_pk_phongban` FOREIGN KEY (`phong_ban_id`) REFERENCES `phong_ban` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phong kham chuyen khoa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phong_kham`
--

LOCK TABLES `phong_kham` WRITE;
/*!40000 ALTER TABLE `phong_kham` DISABLE KEYS */;
INSERT INTO `phong_kham` VALUES (1,'Phòng 101 - Khám Nội Tổng Quát','Tầng 1 - Khu A','Nội tổng quát','hoat_dong',1),(2,'Phòng 102 - Khám Tim Mạch & Huyết Áp','Tầng 1 - Khu A','Tim mạch','hoat_dong',1),(3,'Phòng 103 - Khám Nhi Khoa & TMH','Tầng 1 - Khu B','Nhi khoa','hoat_dong',1),(4,'Phòng 201 - Lấy Mẫu Xét Nghiệm','Tầng 2 - Khu C','Xét nghiệm','hoat_dong',2),(5,'Phòng 202 - Siêu Âm Màu & Chẩn Đoán HA','Tầng 2 - Khu C','Chẩn đoán hình ảnh','hoat_dong',2),(6,'Phòng 203 - Chụp X-Quang Kỹ Thuật Số','Tầng 2 - Khu C','Chẩn đoán hình ảnh','hoat_dong',2),(7,'Quầy Tiếp Nhận & Kiosk 01','Sảnh chính Tầng 1','Tiếp đón','hoat_dong',5),(8,'Quầy Thu Ngân 01','Sảnh chính Tầng 1','Thu ngân','hoat_dong',4),(9,'Quầy Phát Thuốc Bệnh Viện','Sảnh chính Tầng 1','Dược','hoat_dong',3);
/*!40000 ALTER TABLE `phong_kham` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quyen_han`
--

DROP TABLE IF EXISTS `quyen_han`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quyen_han` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_quyen` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'vd: lich_hen.xem, lich_hen.tao, thuoc.xuat_kho, bao_cao.xem',
  `ten_quyen` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nhom_chuc_nang` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nhom module de hien thi UI phan quyen',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_quyen` (`ma_quyen`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh muc quyen han chi tiet';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quyen_han`
--

LOCK TABLES `quyen_han` WRITE;
/*!40000 ALTER TABLE `quyen_han` DISABLE KEYS */;
INSERT INTO `quyen_han` VALUES (1,'benh_nhan.xem','Xem danh sách Bệnh nhân','Tiếp nhận'),(2,'benh_nhan.them','Thêm hồ sơ Bệnh nhân','Tiếp nhận'),(3,'lich_hen.xem','Xem lịch hẹn','Tiếp nhận'),(4,'lich_hen.duyet','Duyệt / Hủy lịch hẹn','Tiếp nhận'),(5,'kham_benh.kham','Thực hiện Khám bệnh','Phòng khám'),(6,'kham_benh.xem_lich_su','Xem lịch sử khám','Phòng khám'),(7,'chi_dinh.tao','Tạo chỉ định xét nghiệm','Phòng khám'),(8,'xet_nghiem.xem','Xem yêu cầu xét nghiệm','Cận lâm sàng'),(9,'xet_nghiem.nhap_kq','Nhập kết quả xét nghiệm','Cận lâm sàng'),(10,'thuoc.xem','Xem kho thuốc','Dược'),(11,'thuoc.nhap_kho','Nhập kho','Dược'),(12,'thuoc.xuat_kho','Phát thuốc','Dược'),(13,'hoa_don.xem','Xem hóa đơn','Tài chính'),(14,'hoa_don.thanh_toan','Thu tiền','Tài chính'),(15,'bao_cao.doanh_thu','Xem báo cáo doanh thu','Thống kê');
/*!40000 ALTER TABLE `quyen_han` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sinh_hieu`
--

DROP TABLE IF EXISTS `sinh_hieu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sinh_hieu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `luot_tiep_nhan_id` int NOT NULL,
  `chieu_cao_cm` decimal(5,2) DEFAULT NULL,
  `can_nang_kg` decimal(5,2) DEFAULT NULL,
  `nhiet_do_c` decimal(4,1) DEFAULT NULL,
  `huyet_ap_tam_thu` smallint DEFAULT NULL,
  `huyet_ap_tam_truong` smallint DEFAULT NULL,
  `nhip_tim` smallint DEFAULT NULL,
  `nhip_tho` smallint DEFAULT NULL,
  `spo2` decimal(4,1) DEFAULT NULL,
  `ghi_chu` text COLLATE utf8mb4_unicode_ci,
  `do_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `do_boi_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_luot_tiep_nhan` (`luot_tiep_nhan_id`),
  KEY `fk_sh_doboi` (`do_boi_id`),
  CONSTRAINT `fk_sh_doboi` FOREIGN KEY (`do_boi_id`) REFERENCES `nhan_vien` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sh_luottiepnhan` FOREIGN KEY (`luot_tiep_nhan_id`) REFERENCES `luot_tiep_nhan` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sinh hieu ban dau';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sinh_hieu`
--

LOCK TABLES `sinh_hieu` WRITE;
/*!40000 ALTER TABLE `sinh_hieu` DISABLE KEYS */;
INSERT INTO `sinh_hieu` VALUES (1,5,165.00,65.00,36.5,120,80,75,NULL,38.0,'bệnh nặng ','2026-09-01 21:57:14',4),(2,68,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 14:53:09',4),(3,69,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 14:53:46',4),(4,70,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 14:54:04',4),(5,73,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-02 18:25:35',5),(6,74,172.00,68.00,37.0,125,82,80,19,99.0,NULL,'2026-09-02 18:29:30',2),(7,72,160.00,10.00,40.0,120,236,36,1,48.0,NULL,'2026-09-02 18:30:03',2),(8,6,172.00,78.00,37.0,150,95,88,19,98.0,NULL,'2026-09-05 16:09:02',1),(9,67,160.00,52.00,38.5,115,75,82,20,97.0,NULL,'2026-09-05 16:09:02',1);
/*!40000 ALTER TABLE `sinh_hieu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thong_bao`
--

DROP TABLE IF EXISTS `thong_bao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `thong_bao` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nguoi_nhan_id` int NOT NULL COMMENT 'FK nguoi_dung.id',
  `tieu_de` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` text COLLATE utf8mb4_unicode_ci,
  `loai` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'don_gui, lich_hen, hoa_don, he_thong...',
  `doi_tuong_bang` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ten bang tham chieu (polymorphic), vd: don_gui, lich_hen',
  `doi_tuong_id` int DEFAULT NULL COMMENT 'ID ban ghi lien quan trong bang tren',
  `da_doc` tinyint(1) NOT NULL DEFAULT '0',
  `tao_luc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nguoinhan_dadoc` (`nguoi_nhan_id`,`da_doc`),
  CONSTRAINT `fk_tb_nguoinhan` FOREIGN KEY (`nguoi_nhan_id`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Thong bao trong ung dung - duoc day vao qua Message Queue de khong chan luong chinh';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_bao`
--

LOCK TABLES `thong_bao` WRITE;
/*!40000 ALTER TABLE `thong_bao` DISABLE KEYS */;
INSERT INTO `thong_bao` VALUES (4,5,'Nhắc nhở lịch khám hôm nay','Bác sĩ có 15 lượt khám đã được tiếp nhận trong buổi sáng hôm nay tại Phòng 101.','lich_kham','benh_an_kham',42,0,'2026-09-05 16:11:26'),(5,5,'Có kết quả xét nghiệm mới','Kỹ thuật viên đã gửi kết quả xét nghiệm huyết học CBC cho bệnh nhân Nguyễn Văn A.','xet_nghiem','ket_qua_xet_nghiem',1,0,'2026-09-05 16:11:26'),(6,19,'Có đơn mới chờ Ban Giám Đốc phê duyệt','Bác sĩ Nguyễn Văn A vừa gửi đơn xin nghỉ phép 02 ngày.','phe_duyet','don_gui',1,0,'2026-09-05 16:11:26');
/*!40000 ALTER TABLE `thong_bao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thuoc`
--

DROP TABLE IF EXISTS `thuoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `thuoc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_thuoc` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_thuoc` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ten_hoat_chat` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loai_thuoc_id` int DEFAULT NULL,
  `don_vi_tinh` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ham_luong` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duong_dung` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gia_ban` decimal(12,2) NOT NULL DEFAULT '0.00',
  `ton_kho_tong` int NOT NULL DEFAULT '0' COMMENT 'Cache = SUM(lo_thuoc.so_luong_ton), cap nhat qua trigger/app khi nhap/xuat lo, dung de hien thi nhanh',
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('con_hang','het_hang','ngung_kinh_doanh') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'con_hang',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_thuoc` (`ma_thuoc`),
  KEY `idx_ten_thuoc` (`ten_thuoc`),
  KEY `fk_thuoc_loai` (`loai_thuoc_id`),
  CONSTRAINT `fk_thuoc_loai` FOREIGN KEY (`loai_thuoc_id`) REFERENCES `loai_thuoc` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh muc thuoc (thong tin chung, khong chua so luong ton thuc te)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thuoc`
--

LOCK TABLES `thuoc` WRITE;
/*!40000 ALTER TABLE `thuoc` DISABLE KEYS */;
INSERT INTO `thuoc` VALUES (1,'TH001','Paracetamol 500mg','Paracetamol',NULL,'Viên','500mg','Uống',2000.00,7,NULL,'con_hang'),(2,'TH002','Amoxicillin 500mg','Amoxicillin',NULL,'Viên','500mg','Nhỏ mắt/mũi',5000.00,300,NULL,'con_hang'),(3,'TH003','Vitamin C 1000mg','Acid Ascorbic',NULL,'Viên','1000mg','Uống',3000.00,190,NULL,'con_hang'),(4,'TH004','Siro Ho Astex 90ml','Tần lá hẹ',NULL,'Chai','90ml','Uống',45000.00,49,NULL,'con_hang'),(5,'TH005','Amoxicillin 500mg','Amoxicillin',NULL,'Tuýp','500mg','Bôi ngoài da',50000.00,17,'viêm da','con_hang');
/*!40000 ALTER TABLE `thuoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tin_nhan_chat_ai`
--

DROP TABLE IF EXISTS `tin_nhan_chat_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tin_nhan_chat_ai` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `phien_chat_id` bigint NOT NULL,
  `nguoi_gui` enum('nguoi_dung','ai') COLLATE utf8mb4_unicode_ci NOT NULL,
  `noi_dung` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ket_qua_goi_y_json` json DEFAULT NULL COMMENT 'Chuyen khoa goi y, muc do khan cap - tra ve tu backend AI',
  `thoi_gian` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phien_thoigian` (`phien_chat_id`,`thoi_gian`),
  CONSTRAINT `fk_tnca_phien` FOREIGN KEY (`phien_chat_id`) REFERENCES `phien_chat_ai` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiet tin nhan trong phien chat AI';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tin_nhan_chat_ai`
--

LOCK TABLES `tin_nhan_chat_ai` WRITE;
/*!40000 ALTER TABLE `tin_nhan_chat_ai` DISABLE KEYS */;
/*!40000 ALTER TABLE `tin_nhan_chat_ai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tin_nhan_tu_van`
--

DROP TABLE IF EXISTS `tin_nhan_tu_van`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tin_nhan_tu_van` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tu_van_id` int NOT NULL,
  `nguoi_gui_id` int NOT NULL COMMENT 'FK nguoi_dung.id - benh nhan hoac bac si',
  `loai_noi_dung` enum('text','hinh_anh','file') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `noi_dung` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL Object Storage neu gui anh trieu chung/file',
  `thoi_gian` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tuvan_thoigian` (`tu_van_id`,`thoi_gian`),
  KEY `fk_tntv_nguoigui` (`nguoi_gui_id`),
  CONSTRAINT `fk_tntv_nguoigui` FOREIGN KEY (`nguoi_gui_id`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tntv_tuvan` FOREIGN KEY (`tu_van_id`) REFERENCES `tu_van_truc_tuyen` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lich su tin nhan trong phien tu van truc tuyen (real-time qua Websocket, luu de doi chieu)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tin_nhan_tu_van`
--

LOCK TABLES `tin_nhan_tu_van` WRITE;
/*!40000 ALTER TABLE `tin_nhan_tu_van` DISABLE KEYS */;
/*!40000 ALTER TABLE `tin_nhan_tu_van` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tu_van_truc_tuyen`
--

DROP TABLE IF EXISTS `tu_van_truc_tuyen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tu_van_truc_tuyen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lich_hen_id` int NOT NULL,
  `bac_si_id` int NOT NULL,
  `benh_nhan_id` int NOT NULL,
  `thoi_gian_bat_dau` datetime DEFAULT NULL,
  `thoi_gian_ket_thuc` datetime DEFAULT NULL,
  `link_phong_hop` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ghi_chu_ket_qua` text COLLATE utf8mb4_unicode_ci,
  `trang_thai` enum('sap_dien_ra','dang_dien_ra','da_ket_thuc','huy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sap_dien_ra',
  PRIMARY KEY (`id`),
  KEY `idx_bacsi` (`bac_si_id`),
  KEY `idx_benhnhan` (`benh_nhan_id`),
  KEY `idx_trang_thai` (`trang_thai`),
  KEY `fk_tvtt_lichhen` (`lich_hen_id`),
  CONSTRAINT `fk_tvtt_bacsi` FOREIGN KEY (`bac_si_id`) REFERENCES `bac_si` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tvtt_benhnhan` FOREIGN KEY (`benh_nhan_id`) REFERENCES `benh_nhan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tvtt_lichhen` FOREIGN KEY (`lich_hen_id`) REFERENCES `lich_hen` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phien tu van kham truc tuyen';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tu_van_truc_tuyen`
--

LOCK TABLES `tu_van_truc_tuyen` WRITE;
/*!40000 ALTER TABLE `tu_van_truc_tuyen` DISABLE KEYS */;
/*!40000 ALTER TABLE `tu_van_truc_tuyen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vai_tro`
--

DROP TABLE IF EXISTS `vai_tro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vai_tro` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ma_vai_tro` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'admin, ban_giam_doc, bac_si, tiep_tan, ky_thuat_vien, nhan_vien_nha_thuoc, thu_ngan, benh_nhan...',
  `ten_vai_tro` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mo_ta` text COLLATE utf8mb4_unicode_ci,
  `la_he_thong` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Vai tro he thong (vd Quan tri vien cap cao) khong duoc xoa/sua quyen loi',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ma_vai_tro` (`ma_vai_tro`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh muc vai tro';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vai_tro`
--

LOCK TABLES `vai_tro` WRITE;
/*!40000 ALTER TABLE `vai_tro` DISABLE KEYS */;
INSERT INTO `vai_tro` VALUES (1,'quan_tri_vien_cap_cao','Quan tri vien cap cao',NULL,1),(2,'quan_tri_vien','Quan tri vien',NULL,0),(3,'ban_giam_doc','Ban giam doc',NULL,0),(4,'bac_si','Bac si',NULL,0),(5,'tiep_tan','Tiep tan',NULL,0),(6,'ky_thuat_vien','Ky thuat vien xet nghiem',NULL,0),(7,'nhan_vien_nha_thuoc','Nhan vien nha thuoc',NULL,0),(8,'thu_ngan','Thu ngan',NULL,0),(9,'benh_nhan','Benh nhan',NULL,0);
/*!40000 ALTER TABLE `vai_tro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vai_tro_quyen_han`
--

DROP TABLE IF EXISTS `vai_tro_quyen_han`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vai_tro_quyen_han` (
  `vai_tro_id` int NOT NULL,
  `quyen_han_id` int NOT NULL,
  PRIMARY KEY (`vai_tro_id`,`quyen_han_id`),
  KEY `fk_vtqh_quyen` (`quyen_han_id`),
  CONSTRAINT `fk_vtqh_quyen` FOREIGN KEY (`quyen_han_id`) REFERENCES `quyen_han` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vtqh_vaitro` FOREIGN KEY (`vai_tro_id`) REFERENCES `vai_tro` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ma tran quyen han theo vai tro - QTV chinh sua tren giao dien, khong hardcode';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vai_tro_quyen_han`
--

LOCK TABLES `vai_tro_quyen_han` WRITE;
/*!40000 ALTER TABLE `vai_tro_quyen_han` DISABLE KEYS */;
/*!40000 ALTER TABLE `vai_tro_quyen_han` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'phong_kham'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-05 16:12:12
