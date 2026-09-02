Tài khoản test:admin 123456
vào đó xem tài khoản của nhân viên 
# Hệ thống Quản Lý Phòng Khám Đa Khoa

## 1. Tổng quan
Hệ thống quản lý phòng khám đa khoa được thiết kế nhằm hỗ trợ tự động hóa quy trình khám chữa bệnh, quản lý lịch hẹn, hồ sơ bệnh nhân, đặt lịch khám, kê đơn thuốc, xét nghiệm, tư vấn trực tuyến và báo cáo thống kê. Hệ thống giúp tối ưu hóa công việc cho nhân viên, tiếp tân, bác sĩ, kỹ thuật viên xét nghiệm và giám đốc, đồng thời nâng cao hiệu quả phục vụ bệnh nhân.

## 2. Mục tiêu hệ thống
- Quản lý thông tin cá nhân và lịch làm việc của nhân viên.
- Hỗ trợ tiếp tân trong việc đặt lịch hẹn, tiếp nhận bệnh nhân và theo dõi tình trạng khám.
- Giúp bác sĩ quản lý hồ sơ bệnh án, chẩn đoán, kê đơn thuốc và chỉ định cận lâm sàng.
- Hỗ trợ kỹ thuật viên xét nghiệm thực hiện lấy mẫu, nhập kết quả và cập nhật tiến độ xét nghiệm.
- Tạo báo cáo thống kê cho các bộ phận liên quan.
- Tăng tính minh bạch, nhanh chóng và chính xác trong quy trình khám chữa bệnh.

## 3. Đối tượng sử dụng
### 3.1 Nhân viên
- Xem thông tin cá nhân.
- Xem lịch làm việc cá nhân.
- Gửi đơn hoặc yêu cầu đến giám đốc.

### 3.2 Tiếp tân
- Quản lý danh sách đặt lịch hẹn.
- Tiếp nhận bệnh nhân tại quầy.
- Cập nhật sinh hiệu ban đầu.
- Điều phối bệnh nhân vào phòng khám phù hợp.
- Xem báo cáo khách hàng/bệnh nhân.

### 3.3 Bác sĩ
- Khám trực tuyến cho bệnh nhân.
- Xem danh sách hàng đợi phòng khám.
- Quản lý hồ sơ bệnh án.
- Lập bệnh án lâm sàng.
- Kê đơn thuốc điện tử.
- Xem lịch tư vấn.
- Chỉ định cận lâm sàng (xét nghiệm, X-quang).
- Đặt lịch khám tiếp theo cho bệnh nhân.
- Xem kết quả xét nghiệm.
- Thống kê báo cáo bệnh nhân.

### 3.4 Kỹ thuật viên xét nghiệm
- Xem danh sách chỉ định cận lâm sàng.
- Cập nhật trạng thái lấy mẫu.
- Nhập và gửi kết quả xét nghiệm.
- Xem báo cáo kết quả xét nghiệm.

### 3.5 Quản lý/giám đốc
- Theo dõi tình trạng hoạt động của phòng khám.
- Xem báo cáo liên quan đến quy trình khám chữa và nhân sự.

## 4. Chức năng chính của hệ thống
### 4.1 Quản lý thông tin và nhân sự
- Lưu trữ thông tin cá nhân nhân viên.
- Hiển thị lịch làm việc và hỗ trợ gửi đơn khiếu nại, đề nghị.

### 4.2 Quản lý đặt lịch và tiếp nhận bệnh nhân
- Bệnh nhân có thể đặt lịch hẹn hoặc được tiếp nhận trực tiếp.
- Tiếp tân xem danh sách lịch hẹn, lọc và cập nhật trạng thái.
- Hệ thống ghi nhận bệnh nhân đã đến khám và cập nhật hồ sơ.

### 4.3 Quản lý hồ sơ bệnh án
- Bác sĩ xem và cập nhật hồ sơ bệnh án của bệnh nhân.
- Ghi nhận triệu chứng, chẩn đoán, kết quả khám và các thay đổi liên quan.

### 4.4 Quản lý xét nghiệm và cận lâm sàng
- Bác sĩ chỉ định xét nghiệm/X-quang cho bệnh nhân.
- Kỹ thuật viên nhận chỉ định, lấy mẫu và cập nhật tiến độ.
- Kỹ thuật viên nhập kết quả xét nghiệm và gửi cho bác sĩ xem.

### 4.5 Quản lý thuốc và đơn thuốc điện tử
- Bác sĩ kê thuốc điện tử theo chẩn đoán và chỉ định điều trị.
- Hệ thống lưu đơn thuốc và chuyển đến bộ phận nhà thuốc.

