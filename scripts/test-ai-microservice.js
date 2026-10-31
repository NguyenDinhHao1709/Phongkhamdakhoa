const axios = require('./backend/node_modules/axios');

const DIRECT_URL = 'http://localhost:5002/api/ai';
const GATEWAY_URL = 'http://localhost:5000/api/ai';
const AUTH_URL = 'http://localhost:5000/api/auth/login';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU POSTMAN TEST SUITE: TOÀN BỘ CHỨC NĂNG AI MICROSERVICE');
  console.log('   - Microservice trực tiếp: http://localhost:5002/api/ai');
  console.log('   - API Gateway chuyển tiếp: http://localhost:5000/api/ai');
  console.log('================================================================\n');

  // 1. Đăng nhập lấy Token cho các route có bảo mật JWT
  let token = '';
  try {
    const loginRes = await axios.post(AUTH_URL, {
      tenDangNhap: 'benhnhan1',
      matKhau: '123456',
    });
    token = loginRes.data.data?.accessToken;
    console.log('🔑 [AUTH] Đăng nhập tài khoản bệnh nhân test thành công! (Bearer Token sẵn sàng)\n');
  } catch (err) {
    console.warn('⚠️ [AUTH] Không lấy được token đăng nhập:', err.message);
  }

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const testCases = [
    // 1. Health check
    {
      name: '1. Health check trực tiếp microservice (:5002)',
      method: 'GET',
      url: `${DIRECT_URL}/health`,
      validate: (data) => data.status === 'ok' && data.port === 5002,
    },
    {
      name: '2. Health check qua API Gateway (:5000 -> :5002)',
      method: 'GET',
      url: `${GATEWAY_URL}/health`,
      validate: (data) => data.data?.status === 'ok' && data.data?.port === 5002,
    },

    // 2. Phân luồng nhanh (Triage)
    {
      name: '3. Phân luồng nhanh trực tiếp microservice (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/phan-luong-nhanh`,
      body: { trieuChung: 'Bị đau ngực trái dữ dội, khó thở và hồi hộp' },
      validate: (data) => Boolean(data.chuyen_khoa || data.khoa),
    },
    {
      name: '4. Phân luồng nhanh qua API Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/phan-luong-nhanh`,
      body: { trieuChung: 'Bé 3 tuổi bị sốt cao 39 độ và ho đờm' },
      validate: (data) => Boolean(data.data?.chuyen_khoa || data.data?.khoa),
    },
    {
      name: '5. Phân luồng nhanh alias (/triage) (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/triage`,
      body: { trieuChung: 'Đau dạ dày, ợ chua sau khi ăn' },
      validate: (data) => Boolean(data.chuyen_khoa || data.khoa),
    },

    // 3. Multi-turn Triage Chatbot
    {
      name: '6. Triage Chatbot hội thoại trực tiếp (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/triage-chat`,
      body: {
        sessionId: 'test_session_postman_001',
        message: 'Tôi bị đau đầu và chóng mặt từ sáng nay',
      },
      validate: (data) => Boolean(data.cau_tra_loi || data.chuyen_khoa),
    },
    {
      name: '7. Triage Chatbot hội thoại qua API Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/triage-chat`,
      body: {
        sessionId: 'test_session_postman_002',
        message: 'Phòng khám có dịch vụ khám online từ xa không?',
      },
      validate: (data) => Boolean(data.data?.cau_tra_loi || data.data?.chuyen_khoa),
    },
    {
      name: '8. Reset session Triage chat qua API Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/reset-session`,
      body: { sessionId: 'test_session_postman_002' },
      validate: (data) => data.success === true,
    },

    // 4. Bác Sĩ Gia Đình AI (RAG bệnh án thực tế)
    {
      name: '9. Lấy tóm tắt hồ sơ y tế bệnh nhân trực tiếp (:5002)',
      method: 'GET',
      url: `${DIRECT_URL}/patient-summary?userId=13`,
      validate: (data) => Boolean(data.hoTen || data.maBenhNhan),
    },
    {
      name: '10. Lấy tóm tắt hồ sơ y tế qua Gateway có xác thực JWT (:5000 -> :5002)',
      method: 'GET',
      url: `${GATEWAY_URL}/patient-summary`,
      headers: authHeaders,
      validate: (data) => data.success === true && Boolean(data.data?.hoTen),
    },
    {
      name: '11. Chat Bác Sĩ Gia Đình AI (RAG) trực tiếp (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/patient-chat`,
      body: {
        userId: 13,
        sessionId: 'patient_postman_13',
        message: 'Giải thích giúp tôi đơn thuốc và tình trạng bệnh gần nhất',
      },
      validate: (data) => data.success === true && Boolean(data.reply),
    },
    {
      name: '12. Chat Bác Sĩ Gia Đình AI (RAG) qua Gateway có JWT (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/patient-chat`,
      headers: authHeaders,
      body: {
        message: 'Tôi nên ăn uống và kiêng khem như thế nào?',
      },
      validate: (data) => data.success === true && Boolean(data.data?.reply),
    },
    {
      name: '13. Reset session Bác Sĩ Gia Đình AI qua Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/patient-reset-session`,
      headers: authHeaders,
      body: { sessionId: 'patient_13' },
      validate: (data) => data.success === true,
    },

    // 5. Dynamic Queue Routing (Định tuyến cận lâm sàng)
    {
      name: '14. Định tuyến hàng đợi cận lâm sàng trực tiếp (:5002)',
      method: 'GET',
      url: `${DIRECT_URL}/dynamic-queue/42`,
      validate: (data) => data.success === true && Array.isArray(data.routingPlan),
    },
    {
      name: '15. Định tuyến hàng đợi cận lâm sàng qua Gateway (:5000 -> :5002)',
      method: 'GET',
      url: `${GATEWAY_URL}/dynamic-queue/42`,
      validate: (data) => data.success === true && Array.isArray(data.data?.routingPlan),
    },

    // 6. Dự báo lưu lượng bệnh nhân (Forecasting)
    {
      name: '16. Dự báo lưu lượng bệnh nhân cơ bản trực tiếp (:5002)',
      method: 'GET',
      url: `${DIRECT_URL}/du-bao-luong-benh-nhan`,
      validate: (data) => Array.isArray(data.forecast7Days),
    },
    {
      name: '17. Dự báo lưu lượng bệnh nhân cơ bản qua Gateway (:5000 -> :5002)',
      method: 'GET',
      url: `${GATEWAY_URL}/du-bao-luong-benh-nhan`,
      validate: (data) => Array.isArray(data.data?.forecast7Days),
    },
    {
      name: '18. Dự báo nâng cao (ML + Gemini AI diễn giải) trực tiếp (:5002)',
      method: 'GET',
      url: `${DIRECT_URL}/du-bao-nang-cao?horizon=7`,
      validate: (data) => Array.isArray(data.data?.forecast7Days) && Boolean(data.data?.aiAnalysis),
    },
    {
      name: '19. Dự báo nâng cao qua Gateway (:5000 -> :5002)',
      method: 'GET',
      url: `${GATEWAY_URL}/du-bao-nang-cao?horizon=7`,
      validate: (data) => Array.isArray(data.data?.forecast7Days),
    },
    {
      name: '20. Kịch bản test POST /forecast (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/forecast`,
      body: { horizon: 7 },
      validate: (data) => Array.isArray(data.data?.forecast7Days),
    },
    {
      name: '21. Kịch bản test POST /forecast qua Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/forecast`,
      body: { horizon: 7 },
      validate: (data) => Array.isArray(data.data?.forecast7Days),
    },

    // 7. Dự báo nhu cầu thuốc & Điểm đặt hàng lại (Pharmacy Forecasting)
    {
      name: '22. Dự báo nhu cầu thuốc trực tiếp (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/forecast-medicine`,
      body: { horizon_days: 14, items: [{ maThuoc: 'TH001', tenThuoc: 'Paracetamol 500mg', tonKhoTong: 40 }] },
      validate: (data) => data.success === true && Array.isArray(data.data),
    },
    {
      name: '23. Dự báo nhu cầu thuốc qua Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/forecast-medicine`,
      body: { horizon_days: 14, items: [{ maThuoc: 'TH002', tenThuoc: 'Amoxicillin 500mg', tonKhoTong: 20 }] },
      validate: (data) => data.success === true && Array.isArray(data.data?.data || data.data),
    },

    // 8. Legacy API
    {
      name: '24. Gợi ý chuyên khoa (Legacy) trực tiếp (:5002)',
      method: 'POST',
      url: `${DIRECT_URL}/goi-y-chuyen-khoa`,
      body: { trieuChung: 'Mờ mắt, nhức mỏi mắt khi nhìn máy tính' },
      validate: (data) => Boolean(data.data?.chuyenKhoaGoiY),
    },
    {
      name: '25. Gợi ý chuyên khoa (Legacy) qua Gateway (:5000 -> :5002)',
      method: 'POST',
      url: `${GATEWAY_URL}/goi-y-chuyen-khoa`,
      body: { trieuChung: 'Đau khớp gối khi đi lại' },
      validate: (data) => Boolean(data.data?.chuyenKhoaGoiY || data.data?.data?.chuyenKhoaGoiY),
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const startTime = Date.now();
    try {
      let res;
      if (tc.method === 'GET') {
        res = await axios.get(tc.url, { headers: tc.headers || {}, timeout: 15000 });
      } else {
        res = await axios.post(tc.url, tc.body || {}, { headers: tc.headers || {}, timeout: 15000 });
      }
      const duration = Date.now() - startTime;
      const isValid = tc.validate(res.data);

      if (isValid) {
        passed++;
        console.log(`✅ [PASS] (${duration}ms) ${tc.name}`);
        results.push({ name: tc.name, status: 'PASS', time: `${duration}ms` });
      } else {
        failed++;
        console.error(`❌ [FAIL - Schema Mismatch] (${duration}ms) ${tc.name}`);
        console.error('   Response:', JSON.stringify(res.data).slice(0, 150));
        results.push({ name: tc.name, status: 'FAIL', reason: 'Schema validation failed', time: `${duration}ms` });
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      failed++;
      console.error(`❌ [FAIL - Error ${err.response?.status || 'Network'}] (${duration}ms) ${tc.name}`);
      console.error('   Chi tiết lỗi:', err.response?.data || err.message);
      results.push({ name: tc.name, status: 'FAIL', reason: err.response?.data?.message || err.message, time: `${duration}ms` });
    }
  }

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT KẾT QUẢ TEST:`);
  console.log(`   - Tổng số test case: ${testCases.length}`);
  console.log(`   - Thành công (PASS): ${passed} / ${testCases.length} (${Math.round((passed / testCases.length) * 100)}%)`);
  console.log(`   - Thất bại  (FAIL): ${failed} / ${testCases.length}`);
  console.log('================================================================');
  return { passed, failed, total: testCases.length };
}

runTestSuite().catch(console.error);
