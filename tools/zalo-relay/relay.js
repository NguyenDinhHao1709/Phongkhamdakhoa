// Relay chuyển tiếp lời gọi Zalo Graph API từ backend (Render, IP nước ngoài) qua máy này (IP Việt Nam).
// Zalo chỉ trả tên / số điện thoại cho request từ IP Việt Nam (lỗi -501 nếu không).
//
// Chạy:  RELAY_KEY=<mat-khau-chung> ZALO_APP_SECRET=<secret-key-app> node relay.js
// Rồi mở ra internet:  ngrok http 8788   (hoặc cloudflared tunnel --url http://localhost:8788)
//
// Bảo mật: chỉ chuyển tiếp 2 đường dẫn (me, me/info), phải có đúng RELAY_KEY, và secret key của app
// do relay tự thêm vào nên không đi qua Render / ngrok.
const http = require('http');

const PORT = Number(process.env.PORT || 8788);
const RELAY_KEY = process.env.RELAY_KEY || '';
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || '';
const GRAPH = 'https://graph.zalo.me/v2.0';
const DUONG_DAN_CHO_PHEP = new Set(['/me', '/me/info']);

if (!RELAY_KEY) {
  console.error('Thiếu RELAY_KEY (mật khẩu chung với backend).');
  process.exit(1);
}

const gui = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://relay');
    if (url.pathname === '/health') return gui(res, 200, { ok: true });
    if (req.method !== 'GET' || !DUONG_DAN_CHO_PHEP.has(url.pathname)) return gui(res, 404, { error: 'not found' });
    if (req.headers['x-relay-key'] !== RELAY_KEY) return gui(res, 401, { error: 'unauthorized' });

    const headers = {};
    for (const k of ['access_token', 'code']) if (req.headers[k]) headers[k] = String(req.headers[k]);
    if (url.pathname === '/me/info') headers.secret_key = ZALO_APP_SECRET;

    try {
      const r = await fetch(`${GRAPH}${url.pathname}${url.search}`, { headers, signal: AbortSignal.timeout(10_000) });
      const text = await r.text();
      console.log(new Date().toISOString(), url.pathname, '->', r.status);
      res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json' });
      res.end(text);
    } catch (e) {
      console.warn('Lỗi gọi Zalo:', e.message);
      gui(res, 502, { error: 'relay_failed', message: e.message });
    }
  })
  .listen(PORT, () => console.log(`Zalo relay đang chạy ở cổng ${PORT}`));