### 4.6 Tư vấn và khám trực tuyến
- Bác sĩ xem lịch tư vấn trực tuyến.
- Tiến hành khám, tư vấn và lưu kết quả vào hồ sơ bệnh nhân.

### 4.7 Báo cáo thống kê
- Hệ thống cho phép thống kê báo cáo theo nhiều tiêu chí như khách hàng, bệnh nhân, xét nghiệm, lịch hẹn và hoạt động khám chữa.
- Người dùng có thể xem báo cáo trực tiếp hoặc xuất báo cáo khi cần.

## 5. Danh sách use case chính

### 5.1 Nhân viên
| Mã use case | Tên use case | Mục tiêu |
|---|---|---|
| UC-NV-01 | Xem thông tin cá nhân | Cho phép nhân viên xem thông tin cá nhân đã lưu trên hệ thống. |
| UC-NV-02 | Xem lịch làm việc | Cho phép nhân viên xem lịch làm việc của bản thân. |
| UC-NV-03 | Gửi đơn cho giám đốc | Cho phép nhân viên gửi đơn hoặc yêu cầu đến giám đốc. |

### 5.2 Tiếp tân
| Mã use case | Tên use case | Mục tiêu |
|---|---|---|
| UC-TT-01 | Quản lý danh sách đặt lịch hẹn | Quản lý các lịch hẹn của bệnh nhân. |
| UC-TT-02 | Tiếp nhận bệnh nhân tại quầy | Tiếp nhận bệnh nhân khi đến phòng khám. |
| UC-TT-03 | Cập nhật sinh hiệu ban đầu | Ghi nhận chỉ số sinh hiệu của bệnh nhân. |
| UC-TT-04 | Điều phối bệnh nhân vào phòng khám | Phân bệnh nhân vào phòng khám phù hợp. |
| UC-TT-05 | Thống kê báo cáo khách hàng | Xem các báo cáo liên quan đến khách hàng/bệnh nhân. |

### 5.3 Bác sĩ
| Mã use case | Tên use case | Mục tiêu |
|---|---|---|
| UC-BS-01 | Khám trực tuyến | Thực hiện khám và tư vấn cho bệnh nhân trực tuyến. |
| UC-BS-02 | Xem danh sách hàng đợi phòng khám | Xem bệnh nhân đang chờ khám. |
| UC-BS-03 | Quản lý hồ sơ bệnh án | Xem và quản lý hồ sơ bệnh án của bệnh nhân. |
| UC-BS-04 | Lập bệnh án lâm sàng | Ghi nhận thông tin khám và kết luận lâm sàng. |
| UC-BS-05 | Kê đơn thuốc điện tử | Kê thuốc cho bệnh nhân dưới dạng đơn điện tử. |
| UC-BS-06 | Xem lịch tư vấn | Xem lịch tư vấn/khám đã được phân công. |
| UC-BS-07 | Chỉ định cận lâm sàng | Chỉ định xét nghiệm hoặc chẩn đoán hình ảnh. |
| UC-BS-08 | Đặt lịch khám hộ bệnh nhân | Đặt lịch khám tiếp theo cho bệnh nhân. |
| UC-BS-09 | Xem kết quả xét nghiệm | Xem kết quả xét nghiệm của bệnh nhân. |
| UC-BS-10 | Thống kê báo cáo bệnh nhân | Xem báo cáo liên quan đến bệnh nhân và hoạt động khám chữa bệnh. |

### 5.4 Kỹ thuật viên xét nghiệm
| Mã use case | Tên use case | Mục tiêu |
|---|---|---|
| UC-KTV-01 | Xem danh sách chỉ định cận lâm sàng | Xem các chỉ định xét nghiệm cần thực hiện. |
| UC-KTV-02 | Cập nhật trạng thái lấy mẫu | Cập nhật tiến độ lấy mẫu xét nghiệm. |
| UC-KTV-03 | Nhập và gửi kết quả xét nghiệm | Nhập kết quả xét nghiệm và cập nhật vào hồ sơ bệnh nhân. |
| UC-KTV-04 | Thống kê báo cáo kết quả | Theo dõi báo cáo hoạt động xét nghiệm. |

## 6. Luồng nghiệp vụ tiêu biểu
### 6.1 Quy trình đặt lịch và tiếp nhận bệnh nhân
1. Bệnh nhân đặt lịch hẹn hoặc đến trực tiếp phòng khám.
2. Tiếp tân tìm kiếm thông tin bệnh nhân và lịch hẹn.
3. Hệ thống hiển thị thông tin bệnh nhân, lịch hẹn và trạng thái hiện tại.
4. Tiếp tân xác nhận bệnh nhân đến khám.
5. Hệ thống ghi nhận trạng thái tiếp nhận và lưu hồ sơ bệnh nhân.
6. Nếu có yêu cầu, tiếp tân cập nhật sinh hiệu ban đầu và điều phối bệnh nhân vào phòng khám phù hợp.

