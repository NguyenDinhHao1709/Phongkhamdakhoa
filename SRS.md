# Đặc tả yêu cầu phần mềm (SRS)
## Hệ thống quản lý phòng khám đa khoa

| Mục | Nội dung |
|---|---|
| Phiên bản tài liệu | 3.0 |
| Ngày cập nhật | 24/11/2026 |
| Chuẩn tham chiếu | ISO/IEC/IEEE 29148:2018 (kế thừa IEEE 830) |
| Tài liệu liên quan | [Quy trình khám bệnh & BPMN](docs/QUY_TRINH_KHAM_BENH.md), [README](README.md) |

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Mô tả tổng quan](#2-mô-tả-tổng-quan)
3. [Chức năng theo tác nhân](#3-chức-năng-theo-tác-nhân)
4. [Yêu cầu chức năng](#4-yêu-cầu-chức-năng)
5. [Quy tắc nghiệp vụ](#5-quy-tắc-nghiệp-vụ)
6. [Đặc tả use case chính](#6-đặc-tả-use-case-chính)
7. [Yêu cầu dữ liệu](#7-yêu-cầu-dữ-liệu)
8. [Yêu cầu giao tiếp ngoài](#8-yêu-cầu-giao-tiếp-ngoài)
9. [Yêu cầu phi chức năng](#9-yêu-cầu-phi-chức-năng)
10. [Ma trận truy xuất](#10-ma-trận-truy-xuất)

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu đặc tả tác nhân, yêu cầu chức năng, quy tắc nghiệp vụ và yêu cầu phi chức năng của hệ thống quản lý phòng khám đa khoa ngoại trú. Đối tượng đọc: hội đồng đánh giá đồ án, nhóm phát triển, kiểm thử và vận hành.

### 1.2 Phạm vi
Hệ thống số hóa quy trình khám ngoại trú của một phòng khám đa khoa: đặt lịch và đặt cọc trực tuyến, tiếp nhận tại quầy/kiosk, hàng đợi có ưu tiên, khám lâm sàng, cận lâm sàng, kê đơn, viện phí có BHYT, cấp phát thuốc, tư vấn video từ xa, kho dược và mua hàng, nhân sự, chấm công, chat nội bộ, báo cáo điều hành và các tiện ích AI (chatbot, phân luồng, dự báo).

Kênh sử dụng: ứng dụng web (nhân viên, bệnh nhân, kiosk, màn hình gọi số).

Ngoài phạm vi: điều trị nội trú, liên thông cổng giám định BHYT quốc gia, ký số điện tử; ứng dụng di động và Zalo Mini App (xem 1.5 Hướng phát triển).

### 1.3 Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| Lượt tiếp nhận (lượt khám) | Một lần bệnh nhân đến khám, gắn số thứ tự trong ngày |
| CLS | Cận lâm sàng: xét nghiệm, chẩn đoán hình ảnh |
| Tạm ứng | Khoản thu trước phí khám tại quầy (phiếu `TU…`) |
| Cọc | Khoản đóng khi đặt lịch trực tuyến (hóa đơn `HDT…`) |
| Quyết toán | Lập hóa đơn cuối của lượt khám, trừ BHYT và tạm ứng |
| Đúng / trái tuyến | Khám tại nơi đăng ký KCB ban đầu trên thẻ BHYT hay nơi khác |
| Qua lượt | Gọi khám nhưng bệnh nhân vắng mặt, xếp xuống cuối hàng |
| Phiếu chi hoạt động | Khoản chi vận hành của phòng khám, cần Ban giám đốc duyệt |
| Chốt ca | Thu ngân đối soát tiền mặt cuối ca và bàn giao cho ca sau |
| ICD-10 | Bảng phân loại bệnh tật quốc tế |
| FEFO | Xuất kho lô có hạn dùng gần nhất trước |

### 1.4 Tài liệu tham khảo
- Quyết định 1313/QĐ-BYT về quy trình khám bệnh tại khoa khám bệnh.
- Luật Bảo hiểm y tế và Nghị định 146/2018/NĐ-CP (mức hưởng, ngưỡng 15% lương cơ sở).
- Luật Khám bệnh, chữa bệnh 2023 (thứ tự ưu tiên khám).
- Thông tư 52/2017/TT-BYT (mẫu đơn thuốc).

### 1.5 Hướng phát triển
Các hạng mục sau có mã nguồn thử nghiệm nhưng không thuộc phạm vi đánh giá của đồ án:
- Ứng dụng di động cho bệnh nhân (`mobile-patient`, Expo).
- Zalo Mini App cho bệnh nhân: đăng nhập bằng Zalo, dùng lại API bệnh nhân của backend.
- Gửi thông báo qua Zalo ZNS (cần relay IP Việt Nam vì API Zalo chỉ phục vụ IP trong nước).

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh hệ thống

```
 Web (nhân viên, bệnh nhân) / Kiosk / Màn hình gọi số
        │ HTTPS + Socket.IO
        ▼
 Backend NestJS (REST /api, WebSocket) ──► MySQL 8 (Clever Cloud)
        │              │               │
        ▼              ▼               ▼
   ai-service     office-service    python-ml            PayOS, SMTP,
   (Gemini: chat,  (chat nội bộ)    (dự báo, phân loại   Cloudinary
    RAG, phân luồng)                 chuyên khoa, khuôn mặt)
```

Backend là điểm vào duy nhất của client; các service phụ chỉ nhận request từ backend (khóa nội bộ `AI_INTERNAL_KEY`, `OFFICE_INTERNAL_TOKEN`).

### 2.2 Tác nhân

Vai trò được lưu ở bảng `vai_tro`. Phân quyền hai lớp: (1) vai trò được phép gọi API (`@Roles`), (2) ma trận quyền hạn theo vai trò (`vai_tro_quyen_han`) do quản trị viên chỉnh. Quản trị viên cấp cao luôn có toàn quyền.

| Mã | Tác nhân | Mã vai trò | Giao diện | Mô tả |
|---|---|---|---|---|
| A0 | Khách (chưa đăng nhập) | — | `/`, `/dat-lich` | Xem thông tin phòng khám, bảng giá, bài viết, đặt lịch nhanh, chatbot phân luồng |
| A1 | Bệnh nhân | `benh_nhan` | `/benh-nhan` | Đặt lịch, thanh toán, theo dõi STT, hồ sơ y tế, tư vấn video, chatbot |
| A2 | Lễ tân | `tiep_tan` | `/tiep-tan` | Tiếp nhận, check-in, điều phối hàng đợi, quản lý bệnh nhân, lịch hẹn |
| A3 | Bác sĩ | `bac_si` | `/bac-si` | Khám, chỉ định CLS, kê đơn, tư vấn video, viết bài |
| A4 | Kỹ thuật viên | `ky_thuat_vien` | `/ky-thuat-vien` | Thực hiện và trả kết quả CLS |
| A5 | Nhân viên nhà thuốc | `nhan_vien_nha_thuoc` | `/nha-thuoc` | Kho thuốc, cấp phát, mua hàng |
| A6 | Thu ngân | `thu_ngan` | `/thu-ngan` | Tạm ứng, quyết toán, hoàn tiền, phiếu chi, chi trả NCC, chốt ca |
| A7 | Ban giám đốc | `ban_giam_doc` | `/ban-giam-doc` | Báo cáo, bảng giá, xếp lịch, phê duyệt, chấm công |
| A8 | Quản trị viên | `quan_tri_vien` | `/quan-tri` | Nhân viên, tài khoản, phân quyền, danh mục, sao lưu, nhật ký |
| A9 | Quản trị viên cấp cao | `quan_tri_vien_cap_cao` | `/quan-tri` | Như A8, vai trò hệ thống, luôn toàn quyền |
| A10 | Kiosk tự phục vụ | — (công khai) | `/kiosk` | Bệnh nhân tự check-in / lấy số |
| A11 | Màn hình gọi số / TV | — (công khai) | `/man-hinh-goi-so` | Hiển thị và đọc số đang gọi |
| A12 | Hệ thống (tác vụ định kỳ) | — | — | Hủy lịch quá hạn, nhắc lịch, báo trễ, xử lý ca tư vấn |
| A13 | Hệ thống ngoài | — | — | PayOS (webhook), SMTP, Gemini, python-ml |

Tất cả nhân viên (A2–A9) dùng chung các chức năng ở mục 3.11, trong đó có chat nội bộ (Office).

### 2.3 Môi trường vận hành
- Backend, ai-service, office-service, python-ml: triển khai trên Render (tự deploy từ nhánh `main`).
- Frontend: React 18 + Vite, bản build tĩnh trên cPanel.
- CSDL: MySQL 8 trên Clever Cloud; migration chạy thủ công.
- Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh (UTC+7).

### 2.4 Ràng buộc
- C1. CSDL không tự đồng bộ schema (`synchronize: false`); mọi thay đổi cấu trúc qua file SQL trong `database/`.
- C2. Backend có thể chạy nhiều instance: trạng thái dùng chung (khóa, bộ đếm mã) phải nằm trong CSDL.
- C3. Giao diện tiếng Việt; tiền tệ VNĐ.

### 2.5 Giả định
- Mỗi bác sĩ có lịch làm việc (ca trực) được xếp trước.
- Thông tin thẻ BHYT do lễ tân nhập và chịu trách nhiệm kiểm tra bản gốc.

---

## 3. Chức năng theo tác nhân

Cột "FR" tham chiếu yêu cầu chi tiết ở mục 4.

### 3.1 Khách (A0)

| Chức năng | FR |
|---|---|
| Xem trang chủ: giới thiệu, chuyên khoa, đội ngũ bác sĩ, bảng giá dịch vụ | FR-QL-02 |
| Đọc bài viết sức khỏe đã duyệt | FR-QL-08 |
| Đặt lịch nhanh không cần tài khoản | FR-LH-02 |
| Chatbot phân luồng: mô tả triệu chứng → gợi ý chuyên khoa | FR-AI-02 |
| Đăng ký tài khoản (OTP), đăng nhập, quên mật khẩu | FR-AUTH-01, 02 |

### 3.2 Bệnh nhân (A1)

| Chức năng | FR |
|---|---|
| Đăng nhập, đổi mật khẩu | FR-AUTH-02 |
| Đặt lịch khám trực tiếp / trực tuyến: chọn chuyên khoa, bác sĩ, ngày, khung giờ | FR-LH-01, 02 |
| Thanh toán cọc qua PayOS | FR-LH-03 |
| Xem, đổi, hủy lịch hẹn; khai tài khoản nhận hoàn cọc | FR-LH-05, 06 |
| Đóng tạm ứng và phí CLS bằng chuyển khoản QR (PayOS) ngay trên trang tiến độ khám | FR-TT-02, FR-CLS-06 |
| Theo dõi tiến độ khám: số thứ tự, số người phía trước, thời gian chờ, các bước đã qua, đơn thuốc | FR-TN-11 |
| Xác nhận phương thức thanh toán và lựa chọn mua thuốc tại phòng khám khi quyết toán | FR-TT-08 |
| Xem hồ sơ y tế: lịch sử khám, kết quả CLS, đơn thuốc | FR-KB-07 |
| Tham gia phòng tư vấn video với bác sĩ | FR-TV-01…03 |
| Đánh giá ca khám | FR-QL-08 |
| Chatbot hỗ trợ sức khỏe (lịch sử hội thoại, phản hồi câu trả lời) | FR-AI-01 |
| Nhận thông báo: trong ứng dụng và email (check-in, khoản cần đóng, đã thu tiền, nhắc lịch) | FR-TB-01, 02 |

### 3.3 Lễ tân (A2)

| Chức năng | FR |
|---|---|
| Tìm, tạo, sửa hồ sơ bệnh nhân; tra cứu thẻ BHYT | FR-TN-01 |
| Check-in lịch hẹn hôm nay; tạo lượt vãng lai, chọn chuyên khoa/bác sĩ/phòng | FR-TN-02, 03 |
| Ghi sinh hiệu khi tiếp nhận | FR-KB-01 |
| Đổi đối tượng ưu tiên, chuyển phòng/bác sĩ, đánh dấu qua lượt | FR-TN-06, 09, 12 |
| Theo dõi hàng đợi thời gian thực, nhận cảnh báo trễ hẹn | FR-TN-08, 10 |
| Quản lý lịch hẹn: đặt lịch hộ khách tại quầy, hủy lịch (chọn lỗi bên nào, ghi lý do), gửi nhắc lịch | FR-LH-08, 09, BR-24 |
| Phân luồng AI tại quầy theo triệu chứng | FR-AI-02 |
| Thống kê tiếp nhận | FR-QL-06 |

### 3.4 Bác sĩ (A3)

| Chức năng | FR |
|---|---|
| Phòng khám: xem hàng đợi, gọi số / gọi lại qua loa, đánh dấu vắng mặt | FR-TN-07, 09 |
| Khám: sinh hiệu, triệu chứng, khám lâm sàng, chẩn đoán sơ bộ và ICD-10 | FR-KB-01…03 |
| Chỉ định CLS, xem kết quả và gợi ý đọc kết quả bằng AI | FR-CLS-01, FR-AI-04 |
| Kê đơn thuốc, kiểm tra tương tác thuốc, tra phác đồ (AI) | FR-KB-04, FR-AI-04 |
| Kết thúc khám, hẹn tái khám, in phiếu khám và đơn thuốc | FR-KB-05, 06 |
| Tra cứu hồ sơ bệnh án của bệnh nhân | FR-KB-07 |
| Khám trực tuyến: vào phòng video, chat/gửi tệp, kết luận tư vấn | FR-TV-01…04 |
| Xem lịch hẹn của mình, gửi yêu cầu hủy ca | FR-LH-07 |
| Viết bài sức khỏe, gửi duyệt; phản hồi đánh giá của bệnh nhân | FR-QL-08 |
| Thống kê cá nhân | FR-QL-06 |

### 3.5 Kỹ thuật viên (A4)

| Chức năng | FR |
|---|---|
| Nhận danh sách chỉ định CLS chờ thực hiện, xem trạng thái thu phí | FR-CLS-02, 06 |
| Chuyển trạng thái lấy mẫu → xử lý → có kết quả | FR-CLS-02 |
| Nhập kết quả, tải ảnh/tệp, gửi kết quả cho bác sĩ; hiệu chỉnh kết quả | FR-CLS-03, 05 |
| Thống kê và in báo cáo xét nghiệm | FR-QL-06 |

### 3.6 Nhân viên nhà thuốc (A5)

| Chức năng | FR |
|---|---|
| Danh mục thuốc: thêm, sửa, ngừng kinh doanh; theo dõi lô, hạn dùng, tồn kho, cảnh báo | FR-NT-01 |
| Danh sách đơn thuốc, cấp phát khi hóa đơn đã thanh toán (FEFO), in đơn | FR-NT-02 |
| Nhập kho | FR-NT-01 |
| Mua hàng: quản lý nhà cung cấp và bảng giá, lập yêu cầu mua, nhập báo giá, đặt hàng, tiếp nhận hàng, đề nghị chi | FR-NT-03 |
| Xem dự báo nhu cầu thuốc | FR-NT-04 |
| Thống kê và in báo cáo dược phẩm | FR-QL-06 |

### 3.7 Thu ngân (A6)

| Chức năng | FR |
|---|---|
| Danh sách hóa đơn; thu tạm ứng trước khám | FR-TT-01, 02 |
| Quyết toán: tính BHYT, trừ tạm ứng/cọc, thu thêm hoặc hoàn dư; in hóa đơn | FR-TT-03, 04 |
| Thu phí CLS trước khi thực hiện (phiếu `CLS…`) | FR-CLS-06 |
| Xác nhận thanh toán lịch hẹn, hủy hóa đơn, hoàn cọc/tạm ứng, xử lý danh sách chờ hoàn | FR-TT-05, 06 |
| Lập phiếu chi hoạt động, xuất tiền khi đã duyệt, yêu cầu hủy, xác nhận hoàn quỹ | FR-TT-07 |
| Chi trả nhà cung cấp theo đề nghị chi đã duyệt; in sổ công nợ | FR-TT-09 |
| Chốt ca, xác nhận nhận ca, xem lịch sử chốt ca; in biên bản và báo cáo sổ quỹ | FR-TT-07 |
| Thống kê thu ngân | FR-QL-06 |

### 3.8 Ban giám đốc (A7)

| Chức năng | FR |
|---|---|
| Dashboard KPI, báo cáo tài chính, báo cáo toàn diện | FR-QL-06 |
| Dự báo lượng bệnh nhân và nhu cầu thuốc | FR-AI-03, FR-NT-04 |
| Quản lý bảng giá dịch vụ khám/CLS; cấu hình phí khám, cọc, hoàn cọc, BHYT | FR-QL-01, 02 |
| Xếp lịch làm việc, phân ca tự động | FR-QL-04 |
| Quản lý chấm công, chấm công thủ công | FR-QL-05 |
| Phê duyệt: yêu cầu hủy ca của bác sĩ, hoàn cọc khi hủy lịch do lỗi phòng khám, đơn từ nhân viên, phiếu chi hoạt động, yêu cầu mua thuốc, đề nghị chi, yêu cầu hủy | FR-LH-07, FR-QL-05, FR-TT-07, FR-NT-03 |
| Tra cứu tổng hợp | FR-QL-09 |
| Duyệt bài viết; xem đánh giá của bệnh nhân | FR-QL-08 |
| Nhận và chỉ đạo báo cáo bộ phận | FR-QL-10 |
| Báo cáo hủy lịch | FR-QL-06 |

### 3.9 Quản trị viên (A8) và Quản trị viên cấp cao (A9)

| Chức năng | FR |
|---|---|
| Tổng quan hệ thống | FR-QL-06 |
| Quản lý nhân viên: tạo, sửa, khóa, đặt lại mật khẩu, ảnh đại diện | FR-AUTH-04, FR-QL-03 |
| Quản lý tài khoản bệnh nhân: tạo, cấp tài khoản cho hồ sơ có sẵn, đổi mật khẩu, khóa, xóa | FR-AUTH-06 |
| Phân quyền: ma trận quyền theo vai trò, khôi phục mặc định | FR-AUTH-03 |
| Danh mục dùng chung: phòng ban, phòng khám, chuyên khoa, danh mục dược, thông tin cơ sở | FR-QL-03 |
| Sao lưu CSDL ra file `.sql` | FR-QL-07 |
| Nhật ký hệ thống: tra cứu, thống kê, xuất file | FR-AUTH-05 |
| Cài đặt chấm công (WiFi/IP được phép) | FR-QL-05 |
| Thao tác thay các vai trò nghiệp vụ (tiếp nhận, khám, CLS, nhà thuốc) khi cần hỗ trợ | — |

### 3.10 Kiosk (A10) và Màn hình gọi số (A11)

| Chức năng | FR |
|---|---|
| Kiosk: tra cứu lịch hẹn, check-in, đăng ký mới lấy số vãng lai, tự khai ưu tiên giới hạn, xem tình trạng phòng khám | FR-TN-05 |
| Màn hình gọi số: hiển thị số đang gọi theo phòng, đọc số bằng giọng nói (TTS) | FR-TN-08 |

### 3.11 Chức năng chung của nhân viên (A2–A9)

| Chức năng | FR |
|---|---|
| Xem, sửa hồ sơ cá nhân; đổi mật khẩu | FR-AUTH-02 |
| Xem lịch làm việc của mình | FR-QL-04 |
| Chấm công vào/ra (WiFi/IP được phép, xác thực khuôn mặt), xem lịch sử chấm công | FR-QL-05 |
| Gửi đơn từ và theo dõi kết quả duyệt | FR-QL-05 |
| Chat nội bộ Office: tạo chat 1-1 hoặc nhóm, thêm thành viên, rời nhóm; gửi tin, tệp, ảnh; thả cảm xúc, ghim, thu hồi tin; đánh dấu đã đọc, xóa cuộc trò chuyện | FR-TB-03 |
| Nhận thông báo trong ứng dụng, đánh dấu đã đọc | FR-TB-01 |

### 3.12 Hệ thống (A12)

| Chức năng | FR / BR |
|---|---|
| Hủy lịch quá hạn thanh toán, nhả khung giờ | FR-LH-04, BR-01 |
| Hủy lịch trực tiếp không check-in khi hết ngày hẹn; tự hủy ca bác sĩ xin hủy chưa được duyệt | BR-04, BR-23 |
| Nhắc lịch hẹn trong 24 giờ tới | FR-LH-08 |
| Báo trễ hẹn và gợi ý chuyển bác sĩ | FR-TN-10, BR-11 |
| Xử lý ca tư vấn không diễn ra | FR-TV-05, BR-19 |

---

## 4. Yêu cầu chức năng

Mức ưu tiên: **C** = bắt buộc, **M** = nên có.

### 4.1 Tài khoản và phân quyền (AUTH)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-AUTH-01 | Đăng ký tài khoản bệnh nhân bằng email hoặc số điện thoại, xác thực OTP; quên mật khẩu bằng OTP | C |
| FR-AUTH-02 | Đăng nhập trả JWT access token và refresh token; đăng xuất thu hồi token; đổi mật khẩu | C |
| FR-AUTH-03 | Mỗi API kiểm tra vai trò và quyền hạn của người gọi; truy cập trái phép trả 403. Quản trị viên chỉnh ma trận quyền theo vai trò | C |
| FR-AUTH-04 | Quản trị viên tạo, khóa tài khoản nhân viên và gán vai trò | C |
| FR-AUTH-05 | Ghi nhật ký thao tác nghiệp vụ quan trọng; tra cứu, thống kê, xuất file | M |
| FR-AUTH-06 | Quản trị viên quản lý tài khoản bệnh nhân | C |

### 4.2 Đặt lịch và đặt cọc (LH)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-LH-01 | Hiển thị khung giờ trống của bác sĩ theo ngày, đánh dấu buổi "Đã kín" khi hết suất | C |
| FR-LH-02 | Tạo lịch hẹn trực tiếp hoặc trực tuyến ở trạng thái chờ thanh toán, giữ chỗ 15 phút (BR-01, BR-02) | C |
| FR-LH-03 | Tạo link thanh toán PayOS, nhận webhook, xác nhận lịch và lập hóa đơn cọc `HDT…` | C |
| FR-LH-04 | Tự hủy lịch quá hạn thanh toán và nhả khung giờ | C |
| FR-LH-05 | Bệnh nhân hủy lịch và khai tài khoản nhận hoàn khi đủ điều kiện (BR-03) | C |
| FR-LH-06 | Đổi lịch hẹn, áp dụng lại kiểm tra suất buổi | C |
| FR-LH-07 | Bác sĩ gửi yêu cầu hủy ca; Ban giám đốc duyệt | M |
| FR-LH-08 | Nhắc lịch hẹn trong 24 giờ tới, tự động và thủ công | M |
| FR-LH-09 | Lễ tân đặt lịch hộ khách tại quầy | C |

### 4.3 Tiếp nhận và hàng đợi (TN)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TN-01 | Tìm hoặc tạo hồ sơ bệnh nhân (mã `BNxxxxxx` không trùng); tra cứu theo số thẻ BHYT | C |
| FR-TN-02 | Check-in lịch hẹn hôm nay tại quầy; không tạo lượt trùng cho cùng lịch hẹn (BR-05) | C |
| FR-TN-03 | Tạo lượt khám vãng lai: chọn chuyên khoa, bác sĩ, phòng, đối tượng ưu tiên | C |
| FR-TN-04 | Cấp số thứ tự theo ngày, không trùng giữa quầy và kiosk (BR-06) | C |
| FR-TN-05 | Kiosk tự phục vụ: check-in lịch hẹn, lấy số vãng lai, tự khai ưu tiên giới hạn (BR-08) | C |
| FR-TN-06 | Tự nhận đối tượng ưu tiên theo tuổi; lễ tân đổi được đối tượng ưu tiên (BR-07) | C |
| FR-TN-07 | Hàng đợi bác sĩ chỉ gồm lượt đã đóng đủ tạm ứng (hoặc cấp cứu), sắp xếp theo BR-09 | C |
| FR-TN-08 | Cập nhật hàng đợi thời gian thực cho lễ tân, bác sĩ, kiosk, màn hình gọi số; đọc số bằng TTS | C |
| FR-TN-09 | Bác sĩ/lễ tân đánh dấu "Vắng – qua lượt" (BR-10) | C |
| FR-TN-10 | Báo trễ hẹn 15 phút và gợi ý chuyển bác sĩ khi trễ 30 phút (BR-11) | C |
| FR-TN-11 | Bệnh nhân xem tiến độ: số người phía trước, thời gian chờ ước tính, các bước khám, thông báo trễ | M |
| FR-TN-12 | Điều phối chuyển lượt sang bác sĩ / phòng khác | C |

### 4.4 Khám bệnh và hồ sơ bệnh án (KB)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-KB-01 | Ghi sinh hiệu: mạch, nhiệt độ, huyết áp, SpO2, cân nặng, chiều cao | C |
| FR-KB-02 | Ghi triệu chứng, khám lâm sàng, chẩn đoán sơ bộ | C |
| FR-KB-03 | Chẩn đoán xác định theo mã ICD-10 | C |
| FR-KB-04 | Kê đơn thuốc: tìm thuốc, liều, số lượng, cách dùng | C |
| FR-KB-05 | Kết thúc khám: hướng điều trị, hẹn tái khám, chuyển lượt sang chờ thanh toán | C |
| FR-KB-06 | In phiếu khám ngoại trú và đơn thuốc theo mẫu Bộ Y tế | M |
| FR-KB-07 | Hồ sơ bệnh án điện tử (mã `HSxxxxxx`) tra cứu theo bệnh nhân | C |

### 4.5 Cận lâm sàng (CLS)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-CLS-01 | Bác sĩ chỉ định xét nghiệm / chẩn đoán hình ảnh cho lượt khám | C |
| FR-CLS-02 | Kỹ thuật viên nhận danh sách chỉ định, chuyển trạng thái lấy mẫu → xử lý → có kết quả | C |
| FR-CLS-03 | Nhập kết quả (giá trị, đơn vị, khoảng tham chiếu, nhận xét), tải ảnh/tệp, gửi kết quả cho bác sĩ | C |
| FR-CLS-04 | Không thêm hoặc xóa chỉ định sau khi lượt đã thanh toán (BR-16) | C |
| FR-CLS-05 | Hiệu chỉnh kết quả đã trả | M |
| FR-CLS-06 | Chỉ định CLS sinh phiếu thu trước `CLS…`; kỹ thuật viên chỉ thực hiện khi đã thu phí (BR-22). Hủy chỉ định đã thu phí → giữ ở trạng thái hủy để trừ khi quyết toán | C |

### 4.6 Viện phí và thanh toán (TT)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TT-01 | Tự lập phiếu tạm ứng phí khám khi tiếp nhận (BR-12) | C |
| FR-TT-02 | Thu tạm ứng; chống thu trùng khi nhiều quầy cùng thao tác | C |
| FR-TT-03 | Quyết toán: gộp phí khám, CLS, thuốc; trừ BHYT (BR-13, BR-14) và tạm ứng/cọc; tính thu thêm hoặc hoàn dư | C |
| FR-TT-04 | Thanh toán bằng tiền mặt, chuyển khoản; in hóa đơn, phiếu thu CLS/tạm ứng | C |
| FR-TT-05 | Hủy hóa đơn, hoàn cọc/tạm ứng với số tiền thực tế | C |
| FR-TT-06 | Danh sách "chờ hoàn" để thu ngân xử lý hoàn tiền | C |
| FR-TT-07 | Phiếu chi hoạt động (lập → BGĐ duyệt → xuất tiền; hủy có duyệt), chốt ca thu ngân, thống kê doanh thu ròng sau hoàn | M |
| FR-TT-08 | Bệnh nhân xác nhận một lần phương thức thanh toán và lựa chọn mua thuốc trước khi quyết toán | C |
| FR-TT-09 | Chi trả nhà cung cấp theo đề nghị chi đã duyệt, theo dõi công nợ | M |

### 4.7 Nhà thuốc (NT)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-NT-01 | Danh mục thuốc, lô, hạn dùng, tồn kho, nhập kho, cảnh báo sắp hết / sắp hết hạn | C |
| FR-NT-02 | Cấp phát đơn thuốc chỉ khi hóa đơn đã thanh toán (BR-17); xuất kho FEFO | C |
| FR-NT-03 | Mua hàng: nhà cung cấp và bảng giá, yêu cầu mua → BGĐ duyệt → báo giá → đặt hàng → tiếp nhận → đề nghị chi → BGĐ duyệt chi → thu ngân chi trả | M |
| FR-NT-04 | Dự báo nhu cầu thuốc bằng mô hình chuỗi thời gian (python-ml) | M |

### 4.8 Tư vấn trực tuyến (TV)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TV-01 | Phòng gọi video 1-1 (WebRTC, tín hiệu qua Socket.IO), chat và gửi tệp trong cuộc gọi | C |
| FR-TV-02 | Chỉ cho vào phòng khi lịch đã thanh toán, chưa hủy, chưa hoàn thành, trong khung giờ (BR-18) | C |
| FR-TV-03 | Ghi nhận lần đầu bác sĩ phụ trách / bệnh nhân của lịch vào phòng, xác thực bằng token | C |
| FR-TV-04 | Bác sĩ kết luận tư vấn → tạo hồ sơ bệnh án, hoàn thành lịch | C |
| FR-TV-05 | Xử lý ca không diễn ra theo dữ liệu vào phòng (BR-19) | C |

### 4.9 Quản lý điều hành (QL)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-QL-01 | Cấu hình phí khám, cọc, thời hạn hủy và % hoàn cọc, khoảng ngày đặt trước, suất mỗi buổi, tham số BHYT | C |
| FR-QL-02 | Bảng giá dịch vụ khám và CLS; công khai bảng giá trên trang chủ | C |
| FR-QL-03 | Quản lý nhân viên, phòng ban, chuyên khoa, phòng khám, danh mục dược, thông tin cơ sở | C |
| FR-QL-04 | Xếp lịch làm việc, chặn trùng ca và quá 2 ca/ngày; đề xuất và áp dụng phân ca tự động | C |
| FR-QL-05 | Chấm công (WiFi/IP được phép, xác thực khuôn mặt), chấm công thủ công; đơn từ nội bộ và duyệt | M |
| FR-QL-06 | Dashboard KPI và thống kê theo vai trò; báo cáo tài chính, báo cáo hủy lịch, báo cáo toàn diện | C |
| FR-QL-07 | Sao lưu CSDL ra file `.sql` | M |
| FR-QL-08 | Đánh giá ca khám (bác sĩ phản hồi); bài viết sức khỏe (bác sĩ viết → BGĐ duyệt → công khai) | M |
| FR-QL-09 | Tra cứu tổng hợp dữ liệu toàn phòng khám | M |
| FR-QL-10 | Báo cáo bộ phận gửi BGĐ, BGĐ ghi chỉ đạo | M |

### 4.10 Thông báo và cộng tác (TB)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TB-01 | Thông báo trong ứng dụng: danh sách, đánh dấu đã đọc, chống gửi trùng | C |
| FR-TB-02 | Gửi thông báo qua email: OTP, nhắc lịch, check-in, khoản cần đóng, đã thu tiền | M |
| FR-TB-03 | Chat nội bộ nhân viên (Office): chat 1-1 và nhóm, thêm thành viên, rời nhóm, gửi tệp/ảnh, ghim, thả cảm xúc, thu hồi, đã đọc; tin nhắn thời gian thực qua Socket.IO. Truy cập theo quyền `office.truy_cap`; chỉ thành viên đang ở trong phòng mới xem và gửi tin | M |

### 4.11 Trí tuệ nhân tạo (AI)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-AI-01 | Chatbot tư vấn sức khỏe cho bệnh nhân (Gemini, có bộ nhớ đệm, lưu lịch sử, phản hồi câu trả lời) | M |
| FR-AI-02 | Phân luồng chuyên khoa theo triệu chứng (Gemini + mô hình phân loại python-ml) cho khách, bệnh nhân, lễ tân | M |
| FR-AI-03 | Dự báo lượng bệnh nhân theo ngày | M |
| FR-AI-04 | Hỗ trợ bác sĩ: tra phác đồ (RAG), đọc ảnh kết quả xét nghiệm, kiểm tra tương tác thuốc | M |

---

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Lịch hẹn mới giữ chỗ **15 phút** ở trạng thái chờ thanh toán; quá hạn tự hủy | `lich-hen`, `payos` |
| BR-02 | Mỗi bác sĩ nhận tối đa **N lịch hẹn mỗi buổi** (cấu hình, mặc định 3). Áp dụng khi bệnh nhân tự đặt và khi đổi lịch; lễ tân đặt tại quầy được vượt | `lich-hen` |
| BR-03 | Bệnh nhân chỉ hủy trực tuyến khi còn đủ **thời hạn hủy** cấu hình theo hình thức khám (mặc định: trực tiếp 2 giờ, trực tuyến 24 giờ); số tiền chờ hoàn = cọc đã đóng × % hoàn cọc cấu hình. Thu ngân hoàn đúng số đó; hoàn một phần thì phần giữ lại vẫn là doanh thu. Sát giờ hơn thời hạn: không hoàn | `lich-hen`, `thanh-toan` |
| BR-04 | Lịch hẹn trực tiếp **hết ngày hẹn** mà không check-in → hủy, không hoàn cọc, báo bệnh nhân. Trong ngày hẹn, đến trễ vẫn check-in được và xếp theo giờ đến | `lich-hen` |
| BR-05 | Một lịch hẹn chỉ gắn một lượt tiếp nhận chưa hủy | `tiep-nhan` |
| BR-06 | Số thứ tự `A###` (quầy, check-in) / `B###` (kiosk vãng lai), đánh lại từ 001 mỗi ngày, duy nhất theo (ngày, số) | `tiep-nhan` |
| BR-07 | Đối tượng ưu tiên: cấp cứu, trẻ < 6 tuổi, người ≥ 75 tuổi, phụ nữ có thai, khuyết tật nặng, người có công. Hai nhóm tuổi tự nhận theo ngày sinh | `tiep-nhan` |
| BR-08 | Tại kiosk chỉ tự khai: phụ nữ có thai, khuyết tật nặng, người có công | `kiosk` |
| BR-09 | Thứ tự gọi: (0) cấp cứu → (1) ưu tiên theo luật, theo giờ đến → (2) có lịch hẹn đã đến giờ và đến không trễ quá 15 phút, theo giờ hẹn → (3) còn lại, theo giờ đến / giờ qua lượt | `tiep-nhan` |
| BR-10 | Qua lượt: xếp cuối hàng tính từ lúc qua lượt; lần thứ **3** → hủy lượt vắng mặt, tạm ứng chuyển chờ hoàn | `tiep-nhan`, `thanh-toan` |
| BR-11 | Lịch hẹn đã có mặt bị trễ ≥ 15 phút: báo lễ tân và bệnh nhân; ≥ 30 phút: gợi ý bác sĩ cùng chuyên khoa đang trực, ít người chờ nhất. Không chặn bác sĩ đang khám | `tiep-nhan` |
| BR-12 | Trước khi khám phải đóng đủ phần phí khám bệnh nhân chi trả: `phí khám × (1 − tỷ lệ BHYT) − cọc`. Kết quả ≤ 0 hoặc cấp cứu → không thu trước. Khách vãng lai: thu ngân nhập số tiền tạm ứng. Lượt chưa đóng **không bị hủy trong ngày**, chỉ chưa hiện với bác sĩ; hết ngày vẫn chưa khám → hủy lượt, lịch hẹn vắng mặt | `thanh-toan` |
| BR-13 | Mức hưởng BHYT theo ký tự thứ 3 của mã thẻ (định dạng `XX#############`): 1, 2, 5 → 100%; 3 → 95%; 4 → 80%. Thẻ hết hạn → 0%. Thu ngân chọn BHYT khi thu tiền mà chưa nhập thẻ hợp lệ → mức mặc định 80% | `thanh-toan` |
| BR-14 | Đúng tuyến khi: cấp cứu, hoặc chưa cấu hình mã cơ sở KCB, hoặc nơi đăng ký trên thẻ trùng mã phòng khám, hoặc giấy chuyển tuyến còn hiệu lực. Đúng tuyến và tổng chi phí < ngưỡng cấu hình → 100%. Trái tuyến → mức hưởng × % trái tuyến | `thanh-toan` |
| BR-15 | Quyết toán: `thực thu = tổng − BHYT − tạm ứng`; âm thì hoàn phần dư cho bệnh nhân | `thanh-toan` |
| BR-16 | Lượt đã có hóa đơn thanh toán thì không thêm/xóa chỉ định CLS | `xet-nghiem` |
| BR-17 | Chỉ cấp phát thuốc khi hóa đơn lượt khám đã thanh toán; xuất lô hạn dùng gần nhất trước | `nha-thuoc` |
| BR-18 | Phòng tư vấn mở từ 15 phút trước giờ hẹn, đóng sau 60 phút tính từ giờ hẹn hoặc từ lúc hai bên gặp nhau nếu gặp muộn hơn | `queue.gateway` |
| BR-19 | Ca tư vấn đã thanh toán chưa kết luận được xử lý tự động. Khi phòng đóng mà hai bên chưa gặp nhau: bác sĩ không vào → hủy, hoàn phí; chỉ bác sĩ vào → vắng mặt, không hoàn; cả hai vào nhưng lệch giờ → hủy, chờ thu ngân xác minh. Đã gặp nhau nhưng hết ngày hẹn chưa kết luận → hủy, chờ thu ngân xác minh | `lich-hen` |
| BR-23 | Bác sĩ xin hủy ca → lịch `cho_duyet_huy`, Ban giám đốc duyệt thì hoàn đúng cọc đã thu. Chưa duyệt kịp: ca trực tiếp quá giờ hẹn 15 phút, ca trực tuyến hết ngày hẹn → hệ thống tự hủy và hoàn cọc | `lich-hen` |
| BR-24 | Lễ tân hủy lịch phải chọn lỗi bên nào và ghi lý do. Lỗi phía phòng khám → hoàn 100% cọc sau khi Ban giám đốc duyệt; lỗi phía bệnh nhân → áp dụng như BR-03. Mọi lần hủy được ghi nhật ký hủy lịch và báo bệnh nhân | `lich-hen` |
| BR-20 | Mã bệnh nhân `BN`, hồ sơ `HS`, hóa đơn `HD<năm>`, lịch hẹn, số thứ tự sinh từ bộ đếm trong CSDL (`bo_dem_ma`), không trùng khi chạy song song | `db-sequence.util` |
| BR-21 | Khoản chi (phiếu chi hoạt động, chi trả nhà cung cấp) chỉ xuất tiền sau khi Ban giám đốc duyệt; hủy khoản đã xuất phải được duyệt và xác nhận hoàn quỹ | `thanh-toan`, `nha-thuoc` |
| BR-22 | Mỗi chỉ định CLS có phiếu thu `CLS<mã chỉ định>` = giá dịch vụ × (1 − tỷ lệ BHYT). Tạm ứng còn dư sau phí khám tự cấn trừ vào phiếu. Kỹ thuật viên chỉ lấy mẫu khi phiếu đã thu; cấp cứu không thu trước. Hủy chỉ định: chưa lấy mẫu → hoàn phần đã thu; đã lấy mẫu → giữ. Tiền đã thu được trừ khi quyết toán | `xet-nghiem`, `thanh-toan` |

---

## 6. Đặc tả use case chính

### UC-01 Đặt lịch khám và đóng cọc
- **Tác nhân:** Bệnh nhân (A1), PayOS (A13); nhánh hủy: Bác sĩ (A3), Ban giám đốc (A7), Thu ngân (A6).
- **Tiền điều kiện:** Bệnh nhân đã đăng nhập; bác sĩ có ca trực ngày được chọn.
- **Luồng chính:**
  1. Bệnh nhân chọn bác sĩ, ngày, khung giờ.
  2. Hệ thống kiểm tra khung giờ, khoảng ngày đặt trước, suất buổi (BR-02).
  3. Hệ thống tạo lịch `cho_thanh_toan`, giữ chỗ 15 phút, trả link PayOS.
  4. Bệnh nhân thanh toán; PayOS gửi webhook.
  5. Hệ thống xác nhận lịch `da_xac_nhan`, lập hóa đơn cọc `HDT…`, gửi thông báo. Cọc khám trực tiếp theo cấu hình (hiện 10% phí khám); tư vấn trực tuyến đóng 100% phí.
  6. Hệ thống gửi email nhắc lịch trong 24 giờ tới; bệnh nhân đến khám theo UC-02.
- **Luồng thay thế:** 2a. Hết suất → báo "Đã kín". 4a. Quá 15 phút → hủy lịch (BR-01). 6a. Bệnh nhân hủy → BR-03. 6b. Bác sĩ xin hủy ca → BR-23. 6c. Hết ngày hẹn không check-in → hủy, không hoàn cọc (BR-04).
- **Hậu điều kiện:** Lịch hẹn được giữ, cọc được ghi nhận.
- **Sơ đồ:** [BPMN 02](docs/bpmn/02_dat_lich_dat_coc.png).

### UC-02 Tiếp nhận và thu phí trước khám
- **Tác nhân:** Lễ tân (A2), Thu ngân (A6), Kiosk (A10).
- **Luồng chính:**
  1. Lễ tân check-in lịch hẹn hoặc tạo lượt vãng lai, chọn đối tượng ưu tiên.
  2. Hệ thống cấp số thứ tự (BR-06), lập phiếu tạm ứng (BR-12), báo bệnh nhân khoản cần đóng.
  3. Thu ngân thu tạm ứng.
  4. Hệ thống đưa lượt vào hàng đợi bác sĩ, báo bác sĩ.
- **Luồng thay thế:** 2a. Cấp cứu → vào thẳng hàng đợi. 2b. BHYT/cọc đủ → không lập phiếu. 3a. Hết ngày vẫn chưa đóng, chưa khám → hủy lượt (BR-12).
- **Sơ đồ:** [BPMN 01](docs/bpmn/01_kham_benh_truc_tiep.png).

### UC-03 Gọi khám và khám bệnh
- **Tác nhân:** Bác sĩ (A3), Thu ngân (A6), Kỹ thuật viên (A4).
- **Luồng chính:**
  1. Bác sĩ gọi bệnh nhân đầu hàng đợi (BR-09); màn hình gọi số hiển thị và đọc số.
  2. Bác sĩ khám, ghi sinh hiệu, chẩn đoán sơ bộ.
  3. Nếu cần, bác sĩ chỉ định CLS; hệ thống lập phiếu thu `CLS…`; thu ngân thu phí (BR-22); kỹ thuật viên thực hiện, trả kết quả cho bác sĩ.
  4. Bác sĩ chẩn đoán ICD-10, kê đơn, kết thúc khám.
- **Luồng thay thế:** 1a. Vắng mặt → qua lượt (BR-10). 1b. Bác sĩ chậm → báo trễ, gợi ý chuyển (BR-11). 3a. Chưa đóng phí CLS → kỹ thuật viên không thực hiện được. 3b. Bác sĩ hủy chỉ định đã thu phí → tiền được trừ khi quyết toán.

### UC-04 Quyết toán và cấp phát thuốc
- **Tác nhân:** Bệnh nhân (A1), Thu ngân (A6), Nhân viên nhà thuốc (A5).
- **Luồng chính:**
  1. Bác sĩ kết thúc khám; hệ thống lập hóa đơn gộp, tính BHYT (BR-13, BR-14), trừ tạm ứng, cọc và phí CLS đã thu (BR-15).
  2. Bệnh nhân xác nhận một lần phương thức thanh toán và mua thuốc tại phòng khám hay mua ngoài (FR-TT-08); muốn đổi lại phải nhờ thu ngân.
  3. Thu ngân thu thêm hoặc hoàn dư, xác nhận thanh toán; lượt `hoan_thanh`, lịch hẹn và phiếu khám chuyển hoàn thành.
  4. Nếu mua tại phòng khám: nhân viên nhà thuốc cấp phát thuốc (BR-17).

### UC-05 Tư vấn trực tuyến
- **Tác nhân:** Bệnh nhân (A1), Bác sĩ (A3), Thu ngân (A6).
- **Luồng chính:**
  1. Hai bên vào phòng gọi trong khung giờ (BR-18); hệ thống ghi nhận người vào.
  2. Bác sĩ tư vấn và kết luận → hồ sơ bệnh án, lịch hoàn thành.
- **Luồng thay thế:** 1a. Phòng đóng mà hai bên chưa gặp nhau → xử lý theo BR-19. 2a. Đã gặp nhau nhưng hết ngày hẹn chưa kết luận → hủy, chờ thu ngân xác minh. 2b. Bác sĩ xin hủy ca → BR-23.
- **Sơ đồ:** [BPMN 03](docs/bpmn/03_tu_van_truc_tuyen.png).

### UC-06 Mua thuốc từ nhà cung cấp
- **Tác nhân:** Nhân viên nhà thuốc (A5), Ban giám đốc (A7), Thu ngân (A6).
- **Luồng chính:**
  1. Nhà thuốc lập yêu cầu mua; BGĐ duyệt.
  2. Nhà thuốc nhập báo giá, đặt hàng, tiếp nhận hàng vào kho, lập đề nghị chi.
  3. BGĐ duyệt chi; thu ngân chi trả nhà cung cấp (BR-21).
- **Luồng thay thế:** Hủy ở bất kỳ bước nào sau khi đã chi → yêu cầu hủy, BGĐ duyệt, thu ngân xác nhận hoàn quỹ.

### UC-07 Chat nội bộ nhân viên (Office)
- **Tác nhân:** Nhân viên (A2–A9).
- **Tiền điều kiện:** Đã đăng nhập, vai trò có quyền `office.truy_cap`.
- **Luồng chính:**
  1. Nhân viên mở Office; hệ thống tải danh sách phòng chat của người đó, xác thực kết nối Socket.IO bằng JWT.
  2. Nhân viên chọn đồng nghiệp để chat 1-1 hoặc tạo nhóm và thêm thành viên.
  3. Nhân viên gửi tin nhắn, tệp hoặc ảnh; thành viên trong phòng nhận ngay.
  4. Thành viên thả cảm xúc, ghim tin, thu hồi tin của mình, đánh dấu đã đọc.
- **Luồng thay thế:** 3a. Người đã rời nhóm gửi tin → bị từ chối.
- **Hậu điều kiện:** Tin nhắn được lưu và hiển thị cho các thành viên trong phòng.

---

## 7. Yêu cầu dữ liệu

| Thực thể (bảng) | Nội dung chính |
|---|---|
| `nguoi_dung`, `vai_tro`, `quyen_han`, `vai_tro_quyen_han` | Tài khoản, vai trò, ma trận quyền |
| `benh_nhan` | Hồ sơ hành chính; thẻ BHYT: số thẻ, hạn, nơi đăng ký KCB, hiệu lực giấy chuyển tuyến |
| `lich_hen` | Bác sĩ, ngày giờ, hình thức, trạng thái, thời điểm hai bên vào phòng tư vấn |
| `luot_tiep_nhan` | Số thứ tự, ngày đến, bác sĩ, phòng, trạng thái, đối tượng ưu tiên, số lần qua lượt |
| `lich_su_goi_kham` | Lịch sử gọi số (gọi lần đầu, gọi lại, vắng mặt) |
| `ho_so_benh_an`, `benh_an_kham` | Hồ sơ bệnh án và phiếu khám từng lượt |
| `chi_dinh_can_lam_sang`, `dich_vu_xet_nghiem` | Chỉ định và kết quả CLS |
| `don_thuoc`, thuốc, lô thuốc | Đơn thuốc, kho dược theo lô |
| `hoa_don`, `hoa_don_chi_tiet` | Hóa đơn cọc, tạm ứng, quyết toán; tiền hoàn trả |
| `cau_hinh_tien_coc` | Tham số phí khám, cọc, suất buổi, BHYT |
| `bo_dem_ma` | Bộ đếm sinh mã nguyên tử |
| `thong_bao` | Thông báo người dùng (kèm chống gửi trùng) |
| Nhật ký hệ thống | Thao tác người dùng (người làm, vai trò, nội dung, thời điểm) |

Lưu trữ: dữ liệu nhạy cảm được mã hóa AES-256 ở tầng ứng dụng; thời gian lưu theo múi giờ +07:00.

---

## 8. Yêu cầu giao tiếp ngoài

| Mã | Giao tiếp | Mô tả |
|---|---|---|
| EI-01 | REST API | Tiền tố `/api`, JSON; tài liệu Swagger tại `/api/docs` |
| EI-02 | WebSocket (Socket.IO) | Cập nhật hàng đợi, thông báo, tín hiệu WebRTC (`call:*`), chat nội bộ |
| EI-03 | PayOS | Tạo link thanh toán, kiểm tra trạng thái, webhook xác nhận |
| EI-04 | SMTP | Gửi OTP, nhắc lịch, thông báo |
| EI-05 | Google Gemini | Chatbot, phân luồng, RAG phác đồ, đọc ảnh xét nghiệm (qua ai-service) |
| EI-06 | python-ml (FastAPI) | Dự báo lượng bệnh nhân và nhu cầu thuốc, phân loại chuyên khoa, xác thực khuôn mặt |
| EI-07 | office-service | Chat và cộng tác nội bộ nhân viên |
| EI-08 | Cloudinary | Lưu tệp đính kèm, ảnh chấm công |

---

## 9. Yêu cầu phi chức năng

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| NFR-01 | Bảo mật | Mật khẩu băm bcrypt; JWT có thu hồi theo phiên bản token; phân quyền theo vai trò và quyền hạn ở mọi API |
| NFR-02 | Bảo mật | Bệnh nhân chỉ truy cập dữ liệu của chính mình (chống IDOR); phòng gọi video chỉ ghi nhận người vào khi token hợp lệ và đúng người của lịch hẹn |
| NFR-03 | Bảo mật | Service phụ chỉ nhận request từ backend bằng khóa nội bộ |
| NFR-04 | Toàn vẹn | Thao tác tiền (thu, hủy, hoàn, phiếu chi, chốt ca) và sinh mã dùng khóa MySQL `GET_LOCK` / `SELECT … FOR UPDATE`; an toàn khi nhiều instance |
| NFR-05 | Toàn vẹn | Ràng buộc duy nhất (ngày, số thứ tự); cập nhật có điều kiện trạng thái để chống thu trùng |
| NFR-06 | Hiệu năng | Hàng đợi cập nhật thời gian thực qua WebSocket; tác vụ quét hàng đợi giới hạn 1 lần / 5 giây |
| NFR-07 | Sẵn sàng | Tác vụ định kỳ chỉ chạy trên một instance nhờ khóa không chờ; có endpoint `/api/health`; gọi service phụ có thử lại khi khởi động nguội |
| NFR-08 | Khả dụng | Giao diện tiếng Việt, đáp ứng máy tính, máy tính bảng, kiosk cảm ứng, TV gọi số |
| NFR-09 | Bảo trì | Mã nguồn tách module NestJS theo nghiệp vụ; migration SQL đánh số theo ngày |
| NFR-10 | Kiểm thử | Bộ test case API (Postman) cho các luồng tiếp nhận, hàng đợi, thanh toán, BHYT, tư vấn trực tuyến; CI build và chạy test python-ml |
| NFR-11 | Pháp lý | Thứ tự ưu tiên, mức hưởng BHYT, mẫu đơn thuốc theo văn bản tại mục 1.4 |

---

## 10. Ma trận truy xuất

| Use case | Tác nhân | Yêu cầu chức năng | Quy tắc | Module backend | Sơ đồ |
|---|---|---|---|---|---|
| UC-01 | A1, A13, A3, A7, A6 | FR-LH-01…08 | BR-01…04, BR-23 | `lich-hen`, `payos` | BPMN 02 |
| UC-02 | A2, A6, A10 | FR-TN-01…08, FR-TT-01…02 | BR-05…08, BR-12, BR-24 | `tiep-nhan`, `kiosk`, `thanh-toan` | BPMN 01 |
| UC-03 | A3, A6, A4 | FR-TN-09…12, FR-KB-01…07, FR-CLS-01…06 | BR-09…11, BR-16, BR-22 | `tiep-nhan`, `ho-so-benh-an`, `xet-nghiem` | BPMN 01 |
| UC-04 | A1, A6, A5 | FR-TT-03…08, FR-NT-02 | BR-13…15, BR-17 | `thanh-toan`, `nha-thuoc` | BPMN 01 |
| UC-05 | A1, A3, A6 | FR-TV-01…05 | BR-18, BR-19 | `tiep-nhan/queue.gateway`, `lich-hen` | BPMN 03 |
| UC-06 | A5, A7, A6 | FR-NT-03, FR-TT-09 | BR-21 | `nha-thuoc`, `thanh-toan` | — |
| UC-07 | A2–A9 | FR-TB-03 | — | `office`, office-service | — |
