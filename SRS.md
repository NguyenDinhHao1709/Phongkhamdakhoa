# Đặc tả yêu cầu phần mềm (SRS)
## Hệ thống quản lý phòng khám đa khoa

| Mục | Nội dung |
|---|---|
| Phiên bản tài liệu | 2.0 |
| Ngày cập nhật | 12/11/2026 |
| Chuẩn tham chiếu | ISO/IEC/IEEE 29148:2018 (kế thừa IEEE 830) |
| Tài liệu liên quan | [Quy trình khám bệnh & BPMN](docs/QUY_TRINH_KHAM_BENH.md), [README](README.md) |

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Mô tả tổng quan](#2-mô-tả-tổng-quan)
3. [Yêu cầu chức năng](#3-yêu-cầu-chức-năng)
4. [Quy tắc nghiệp vụ](#4-quy-tắc-nghiệp-vụ)
5. [Đặc tả use case chính](#5-đặc-tả-use-case-chính)
6. [Yêu cầu dữ liệu](#6-yêu-cầu-dữ-liệu)
7. [Yêu cầu giao tiếp ngoài](#7-yêu-cầu-giao-tiếp-ngoài)
8. [Yêu cầu phi chức năng](#8-yêu-cầu-phi-chức-năng)
9. [Ma trận truy xuất](#9-ma-trận-truy-xuất)

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu đặc tả các yêu cầu chức năng, quy tắc nghiệp vụ và yêu cầu phi chức năng của hệ thống quản lý phòng khám đa khoa ngoại trú. Đối tượng đọc: hội đồng đánh giá đồ án, nhóm phát triển, kiểm thử và vận hành.

### 1.2 Phạm vi
Hệ thống số hóa toàn bộ quy trình khám ngoại trú của một phòng khám đa khoa: đặt lịch và đặt cọc trực tuyến, tiếp nhận tại quầy/kiosk, hàng đợi có ưu tiên, khám lâm sàng, cận lâm sàng, kê đơn, viện phí có BHYT, cấp phát thuốc, tư vấn video từ xa, quản lý kho dược, nhân sự, chấm công và báo cáo điều hành.

Ngoài phạm vi: điều trị nội trú, liên thông cổng giám định BHYT quốc gia, ký số điện tử.

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
| ICD-10 | Bảng phân loại bệnh tật quốc tế |
| FEFO | Xuất kho lô có hạn dùng gần nhất trước |

### 1.4 Tài liệu tham khảo
- Quyết định 1313/QĐ-BYT về quy trình khám bệnh tại khoa khám bệnh.
- Luật Bảo hiểm y tế và Nghị định 146/2018/NĐ-CP (mức hưởng, ngưỡng 15% lương cơ sở).
- Luật Khám bệnh, chữa bệnh 2023 (thứ tự ưu tiên khám).
- Thông tư 52/2017/TT-BYT (mẫu đơn thuốc).

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh hệ thống

```
 Trình duyệt / Kiosk / App di động (Expo)
        │ HTTPS + Socket.IO
        ▼
 Backend NestJS (REST /api, WebSocket) ──► MySQL 8 (Clever Cloud)
        │            │            │
        ▼            ▼            ▼
   ai-service   office-service  python-ml      PayOS, SMTP, Gemini API
   (RAG, AI)    (chat nội bộ)   (dự báo thuốc)
```

### 2.2 Tác nhân

| Mã | Tác nhân | Mã vai trò | Mô tả |
|---|---|---|---|
| A1 | Bệnh nhân | `benh_nhan` | Đặt lịch, thanh toán, xem hồ sơ, tư vấn video |
| A2 | Lễ tân | `tiep_tan` | Tiếp nhận, check-in, điều phối hàng đợi |
| A3 | Bác sĩ | `bac_si` | Khám, chỉ định, kê đơn, tư vấn video |
| A4 | Kỹ thuật viên | `ky_thuat_vien` | Thực hiện và trả kết quả CLS |
| A5 | Dược sĩ | `nhan_vien_nha_thuoc` | Kho thuốc, cấp phát |
| A6 | Thu ngân | `thu_ngan` | Tạm ứng, quyết toán, hoàn tiền, chốt ca |
| A7 | Ban giám đốc | `ban_giam_doc` | Cấu hình, báo cáo, duyệt |
| A8 | Quản trị viên cấp cao | `quan_tri_vien_cap_cao` | Tài khoản, phân quyền, sao lưu, nhật ký |
| A9 | Hệ thống / tác vụ định kỳ | — | Hủy lịch quá hạn, nhắc lịch, báo trễ hẹn |
| A10 | PayOS | — | Cổng thanh toán, gửi webhook |

### 2.3 Môi trường vận hành
- Backend: Node.js 20, NestJS 10, triển khai trên Render (tự deploy từ nhánh `main`).
- Frontend: React 18 + Vite 5, bản build tĩnh trên cPanel.
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

## 3. Yêu cầu chức năng

Mức ưu tiên: **C** = bắt buộc, **M** = nên có.

### 3.1 Tài khoản và phân quyền (AUTH)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-AUTH-01 | Đăng ký tài khoản bệnh nhân bằng email hoặc số điện thoại, xác thực OTP | C |
| FR-AUTH-02 | Đăng nhập trả JWT access token và refresh token | C |
| FR-AUTH-03 | Mỗi API kiểm tra vai trò người gọi; truy cập trái phép trả 403 | C |
| FR-AUTH-04 | Quản trị viên tạo, khóa tài khoản nhân viên và gán vai trò | C |
| FR-AUTH-05 | Ghi nhật ký thao tác nghiệp vụ quan trọng | M |

### 3.2 Đặt lịch và đặt cọc (LH)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-LH-01 | Hiển thị khung giờ trống của bác sĩ theo ngày, đánh dấu buổi "Đã kín" khi hết suất | C |
| FR-LH-02 | Tạo lịch hẹn trực tiếp hoặc trực tuyến ở trạng thái chờ thanh toán, giữ chỗ 15 phút (BR-01, BR-02) | C |
| FR-LH-03 | Tạo link thanh toán PayOS, nhận webhook, xác nhận lịch và lập hóa đơn cọc `HDT…` | C |
| FR-LH-04 | Tự hủy lịch quá hạn thanh toán và nhả khung giờ | C |
| FR-LH-05 | Bệnh nhân hủy lịch và khai tài khoản nhận hoàn khi đủ điều kiện (BR-03) | C |
| FR-LH-06 | Đổi lịch hẹn, áp dụng lại kiểm tra suất buổi | C |
| FR-LH-07 | Bác sĩ gửi yêu cầu hủy ca; lễ tân/quản trị duyệt | M |
| FR-LH-08 | Gửi email nhắc lịch hẹn trong 24 giờ tới, tự động và thủ công | M |
| FR-LH-09 | Lễ tân đặt lịch hộ khách tại quầy | C |

### 3.3 Tiếp nhận và hàng đợi (TN)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TN-01 | Tìm hoặc tạo hồ sơ bệnh nhân (mã `BNxxxxxx` không trùng) | C |
| FR-TN-02 | Check-in lịch hẹn hôm nay tại quầy; không tạo lượt trùng cho cùng lịch hẹn (BR-05) | C |
| FR-TN-03 | Tạo lượt khám vãng lai: chọn chuyên khoa, bác sĩ, phòng, đối tượng ưu tiên | C |
| FR-TN-04 | Cấp số thứ tự theo ngày, không trùng giữa quầy và kiosk (BR-06) | C |
| FR-TN-05 | Kiosk tự phục vụ: check-in lịch hẹn, lấy số vãng lai, tự khai ưu tiên giới hạn (BR-08) | C |
| FR-TN-06 | Tự nhận đối tượng ưu tiên theo tuổi; lễ tân đổi được đối tượng ưu tiên (BR-07) | C |
| FR-TN-07 | Hàng đợi bác sĩ chỉ gồm lượt đã đóng đủ tạm ứng (hoặc cấp cứu), sắp xếp theo BR-09 | C |
| FR-TN-08 | Cập nhật hàng đợi thời gian thực cho lễ tân, bác sĩ, màn hình gọi số, TV | C |
| FR-TN-09 | Bác sĩ/lễ tân đánh dấu "Vắng – qua lượt" (BR-10) | C |
| FR-TN-10 | Báo trễ hẹn 15 phút và gợi ý chuyển bác sĩ khi trễ 30 phút (BR-11) | C |
| FR-TN-11 | Bệnh nhân xem tiến độ: số người phía trước, thời gian chờ ước tính, thông báo trễ | M |
| FR-TN-12 | Điều phối chuyển lượt sang bác sĩ / phòng khác | C |

### 3.4 Khám bệnh và hồ sơ bệnh án (KB)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-KB-01 | Ghi sinh hiệu: mạch, nhiệt độ, huyết áp, SpO2, cân nặng, chiều cao | C |
| FR-KB-02 | Ghi triệu chứng, khám lâm sàng, chẩn đoán sơ bộ | C |
| FR-KB-03 | Chẩn đoán xác định theo mã ICD-10 | C |
| FR-KB-04 | Kê đơn thuốc: tìm thuốc, liều, số lượng, cách dùng | C |
| FR-KB-05 | Kết thúc khám: hướng điều trị, hẹn tái khám, chuyển lượt sang chờ thanh toán | C |
| FR-KB-06 | In phiếu khám ngoại trú và đơn thuốc theo mẫu Bộ Y tế | M |
| FR-KB-07 | Hồ sơ bệnh án điện tử (mã `HSxxxxxx`) tra cứu theo bệnh nhân | C |

### 3.5 Cận lâm sàng (CLS)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-CLS-01 | Bác sĩ chỉ định xét nghiệm / chẩn đoán hình ảnh cho lượt khám | C |
| FR-CLS-02 | Kỹ thuật viên nhận danh sách chỉ định, chuyển trạng thái lấy mẫu → xử lý → có kết quả | C |
| FR-CLS-03 | Nhập kết quả (giá trị, đơn vị, khoảng tham chiếu, nhận xét) và tải ảnh/tệp kết quả | C |
| FR-CLS-04 | Không thêm hoặc xóa chỉ định sau khi lượt đã thanh toán (BR-16) | C |

### 3.6 Viện phí và thanh toán (TT)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TT-01 | Tự lập phiếu tạm ứng phí khám khi tiếp nhận (BR-12) | C |
| FR-TT-02 | Thu tạm ứng; chống thu trùng khi nhiều quầy cùng thao tác | C |
| FR-TT-03 | Quyết toán: gộp phí khám, CLS, thuốc; trừ BHYT (BR-13, BR-14) và tạm ứng/cọc; tính thu thêm hoặc hoàn dư | C |
| FR-TT-04 | Thanh toán bằng tiền mặt, chuyển khoản; in hóa đơn | C |
| FR-TT-05 | Hủy hóa đơn, hoàn cọc/tạm ứng với số tiền thực tế | C |
| FR-TT-06 | Danh sách "chờ hoàn" để thu ngân xử lý hoàn tiền | C |
| FR-TT-07 | Phiếu chi hoạt động, chốt ca thu ngân, thống kê doanh thu ròng sau hoàn | M |

### 3.7 Nhà thuốc (NT)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-NT-01 | Danh mục thuốc, lô, hạn dùng, tồn kho, cảnh báo sắp hết / sắp hết hạn | C |
| FR-NT-02 | Cấp phát đơn thuốc chỉ khi hóa đơn đã thanh toán (BR-17); xuất kho FEFO | C |
| FR-NT-03 | Mua hàng, nhập kho, so sánh báo giá, công nợ nhà cung cấp | M |
| FR-NT-04 | Dự báo nhu cầu thuốc bằng mô hình chuỗi thời gian (python-ml) | M |

### 3.8 Tư vấn trực tuyến (TV)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-TV-01 | Phòng gọi video 1-1 (WebRTC, tín hiệu qua Socket.IO), chat và gửi tệp trong cuộc gọi | C |
| FR-TV-02 | Chỉ cho vào phòng khi lịch đã thanh toán, chưa hủy, chưa hoàn thành, trong khung giờ (BR-18) | C |
| FR-TV-03 | Ghi nhận lần đầu bác sĩ phụ trách / bệnh nhân của lịch vào phòng, xác thực bằng token | C |
| FR-TV-04 | Bác sĩ kết luận tư vấn → tạo hồ sơ bệnh án, hoàn thành lịch | C |
| FR-TV-05 | Xử lý ca không diễn ra theo dữ liệu vào phòng (BR-19) | C |

### 3.9 Quản lý điều hành (QL)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-QL-01 | Cấu hình phí khám, cọc, thời hạn hủy và % hoàn cọc, khoảng ngày đặt trước, suất mỗi buổi, tham số BHYT | C |
| FR-QL-02 | Bảng giá dịch vụ CLS | C |
| FR-QL-03 | Quản lý nhân viên, chuyên khoa, phòng khám | C |
| FR-QL-04 | Xếp lịch làm việc, chặn trùng ca và quá 2 ca/ngày | C |
| FR-QL-05 | Chấm công, đơn từ nội bộ, duyệt yêu cầu | M |
| FR-QL-06 | Dashboard KPI: lượt khám, doanh thu, bệnh nhân mới; báo cáo tài chính | C |
| FR-QL-07 | Sao lưu CSDL ra file `.sql` | M |
| FR-QL-08 | Đánh giá ca khám của bệnh nhân, bài viết sức khỏe | M |

### 3.10 Trí tuệ nhân tạo (AI)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-AI-01 | Chatbot tư vấn sức khỏe cho bệnh nhân (Gemini, có bộ nhớ đệm câu trả lời) | M |
| FR-AI-02 | Gợi ý phân luồng chuyên khoa theo triệu chứng | M |

---

## 4. Quy tắc nghiệp vụ

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Lịch hẹn mới giữ chỗ **15 phút** ở trạng thái chờ thanh toán; quá hạn tự hủy | `lich-hen`, `payos` |
| BR-02 | Mỗi bác sĩ nhận tối đa **N lịch hẹn mỗi buổi** (cấu hình, mặc định 3). Áp dụng khi bệnh nhân tự đặt và khi đổi lịch; lễ tân đặt tại quầy được vượt | `lich-hen` |
| BR-03 | Bệnh nhân chỉ hủy trực tuyến khi còn đủ **thời hạn hủy** cấu hình theo hình thức khám (mặc định: trực tiếp 2 giờ, trực tuyến 24 giờ); số tiền chờ hoàn = cọc đã đóng × % hoàn cọc cấu hình. Thu ngân hoàn đúng số đó; hoàn một phần thì phần giữ lại vẫn là doanh thu. Sát giờ hơn thời hạn: không hoàn | `lich-hen`, `thanh-toan` |
| BR-04 | Lịch hẹn trực tiếp quá giờ hẹn **15 phút** chưa check-in → hủy | `lich-hen` |
| BR-05 | Một lịch hẹn chỉ gắn một lượt tiếp nhận chưa hủy | `tiep-nhan` |
| BR-06 | Số thứ tự `A###` (quầy, check-in) / `B###` (kiosk vãng lai), đánh lại từ 001 mỗi ngày, duy nhất theo (ngày, số) | `tiep-nhan` |
| BR-07 | Đối tượng ưu tiên: cấp cứu, trẻ < 6 tuổi, người ≥ 75 tuổi, phụ nữ có thai, khuyết tật nặng, người có công. Hai nhóm tuổi tự nhận theo ngày sinh | `tiep-nhan` |
| BR-08 | Tại kiosk chỉ tự khai: phụ nữ có thai, khuyết tật nặng, người có công | `kiosk` |
| BR-09 | Thứ tự gọi: (0) cấp cứu → (1) ưu tiên theo luật, theo giờ đến → (2) có lịch hẹn đã đến giờ và đến không trễ quá 15 phút, theo giờ hẹn → (3) còn lại, theo giờ đến / giờ qua lượt | `tiep-nhan` |
| BR-10 | Qua lượt: xếp cuối hàng tính từ lúc qua lượt; lần thứ **3** → hủy lượt vắng mặt, tạm ứng chuyển chờ hoàn | `tiep-nhan`, `thanh-toan` |
| BR-11 | Lịch hẹn đã có mặt bị trễ ≥ 15 phút: báo lễ tân và bệnh nhân; ≥ 30 phút: gợi ý bác sĩ cùng chuyên khoa đang trực, ít người chờ nhất. Không chặn bác sĩ đang khám | `tiep-nhan` |
| BR-12 | Trước khi khám phải đóng đủ phần phí khám bệnh nhân chi trả: `phí khám × (1 − tỷ lệ BHYT) − cọc`. Kết quả ≤ 0 hoặc cấp cứu → không thu trước. Khách vãng lai: thu ngân nhập số tiền tạm ứng. Lịch hẹn quá giờ 15 phút chưa đóng → hủy lượt | `thanh-toan` |
| BR-13 | Mức hưởng BHYT theo ký tự thứ 3 của mã thẻ (định dạng `XX#############`): 1, 2, 5 → 100%; 3 → 95%; 4 → 80%. Thẻ hết hạn → 0%. Thu ngân chọn BHYT khi thu tiền mà chưa nhập thẻ hợp lệ → mức mặc định 80% | `thanh-toan` |
| BR-14 | Đúng tuyến khi: cấp cứu, hoặc chưa cấu hình mã cơ sở KCB, hoặc nơi đăng ký trên thẻ trùng mã phòng khám, hoặc giấy chuyển tuyến còn hiệu lực. Đúng tuyến và tổng chi phí < ngưỡng cấu hình → 100%. Trái tuyến → mức hưởng × % trái tuyến | `thanh-toan` |
| BR-15 | Quyết toán: `thực thu = tổng − BHYT − tạm ứng`; âm thì hoàn phần dư cho bệnh nhân | `thanh-toan` |
| BR-16 | Lượt đã có hóa đơn thanh toán thì không thêm/xóa chỉ định CLS | `xet-nghiem` |
| BR-17 | Chỉ cấp phát thuốc khi hóa đơn lượt khám đã thanh toán; xuất lô hạn dùng gần nhất trước | `nha-thuoc` |
| BR-18 | Phòng tư vấn mở từ 15 phút trước giờ hẹn đến 60 phút sau giờ hẹn (hoặc sau lúc bắt đầu thực tế) | `queue.gateway` |
| BR-19 | Ca tư vấn đã thanh toán, hết ngày chưa kết luận: bác sĩ không vào → hoàn phí; bác sĩ vào, bệnh nhân không vào → vắng mặt, không hoàn; cả hai vào → chờ thu ngân xác minh | `lich-hen` |
| BR-20 | Mã bệnh nhân `BN`, hồ sơ `HS`, hóa đơn `HD<năm>`, lịch hẹn, số thứ tự sinh từ bộ đếm trong CSDL (`bo_dem_ma`), không trùng khi chạy song song | `db-sequence.util` |

---

## 5. Đặc tả use case chính

### UC-01 Đặt lịch khám và đóng cọc
- **Tác nhân:** Bệnh nhân (A1), PayOS (A10).
- **Tiền điều kiện:** Bệnh nhân đã đăng nhập; bác sĩ có ca trực ngày được chọn.
- **Luồng chính:**
  1. Bệnh nhân chọn bác sĩ, ngày, khung giờ.
  2. Hệ thống kiểm tra khung giờ, khoảng ngày đặt trước, suất buổi (BR-02).
  3. Hệ thống tạo lịch `cho_thanh_toan`, giữ chỗ 15 phút, trả link PayOS.
  4. Bệnh nhân thanh toán; PayOS gửi webhook.
  5. Hệ thống xác nhận lịch `da_xac_nhan`, lập hóa đơn cọc `HDT…`, gửi thông báo.
- **Luồng thay thế:** 2a. Hết suất → báo "Đã kín". 4a. Quá 15 phút → hủy lịch (BR-01).
- **Hậu điều kiện:** Lịch hẹn được giữ, cọc được ghi nhận.
- **Sơ đồ:** [BPMN 02](docs/bpmn/02_dat_lich_dat_coc.png).

### UC-02 Tiếp nhận và thu phí trước khám
- **Tác nhân:** Lễ tân (A2), Thu ngân (A6), Kiosk.
- **Luồng chính:**
  1. Lễ tân check-in lịch hẹn hoặc tạo lượt vãng lai, chọn đối tượng ưu tiên.
  2. Hệ thống cấp số thứ tự (BR-06), lập phiếu tạm ứng (BR-12).
  3. Thu ngân thu tạm ứng.
  4. Hệ thống đưa lượt vào hàng đợi bác sĩ, báo bác sĩ.
- **Luồng thay thế:** 2a. Cấp cứu → vào thẳng hàng đợi. 2b. BHYT/cọc đủ → không lập phiếu. 3a. Lịch hẹn quá 15 phút chưa đóng → hủy lượt.
- **Sơ đồ:** [BPMN 01](docs/bpmn/01_kham_benh_truc_tiep.png).

### UC-03 Gọi khám và khám bệnh
- **Tác nhân:** Bác sĩ (A3), Kỹ thuật viên (A4).
- **Luồng chính:**
  1. Bác sĩ gọi bệnh nhân đầu hàng đợi (BR-09).
  2. Bác sĩ khám, ghi sinh hiệu, chẩn đoán sơ bộ.
  3. Nếu cần, chỉ định CLS; kỹ thuật viên trả kết quả.
  4. Bác sĩ chẩn đoán ICD-10, kê đơn, kết thúc khám.
- **Luồng thay thế:** 1a. Vắng mặt → qua lượt (BR-10). 1b. Bác sĩ chậm → báo trễ, gợi ý chuyển (BR-11).

### UC-04 Quyết toán và cấp phát thuốc
- **Tác nhân:** Thu ngân (A6), Dược sĩ (A5).
- **Luồng chính:**
  1. Hệ thống lập hóa đơn gộp, tính BHYT (BR-13, BR-14), trừ tạm ứng (BR-15).
  2. Thu ngân thu thêm hoặc hoàn dư, xác nhận thanh toán; lượt `hoan_thanh`.
  3. Dược sĩ cấp phát thuốc (BR-17).

### UC-05 Tư vấn trực tuyến
- **Tác nhân:** Bệnh nhân (A1), Bác sĩ (A3), Thu ngân (A6).
- **Luồng chính:**
  1. Hai bên vào phòng gọi trong khung giờ (BR-18); hệ thống ghi nhận người vào.
  2. Bác sĩ tư vấn và kết luận → hồ sơ bệnh án, lịch hoàn thành.
- **Luồng thay thế:** 2a. Hết ngày chưa kết luận → xử lý theo BR-19.
- **Sơ đồ:** [BPMN 03](docs/bpmn/03_tu_van_truc_tuyen.png).

---

## 6. Yêu cầu dữ liệu

| Thực thể (bảng) | Nội dung chính |
|---|---|
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

Lưu trữ: dữ liệu nhạy cảm được mã hóa AES-256 ở tầng ứng dụng; thời gian lưu theo múi giờ +07:00.

---

## 7. Yêu cầu giao tiếp ngoài

| Mã | Giao tiếp | Mô tả |
|---|---|---|
| EI-01 | REST API | Tiền tố `/api`, JSON; tài liệu Swagger tại `/api/docs` |
| EI-02 | WebSocket (Socket.IO) | Cập nhật hàng đợi, thông báo, tín hiệu WebRTC (`call:*`) |
| EI-03 | PayOS | Tạo link thanh toán, kiểm tra trạng thái, webhook xác nhận |
| EI-04 | SMTP | Gửi OTP, nhắc lịch, thông báo |
| EI-05 | Google Gemini | Chatbot và phân luồng (qua ai-service) |
| EI-06 | python-ml (FastAPI) | Dự báo nhu cầu thuốc |
| EI-07 | office-service | Chat và cộng tác nội bộ nhân viên |

---

## 8. Yêu cầu phi chức năng

| Mã | Nhóm | Yêu cầu |
|---|---|---|
| NFR-01 | Bảo mật | Mật khẩu băm bcrypt; xác thực JWT; phân quyền theo vai trò ở mọi API |
| NFR-02 | Bảo mật | Phòng gọi video chỉ ghi nhận người vào khi token hợp lệ và đúng người của lịch hẹn |
| NFR-03 | Toàn vẹn | Thao tác tiền (thu, hủy, hoàn, phiếu chi, chốt ca) và sinh mã dùng khóa MySQL `GET_LOCK` / `SELECT … FOR UPDATE`; an toàn khi nhiều instance |
| NFR-04 | Toàn vẹn | Ràng buộc duy nhất (ngày, số thứ tự); cập nhật có điều kiện trạng thái để chống thu trùng |
| NFR-05 | Hiệu năng | Hàng đợi cập nhật thời gian thực qua WebSocket; tác vụ quét hàng đợi giới hạn 1 lần / 5 giây |
| NFR-06 | Sẵn sàng | Tác vụ định kỳ chỉ chạy trên một instance nhờ khóa không chờ; có endpoint `/api/health` |
| NFR-07 | Khả dụng | Giao diện tiếng Việt, đáp ứng máy tính, máy tính bảng, kiosk cảm ứng, TV gọi số; app di động cho bệnh nhân |
| NFR-08 | Bảo trì | Mã nguồn tách module NestJS theo nghiệp vụ; migration SQL đánh số theo ngày |
| NFR-09 | Kiểm thử | Bộ kiểm thử đầu-cuối các luồng tiếp nhận, hàng đợi, thanh toán, BHYT, tư vấn trực tuyến |
| NFR-10 | Pháp lý | Thứ tự ưu tiên, mức hưởng BHYT, mẫu đơn thuốc theo văn bản tại mục 1.4 |

---

## 9. Ma trận truy xuất

| Use case | Yêu cầu chức năng | Quy tắc | Module backend | Sơ đồ |
|---|---|---|---|---|
| UC-01 | FR-LH-01…06, FR-LH-08 | BR-01…03 | `lich-hen`, `payos` | BPMN 02 |
| UC-02 | FR-TN-01…08, FR-TT-01…02 | BR-04…08, BR-12 | `tiep-nhan`, `kiosk`, `thanh-toan` | BPMN 01 |
| UC-03 | FR-TN-09…12, FR-KB-01…07, FR-CLS-01…04 | BR-09…11, BR-16 | `tiep-nhan`, `ho-so-benh-an`, `xet-nghiem` | BPMN 01 |
| UC-04 | FR-TT-03…07, FR-NT-02 | BR-13…15, BR-17 | `thanh-toan`, `nha-thuoc` | BPMN 01 |
| UC-05 | FR-TV-01…05 | BR-18, BR-19 | `tiep-nhan/queue.gateway`, `lich-hen` | BPMN 03 |
