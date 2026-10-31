const http = require('http');

function request(url, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('==========================================================');
  console.log('🧪 POSTMAN TEST SUITE: MEDICARE OFFICE MICROSERVICE (:5003 & :5000)');
  console.log('==========================================================\n');

  let passed = 0;
  let total = 0;
  const check = (name, ok, detail = '') => {
    total++;
    if (ok) {
      passed++;
      console.log(`✅ [PASS] ${name} ${detail ? `-> ${detail}` : ''}`);
    } else {
      console.log(`❌ [FAIL] ${name} ${detail ? `-> ${detail}` : ''}`);
    }
  };

  // 1. Direct Health Check (:5003)
  const h1 = await request('http://localhost:5003/api/office/health');
  check('1. Direct Office Microservice Health (:5003)', h1.status === 200 && h1.data?.status === 'ok', `status=${h1.status}, service=${h1.data?.service}`);

  // 2. Gateway Health Check (:5000)
  const h2 = await request('http://localhost:5000/api/office/health');
  const gwHealth = h2.data?.data || h2.data;
  check('2. Core Gateway Office Health (:5000 -> :5003)', h2.status === 200 && gwHealth?.status === 'ok', `status=${h2.status}, service=${gwHealth?.service}`);

  // 3. Login as Doctor (bacsi / 123456) to get JWT
  const loginRes = await request('http://localhost:5000/api/auth/login', 'POST', {
    tenDangNhap: 'bacsi',
    matKhau: '123456',
  });
  const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
  check('3. Đăng nhập Bác sĩ (JWT Auth)', !!token, token ? 'Token OK' : JSON.stringify(loginRes.data));

  // 4. Get Office Init Data via Gateway (:5000/api/office/init)
  const initRes = await request('http://localhost:5000/api/office/init', 'GET', null, token);
  const initData = initRes.data?.data || initRes.data;
  check(
    '4. GET /api/office/init (Rooms, Staff Directory, Stickers)',
    initRes.status === 200 && Array.isArray(initData?.rooms) && initData.rooms.length >= 4 && Array.isArray(initData?.staffDirectory),
    `rooms=${initData?.rooms?.length}, staffDirectory=${initData?.staffDirectory?.length}, stickers=${initData?.stickers?.length}`,
  );

  const firstRoomId = initData?.rooms?.[0]?.id || 1;

  // 5. Get Messages in Room
  const msgRes = await request(`http://localhost:5000/api/office/rooms/${firstRoomId}/messages`, 'GET', null, token);
  const msgData = msgRes.data?.data || msgRes.data;
  check(
    `5. GET /api/office/rooms/${firstRoomId}/messages`,
    msgRes.status === 200 && Array.isArray(msgData?.messages),
    `messages=${msgData?.messages?.length}, pinned=${msgData?.pinned?.length}`,
  );

  // 6. Send a Text Message with @mention
  const sendTextRes = await request(`http://localhost:5000/api/office/rooms/${firstRoomId}/messages`, 'POST', {
    loai: 'van_ban',
    noiDung: 'Anh @Ban Giám Đốc ơi, em gửi báo cáo hội chẩn ca trực sáng nay nhé!',
  }, token);
  const sentMsg = sendTextRes.data?.data || sendTextRes.data;
  check(
    '6. POST /api/office/rooms/:id/messages (Gửi tin nhắn văn bản + @mention)',
    (sendTextRes.status === 200 || sendTextRes.status === 201) && !!sentMsg?.id,
    `msgId=${sentMsg?.id}`,
  );

  // 7. React to Message (❤️)
  const reactRes = await request(`http://localhost:5000/api/office/messages/${sentMsg.id}/react`, 'POST', {
    emoji: '❤️',
  }, token);
  const reactData = reactRes.data?.data || reactRes.data;
  check(
    '7. POST /api/office/messages/:id/react (Thả cảm xúc ❤️)',
    (reactRes.status === 200 || reactRes.status === 201) && Array.isArray(reactData?.reactions),
    `reactions=${JSON.stringify(reactData?.reactions)}`,
  );

  // 8. Pin Message
  const pinRes = await request(`http://localhost:5000/api/office/rooms/${firstRoomId}/pin`, 'PATCH', {
    messageId: sentMsg.id,
  }, token);
  const pinData = pinRes.data?.data || pinRes.data;
  check(
    '8. PATCH /api/office/rooms/:id/pin (Ghim tin nhắn)',
    pinRes.status === 200 && typeof pinData?.daGhim === 'boolean',
    `daGhim=${pinData?.daGhim}`,
  );

  // 9. Search Patients to Attach Medical Card
  const ptRes = await request('http://localhost:5000/api/office/patients-search?q=', 'GET', null, token);
  const ptList = ptRes.data?.data || ptRes.data;
  check(
    '9. GET /api/office/patients-search (Tìm hồ sơ bệnh nhân đính kèm)',
    ptRes.status === 200 && Array.isArray(ptList),
    `found=${ptList?.length} bệnh nhân`,
  );

  // 10. Create/Open 1-1 Direct Chat with Director (id: 19)
  const dmRes = await request('http://localhost:5000/api/office/rooms/direct', 'POST', {
    targetUserId: 19,
  }, token);
  const dmData = dmRes.data?.data || dmRes.data;
  check(
    '10. POST /api/office/rooms/direct (Mở chat riêng 1-1 với Giám đốc)',
    (dmRes.status === 200 || dmRes.status === 201) && !!dmData?.roomId,
    `roomId=${dmData?.roomId}`,
  );

  // 11. Upload Base64 File/Image
  const uploadRes = await request('http://localhost:5000/api/office/upload-base64', 'POST', {
    fileName: 'phieu-xet-nghiem-mau.txt',
    mimeType: 'text/plain',
    base64Data: Buffer.from('Kết quả xét nghiệm máu bình thường').toString('base64'),
  }, token);
  const upData = uploadRes.data?.data || uploadRes.data;
  check(
    '11. POST /api/office/upload-base64 (Tải lên tệp/ảnh đính kèm)',
    (uploadRes.status === 200 || uploadRes.status === 201) && !!upData?.url,
    `url=${upData?.url}`,
  );

  console.log(`\n==========================================================`);
  console.log(`🎯 KẾT QUẢ KIỂM THỬ: ${passed}/${total} PASS (${Math.round((passed / total) * 100)}%)`);
  console.log(`==========================================================`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
