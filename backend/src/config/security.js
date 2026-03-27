export const isProduction = process.env.NODE_ENV === 'production';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  if (isProduction && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return secret;
}

export function isTruthyEnv(value) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function getTrustProxyValue() {
  const raw = process.env.TRUST_PROXY;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'loopback') return 'loopback';
  if (normalized === 'linklocal') return 'linklocal';
  if (normalized === 'uniquelocal') return 'uniquelocal';
  if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
  return isTruthyEnv(raw);
}
