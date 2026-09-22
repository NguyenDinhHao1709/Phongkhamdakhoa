-- ============================================================
-- HE THONG QUAN LY PHONG KHAM DA KHOA - SCHEMA v2 (TOI UU)
-- MySQL 8.0+
-- Thay doi so voi ban goc: RBAC da bang, Optimistic Locking,
-- FEFO ton kho thuoc, tai khoan benh nhan, OTP, chat AI,
-- tu van truc tuyen (tin nhan), thong bao, bai viet, du bao AI.
-- ============================================================

CREATE DATABASE IF NOT EXISTS phong_kham
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE phong_kham;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- NHOM 1: PHAN QUYEN (RBAC DA BANG)
-- ============================================================

CREATE TABLE vai_tro (
    id              INT             NOT NULL AUTO_INCREMENT,
    ma_vai_tro      VARCHAR(50)     NOT NULL COMMENT 'admin, ban_giam_doc, bac_si, tiep_tan, ky_thuat_vien, nhan_vien_nha_thuoc, thu_ngan, benh_nhan...',
    ten_vai_tro     VARCHAR(100)    NOT NULL,
    mo_ta           TEXT            NULL,
    la_he_thong     TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Vai tro he thong (vd Quan tri vien cap cao) khong duoc xoa/sua quyen loi',
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_vai_tro (ma_vai_tro)
) ENGINE=InnoDB COMMENT='Danh muc vai tro';

CREATE TABLE quyen_han (
    id              INT             NOT NULL AUTO_INCREMENT,
    ma_quyen        VARCHAR(100)    NOT NULL COMMENT 'vd: lich_hen.xem, lich_hen.tao, thuoc.xuat_kho, bao_cao.xem',
    ten_quyen       VARCHAR(150)    NOT NULL,
    nhom_chuc_nang  VARCHAR(100)    NULL COMMENT 'Nhom module de hien thi UI phan quyen',
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_quyen (ma_quyen)
) ENGINE=InnoDB COMMENT='Danh muc quyen han chi tiet';

