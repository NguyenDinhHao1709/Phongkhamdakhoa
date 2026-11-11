// Deeplink VietQR: chỉ các app có autofill=1 (api.vietqr.io/v2/android-app-deeplinks) mới điền sẵn STK, số tiền, nội dung
const BANK_APPS = [
  { app: 'mb', name: 'MB Bank' },
  { app: 'icb', name: 'VietinBank' },
  { app: 'bidv', name: 'BIDV' },
  { app: 'acb', name: 'ACB' },
  { app: 'ocb', name: 'OCB' },
];

export default function BankAppLinks({ accountNo, bankCode, amount, content, accountName }) {
  const params = new URLSearchParams({
    ba: `${accountNo}@${bankCode}`,
    am: String(amount),
    tn: content,
    ...(accountName && { bn: accountName }),
    url: window.location.href,
  });

  return (
    <div className="sm:hidden w-full">
      <p className="text-[11px] font-semibold text-gray-600 mb-2 text-center">Hoặc mở app ngân hàng, chỉ cần xác nhận thanh toán:</p>
      <div className="grid grid-cols-5 gap-2">
        {BANK_APPS.map((b) => (
          <a
            key={b.app}
            href={`https://dl.vietqr.io/pay?app=${b.app}&${params}`}
            className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white border border-gray-200 active:bg-gray-100"
          >
            <img src={`https://api.vietqr.io/img/${b.app.toUpperCase()}.png`} alt={b.name} className="h-7 w-full object-contain" />
            <span className="text-[9px] font-medium text-gray-700 truncate w-full text-center">{b.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