### 6.2 Quy trình khám bệnh
1. Bác sĩ xem danh sách bệnh nhân đang chờ khám.
2. Bác sĩ mở hồ sơ bệnh án của bệnh nhân.
3. Bác sĩ thực hiện khám, ghi nhận triệu chứng và lập bệnh án lâm sàng.
4. Bác sĩ chỉ định xét nghiệm hoặc hình ảnh cận lâm sàng nếu cần thiết.
5. Bác sĩ kê đơn thuốc điện tử và đặt lịch khám tiếp theo (nếu cần).
6. Hệ thống lưu toàn bộ thông tin vào hồ sơ bệnh nhân.

### 6.3 Quy trình xét nghiệm
1. Kỹ thuật viên xem danh sách chỉ định cận lâm sàng.
2. Thực hiện lấy mẫu theo chỉ định.
3. Cập nhật trạng thái lấy mẫu và tiến độ xét nghiệm.
4. Nhập kết quả xét nghiệm.
5. Gửi kết quả đến hệ thống để bác sĩ có thể xem và đánh giá.

### 6.4 Quy trình báo cáo
1. Người dùng chọn chức năng báo cáo tương ứng.
2. Chọn khoảng thời gian và tiêu chí thống kê.
3. Hệ thống tổng hợp dữ liệu.
4. Hiển thị báo cáo hoặc xuất báo cáo theo nhu cầu.

## 7. Yêu cầu hệ thống chung
- Hệ thống phải đảm bảo đăng nhập an toàn cho từng vai trò người dùng.
- Người dùng chỉ được xem và thao tác trên dữ liệu phù hợp với quyền hạn của mình.
- Dữ liệu bệnh nhân, hồ sơ bệnh án và kết quả xét nghiệm phải được lưu an toàn và không bị mất mát.
- Hệ thống cần cảnh báo khi dữ liệu nhập không hợp lệ.
- Hệ thống phải hỗ trợ tìm kiếm, lọc, cập nhật và hiển thị thông tin theo thời gian thực.
- Báo cáo phải được tổng hợp từ dữ liệu thống nhất và chính xác.

## 8. Kết luận
Hệ thống quản lý phòng khám đa khoa giúp kết nối và đồng bộ hoạt động giữa các đơn vị: tiếp tân, bác sĩ, kỹ thuật viên xét nghiệm và quản lý. Với mô hình nghiệp vụ rõ ràng, chức năng được tổ chức theo từng vai trò, hệ thống không chỉ hỗ trợ hiệu suất vận hành nội bộ mà còn nâng cao chất lượng dịch vụ chăm sóc bệnh nhân và khả năng ra quyết định quản lý dựa trên dữ liệu.


1. Cơ chế Bảo mật Y tế (Data Security & Privacy)

Mã hóa dữ liệu nhạy cảm: Mật khẩu chắc chắn phải được băm (hash) bằng bcrypt/argon2. Tuy nhiên, với một hệ thống y tế, bạn cần đề cập thêm việc mã hóa thông tin bệnh án khi lưu trữ (Data at rest) để chứng minh phần mềm có quan tâm đến quyền riêng tư của người bệnh.

Che giấu dữ liệu (Data Masking): Trên giao diện của Tiếp tân hoặc Thu ngân, một số thông tin như số điện thoại hay CCCD của bệnh nhân nên được che một phần (VD: 090***123) khi không cần thiết phải hiển thị toàn bộ.

2. Dấu vết Kiểm toán (Audit Logging)

Lưu vết thao tác (Audit Trails): Bắt buộc phải có cơ chế ghi log lại các hành động nhạy cảm: Ai đã sửa bệnh án này? Thu ngân nào đã hủy hóa đơn? Thao tác diễn ra lúc mấy giờ, từ địa chỉ IP nào? Đây là "vũ khí" bắt buộc để giải quyết mọi tranh chấp trong các hệ thống doanh nghiệp thực tế.

Quản lý lỗi tập trung: Đề cập ngắn gọn vào kiến trúc Backend việc sử dụng các thư viện như Winston hoặc Morgan để ghi log lỗi ra file riêng, thay vì chỉ in lỗi tạm thời ra màn hình console.

3. Kịch bản Xử lý Giao dịch (Transaction Management)