CREATE TABLE vai_tro_quyen_han (
    vai_tro_id      INT             NOT NULL,
    quyen_han_id    INT             NOT NULL,
    PRIMARY KEY (vai_tro_id, quyen_han_id),
    CONSTRAINT fk_vtqh_vaitro FOREIGN KEY (vai_tro_id)   REFERENCES vai_tro   (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_vtqh_quyen  FOREIGN KEY (quyen_han_id) REFERENCES quyen_han (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Ma tran quyen han theo vai tro - QTV chinh sua tren giao dien, khong hardcode';

CREATE TABLE nguoi_dung (
    id                  INT             NOT NULL AUTO_INCREMENT,
    ten_dang_nhap       VARCHAR(100)    NOT NULL COMMENT 'Email hoac SDT dung dang nhap',
    mat_khau_hash       VARCHAR(255)    NOT NULL COMMENT 'Bcrypt hash',
    vai_tro_id          INT             NOT NULL,
    loai_tai_khoan      ENUM('noi_bo','benh_nhan') NOT NULL DEFAULT 'noi_bo' COMMENT 'noi_bo=nhan vien/admin, benh_nhan=tu dang ky online',
    trang_thai          ENUM('hoat_dong','khoa','cho_xac_thuc') NOT NULL DEFAULT 'cho_xac_thuc',
    email_da_xac_thuc   TINYINT(1)      NOT NULL DEFAULT 0,
    lan_dang_nhap_cuoi  DATETIME        NULL,
    tao_luc             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ten_dang_nhap (ten_dang_nhap),
    KEY idx_vai_tro    (vai_tro_id),
    KEY idx_trang_thai (trang_thai),
    CONSTRAINT fk_nd_vaitro FOREIGN KEY (vai_tro_id) REFERENCES vai_tro (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Tai khoan dang nhap he thong (dung chung nhan vien + benh nhan)';

CREATE TABLE ma_xac_thuc_otp (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    email           VARCHAR(100)    NOT NULL,
    ma_otp          VARCHAR(10)     NOT NULL,
    loai            ENUM('dang_ky','quen_mat_khau','xac_thuc_khac') NOT NULL DEFAULT 'dang_ky',
    het_han_luc     DATETIME        NOT NULL,
    da_su_dung      TINYINT(1)      NOT NULL DEFAULT 0,
    so_lan_thu      TINYINT         NOT NULL DEFAULT 0,
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_email_loai (email, loai)
) ENGINE=InnoDB COMMENT='Ma OTP xac thuc email khi dang ky/quen mat khau';

-- ============================================================
-- NHOM 2: NHAN SU
-- ============================================================

CREATE TABLE phong_ban (
    id              INT             NOT NULL AUTO_INCREMENT,
    ten_phong_ban   VARCHAR(100)    NOT NULL,
    mo_ta           TEXT            NULL,
    truong_phong_id INT             NULL,
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='Phong ban / Khoa';

CREATE TABLE ca_lam_viec (
    id              INT             NOT NULL AUTO_INCREMENT,
    ten_ca          VARCHAR(50)     NOT NULL,
    gio_bat_dau     TIME            NOT NULL,
    gio_ket_thuc    TIME            NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='Danh muc ca lam viec';

CREATE TABLE nhan_vien (
    id              INT             NOT NULL AUTO_INCREMENT,
    nguoi_dung_id   INT             NOT NULL,
    ho_ten          VARCHAR(100)    NOT NULL,
    ngay_sinh       DATE            NULL,
    gioi_tinh       ENUM('nam','nu','khac') NULL,
    so_cmnd         VARCHAR(20)     NULL,
    so_dien_thoai   VARCHAR(15)     NULL,
    email           VARCHAR(100)    NULL,
    dia_chi         TEXT            NULL,
    chuc_vu         VARCHAR(100)    NULL,
    phong_ban_id    INT             NULL,
    ngay_vao_lam    DATE            NULL,
    anh_dai_dien    VARCHAR(500)    NULL COMMENT 'URL Object Storage',
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_nguoi_dung (nguoi_dung_id),
    UNIQUE KEY uq_so_cmnd    (so_cmnd),
    KEY idx_phong_ban (phong_ban_id),
    CONSTRAINT fk_nv_nguoidung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id) ON UPDATE CASCADE,
    CONSTRAINT fk_nv_phongban  FOREIGN KEY (phong_ban_id)  REFERENCES phong_ban  (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Thong tin nhan vien';

ALTER TABLE phong_ban
    ADD CONSTRAINT fk_pb_truongphong FOREIGN KEY (truong_phong_id)
        REFERENCES nhan_vien (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE bac_si (
    id                          INT             NOT NULL AUTO_INCREMENT,
    nhan_vien_id                INT             NOT NULL,
    chuyen_khoa                 VARCHAR(100)    NOT NULL,
    bang_cap                    VARCHAR(100)    NULL,
    so_chung_chi_hanh_nghe      VARCHAR(50)     NULL,
    mo_ta                       TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_nhanvien   (nhan_vien_id),
    UNIQUE KEY uq_chung_chi  (so_chung_chi_hanh_nghe),
    KEY idx_chuyen_khoa (chuyen_khoa),
    CONSTRAINT fk_bs_nhanvien FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Thong tin chuyen mon bac si';

CREATE TABLE ky_thuat_vien (
    id              INT             NOT NULL AUTO_INCREMENT,
    nhan_vien_id    INT             NOT NULL,
    chuyen_mon      VARCHAR(100)    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_nhanvien (nhan_vien_id),
    CONSTRAINT fk_ktv_nhanvien FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Ky thuat vien xet nghiem';

CREATE TABLE lich_lam_viec (
    id              INT             NOT NULL AUTO_INCREMENT,
    nhan_vien_id    INT             NOT NULL,
    ca_lam_viec_id  INT             NOT NULL,
    ngay_lam        DATE            NOT NULL,
    ghi_chu         TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_nv_ca_ngay (nhan_vien_id, ca_lam_viec_id, ngay_lam),
    KEY idx_ngay_lam (ngay_lam),
    CONSTRAINT fk_llv_nhanvien  FOREIGN KEY (nhan_vien_id)   REFERENCES nhan_vien   (id) ON UPDATE CASCADE,
    CONSTRAINT fk_llv_calamviec FOREIGN KEY (ca_lam_viec_id) REFERENCES ca_lam_viec (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Phan cong lich lam viec';

CREATE TABLE don_gui (
    id              INT             NOT NULL AUTO_INCREMENT,
    nguoi_gui_id    INT             NOT NULL,
    loai_don        VARCHAR(100)    NOT NULL,
    noi_dung        TEXT            NOT NULL,
    file_dinh_kem   VARCHAR(500)    NULL COMMENT 'URL Object Storage, toi da 5MB (kiem tra o app)',
    ngay_gui        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai      ENUM('cho_xu_ly','da_xu_ly','tu_choi','da_huy') NOT NULL DEFAULT 'cho_xu_ly',
    ghi_chu_xu_ly   TEXT            NULL,
    ngay_xu_ly      DATETIME        NULL,
    PRIMARY KEY (id),
    KEY idx_nguoi_gui  (nguoi_gui_id),
    KEY idx_trang_thai (trang_thai),
    CONSTRAINT fk_dg_nguoigui FOREIGN KEY (nguoi_gui_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Don gui giam doc (nghi phep, khieu nai, de xuat...)';

-- ============================================================
-- NHOM 3: BENH NHAN (co lien ket tai khoan dang nhap)
-- ============================================================

CREATE TABLE benh_nhan (
    id                  INT             NOT NULL AUTO_INCREMENT,
    ma_benh_nhan        VARCHAR(20)     NOT NULL,
    nguoi_dung_id       INT             NULL COMMENT 'NULL neu BN vang lai duoc tiep tan tao ho so, khong tu dang ky online',
    ho_ten              VARCHAR(100)    NOT NULL,
    ngay_sinh           DATE            NULL,
    gioi_tinh           ENUM('nam','nu','khac') NULL,
    so_cmnd             VARCHAR(20)     NULL,
    so_dien_thoai       VARCHAR(15)     NULL,
    email               VARCHAR(100)    NULL,
    dia_chi             TEXT            NULL,
    nhom_mau            ENUM('A','B','AB','O') NULL,
    di_ung              TEXT            NULL,
    tien_su_benh        TEXT            NULL,
    nghe_nghiep         VARCHAR(100)    NULL,
    nguoi_than_lien_he  VARCHAR(100)    NULL,
    sdt_nguoi_than      VARCHAR(15)     NULL,
    tao_luc             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_benh_nhan (ma_benh_nhan),
    UNIQUE KEY uq_so_cmnd      (so_cmnd),
    UNIQUE KEY uq_nguoi_dung   (nguoi_dung_id),
    KEY idx_ho_ten         (ho_ten),
    KEY idx_so_dien_thoai  (so_dien_thoai),
    CONSTRAINT fk_bn_nguoidung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Thong tin hanh chinh benh nhan (tach khoi du lieu lam sang)';

-- ============================================================
-- NHOM 4: LICH HEN & TIEP NHAN
-- ============================================================

CREATE TABLE phong_kham (
    id              INT             NOT NULL AUTO_INCREMENT,
    ten_phong       VARCHAR(100)    NOT NULL,
    vi_tri          VARCHAR(100)    NULL,
    chuyen_khoa     VARCHAR(100)    NULL,
    trang_thai      ENUM('hoat_dong','bao_tri','dong_cua') NOT NULL DEFAULT 'hoat_dong',
    phong_ban_id    INT             NULL,
    PRIMARY KEY (id),
    KEY idx_trang_thai (trang_thai),
    CONSTRAINT fk_pk_phongban FOREIGN KEY (phong_ban_id) REFERENCES phong_ban (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Phong kham chuyen khoa';

CREATE TABLE lich_hen (
    id                      INT             NOT NULL AUTO_INCREMENT,
    ma_lich_hen             VARCHAR(20)     NOT NULL,
    benh_nhan_id            INT             NOT NULL,
    bac_si_id               INT             NULL,
    phong_kham_id           INT             NULL,
    ngay_hen                DATE            NOT NULL,
    gio_hen                 TIME            NOT NULL,
    hinh_thuc               ENUM('truc_tiep','truc_tuyen') NOT NULL DEFAULT 'truc_tiep',
    ly_do_kham              TEXT            NULL,
    trang_thai              ENUM('cho_thanh_toan','cho_xac_nhan','da_xac_nhan','da_huy','hoan_thanh','vang_mat') NOT NULL DEFAULT 'cho_xac_nhan',
    nguon_dat               ENUM('benh_nhan_tu_dat','tiep_tan_dat','bac_si_dat') NULL,
    dat_boi_nhan_vien_id    INT             NULL,
    ghi_chu                 TEXT            NULL,
    phien_ban               INT             NOT NULL DEFAULT 0 COMMENT 'Optimistic lock: kiem tra truoc khi UPDATE, WHERE id=? AND phien_ban=?, SET phien_ban=phien_ban+1',
    tao_luc                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_lich_hen (ma_lich_hen),
    -- Chong 2 benh nhan cung dat trung 1 khung gio cua 1 bac si o tang DB
    UNIQUE KEY uq_bacsi_ngay_gio (bac_si_id, ngay_hen, gio_hen),
    KEY idx_ngay_hen_tt   (ngay_hen, trang_thai),
    KEY idx_bacsi_ngayhen (bac_si_id, ngay_hen),
    KEY idx_benhnhan      (benh_nhan_id),
    CONSTRAINT fk_lh_benhnhan  FOREIGN KEY (benh_nhan_id)         REFERENCES benh_nhan  (id) ON UPDATE CASCADE,
    CONSTRAINT fk_lh_bacsi     FOREIGN KEY (bac_si_id)            REFERENCES bac_si     (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_lh_phongkham FOREIGN KEY (phong_kham_id)        REFERENCES phong_kham (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_lh_datboi    FOREIGN KEY (dat_boi_nhan_vien_id) REFERENCES nhan_vien  (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Lich hen kham benh - co optimistic lock + unique slot bac si';

CREATE TABLE luot_tiep_nhan (
    id              INT             NOT NULL AUTO_INCREMENT,
    ma_so_thu_tu    VARCHAR(20)     NOT NULL,
    benh_nhan_id    INT             NOT NULL,
    lich_hen_id     INT             NULL,
    tiep_tan_id     INT             NULL,
    phong_kham_id   INT             NULL,
    bac_si_id       INT             NULL,
    thoi_gian_den   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai      ENUM('cho_kham','dang_kham','hoan_thanh','da_huy') NOT NULL DEFAULT 'cho_kham',
    ghi_chu         TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_so_thu_tu (ma_so_thu_tu),
    KEY idx_phong_trang_thai (phong_kham_id, trang_thai),
    KEY idx_thoi_gian_den    (thoi_gian_den),
    KEY idx_benhnhan         (benh_nhan_id),
    CONSTRAINT fk_ltn_benhnhan  FOREIGN KEY (benh_nhan_id)  REFERENCES benh_nhan  (id) ON UPDATE CASCADE,
    CONSTRAINT fk_ltn_lichhen   FOREIGN KEY (lich_hen_id)   REFERENCES lich_hen   (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_ltn_tieptan   FOREIGN KEY (tiep_tan_id)   REFERENCES nhan_vien  (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_ltn_phongkham FOREIGN KEY (phong_kham_id) REFERENCES phong_kham (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_ltn_bacsi     FOREIGN KEY (bac_si_id)     REFERENCES bac_si     (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Luot tiep nhan benh nhan';

CREATE TABLE sinh_hieu (
    id                      INT             NOT NULL AUTO_INCREMENT,
    luot_tiep_nhan_id       INT             NOT NULL,
    chieu_cao_cm            DECIMAL(5,2)    NULL,
    can_nang_kg             DECIMAL(5,2)    NULL,
    nhiet_do_c              DECIMAL(4,1)    NULL,
    huyet_ap_tam_thu        SMALLINT        NULL,
    huyet_ap_tam_truong     SMALLINT        NULL,
    nhip_tim                SMALLINT        NULL,
    nhip_tho                SMALLINT        NULL,
    spo2                    DECIMAL(4,1)    NULL,
    ghi_chu                 TEXT            NULL,
    do_luc                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    do_boi_id               INT             NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_luot_tiep_nhan (luot_tiep_nhan_id),
    CONSTRAINT fk_sh_luottiepnhan FOREIGN KEY (luot_tiep_nhan_id) REFERENCES luot_tiep_nhan (id) ON UPDATE CASCADE,
    CONSTRAINT fk_sh_doboi        FOREIGN KEY (do_boi_id)         REFERENCES nhan_vien      (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Sinh hieu ban dau';

-- ============================================================
-- NHOM 5: HO SO BENH AN
-- ============================================================

CREATE TABLE ho_so_benh_an (
    id                  INT             NOT NULL AUTO_INCREMENT,
    ma_ho_so            VARCHAR(20)     NOT NULL,
    benh_nhan_id        INT             NOT NULL,
    ngay_tao            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai          ENUM('hoat_dong','luu_tru') NOT NULL DEFAULT 'hoat_dong',
    ghi_chu_tong_quat   TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_ho_so   (ma_ho_so),
    UNIQUE KEY uq_benh_nhan  (benh_nhan_id),
    CONSTRAINT fk_hsba_benhnhan FOREIGN KEY (benh_nhan_id) REFERENCES benh_nhan (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Ho so benh an tong hop';

CREATE TABLE benh_an_kham (
    id                      INT             NOT NULL AUTO_INCREMENT,
    ho_so_benh_an_id        INT             NOT NULL,
    luot_tiep_nhan_id       INT             NOT NULL,
    bac_si_id               INT             NOT NULL,
    ngay_kham               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trieu_chung             TEXT            NULL,
    chan_doan_so_bo         TEXT            NULL,
    chan_doan_xac_dinh      TEXT            NULL,
    ket_qua_kham            TEXT            NULL,
    phuong_phap_dieu_tri    TEXT            NULL,
    tai_kham                DATE            NULL,
    hinh_thuc_kham          ENUM('truc_tiep','truc_tuyen') NULL,
    trang_thai              ENUM('dang_kham','da_hoan_thanh') NOT NULL DEFAULT 'dang_kham',
    ghi_chu                 TEXT            NULL,
    PRIMARY KEY (id),
    KEY idx_bacsi_ngay     (bac_si_id, ngay_kham),
    KEY idx_hsba           (ho_so_benh_an_id),
    KEY idx_luot_tiep_nhan (luot_tiep_nhan_id),
    CONSTRAINT fk_bak_hoso  FOREIGN KEY (ho_so_benh_an_id)  REFERENCES ho_so_benh_an  (id) ON UPDATE CASCADE,
    CONSTRAINT fk_bak_luot  FOREIGN KEY (luot_tiep_nhan_id) REFERENCES luot_tiep_nhan (id) ON UPDATE CASCADE,
    CONSTRAINT fk_bak_bacsi FOREIGN KEY (bac_si_id)         REFERENCES bac_si          (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Phieu kham benh (moi lan kham)';

-- ============================================================
-- NHOM 6: XET NGHIEM & CAN LAM SANG
-- ============================================================

CREATE TABLE dich_vu_xet_nghiem (
    id                  INT             NOT NULL AUTO_INCREMENT,
    ma_dich_vu          VARCHAR(20)     NOT NULL,
    ten_dich_vu         VARCHAR(200)    NOT NULL,
    loai                ENUM('xet_nghiem','cdha','khac') NOT NULL,
    gia                 DECIMAL(12,2)   NOT NULL DEFAULT 0,
    don_vi_ket_qua      VARCHAR(50)     NULL,
    gia_tri_binh_thuong VARCHAR(200)    NULL,
    mo_ta               TEXT            NULL,
    trang_thai          ENUM('hoat_dong','ngung') NOT NULL DEFAULT 'hoat_dong',
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_dich_vu (ma_dich_vu),
    KEY idx_loai (loai)
) ENGINE=InnoDB COMMENT='Danh muc dich vu xet nghiem va CDHA - cache tren Redis';

CREATE TABLE chi_dinh_can_lam_sang (
    id                      INT             NOT NULL AUTO_INCREMENT,
    benh_an_kham_id         INT             NOT NULL,
    dich_vu_xet_nghiem_id   INT             NOT NULL,
    bac_si_chi_dinh_id      INT             NOT NULL,
    ky_thuat_vien_id        INT             NULL,
    ghi_chu_chi_dinh        TEXT            NULL,
    trang_thai              ENUM('cho_lay_mau','dang_lay_mau','dang_xu_ly','co_ket_qua','huy') NOT NULL DEFAULT 'cho_lay_mau',
    thoi_gian_chi_dinh      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoi_gian_lay_mau       DATETIME        NULL,
    thoi_gian_co_ket_qua    DATETIME        NULL,
    PRIMARY KEY (id),
    KEY idx_trang_thai (trang_thai),
    KEY idx_ktv        (ky_thuat_vien_id),
    KEY idx_benh_an    (benh_an_kham_id),
    KEY idx_bacsi_chidinh (bac_si_chi_dinh_id),
    CONSTRAINT fk_cdcls_bak    FOREIGN KEY (benh_an_kham_id)       REFERENCES benh_an_kham       (id) ON UPDATE CASCADE,
    CONSTRAINT fk_cdcls_dichvu FOREIGN KEY (dich_vu_xet_nghiem_id) REFERENCES dich_vu_xet_nghiem (id) ON UPDATE CASCADE,
    CONSTRAINT fk_cdcls_bacsi  FOREIGN KEY (bac_si_chi_dinh_id)    REFERENCES bac_si              (id) ON UPDATE CASCADE,
    CONSTRAINT fk_cdcls_ktv    FOREIGN KEY (ky_thuat_vien_id)      REFERENCES ky_thuat_vien       (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Chi dinh xet nghiem / CDHA tu bac si';

CREATE TABLE ket_qua_xet_nghiem (
    id              INT             NOT NULL AUTO_INCREMENT,
    chi_dinh_id     INT             NOT NULL,
    gia_tri         TEXT            NULL,
    don_vi          VARCHAR(50)     NULL,
    nhan_xet        TEXT            NULL,
    file_dinh_kem   VARCHAR(500)    NULL COMMENT 'URL Object Storage - anh Xquang/sieu am, KHONG luu BLOB',
    nhap_boi_id     INT             NULL,
    thoi_gian_nhap  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    da_gui_bac_si   TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chi_dinh (chi_dinh_id),
    CONSTRAINT fk_kqxn_chidinh FOREIGN KEY (chi_dinh_id) REFERENCES chi_dinh_can_lam_sang (id) ON UPDATE CASCADE,
    CONSTRAINT fk_kqxn_ktv     FOREIGN KEY (nhap_boi_id) REFERENCES ky_thuat_vien          (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Ket qua xet nghiem / CDHA';

-- ============================================================
-- NHOM 7: THUOC & TON KHO (CAU TRUC CHA-CON CHO FEFO)
-- ============================================================

CREATE TABLE loai_thuoc (
    id          INT             NOT NULL AUTO_INCREMENT,
    ten_loai    VARCHAR(100)    NOT NULL,
    mo_ta       TEXT            NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='Phan loai thuoc';

CREATE TABLE thuoc (
    id              INT             NOT NULL AUTO_INCREMENT,
    ma_thuoc        VARCHAR(20)     NOT NULL,
    ten_thuoc       VARCHAR(200)    NOT NULL,
    ten_hoat_chat   VARCHAR(200)    NULL,
    loai_thuoc_id   INT             NULL,
    don_vi_tinh     VARCHAR(30)     NOT NULL,
    ham_luong       VARCHAR(50)     NULL,
    duong_dung      VARCHAR(100)    NULL,
    gia_ban         DECIMAL(12,2)   NOT NULL DEFAULT 0,
    ton_kho_tong    INT             NOT NULL DEFAULT 0 COMMENT 'Cache = SUM(lo_thuoc.so_luong_ton), cap nhat qua trigger/app khi nhap/xuat lo, dung de hien thi nhanh',
    mo_ta           TEXT            NULL,
    trang_thai      ENUM('con_hang','het_hang','ngung_kinh_doanh') NOT NULL DEFAULT 'con_hang',
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_thuoc (ma_thuoc),
    KEY idx_ten_thuoc (ten_thuoc),
    CONSTRAINT fk_thuoc_loai FOREIGN KEY (loai_thuoc_id) REFERENCES loai_thuoc (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Danh muc thuoc (thong tin chung, khong chua so luong ton thuc te)';

CREATE TABLE lo_thuoc (
    id              INT             NOT NULL AUTO_INCREMENT,
    thuoc_id        INT             NOT NULL,
    ma_lo           VARCHAR(50)     NOT NULL,
    ngay_san_xuat   DATE            NULL,
    ngay_het_han    DATE            NOT NULL,
    so_luong_nhap   INT             NOT NULL,
    so_luong_ton    INT             NOT NULL DEFAULT 0,
    gia_nhap        DECIMAL(12,2)   NULL,
    nha_cung_cap    VARCHAR(200)    NULL,
    trang_thai      ENUM('con_hang','het_hang','het_han','thu_hoi') NOT NULL DEFAULT 'con_hang',
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_thuoc_lo (thuoc_id, ma_lo),
    -- Index quan trong nhat cho FEFO: SELECT ... WHERE thuoc_id=? AND so_luong_ton>0 ORDER BY ngay_het_han ASC
    KEY idx_fefo (thuoc_id, so_luong_ton, ngay_het_han),
    KEY idx_het_han (ngay_het_han),
    CONSTRAINT fk_lothuoc_thuoc FOREIGN KEY (thuoc_id) REFERENCES thuoc (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Lo thuoc - moi lo co han dung rieng, xuat kho theo FEFO (First-Expired-First-Out)';

CREATE TABLE don_thuoc (
    id              INT             NOT NULL AUTO_INCREMENT,
    ma_don_thuoc    VARCHAR(20)     NOT NULL,
    benh_an_kham_id INT             NOT NULL,
    bac_si_ke_id    INT             NOT NULL,
    ngay_ke         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai      ENUM('cho_duyet','da_duyet','da_cap_phat','huy') NOT NULL DEFAULT 'cho_duyet',
    ghi_chu         TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_don_thuoc (ma_don_thuoc),
    KEY idx_benh_an    (benh_an_kham_id),
    KEY idx_trang_thai (trang_thai),
    KEY idx_bacsi_ke   (bac_si_ke_id),
    CONSTRAINT fk_dt_bak   FOREIGN KEY (benh_an_kham_id) REFERENCES benh_an_kham (id) ON UPDATE CASCADE,
    CONSTRAINT fk_dt_bacsi FOREIGN KEY (bac_si_ke_id)    REFERENCES bac_si        (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Don thuoc dien tu';

CREATE TABLE don_thuoc_chi_tiet (
    id              INT             NOT NULL AUTO_INCREMENT,
    don_thuoc_id    INT             NOT NULL,
    thuoc_id        INT             NOT NULL,
    lo_thuoc_id     INT             NULL COMMENT 'Lo thuc te duoc cap phat theo thuat toan FEFO, gan luc cap phat (khong gan luc ke don)',
    so_luong        INT             NOT NULL,
    lieu_dung       VARCHAR(200)    NULL,
    so_ngay_dung    SMALLINT        NULL,
    ghi_chu         TEXT            NULL,
    PRIMARY KEY (id),
    KEY idx_don_thuoc (don_thuoc_id),
    CONSTRAINT fk_dtct_don      FOREIGN KEY (don_thuoc_id) REFERENCES don_thuoc (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_dtct_thuoc    FOREIGN KEY (thuoc_id)     REFERENCES thuoc     (id) ON UPDATE CASCADE,
    CONSTRAINT fk_dtct_lothuoc  FOREIGN KEY (lo_thuoc_id)  REFERENCES lo_thuoc  (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Chi tiet thuoc trong don thuoc, truy vet duoc lo thuoc da xuat';

-- ============================================================
-- NHOM 8: THANH TOAN / VIEN PHI
-- ============================================================

CREATE TABLE hoa_don (
    id                      INT             NOT NULL AUTO_INCREMENT,
    ma_hoa_don              VARCHAR(20)     NOT NULL,
    benh_nhan_id            INT             NOT NULL,
    luot_tiep_nhan_id       INT             NULL COMMENT 'NULL neu la hoa don tam ung dat lich (chua tiep nhan)',
    lich_hen_id             INT             NULL COMMENT 'Lien ket khi la bien lai tam ung dat lich online',
    thu_ngan_id             INT             NULL,
    tong_tien               DECIMAL(14,2)   NOT NULL DEFAULT 0,
    so_tien_giam            DECIMAL(14,2)   NOT NULL DEFAULT 0,
    thuc_thu                DECIMAL(14,2)   NOT NULL DEFAULT 0,
    phuong_thuc_thanh_toan  ENUM('tien_mat','chuyen_khoan','the','bao_hiem','vnpay','momo') NULL,
    ma_giao_dich_cong       VARCHAR(100)    NULL COMMENT 'Ma giao dich tra ve tu VNPay/MoMo',
    trang_thai              ENUM('cho_thanh_toan','dang_xu_ly','da_thanh_toan','that_bai','huy') NOT NULL DEFAULT 'cho_thanh_toan',
    phien_ban               INT             NOT NULL DEFAULT 0 COMMENT 'Optimistic lock chong xac nhan thanh toan trung',
    ngay_tao                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_thanh_toan         DATETIME        NULL,
    ghi_chu                 TEXT            NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ma_hoa_don (ma_hoa_don),
    KEY idx_ngay_tt    (ngay_thanh_toan),
    KEY idx_trang_thai (trang_thai),
    KEY idx_benh_nhan  (benh_nhan_id),
    KEY idx_lich_hen   (lich_hen_id),
    CONSTRAINT fk_hd_benhnhan  FOREIGN KEY (benh_nhan_id)      REFERENCES benh_nhan      (id) ON UPDATE CASCADE,
    CONSTRAINT fk_hd_luot      FOREIGN KEY (luot_tiep_nhan_id) REFERENCES luot_tiep_nhan (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_hd_lichhen   FOREIGN KEY (lich_hen_id)       REFERENCES lich_hen       (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_hd_thungan   FOREIGN KEY (thu_ngan_id)       REFERENCES nhan_vien       (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Hoa don / Thanh toan vien phi - co optimistic lock';

CREATE TABLE hoa_don_chi_tiet (
    id          INT             NOT NULL AUTO_INCREMENT,
    hoa_don_id  INT             NOT NULL,
    loai_phi    ENUM('kham_benh','xet_nghiem','thuoc','cdha','tam_ung','khac') NOT NULL,
    mo_ta       VARCHAR(200)    NULL,
    so_luong    INT             NOT NULL DEFAULT 1,
    don_gia     DECIMAL(12,2)   NOT NULL,
    thanh_tien  DECIMAL(12,2)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_hoa_don (hoa_don_id),
    CONSTRAINT fk_hdct_hoadon FOREIGN KEY (hoa_don_id) REFERENCES hoa_don (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Chi tiet khoan phi trong hoa don';

-- ============================================================
-- NHOM 9: TU VAN TRUC TUYEN
-- ============================================================

CREATE TABLE tu_van_truc_tuyen (
    id                  INT             NOT NULL AUTO_INCREMENT,
    lich_hen_id         INT             NOT NULL,
    bac_si_id           INT             NOT NULL,
    benh_nhan_id        INT             NOT NULL,
    thoi_gian_bat_dau   DATETIME        NULL,
    thoi_gian_ket_thuc  DATETIME        NULL,
    link_phong_hop      VARCHAR(500)    NULL,
    ghi_chu_ket_qua     TEXT            NULL,
    trang_thai          ENUM('sap_dien_ra','dang_dien_ra','da_ket_thuc','huy') NOT NULL DEFAULT 'sap_dien_ra',
    PRIMARY KEY (id),
    KEY idx_bacsi      (bac_si_id),
    KEY idx_benhnhan   (benh_nhan_id),
    KEY idx_trang_thai (trang_thai),
    CONSTRAINT fk_tvtt_lichhen  FOREIGN KEY (lich_hen_id)  REFERENCES lich_hen  (id) ON UPDATE CASCADE,
    CONSTRAINT fk_tvtt_bacsi    FOREIGN KEY (bac_si_id)    REFERENCES bac_si    (id) ON UPDATE CASCADE,
    CONSTRAINT fk_tvtt_benhnhan FOREIGN KEY (benh_nhan_id) REFERENCES benh_nhan (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Phien tu van kham truc tuyen';

CREATE TABLE tin_nhan_tu_van (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    tu_van_id       INT             NOT NULL,
    nguoi_gui_id    INT             NOT NULL COMMENT 'FK nguoi_dung.id - benh nhan hoac bac si',
    loai_noi_dung   ENUM('text','hinh_anh','file') NOT NULL DEFAULT 'text',
    noi_dung        TEXT            NULL,
    file_url        VARCHAR(500)    NULL COMMENT 'URL Object Storage neu gui anh trieu chung/file',
    thoi_gian       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tuvan_thoigian (tu_van_id, thoi_gian),
    CONSTRAINT fk_tntv_tuvan     FOREIGN KEY (tu_van_id)    REFERENCES tu_van_truc_tuyen (id) ON UPDATE CASCADE,
    CONSTRAINT fk_tntv_nguoigui  FOREIGN KEY (nguoi_gui_id) REFERENCES nguoi_dung        (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Lich su tin nhan trong phien tu van truc tuyen (real-time qua Websocket, luu de doi chieu)';

-- ============================================================
-- NHOM 10: TRO LY AI (KHAI BAO TRIEU CHUNG + CHAT CA NHAN HOA)
-- ============================================================

CREATE TABLE phien_chat_ai (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    nguoi_dung_id   INT             NULL COMMENT 'NULL neu la khach vang lai (chua dang nhap)',
    benh_nhan_id    INT             NULL,
    loai            ENUM('khai_bao_trieu_chung','tu_van_ca_nhan') NOT NULL,
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_nguoidung (nguoi_dung_id),
    KEY idx_benhnhan  (benh_nhan_id),
    CONSTRAINT fk_pca_nguoidung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_pca_benhnhan  FOREIGN KEY (benh_nhan_id)  REFERENCES benh_nhan  (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Phien chat voi tro ly AI - UC2 (khach vang lai) va UC10 (benh nhan da dang nhap)';

CREATE TABLE tin_nhan_chat_ai (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    phien_chat_id       BIGINT          NOT NULL,
    nguoi_gui           ENUM('nguoi_dung','ai') NOT NULL,
    noi_dung            TEXT            NOT NULL,
    ket_qua_goi_y_json  JSON            NULL COMMENT 'Chuyen khoa goi y, muc do khan cap - tra ve tu backend AI',
    thoi_gian           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_phien_thoigian (phien_chat_id, thoi_gian),
    CONSTRAINT fk_tnca_phien FOREIGN KEY (phien_chat_id) REFERENCES phien_chat_ai (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Chi tiet tin nhan trong phien chat AI';

CREATE TABLE du_bao_y_te (
    id              INT             NOT NULL AUTO_INCREMENT,
    loai_du_bao     VARCHAR(100)    NOT NULL COMMENT 'luu_luong_benh_nhan, xu_huong_dich_benh',
    ky_du_bao       VARCHAR(20)     NOT NULL COMMENT 'vd: 2026-09, Q4-2026',
    du_lieu_json    JSON            NOT NULL COMMENT 'Ket qua chi tiet tu model Prophet/ARIMA chay ngam',
    do_tin_cay      VARCHAR(50)     NULL COMMENT 'vd: uoc luong tho (chua du du lieu lich su)',
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_loai_ky (loai_du_bao, ky_du_bao)
) ENGINE=InnoDB COMMENT='Ket qua du bao AI chay ngam dinh ky, Ban giam doc chi doc (khong chay real-time)';

-- ============================================================
-- NHOM 11: THONG BAO & NOI DUNG TINH
-- ============================================================

CREATE TABLE thong_bao (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    nguoi_nhan_id       INT             NOT NULL COMMENT 'FK nguoi_dung.id',
    tieu_de             VARCHAR(200)    NOT NULL,
    noi_dung            TEXT            NULL,
    loai                VARCHAR(50)     NOT NULL COMMENT 'don_gui, lich_hen, hoa_don, he_thong...',
    doi_tuong_bang      VARCHAR(50)     NULL COMMENT 'Ten bang tham chieu (polymorphic), vd: don_gui, lich_hen',
    doi_tuong_id        INT             NULL COMMENT 'ID ban ghi lien quan trong bang tren',
    da_doc              TINYINT(1)      NOT NULL DEFAULT 0,
    tao_luc             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_nguoinhan_dadoc (nguoi_nhan_id, da_doc),
    CONSTRAINT fk_tb_nguoinhan FOREIGN KEY (nguoi_nhan_id) REFERENCES nguoi_dung (id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Thong bao trong ung dung - duoc day vao qua Message Queue de khong chan luong chinh';

CREATE TABLE bai_viet (
    id              INT             NOT NULL AUTO_INCREMENT,
    tieu_de         VARCHAR(255)    NOT NULL,
    slug            VARCHAR(255)    NOT NULL,
    tom_tat         VARCHAR(500)    NULL,
    noi_dung        LONGTEXT        NULL,
    anh_dai_dien    VARCHAR(500)    NULL COMMENT 'URL Object Storage',
    tac_gia_id      INT             NULL,
    trang_thai      ENUM('nhap','xuat_ban','an') NOT NULL DEFAULT 'nhap',
    luot_xem        INT             NOT NULL DEFAULT 0,
    xuat_ban_luc    DATETIME        NULL,
    tao_luc         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_slug (slug),
    KEY idx_trang_thai (trang_thai),
    FULLTEXT KEY ft_noidung (tieu_de, tom_tat, noi_dung),
    CONSTRAINT fk_bv_tacgia FOREIGN KEY (tac_gia_id) REFERENCES nhan_vien (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Bai viet suc khoe - phuc vu chuc nang Tim kiem (UC4) va trang Gioi thieu';

-- ============================================================
-- SEED DU LIEU MAC DINH: VAI TRO
-- ============================================================
INSERT INTO vai_tro (ma_vai_tro, ten_vai_tro, la_he_thong) VALUES
    ('quan_tri_vien_cap_cao', 'Quan tri vien cap cao', 1),
    ('quan_tri_vien', 'Quan tri vien', 0),
    ('ban_giam_doc', 'Ban giam doc', 0),
    ('bac_si', 'Bac si', 0),
    ('tiep_tan', 'Tiep tan', 0),
    ('ky_thuat_vien', 'Ky thuat vien xet nghiem', 0),
    ('nhan_vien_nha_thuoc', 'Nhan vien nha thuoc', 0),
    ('thu_ngan', 'Thu ngan', 0),
    ('benh_nhan', 'Benh nhan', 0);

-- ============================================================
-- BAT LAI FOREIGN KEY CHECKS
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;
