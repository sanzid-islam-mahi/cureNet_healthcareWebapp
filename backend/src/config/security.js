const isProduction = process.env.NODE_ENV === 'production';

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

export function getAdminSessionSecret() {
  const adminSecret = process.env.ADMIN_SESSION_SECRET;
  const jwtSecret = process.env.JWT_SECRET;
  const secret = adminSecret || jwtSecret;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or JWT_SECRET is required');
  }
  if (isProduction && !adminSecret) {
    throw new Error('ADMIN_SESSION_SECRET is required in production');
  }
  if (isProduction && secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters in production');
  }
  return secret;
}

