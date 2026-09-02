/** 150000 → "150.000 đ" */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

/** 150000 → "150.000" (không có ký hiệu tiền) */
export const formatNumber = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN').format(amount);
};

