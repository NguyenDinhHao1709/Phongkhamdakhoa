import { useEffect, useState } from 'react';

// Tải một lần rồi dùng lại; lỗi mạng thì cho phép thử lại ở lần sau
const cachedFetch = (url, pick) => {
  let promise;
  return () =>
    (promise ||= fetch(url)
      .then((r) => r.json())
      .then(pick)
      .catch(() => {
        promise = null;
        return null;
      }));
};

// BIN (6 số, VD 970422) → mã ngân hàng VietQR (VD "mb")
const loadBanks = cachedFetch('https://api.vietqr.io/v2/banks', (j) =>
  new Map((j.data || []).map((b) => [b.bin, b.code.toLowerCase()])),
);

// Toàn bộ app ngân hàng hỗ trợ deeplink VietQR; app có autofill điền sẵn STK, số tiền, nội dung → xếp lên đầu
const loadApps = cachedFetch(
  `https://api.vietqr.io/v2/${/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android'}-app-deeplinks`,
  (j) => [...(j.apps || [])].sort((a, b) => b.autofill - a.autofill),
);

const resolveBankCode = async (bank) =>
  /^\d{6}$/.test(bank) ? (await loadBanks())?.get(bank) || null : bank.toLowerCase();

// bank: BIN hoặc mã ngân hàng của tài khoản nhận
export default function BankAppLinks({ accountNo, bank, amount, content, accountName }) {
  const [bankCode, setBankCode] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    let active = true;
    setBankCode(null);
    if (bank) resolveBankCode(String(bank)).then((code) => active && setBankCode(code));
    loadApps().then((list) => active && list && setApps(list));
    return () => {
      active = false;
    };
  }, [bank]);

  if (!bankCode || !accountNo || !apps.length) return null;

  const params = new URLSearchParams({
    ba: `${accountNo}@${bankCode}`,
    am: String(amount),
    tn: content,
    ...(accountName && { bn: accountName }),
    url: window.location.href,
  });

  return (
    <div className="sm:hidden w-full">
      <p className="text-[11px] font-semibold text-gray-600 mb-1 text-center">Hoặc mở app ngân hàng để thanh toán:</p>
      <p className="text-[10px] text-gray-500 mb-2 text-center">
        App có dấu <span className="text-emerald-600 font-bold">⚡</span> tự điền sẵn thông tin, app khác cần quét mã QR ở trên.
      </p>
      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
        {apps.map((b) => (
          <a
            key={b.appId}
            href={`${b.deeplink}&${params}`}
            className="relative flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white border border-gray-200 active:bg-gray-100"
          >
            {b.autofill === 1 && <span className="absolute top-0.5 right-1 text-[9px] text-emerald-600">⚡</span>}
            <img src={b.appLogo} alt={b.appName} loading="lazy" className="h-7 w-7 rounded-lg object-contain" />
            <span className="text-[9px] font-medium text-gray-700 truncate w-full text-center">
              {b.appName.replace(/ (SmartBanking|Mobile Banking|Digital|iPay).*$/i, '')}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
