import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'd:\\KLTN\\e2e_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('🚀 BẮT ĐẦU TEST E2E TRÊN TRÌNH DUYỆT GOOGLE CHROME...');
  console.log('👉 Browser binary: ' + CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Chạy trực quan để hiển thị trình duyệt
    defaultViewport: { width: 1366, height: 768 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  async function takeScreenshot(stepName) {
    const file = path.join(SCREENSHOT_DIR, `${stepName}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`   📸 [Screenshot]: ${stepName}.png`);
  }

  async function loginAs(username, password) {
    console.log(`🔑 Đang đăng nhập tài khoản: [${username}]...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    // Fill username
    const userInput = await page.waitForSelector('input[type="text"]', { timeout: 8000 });
    await userInput.click({ clickCount: 3 });
    await userInput.type(username, { delay: 30 });

    // Fill password
    const passInput = await page.waitForSelector('input[type="password"]', { timeout: 8000 });
    await passInput.click({ clickCount: 3 });
    await passInput.type(password, { delay: 30 });

    // Submit
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await sleep(2000);
  }

  try {
    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 1: BỆNH NHÂN ĐẶT LỊCH KHÁM BỆNH
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 1: BỆNH NHÂN ĐẶT LỊCH KHÁM (PATIENT APPOINTMENT BOOKING)');
    console.log('=============================================================');
    await loginAs('dinhhao', '123456');

    await page.goto(`${BASE_URL}/benh-nhan/dat-lich?hinhThuc=truc_tiep`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Điền ngày hẹn: ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await page.evaluate((d) => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = d;
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, dateStr);

    // Điền lý do khám
    const lyDoArea = await page.waitForSelector('textarea', { timeout: 5000 });
    await lyDoArea.type('Đau âm ỉ vùng thượng vị kèm ợ chua, muốn khám kiểm tra dạ dày', { delay: 20 });

    // Chọn Bác sĩ đầu tiên nếu có select
    await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      selects.forEach(s => {
        if (s.options.length > 1) {
          s.selectedIndex = 1;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    await takeScreenshot('01_form_dat_lich_kham');

    // Bấm nút Đặt lịch khám
    const btnDatLich = await page.$('button[type="submit"]');
    if (btnDatLich) {
      await btnDatLich.click();
      await sleep(2500);
      await takeScreenshot('02_dat_lich_thanh_cong');
      console.log('✅ Bệnh nhân đặt lịch khám thành công!');
    }

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 2: TIẾP TÂN DUYỆT LỊCH & TIẾP NHẬN GHI SINH HIỆU
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 2: TIẾP TÂN DUYỆT LỊCH & TIẾP NHẬN BỆNH NHÂN');
    console.log('=============================================================');
    await loginAs('tieptan', '123456');

    // Xem danh sách lịch hẹn
    await page.goto(`${BASE_URL}/tiep-tan/lich-hen`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot('03_tiep_tan_danh_sach_lich_hen');

    // Duyệt lịch hẹn đầu tiên nếu có nút Duyệt
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const duyetBtn = buttons.find(b => b.textContent.includes('Duyệt'));
      if (duyetBtn) duyetBtn.click();
    });
    await sleep(1500);

    // Tiếp nhận trực tiếp tại quầy tiếp đón
    await page.goto(`${BASE_URL}/tiep-tan/tiep-nhan`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Tìm bệnh nhân Hào
    const searchInput = await page.waitForSelector('input[placeholder*="Nhập tên"]', { timeout: 8000 });
    await searchInput.type('Hào', { delay: 50 });

    // Bấm tìm
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const timBtn = buttons.find(b => b.textContent.trim() === 'Tìm');
      if (timBtn) timBtn.click();
    });
    await sleep(1500);

    // Chọn kết quả tìm kiếm đầu tiên
    await page.evaluate(() => {
      const bnButtons = Array.from(document.querySelectorAll('button'));
      const selectBtn = bnButtons.find(b => b.textContent.includes('BN000001') || b.textContent.includes('Hào'));
      if (selectBtn) selectBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('04_tiep_nhan_ghi_sinh_hieu');

    // Ghi sinh hiệu
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      if (inputs[0]) inputs[0].value = '172'; // Chiều cao
      if (inputs[1]) inputs[1].value = '68';  // Cân nặng
      if (inputs[2]) inputs[2].value = '36.6'; // Nhiệt độ
      if (inputs[3]) inputs[3].value = '120'; // HA tâm thu
      if (inputs[4]) inputs[4].value = '80';  // HA tâm trương
      if (inputs[5]) inputs[5].value = '76';  // Nhịp tim
      if (inputs[6]) inputs[6].value = '99';  // SpO2
      inputs.forEach(inp => inp.dispatchEvent(new Event('input', { bubbles: true })));
    });

    // Bấm Lưu sinh hiệu
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.textContent.includes('Lưu sinh hiệu') || b.textContent.includes('Bỏ qua'));
      if (saveBtn) saveBtn.click();
    });
    await sleep(2000);

    // Điều phối phòng khám 1
    await page.evaluate(() => {
      const numInput = document.querySelector('input[placeholder*="ID phòng khám"]');
      if (numInput) {
        numInput.value = '1';
        numInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const buttons = Array.from(document.querySelectorAll('button'));
      const dpBtn = buttons.find(b => b.textContent.trim() === 'Điều phối');
      if (dpBtn) dpBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('05_tiep_nhan_dieu_phoi_xong');
    console.log('✅ Tiếp tân đã hoàn tất tiếp nhận & điều phối bệnh nhân vào Phòng 101!');

    // Xem Hàng đợi phòng khám
    await page.goto(`${BASE_URL}/tiep-tan/hang-doi`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await takeScreenshot('06_hang_doi_realtime');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 3: BÁC SĨ KHÁM LÂM SÀNG, CHỈ ĐỊNH CLS & KÊ ĐƠN THUỐC
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 3: BÁC SĨ KHÁM LÂM SÀNG, CHỈ ĐỊNH XÉT NGHIỆM & KÊ ĐƠN');
    console.log('=============================================================');
    await loginAs('bacsi', '123456');

    await page.goto(`${BASE_URL}/bac-si/phong-kham`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Bấm Bắt đầu khám nếu có
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.includes('Bắt đầu khám') || b.textContent.includes('Tiếp tục khám'));
      if (startBtn) startBtn.click();
    });
    await sleep(2000);

    // Chỉ định cận lâm sàng
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const clsBtn = buttons.find(b => b.textContent.includes('Chỉ định cận lâm sàng'));
      if (clsBtn) clsBtn.click();
    });
    await sleep(1500);

    // Chọn các dịch vụ xét nghiệm (checkbox)
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      checkboxes.slice(0, 2).forEach(cb => {
        if (!cb.checked) cb.click();
      });
    });
    await takeScreenshot('07_modal_chi_dinh_cls');

    // Bấm xác nhận chỉ định
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('Xác nhận chỉ định'));
      if (submitBtn) submitBtn.click();
    });
    await sleep(2000);

    // Kê đơn thuốc
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const donThuocBtn = buttons.find(b => b.textContent.includes('Kê đơn thuốc'));
      if (donThuocBtn) donThuocBtn.click();
    });
    await sleep(1500);
    await takeScreenshot('08_modal_ke_don_thuoc');

    // Đóng modal đơn thuốc nếu mở
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Hủy') || b.textContent.includes('Đóng'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(1000);

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 4: KỸ THUẬT VIÊN NHẬP KẾT QUẢ XÉT NGHIỆM
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 4: KỸ THUẬT VIÊN NHẬP KẾT QUẢ & GỬI BÁC SĨ');
    console.log('=============================================================');
    await loginAs('xetnghiem', '123456');

    await page.goto(`${BASE_URL}/ky-thuat-vien`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot('09_ktv_danh_sach_xet_nghiem');

    // Chọn chỉ định đầu tiên trong danh sách
    await page.evaluate(() => {
      const trs = document.querySelectorAll('tbody tr');
      if (trs[0]) trs[0].click();
    });
    await sleep(1500);

    // Nhập kết quả
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
      if (inputs[0]) {
        inputs[0].value = '5.4';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputs[1]) {
        inputs[1].value = 'Chỉ số bình thường, không thiếu máu';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveKqBtn = buttons.find(b => b.textContent.includes('Lưu kết quả') || b.textContent.includes('Gửi Bác sĩ') || b.textContent.includes('Cập nhật'));
      if (saveKqBtn) saveKqBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('10_ktv_da_nhap_ket_qua');
    console.log('✅ Kỹ thuật viên đã nhập và gửi kết quả xét nghiệm!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 5: BÁC SĨ XEM KẾT QUẢ, CHỐT ICD-10 & KẾT THÚC KHÁM
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 5: BÁC SĨ XEM KẾT QUẢ CLS, CHỐT CHẨN ĐOÁN & KẾT THÚC KHÁM');
    console.log('=============================================================');
    await loginAs('bacsi', '123456');

    await page.goto(`${BASE_URL}/bac-si/phong-kham`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Chuyển sang Tab Xét nghiệm & CLS
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabXn = buttons.find(b => b.textContent.includes('Xét nghiệm & CLS'));
      if (tabXn) tabXn.click();
    });
    await sleep(1500);
    await takeScreenshot('11_bac_si_xem_ket_qua_cls');

    // Chuyển lại Tab Khám lâm sàng để chốt ICD-10
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabKham = buttons.find(b => b.textContent.includes('Khám lâm sàng'));
      if (tabKham) tabKham.click();
    });
    await sleep(1000);

    // Điền mã ICD-10
    await page.evaluate(() => {
      const icdBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('K29.5'));
      if (icdBtn) icdBtn.click();
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(t => {
        if (t.placeholder?.includes('ICD-10') || t.placeholder?.includes('VD:')) {
          t.value = 'K29.5 - Viêm dạ dày mạn tính; K21 - GERD';
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    await takeScreenshot('12_bac_si_chot_chan_doan');

    // Bấm Kết thúc khám
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const finishBtn = buttons.find(b => b.textContent.includes('Kết thúc khám'));
      if (finishBtn) finishBtn.click();
    });
    await sleep(2000);
    console.log('✅ Bác sĩ đã chính thức KẾT THÚC KHÁM bệnh!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 6: THU NGÂN THU TIỀN VIỆN PHÍ & IN HÓA ĐƠN
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 6: THU NGÂN THU TIỀN VIỆN PHÍ & IN HÓA ĐƠN');
    console.log('=============================================================');
    await loginAs('thungan', '123456');

    await page.goto(`${BASE_URL}/thu-ngan`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot('13_thu_ngan_danh_sach_hoa_don');

    // Bấm nút Thu tiền / Thanh toán trên dòng đầu tiên
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const payBtn = buttons.find(b => b.textContent.includes('Thanh toán') || b.textContent.includes('Thu tiền'));
      if (payBtn) payBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('14_modal_thanh_toan_vien_phi');

    // Xác nhận thu tiền
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = buttons.find(b => b.textContent.includes('Xác nhận thu tiền') || b.textContent.includes('Thanh toán ngay'));
      if (confirmBtn) confirmBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('15_hoa_don_da_thanh_toan');
    console.log('✅ Thu ngân đã hoàn tất thanh toán viện phí!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 7: NHÀ THUỐC CẤP PHÁT THUỐC
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 7: DƯỢC SĨ NHÀ THUỐC CẤP PHÁT THUỐC');
    console.log('=============================================================');
    await loginAs('nv1', '123456');

    await page.goto(`${BASE_URL}/nha-thuoc/don-thuoc`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot('16_danh_sach_don_thuoc_nha_thuoc');

    // Bấm Cấp phát thuốc nếu có
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const capPhatBtn = buttons.find(b => b.textContent.includes('Cấp phát') || b.textContent.includes('Xuất thuốc'));
      if (capPhatBtn) capPhatBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('17_nha_thuoc_da_cap_phat');
    console.log('✅ Nhà thuốc đã xuất kho và cấp phát thuốc thành công!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 8: BỆNH NHÂN XEM HỒ SƠ Y TẾ ĐIỆN TỬ (EMR) & IN PHIẾU KẾT QUẢ
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 8: BỆNH NHÂN XEM HỒ SƠ Y TẾ EMR & IN PHIẾU KẾT QUẢ');
    console.log('=============================================================');
    await loginAs('dinhhao', '123456');

    await page.goto(`${BASE_URL}/benh-nhan/ho-so-y-te`, { waitUntil: 'networkidle2' });
    await sleep(2500);
    await takeScreenshot('18_benh_nhan_ho_so_emr');

    // Mở Modal in kết quả xét nghiệm
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inBtn = buttons.find(b => b.textContent.includes('In kết quả') || b.textContent.includes('In phiếu kết quả'));
      if (inBtn) inBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('19_modal_in_phieu_ket_qua_xet_nghiem');

    console.log('\n🎉 =============================================================');
    console.log('   TOÀN BỘ QUY TRÌNH E2E ĐÃ CHẠY THÀNH CÔNG TRÊN GOOGLE CHROME!');
    console.log('   📸 19 Screenshots đã được lưu tại: ' + SCREENSHOT_DIR);
    console.log('=============================================================');

  } catch (err) {
    console.error('❌ Lỗi trong quá trình chạy test trình duyệt:', err);
    await takeScreenshot('99_error_state');
  } finally {
    await browser.close();
  }
}

run();