Tính toàn vẹn dữ liệu (Rollback): Phải nhấn mạnh việc dùng DB Transaction (BEGIN... COMMIT... ROLLBACK). Ví dụ: Bác sĩ bấm "Kê đơn", hệ thống phải vừa lưu đơn thuốc, vừa trừ số lượng trong kho. Nếu bước trừ kho bị lỗi, toàn bộ thao tác phải được Rollback lại trạng thái ban đầu để tránh sai lệch dữ liệu tồn kho.

4. Chiến lược Kiểm thử (Testing Strategy)

Kiểm thử logic cốt lõi: Bổ sung phương án sử dụng Jest để test tự động các hàm tính toán phức tạp như: Tính tiền cọc viện phí, thuật toán cấp phát kho thuốc (FEFO), và kiểm tra logic giờ trống của bác sĩ.

Kiểm thử chịu tải (Load Testing): Đưa ra kịch bản dùng Jmeter giả lập 1000 bệnh nhân cùng truy cập đặt lịch vào khung giờ cao điểm để chứng minh kiến trúc NestJS + MySQL của bạn đủ sức chịu tải.
Kết hợp cơ chế hệ thống tự động đề xuất luồng khám tối ưu cùng đặc quyền can thiệp thủ công của lễ tân sẽ thể hiện rõ tư duy thiết kế phần mềm linh hoạt, bám sát thực tiễn vận hành y tế.UC-TT-04: Điều phối bệnh nhân vào phòng khámTiêu chíNội dungTên use caseĐiều phối bệnh nhân vào phòng khámTiền điều kiệnBệnh nhân đã được tiếp nhận, đo xong sinh hiệu ban đầu.Hậu điều kiệnBệnh nhân được đưa vào danh sách chờ của một phòng khám cụ thể.Actor chínhTiếp tânActor phụHệ thống (Thuật toán cân bằng tải / Smart Routing)Basic flow (Luồng Tự động - Smart Routing)Người dùngHệ thống1. Tiếp tân chọn bệnh nhân từ danh sách chờ phân phòng.2. Hệ thống tổng hợp dữ liệu: Mức độ khẩn cấp (từ AI), số lượng hàng đợi hiện tại của các phòng khám cùng chuyên khoa.3. Hệ thống hiển thị "Phòng khám đề xuất tối ưu nhất" (VD: Đề xuất Phòng Nội 2 vì đang ít bệnh nhân nhất) và làm nổi bật nút 'Xác nhận điều phối'.4. Tiếp tân nhấn 'Xác nhận điều phối'.5. Cập nhật phòng khám được phân cho bệnh nhân và chuyển vào hàng đợi của phòng đó.  Alternative flow (Luồng Thủ công - Manual Override)3.1. Tiếp tân can thiệp điều phối thủ công    1. Tại bước 3, tiếp tân nhận thấy có lý do đặc thù (VD: Bệnh nhân yêu cầu đích danh Bác sĩ A, hoặc phòng khám không còn khả dụng).      2. Tiếp tân bỏ qua gợi ý của hệ thống, chủ động mở danh sách phòng khám và chọn thủ công một phòng khám khác.      3. Hệ thống cập nhật phòng khám theo lựa chọn thủ công của tiếp tân và lưu vết thao tác (Audit log).  4. Chuyển tiếp đến bước 5 của luồng cơ bản.Exception2.1. Tất cả các phòng khám chuyên khoa đều quá tải hoặc ngừng nhận bệnh1. Hệ thống không thể đưa ra đề xuất nào khả dụng.2. Hệ thống cảnh báo đỏ: "Chuyên khoa này hiện đã đầy hoặc không có bác sĩ trực".3. Tiếp tân thông báo lại với bệnh nhân để dời lịch hoặc chọn hình thức khám khác. Kết thúc Use case.Các tiêu chí tính toán ngầm của hệ thống (Background Logic)Độ khẩn cấp: Bệnh nhân được AI chấm mức "Khẩn cấp" sẽ ưu tiên đẩy vào phòng có bác sĩ trưởng khoa hoặc phòng đang có hàng đợi ngắn nhất.Cân bằng tải (Load Balancing): Thuật toán sẽ đếm số lượng bệnh nhân đang chờ tại Phòng 1 và Phòng 2. Hệ thống luôn đề xuất phòng có số hàng đợi ít hơn để giảm thời gian chờ đợi.Ghi đè linh hoạt (Override): Luôn tôn trọng quyết định cuối cùng của con người. Máy móc chỉ đưa ra gợi ý (Recommendation) chứ không khóa cứng quy trình.# Phongkhamdakhoa
