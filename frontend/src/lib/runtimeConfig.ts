export function getApiBase() {
  return import.meta.env.VITE_API_URL || '/api';
}

export function getApiOrigin() {
  const apiBase = getApiBase();
  if (/^https?:\/\//.test(apiBase)) {
    return apiBase.replace(/\/api\/?$/, '');
  }
  return '';
}

export function getAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const origin = getApiOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
