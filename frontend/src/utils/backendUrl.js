const configuredBackendUrl = import.meta.env.VITE_WS_URL || '';
const configuredOfficeUrl = import.meta.env.VITE_OFFICE_URL || '';

export const BACKEND_URL = configuredBackendUrl.replace(/\/+$/, '');
export const OFFICE_URL = configuredOfficeUrl.replace(/\/+$/, '');

export function toBackendUrl(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return BACKEND_URL ? `${BACKEND_URL}${value}` : value;
}

export function toOfficeUrl(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return OFFICE_URL ? `${OFFICE_URL}${value}` : value;
}
