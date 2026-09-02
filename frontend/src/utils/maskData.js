/**
 * Utility che giấu dữ liệu nhạy cảm (Data Masking) cho giao diện Frontend
 * Giúp tuân thủ tiêu chuẩn bảo mật PII & quyền riêng tư trong y tế.
 */

export function maskPhone(phone) {
  if (!phone) return '';
  const str = String(phone).trim();
  if (str.length < 8) return str;
  return str.substring(0, 3) + '****' + str.substring(str.length - 3);
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export function maskIdentity(idNum) {
  if (!idNum) return '';
  const str = String(idNum).trim();
  if (str.length < 9) return str;
  return str.substring(0, 3) + '******' + str.substring(str.length - 3);
}
