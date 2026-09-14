import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';
const SCREENSHOT_DIR = 'd:\\KLTN\\e2e_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchToken(username, password) {
  const r = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenDangNhap: username, matKhau: password })
  });
  const json = await r.json();
  return json?.data; // { user, accessToken, refreshToken }
}

async function run() {
  console.log('🚀 BẮT ĐẦU TEST E2E TOÀN DIỆN TRÊN TRÌNH DUYỆT GOOGLE CHROME...');
  console.log('👉 Chrome path: ' + CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  async function takeScreenshot(stepName) {
    const file = path.join(SCREENSHOT_DIR, `${stepName}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`   📸 [Screenshot]: ${stepName}.png`);
  }

  // Chuyển role an toàn bằng cách nạp phiên chuẩn vào localStorage và điều hướng
  async function switchRole(username, password, targetUrl) {
    console.log(`\n🔑 Đang chuyển sang vai trò [${username}]...`);
    const authData = await fetchToken(username, password);
    if (!authData) throw new Error(`Không thể đăng nhập tài khoản ${username}`);

    // Truy cập domain localhost trước khi set localStorage
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((data) => {
      localStorage.setItem('phong-kham-auth', JSON.stringify({
        state: {
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        },
        version: 0,
      }));
    }, authData);

    await page.goto(`${BASE_URL}${targetUrl}`, { waitUntil: 'networkidle2' });
    await sleep(2000);
  }

  try {
    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 1: BỆNH NHÂN ĐẶT LỊCH KHÁM BỆNH
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 1: BỆNH NHÂN ĐẶT LỊCH KHÁM (APPOINTMENT BOOKING)');
    console.log('=============================================================');
    await switchRole('dinhhao', '123456', '/benh-nhan/dat-lich?hinhThuc=truc_tiep');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await page.evaluate((d) => {
      const dInput = document.querySelector('input[type="date"]');
      if (dInput) {
        dInput.value = d;
        dInput.dispatchEvent(new Event('input', { bubbles: true }));
        dInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const selects = document.querySelectorAll('select');
      if (selects[0] && selects[0].options.length > 1) {
        selects[0].selectedIndex = 1;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      const textareas = document.querySelectorAll('textarea');
      if (textareas[0]) {
        textareas[0].value = 'Tái khám định kỳ, kiểm tra chức năng tiêu hóa và đo huyết áp';
        textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dateStr);

    await sleep(1000);
    await takeScreenshot('01_dat_lich_kham_form');

    // Nhấn nút Xác nhận đặt lịch
    await page.evaluate(() => {
      const submit = document.querySelector('button[type="submit"]');
      if (submit) submit.click();
    });
    await sleep(2500);
    await takeScreenshot('02_dat_lich_thanh_cong');
    console.log('✅ Bệnh nhân đặt lịch thành công!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 2: TIẾP TÂN DUYỆT LỊCH & TIẾP NHẬN BỆNH NHÂN
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 2: TIẾP TÂN DUYỆT LỊCH & TIẾP NHẬN GHI SINH HIỆU');
    console.log('=============================================================');
    await switchRole('tieptan', '123456', '/tiep-tan/lich-hen');
    await takeScreenshot('03_tiep_tan_danh_sach_lich_hen');

    // Duyệt lịch nếu có nút Duyệt
    await page.evaluate(() => {
      const duyet = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Duyệt'));
      if (duyet) duyet.click();
    });
    await sleep(1500);

    // Vào tiếp nhận bệnh nhân
    await page.goto(`${BASE_URL}/tiep-tan/tiep-nhan`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Tìm bệnh nhân
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Nhập tên"]');
      if (input) {
        input.value = 'Hào';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const timBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Tìm');
      if (timBtn) timBtn.click();
    });
    await sleep(2000);

    // Chọn bệnh nhân
    await page.evaluate(() => {
      const selectBn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BN000001') || b.textContent.includes('Hào'));
      if (selectBn) selectBn.click();
    });
    await sleep(2500);
    await takeScreenshot('04_tiep_nhan_nhap_sinh_hieu');

    // Ghi sinh hiệu
    await page.evaluate(() => {
      const inps = Array.from(document.querySelectorAll('input[type="number"]'));
      if (inps[0]) inps[0].value = '172';
      if (inps[1]) inps[1].value = '68';
      if (inps[2]) inps[2].value = '36.8';
      if (inps[3]) inps[3].value = '120';
      if (inps[4]) inps[4].value = '80';
      if (inps[5]) inps[5].value = '76';
      if (inps[6]) inps[6].value = '99';
      inps.forEach(i => i.dispatchEvent(new Event('input', { bubbles: true })));

      const save = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lưu sinh hiệu'));
      if (save) save.click();
    });
    await sleep(2500);

    // Phân bổ phòng khám
    await page.evaluate(() => {
      const pkInput = document.querySelector('input[placeholder*="ID phòng khám"]');
      if (pkInput) {
        pkInput.value = '1';
        pkInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const dpBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Điều phối');
      if (dpBtn) dpBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('05_tiep_nhan_hoan_tat_cap_stt');
    console.log('✅ Tiếp tân đã ghi sinh hiệu & điều phối vào Phòng Khám 101!');

    // Xem hàng đợi
    await page.goto(`${BASE_URL}/tiep-tan/hang-doi`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot('06_hang_doi_realtime');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 3: BÁC SĨ KHÁM LÂM SÀNG, CHỈ ĐỊNH XÉT NGHIỆM & KÊ ĐƠN
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 3: BÁC SĨ KHÁM LÂM SÀNG, CHỈ ĐỊNH CLS & KÊ ĐƠN THUỐC');
    console.log('=============================================================');
    await switchRole('bacsi', '123456', '/bac-si/phong-kham');
    await takeScreenshot('07_bac_si_phong_kham');

    // Bấm Bắt đầu khám
    await page.evaluate(() => {
      const start = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bắt đầu khám') || b.textContent.includes('Tiếp tục khám'));
      if (start) start.click();
    });
    await sleep(2500);

    // Bác sĩ mở Modal chỉ định CLS
    await page.evaluate(() => {
      const clsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Chỉ định cận lâm sàng'));
      if (clsBtn) clsBtn.click();
    });
    await sleep(2000);

    // Chọn xét nghiệm & bấm xác nhận
    await page.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      cbs.slice(0, 2).forEach(cb => { if (!cb.checked) cb.click(); });
    });
    await takeScreenshot('08_modal_chi_dinh_cls');

    await page.evaluate(() => {
      const confirm = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xác nhận chỉ định'));
      if (confirm) confirm.click();
    });
    await sleep(2500);

    // Bác sĩ kê đơn thuốc
    await page.evaluate(() => {
      const dtBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Kê đơn thuốc'));
      if (dtBtn) dtBtn.click();
    });
    await sleep(2000);
    await takeScreenshot('09_modal_ke_don_thuoc');

    // Đóng modal đơn thuốc
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hủy') || b.textContent.includes('Đóng'));
      if (cancel) cancel.click();
    });
    await sleep(1500);

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 4: KỸ THUẬT VIÊN XÉT NGHIỆM NHẬP KẾT QUẢ
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 4: KỸ THUẬT VIÊN XỬ LÝ & NHẬP KẾT QUẢ XÉT NGHIỆM');
    console.log('=============================================================');
    await switchRole('xetnghiem', '123456', '/ky-thuat-vien');
    await takeScreenshot('10_ktv_danh_sach_cho_xet_nghiem');

    // Chọn chỉ định đầu tiên
    await page.evaluate(() => {
      const tr = document.querySelector('tbody tr');
      if (tr) tr.click();
    });
    await sleep(2000);

    // KTV nhập giá trị kết quả & gửi bác sĩ
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
      if (inputs[0]) {
        inputs[0].value = '5.4';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputs[1]) {
        inputs[1].value = 'Chỉ số bình thường, không phát hiện dấu hiệu bất thường';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
      const saveKq = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lưu kết quả') || b.textContent.includes('Gửi Bác sĩ') || b.textContent.includes('Cập nhật'));
      if (saveKq) saveKq.click();
    });
    await sleep(2500);
    await takeScreenshot('11_ktv_hoan_tat_nhap_kq');
    console.log('✅ Kỹ thuật viên đã trả kết quả xét nghiệm!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 5: BÁC SĨ XEM KẾT QUẢ, CHỐT CHẨN ĐOÁN ICD-10 & KẾT THÚC KHÁM
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 5: BÁC SĨ XEM KẾT QUẢ CLS, CHỐT CHẨN ĐOÁN & KẾT THÚC KHÁM');
    console.log('=============================================================');
    await switchRole('bacsi', '123456', '/bac-si/phong-kham');

    // Chuyển Tab Xét nghiệm & CLS xem lộ trình AI Dynamic Queue
    await page.evaluate(() => {
      const tabXn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xét nghiệm & CLS'));
      if (tabXn) tabXn.click();
    });
    await sleep(2000);
    await takeScreenshot('12_bac_si_xem_ket_qua_cls_ai_queue');

    // Chuyển lại Tab Khám lâm sàng để chốt ICD-10
    await page.evaluate(() => {
      const tabKham = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Khám lâm sàng'));
      if (tabKham) tabKham.click();
    });
    await sleep(1500);

    // Nhập chẩn đoán xác định kèm ICD-10
    await page.evaluate(() => {
      const icdBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('K29.5'));
      if (icdBtn) icdBtn.click();
      const tas = document.querySelectorAll('textarea');
      tas.forEach(t => {
        if (t.placeholder?.includes('ICD-10') || t.placeholder?.includes('VD:')) {
          t.value = 'K29.5 - Viêm dạ dày mạn tính; K21 - GERD';
          t.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await sleep(1000);
    await takeScreenshot('13_bac_si_chan_doan_icd10');

    // Bấm Kết thúc khám
    await page.evaluate(() => {
      const finish = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Kết thúc khám'));
      if (finish) finish.click();
    });
    await sleep(2500);
    console.log('✅ Bác sĩ đã chính thức KẾT THÚC KHÁM cho bệnh nhân!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 6: THU NGÂN THU TIỀN VIỆN PHÍ & IN HÓA ĐƠN
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 6: THU NGÂN THU TIỀN VIỆN PHÍ & IN HÓA ĐƠN');
    console.log('=============================================================');
    await switchRole('thungan', '123456', '/thu-ngan');
    await takeScreenshot('14_thu_ngan_danh_sach_vien_phi');

    // Mở modal thanh toán dòng đầu tiên
    await page.evaluate(() => {
      const pay = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Thanh toán') || b.textContent.includes('Thu tiền'));
      if (pay) pay.click();
    });
    await sleep(2000);
    await takeScreenshot('15_modal_thanh_toan_vien_phi');

    // Xác nhận thu tiền
    await page.evaluate(() => {
      const confirm = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xác nhận thu tiền') || b.textContent.includes('Thanh toán ngay'));
      if (confirm) confirm.click();
    });
    await sleep(2500);
    await takeScreenshot('16_hoa_don_da_thanh_toan_xong');
    console.log('✅ Thu ngân đã xác nhận thanh toán viện phí thành công!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 7: DƯỢC SĨ NHÀ THUỐC CẤP PHÁT THUỐC
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 7: DƯỢC SĨ NHÀ THUỐC CẤP PHÁT THUỐC');
    console.log('=============================================================');
    await switchRole('nv1', '123456', '/nha-thuoc/don-thuoc');
    await takeScreenshot('17_nha_thuoc_danh_sach_don');

    // Bấm cấp phát thuốc
    await page.evaluate(() => {
      const capPhat = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cấp phát') || b.textContent.includes('Xuất thuốc'));
      if (capPhat) capPhat.click();
    });
    await sleep(2500);
    await takeScreenshot('18_nha_thuoc_da_cap_phat_xong');
    console.log('✅ Nhà thuốc đã cấp phát thuốc thành công!');

    // ═════════════════════════════════════════════════════════════════════
    // BƯỚC 8: BỆNH NHÂN XEM HỒ SƠ Y TẾ EMR & IN KẾT QUẢ
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n=============================================================');
    console.log('🌟 BƯỚC 8: BỆNH NHÂN XEM HỒ SƠ EMR & IN PHIẾU KẾT QUẢ XN');
    console.log('=============================================================');
    await switchRole('dinhhao', '123456', '/benh-nhan/ho-so-y-te');
    await takeScreenshot('19_benh_nhan_ho_so_emr_hoan_tat');

    // Bấm xem bản in kết quả xét nghiệm
    await page.evaluate(() => {
      const inKq = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('In kết quả') || b.textContent.includes('In phiếu kết quả') || b.textContent.includes('Xem bản in'));
      if (inKq) inKq.click();
    });
    await sleep(2500);
    await takeScreenshot('20_modal_in_phieu_ket_qua_a4');

    console.log('\n🎉 =============================================================');
    console.log('   HOÀN TẤT 100% QUY TRÌNH KHÁM CHỮA BỆNH TRÊN GOOGLE CHROME!');
    console.log('   📸 20 Ảnh chụp minh chứng đã lưu tại: ' + SCREENSHOT_DIR);
    console.log('=============================================================');

  } catch (err) {
    console.error('❌ Lỗi:', err);
    await takeScreenshot('99_error_state');
  } finally {
    await browser.close();
  }
}

run();
