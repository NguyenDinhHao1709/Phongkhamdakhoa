/**
 * Utility bọc che giấu dữ liệu định danh cá nhân nhạy cảm (Data Masking)
 * Đảm bảo tuân thủ tiêu chuẩn bảo mật y tế & quyền riêng tư PII.
 */

export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const str = phone.trim();
  if (str.length < 8) return str;
  return str.substring(0, 3) + '****' + str.substring(str.length - 3);
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export function maskIdentityNumber(idNum?: string): string {
  if (!idNum) return '';
  const str = idNum.trim();
  if (str.length < 9) return str;
  return str.substring(0, 3) + '******' + str.substring(str.length - 3);
}
