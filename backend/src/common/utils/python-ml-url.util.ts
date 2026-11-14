/** Production thiếu PYTHON_ML_URL (hoặc để localhost) thì trỏ về python-ml trên Render, tránh âm thầm gọi nhầm localhost */
function resolvePythonMlUrl(configured?: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const isLocal = !configured || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configured.trim());
  const url = isProd && isLocal ? 'https://phongkham-python-ml.onrender.com' : (configured || 'http://localhost:5001');
  return url.trim().replace(/\/+$/, '');
}

export const PYTHON_ML_URL = resolvePythonMlUrl(process.env.PYTHON_ML_URL);
